import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const saveAnnotations = vi.fn();
vi.mock('../api/rcProgress', () => ({
  loadAnnotations: vi.fn(async () => new Map()),
  saveAnnotations: (passageId: number, highlights: unknown) =>
    saveAnnotations(passageId, highlights),
}));

import { useRcHighlights } from './useRcHighlights';
import { questionTarget, type RcHighlight } from '../lib/rcTypes';

const PASSAGE = 1188;
const Q1 = 11880;
const Q2 = 11881;

async function setup() {
  const view = renderHook(() => useRcHighlights([PASSAGE]));
  await waitFor(() => expect(view.result.current.loaded).toBe(true));
  return view;
}

const targetsOf = (rows: RcHighlight[]) => rows.map((h) => `${h.target}:${h.start}-${h.end}`);

describe('useRcHighlights with question-scoped targets', () => {
  beforeEach(() => saveAnnotations.mockClear());

  it('keeps passage, stem and choice marks as separate layers', async () => {
    const view = await setup();
    act(() => {
      view.result.current.add(PASSAGE, 'passage', 0, 10, 'yellow');
      view.result.current.add(PASSAGE, questionTarget(Q1, 'stem'), 0, 10, 'yellow');
      view.result.current.add(PASSAGE, questionTarget(Q1, 'A'), 0, 10, 'yellow');
    });
    const rows = view.result.current.forPassage(PASSAGE);
    expect(targetsOf(rows).sort()).toEqual(
      ['passage:0-10', `q${Q1}:stem:0-10`, `q${Q1}:A:0-10`].sort(),
    );
  });

  it('does not merge or trim across two questions sharing choice A', async () => {
    const view = await setup();
    act(() => {
      view.result.current.add(PASSAGE, questionTarget(Q1, 'A'), 0, 10, 'yellow');
      // Same offsets, same color: on one target this would extend the span.
      view.result.current.add(PASSAGE, questionTarget(Q2, 'A'), 5, 15, 'yellow');
      // Different color over the top: on one target this would trim.
      view.result.current.add(PASSAGE, questionTarget(Q2, 'A'), 8, 12, 'pink');
    });
    const rows = view.result.current.forPassage(PASSAGE);
    const q1 = rows.filter((h) => h.target === questionTarget(Q1, 'A'));
    expect(q1).toEqual([
      { target: `q${Q1}:A`, start: 0, end: 10, color: 'yellow', kind: 'highlight' },
    ]);
    const q2 = rows.filter((h) => h.target === questionTarget(Q2, 'A'));
    expect(targetsOf(q2).sort()).toEqual(
      [`q${Q2}:A:5-8`, `q${Q2}:A:12-15`, `q${Q2}:A:8-12`].sort(),
    );
  });

  it('removeAt clears only the mark on its own target', async () => {
    const view = await setup();
    act(() => {
      view.result.current.add(PASSAGE, 'passage', 0, 10, 'yellow');
      view.result.current.add(PASSAGE, questionTarget(Q1, 'stem'), 0, 10, 'yellow');
      view.result.current.add(PASSAGE, questionTarget(Q1, 'B'), 0, 10, 'yellow');
    });
    act(() => view.result.current.removeAt(PASSAGE, questionTarget(Q1, 'stem'), 4));
    expect(targetsOf(view.result.current.forPassage(PASSAGE)).sort()).toEqual(
      ['passage:0-10', `q${Q1}:B:0-10`].sort(),
    );
  });

  it('removeRange sweeps only its own target', async () => {
    const view = await setup();
    act(() => {
      view.result.current.add(PASSAGE, questionTarget(Q1, 'A'), 0, 10, 'yellow');
      view.result.current.add(PASSAGE, questionTarget(Q2, 'A'), 0, 10, 'yellow');
      view.result.current.add(PASSAGE, questionTarget(Q1, 'A'), 20, 30, 'orange', 'underline');
    });
    act(() => view.result.current.removeRange(PASSAGE, questionTarget(Q1, 'A'), 5, 25));
    expect(targetsOf(view.result.current.forPassage(PASSAGE))).toEqual([`q${Q2}:A:0-10`]);
  });

  it('persists question-scoped marks under the passage row', async () => {
    const view = await setup();
    act(() => {
      view.result.current.add(PASSAGE, questionTarget(Q1, 'C'), 2, 6, 'pink');
    });
    expect(saveAnnotations).toHaveBeenLastCalledWith(PASSAGE, [
      { target: `q${Q1}:C`, start: 2, end: 6, color: 'pink', kind: 'highlight' },
    ]);
  });
});
