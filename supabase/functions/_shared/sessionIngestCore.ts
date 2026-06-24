// Shared core for the post-session intelligence pipeline (Phase 1B).
//
// Holds the storage primitives reused by `scan-session-notes` (resolve action)
// so the matching/queue function does not re-implement transcript storage.
//
// NOTE: the deployed Phase 1A `ingest-session-note` function predates this
// module and currently carries its own copy of `storeTranscript`. It is left
// untouched (it is deployed and verified); it should adopt this module on its
// next change. Keep the two in sync until then.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const DRIVE_GATEWAY =
  "https://connector-gateway.lovable.dev/google_drive/drive/v3";
export const GMAIL_GATEWAY =
  "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
export const BUCKET = "student-context";
export const INLINE_TEXT_MAX_BYTES = 100 * 1024;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isWellFormedUuid = (v: unknown): v is string =>
  typeof v === "string" && UUID_RE.test(v.trim());

export type ResolveFailureReason =
  | "missing_class_id"
  | "malformed_uuid"
  | "orphan_auth_id"
  | "not_a_student"
  | "no_classroom_access";

/**
 * Authoritative class_id -> auth.users.id resolve, fail closed. Confirms a live
 * auth user, that they are not an admin, and that they have classroom access
 * (the delivery gate). Mirrors src/lib/resolveStudentAuthId.ts but is the
 * server-side source of truth.
 */
export async function resolveStudentAuthId(
  admin: SupabaseClient,
  classId: string,
): Promise<{ ok: true; authId: string } | { ok: false; reason: ResolveFailureReason }> {
  const trimmed = (classId ?? "").trim();
  if (!trimmed) return { ok: false, reason: "missing_class_id" };
  if (!isWellFormedUuid(trimmed)) return { ok: false, reason: "malformed_uuid" };

  const { data: target, error } = await admin.auth.admin.getUserById(trimmed);
  if (error || !target?.user) return { ok: false, reason: "orphan_auth_id" };

  const { data: isAdmin } = await admin
    .from("user_roles").select("role")
    .eq("user_id", trimmed).eq("role", "admin").maybeSingle();
  if (isAdmin) return { ok: false, reason: "not_a_student" };

  const { data: profile } = await admin
    .from("profiles").select("has_classroom_access")
    .eq("class_id", trimmed).maybeSingle();
  if (!profile?.has_classroom_access) return { ok: false, reason: "no_classroom_access" };

  return { ok: true, authId: trimmed };
}

function driveHeaders() {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GOOGLE_DRIVE_API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  if (!GOOGLE_DRIVE_API_KEY) {
    throw new Error("GOOGLE_DRIVE_API_KEY not configured (link Google Drive connector)");
  }
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GOOGLE_DRIVE_API_KEY,
  };
}

export interface DocExport {
  text: string;
  byteLength: number;
  inlineText: boolean;
  meta: { name: string; mimeType: string; modifiedTime: string | null; owner: string | null };
}

/** Export a Google Doc as plain text via the Drive connector gateway. */
export async function exportDocText(docId: string): Promise<DocExport> {
  const headers = driveHeaders();
  const metaFields = "id,name,mimeType,modifiedTime,owners(displayName,emailAddress)";
  const metaRes = await fetch(
    `${DRIVE_GATEWAY}/files/${encodeURIComponent(docId)}?fields=${encodeURIComponent(metaFields)}`,
    { headers },
  );
  const metaTxt = await metaRes.text();
  if (!metaRes.ok) throw new Error(`Drive meta ${metaRes.status}: ${metaTxt.slice(0, 300)}`);
  const meta = JSON.parse(metaTxt || "{}");
  const mimeType: string = meta.mimeType ?? "";
  if (!mimeType.startsWith("application/vnd.google-apps.document")) {
    throw new Error(`not_a_google_doc: ${mimeType || "unknown"}`);
  }

  const expRes = await fetch(
    `${DRIVE_GATEWAY}/files/${encodeURIComponent(docId)}/export?mimeType=${encodeURIComponent("text/plain")}`,
    { headers },
  );
  const text = await expRes.text();
  if (!expRes.ok) throw new Error(`Drive export ${expRes.status}: ${text.slice(0, 300)}`);
  if (!text.trim()) throw new Error("empty_transcript");

  const byteLength = new TextEncoder().encode(text).length;
  return {
    text,
    byteLength,
    inlineText: byteLength <= INLINE_TEXT_MAX_BYTES,
    meta: {
      name: meta.name ?? "Session notes",
      mimeType,
      modifiedTime: meta.modifiedTime ?? null,
      owner: meta.owners?.[0]?.emailAddress ?? null,
    },
  };
}

export interface StoredTranscript {
  contextId: string;
  sessionId: string;
  storagePath: string;
  inlineText: boolean;
  byteLength: number;
}

function isNotFoundStorageError(err: unknown): boolean {
  const msg = String((err as { message?: string } | null)?.message ?? "").toLowerCase();
  return msg.includes("not found") || msg.includes("no such object");
}

/** Best-effort rollback for transcript artifacts created before a later failure. */
export async function cleanupStoredTranscript(
  admin: SupabaseClient,
  args: { contextId: string; sessionId?: string | null; storagePath: string },
): Promise<void> {
  const failures: string[] = [];

  if (args.sessionId) {
    const { error } = await admin.from("student_sessions").delete().eq("id", args.sessionId);
    if (error) failures.push(`student_sessions:${error.message}`);
  }

  const { error: removeErr } = await admin.storage.from(BUCKET).remove([args.storagePath]);
  if (removeErr && !isNotFoundStorageError(removeErr)) {
    failures.push(`storage:${removeErr.message}`);
  }

  const { error: ctxErr } = await admin.from("student_context").delete().eq("id", args.contextId);
  if (ctxErr) failures.push(`student_context:${ctxErr.message}`);

  if (failures.length > 0) {
    throw new Error(`cleanup_failed:${failures.join(" | ")}`);
  }
}

export function isUniqueViolation(err: unknown): boolean {
  const code = String((err as { code?: string } | null)?.code ?? "");
  const msg = String((err as { message?: string } | null)?.message ?? "").toLowerCase();
  return code === "23505" || msg.includes("duplicate key") || msg.includes("unique constraint");
}

/**
 * Store a transcript: bucket always (canonical), content_text only when small,
 * then link a student_sessions row. created_by is the admin actor. Rolls the
 * context row back if the bucket upload fails.
 */
export async function storeTranscript(
  admin: SupabaseClient,
  args: {
    studentId: string;
    callerId: string;
    doc: DocExport;
    rawMeta: Record<string, unknown>;
    scheduledAt?: string | null;
    durationMinutes?: number | null;
  },
): Promise<StoredTranscript> {
  const { studentId, callerId, doc, rawMeta } = args;

  const { data: ctxRow, error: ctxErr } = await admin
    .from("student_context")
    .insert({
      student_id: studentId,
      context_type: "transcript",
      title: doc.meta.name.slice(0, 200),
      content_text: doc.inlineText ? doc.text : null,
      file_path: null,
      source: "gemini_notes",
      metadata: rawMeta,
      created_by: callerId,
    })
    .select("id").single();
  if (ctxErr) throw ctxErr;
  const contextId = ctxRow.id as string;

  const storagePath = `${studentId}/${contextId}/transcript.txt`;
  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, new Blob([doc.text], { type: "text/plain" }), { upsert: false });
  if (uploadErr) {
    await admin.from("student_context").delete().eq("id", contextId);
    throw uploadErr;
  }
  await admin
    .from("student_context")
    .update({ file_path: storagePath, metadata: { ...rawMeta, full_artifact_path: storagePath } })
    .eq("id", contextId)
    .throwOnError();

  const { data: sessionRow, error: sessErr } = await admin
    .from("student_sessions")
    .insert({
      student_id: studentId,
      scheduled_at: args.scheduledAt ?? doc.meta.modifiedTime ?? new Date().toISOString(),
      status: "completed",
      duration_minutes: args.durationMinutes ?? null,
      transcript_id: contextId,
      source: "gemini_notes",
      created_by: callerId,
    })
    .select("id").single();
  if (sessErr) {
    await cleanupStoredTranscript(admin, { contextId, storagePath });
    throw sessErr;
  }

  return {
    contextId,
    sessionId: sessionRow.id as string,
    storagePath,
    inlineText: doc.inlineText,
    byteLength: doc.byteLength,
  };
}
