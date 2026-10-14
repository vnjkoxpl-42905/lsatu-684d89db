import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type SetStateAction } from 'react';
import { mergeCourseStepState } from './progress';
import type { CourseStepProgress } from './progress';

export type CourseStepPatch = Partial<Omit<CourseStepProgress, 'updatedAt'>>;
export interface CourseProgressStore {
  ready?: boolean;
  steps: Record<string, CourseStepProgress>;
  save: (stepId: string, patch: CourseStepPatch) => void;
}

const CourseProgressContext = createContext<CourseProgressStore | null>(null);
/** Whose device copy a drill reads and writes: the signed-in user's id, or 'preview' for the dev preview. */
const CourseStorageScopeContext = createContext<string>('preview');
const LessonContext = createContext<string | null>(null);

export function CourseLessonProvider({ stepId, children }: { stepId: string; children: ReactNode }) {
  return <LessonContext.Provider value={stepId}>{children}</LessonContext.Provider>;
}

/** Save each lesson interaction separately so sibling exercises cannot replace each other's drafts. */
export function useLessonInteraction<T>(key: string, initial: T): [T, (next: SetStateAction<T>) => void] {
  const stepId = useContext(LessonContext);
  const store = useCourseProgress();
  const saved = store?.steps[stepId ?? '']?.state as { lessonInteractions?: Record<string, T> } | undefined;
  const [value, setValue] = useState<T>(() => saved?.lessonInteractions?.[key] ?? initial);
  const current = useRef(value);
  const change = useCallback((next: SetStateAction<T>) => {
    const result = typeof next === 'function' ? (next as (prior: T) => T)(current.current) : next;
    current.current = result;
    setValue(result);
    if (stepId) store?.save(stepId, { state: { lessonInteractions: { [key]: result } } });
  }, [key, stepId, store?.save]);
  return [value, change];
}

export function CourseProgressProvider({ store, scope = 'preview', children }: { store: CourseProgressStore; scope?: string; children: ReactNode }) {
  return <CourseStorageScopeContext.Provider value={scope}><CourseProgressContext.Provider value={store}>{children}</CourseProgressContext.Provider></CourseStorageScopeContext.Provider>;
}

/** The storage scope for device copies of drill work. Never shared between accounts. */
export function useCourseStorageScope() {
  return useContext(CourseStorageScopeContext);
}

export function useCourseProgress() {
  return useContext(CourseProgressContext);
}

/**
 * One lesson or drill's saved progress. Returns null outside a course (isolated
 * component tests), where drills fall back to their own device storage.
 */
export function useCourseStep(stepId: string | undefined) {
  const store = useContext(CourseProgressContext);
  const save = store?.save;
  const record = useCallback((patch: CourseStepPatch) => { if (stepId) save?.(stepId, patch); }, [save, stepId]);
  if (!store || !stepId) return null;
  return { ready: store.ready, saved: store.steps[stepId], record };
}

/** Device-only store for the preview harness and signed-out use; the course route uses the account. */
export function useDeviceCourseProgress(scope = 'preview'): CourseProgressStore {
  const key = `conditional-course-progress:${scope}`;
  const read = () => {
    try { return JSON.parse(localStorage.getItem(key) ?? '{}') ?? {}; } catch { return {}; }
  };
  const [snapshot, setSnapshot] = useState<{ key: string; steps: Record<string, CourseStepProgress> }>(() => ({ key, steps: read() }));
  useEffect(() => { if (snapshot.key !== key) setSnapshot({ key, steps: read() }); }, [key, snapshot.key]);
  const save = useCallback((stepId: string, patch: CourseStepPatch) => setSnapshot(snapshot => {
    const previous = snapshot.key === key ? snapshot.steps : {};
    const prior = previous[stepId];
    const status = prior?.status === 'done' ? 'done' : patch.status ?? prior?.status ?? 'started';
    const next = { ...previous, [stepId]: { ...prior, ...patch, ...(patch.state !== undefined ? { state: mergeCourseStepState(prior?.state, patch.state) } : {}), status, updatedAt: new Date().toISOString() } };
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* keep in memory */ }
    return { key, steps: next };
  }), [key]);
  return useMemo(() => ({ ready: snapshot.key === key, steps: snapshot.key === key ? snapshot.steps : {}, save }), [snapshot, key, save]);
}
