import { useCallback, useEffect, useRef, useState } from "react";
import { beginBackup, discard, markInterrupted, markStopped, putChunk, recordingLockName, type BackupWrite } from "./lib/backup";
import { recordingPath } from "./lib/attempts";

/**
 * Owns one microphone capture, either a legacy recap or a continuous exercise.
 * The caller controls its lifetime and marks recall windows on the monotonic
 * recording clock. Chunks are mirrored locally and every backup write is checked.
 * A backup failure never promises recovery that does not exist.
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

export type StartResult = { ok: true; path: string; backup: BackupHealth } | { ok: false; reason: string; preserveExisting?: boolean };
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
  interrupted: boolean;
  getChunkCount: () => number;
  offsetStart: number;
}

async function settleBackup(run: ActiveRun): Promise<BackupHealth> {
  const results = await Promise.all(run.writes);
  const failed = results.find((r) => r.ok === false);
  if (failed && failed.ok === false && !run.backupFailure) run.backupFailure = failed.reason;
  return run.backupFailure ? { ok: false, reason: run.backupFailure } : { ok: true };
}

export function useRecapRecorder() {
  const active = useRef<ActiveRun | null>(null);
  const mounted = useRef(true);
  const lifecycle = useRef(0);
  const [backupHealth, setBackupHealth] = useState<BackupHealth | null>(null);
  const [interruption, setInterruption] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [micAvailable, setMicAvailable] = useState(false);
  const meterCleanup = useRef<(() => void) | null>(null);
  const stopMeter = useCallback(() => {
    meterCleanup.current?.(); meterCleanup.current = null;
    if (mounted.current) { setMicLevel(0); setMicAvailable(false); }
  }, []);
  const startMeter = useCallback((stream: MediaStream) => {
    stopMeter();
    if (typeof AudioContext === "undefined" || typeof requestAnimationFrame === "undefined") return;
    let context: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let frame = 0; let stopped = false; let lastSample = -Infinity;
    const dispose = () => {
      stopped = true; cancelAnimationFrame(frame);
      try { source?.disconnect(); analyser?.disconnect(); } catch { /* Meter cleanup must not interrupt capture. */ }
      if (context && context.state !== "closed") void context.close().catch(() => undefined);
    };
    meterCleanup.current = dispose;
    try {
      context = new AudioContext(); source = context.createMediaStreamSource(stream); analyser = context.createAnalyser();
      analyser.fftSize = 256; source.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const sample = (now: number) => {
        if (stopped || !mounted.current) return;
        if (now - lastSample >= 80) {
          lastSample = now;
          try {
            if (context!.state === "running") {
              analyser!.getByteTimeDomainData(samples);
              const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
              setMicLevel(Math.min(1, rms * 4)); setMicAvailable(true);
            } else { setMicLevel(0); setMicAvailable(false); }
          } catch { stopMeter(); return; }
        }
        frame = requestAnimationFrame(sample);
      };
      if (context.state === "suspended") void context.resume().catch(() => undefined);
      frame = requestAnimationFrame(sample);
    } catch { stopMeter(); }
  }, [stopMeter]);

  const cleanup = useCallback(() => {
    stopMeter();
    active.current?.stream.getTracks().forEach((t) => t.stop());
    active.current = null;
  }, [stopMeter]);

  useEffect(() => {
    mounted.current = true;
    return () => {
    mounted.current = false;
    lifecycle.current += 1;
    // Leaving mid-recap keeps the backup so it can be recovered later.
    const run = active.current;
    const seal = () => {
      if (run!.interrupted) { run!.releaseLock?.(); return; }
      void settleBackup(run!).then(async () => {
        if (!run!.interrupted) await markStopped(run!.recapId, Math.max(1, Math.ceil(performance.now() - run!.offsetStart)), run!.getChunkCount());
        if (run!.interrupted) await markInterrupted(run!.recapId);
      }).finally(() => run!.releaseLock?.());
    };
    if (run && run.recorder.state !== "inactive") {
      run.recorder.onstop = () => { seal(); };
      try { run.recorder.stop(); } catch { /* already stopped */ }
    } else if (run) seal();
    cleanup();
    };
  }, [cleanup]);

  const start = useCallback(async (meta: { recapId: string; attemptId: string; studentId: string; recapKey: string; captureId?: string }, prepared: Extract<PreparedResult, { ok: true }>): Promise<StartResult> => {
    const generation = lifecycle.current;
    const { stream, mimeType } = prepared;
    const canceled = () => !mounted.current || lifecycle.current !== generation;
    const stopPrepared = () => { stream.getTracks().forEach((track) => track.stop()); releaseLock?.(); };
    if (canceled()) { stream.getTracks().forEach((track) => track.stop()); return { ok: false, reason: "Recording canceled before it started." }; }
    setInterruption(null);
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
        if (!await granted) { stream.getTracks().forEach((t) => t.stop()); return { ok: false, preserveExisting: true, reason: "This recall is already recording in another tab. Finish it there first." }; }
      }
      if (canceled()) { stopPrepared(); return { ok: false, reason: "Recording canceled before it started." }; }
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      const writes: Promise<BackupWrite>[] = [];
      let seq = 0;
      const begun = await beginBackup({ recapId: meta.recapId, captureId: meta.captureId, attemptId: meta.attemptId, studentId: meta.studentId, path, mimeType, startedAt: Date.now() });
      if (begun.ok === false && begun.existing) {
        stream.getTracks().forEach((t) => t.stop());
        releaseLock?.();
        return { ok: false, preserveExisting: true, reason: begun.reason };
      }
      backupCreated = begun.ok;
      if (canceled()) {
        if (backupCreated) await markStopped(meta.recapId, 0, 0);
        stopPrepared();
        return { ok: false, reason: "Recording canceled before it started." };
      }
      setBackupHealth(begun);
      const run: ActiveRun = {
        recorder, stream, chunks, writes, recapId: meta.recapId, mimeType, path, startedAt: Date.now(), releaseLock,
        offsetStart: performance.now(), backupFailure: begun.ok === false ? begun.reason : null, interrupted: false, getChunkCount: () => seq,
      };
      const interrupted = () => {
        stopMeter();
        run.interrupted = true;
        setInterruption("Recording stopped unexpectedly. Save your place and leave, then open Your attempts to recover any partial audio kept on this device. Interrupted audio is not used for automatic feedback.");
        run.stream.getTracks().forEach((track) => track.stop());
        run.releaseLock?.();
      };
      recorder.onstop = interrupted;
      recorder.onerror = interrupted;
      stream.getTracks().forEach((track) => track.addEventListener?.("ended", interrupted, { once: true }));
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
      startMeter(stream);
      return { ok: true, path, backup: begun.ok === false ? { ok: false, reason: begun.reason } : { ok: true } };
    } catch {
      // Preserve any audio, but seal the failed start so an empty run can be retried.
      stopMeter();
      if (backupCreated) await markStopped(meta.recapId, 0, active.current?.getChunkCount() ?? 0);
      active.current = null;
      stream.getTracks().forEach((t) => t.stop());
      releaseLock?.();
      return { ok: false, reason: "Recording could not start. Try again or choose a silent recall instead." };
    }
  }, [startMeter, stopMeter]);

  const stop = useCallback((): Promise<RecordedRecap | null> => new Promise((resolve) => {
    const run = active.current;
    if (!run) { resolve(null); return; }
    if (run.interrupted) { run.releaseLock?.(); cleanup(); resolve(null); return; }
    const finish = async () => {
      const durationMs = Math.max(1, Math.ceil(performance.now() - run.offsetStart));
      const blob = new Blob(run.chunks, { type: run.mimeType });
      let backup = await settleBackup(run);
      if (run.interrupted) { run.releaseLock?.(); cleanup(); resolve(null); return; }
      const sealed = await markStopped(run.recapId, durationMs, run.getChunkCount());
      if (run.interrupted) { await markInterrupted(run.recapId); run.releaseLock?.(); cleanup(); resolve(null); return; }
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

  const prepare = useCallback(async (): Promise<PreparedResult> => {
    const generation = lifecycle.current;
    const result = await prepareRecapRecording();
    if (!mounted.current || generation !== lifecycle.current) {
      if (result.ok) result.stream.getTracks().forEach((track) => track.stop());
      return { ok: false, reason: "The microphone request was canceled." };
    }
    return result;
  }, []);

  return { micLevel, micAvailable, backupHealth, interruption, prepare, start, stop, forget, getOffset: () => active.current ? Math.max(0, Math.round(performance.now() - active.current.offsetStart)) : 0, isRecording: () => active.current !== null, activeRecapId: () => active.current?.recapId ?? null };
}
