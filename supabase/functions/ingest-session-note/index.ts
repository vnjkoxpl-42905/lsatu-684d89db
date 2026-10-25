// Post-Session Intelligence Pipeline — Phase 1A: manual single ingest.
//
// Admin-only. Given a known Google Doc id (the Gemini Notes doc) and a chosen
// student class_id, this:
//   1. verifies the caller is an admin,
//   2. resolves class_id -> auth.users.id and FAILS CLOSED on orphan/invalid,
//   3. dedups against the session_ingestions ledger (idempotent),
//   4. exports the Doc body as plain text via the Drive connector gateway,
//   5. stores the transcript: bucket ALWAYS (canonical), content_text only when
//      under ~100 KB (build-spec §5a),
//   6. links a student_sessions row,
//   7. writes a session_ingestions ledger row (status 'stored').
//
// ZERO synthesis. ZERO student-facing output. Nothing here publishes, assigns,
// notifies, or messages a student. Synthesis is Phase 2; publish is Phase 3.
//
// Frontend talks to this via supabase.functions.invoke("ingest-session-note",
// { body: { gdrive_doc_id, student_class_id, ... } }).
//
// NOTE: authored as part of the Phase 1A build but NOT yet deployed. Deploying
// this function requires Joshua's explicit OK.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  cleanupStoredTranscript,
  isUniqueViolation,
} from "../_shared/sessionIngestCore.ts";
import { userFromRequest } from "../_shared/authClaims.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DRIVE_GATEWAY =
  "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const BUCKET = "student-context";
// Transcript text is mirrored into content_text only below this size; larger
// transcripts live in the bucket only and synthesis chunk-reads them (§5a).
const INLINE_TEXT_MAX_BYTES = 100 * 1024;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isWellFormedUuid = (v: unknown): v is string =>
  typeof v === "string" && UUID_RE.test(v.trim());

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function safeFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const txt = await res.text();
  return { res, txt };
}

async function lookupExistingIngestion(
  admin: ReturnType<typeof createClient>,
  gdriveDocId: string,
  gmailMessageId: string | null,
) {
  const { data } = await admin
    .from("session_ingestions")
    .select("id, status, transcript_context_id, session_id")
    .or(
      gmailMessageId
        ? `gdrive_doc_id.eq.${gdriveDocId},gmail_message_id.eq.${gmailMessageId}`
        : `gdrive_doc_id.eq.${gdriveDocId}`,
    )
    .maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ ok: false, error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ── Auth: admin only ──
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
    const gdriveDocId: string = (body.gdrive_doc_id ?? "").trim();
    const studentClassId: string = (body.student_class_id ?? "").trim();
    const gmailMessageId: string | null = body.gmail_message_id?.trim() || null;
    const calendarEventId: string | null = body.calendar_event_id?.trim() || null;
    const scheduledAt: string | null = body.scheduled_at?.trim() || null;
    const durationMinutes: number | null =
      typeof body.duration_minutes === "number" ? body.duration_minutes : null;

    if (!gdriveDocId) return jsonRes({ ok: false, error: "gdrive_doc_id required" }, 400);
    if (!studentClassId) return jsonRes({ ok: false, error: "student_class_id required" }, 400);

    // ── Resolve student (fail closed) ──
    // class_id IS the auth.users.id (UUID as text). Confirm format AND a live
    // auth user before any write. Orphan/invalid -> refuse, do not write.
    if (!isWellFormedUuid(studentClassId)) {
      return jsonRes({ ok: false, error: "malformed_uuid", reason: "malformed_uuid" }, 400);
    }
    const { data: targetUser, error: lookupErr } =
      await admin.auth.admin.getUserById(studentClassId);
    if (lookupErr || !targetUser?.user) {
      return jsonRes({ ok: false, error: "orphan_auth_id", reason: "orphan_auth_id" }, 422);
    }
    // Delivery gate: must be a classroom-access student (build-spec §3a).
    const { data: targetProfile } = await admin
      .from("profiles").select("has_classroom_access")
      .eq("class_id", studentClassId).maybeSingle();
    const { data: targetIsAdmin } = await admin
      .from("user_roles").select("role")
      .eq("user_id", studentClassId).eq("role", "admin").maybeSingle();
    if (targetIsAdmin) return jsonRes({ ok: false, error: "not_a_student", reason: "not_a_student" }, 422);
    if (!targetProfile?.has_classroom_access) {
      return jsonRes({ ok: false, error: "no_classroom_access", reason: "no_classroom_access" }, 422);
    }
    const studentId = studentClassId; // resolved auth.users.id

    // ── Idempotency: never double-ingest the same Doc / email ──
    const existing = await lookupExistingIngestion(admin, gdriveDocId, gmailMessageId);
    if (existing && existing.status !== "error") {
      return jsonRes({
        ok: true,
        already_ingested: true,
        ingestion_id: existing.id,
        status: existing.status,
        transcript_context_id: existing.transcript_context_id,
        session_id: existing.session_id,
      });
    }

    // ── Export the Doc as plain text via the Drive connector gateway ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_DRIVE_API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!GOOGLE_DRIVE_API_KEY) {
      throw new Error("GOOGLE_DRIVE_API_KEY not configured (link Google Drive connector)");
    }
    const driveHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_DRIVE_API_KEY,
    };

    const metaFields = "id,name,mimeType,modifiedTime,owners(displayName,emailAddress)";
    const metaR = await safeFetch(
      `${DRIVE_GATEWAY}/files/${encodeURIComponent(gdriveDocId)}?fields=${encodeURIComponent(metaFields)}`,
      { headers: driveHeaders },
    );
    if (!metaR.res.ok) throw new Error(`Drive meta ${metaR.res.status}: ${metaR.txt.slice(0, 300)}`);
    const meta = JSON.parse(metaR.txt || "{}");
    const docName: string = meta.name ?? "Session notes";
    const docMime: string = meta.mimeType ?? "";
    if (!docMime.startsWith("application/vnd.google-apps.document")) {
      return jsonRes({ ok: false, error: `not_a_google_doc: ${docMime || "unknown"}` }, 422);
    }

    const exportR = await safeFetch(
      `${DRIVE_GATEWAY}/files/${encodeURIComponent(gdriveDocId)}/export?mimeType=${encodeURIComponent("text/plain")}`,
      { headers: driveHeaders },
    );
    if (!exportR.res.ok) throw new Error(`Drive export ${exportR.res.status}: ${exportR.txt.slice(0, 300)}`);
    const transcriptText = exportR.txt;
    if (!transcriptText.trim()) return jsonRes({ ok: false, error: "empty_transcript" }, 422);

    const byteLength = new TextEncoder().encode(transcriptText).length;
    const inlineText = byteLength <= INLINE_TEXT_MAX_BYTES;

    const rawMeta = {
      gdrive_doc_id: gdriveDocId,
      gmail_message_id: gmailMessageId,
      doc_title: docName,
      doc_mime: docMime,
      doc_modified_time: meta.modifiedTime ?? null,
      doc_owner: meta.owners?.[0]?.emailAddress ?? null,
      byte_length: byteLength,
      inline_text: inlineText,
    };

    // ── Store transcript: insert row -> upload to bucket -> set file_path ──
    // created_by = caller (Joshua) so the audit trail attributes the ingest,
    // matching the RLS contract even though the service role bypasses RLS.
    const { data: ctxRow, error: ctxErr } = await admin
      .from("student_context")
      .insert({
        student_id: studentId,
        context_type: "transcript",
        title: docName.slice(0, 200),
        content_text: inlineText ? transcriptText : null,
        file_path: null,
        source: "gemini_notes",
        metadata: rawMeta,
        created_by: caller.id,
      })
      .select("id")
      .single();
    if (ctxErr) throw ctxErr;
    const contextId = ctxRow.id as string;

    const storagePath = `${studentId}/${contextId}/transcript.txt`;
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, new Blob([transcriptText], { type: "text/plain" }), {
        upsert: false,
      });
    if (uploadErr) {
      // Roll back the row so we never leave a transcript record without its
      // canonical bucket artifact.
      await admin.from("student_context").delete().eq("id", contextId);
      throw uploadErr;
    }
    await admin
      .from("student_context")
      .update({
        file_path: storagePath,
        metadata: { ...rawMeta, full_artifact_path: storagePath },
      })
      .eq("id", contextId)
      .throwOnError();

    // ── Link a student_sessions row ──
    const { data: sessionRow, error: sessErr } = await admin
      .from("student_sessions")
      .insert({
        student_id: studentId,
        scheduled_at: scheduledAt ?? meta.modifiedTime ?? new Date().toISOString(),
        status: "completed",
        duration_minutes: durationMinutes,
        transcript_id: contextId,
        source: "gemini_notes",
        created_by: caller.id,
      })
      .select("id")
      .single();
    if (sessErr) {
      await cleanupStoredTranscript(admin, { contextId, storagePath });
      throw sessErr;
    }
    const sessionId = sessionRow.id as string;

    // ── Ledger row (idempotency key + audit). status = 'stored' ──
    const { data: ledgerRow, error: ledgerErr } = await admin
      .from("session_ingestions")
      .insert({
        gmail_message_id: gmailMessageId,
        gdrive_doc_id: gdriveDocId,
        calendar_event_id: calendarEventId,
        status: "stored",
        matched_student_id: studentId,
        match_confidence: "high",
        match_reason: "manual_admin_pick",
        transcript_context_id: contextId,
        session_id: sessionId,
        raw_subject: docName,
        raw_meta: rawMeta,
        attempt_count: 1,
        last_attempt_at: new Date().toISOString(),
        scan_requested_by: caller.id,
        created_by: caller.id,
        resolved_by: caller.id,
        resolved_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (ledgerErr) {
      try {
        await cleanupStoredTranscript(admin, { contextId, sessionId, storagePath });
      } catch (cleanupErr) {
        console.error("ingest-session-note cleanup failed", cleanupErr);
      }

      if (isUniqueViolation(ledgerErr)) {
        const racedExisting = await lookupExistingIngestion(admin, gdriveDocId, gmailMessageId);
        if (racedExisting && racedExisting.status !== "error") {
          return jsonRes({
            ok: true,
            already_ingested: true,
            ingestion_id: racedExisting.id,
            status: racedExisting.status,
            transcript_context_id: racedExisting.transcript_context_id,
            session_id: racedExisting.session_id,
          });
        }
      }

      throw ledgerErr;
    }

    return jsonRes({
      ok: true,
      already_ingested: false,
      ingestion_id: ledgerRow.id,
      status: "stored",
      transcript_context_id: contextId,
      session_id: sessionId,
      inline_text: inlineText,
      byte_length: byteLength,
    });
  } catch (e) {
    console.error("ingest-session-note error", e);
    return jsonRes(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});
