import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useQuestionHighlights } from './useQuestionHighlights';
import { choiceSection } from '@/lib/highlightUtils';

function mountRegions() {
  document.body.innerHTML =
    '<div><div class="stem"><p data-para-start="0">Which one</p></div><div class="a"><p data-para-start="0">Almost all</p></div></div>';
  const stem = document.querySelector('.stem') as HTMLElement;
  const a = document.querySelector('.a') as HTMLElement;
  return {
    regions: [
      { section: 'stem' as const, container: stem, source: 'Which one' },
      { section: choiceSection('A'), container: a, source: 'Almost all' },
    ],
    stemText: stem.querySelector('p')!.firstChild!,
    aText: a.querySelector('p')!.firstChild!,
  };
}

function selectBetween(startNode: Node, startOffset: number, endNode: Node, endOffset: number) {
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

describe('useQuestionHighlights', () => {
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('does nothing with no tool active and leaves the selection alone', () => {
    const { result } = renderHook(() => useQuestionHighlights());
    const { regions, stemText } = mountRegions();
    selectBetween(stemText, 0, stemText, 5);
    let consumed = true;
    act(() => {
      consumed = result.current.applySelection('q1', 'none', regions);
    });
    expect(consumed).toBe(false);
    expect(window.getSelection()!.isCollapsed).toBe(false);
    expect(result.current.highlightsFor('q1')).toEqual([]);
  });

  it('marks every region a drag crosses and clears the selection', () => {
    const { result } = renderHook(() => useQuestionHighlights());
    const { regions, stemText, aText } = mountRegions();
    selectBetween(stemText, 6, aText, 6);
    let consumed = false;
    act(() => {
      consumed = result.current.applySelection('q1', 'yellow', regions);
    });
    expect(consumed).toBe(true);
    expect(window.getSelection()!.isCollapsed).toBe(true);
    expect(
      result.current
        .highlightsFor('q1')
        .map((h) => [h.section, h.start, h.end, h.text])
        .sort(),
    ).toEqual([
      [choiceSection('A'), 0, 6, 'Almost'],
      ['stem', 6, 9, 'one'],
    ]);
    expect(result.current.canUndo).toBe(true);
  });

  it('erases by drag within a section and by click by id, and undoes both', () => {
    const { result } = renderHook(() => useQuestionHighlights());
    const { regions, aText } = mountRegions();
    selectBetween(aText, 0, aText, 10);
    act(() => {
      result.current.applySelection('q1', 'pink', regions);
    });
    selectBetween(aText, 3, aText, 5);
    act(() => {
      result.current.applySelection('q1', 'erase', regions);
    });
    expect(result.current.highlightsFor('q1').map((h) => [h.start, h.end])).toEqual([
      [0, 3],
      [5, 10],
    ]);

    const tail = result.current.highlightsFor('q1')[1];
    act(() => {
      result.current.removeHighlight('q1', tail.id);
    });
    expect(result.current.highlightsFor('q1').map((h) => [h.start, h.end])).toEqual([[0, 3]]);

    act(() => {
      result.current.undo();
    });
    expect(result.current.highlightsFor('q1')).toHaveLength(2);
    act(() => {
      result.current.undo();
    });
    expect(result.current.highlightsFor('q1')).toEqual([expect.objectContaining({ start: 0, end: 10 })]);
  });

  it('keeps questions apart', () => {
    const { result } = renderHook(() => useQuestionHighlights());
    const { regions, aText } = mountRegions();
    selectBetween(aText, 0, aText, 4);
    act(() => {
      result.current.applySelection('q1', 'orange', regions);
    });
    expect(result.current.highlightsFor('q2')).toEqual([]);
    expect(result.current.highlightsFor(undefined)).toEqual([]);
  });
});
