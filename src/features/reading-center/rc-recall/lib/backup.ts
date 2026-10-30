import { openDB, type IDBPDatabase } from "idb";

/**
 * Crash-safety copy of an RC Training recap recording, on the student's machine.
 *
 * This is its own IndexedDB namespace. It shares nothing with the LR recording
 * backup, and nothing recovered here is ever sent through LR recovery or grading.
 * Each run is one spoken recap, keyed by the recap row's id.
 *
 * Writes report whether they landed. A caller that cannot get a backup must say
 * so; it must not promise recovery from storage that never held the audio.
 */

export const DB_NAME = "rc-recall-backup";
/** With Web Locks absent, a run that wrote a piece this recently is treated as still recording. */
export const LIVE_HEARTBEAT_MS = 3 * 60 * 1000;
export const recordingLockName = (recapId: string) => `rc-recall-recording:${recapId}`;
export const recoveryLockName = (recapId: string) => `rc-recall-recovery:${recapId}`;
const DB_VERSION = 1;
const RUNS = "runs";
const CHUNKS = "chunks";

export interface BackupRun {
  /** The recap row id. */
  recapId: string;
  /** Set for continuous captures; recapId remains the backup storage key. */
  captureId?: string;
  attemptId: string;
  studentId: string;
  /** Unique storage path decided before recording starts. */
  path: string;
  mimeType: string;
  startedAt: number;
  durationMs?: number;
  /** True once the recorder stopped cleanly and the run is ready to upload. */
  stopped?: boolean;
  /** How many pieces the recorder produced, known once it stopped. */
  chunkCount?: number;
  /** Last time a piece was written. Used to spot a dead recorder when Web Locks are absent. */
  heartbeatAt?: number;
  recoveryLease?: { token: string; expires: number };
}

interface Chunk { key: string; recapId: string; seq: number; bytes: ArrayBuffer }

export type BackupWrite = { ok: true } | { ok: false; reason: string; existing?: boolean };

let dbp: Promise<IDBPDatabase> | null = null;
function db(): Promise<IDBPDatabase> {
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(instance) {
        instance.createObjectStore(RUNS, { keyPath: "recapId" });
        const chunks = instance.createObjectStore(CHUNKS, { keyPath: "key" });
        chunks.createIndex("byRecap", "recapId");
      },
    }).catch((error) => { dbp = null; throw error; });
  }
  return dbp;
}

/** Test hook: forget the cached connection. */
export function resetBackupConnection(): void { dbp = null; }

function toBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/** A student-facing reason that does not expose browser internals. */
export function describeStorageFailure(error: unknown): string {
  const name = (error as { name?: string } | null)?.name ?? "";
  if (name === "QuotaExceededError" || /quota/i.test(String((error as Error | null)?.message ?? ""))) {
    return "This device is out of storage space for a backup copy.";
  }
  return "This browser cannot keep a backup copy of the recording.";
}

export async function beginBackup(run: BackupRun): Promise<BackupWrite> {
  try {
    const d = await db();
    const prior = await d.get(RUNS, run.recapId) as BackupRun | undefined;
    const priorLive = prior && !prior.stopped ? await isRunLive(prior) : false;
    const tx = d.transaction([RUNS, CHUNKS], "readwrite");
    const runs = tx.objectStore(RUNS);
    const existing = await runs.get(run.recapId) as BackupRun | undefined;
    const chunks = await tx.objectStore(CHUNKS).index("byRecap").count(run.recapId);
    const unchanged = existing?.path === prior?.path && existing?.heartbeatAt === prior?.heartbeatAt;
    if (existing && existing.path !== run.path && (chunks > 0 || priorLive || !unchanged)) {
      await tx.done;
      return { ok: false, existing: true, reason: "A recording for this recall still needs recovery. Save your place and leave, then retry recordings before recording it again." };
    }
    await runs.put({ ...run, heartbeatAt: run.heartbeatAt ?? Date.now() });
    await tx.done;
    return { ok: true };
  }
  catch (error) { return { ok: false, reason: describeStorageFailure(error) }; }
}

export async function putChunk(recapId: string, seq: number, blob: Blob): Promise<BackupWrite> {
  try {
    const bytes = await toBuffer(blob);
    const d = await db();
    await d.put(CHUNKS, { key: `${recapId}:${String(seq).padStart(8, "0")}`, recapId, seq, bytes } satisfies Chunk);
    const run = (await d.get(RUNS, recapId)) as BackupRun | undefined;
    if (run && !run.stopped) await d.put(RUNS, { ...run, heartbeatAt: Date.now() });
    return { ok: true };
  } catch (error) { return { ok: false, reason: describeStorageFailure(error) }; }
}

export async function markStopped(recapId: string, durationMs: number, chunkCount?: number): Promise<BackupWrite> {
  try {
    const d = await db();
    const run = (await d.get(RUNS, recapId)) as BackupRun | undefined;
    if (!run) return { ok: false, reason: "No backup copy exists for this recording." };
    await d.put(RUNS, { ...run, durationMs, stopped: true, chunkCount, heartbeatAt: Date.now() });
    return { ok: true };
  } catch (error) { return { ok: false, reason: describeStorageFailure(error) }; }
}

/** Undo a clean-stop marker when the recorder reports an interruption while it is being sealed. */
export async function markInterrupted(recapId: string): Promise<BackupWrite> {
  try {
    const d = await db();
    const tx = d.transaction(RUNS, "readwrite");
    const run = await tx.store.get(recapId) as BackupRun | undefined;
    if (run) await tx.store.put({ ...run, stopped: false, chunkCount: undefined });
    await tx.done;
    return { ok: true };
  } catch (error) { return { ok: false, reason: describeStorageFailure(error) }; }
}

/** Every run for this student. Throws when storage cannot be read, so callers can say so. */
export async function readRuns(studentId: string): Promise<BackupRun[]> {
  const all = (await (await db()).getAll(RUNS)) as BackupRun[];
  return all.filter((r) => r.studentId === studentId);
}

export async function listRuns(studentId: string): Promise<BackupRun[]> {
  try { return await readRuns(studentId); } catch { return []; }
}

export type AssembleResult =
  | { ok: true; blob: Blob }
  | { ok: false; reason: "empty" | "incomplete" | "unreadable"; missing: number[] };

/**
 * The pieces in sequence order, only if they are all there. Pieces must run
 * 0..n-1 without a gap, and n must match the count the recorder reported when it
 * stopped. A run with a hole is never stitched into audio that skips ahead.
 */
export async function assemble(run: BackupRun): Promise<AssembleResult> {
  try {
    const chunks = (await (await db()).getAllFromIndex(CHUNKS, "byRecap", run.recapId)) as Chunk[];
    if (!chunks.length) return { ok: false, reason: "empty", missing: [] };
    chunks.sort((a, b) => a.seq - b.seq);
    const have = new Set(chunks.map((c) => c.seq));
    const expected = run.chunkCount ?? chunks[chunks.length - 1].seq + 1;
    const missing: number[] = [];
    for (let seq = 0; seq < expected; seq++) if (!have.has(seq)) missing.push(seq);
    if (missing.length || chunks.length !== expected) return { ok: false, reason: "incomplete", missing };
    return { ok: true, blob: new Blob(chunks.map((c) => c.bytes), { type: run.mimeType }) };
  } catch { return { ok: false, reason: "unreadable", missing: [] }; }
}

export async function discard(recapId: string): Promise<void> {
  try {
    const d = await db();
    const tx = d.transaction([RUNS, CHUNKS], "readwrite");
    await tx.objectStore(RUNS).delete(recapId);
    const keys = await tx.objectStore(CHUNKS).index("byRecap").getAllKeys(recapId);
    await Promise.all(keys.map((k) => tx.objectStore(CHUNKS).delete(k)));
    await tx.done;
  } catch { /* the copy stays; nothing is lost by failing to remove it */ }
}

/** Save an on-device copy as a file, for when an upload keeps failing. */
export async function downloadRun(run: BackupRun): Promise<boolean> {
  const result = await assemble(run);
  if (result.ok === false || typeof document === "undefined") return false;
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = run.path.slice(run.path.lastIndexOf("/") + 1);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

export type Uploader = (input: { run: BackupRun; blob: Blob }) => Promise<void>;

export type RecoveryOutcome = "recovered" | "failed" | "empty" | "incomplete" | "live" | "busy";
export interface RecoveryDetail { run: BackupRun; outcome: RecoveryOutcome; reason?: string }

export interface RecoveryResult {
  recovered: number;
  /** Complete recordings whose upload did not succeed. They stay on this device. */
  failed: number;
  /** Runs that produced no audio at all. */
  empty: number;
  /** Runs with missing pieces. Kept as they are; never uploaded as if whole. */
  incomplete: number;
  /** Runs another tab is still recording. */
  live: number;
  details: RecoveryDetail[];
  /** Set when device storage could not be read at all. */
  storageError?: string;
}

const inFlight = new Set<string>();

/** Is this run still being written by a live recorder, in this or another tab? */
export async function isRunLive(run: BackupRun): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.locks?.query) {
    try { return (await navigator.locks.query()).held?.some((lock) => lock.name === recordingLockName(run.recapId)) ?? false; }
    catch { /* fall through to the heartbeat */ }
  }
  return Date.now() - (run.heartbeatAt ?? run.startedAt) < LIVE_HEARTBEAT_MS;
}

/** One owner per run: the Web Lock across tabs where available, this page otherwise. */
async function withRecoveryOwnership<T>(recapId: string, work: () => Promise<T>): Promise<T | "busy"> {
  if (inFlight.has(recapId)) return "busy";
  inFlight.add(recapId);
  try {
    if (typeof navigator !== "undefined" && navigator.locks?.request) {
      return await navigator.locks.request(recoveryLockName(recapId), { ifAvailable: true }, async (lock) => (lock ? work() : "busy" as const));
    }
    // IndexedDB read/write transactions serialize ownership across tabs even without Web Locks.
    const token = crypto.randomUUID();
    const leaseMs = 120_000;
    const renew = async (claim = false): Promise<boolean> => {
      const tx = (await db()).transaction(RUNS, "readwrite");
      const run = await tx.store.get(recapId) as BackupRun | undefined;
      if (!run || (claim ? run.recoveryLease && run.recoveryLease.expires > Date.now() : run.recoveryLease?.token !== token)) {
        await tx.done;
        return false;
      }
      await tx.store.put({ ...run, recoveryLease: { token, expires: Date.now() + leaseMs } });
      await tx.done;
      return true;
    };
    if (!await renew(true)) return "busy";
    const heartbeat = setInterval(() => { void renew().catch(() => undefined); }, 30_000);
    try { return await work(); }
    finally {
      clearInterval(heartbeat);
      const tx = (await db()).transaction(RUNS, "readwrite");
      const run = await tx.store.get(recapId) as BackupRun | undefined;
      if (run?.recoveryLease?.token === token) await tx.store.put({ ...run, recoveryLease: undefined });
      await tx.done;
    }
  } finally { inFlight.delete(recapId); }
}

/**
 * Upload backed-up recaps the student never finished sending. Safe to call on
 * mount, from a button and on reconnect. A run still recording is left alone; a
 * run with missing pieces is reported and kept; a failed upload stays for the
 * next attempt. Only confirmed uploaded audio is discarded. Empty inactive
 * metadata is sealed so a subsequent recording can safely replace it.
 */
export async function recoverRcRecallBackups(
  studentId: string,
  upload: Uploader,
  isLive: (run: BackupRun) => boolean | Promise<boolean> = isRunLive,
): Promise<RecoveryResult> {
  const result: RecoveryResult = { recovered: 0, failed: 0, empty: 0, incomplete: 0, live: 0, details: [] };
  let runs: BackupRun[];
  try { runs = await readRuns(studentId); }
  catch (error) { result.storageError = describeStorageFailure(error); return result; }
  for (const run of runs) {
    const record = (outcome: RecoveryOutcome, reason?: string) => {
      result.details.push({ run, outcome, reason });
      if (outcome === "recovered") result.recovered += 1;
      else if (outcome === "live") result.live += 1;
      else if (outcome !== "busy") result[outcome] += 1;
    };
    if (!run.stopped && await isLive(run)) { record("live"); continue; }
    const owned = await withRecoveryOwnership(run.recapId, async () => {
      const assembled = await assemble(run);
      if (assembled.ok === false) {
        if (assembled.reason === "empty") {
          // No audio exists. Seal an abandoned run so a later start may replace
          // its metadata, without deleting any backup or risking an active run.
          if (!run.stopped) await markStopped(run.recapId, 0, 0);
          record("empty");
        } else record(assembled.reason === "incomplete" ? "incomplete" : "failed", assembled.reason === "incomplete" ? `Missing pieces: ${assembled.missing.join(", ")}` : "The backup copy could not be read.");
        return;
      }
      if (assembled.blob.size === 0) { record("empty"); return; }
      if (!run.stopped) {
        record("incomplete", "Recording stopped unexpectedly. The end may be missing. A copy is kept on this device.");
        return;
      }
      try {
        await upload({ run, blob: assembled.blob });
        await discard(run.recapId);
        record("recovered");
      } catch (error) { record("failed", error instanceof Error ? error.message : "Upload failed."); }
    });
    if (owned === "busy") record("busy");
  }
  return result;
}
