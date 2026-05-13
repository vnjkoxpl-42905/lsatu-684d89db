// Admin-only: list / read / send Gmail messages from the connected Google account.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

function b64urlEncode(s: string): string {
  // UTF-8 safe base64url
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

function extractBody(payload: any): { text: string; html: string } {
  let text = "", html = "";
  function walk(p: any) {
    if (!p) return;
    if (p.body?.data) {
      const decoded = b64urlDecode(p.body.data);
      if (p.mimeType === "text/plain") text += decoded;
      else if (p.mimeType === "text/html") html += decoded;
    }
    if (Array.isArray(p.parts)) p.parts.forEach(walk);
  }
  walk(payload);
  return { text, html };
}

async function safeFetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const txt = await res.text();
  let data: any = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { /* non-JSON body */ }
  return { res, data, txt };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
    if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) throw new Error("Missing connector credentials");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userRes } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userRes?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const { data: roleRow } = await supabase.from("user_roles")
      .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const body = await req.json().catch(() => ({}));
    const action: string = body.action ?? "list";

    const gHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
      "Content-Type": "application/json",
    };

    if (action === "list") {
      const q = body.q ?? "in:inbox";
      const max = body.max ?? 20;
      const url = `${GATEWAY}/users/me/threads?maxResults=${max}&q=${encodeURIComponent(q)}`;
      const { res, data, txt } = await safeFetchJson(url, { headers: gHeaders });
      if (!res.ok) throw new Error(`Gmail list ${res.status}: ${txt.slice(0, 300)}`);

      // For each thread, fetch metadata for the latest message
      const threads = await Promise.all((data?.threads ?? []).map(async (t: any) => {
        const { data: td } = await safeFetchJson(
          `${GATEWAY}/users/me/threads/${t.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: gHeaders },
        );
        const last = td?.messages?.[td.messages.length - 1];
        const headers = last?.payload?.headers ?? [];
        const unread = (td?.messages ?? []).some((m: any) => (m.labelIds ?? []).includes("UNREAD"));
        return {
          id: t.id,
          snippet: t.snippet,
          from: header(headers, "From"),
          subject: header(headers, "Subject"),
          date: header(headers, "Date"),
          internalDate: last?.internalDate,
          messageCount: td.messages?.length ?? 0,
          unread,
        };
      }));
      threads.sort((a, b) => Number(b.internalDate ?? 0) - Number(a.internalDate ?? 0));
      return new Response(JSON.stringify({ ok: true, threads }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "thread") {
      const id = body.id;
      if (!id) throw new Error("id required");
      const { res, data, txt } = await safeFetchJson(`${GATEWAY}/users/me/threads/${id}?format=full`, { headers: gHeaders });
      if (!res.ok) throw new Error(`Gmail thread ${res.status}: ${txt.slice(0, 300)}`);
      const messages = (data?.messages ?? []).map((m: any) => {
        const h = m.payload?.headers ?? [];
        const { text, html } = extractBody(m.payload);
        return {
          id: m.id,
          from: header(h, "From"),
          to: header(h, "To"),
          subject: header(h, "Subject"),
          date: header(h, "Date"),
          internalDate: m.internalDate,
          text, html,
          labelIds: m.labelIds ?? [],
          messageIdHeader: header(h, "Message-ID"),
          references: header(h, "References"),
        };
      });
      // Mark thread as read
      const unreadIds = (data?.messages ?? []).filter((m: any) => (m.labelIds ?? []).includes("UNREAD")).map((m: any) => m.id);
      await Promise.all(unreadIds.map((mid: string) => fetch(
        `${GATEWAY}/users/me/messages/${mid}/modify`,
        { method: "POST", headers: gHeaders, body: JSON.stringify({ removeLabelIds: ["UNREAD"] }) },
      ).catch(() => null)));

      return new Response(JSON.stringify({ ok: true, threadId: id, messages }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send") {
      const { to, subject, text, threadId, inReplyTo, references } = body;
      if (!to || !text) throw new Error("to and text required");
      const lines = [
        `To: ${to}`,
        `Subject: ${subject ?? ""}`,
        'Content-Type: text/plain; charset="UTF-8"',
      ];
      if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`);
      if (references || inReplyTo) lines.push(`References: ${references ?? inReplyTo}`);
      lines.push("", text);
      const raw = b64urlEncode(lines.join("\r\n"));
      const payload: any = { raw };
      if (threadId) payload.threadId = threadId;
      const { res, data, txt } = await safeFetchJson(`${GATEWAY}/users/me/messages/send`, {
        method: "POST", headers: gHeaders, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Gmail send ${res.status}: ${txt.slice(0, 300)}`);
      return new Response(JSON.stringify({ ok: true, message: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("gmail error", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
