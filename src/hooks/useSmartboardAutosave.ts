import { useCallback, useEffect, useRef, useState } from 'react';
import { useSaveSmartboardSession } from './useSmartboardSessions';

// Item B — debounced autosave for an Excalidraw smartboard session.
// Used by both TeacherSmartboard (full page) and FloatingWhiteboard
// (overlay). Idempotent: passes the existing session id back so the
// service does UPDATE not INSERT.
//
// The caller wires this up by:
//   1. Calling onChange() (returned) from Excalidraw's onChange handler.
//   2. Passing a sceneSnapshotRef whose .current is the up-to-date scene.

export type ExcalidrawSceneJson = {
  elements?: unknown[];
  appState?: unknown;
  files?: unknown;
};

export interface UseSmartboardAutosaveArgs {
  studentId: string | null | undefined;
  sessionId: string | null | undefined;
  title: string;
  enabled: boolean;
  debounceMs?: number;
  getScene: () => ExcalidrawSceneJson | null;
  onSaved?: (sessionId: string) => void;
}

export interface UseSmartboardAutosaveResult {
  bumpChange: () => void;
  saveNow: () => Promise<void>;
  status: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  lastSavedAt: Date | null;
  error: string | null;
}

const DEFAULT_DEBOUNCE = 5000;

export function useSmartboardAutosave({
  studentId,
  sessionId,
  title,
  enabled,
  debounceMs = DEFAULT_DEBOUNCE,
  getScene,
  onSaved,
}: UseSmartboardAutosaveArgs): UseSmartboardAutosaveResult {
  const save = useSaveSmartboardSession();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSignatureRef = useRef<string>('');
  const sessionIdRef = useRef<string | null | undefined>(sessionId);
  const [status, setStatus] = useState<UseSmartboardAutosaveResult['status']>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track latest session id so an inline transition from undefined → id
  // (first insert) doesn't trigger a stale insert on the next debounce.
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const performSave = useCallback(async () => {
    if (!enabled || !studentId) return;
    const scene = getScene();
    if (!scene) return;
    const elements = (scene.elements as unknown[] | undefined) ?? [];
    if (elements.length === 0 && !sessionIdRef.current) {
      // Don't insert an empty session.
      return;
    }
    const signature = JSON.stringify({ e: elements, t: title });
    if (signature === lastSignatureRef.current) return;
    setStatus('saving');
    setError(null);
    try {
      const result = await save.mutateAsync({
        id: sessionIdRef.current ?? undefined,
        studentId,
        title,
        sceneJson: scene,
      });
      sessionIdRef.current = result.id;
      // Only record the signature as saved AFTER the write succeeds. Setting it
      // before the await meant a failed save (offline/RLS/transient) still
      // marked the scene "saved", so every later change with identical content
      // short-circuited and the teacher's board was silently never persisted.
      lastSignatureRef.current = signature;
      setLastSavedAt(new Date());
      setStatus('saved');
      onSaved?.(result.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setStatus('error');
    }
  }, [enabled, studentId, title, getScene, save, onSaved]);

  const bumpChange = useCallback(() => {
    if (!enabled) return;
    setStatus('pending');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void performSave();
    }, debounceMs);
  }, [enabled, debounceMs, performSave]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await performSave();
  }, [performSave]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { bumpChange, saveNow, status, lastSavedAt, error };
}
