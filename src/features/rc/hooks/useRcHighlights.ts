import * as React from 'react';
import { loadAnnotations, saveAnnotations } from '../api/rcProgress';
import type {
  RcAnnotationKind,
  RcHighlight,
  RcHighlightColor,
  RcLetter,
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

  const key = passageIds.join(',');
  React.useEffect(() => {
    let cancelled = false;
    if (passageIds.length === 0) return;
    loadAnnotations(passageIds)
      .then((map) => {
        if (!cancelled) {
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
    setByPassage((prev) => {
      const map = new Map(prev);
      map.set(passageId, next);
      return map;
    });
    saveAnnotations(passageId, next);
  }, []);

  const add = React.useCallback(
    (
      passageId: number,
      target: 'passage' | RcLetter,
      start: number,
      end: number,
      /** Passed in by the popover so picking a swatch applies that color now. */
      chosen: RcHighlightColor = color,
      kind: RcAnnotationKind = 'highlight',
    ) => {
      const existing = byPassage.get(passageId) ?? [];
      // Drop overlapping annotations of the same kind, so re-marking recolors
      // cleanly — but a highlight and an underline can sit on the same words.
      const kept = existing.filter(
        (h) =>
          h.target !== target ||
          (h.kind ?? 'highlight') !== kind ||
          h.end <= start ||
          h.start >= end,
      );
      write(passageId, [...kept, { target, start, end, color: chosen, kind }]);
    },
    [byPassage, color, write],
  );

  const removeAt = React.useCallback(
    (passageId: number, target: 'passage' | RcLetter, offset: number) => {
      const existing = byPassage.get(passageId) ?? [];
      write(
        passageId,
        existing.filter((h) => !(h.target === target && offset >= h.start && offset < h.end)),
      );
    },
    [byPassage, write],
  );

  /** Eraser drag: clear every annotation the swept range touches. */
  const removeRange = React.useCallback(
    (passageId: number, target: 'passage' | RcLetter, start: number, end: number) => {
      const existing = byPassage.get(passageId) ?? [];
      write(
        passageId,
        existing.filter((h) => h.target !== target || h.end <= start || h.start >= end),
      );
    },
    [byPassage, write],
  );

  return { forPassage, add, removeAt, removeRange, color, setColor, loaded };
}
