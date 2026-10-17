import { openDB, type IDBPDatabase } from "idb";

/**
 * A crash-proof copy of a section recording, on the student's own machine.
 *
 * A Read, Recall, Colour section is twenty minutes of one unbroken recording,
 * and until this existed all twenty lived in the tab's memory until the moment
 * she finished. A crash, a closed lid or a flat battery at minute nineteen took
 * every second of it, and nothing anywhere knew it had ever happened.
 *
 * So the recorder now runs a SECOND time over the same microphone, emitting a
 * piece every few seconds, and the pieces land here as they are made. Nothing
 * is uploaded during the run: this is her disk, not the network, so it costs no
 * bandwidth and cannot stall her.
 *
 * ## Why a second recorder rather than chunking the first
 *
 * Measured in Chrome, on the real product:
 *
 *   no timeslice   1 piece    duration 5.88s   seeks with 0ms error
 *   timeslice      6 pieces   duration Infinity   cannot seek at all
 *
 * MediaRecorder writes the duration into the file when it stops. Ask it for
 * pieces as it goes and the header has already been emitted, so the duration
 * can never be filled in and the browser reports `Infinity`. Clips are cut out
 * of the single recording by seeking into it (ADR 0020), so chunking the
 * primary recorder would have quietly broken Clips to protect against a crash.
 *
 * The primary recorder is therefore left exactly as it was, and this is a
 * parallel copy that only has to be good enough to GRADE: Deepgram reads the
 * sound itself, and the stimulus boundaries are the app's own millisecond
 * stamps rather than anything read out of the container.
 *
 * ## Order is the whole correctness story
 *
 * Only the FIRST piece a MediaRecorder emits carries the EBML header; the rest
 * are bare clusters. Reassembled out of order the file does not begin with a
 * header and is not a WebM file at all. So every piece carries its sequence
 * number, writes are serialised per run, and assembly sorts before joining.
 *
 * ## Everything here is best-effort
 *
 * Private windows, full disks and browsers with storage disabled all make
 * IndexedDB throw. A backup that cannot be written must never take down the
 * run it exists to protect, so every function swallows its own failures and
 * the drill continues without it.
 */

const DB_NAME = "ac-recording-backup";
const DB_VERSION = 2;
const CHUNKS = "chunks";
const RUNS = "runs";
const ROWS = "rows";

/** Anything older than this was abandoned long ago and is only taking up room. */
export const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** What a recovered recording needs to know about itself to be uploaded. */
export interface BackupRun {
  runId: string;
  assignmentId: string;
  studentId: string;
  attempt: number;
  /** Where this recording belongs in storage, decided before it existed. */
  path: string;
  bucket: string;
  mimeType: string;
  startedAt: number;
  /**
   * Until when this run should be assumed to still be recording.
   *
   * Set when the run is announced and pushed forward by every piece written,
   * so it is a heartbeat rather than a guess about how long a section lasts.
   * It lives in the record, not in memory, because memory is per tab: a second
   * tab that opened any section page mid-run found this record pending, saw no
   * tab of its own claiming it, uploaded the first minutes over the run's own
   * path and threw the backup away. Absent on records from before it existed,
   * which read as not live.
   */
  liveUntil?: number;
}

/**
 * How long after the last piece a run is still treated as live.
 *
 * Pieces arrive every few seconds while a tab is recording, so a minute of
 * silence is a tab that has gone: crashed, closed, or a laptop lid. Long enough
 * that a stall in writing never lets another tab steal the run; short enough
 * that a real crash is recoverable on the next open rather than tomorrow.
 */
export const LIVE_GRACE_MS = 60 * 1000;

/** True if the record says some tab was still recording this run at `now`. */
export function isLive(run: BackupRun, now = Date.now()): boolean {
  return typeof run.liveUntil === "number" && run.liveUntil > now;
}

interface Chunk {
  key: string;
  runId: string;
  seq: number;
  /**
   * The bytes, not the Blob.
   *
   * IndexedDB can store a Blob, and storing one is the obvious thing to do, but
   * what comes back is not guaranteed to still be a Blob: it survives by
   * structured clone, and support has been uneven across browsers and is absent
   * in some test environments. An ArrayBuffer clones the same way everywhere.
   */
  bytes: ArrayBuffer;
}

/** `Blob.arrayBuffer` where it exists, and the older road where it does not. */
function toArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

function available(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

let dbp: Promise<IDBPDatabase> | null = null;
function db(): Promise<IDBPDatabase> {
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(instance) {
        if (!instance.objectStoreNames.contains(RUNS)) {
          instance.createObjectStore(RUNS, { keyPath: "runId" });
        }
        if (!instance.objectStoreNames.contains(CHUNKS)) {
          const store = instance.createObjectStore(CHUNKS, { keyPath: "key" });
          store.createIndex("runId", "runId");
        }
        if (!instance.objectStoreNames.contains(ROWS)) {
          const store = instance.createObjectStore(ROWS, { keyPath: "key" });
          store.createIndex("runId", "runId");
        }
      },
    });
  }
  return dbp;
}

/**
 * Writes, one after another, per run.
 *
 * Pieces arrive from a recorder callback and are written asynchronously, so two
 * can be in flight at once. Left to race they can land out of order, which is
 * the documented way these files get corrupted: the header stops being first
 * and the recording becomes unreadable. The chain costs nothing and removes the
 * failure entirely.
 */
const writeChains = new Map<string, Promise<unknown>>();
function serialised<T>(runId: string, work: () => Promise<T>): Promise<T> {
  const previous = writeChains.get(runId) ?? Promise.resolve();
  const next = previous.then(work, work);
  writeChains.set(runId, next.catch(() => undefined));
  return next;
}

/**
 * Runs this tab is recording right now.
 *
 * Recovery uploads a pending run on the assumption that nobody is still making
 * it. The live run is pending too -- it is only finished at the end -- so
 * without this a student who reopens a section mid-sitting could have her own
 * half-recording uploaded over the top of itself. Cleared when the run ends.
 */
const active = new Set<string>();
/**
 * Runs this tab has thrown away.
 *
 * A recorder's last piece arrives AFTER it is told to stop, as an event, so a
 * run discarded on the way out of a section can be resurrected by its own
 * final chunk: `putChunk` would re-file the piece and put the run record
 * back, and recovery would upload the pieces of a sitting that was abandoned
 * on purpose. A discarded run takes no more pieces.
 */
const discarded = new Set<string>();

/** True while this tab is still producing that run. */
export function isActive(runId: string): boolean {
  return active.has(runId);
}

/** Announce a run, so a recovered pile of pieces knows where it belongs. */
export async function beginBackup(run: BackupRun): Promise<void> {
  active.add(run.runId);
  discarded.delete(run.runId);
  if (!available()) return;
  try {
    await (await db()).put(RUNS, { ...run, liveUntil: Date.now() + LIVE_GRACE_MS });
  } catch (e) {
    console.error("[rrc] could not open the local recording backup", e);
  }
}

/** One piece of the recording, in the order it was produced. */
export async function putChunk(runId: string, seq: number, blob: Blob): Promise<void> {
  if (!available()) return;
  if (discarded.has(runId)) return;
  await serialised(runId, async () => {
    if (discarded.has(runId)) return;
    try {
      const chunk: Chunk = {
        key: `${runId}:${String(seq).padStart(6, "0")}`,
        runId,
        seq,
        bytes: await toArrayBuffer(blob),
      };
      const instance = await db();
      await instance.put(CHUNKS, chunk);
      // The heartbeat. A piece just landed, so whoever is recording this run
      // is still here; say so where every tab can read it.
      const run = (await instance.get(RUNS, runId)) as BackupRun | undefined;
      if (run) await instance.put(RUNS, { ...run, liveUntil: Date.now() + LIVE_GRACE_MS });
    } catch (e) {
      // A full disk or a private window. The run continues; the primary
      // recording is unaffected and is still the real one.
      console.error("[rrc] could not keep a local copy of a recording chunk", e);
    }
  });
}

/** Every run that was started and never finished. */
export async function listPendingRuns(): Promise<BackupRun[]> {
  if (!available()) return [];
  try {
    return (await (await db()).getAll(RUNS)) as BackupRun[];
  } catch {
    return [];
  }
}

/**
 * Put a run's pieces back together.
 *
 * Sorted by sequence, never by insertion order, because only the first piece
 * carries the header and a file that does not start with it is not a file.
 */
export async function assemble(run: BackupRun): Promise<Blob | null> {
  if (!available()) return null;
  try {
    const chunks = (await (await db()).getAllFromIndex(CHUNKS, "runId", run.runId)) as Chunk[];
    if (!chunks.length) return null;
    chunks.sort((a, b) => a.seq - b.seq);
    return new Blob(chunks.map((c) => c.bytes), { type: run.mimeType });
  } catch (e) {
    console.error("[rrc] could not reassemble a recovered recording", e);
    return null;
  }
}

/** Forget a run: it is safely uploaded, or it is not worth keeping. */
export async function discard(runId: string): Promise<void> {
  active.delete(runId);
  discarded.add(runId);
  if (!available()) return;
  // Behind every piece still being written, so none of them lands after the
  // sweep and leaves the run half-present.
  await serialised(runId, async () => {
    try {
      const instance = await db();
      const keys = await instance.getAllKeysFromIndex(CHUNKS, "runId", runId);
      const tx = instance.transaction([CHUNKS, RUNS], "readwrite");
      await Promise.all([
        ...keys.map((k) => tx.objectStore(CHUNKS).delete(k)),
        tx.objectStore(RUNS).delete(runId),
        tx.done,
      ]);
    } catch (e) {
      console.error("[rrc] could not clear a local recording backup", e);
    }
  });
  writeChains.delete(runId);
}

/**
 * A response row that never reached the database, kept where the recording is.
 *
 * The other half of the same failure. A recording that does not upload is
 * stashed above and re-sent on the next entry; a row that does not insert had
 * nowhere to go at all. It lived in the component's memory, she left the
 * finishing screen, and the answers were gone -- while the recording, which may
 * have uploaded perfectly, could then be marked by nothing, ever.
 */
export interface StashedRow {
  key: string;
  runId: string;
  assignmentId: string;
  studentId: string;
  /** `item_order`, which is what makes the key unique within a run. */
  itemOrder: number;
  /** When it was stashed, which is what bounds it. */
  stashedAt: number;
  /** The row as `buildRow` made it, ready to be re-sent unchanged. */
  row: unknown;
}

/**
 * Keep the rows a run could not save.
 *
 * Deliberately its own store rather than a field on the run record, because
 * the two have different lifetimes and the obvious shared one is wrong. A run
 * whose recording uploads is discarded the moment it lands -- that is the
 * point of `discard` -- and the missing-row case is very often exactly that
 * run: the audio is safely away and the answers are not. Hung off the run
 * record, the rows would be deleted by the success of the upload.
 *
 * So `discard` does not touch them and `purgeStaleRows` bounds them by their
 * own age instead, on the same seven days.
 */
export async function stashRows(rows: Omit<StashedRow, "key" | "stashedAt">[], now = Date.now()): Promise<void> {
  if (!available() || !rows.length) return;
  try {
    const instance = await db();
    const tx = instance.transaction(ROWS, "readwrite");
    await Promise.all([
      ...rows.map((r) =>
        tx.objectStore(ROWS).put({
          ...r,
          key: `${r.runId}:${String(r.itemOrder).padStart(4, "0")}`,
          stashedAt: now,
        } satisfies StashedRow),
      ),
      tx.done,
    ]);
  } catch (e) {
    // She has finished twenty unbroken minutes. A stash that cannot be written
    // leaves the run exactly as ungradable as it already was, and no worse.
    console.error("[rrc] could not keep a local copy of the unsaved answers", e);
  }
}

/** Every row still waiting to be sent, across every run. */
export async function listStashedRows(): Promise<StashedRow[]> {
  if (!available()) return [];
  try {
    return (await (await db()).getAll(ROWS)) as StashedRow[];
  } catch {
    return [];
  }
}

/** Forget one row: it is safely stored. */
export async function discardRow(key: string): Promise<void> {
  if (!available()) return;
  try {
    await (await db()).delete(ROWS, key);
  } catch (e) {
    console.error("[rrc] could not clear a recovered answer", e);
  }
}

/**
 * Drop stashed rows nobody is coming back for.
 *
 * The rows outlive their run record by design, so `purgeStale` above cannot
 * bound them and this does it on the same seven days. A row is a few kilobytes
 * where a recording is fifteen megabytes, which is why this is a separate
 * sweep rather than a reason to keep the run record alive.
 */
export async function purgeStaleRows(now = Date.now(), maxAgeMs = STALE_AFTER_MS): Promise<number> {
  const rows = await listStashedRows();
  const stale = rows.filter((r) => now - r.stashedAt > maxAgeMs);
  for (const row of stale) await discardRow(row.key);
  return stale.length;
}

/**
 * Drop anything old enough that nobody is coming back for it.
 *
 * Fifteen megabytes a section is nothing on its own and is not nothing forever.
 * A student who abandons a section and never returns to that assignment would
 * otherwise carry it for the life of the browser profile.
 */
export async function purgeStale(now = Date.now(), maxAgeMs = STALE_AFTER_MS): Promise<number> {
  const runs = await listPendingRuns();
  const stale = runs.filter((r) => now - r.startedAt > maxAgeMs);
  for (const run of stale) await discard(run.runId);
  return stale.length;
}
