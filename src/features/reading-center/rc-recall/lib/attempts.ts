/**
 * Attempt and recap persistence for RC Recall.
 *
 * Append-only: an attempt is inserted once, before any recording, under a fresh
 * UUID, and is only ever finalized. A recording is uploaded to a unique path with
 * no overwrite, and a recap is reported `saved` only after the object and the row
 * have both been read back.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ConfirmScope, RecallMode, StepKind, Voice } from "./sequence";

export const RECORDINGS_BUCKET = "rc-recall-recordings";

export type RecordingState = "not_recorded" | "pending" | "saved" | "failed";

export interface AttemptRow {
  id: string;
  student_id: string;
  mode: RecallMode;
  preptest: number;
  section: number;
  passage_ids: number[];
  confirmation_scope: ConfirmScope | null;
  started_at: string;
  finished_at: string | null;
  elapsed_seconds: number | null;
  completed: boolean;
}

export interface RecapRow {
  id: string;
  attempt_id: string;
  student_id: string;
  recap_key: string;
  passage_position: number;
  kind: Extract<StepKind, "recall" | "cumulative" | "passage_recap">;
  voice: Voice;
  recording_state: RecordingState;
  object_path: string | null;
  mime_type: string | null;
  duration_ms: number | null;
}

/** The slice of the Supabase builder this module uses. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Table = any;
const table = (name: string): Table => (supabase as unknown as { from: (n: string) => Table }).from(name);

export const newId = (): string => crypto.randomUUID();

export function extensionFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mpeg")) return "mp3";
  return "webm";
}

/** Unique per recording. Two recordings can never share a path. */
export function recordingPath(studentId: string, attemptId: string, recapKey: string, mimeType: string, unique = newId()): string {
  return `${studentId}/${attemptId}/${recapKey}-${unique}.${extensionFor(mimeType)}`;
}

export async function createAttempt(input: {
  studentId: string; mode: RecallMode; preptest: number; section: number;
  passageIds: number[]; confirmationScope: ConfirmScope | null;
}): Promise<AttemptRow> {
  const row = {
    id: newId(),
    student_id: input.studentId,
    mode: input.mode,
    preptest: input.preptest,
    section: input.section,
    passage_ids: input.passageIds,
    confirmation_scope: input.mode === "rc_recall" ? input.confirmationScope ?? "all_read" : null,
  };
  const { data, error } = await table("rc_recall_attempts").insert(row).select().single();
  if (error) throw error;
  const saved = data as AttemptRow | null;
  if (!saved || saved.id !== row.id || saved.student_id !== input.studentId) throw new Error("The attempt could not be verified.");
  return saved;
}

export async function insertRecap(input: {
  attemptId: string; studentId: string; recapKey: string; passagePosition: number;
  kind: RecapRow["kind"]; voice: Voice;
}): Promise<RecapRow> {
  const row = {
    id: newId(),
    attempt_id: input.attemptId,
    student_id: input.studentId,
    recap_key: input.recapKey,
    passage_position: input.passagePosition,
    kind: input.kind,
    voice: input.voice,
    recording_state: input.voice === "spoken" ? "pending" : "not_recorded",
  };
  const { data, error } = await table("rc_recall_recaps").insert(row).select().single();
  if (error) throw error;
  const saved = data as RecapRow | null;
  if (!saved || saved.id !== row.id) throw new Error("The recap could not be verified.");
  return saved;
}

export interface UploadInput {
  studentId: string; attemptId: string; recapId: string; path: string;
  blob: Blob; mimeType: string; durationMs: number | null;
}

export async function markRecapFailed(recapId: string, studentId: string): Promise<void> {
  await table("rc_recall_recaps").update({ recording_state: "failed" })
    .eq("id", recapId).eq("student_id", studentId).neq("recording_state", "saved");
}

/** Reuse a recap whose recording never uploaded; a failed, pathless row may change voice. */
export async function resetFailedRecap(recapId: string, studentId: string, voice: "spoken" | "silent"): Promise<RecapRow> {
  const { data, error } = await table("rc_recall_recaps").update({
    voice, recording_state: voice === "spoken" ? "pending" : "not_recorded",
    object_path: null, mime_type: null, duration_ms: null,
  }).eq("id", recapId).eq("student_id", studentId).eq("recording_state", "failed").is("object_path", null).select().single();
  if (error) throw error;
  const row = data as RecapRow | null;
  if (!row || row.recording_state !== (voice === "spoken" ? "pending" : "not_recorded")) throw new Error("The failed recap could not be restarted.");
  return row;
}

/**
 * Upload one recap recording. Resolves only once the object exists and the row
 * says `saved`; otherwise the row is marked `failed` (best effort) and this throws.
 */
export async function uploadRecording(input: UploadInput): Promise<void> {
  const slash = input.path.lastIndexOf("/");
  const folder = input.path.slice(0, slash);
  const file = input.path.slice(slash + 1);
  try {
    const store = supabase.storage.from(RECORDINGS_BUCKET);
    const { error: uploadError } = await store.upload(input.path, input.blob, { contentType: input.mimeType, upsert: false });
    // The path is unique to this recording, so "already exists" means an earlier
    // try of this same upload landed but its row update did not. Verify below.
    if (uploadError && !/already exists|duplicate/i.test(uploadError.message ?? "")) throw uploadError;
    const { data: listed, error: listError } = await store.list(folder, { search: file });
    if (listError) throw listError;
    const object = listed?.find((o) => o.name === file);
    if (!object) throw new Error("The recording was not found after upload.");
    if (uploadError && Number(object.metadata?.size) !== input.blob.size) throw new Error("A recording already exists at this path with a different size.");
    const { data, error } = await table("rc_recall_recaps")
      .update({ recording_state: "saved", object_path: input.path, mime_type: input.mimeType, duration_ms: input.durationMs === null ? null : Math.round(input.durationMs) })
      .eq("id", input.recapId).eq("student_id", input.studentId).select().single();
    if (error) throw error;
    const row = data as RecapRow | null;
    if (!row || row.recording_state !== "saved" || row.object_path !== input.path) throw new Error("The recording row could not be verified.");
  } catch (err) {
    await markRecapFailed(input.recapId, input.studentId).catch(() => undefined);
    throw err;
  }
}

export async function finalizeAttempt(input: {
  attemptId: string; studentId: string; elapsedSeconds: number; completed: boolean;
}): Promise<AttemptRow> {
  const { data, error } = await table("rc_recall_attempts")
    .update({ finished_at: new Date().toISOString(), elapsed_seconds: Math.max(0, Math.round(input.elapsedSeconds)), completed: input.completed })
    .eq("id", input.attemptId).eq("student_id", input.studentId).is("finished_at", null).select().single();
  if (error) {
    // The write may have succeeded while its response was lost. Read it back
    // before asking the student to retry.
    const { data: existing, error: readError } = await table("rc_recall_attempts").select("*")
      .eq("id", input.attemptId).eq("student_id", input.studentId).single();
    const row = existing as AttemptRow | null;
    if (!readError && row?.finished_at && row.completed === input.completed) return row;
    throw error;
  }
  const row = data as AttemptRow | null;
  if (!row || row.finished_at === null || row.completed !== input.completed) throw new Error("The attempt result could not be verified.");
  return row;
}

export async function listAttempts(studentId: string): Promise<{ attempts: AttemptRow[]; recaps: RecapRow[] }> {
  const { data, error } = await table("rc_recall_attempts").select("*").eq("student_id", studentId)
    .order("started_at", { ascending: false }).limit(50);
  if (error) throw error;
  const attempts = (data ?? []) as AttemptRow[];
  if (!attempts.length) return { attempts, recaps: [] };
  const recaps: RecapRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data: recapData, error: recapError } = await table("rc_recall_recaps").select("*")
      .eq("student_id", studentId).in("attempt_id", attempts.map((a) => a.id)).range(from, from + pageSize - 1);
    if (recapError) throw recapError;
    const page = (recapData ?? []) as RecapRow[];
    recaps.push(...page);
    if (page.length < pageSize) break;
  }
  return { attempts, recaps };
}

/** Per-attempt recording summary that never overstates what was saved. */
export function summarizeRecordings(recaps: Pick<RecapRow, "recording_state">[]): { spoken: number; saved: number; failed: number; pending: number; silent: number } {
  const count = (s: RecordingState) => recaps.filter((r) => r.recording_state === s).length;
  const saved = count("saved"), failed = count("failed"), pending = count("pending");
  return { spoken: saved + failed + pending, saved, failed, pending, silent: count("not_recorded") };
}
