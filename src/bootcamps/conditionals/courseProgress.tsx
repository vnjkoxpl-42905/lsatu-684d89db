import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { nextCourseStep, type CourseStepProgress } from './progress';
import { FULL_CONDITIONAL_EDITION } from '@/lib/conditionalCourseEdition';
import { SPLIT_LESSON_SOURCES } from './openingCoursePath';

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
  function splitCompletion(id: string) {
    for (const source of SPLIT_LESSON_SOURCES[id] ?? []) {
      const sourceKey = `${prefix}${source.sourceId}`;
      const combined = raw[sourceKey];
      if (combined?.status === 'done' && (source.sourceRevisions.includes(combined.contentRevision ?? '')
        || source.allowUnversioned && !combined.contentRevision)) {
        return { sourceKey, completedAt: combined.completedAt ?? combined.updatedAt,
          contentRevision: combined.contentRevision ?? source.sourceRevisions[0] };
      }
      // A revised attempt does not erase the earlier combined lesson's credit.
      const earlier = combined?.sourceCompletion;
      if (earlier?.sourceKey === sourceKey && source.sourceRevisions.includes(earlier.contentRevision)) return earlier;
    }
    return undefined;
  }
  for (const step of steps) {
    const current = raw[`${prefix}${step.id}`];
    const split = splitCompletion(step.id);
    // A new-revision attempt wins for its own destination. A historical same-ID
    // completion must stay read-only instead of mounting and rewriting its date.
    const historicalSameId = split?.sourceKey === `${prefix}${step.id}`
      && current?.status === 'done' && current.contentRevision === split.contentRevision;
    if (current && !historicalSameId) { visible[step.id] = current; continue; }
    const earlier = raw[step.id];
    const compatible = !!step.compatibleLegacyRevision && step.compatibleLegacyRevision === step.contentRevision
      && (!earlier?.contentRevision || earlier.contentRevision === step.compatibleLegacyRevision);
    if (earlier?.status === 'done' && compatible) {
      projected[step.id] = { sourceKey: step.id, completedAt: earlier.completedAt ?? earlier.updatedAt, contentRevision: step.contentRevision! };
      visible[step.id] = { status: 'done', done: earlier.done, total: earlier.total, updatedAt: earlier.updatedAt,
        completedAt: earlier.completedAt ?? earlier.updatedAt, contentRevision: step.contentRevision };
      continue;
    }
    if (split) {
      projected[step.id] = { ...split };
      visible[step.id] = { status: 'done', updatedAt: split.completedAt, completedAt: split.completedAt, contentRevision: split.contentRevision };
    }
  }
  const splitSourceIds = new Set(Object.values(SPLIT_LESSON_SOURCES).flatMap(sources => sources.map(source => source.sourceId)));
  return {
    steps: visible, priorCompletion: projected, storageScope,
    save: (id, patch) => {
      // A mount effect cannot promote completed-earlier work. Only resume can do that.
      if (projected[id]) return;
      // Mount saves cannot rewrite a historical source's date or revision.
      const source = raw[`${prefix}${id}`];
      const keepsSplitSource = splitSourceIds.has(id) && source?.status === 'done' && !patch.reopen
        && Object.values(SPLIT_LESSON_SOURCES).flat().some(candidate => candidate.sourceId === id
          && (candidate.sourceRevisions.includes(source.contentRevision ?? '') || candidate.allowUnversioned && !source.contentRevision));
      if (keepsSplitSource) return;
      const revision = steps.find(step => step.id === id)?.contentRevision;
      saveRaw(`${prefix}${id}`, { ...patch, ...(revision ? { contentRevision: revision } : {}),
        ...(source?.sourceCompletion ? { sourceCompletion: { ...source.sourceCompletion } } : {}) });
    },
    resume: id => {
      const sourceCompletion = projected[id];
      if (!sourceCompletion) return;
      const previous = sourceCompletion.sourceKey === id ? raw[id] : undefined;
      const source = raw[sourceCompletion.sourceKey];
      let priorAttempts: NonNullable<CourseStepProgress['priorAttempts']> = [];
      if (source) {
        const { priorAttempts: oldHistory = [], ...oldAttempt } = source;
        priorAttempts = [...(Array.isArray(oldHistory) ? oldHistory : []), structuredClone(oldAttempt)].slice(-3);
      }
      const revision = steps.find(step => step.id === id)?.contentRevision ?? sourceCompletion.contentRevision;
      const changed = revision !== sourceCompletion.contentRevision;
      saveRaw(`${prefix}${id}`, { ...previous, state: previous?.state === undefined ? undefined : structuredClone(previous.state),
        ...(priorAttempts.length ? { priorAttempts } : {}), sourceCompletion: { ...sourceCompletion }, contentRevision: revision,
        ...(changed ? { reopen: true, status: 'started' as const, done: undefined, total: undefined, completedAt: undefined }
          : { status: 'done' as const, completedAt: sourceCompletion.completedAt }) });
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
    const next = { ...previous, [stepId]: nextCourseStep(previous[stepId], patch) };
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* keep in memory */ }
    return next;
  }), [key]);
  return useMemo(() => ({ steps, save }), [steps, save]);
}
