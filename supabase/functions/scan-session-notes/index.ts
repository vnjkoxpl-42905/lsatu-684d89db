// Post-Session Intelligence Pipeline — Phase 1B.
//
// Admin-only orchestrator with three actions:
//   - action 'scan'    : search Gmail for Gemini Notes in a window, extract the
//                        linked Google Doc, dedup against the ledger, and queue
//                        each new one as a `needs_match` session_ingestions row
//                        with parsed hints (subject name, doc owner, calendar
//                        window corroboration). CONSERVATIVE: V1 never
//                        auto-attaches — every detected note lands in the
//                        resolution queue for Joshua to confirm the student.
//                        (Auto-attach on confident email+name+calendar match is
//                        a documented follow-up once a real Gemini Notes email
//                        format has been validated end to end.)
//   - action 'resolve' : { ledger_id, student_class_id } — resolve the student
//                        (fail closed), export + store the transcript, link a
//                        session, and flip the existing ledger row to 'stored'.
//   - action 'discard' : { ledger_id, discard_reason } — close a queue item.
//
// ZERO synthesis. ZERO student-facing output.
//
// NOT deployed. Deploying requires Joshua's explicit OK.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  cleanupStoredTranscript,
  GMAIL_GATEWAY,
  exportDocText,
  resolveStudentAuthId,
  storeTranscript,
} from "../_shared/sessionIngestCore.ts";
import { userFromRequest } from "../_shared/authClaims.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const DOC_ID_RE = /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/;
// Gemini Notes subjects look like: Notes: "Lydia" Jun 19, 2026
const SUBJECT_NAME_RE = /Notes:\s*["“]?([^"”]+?)["”]?\s+\w{3}\s+\d/i;

function header(headers: any[], name: string): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

// Walk a Gmail message payload and decode the first text/plain (or text/html)
// body we find, so we can scrape the Doc link out of it.
function decodeBody(payload: any): string {
  const out: string[] = [];
  const walk = (part: any) => {
    if (!part) return;
    const mime = part.mimeType ?? "";
    const data = part.body?.data;
    if (data && (mime === "text/plain" || mime === "text/html")) {
      try {
        const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
        out.push(new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))));
      } catch { /* skip undecodable part */ }
    }
    for (const p of part.parts ?? []) walk(p);
  };
  walk(payload);
  return out.join("\n");
}

function gmailHeaders() {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  if (!GOOGLE_MAIL_API_KEY) {
    throw new Error("GOOGLE_MAIL_API_KEY not configured (link Google Mail connector)");
  }
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ ok: false, error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return jsonRes({ ok: false, error: "unauthorized" }, 401);
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const caller = await userFromRequest(req);
  if (!caller) return jsonRes({ ok: false, error: "unauthorized" }, 401);
  const { data: roleRow } = await admin
    .from("user_roles").select("role")
    .eq("user_id", caller.id).eq("role", "admin").maybeSingle();
  if (!roleRow) return jsonRes({ ok: false, error: "forbidden" }, 403);

  try {
    const body = await req.json().catch(() => ({}));
    const action: string = body.action ?? "scan";

    // ── resolve: confirm a queued item against a chosen student ──
    if (action === "resolve") {
      const ledgerId: string = (body.ledger_id ?? "").trim();
      const studentClassId: string = (body.student_class_id ?? "").trim();
      if (!ledgerId) return jsonRes({ ok: false, error: "ledger_id required" }, 400);

      const { data: row, error: rowErr } = await admin
        .from("session_ingestions").select("*").eq("id", ledgerId).maybeSingle();
      if (rowErr) throw rowErr;
      if (!row) return jsonRes({ ok: false, error: "ledger_row_not_found" }, 404);
      if (row.status === "stored" || row.status === "published") {
        return jsonRes({ ok: true, already_resolved: true, status: row.status });
      }
      if (!row.gdrive_doc_id) return jsonRes({ ok: false, error: "row_has_no_doc" }, 422);

      const resolved = await resolveStudentAuthId(admin, studentClassId);
      if (!resolved.ok) return jsonRes({ ok: false, error: resolved.reason, reason: resolved.reason }, 422);

      const doc = await exportDocText(row.gdrive_doc_id);
      const rawMeta = { ...(row.raw_meta ?? {}), resolved_doc: doc.meta, inline_text: doc.inlineText };
      const stored = await storeTranscript(admin, {
        studentId: resolved.authId,
        callerId: caller.id,
        doc,
        rawMeta,
      });

      const { error: updErr } = await admin
        .from("session_ingestions")
        .update({
          status: "stored",
          matched_student_id: resolved.authId,
          match_confidence: "high",
          match_reason: "manual_resolution_queue_pick",
          transcript_context_id: stored.contextId,
          session_id: stored.sessionId,
          resolved_by: caller.id,
          resolved_at: new Date().toISOString(),
          last_attempt_at: new Date().toISOString(),
          attempt_count: (row.attempt_count ?? 0) + 1,
          error_message: null,
        })
        .eq("id", ledgerId);
      if (updErr) {
        await cleanupStoredTranscript(admin, {
          contextId: stored.contextId,
          sessionId: stored.sessionId,
          storagePath: stored.storagePath,
        });
        throw updErr;
      }

      return jsonRes({
        ok: true, status: "stored", ingestion_id: ledgerId,
        transcript_context_id: stored.contextId, session_id: stored.sessionId,
        inline_text: stored.inlineText, byte_length: stored.byteLength,
      });
    }

    // ── discard: close a queue item ──
    if (action === "discard") {
      const ledgerId: string = (body.ledger_id ?? "").trim();
      const reason: string = (body.discard_reason ?? "").trim() || "discarded_by_admin";
      if (!ledgerId) return jsonRes({ ok: false, error: "ledger_id required" }, 400);
      const { error } = await admin
        .from("session_ingestions")
        .update({
          status: "discarded", discard_reason: reason,
          resolved_by: caller.id, resolved_at: new Date().toISOString(),
        })
        .eq("id", ledgerId);
      if (error) throw error;
      return jsonRes({ ok: true, status: "discarded", ingestion_id: ledgerId });
    }

    // ── scan: detect + queue ──
    if (action === "scan") {
      // Caller may override the search; default anchors on the real Gemini Notes
      // sender (gemini-notes@google.com) — the authoritative source signal — and
      // requires a Google Doc link in a recent window. Anchoring on sender (not
      // just the word "Notes" in any subject) is what makes this match the real
      // Gmail pattern instead of over-matching unrelated mail.
      const query: string = body.q ??
        'from:gemini-notes@google.com "docs.google.com/document" newer_than:14d';
      const max: number = Math.min(body.max ?? 25, 50);

      const headers = gmailHeaders();
      const listParams = new URLSearchParams({ maxResults: String(max), q: query });
      const listRes = await fetch(`${GMAIL_GATEWAY}/users/me/messages?${listParams}`, { headers });
      const listTxt = await listRes.text();
      if (!listRes.ok) throw new Error(`Gmail list ${listRes.status}: ${listTxt.slice(0, 300)}`);
      const messages: any[] = JSON.parse(listTxt || "{}").messages ?? [];

      const detected: any[] = [];
      let skippedExisting = 0;
      let skippedNoDoc = 0;

      for (const m of messages) {
        const msgRes = await fetch(
          `${GMAIL_GATEWAY}/users/me/messages/${m.id}?format=full`, { headers },
        );
        if (!msgRes.ok) continue;
        const msg = JSON.parse(await msgRes.text());
        const hdrs = msg.payload?.headers ?? [];
        const subject = header(hdrs, "Subject");
        const from = header(hdrs, "From");
        const internalDate = msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : null;

        const bodyText = decodeBody(msg.payload) + " " + (msg.snippet ?? "");
        const docMatch = bodyText.match(DOC_ID_RE);
        if (!docMatch) { skippedNoDoc++; continue; }
        const docId = docMatch[1];
        const nameMatch = subject.match(SUBJECT_NAME_RE);
        const parsedName = nameMatch ? nameMatch[1].trim() : null;

        // Dedup against the ledger by gmail id or doc id.
        const { data: existing } = await admin
          .from("session_ingestions").select("id")
          .or(`gmail_message_id.eq.${m.id},gdrive_doc_id.eq.${docId}`)
          .maybeSingle();
        if (existing) { skippedExisting++; continue; }

        // Calendar corroboration: time+title window only (schedule_events has
        // no attendee emails — build-spec §3d). A hit raises confidence but
        // never confirms identity on its own, so we keep status needs_match.
        let calendarHit: any = null;
        if (internalDate && parsedName) {
          const lo = new Date(new Date(internalDate).getTime() - 6 * 3600_000).toISOString();
          const hi = new Date(new Date(internalDate).getTime() + 6 * 3600_000).toISOString();
          const { data: evs } = await admin
            .from("schedule_events").select("id, title, start_at")
            .gte("start_at", lo).lte("start_at", hi);
          calendarHit = (evs ?? []).find((e: any) =>
            (e.title ?? "").toLowerCase().includes(parsedName.toLowerCase()),
          ) ?? null;
        }

        const rawMeta = {
          gmail_message_id: m.id, gdrive_doc_id: docId, subject, from,
          parsed_name: parsedName, internal_date: internalDate,
          // The Gemini Notes email body carries a short summary + suggested next
          // steps. Persist the snippet so the review queue shows context without
          // opening the Doc (the Doc itself is read only on resolve).
          email_summary: (msg.snippet ?? "").trim() || null,
          calendar_window_hit: calendarHit ? { id: calendarHit.id, title: calendarHit.title } : null,
        };

        const { data: inserted, error: insErr } = await admin
          .from("session_ingestions")
          .insert({
            gmail_message_id: m.id,
            gdrive_doc_id: docId,
            calendar_event_id: calendarHit?.id ?? null,
            status: "needs_match",
            match_confidence: calendarHit ? "medium" : "low",
            match_reason: parsedName
              ? `parsed_name:${parsedName}${calendarHit ? "+calendar_window" : ""}`
              : "no_name_parsed",
            raw_subject: subject,
            raw_meta: rawMeta,
            attempt_count: 1,
            last_attempt_at: new Date().toISOString(),
            scan_requested_by: caller.id,
            created_by: caller.id,
          })
          .select("id").single();
        if (insErr) {
          // Unique-constraint race — treat as already seen, don't fail the scan.
          skippedExisting++;
          continue;
        }
        detected.push({ ingestion_id: inserted.id, doc_id: docId, parsed_name: parsedName, calendar_hit: !!calendarHit });
      }

      return jsonRes({
        ok: true,
        scanned: messages.length,
        queued: detected.length,
        skipped_existing: skippedExisting,
        skipped_no_doc: skippedNoDoc,
        detected,
      });
    }

    return jsonRes({ ok: false, error: `unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("scan-session-notes error", e);
    return jsonRes({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
