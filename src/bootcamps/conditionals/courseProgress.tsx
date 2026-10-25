import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CourseStepProgress } from './progress';
import { FULL_CONDITIONAL_EDITION } from '@/lib/conditionalCourseEdition';

export type CourseStepPatch = Partial<Omit<CourseStepProgress, 'updatedAt'>> & { reopen?: boolean };
export interface CourseProgressStore {
  steps: Record<string, CourseStepProgress>;
  save: (stepId: string, patch: CourseStepPatch) => void;
  priorCompletion?: Record<string, { sourceKey: string; completedAt: string; contentRevision: string }>;
  resume?: (stepId: string) => void;
  storageScope?: string;
}

export interface EditionProgressStep { id: string; contentRevision?: string; compatibleLegacyRevision?: string }
export function editionStorageScope(userId: string | undefined, edition?: string) {
  return edition === FULL_CONDITIONAL_EDITION ? `${userId ?? 'preview'}:${FULL_CONDITIONAL_EDITION}` : userId;
}
/** Pure read adapter. Projection never exposes a mutable draft or performs writes. */
export function createEditionCourseStore(raw: Record<string, CourseStepProgress>, saveRaw: CourseProgressStore['save'], steps: EditionProgressStep[], edition?: string, storageScope?: string): CourseProgressStore {
  if (edition !== FULL_CONDITIONAL_EDITION) return { steps: raw, save: saveRaw, storageScope };
  const prefix = `${FULL_CONDITIONAL_EDITION}:`;
  const projected: NonNullable<CourseProgressStore['priorCompletion']> = {};
  // Account-backed tool/deck drafts share the edition namespace even when they
  // are not entries in the teaching path. Never project unprefixed tool drafts.
  const visible: Record<string, CourseStepProgress> = Object.fromEntries(Object.entries(raw).filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key.slice(prefix.length), value]));
  for (const step of steps) {
    const current = raw[`${prefix}${step.id}`];
    if (current) { visible[step.id] = current; continue; }
    const earlier = raw[step.id];
    const compatible = !!step.compatibleLegacyRevision && step.compatibleLegacyRevision === step.contentRevision
      && (!earlier?.contentRevision || earlier.contentRevision === step.compatibleLegacyRevision);
    if (earlier?.status === 'done' && compatible) {
      projected[step.id] = { sourceKey: step.id, completedAt: earlier.updatedAt, contentRevision: step.contentRevision! };
      visible[step.id] = { status: 'done', done: earlier.done, total: earlier.total, updatedAt: earlier.updatedAt, contentRevision: step.contentRevision };
    }
  }
  return {
    steps: visible, priorCompletion: projected, storageScope,
    save: (id, patch) => {
      // A mount effect cannot promote completed-earlier work. Only resume can do that.
      if (projected[id]) return;
      const revision = steps.find(step => step.id === id)?.contentRevision;
      saveRaw(`${prefix}${id}`, { ...patch, ...(revision ? { contentRevision: revision } : {}) });
    },
    resume: id => {
      const sourceCompletion = projected[id];
      if (!sourceCompletion) return;
      const previous = raw[id];
      const revision = steps.find(step => step.id === id)?.contentRevision ?? sourceCompletion.contentRevision;
      const changed = revision !== sourceCompletion.contentRevision;
      saveRaw(`${prefix}${id}`, { ...previous, state: previous?.state === undefined ? undefined : structuredClone(previous.state), sourceCompletion, contentRevision: revision, ...(changed ? { reopen: true, status: 'started' as const } : { status: 'done' as const }) });
    },
  };
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
    const { reopen, ...rest } = patch;
    const status = prior?.status === 'done' && !reopen ? 'done' : rest.status ?? (reopen ? 'started' : prior?.status) ?? 'started';
    const next = { ...previous, [stepId]: { ...prior, ...rest, status, updatedAt: new Date().toISOString() } };
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* keep in memory */ }
    return next;
  }), [key]);
  return useMemo(() => ({ steps, save }), [steps, save]);
}
