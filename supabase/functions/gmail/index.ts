// Admin-only: list / read / send / modify Gmail messages from the connected Google account.
// All Gmail traffic is proxied through the Lovable Connector Gateway.
// Frontend talks to this function via supabase.functions.invoke("gmail", { action, ... }).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function header(headers: any[], name: string): string {
  const h = headers?.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

interface AttachmentMeta {
  partId: string;
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

function extractParts(payload: any): { text: string; html: string; attachments: AttachmentMeta[] } {
  let text = "", html = "";
  const attachments: AttachmentMeta[] = [];
  function walk(p: any) {
    if (!p) return;
    const filename: string = p.filename ?? "";
    const attId: string | undefined = p.body?.attachmentId;
    if (filename && attId) {
      attachments.push({
        partId: p.partId ?? "",
        filename,
        mimeType: p.mimeType ?? "application/octet-stream",
        size: p.body?.size ?? 0,
        attachmentId: attId,
      });
    } else if (p.body?.data) {
      const decoded = b64urlDecode(p.body.data);
      if (p.mimeType === "text/plain") text += decoded;
      else if (p.mimeType === "text/html") html += decoded;
    }
    if (Array.isArray(p.parts)) p.parts.forEach(walk);
  }
  walk(payload);
  return { text, html, attachments };
}

async function safeFetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const txt = await res.text();
  let data: any = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { /* non-JSON body */ }
  return { res, data, txt };
}

function jsonResp(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildRawMessage(args: {
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  text: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const lines = [`To: ${args.to}`];
  if (args.cc) lines.push(`Cc: ${args.cc}`);
  if (args.bcc) lines.push(`Bcc: ${args.bcc}`);
  lines.push(`Subject: ${args.subject ?? ""}`);
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push("MIME-Version: 1.0");
  if (args.inReplyTo) lines.push(`In-Reply-To: ${args.inReplyTo}`);
  if (args.references || args.inReplyTo) lines.push(`References: ${args.references ?? args.inReplyTo}`);
  lines.push("", args.text);
  return b64urlEncode(lines.join("\r\n"));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
    if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) throw new Error("Missing connector credentials");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return jsonResp({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userRes } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userRes?.user;
    if (!user) return jsonResp({ error: "unauthorized" }, 401);
    const { data: roleRow } = await supabase.from("user_roles")
      .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return jsonResp({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action: string = body.action ?? "list";

    const gHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
      "Content-Type": "application/json",
    };

    // ---- THREADS ----
    if (action === "list" || action === "listThreads") {
      const q: string = body.q ?? (body.labelIds ? "" : "in:inbox");
      const max: number = Math.min(body.max ?? body.maxResults ?? 25, 100);
      const labelIds: string[] = Array.isArray(body.labelIds) ? body.labelIds : [];
      const pageToken: string | undefined = body.pageToken;
      const params = new URLSearchParams();
      params.set("maxResults", String(max));
      if (q) params.set("q", q);
      for (const lid of labelIds) params.append("labelIds", lid);
      if (pageToken) params.set("pageToken", pageToken);
      const url = `${GATEWAY}/users/me/threads?${params.toString()}`;
      const { res, data, txt } = await safeFetchJson(url, { headers: gHeaders });
      if (!res.ok) throw new Error(`Gmail list ${res.status}: ${txt.slice(0, 300)}`);

      const threads = await Promise.all((data?.threads ?? []).map(async (t: any) => {
        const { data: td } = await safeFetchJson(
          `${GATEWAY}/users/me/threads/${t.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: gHeaders },
        );
        const msgs = td?.messages ?? [];
        const last = msgs[msgs.length - 1];
        const headers = last?.payload?.headers ?? [];
        const unread = msgs.some((m: any) => (m.labelIds ?? []).includes("UNREAD"));
        const starred = msgs.some((m: any) => (m.labelIds ?? []).includes("STARRED"));
        // Union of labelIds across messages, minus per-message status labels we surface separately.
        const allLabels = new Set<string>();
        for (const m of msgs) for (const lid of (m.labelIds ?? [])) allLabels.add(lid);
        // Distinct senders by name (for "Jane, John (3)" style display).
        const senders: string[] = [];
        const seen = new Set<string>();
        for (const m of msgs) {
          const from = header(m.payload?.headers ?? [], "From");
          if (from && !seen.has(from)) { seen.add(from); senders.push(from); }
        }
        const hasAttachments = msgs.some((m: any) => {
          const parts = m.payload?.parts ?? [];
          return parts.some((p: any) => p.filename && p.body?.attachmentId);
        });
        return {
          id: t.id,
          historyId: td?.historyId,
          snippet: t.snippet,
          from: header(headers, "From"),
          to: header(headers, "To"),
          subject: header(headers, "Subject"),
          date: header(headers, "Date"),
          internalDate: last?.internalDate,
          messageCount: msgs.length,
          senders,
          labelIds: Array.from(allLabels),
          unread,
          starred,
          hasAttachments,
        };
      }));
      threads.sort((a, b) => Number(b.internalDate ?? 0) - Number(a.internalDate ?? 0));
      return jsonResp({ ok: true, threads, nextPageToken: data?.nextPageToken ?? null });
    }

    if (action === "thread" || action === "getThread") {
      const id = body.id;
      if (!id) throw new Error("id required");
      const markRead: boolean = body.markRead !== false; // default true, opt-out
      const { res, data, txt } = await safeFetchJson(`${GATEWAY}/users/me/threads/${id}?format=full`, { headers: gHeaders });
      if (!res.ok) throw new Error(`Gmail thread ${res.status}: ${txt.slice(0, 300)}`);
      const messages = (data?.messages ?? []).map((m: any) => {
        const h = m.payload?.headers ?? [];
        const { text, html, attachments } = extractParts(m.payload);
        return {
          id: m.id,
          threadId: m.threadId,
          from: header(h, "From"),
          to: header(h, "To"),
          cc: header(h, "Cc"),
          bcc: header(h, "Bcc"),
          subject: header(h, "Subject"),
          date: header(h, "Date"),
          internalDate: m.internalDate,
          text,
          html,
          attachments,
          labelIds: m.labelIds ?? [],
          messageIdHeader: header(h, "Message-ID"),
          references: header(h, "References"),
          snippet: m.snippet ?? "",
        };
      });
      if (markRead) {
        const unreadIds = (data?.messages ?? [])
          .filter((m: any) => (m.labelIds ?? []).includes("UNREAD"))
          .map((m: any) => m.id);
        await Promise.all(unreadIds.map((mid: string) => fetch(
          `${GATEWAY}/users/me/messages/${mid}/modify`,
          { method: "POST", headers: gHeaders, body: JSON.stringify({ removeLabelIds: ["UNREAD"] }) },
        ).catch(() => null)));
      }
      return jsonResp({ ok: true, threadId: id, historyId: data?.historyId, messages });
    }

    if (action === "modifyThread") {
      const id: string = body.id;
      const addLabelIds: string[] = body.addLabelIds ?? [];
      const removeLabelIds: string[] = body.removeLabelIds ?? [];
      if (!id) throw new Error("id required");
      const { res, data, txt } = await safeFetchJson(
        `${GATEWAY}/users/me/threads/${id}/modify`,
        { method: "POST", headers: gHeaders, body: JSON.stringify({ addLabelIds, removeLabelIds }) },
      );
      if (!res.ok) throw new Error(`Gmail modifyThread ${res.status}: ${txt.slice(0, 300)}`);
      return jsonResp({ ok: true, thread: data });
    }

    if (action === "trashThread") {
      const id: string = body.id;
      if (!id) throw new Error("id required");
      const { res, data, txt } = await safeFetchJson(
        `${GATEWAY}/users/me/threads/${id}/trash`,
        { method: "POST", headers: gHeaders },
      );
      if (!res.ok) throw new Error(`Gmail trashThread ${res.status}: ${txt.slice(0, 300)}`);
      return jsonResp({ ok: true, thread: data });
    }

    if (action === "untrashThread") {
      const id: string = body.id;
      if (!id) throw new Error("id required");
      const { res, data, txt } = await safeFetchJson(
        `${GATEWAY}/users/me/threads/${id}/untrash`,
        { method: "POST", headers: gHeaders },
      );
      if (!res.ok) throw new Error(`Gmail untrashThread ${res.status}: ${txt.slice(0, 300)}`);
      return jsonResp({ ok: true, thread: data });
    }

    if (action === "batchModify") {
      // Apply the same add/remove label set to many threads. Done client-side serially
      // (Gmail's batchModify endpoint is per-message; per-thread we loop).
      const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
      const addLabelIds: string[] = body.addLabelIds ?? [];
      const removeLabelIds: string[] = body.removeLabelIds ?? [];
      if (!ids.length) throw new Error("ids required");
      const results = await Promise.all(ids.map(async (id) => {
        const { res, txt } = await safeFetchJson(
          `${GATEWAY}/users/me/threads/${id}/modify`,
          { method: "POST", headers: gHeaders, body: JSON.stringify({ addLabelIds, removeLabelIds }) },
        );
        return { id, ok: res.ok, error: res.ok ? null : txt.slice(0, 200) };
      }));
      const failed = results.filter((r) => !r.ok);
      if (failed.length) return jsonResp({ ok: false, results, error: `${failed.length} of ${ids.length} failed` }, 207);
      return jsonResp({ ok: true, results });
    }

    if (action === "batchTrash") {
      const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
      if (!ids.length) throw new Error("ids required");
      const results = await Promise.all(ids.map(async (id) => {
        const { res, txt } = await safeFetchJson(
          `${GATEWAY}/users/me/threads/${id}/trash`,
          { method: "POST", headers: gHeaders },
        );
        return { id, ok: res.ok, error: res.ok ? null : txt.slice(0, 200) };
      }));
      const failed = results.filter((r) => !r.ok);
      if (failed.length) return jsonResp({ ok: false, results, error: `${failed.length} of ${ids.length} failed` }, 207);
      return jsonResp({ ok: true, results });
    }

    // ---- MESSAGES ----
    if (action === "getMessage") {
      const id: string = body.id;
      const format: string = body.format ?? "full";
      if (!id) throw new Error("id required");
      const { res, data, txt } = await safeFetchJson(
        `${GATEWAY}/users/me/messages/${id}?format=${encodeURIComponent(format)}`,
        { headers: gHeaders },
      );
      if (!res.ok) throw new Error(`Gmail getMessage ${res.status}: ${txt.slice(0, 300)}`);
      return jsonResp({ ok: true, message: data });
    }

    if (action === "send") {
      const { to, cc, bcc, subject, text, threadId, inReplyTo, references } = body;
      if (!to || !text) throw new Error("to and text required");
      const raw = buildRawMessage({ to, cc, bcc, subject, text, inReplyTo, references });
      const payload: any = { raw };
      if (threadId) payload.threadId = threadId;
      const { res, data, txt } = await safeFetchJson(`${GATEWAY}/users/me/messages/send`, {
        method: "POST", headers: gHeaders, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Gmail send ${res.status}: ${txt.slice(0, 300)}`);
      return jsonResp({ ok: true, message: data });
    }

    // ---- LABELS ----
    if (action === "listLabels") {
      const { res, data, txt } = await safeFetchJson(`${GATEWAY}/users/me/labels`, { headers: gHeaders });
      if (!res.ok) throw new Error(`Gmail listLabels ${res.status}: ${txt.slice(0, 300)}`);
      const labels = (data?.labels ?? []).map((l: any) => ({
        id: l.id,
        name: l.name,
        type: l.type, // "system" | "user"
        labelListVisibility: l.labelListVisibility,
        messageListVisibility: l.messageListVisibility,
        color: l.color,
      }));
      return jsonResp({ ok: true, labels });
    }

    // ---- PROFILE ----
    if (action === "profile") {
      const { res, data, txt } = await safeFetchJson(`${GATEWAY}/users/me/profile`, { headers: gHeaders });
      if (!res.ok) throw new Error(`Gmail profile ${res.status}: ${txt.slice(0, 300)}`);
      return jsonResp({ ok: true, profile: data });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("gmail error", e);
    return jsonResp({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
