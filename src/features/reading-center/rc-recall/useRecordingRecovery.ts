import { useCallback, useEffect, useRef, useState } from "react";
import { uploadCapture } from "./lib/captures";
import { uploadRecording } from "./lib/attempts";
import { downloadRun, recoverRcRecallBackups, type BackupRun, type RecoveryResult } from "./lib/backup";

export interface RecoveryState {
  running: boolean;
  /** The last completed pass. Null until one has finished. */
  result: RecoveryResult | null;
  /** The last pass could not run at all, for example because the app crashed mid-way. */
  error: string | null;
}

/**
 * Upload recordings this device still holds, without the student asking: once on
 * entry and again whenever the connection returns. The same pass backs a manual
 * Retry button. Passes never overlap, and the recovery itself refuses to upload a
 * run another tab owns, so a reconnect cannot send the same recap twice.
 */
export function useRecordingRecovery(studentId: string | undefined, onRecovered?: () => void, enabled = true) {
  const [state, setState] = useState<RecoveryState>({ running: false, result: null, error: null });
  const running = useRef<string | null>(null);
  const currentStudent = useRef(studentId);
  currentStudent.current = studentId;
  const [resultOwner, setResultOwner] = useState<string | undefined>();
  const notify = useRef(onRecovered);
  notify.current = onRecovered;

  const retry = useCallback(async (): Promise<RecoveryResult | null> => {
    if (!enabled || !studentId || running.current === studentId) return null;
    running.current = studentId;
    setState((s) => ({ ...s, running: true, error: null }));
    try {
      const result = await recoverRcRecallBackups(studentId, ({ run, blob }) => run.captureId ? uploadCapture({ studentId: run.studentId, attemptId: run.attemptId, captureId: run.captureId, path: run.path, blob, mimeType: run.mimeType, durationMs: run.durationMs ?? 0 }) : uploadRecording({
        studentId: run.studentId, attemptId: run.attemptId, recapId: run.recapId, path: run.path,
        blob, mimeType: run.mimeType, durationMs: run.durationMs ?? null,
      }));
      if (currentStudent.current !== studentId) return null;
      setResultOwner(studentId);
      setState({ running: false, result, error: null });
      if (result.recovered) notify.current?.();
      return result;
    } catch {
      if (currentStudent.current !== studentId) return null;
      setState((s) => ({ ...s, running: false, error: "Saved recordings on this device could not be checked." }));
      return null;
    } finally { if (running.current === studentId) running.current = null; }
  }, [studentId, enabled]);

  useEffect(() => {
    if (!studentId || !enabled) return;
    void retry();
    const reconnect = () => { void retry(); };
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, [studentId, retry, enabled]);

  const download = useCallback((run: BackupRun) => {
    if (!currentStudent.current || run.studentId !== currentStudent.current) return Promise.resolve(false);
    return downloadRun(run);
  }, []);
  const visible = resultOwner === studentId ? state : { ...state, result: null };
  const attention = visible.result ? visible.result.failed + visible.result.incomplete : 0;
  return { ...visible, retry, download, attention };
}
