import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CourseStepProgress } from './progress';

export type CourseStepPatch = Partial<Omit<CourseStepProgress, 'updatedAt'>>;
export interface CourseProgressStore {
  steps: Record<string, CourseStepProgress>;
  save: (stepId: string, patch: CourseStepPatch) => void;
}

const CourseProgressContext = createContext<CourseProgressStore | null>(null);

export function CourseProgressProvider({ store, children }: { store: CourseProgressStore; children: ReactNode }) {
  return <CourseProgressContext.Provider value={store}>{children}</CourseProgressContext.Provider>;
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
  return { saved: store.steps[stepId], record };
}

/** Device-only store for the preview harness and signed-out use; the course route uses the account. */
export function useDeviceCourseProgress(scope = 'preview'): CourseProgressStore {
  const key = `conditional-course-progress:${scope}`;
  const [steps, setSteps] = useState<Record<string, CourseStepProgress>>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? '{}') ?? {}; } catch { return {}; }
  });
  const save = useCallback((stepId: string, patch: CourseStepPatch) => setSteps(previous => {
    const prior = previous[stepId];
    const status = prior?.status === 'done' ? 'done' : patch.status ?? prior?.status ?? 'started';
    const next = { ...previous, [stepId]: { ...prior, ...patch, status, updatedAt: new Date().toISOString() } };
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* keep in memory */ }
    return next;
  }), [key]);
  return useMemo(() => ({ steps, save }), [steps, save]);
}
