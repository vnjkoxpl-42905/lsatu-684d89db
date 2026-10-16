import { openDB, type IDBPDatabase } from "idb";

/**
 * Crash-safety copy of an RC Recall recap recording, on the student's machine.
 *
 * This is its own IndexedDB namespace. It shares nothing with the LR recording
 * backup, and nothing recovered here is ever sent through LR recovery or grading.
 * Each run is one spoken recap, keyed by the recap row's id. Every function is
 * best-effort: storage that is unavailable must never stop a recap.
 */

export const DB_NAME = "rc-recall-backup";
export const ABANDONED_RECORDING_AGE_MS = 30 * 60 * 1000;
export const recordingLockName = (recapId: string) => `rc-recall-recording:${recapId}`;
const DB_VERSION = 1;
const RUNS = "runs";
const CHUNKS = "chunks";

export interface BackupRun {
  /** The recap row id. */
  recapId: string;
  attemptId: string;
  studentId: string;
  /** Unique storage path decided before recording starts. */
  path: string;
  mimeType: string;
  startedAt: number;
  durationMs?: number;
  /** True once the recorder stopped cleanly and the run is ready to upload. */
  stopped?: boolean;
}

interface Chunk { key: string; recapId: string; seq: number; bytes: ArrayBuffer }

let dbp: Promise<IDBPDatabase> | null = null;
function db(): Promise<IDBPDatabase> {
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(instance) {
        instance.createObjectStore(RUNS, { keyPath: "recapId" });
        const chunks = instance.createObjectStore(CHUNKS, { keyPath: "key" });
        chunks.createIndex("byRecap", "recapId");
      },
    });
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

export async function beginBackup(run: BackupRun): Promise<boolean> {
  try { await (await db()).put(RUNS, run); return true; } catch { return false; }
}

export async function putChunk(recapId: string, seq: number, blob: Blob): Promise<void> {
  try {
    const bytes = await toBuffer(blob);
    await (await db()).put(CHUNKS, { key: `${recapId}:${String(seq).padStart(8, "0")}`, recapId, seq, bytes } satisfies Chunk);
  } catch { /* best effort */ }
}

export async function markStopped(recapId: string, durationMs: number): Promise<void> {
  try {
    const d = await db();
    const run = (await d.get(RUNS, recapId)) as BackupRun | undefined;
    if (run) await d.put(RUNS, { ...run, durationMs, stopped: true });
  } catch { /* best effort */ }
}

export async function listRuns(studentId: string): Promise<BackupRun[]> {
  try {
    const all = (await (await db()).getAll(RUNS)) as BackupRun[];
    return all.filter((r) => r.studentId === studentId);
  } catch { return []; }
}

/** The pieces in sequence order. Only the first carries the container header. */
export async function assemble(run: BackupRun): Promise<Blob | null> {
  try {
    const chunks = (await (await db()).getAllFromIndex(CHUNKS, "byRecap", run.recapId)) as Chunk[];
    if (!chunks.length) return null;
    chunks.sort((a, b) => a.seq - b.seq);
    return new Blob(chunks.map((c) => c.bytes), { type: run.mimeType });
  } catch { return null; }
}

export async function discard(recapId: string): Promise<void> {
  try {
    const d = await db();
    const tx = d.transaction([RUNS, CHUNKS], "readwrite");
    await tx.objectStore(RUNS).delete(recapId);
    const keys = await tx.objectStore(CHUNKS).index("byRecap").getAllKeys(recapId);
    await Promise.all(keys.map((k) => tx.objectStore(CHUNKS).delete(k)));
    await tx.done;
  } catch { /* best effort */ }
}

export type Uploader = (input: { run: BackupRun; blob: Blob }) => Promise<void>;

export interface RecoveryResult { recovered: number; failed: number; empty: number }

/**
 * Upload backed-up recaps the student never finished sending. A run that is
 * still recording in another tab is left alone; an empty run is dropped; a run
 * whose upload fails stays for the next attempt.
 */
export async function recoverRcRecallBackups(
  studentId: string,
  upload: Uploader,
  isLive: (recapId: string) => boolean | Promise<boolean> = async (recapId) => {
    if (typeof navigator === "undefined" || !navigator.locks?.query) return true;
    try { return (await navigator.locks.query()).held?.some((lock) => lock.name === recordingLockName(recapId)) ?? false; }
    catch { return true; }
  },
): Promise<RecoveryResult> {
  const result: RecoveryResult = { recovered: 0, failed: 0, empty: 0 };
  for (const run of await listRuns(studentId)) {
    if (!run.stopped && (Date.now() - run.startedAt < ABANDONED_RECORDING_AGE_MS || await isLive(run.recapId))) continue;
    const blob = await assemble(run);
    if (!blob || blob.size === 0) { await discard(run.recapId); result.empty += 1; continue; }
    try {
      await upload({ run, blob });
      await discard(run.recapId);
      result.recovered += 1;
    } catch { result.failed += 1; }
  }
  return result;
}
