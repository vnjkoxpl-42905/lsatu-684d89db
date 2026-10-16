import { useCallback, useEffect, useRef } from "react";
import { beginBackup, discard, markStopped, putChunk, recordingLockName } from "./lib/backup";
import { recordingPath } from "./lib/attempts";

/**
 * Records one spoken recap, and only that recap: it starts when the student
 * begins the recap and stops when they finish it, so silent reading and silent
 * recaps are never captured. Pieces are mirrored to the RC Recall backup as they
 * arrive so a crash does not lose the recap.
 */

export interface RecordedRecap {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  path: string;
}

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

export type StartResult = { ok: true; path: string } | { ok: false; reason: string };
export type PreparedResult = { ok: true; stream: MediaStream; mimeType: string } | { ok: false; reason: string };

export async function prepareRecapRecording(): Promise<PreparedResult> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    return { ok: false, reason: "This browser cannot record audio. Choose a silent recap instead." };
  }
  const mimeType = pickMime();
  if (!mimeType) return { ok: false, reason: "This browser has no supported recording format. Choose a silent recap instead." };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return { ok: true, stream, mimeType };
  } catch {
    return { ok: false, reason: "The microphone is blocked. Allow it, or choose a silent recap instead." };
  }
}

export function useRecapRecorder() {
  const active = useRef<{
    recorder: MediaRecorder; stream: MediaStream; chunks: Blob[]; pendingChunks: Promise<void>[]; recapId: string;
    mimeType: string; path: string; startedAt: number; releaseLock: (() => void) | null;
  } | null>(null);

  const cleanup = useCallback(() => {
    active.current?.stream.getTracks().forEach((t) => t.stop());
    active.current = null;
  }, []);

  useEffect(() => () => {
    // Leaving mid-recap keeps the backup so it can be recovered later.
    const run = active.current;
    if (run && run.recorder.state !== "inactive") {
      run.recorder.onstop = () => {
        void Promise.all(run.pendingChunks).then(() => markStopped(run.recapId, Date.now() - run.startedAt)).finally(() => run.releaseLock?.());
        run.stream.getTracks().forEach((t) => t.stop());
      };
      try { run.recorder.stop(); } catch { /* already stopped */ }
    } else if (run) {
      void Promise.all(run.pendingChunks).then(() => markStopped(run.recapId, Date.now() - run.startedAt)).finally(() => run.releaseLock?.());
    }
    cleanup();
  }, [cleanup]);

  const start = useCallback(async (meta: { recapId: string; attemptId: string; studentId: string; recapKey: string }, prepared: Extract<PreparedResult, { ok: true }>): Promise<StartResult> => {
    const { stream, mimeType } = prepared;
    const path = recordingPath(meta.studentId, meta.attemptId, meta.recapKey, mimeType);
    let releaseLock: (() => void) | null = null;
    try {
      if (navigator.locks?.request) {
        let resolveGrant!: (granted: boolean) => void;
        const granted = new Promise<boolean>((resolve) => { resolveGrant = resolve; });
        const held = new Promise<void>((resolve) => { releaseLock = resolve; });
        void navigator.locks.request(recordingLockName(meta.recapId), { ifAvailable: true }, async (lock) => {
          resolveGrant(Boolean(lock));
          if (lock) await held;
        }).catch(() => resolveGrant(false));
        if (!await granted) { stream.getTracks().forEach((t) => t.stop()); return { ok: false, reason: "This recap is already recording in another tab. Finish it there first." }; }
      }
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      const pendingChunks: Promise<void>[] = [];
      let seq = 0;
      await beginBackup({ recapId: meta.recapId, attemptId: meta.attemptId, studentId: meta.studentId, path, mimeType, startedAt: Date.now() });
      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        chunks.push(event.data);
        pendingChunks.push(putChunk(meta.recapId, seq++, event.data));
      };
      active.current = { recorder, stream, chunks, pendingChunks, recapId: meta.recapId, mimeType, path, startedAt: Date.now(), releaseLock };
      recorder.start(5000);
      return { ok: true, path };
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      releaseLock?.();
      return { ok: false, reason: "Recording could not start. Try again or choose a silent recap instead." };
    }
  }, []);

  const stop = useCallback((): Promise<RecordedRecap | null> => new Promise((resolve) => {
    const run = active.current;
    if (!run) { resolve(null); return; }
    const finish = async () => {
      const durationMs = Date.now() - run.startedAt;
      const blob = new Blob(run.chunks, { type: run.mimeType });
      await Promise.all(run.pendingChunks);
      await markStopped(run.recapId, durationMs);
      run.releaseLock?.();
      cleanup();
      resolve(blob.size ? { blob, mimeType: run.mimeType, durationMs, path: run.path } : null);
    };
    if (run.recorder.state === "inactive") { void finish(); return; }
    run.recorder.onstop = finish;
    run.recorder.stop();
  }), [cleanup]);

  /** Drop a run that produced nothing, so it is not offered for recovery. */
  const forget = useCallback((recapId: string) => discard(recapId), []);

  return { prepare: prepareRecapRecording, start, stop, forget, isRecording: () => active.current !== null, activeRecapId: () => active.current?.recapId ?? null };
}
