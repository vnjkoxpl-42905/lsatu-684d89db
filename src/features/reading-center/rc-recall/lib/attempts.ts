/**
 * Attempt and recap persistence for RC Training.
 *
 * Append-only: an attempt is inserted once, before any recording, under a UUID the
 * caller may retain across retries, and is only ever finalized. A recording is
 * uploaded to a unique path with no overwrite, and a recap is reported `saved`
 * only after the object and the row have both been read back.
 *
 * Every write that can lose its response is reconciled by reading the row back
 * before the caller is told anything definite.
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
  /** Missing on pre-versioning records; those always use historical version 1. */
  segmentation_version?: 1 | 2;
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

/* ------------------------------------------------------------------ errors */

export type FailureKind = "missing_table" | "network" | "session" | "denied" | "other";

interface ErrorLike { code?: string; status?: number; statusCode?: string | number; message?: string }

/** Sort a Supabase or fetch failure into what the student can be told about it. */
export function classifyFailure(err: unknown): FailureKind {
  const e = (err ?? {}) as ErrorLike;
  const message = e.message ?? "";
  if (e.code === "PGRST205" || e.code === "42P01" || /could not find the table|relation .* does not exist/i.test(message)) return "missing_table";
  // An expired or absent identity says nothing about backend availability.
  if (e.status === 401 || Number(e.statusCode) === 401 || ["PGRST301", "PGRST302", "PGRST303"].includes(e.code ?? "")
    || /jwt|token.*expired|invalid.*token/i.test(message)) return "session";
  if (e.code === "42501" || e.status === 403 || Number(e.statusCode) === 403 || /row-level security|permission denied/i.test(message)) return "denied";
  if (err instanceof TypeError || /failed to fetch|network|load failed|timed? ?out|offline/i.test(message)) return "network";
  if (!e.code && e.status === undefined) return "network";
  if ((e.status ?? 0) >= 500 || e.status === 408) return "network";
  return "other";
}

/** Thrown when a write may or may not have committed and the read-back also failed. */
export class AttemptOutcomeUnknownError extends Error {
  constructor(readonly attemptId: string, readonly cause: unknown) {
    super("We could not confirm whether this attempt was saved.");
    this.name = "AttemptOutcomeUnknownError";
  }
}

export function recordingPath(studentId: string, attemptId: string, recapKey: string, mimeType: string, unique = newId()): string {
  return `${studentId}/${attemptId}/${recapKey}-${unique}.${extensionFor(mimeType)}`;
}

export function extensionFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mpeg")) return "mp3";
  return "webm";
}

/* ------------------------------------------------------------ availability */

export type BackendStatus =
  | { state: "available" }
  | { state: "unavailable"; reason: "missing_table" | "missing_storage" | "denied" }
  | { state: "unknown" };

/**
 * Read-only checks for both tables and the private recording folder. Available
 * means the reads answered, not that INSERT/UPDATE policies or uploads are proven.
 * The first actual create and subsequent writes still verify their own outcomes.
 */
export async function probeAttemptsBackend(studentId: string): Promise<BackendStatus> {
  try {
    for (const name of ["rc_recall_attempts", "rc_recall_recaps"]) {
      const { error } = await table(name).select("id").eq("student_id", studentId).limit(1);
      if (error) {
        const kind = classifyFailure(error);
        return kind === "missing_table" || kind === "denied" ? { state: "unavailable", reason: kind } : { state: "unknown" };
      }
    }
    const { error } = await supabase.storage.from(RECORDINGS_BUCKET).list(studentId, { limit: 1 });
    if (error) {
      if (/bucket.*not found|bucket.*does not exist/i.test(error.message ?? "")) return { state: "unavailable", reason: "missing_storage" };
      return classifyFailure(error) === "denied" ? { state: "unavailable", reason: "denied" } : { state: "unknown" };
    }
    return { state: "available" };
  } catch { return { state: "unknown" }; }
}

/* ---------------------------------------------------------------- attempts */

async function readAttempt(id: string, studentId: string): Promise<{ ok: boolean; row: AttemptRow | null }> {
  try {
    const { data, error } = await table("rc_recall_attempts").select("*").eq("id", id).eq("student_id", studentId).maybeSingle();
    if (error) return { ok: false, row: null };
    return { ok: true, row: (data as AttemptRow | null) ?? null };
  } catch { return { ok: false, row: null }; }
}

export async function createAttempt(input: {
  studentId: string; mode: RecallMode; preptest: number; section: number;
  passageIds: number[]; confirmationScope: ConfirmScope | null;
  segmentationVersion?: 1 | 2;
  /** Keep the same id across retries so a lost response cannot create a second attempt. */
  id?: string;
}): Promise<AttemptRow> {
  const row = {
    id: input.id ?? newId(),
    student_id: input.studentId,
    mode: input.mode,
    preptest: input.preptest,
    section: input.section,
    passage_ids: input.passageIds,
    confirmation_scope: input.mode === "rc_recall" ? input.confirmationScope ?? "all_read" : null,
    ...(input.segmentationVersion ? { segmentation_version: input.segmentationVersion } : {}),
  };
  let failure: unknown = null;
  try {
    const { data, error } = await table("rc_recall_attempts").insert(row).select().single();
    if (!error) {
      const saved = data as AttemptRow | null;
      if (!saved || saved.id !== row.id || saved.student_id !== input.studentId || (input.segmentationVersion && (saved.segmentation_version ?? 1) !== input.segmentationVersion)) throw new Error("The attempt could not be verified.");
      return saved;
    }
    failure = error;
  } catch (err) {
    if (err instanceof Error && err.message === "The attempt could not be verified.") throw err;
    failure = err;
  }
  // The row may exist even though the response did not arrive, or the id may
  // already be taken by an earlier try. Read it back before saying anything.
  if (classifyFailure(failure) === "missing_table") throw failure;
  const read = await readAttempt(row.id, input.studentId);
  if (read.row) {
    if (input.segmentationVersion && (read.row.segmentation_version ?? 1) !== input.segmentationVersion) throw new Error("The attempt could not be verified.");
    return read.row;
  }
  if (read.ok) throw failure;
  throw new AttemptOutcomeUnknownError(row.id, failure);
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
  let failure: unknown;
  try {
    const { data, error } = await table("rc_recall_recaps").insert(row).select().single();
    if (error) throw error;
    const saved = data as RecapRow | null;
    if (!saved || saved.id !== row.id) throw new Error("The recap could not be verified.");
    return saved;
  } catch (error) { failure = error; }
  // The unique attempt/key pair identifies this operation even if its response was lost.
  const { data, error } = await table("rc_recall_recaps").select("*")
    .eq("student_id", input.studentId).eq("attempt_id", input.attemptId).eq("recap_key", input.recapKey).maybeSingle();
  if (!error && data) return data as RecapRow;
  throw failure;
}

export interface UploadInput {
  studentId: string; attemptId: string; recapId: string; path: string;
  blob: Blob; mimeType: string; durationMs: number | null;
}

/** Propagates a failed status write: a recap must never look settled when the marker did not land. */
export async function markRecapFailed(recapId: string, studentId: string): Promise<void> {
  const { error } = await table("rc_recall_recaps").update({ recording_state: "failed" })
    .eq("id", recapId).eq("student_id", studentId).neq("recording_state", "saved");
  if (error) throw error;
}

/** Reconcile a start failure known to this runner; never touch a saved or uploaded row. */
export async function markUnstartedRecapFailed(recapId: string, studentId: string): Promise<void> {
  const { error } = await table("rc_recall_recaps").update({ recording_state: "failed" })
    .eq("id", recapId).eq("student_id", studentId).eq("recording_state", "pending").is("object_path", null);
  if (error) throw error;
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
 * Repeating the same upload is safe: the path is unique to the recording and an
 * object already there is accepted only when its size matches.
 */
export async function uploadRecording(input: UploadInput): Promise<void> {
  const slash = input.path.lastIndexOf("/");
  const folder = input.path.slice(0, slash);
  const file = input.path.slice(slash + 1);
  try {
    const store = supabase.storage.from(RECORDINGS_BUCKET);
    const { error: uploadError } = await store.upload(input.path, input.blob, { contentType: input.mimeType, upsert: false });
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
    // A lost response may have committed the saved marker. Confirm before declaring failure.
    try {
      const { data, error } = await table("rc_recall_recaps").select("*")
        .eq("id", input.recapId).eq("student_id", input.studentId).eq("attempt_id", input.attemptId).maybeSingle();
      if (!error && data?.recording_state === "saved" && data.object_path === input.path) return;
    } catch { /* Keep the original failure unless the failed-status write also fails. */ }
    try { await markRecapFailed(input.recapId, input.studentId); }
    catch { throw new Error("The recording could not be confirmed and its saved status could not be updated. Keep the local copy and retry."); }
    throw err;
  }
}

/**
 * Finish an attempt once. If the response is lost or the attempt is already
 * finished, the stored row is read back and returned, so a repeated Finish or End
 * reports what the server actually holds instead of failing or overwriting it.
 */
export async function finalizeAttempt(input: {
  attemptId: string; studentId: string; elapsedSeconds: number; completed: boolean;
}): Promise<AttemptRow> {
  let data: unknown = null;
  let error: unknown = null;
  try {
    const result = await table("rc_recall_attempts")
      .update({ finished_at: new Date().toISOString(), elapsed_seconds: Math.max(0, Math.round(input.elapsedSeconds)), completed: input.completed })
      .eq("id", input.attemptId).eq("student_id", input.studentId).is("finished_at", null).select().single();
    data = result.data;
    error = result.error;
  } catch (failure) { error = failure; }
  if (error) {
    const read = await readAttempt(input.attemptId, input.studentId);
    if (read.row?.finished_at) return read.row;
    throw error;
  }
  const row = data as AttemptRow | null;
  if (!row || row.finished_at === null || row.completed !== input.completed) throw new Error("The attempt result could not be verified.");
  return row;
}

/* ----------------------------------------------------------------- history */

export const HISTORY_PAGE_SIZE = 25;

export interface AttemptPage { attempts: AttemptRow[]; recaps: RecapRow[]; hasMore: boolean; nextOffset: number }

/**
 * One deterministic page of history: newest first, ties broken by id, so no
 * attempt is skipped or repeated while paging past 50.
 */
export async function listAttempts(studentId: string, offset = 0, pageSize = HISTORY_PAGE_SIZE): Promise<AttemptPage> {
  const { data, error } = await table("rc_recall_attempts").select("*").eq("student_id", studentId)
    .order("started_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + pageSize);
  if (error) throw error;
  const fetched = (data ?? []) as AttemptRow[];
  const hasMore = fetched.length > pageSize;
  const attempts = fetched.slice(0, pageSize);
  if (!attempts.length) return { attempts, recaps: [], hasMore: false, nextOffset: offset };
  const recaps: RecapRow[] = [];
  const chunk = 1000;
  for (let from = 0; ; from += chunk) {
    const { data: recapData, error: recapError } = await table("rc_recall_recaps").select("*")
      .eq("student_id", studentId).in("attempt_id", attempts.map((a) => a.id)).order("id").range(from, from + chunk - 1);
    if (recapError) throw recapError;
    const page = (recapData ?? []) as RecapRow[];
    recaps.push(...page);
    if (page.length < chunk) break;
  }
  return { attempts, recaps, hasMore, nextOffset: offset + attempts.length };
}

/** Per-attempt recording summary that never overstates what was saved. */
export function summarizeRecordings(recaps: Pick<RecapRow, "recording_state">[]): { spoken: number; saved: number; failed: number; pending: number; silent: number } {
  const count = (s: RecordingState) => recaps.filter((r) => r.recording_state === s).length;
  const saved = count("saved"), failed = count("failed"), pending = count("pending");
  return { spoken: saved + failed + pending, saved, failed, pending, silent: count("not_recorded") };
}

/* ---------------------------------------------------------------- playback */

export const SIGNED_URL_SECONDS = 300;

/**
 * A short-lived private link to a recording the database says is saved, for the
 * student who owns it. The object is confirmed to exist first; anything else
 * (another account's path, an unsaved row, a missing object) is refused.
 */
export async function signedRecordingUrl(
  studentId: string,
  recap: Pick<RecapRow, "student_id" | "recording_state" | "object_path">,
  options: { download?: boolean } = {},
): Promise<string> {
  const path = recap.object_path;
  if (recap.student_id !== studentId || recap.recording_state !== "saved" || !path || !path.startsWith(`${studentId}/`)) {
    throw new Error("This recording is not available to play.");
  }
  const store = supabase.storage.from(RECORDINGS_BUCKET);
  const slash = path.lastIndexOf("/");
  const file = path.slice(slash + 1);
  const { data: listed, error: listError } = await store.list(path.slice(0, slash), { search: file });
  if (listError) throw listError;
  if (!listed?.some((o) => o.name === file)) throw new Error("This recording could not be found in storage.");
  const { data, error } = await store.createSignedUrl(path, SIGNED_URL_SECONDS, options.download ? { download: true } : undefined);
  if (error || !data?.signedUrl) throw error ?? new Error("A playback link could not be created.");
  return data.signedUrl;
}


/** Fresh owner-scoped server state before resuming a device checkpoint. */
export async function readAttemptProgress(attemptId: string, studentId: string): Promise<{ attempt: AttemptRow; recaps: RecapRow[] }> {
  const read = await readAttempt(attemptId, studentId);
  if (!read.ok || !read.row) throw new Error("This attempt could not be checked. Try again before continuing.");
  const { data, error } = await table("rc_recall_recaps").select("*")
    .eq("student_id", studentId).eq("attempt_id", attemptId).order("id");
  if (error) throw error;
  return { attempt: read.row, recaps: (data ?? []) as RecapRow[] };
}
