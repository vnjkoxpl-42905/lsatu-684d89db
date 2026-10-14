import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { saveAnnotations, loadAnnotations } = vi.hoisted(() => ({ saveAnnotations: vi.fn(), loadAnnotations: vi.fn() }));
vi.mock('../api/rcProgress', () => ({
  loadAnnotations,
  saveAnnotationsNow: saveAnnotations,
}));

import { useRcHighlights } from './useRcHighlights';
import { questionTarget, type RcHighlight } from '../lib/rcTypes';

const PASSAGE = 1188;
const Q1 = 11880;
const Q2 = 11881;

async function setup() {
  const view = renderHook(() => useRcHighlights([PASSAGE], 'actor-a'));
  await waitFor(() => expect(view.result.current.loaded).toBe(true));
  return view;
}

const targetsOf = (rows: RcHighlight[]) => rows.map((h) => `${h.target}:${h.start}-${h.end}`);

describe('useRcHighlights with question-scoped targets', () => {
  beforeEach(() => {
    localStorage.clear();
    saveAnnotations.mockReset().mockResolvedValue(undefined);
    loadAnnotations.mockReset().mockResolvedValue(new Map());
  });

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
    await waitFor(() => expect(saveAnnotations).toHaveBeenLastCalledWith(PASSAGE, [
      { target: `q${Q1}:C`, start: 2, end: 6, color: 'pink', kind: 'highlight' },
    ], 'actor-a'), { timeout: 2000 });
  });

  it('gates editing until hydration succeeds and rejects a failed read', async () => {
    let reject!: (error: Error) => void;
    loadAnnotations.mockImplementationOnce(() => new Promise((_resolve, rejectLoad) => { reject = rejectLoad; }));
    const view = renderHook(() => useRcHighlights([PASSAGE], 'actor-a'));
    act(() => view.result.current.add(PASSAGE, 'passage', 0, 10));
    expect(view.result.current.forPassage(PASSAGE)).toEqual([]);
    await act(async () => reject(new Error('offline')));
    expect(view.result.current.loaded).toBe(false);
    expect(view.result.current.loadStatus).toBe('error');
    act(() => view.result.current.add(PASSAGE, 'passage', 0, 10));
    expect(saveAnnotations).not.toHaveBeenCalled();
    act(() => view.result.current.retryLoad());
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
  });

  it('preserves the final debounced edit for its original owner on account switch', async () => {
    const view = renderHook(({ actor }) => useRcHighlights([PASSAGE], actor), { initialProps: { actor: 'actor-a' } });
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
    act(() => view.result.current.add(PASSAGE, 'passage', 0, 10));
    view.rerender({ actor: 'actor-b' });
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
    expect(loadAnnotations).toHaveBeenLastCalledWith([PASSAGE], 'actor-b');
    expect(view.result.current.forPassage(PASSAGE)).toEqual([]);
    expect(saveAnnotations).not.toHaveBeenCalled();
    view.rerender({ actor: 'actor-a' });
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
    expect(view.result.current.forPassage(PASSAGE)).toHaveLength(1);
    expect(view.result.current.statusForPassage(PASSAGE)).toBe('recovered');
  });

  it('keeps a failed save pending and acknowledges only a successful Retry', async () => {
    const view = await setup();
    saveAnnotations.mockRejectedValueOnce(new Error('offline'));
    act(() => view.result.current.add(PASSAGE, 'passage', 0, 10));
    await waitFor(() => expect(view.result.current.statusForPassage(PASSAGE)).toBe('error'), { timeout: 2000 });
    expect(view.result.current.errorForPassage(PASSAGE)).toBe('offline');
    act(() => view.result.current.retrySave(PASSAGE));
    await waitFor(() => expect(view.result.current.statusForPassage(PASSAGE)).toBe('saved'));
    expect(saveAnnotations).toHaveBeenCalledTimes(2);
    expect(localStorage.length).toBe(0);
  });

  it('does not let an older acknowledgement clear a newer edit', async () => {
    const view = await setup();
    let acknowledge!: () => void;
    saveAnnotations.mockImplementationOnce(() => new Promise<void>((resolve) => { acknowledge = resolve; }));
    act(() => view.result.current.add(PASSAGE, 'passage', 0, 10));
    await waitFor(() => expect(saveAnnotations).toHaveBeenCalledTimes(1), { timeout: 2000 });
    act(() => view.result.current.add(PASSAGE, 'passage', 20, 30));
    await act(async () => acknowledge());
    expect(view.result.current.statusForPassage(PASSAGE)).toBe('saving');
    expect(localStorage.length).toBe(1);
    await waitFor(() => expect(view.result.current.statusForPassage(PASSAGE)).toBe('saved'), { timeout: 2000 });
    expect(saveAnnotations.mock.calls[1][1]).toHaveLength(2);
  });

  it('teardown retains pending marks and a later mount restores only that owner', async () => {
    const view = await setup();
    act(() => view.result.current.add(PASSAGE, 'passage', 0, 10));
    view.unmount();
    expect(saveAnnotations).not.toHaveBeenCalled();
    const other = renderHook(() => useRcHighlights([PASSAGE], 'actor-b'));
    await waitFor(() => expect(other.result.current.loaded).toBe(true));
    expect(other.result.current.forPassage(PASSAGE)).toEqual([]);
    other.unmount();
    const restored = await setup();
    expect(restored.result.current.forPassage(PASSAGE)).toHaveLength(1);
    expect(restored.result.current.statusForPassage(PASSAGE)).toBe('recovered');
  });

  it('ignores late actor hydration after a same-passage account change', async () => {
    let oldRead!: (map: Map<number, RcHighlight[]>) => void;
    loadAnnotations.mockImplementationOnce(() => new Promise((resolve) => { oldRead = resolve; }));
    const view = renderHook(({ actor }) => useRcHighlights([PASSAGE], actor), { initialProps: { actor: 'actor-a' } });
    view.rerender({ actor: 'actor-b' });
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
    act(() => view.result.current.add(PASSAGE, 'passage', 20, 30));
    await act(async () => oldRead(new Map([[PASSAGE, [{ target: 'passage', start: 0, end: 10, color: 'yellow' }]]])));
    expect(targetsOf(view.result.current.forPassage(PASSAGE))).toEqual(['passage:20-30']);
  });

  it('deduplicates annotation retries until the delayed acknowledgement arrives', async () => {
    const view = await setup();
    let acknowledge!: () => void;
    saveAnnotations.mockImplementationOnce(() => new Promise<void>((resolve) => { acknowledge = resolve; }));
    act(() => {
      view.result.current.add(PASSAGE, 'passage', 0, 10);
      view.result.current.retrySave(PASSAGE);
      view.result.current.retrySave(PASSAGE);
    });
    await waitFor(() => expect(saveAnnotations).toHaveBeenCalledTimes(1));
    expect(view.result.current.statusForPassage(PASSAGE)).toBe('saving');
    expect(localStorage.length).toBe(1);
    await act(async () => acknowledge());
    act(() => view.result.current.retrySave(PASSAGE));
    expect(saveAnnotations).toHaveBeenCalledTimes(1);
    expect(view.result.current.statusForPassage(PASSAGE)).toBe('saved');
    view.unmount();
  });

  it('recovers a lost annotation acknowledgement after reload without automatically replaying', async () => {
    const view = await setup();
    let lostReply!: () => void;
    saveAnnotations.mockImplementationOnce(() => new Promise<void>((resolve) => { lostReply = resolve; }));
    act(() => {
      view.result.current.add(PASSAGE, 'passage', 0, 10);
      view.result.current.retrySave(PASSAGE);
    });
    await waitFor(() => expect(saveAnnotations).toHaveBeenCalledTimes(1));
    view.unmount();
    const restored = await setup();
    expect(restored.result.current.statusForPassage(PASSAGE)).toBe('recovered');
    expect(saveAnnotations).toHaveBeenCalledTimes(1);
    // Newer intent must survive even if the lost reply subsequently arrives.
    act(() => restored.result.current.add(PASSAGE, 'passage', 20, 30));
    await act(async () => lostReply());
    expect(localStorage.length).toBe(1);
    expect(targetsOf(restored.result.current.forPassage(PASSAGE))).toEqual(['passage:0-10', 'passage:20-30']);
    act(() => restored.result.current.retrySave(PASSAGE));
    await waitFor(() => expect(restored.result.current.statusForPassage(PASSAGE)).toBe('saved'));
    expect(saveAnnotations.mock.calls[1][1]).toHaveLength(2);
    expect(localStorage.length).toBe(0);
    restored.unmount();
  });

  it('keeps account B annotations pending when account A acknowledges its in-flight write', async () => {
    let replyA!: () => void;
    let replyB!: () => void;
    saveAnnotations.mockImplementationOnce(() => new Promise<void>((resolve) => { replyA = resolve; }));
    saveAnnotations.mockImplementationOnce(() => new Promise<void>((resolve) => { replyB = resolve; }));
    const view = renderHook(({ actor }) => useRcHighlights([PASSAGE], actor), { initialProps: { actor: 'actor-a' } });
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
    act(() => { view.result.current.add(PASSAGE, 'passage', 0, 10); view.result.current.retrySave(PASSAGE); });
    await waitFor(() => expect(saveAnnotations).toHaveBeenCalledTimes(1));
    view.rerender({ actor: 'actor-b' });
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
    act(() => { view.result.current.add(PASSAGE, 'passage', 20, 30); view.result.current.retrySave(PASSAGE); });
    await waitFor(() => expect(saveAnnotations).toHaveBeenCalledTimes(2));
    await act(async () => replyA());
    expect(targetsOf(view.result.current.forPassage(PASSAGE))).toEqual(['passage:20-30']);
    expect(view.result.current.statusForPassage(PASSAGE)).toBe('saving');
    expect(saveAnnotations.mock.calls.map((call) => call[2])).toEqual(['actor-a', 'actor-b']);
    expect(localStorage.length).toBe(1);
    await act(async () => replyB());
    expect(view.result.current.statusForPassage(PASSAGE)).toBe('saved');
    view.unmount();
  });

  it('ignores delayed hydration for a passage left behind and recovers its unsent edit on return', async () => {
    const otherPassage = PASSAGE + 1;
    const view = renderHook(({ ids }) => useRcHighlights(ids, 'actor-a'), { initialProps: { ids: [PASSAGE] } });
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
    act(() => view.result.current.add(PASSAGE, 'passage', 0, 10));
    let staleRead!: (rows: Map<number, RcHighlight[]>) => void;
    loadAnnotations.mockImplementationOnce(() => new Promise((resolve) => { staleRead = resolve; }));
    view.rerender({ ids: [otherPassage] });
    view.rerender({ ids: [PASSAGE] });
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
    await act(async () => staleRead(new Map([[otherPassage, [{ target: 'passage', start: 20, end: 30, color: 'pink' }]]])));
    expect(targetsOf(view.result.current.forPassage(PASSAGE))).toEqual(['passage:0-10']);
    expect(view.result.current.forPassage(otherPassage)).toEqual([]);
    expect(view.result.current.statusForPassage(PASSAGE)).toBe('recovered');
    expect(saveAnnotations).not.toHaveBeenCalled();
    view.unmount();
  });

  it('does not surface an older save rejection over newer annotation intent', async () => {
    const view = await setup();
    let rejectOld!: (error: Error) => void;
    saveAnnotations.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { rejectOld = reject; }));
    act(() => { view.result.current.add(PASSAGE, 'passage', 0, 10); view.result.current.retrySave(PASSAGE); });
    await waitFor(() => expect(saveAnnotations).toHaveBeenCalledTimes(1));
    act(() => { view.result.current.removeAt(PASSAGE, 'passage', 5); view.result.current.retrySave(PASSAGE); });
    await act(async () => rejectOld(new Error('old request failed')));
    await waitFor(() => expect(view.result.current.statusForPassage(PASSAGE)).toBe('saved'));
    expect(view.result.current.errorForPassage(PASSAGE)).toBeNull();
    expect(saveAnnotations.mock.calls[1][1]).toEqual([]);
    expect(localStorage.length).toBe(0);
    view.unmount();
  });

  it('retains the newest account A marks through A/B/A switching, a stale reply and teardown', async () => {
    let oldReply!: () => void;
    saveAnnotations.mockImplementationOnce(() => new Promise<void>((resolve) => { oldReply = resolve; }));
    const view = renderHook(({ actor }) => useRcHighlights([PASSAGE], actor), { initialProps: { actor: 'actor-a' } });
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
    act(() => { view.result.current.add(PASSAGE, 'passage', 0, 10); view.result.current.retrySave(PASSAGE); });
    await waitFor(() => expect(saveAnnotations).toHaveBeenCalledTimes(1));
    view.rerender({ actor: 'actor-b' });
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
    act(() => view.result.current.add(PASSAGE, 'passage', 40, 50, 'pink'));
    view.rerender({ actor: 'actor-a' });
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
    expect(targetsOf(view.result.current.forPassage(PASSAGE))).toEqual(['passage:0-10']);
    act(() => view.result.current.add(PASSAGE, 'passage', 20, 30));
    await act(async () => oldReply());
    view.unmount();

    const restoredA = await setup();
    expect(targetsOf(restoredA.result.current.forPassage(PASSAGE))).toEqual(['passage:0-10', 'passage:20-30']);
    expect(restoredA.result.current.statusForPassage(PASSAGE)).toBe('recovered');
    expect(saveAnnotations).toHaveBeenCalledTimes(1);
    act(() => restoredA.result.current.retrySave(PASSAGE));
    await waitFor(() => expect(restoredA.result.current.statusForPassage(PASSAGE)).toBe('saved'));
    expect(saveAnnotations.mock.calls[1][2]).toBe('actor-a');
    expect(saveAnnotations.mock.calls[1][1]).toHaveLength(2);
    restoredA.unmount();
    const restoredB = renderHook(() => useRcHighlights([PASSAGE], 'actor-b'));
    await waitFor(() => expect(restoredB.result.current.loaded).toBe(true));
    expect(targetsOf(restoredB.result.current.forPassage(PASSAGE))).toEqual(['passage:40-50']);
    expect(restoredB.result.current.statusForPassage(PASSAGE)).toBe('recovered');
    expect(saveAnnotations).toHaveBeenCalledTimes(2);
    restoredB.unmount();
  });
});
