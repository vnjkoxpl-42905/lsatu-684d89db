import * as React from 'react';
import { loadAnnotations, saveAnnotations } from '../api/rcProgress';
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
export function useRcHighlights(passageIds: number[]) {
  const [byPassage, setByPassage] = React.useState<Map<number, RcHighlight[]>>(new Map());
  const [color, setColor] = React.useState<RcHighlightColor>('yellow');
  const [loaded, setLoaded] = React.useState(false);
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
    let cancelled = false;
    if (passageIds.length === 0) return;
    loadAnnotations(passageIds)
      .then((map) => {
        if (!cancelled) {
          latest.current = map;
          setByPassage(map);
          setLoaded(true);
        }
      })
      .catch(() => {
        // Highlights are an aid, not the drill. A load failure must not block it.
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const forPassage = React.useCallback(
    (passageId: number) => byPassage.get(passageId) ?? [],
    [byPassage],
  );

  const write = React.useCallback((passageId: number, next: RcHighlight[]) => {
    const map = new Map(latest.current);
    map.set(passageId, next);
    latest.current = map;
    setByPassage(map);
    saveAnnotations(passageId, next);
  }, []);

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

  return { forPassage, add, removeAt, removeRange, color, setColor, loaded };
}
