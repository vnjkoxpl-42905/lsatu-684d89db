import { useCallback, useEffect, useRef, useState } from "react";
import { beginBackup, discard, markStopped, putChunk, recordingLockName, type BackupWrite } from "./lib/backup";
import { recordingPath } from "./lib/attempts";

/**
 * Records one spoken recap, and only that recap: it starts when the student
 * begins the recap and stops when they finish it, so silent reading and silent
 * recaps are never captured. Pieces are mirrored to the RC Training backup as they
 * arrive so a crash does not lose the recap, and every mirror write is checked.
 * When the backup cannot be kept, the recording still proceeds and the caller is
 * told, so nothing promises recovery that does not exist.
 */

/** Whether an on-device copy of this recording exists. */
export type BackupHealth = { ok: true } | { ok: false; reason: string };

export interface RecordedRecap {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  path: string;
  backup: BackupHealth;
}

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

export type StartResult = { ok: true; path: string; backup: BackupHealth } | { ok: false; reason: string };
export type PreparedResult = { ok: true; stream: MediaStream; mimeType: string } | { ok: false; reason: string };

export async function prepareRecapRecording(): Promise<PreparedResult> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    return { ok: false, reason: "This browser cannot record audio. Choose a silent recall instead." };
  }
  const mimeType = pickMime();
  if (!mimeType) return { ok: false, reason: "This browser has no supported recording format. Choose a silent recall instead." };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return { ok: true, stream, mimeType };
  } catch {
    return { ok: false, reason: "The microphone is blocked. Allow it, or choose a silent recall instead." };
  }
}

interface ActiveRun {
  recorder: MediaRecorder; stream: MediaStream; chunks: Blob[]; writes: Promise<BackupWrite>[]; recapId: string;
  mimeType: string; path: string; startedAt: number; releaseLock: (() => void) | null;
  /** First reason the backup stopped being trustworthy, if it did. */
  backupFailure: string | null;
  getChunkCount: () => number;
}

async function settleBackup(run: ActiveRun): Promise<BackupHealth> {
  const results = await Promise.all(run.writes);
  const failed = results.find((r) => r.ok === false);
  if (failed && failed.ok === false && !run.backupFailure) run.backupFailure = failed.reason;
  return run.backupFailure ? { ok: false, reason: run.backupFailure } : { ok: true };
}

export function useRecapRecorder() {
  const active = useRef<ActiveRun | null>(null);
  const [backupHealth, setBackupHealth] = useState<BackupHealth | null>(null);

  const cleanup = useCallback(() => {
    active.current?.stream.getTracks().forEach((t) => t.stop());
    active.current = null;
  }, []);

  useEffect(() => () => {
    // Leaving mid-recap keeps the backup so it can be recovered later.
    const run = active.current;
    const seal = () => {
      void settleBackup(run!).then(() => markStopped(run!.recapId, Date.now() - run!.startedAt, run!.getChunkCount())).finally(() => run!.releaseLock?.());
    };
    if (run && run.recorder.state !== "inactive") {
      run.recorder.onstop = () => { seal(); run.stream.getTracks().forEach((t) => t.stop()); };
      try { run.recorder.stop(); } catch { /* already stopped */ }
    } else if (run) seal();
    cleanup();
  }, [cleanup]);

  const start = useCallback(async (meta: { recapId: string; attemptId: string; studentId: string; recapKey: string }, prepared: Extract<PreparedResult, { ok: true }>): Promise<StartResult> => {
    const { stream, mimeType } = prepared;
    const path = recordingPath(meta.studentId, meta.attemptId, meta.recapKey, mimeType);
    let releaseLock: (() => void) | null = null;
    let backupCreated = false;
    try {
      if (navigator.locks?.request) {
        let resolveGrant!: (granted: boolean) => void;
        const granted = new Promise<boolean>((resolve) => { resolveGrant = resolve; });
        const held = new Promise<void>((resolve) => { releaseLock = resolve; });
        void navigator.locks.request(recordingLockName(meta.recapId), { ifAvailable: true }, async (lock) => {
          resolveGrant(Boolean(lock));
          if (lock) await held;
        }).catch(() => resolveGrant(false));
        if (!await granted) { stream.getTracks().forEach((t) => t.stop()); return { ok: false, reason: "This recall is already recording in another tab. Finish it there first." }; }
      }
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      const writes: Promise<BackupWrite>[] = [];
      let seq = 0;
      const begun = await beginBackup({ recapId: meta.recapId, attemptId: meta.attemptId, studentId: meta.studentId, path, mimeType, startedAt: Date.now() });
      if (begun.ok === false && begun.existing) {
        stream.getTracks().forEach((t) => t.stop());
        releaseLock?.();
        return { ok: false, reason: begun.reason };
      }
      backupCreated = begun.ok;
      setBackupHealth(begun);
      const run: ActiveRun = {
        recorder, stream, chunks, writes, recapId: meta.recapId, mimeType, path, startedAt: Date.now(), releaseLock,
        backupFailure: begun.ok === false ? begun.reason : null, getChunkCount: () => seq,
      };
      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        chunks.push(event.data);
        // Once one piece fails to save, the on-device copy has a hole; keep going
        // for the upload but remember that the copy cannot be trusted.
        writes.push(putChunk(meta.recapId, seq++, event.data).then((result) => {
          if (result.ok === false && !run.backupFailure) { run.backupFailure = result.reason; setBackupHealth(result); }
          return result;
        }));
      };
      active.current = run;
      recorder.start(5000);
      return { ok: true, path, backup: begun.ok === false ? { ok: false, reason: begun.reason } : { ok: true } };
    } catch {
      // Preserve any audio, but seal the failed start so an empty run can be retried.
      if (backupCreated) await markStopped(meta.recapId, 0, active.current?.getChunkCount() ?? 0);
      active.current = null;
      stream.getTracks().forEach((t) => t.stop());
      releaseLock?.();
      return { ok: false, reason: "Recording could not start. Try again or choose a silent recall instead." };
    }
  }, []);

  const stop = useCallback((): Promise<RecordedRecap | null> => new Promise((resolve) => {
    const run = active.current;
    if (!run) { resolve(null); return; }
    const finish = async () => {
      const durationMs = Date.now() - run.startedAt;
      const blob = new Blob(run.chunks, { type: run.mimeType });
      let backup = await settleBackup(run);
      const sealed = await markStopped(run.recapId, durationMs, run.getChunkCount());
      if (sealed.ok === false && backup.ok === true) backup = { ok: false, reason: sealed.reason };
      run.releaseLock?.();
      cleanup();
      resolve(blob.size ? { blob, mimeType: run.mimeType, durationMs, path: run.path, backup } : null);
    };
    if (run.recorder.state === "inactive") { void finish(); return; }
    run.recorder.onstop = finish;
    run.recorder.stop();
  }), [cleanup]);

  /** Drop a run that produced nothing, so it is not offered for recovery. */
  const forget = useCallback((recapId: string) => discard(recapId), []);

  return { backupHealth, prepare: prepareRecapRecording, start, stop, forget, isRecording: () => active.current !== null, activeRecapId: () => active.current?.recapId ?? null };
}
