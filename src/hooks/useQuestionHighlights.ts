import * as React from 'react';
import {
  captureSelectionAcross,
  eraseRange,
  replaceOverlappingHighlights,
  type Highlight,
  type HighlightColor,
  type HighlightMode,
  type HighlightRegion,
} from '@/lib/highlightUtils';

const MAX_HISTORY = 20;

/**
 * Per-question highlight state for any surface that shows an LR question with
 * the marker toolbar: the drill, blind review, the section walk, the bootcamp
 * capstone modal. One implementation, so a highlight behaves the same in all
 * of them. Nothing here is persisted; highlights live as long as the surface.
 *
 * `applySelection` takes every region the pane offers and highlights the part
 * of the live selection that falls in each, so one drag across the stem and
 * two choices marks all three.
 */
export function useQuestionHighlights() {
  const [highlights, setHighlights] = React.useState<Map<string, Highlight[]>>(new Map());
  const [history, setHistory] = React.useState<Map<string, Highlight[]>[]>([]);

  const remember = React.useCallback((snapshot: Map<string, Highlight[]>) => {
    setHistory((prev) => [...prev, new Map(snapshot)].slice(-MAX_HISTORY));
  }, []);

  const highlightsFor = React.useCallback(
    (qid: string | undefined): Highlight[] => (qid ? highlights.get(qid) ?? [] : []),
    [highlights],
  );

  /**
   * Turn the live selection into highlights (or erasures) on `qid`.
   * Returns true when something changed, which is also when the selection has
   * been cleared; a caller can use that to tell a marking drag from a click.
   */
  const applySelection = React.useCallback(
    (qid: string | undefined, mode: HighlightMode, regions: HighlightRegion[]): boolean => {
      if (!qid || mode === 'none') return false;
      const captured = captureSelectionAcross(regions);
      if (captured.length === 0) return false;

      let next = highlights.get(qid) ?? [];
      for (const hit of captured) {
        if (mode === 'erase') {
          next = eraseRange(next, hit.section, hit.start, hit.end);
        } else {
          next = replaceOverlappingHighlights(next, {
            id: crypto.randomUUID(),
            start: hit.start,
            end: hit.end,
            text: hit.text,
            color: mode as HighlightColor,
            section: hit.section,
          });
        }
      }

      remember(highlights);
      setHighlights(new Map(highlights).set(qid, next));
      window.getSelection()?.removeAllRanges();
      return true;
    },
    [highlights, remember],
  );

  /** The eraser's click on a highlight: the whole thing goes. */
  const removeHighlight = React.useCallback(
    (qid: string | undefined, highlightId: string) => {
      if (!qid) return;
      const current = highlights.get(qid) ?? [];
      if (!current.some((h) => h.id === highlightId)) return;
      remember(highlights);
      setHighlights(new Map(highlights).set(qid, current.filter((h) => h.id !== highlightId)));
    },
    [highlights, remember],
  );

  const undo = React.useCallback(() => {
    if (history.length === 0) return;
    setHighlights(new Map(history[history.length - 1]));
    setHistory(history.slice(0, -1));
  }, [history]);

  const clearHistory = React.useCallback(() => setHistory([]), []);

  return {
    highlights,
    highlightsFor,
    applySelection,
    removeHighlight,
    undo,
    canUndo: history.length > 0,
    clearHistory,
  };
}

export type QuestionHighlights = ReturnType<typeof useQuestionHighlights>;
