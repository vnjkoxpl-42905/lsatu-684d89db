import * as React from 'react';
import {
  emptyStudyTools,
  loadStudyTools,
  mutateStudyTools,
  studyToolsStorageKey,
  type StudyStoreStatus,
  type StudyStorage,
  type StudyToolsState,
} from '@/lib/questionStudyTools';

type Section = 'bookmarks' | 'eliminations' | 'highlights';
/** `${section}\u0000${questionKey}` -> the value this page wants (undefined = removed). */
type PendingEdits = Map<string, { section: Section; key: string; value: unknown }>;
const SECTIONS: Section[] = ['bookmarks', 'eliminations', 'highlights'];

function recordChangedKeys(pending: PendingEdits, before: StudyToolsState, after: StudyToolsState) {
  for (const section of SECTIONS) {
    const a = before[section] as Record<string, unknown>;
    const b = after[section] as Record<string, unknown>;
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (a[key] !== b[key]) pending.set(`${section}\u0000${key}`, { section, key, value: b[key] });
    }
  }
}

/** Idempotent: sets each pending key to the value this page wants. */
function applyPending(latest: StudyToolsState, pending: PendingEdits): StudyToolsState {
  if (pending.size === 0) return latest;
  const next: StudyToolsState = {
    bookmarks: { ...latest.bookmarks },
    eliminations: { ...latest.eliminations },
    highlights: { ...latest.highlights },
  };
  for (const { section, key, value } of pending.values()) {
    const target = next[section] as Record<string, unknown>;
    if (value === undefined) delete target[key];
    else target[key] = value;
  }
  return next;
}

/** One honest line about where the aids stand on this device, or null when saving works. */
export function studyStoreNotice(status: StudyStoreStatus, lastWriteSaved: boolean): string | null {
  if (status === 'incompatible') {
    return 'Saved marks on this device come from a newer version of LSAT U. Nothing here will overwrite them, so new marks stay on this page only.';
  }
  if (!lastWriteSaved || status === 'unavailable') {
    return 'This browser could not save your marks. They stay on this page until you leave it.';
  }
  if (status === 'recovered') {
    return 'Some saved marks on this device could not be read. They were set aside unchanged, and only the readable ones are shown.';
  }
  return null;
}

/**
 * One actor's study aids (bookmarks, cross-outs, LR highlights), held in
 * memory and saved to this device.
 *
 * Every change is applied to the latest stored copy, so another tab's marks
 * survive, and a `storage` event from another tab refreshes this one.
 * `deviceSaved` is false whenever the last read or write did not reach
 * storage; `notice` then says so in plain words. Switching actor drops the
 * previous actor's state before the next one loads.
 */
export function useQuestionStudyTools(actorId: string | null | undefined, storage?: StudyStorage | null) {
  const store = storage;
  const initial = React.useMemo(() => loadStudyTools(actorId, store), [actorId, store]);
  const [state, setState] = React.useState<StudyToolsState>(initial.state);
  const [status, setStatus] = React.useState<StudyStoreStatus>(initial.status);
  const [lastWriteSaved, setLastWriteSaved] = React.useState(true);
  const [loadedFor, setLoadedFor] = React.useState<string | null | undefined>(actorId);
  const stateRef = React.useRef(state);
  stateRef.current = state;

  if (loadedFor !== actorId) {
    // Render-time reset: the previous actor's aids never paint for the next.
    stateRef.current = initial.state;
    setLoadedFor(actorId);
    setState(initial.state);
    setStatus(initial.status);
    setLastWriteSaved(true);
  }

  // Another tab wrote this actor's store: take its copy.
  React.useEffect(() => {
    if (!actorId || typeof window === 'undefined') return;
    const key = studyToolsStorageKey(actorId);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      const loaded = loadStudyTools(actorId, store);
      if (loaded.status === 'unavailable') return;
      // Keep this page's unsaved marks on top of the other tab's copy.
      const merged = applyPending(loaded.state, pendingRef.current);
      stateRef.current = merged;
      setState(merged);
      setStatus(loaded.status);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [actorId, store]);

  // Per-key values this page changed but could not save yet. Replayed onto
  // the latest stored copy on every write, so a page-only mark is never
  // lost to a later write, and another tab's other keys still survive.
  const pendingRef = React.useRef<PendingEdits>(new Map());
  const pendingOwnerRef = React.useRef(actorId);
  if (pendingOwnerRef.current !== actorId) {
    // Unsaved marks belong to the actor who made them; never replay them for another.
    pendingOwnerRef.current = actorId;
    pendingRef.current = new Map();
  }

  const update = React.useCallback(
    (fn: (prev: StudyToolsState) => StudyToolsState) => {
      const before = stateRef.current;
      const after = fn(before);
      if (after === before) return;
      const pending = new Map(pendingRef.current);
      recordChangedKeys(pending, before, after);
      const overlay = (latest: StudyToolsState) => applyPending(latest, pending);
      const result = mutateStudyTools(actorId, overlay, after, store);
      pendingRef.current = result.saved ? new Map() : pending;
      stateRef.current = result.state;
      setState(result.state);
      setLastWriteSaved(result.saved);
      // A successful rewrite has set the unreadable copy aside; keep saying
      // so for this page rather than dropping back to silence.
      setStatus((prev) => (result.status === 'ok' && prev === 'recovered' ? prev : result.status));
    },
    [actorId, store],
  );

  const current = loadedFor === actorId;
  const notice = current ? studyStoreNotice(status, lastWriteSaved) : null;
  return {
    state: current ? state : emptyStudyTools(),
    update,
    deviceSaved: current && !!actorId && lastWriteSaved && (status === 'ok' || status === 'recovered'),
    notice,
    hasActor: !!actorId,
  };
}

export type QuestionStudyTools = ReturnType<typeof useQuestionStudyTools>;
