import * as React from 'react';
import { loadAnnotations, saveAnnotationsNow } from '../api/rcProgress';
import { readAnnotationRecovery, writeAnnotationRecovery, clearAnnotationRecovery } from './rcAnnotationRecovery';
import type {
  RcAnnotationKind,
  RcHighlight,
  RcHighlightColor,
  RcHighlightTarget,
} from '../lib/rcTypes';

/**
 * Per-passage highlights, loaded once for the session's passages and saved back
 * (debounced) as the student paints. Keyed by passage so they restore on any
 * future encounter with that passage, in this session or a later one.
 */
export type RcAnnotationSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'recovered';

export function useRcHighlights(passageIds: number[], actorId?: string | null) {
  const [byPassage, setByPassage] = React.useState<Map<number, RcHighlight[]>>(new Map());
  const [color, setColor] = React.useState<RcHighlightColor>('yellow');
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [revision, retryLoad] = React.useReducer((value) => value + 1, 0);
  const [statuses, setStatuses] = React.useState<Map<number, RcAnnotationSaveStatus>>(new Map());
  const [errors, setErrors] = React.useState<Map<number, string>>(new Map());
  const context = React.useRef<{ actor: string; key: string; ready: boolean; cancelled: boolean; saving: Map<number, number> } | null>(null);
  const pending = React.useRef(new Map<number, { highlights: RcHighlight[]; version: number; intentId: string }>());
  const timers = React.useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const chains = React.useRef(new Map<number, Promise<void>>());
  const versions = React.useRef(0);
  /**
   * Mirrors `byPassage`, but updated synchronously on every write. Reading the
   * state variable inside the mutators would capture whatever the last render
   * closed over, so two marks made between renders — which is simply someone
   * highlighting quickly — would compute from the same base and the first
   * would be lost.
   */
  const latest = React.useRef<Map<number, RcHighlight[]>>(new Map());

  const key = passageIds.join(',');
  React.useEffect(() => {
    const owner = { actor: actorId ?? '', key, ready: false, cancelled: false, saving: new Map<number, number>() };
    const ownedTimers = new Map<number, ReturnType<typeof setTimeout>>();
    timers.current = ownedTimers;
    context.current = owner;
    latest.current = new Map();
    pending.current = new Map();
    chains.current = new Map();
    setByPassage(new Map());
    setStatuses(new Map());
    setErrors(new Map());
    setLoaded(false);
    setLoadError(null);
    if (actorId && passageIds.length) loadAnnotations(passageIds, actorId)
      .then((map) => {
        if (!owner.cancelled) {
          const restored = new Map(map);
          const nextStatuses = new Map<number, RcAnnotationSaveStatus>();
          for (const id of passageIds) {
            const recovery = readAnnotationRecovery(owner.actor, id);
            if (recovery !== null) {
              restored.set(id, recovery.highlights);
              pending.current.set(id, { highlights: recovery.highlights, version: ++versions.current, intentId: recovery.intentId });
              nextStatuses.set(id, 'recovered');
            }
          }
          latest.current = restored;
          setByPassage(restored);
          setStatuses(nextStatuses);
          owner.ready = true;
          setLoaded(true);
        }
      })
      .catch((error: unknown) => {
        if (!owner.cancelled) setLoadError(error instanceof Error ? error.message : 'Passage marks could not be loaded.');
      });
    return () => {
      owner.cancelled = true;
      for (const timer of ownedTimers.values()) clearTimeout(timer);
      ownedTimers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, actorId, revision]);

  const forPassage = React.useCallback(
    (passageId: number) => context.current?.actor === actorId && context.current?.key === key ? byPassage.get(passageId) ?? [] : [],
    [byPassage, actorId, key],
  );

  const save = React.useCallback((passageId: number) => {
    const owner = context.current;
    const intent = pending.current.get(passageId);
    if (!owner?.ready || owner.cancelled || owner.actor !== actorId || owner.key !== key || !intent) return;
    if (owner.saving.get(passageId) === intent.version) return;
    owner.saving.set(passageId, intent.version);
    const previous = chains.current.get(passageId) ?? Promise.resolve();
    setStatuses((map) => new Map(map).set(passageId, 'saving'));
    const task = previous.catch(() => undefined).then(async () => {
      if (owner.cancelled) return;
      try {
        await saveAnnotationsNow(passageId, intent.highlights, owner.actor);
        clearAnnotationRecovery(owner.actor, passageId, intent.intentId);
        if (!owner.cancelled && pending.current.get(passageId)?.version === intent.version) {
          pending.current.delete(passageId);
          setStatuses((map) => new Map(map).set(passageId, 'saved'));
          setErrors((map) => { const next = new Map(map); next.delete(passageId); return next; });
        }
      } catch (error: unknown) {
        if (!owner.cancelled && pending.current.get(passageId)?.version === intent.version) {
          setStatuses((map) => new Map(map).set(passageId, 'error'));
          setErrors((map) => new Map(map).set(passageId, error instanceof Error ? error.message : 'Passage marks were not saved.'));
        }
      } finally {
        if (owner.saving.get(passageId) === intent.version) owner.saving.delete(passageId);
      }
    });
    chains.current.set(passageId, task);
  }, [actorId, key]);

  const write = React.useCallback((passageId: number, next: RcHighlight[]) => {
    const owner = context.current;
    if (!owner?.ready || owner.cancelled || owner.actor !== actorId || owner.key !== key || !passageIds.includes(passageId)) return;
    const map = new Map(latest.current);
    map.set(passageId, next);
    latest.current = map;
    setByPassage(map);
    const intentId = crypto.randomUUID();
    pending.current.set(passageId, { highlights: next, version: ++versions.current, intentId });
    try {
      writeAnnotationRecovery(owner.actor, passageId, next, intentId);
      setStatuses((map) => new Map(map).set(passageId, 'saving'));
    } catch {
      setStatuses((map) => new Map(map).set(passageId, 'error'));
      setErrors((map) => new Map(map).set(passageId, 'The device could not keep a recovery copy. Retry saving before leaving.'));
    }
    const timer = timers.current.get(passageId);
    if (timer) clearTimeout(timer);
    timers.current.set(passageId, setTimeout(() => { timers.current.delete(passageId); save(passageId); }, 1000));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorId, key, save]);

  const add = React.useCallback(
    (
      passageId: number,
      target: RcHighlightTarget,
      start: number,
      end: number,
      /** Passed in by the popover so picking a swatch applies that color now. */
      chosen: RcHighlightColor = color,
      kind: RcAnnotationKind = 'highlight',
    ) => {
      if (end <= start) return;
      const existing = latest.current.get(passageId) ?? [];
      // Same target + same kind is one layer. A highlight and an underline can
      // sit on the same words, so they never interact.
      const sameLayer = (h: RcHighlight) =>
        h.target === target && (h.kind ?? 'highlight') === kind;

      // Marking over the same color extends one continuous span rather than
      // leaving a seam. Repeat until nothing new is absorbed: swallowing one
      // neighbour can bring the next into reach.
      let lo = start;
      let hi = end;
      for (let grew = true; grew; ) {
        grew = false;
        for (const h of existing) {
          if (!sameLayer(h) || h.color !== chosen) continue;
          if (h.end < lo || h.start > hi) continue;
          if (h.start < lo || h.end > hi) {
            lo = Math.min(lo, h.start);
            hi = Math.max(hi, h.end);
            grew = true;
          }
        }
      }

      // Marking over a different color trims the old span around the new one
      // instead of discarding it, so highlighting three words inside a
      // sentence keeps the rest of that sentence.
      const next: RcHighlight[] = [];
      for (const h of existing) {
        if (!sameLayer(h)) {
          next.push(h);
          continue;
        }
        if (h.color === chosen && h.end >= lo && h.start <= hi) continue;
        if (h.end <= lo || h.start >= hi) {
          next.push(h);
          continue;
        }
        if (h.start < lo) next.push({ ...h, end: lo });
        if (h.end > hi) next.push({ ...h, start: hi });
      }
      next.push({ target, start: lo, end: hi, color: chosen, kind });
      write(passageId, next);
    },
    [color, write],
  );

  const removeAt = React.useCallback(
    (passageId: number, target: RcHighlightTarget, offset: number) => {
      const existing = latest.current.get(passageId) ?? [];
      write(
        passageId,
        existing.filter((h) => !(h.target === target && offset >= h.start && offset < h.end)),
      );
    },
    [write],
  );

  /** Eraser drag: clear every annotation the swept range touches. */
  const removeRange = React.useCallback(
    (passageId: number, target: RcHighlightTarget, start: number, end: number) => {
      const existing = latest.current.get(passageId) ?? [];
      write(
        passageId,
        existing.filter((h) => h.target !== target || h.end <= start || h.start >= end),
      );
    },
    [write],
  );

  const ready = loaded && context.current?.actor === actorId && context.current?.key === key;
  return { forPassage, add, removeAt, removeRange, color, setColor, loaded: ready,
    loadStatus: loadError ? 'error' as const : ready ? 'ready' as const : 'loading' as const,
    loadError, retryLoad, retrySave: save,
    statusForPassage: (id: number): RcAnnotationSaveStatus => ready ? statuses.get(id) ?? 'idle' : 'idle',
    errorForPassage: (id: number) => ready ? errors.get(id) ?? null : null,
  };
}
