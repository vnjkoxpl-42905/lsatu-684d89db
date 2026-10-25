import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), record: vi.fn() }));
vi.mock('../lib/rcLearning', async () => ({ ...await vi.importActual('../lib/rcLearning'), getRcLearningEvents: (...args: unknown[]) => api.get(...args), recordRcLearningEvent: (...args: unknown[]) => api.record(...args) }));
import { useRcTraining } from './useRcTraining';
import type { RcLearningEvent } from '../lib/rcLearning';
const options = { actorId: 'owner', sessionId: 'session', passageId: 7, questionId: 10, enabled: true, canPredict: true };
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); api.get.mockResolvedValue([]); api.record.mockImplementation(async event => event); });
describe('RC training acknowledgement and isolation', () => {
  it('loads only after an explicit opening and keeps prediction choices hidden until account acknowledgement', async () => {
    const hook = renderHook(() => useRcTraining(options)); expect(api.get).not.toHaveBeenCalled();
    act(() => hook.result.current.setOpen(true)); await waitFor(() => expect(hook.result.current.loaded).toBe(true));
    act(() => hook.result.current.setAnticipation(true)); expect(hook.result.current.choicesHidden).toBe(true);
    let acknowledge!: (event: RcLearningEvent) => void;
    api.record.mockImplementationOnce(() => new Promise(resolve => { acknowledge = resolve; }));
    act(() => hook.result.current.save('prediction', 'It should explain the conflict.'));
    expect(hook.result.current.choicesHidden).toBe(true); expect(hook.result.current.pending).not.toBeNull();
    const request = api.record.mock.calls[0][0];
    await act(async () => acknowledge(request));
    expect(hook.result.current.choicesHidden).toBe(false); expect(hook.result.current.latest('prediction')?.value).toBe('It should explain the conflict.');
    expect(hook.result.current.latest('confidence')).toBeUndefined();
  });
  it('retains and retries the same event after failure without changing scored answers', async () => {
    api.record.mockRejectedValueOnce(new Error('offline'));
    const hook = renderHook(() => useRcTraining(options)); act(() => hook.result.current.setOpen(true)); await waitFor(() => expect(hook.result.current.loaded).toBe(true));
    act(() => hook.result.current.save('confidence', 'low'));
    await waitFor(() => expect(hook.result.current.error).toContain('not saved'));
    const request = api.record.mock.calls[0][0]; expect(JSON.parse(localStorage.getItem('lsatu:rc-learning-pending:v1:owner:session')!).id).toBe(request.id);
    await act(async () => hook.result.current.retry());
    expect(api.record.mock.calls[1][0]).toEqual(request); expect(hook.result.current.pending).toBeNull();
  });
  it('restores the same pending learning UUID after reload and retries only that event', async () => {
    const event: RcLearningEvent = { id: crypto.randomUUID(), actorId: 'owner', sessionId: 'session', passageId: 7, questionId: 10, kind: 'prediction', value: 'Saved draft prediction', createdAt: '2026-10-17T12:00:00Z' };
    localStorage.setItem('lsatu:rc-learning-pending:v1:owner:session', JSON.stringify(event));
    const hook = renderHook(() => useRcTraining(options));
    await waitFor(() => expect(hook.result.current.loaded).toBe(true));
    expect(hook.result.current.pending?.id).toBe(event.id);
    expect(api.record).not.toHaveBeenCalled();
    await act(async () => hook.result.current.retry());
    expect(api.record).toHaveBeenCalledWith(event); expect(hook.result.current.latest('prediction')?.id).toBe(event.id);
    expect(localStorage.getItem('lsatu:rc-learning-pending:v1:owner:session')).toBeNull();
  });
  it('restores reading progress for the passage across question changes', async () => {
    api.get.mockResolvedValue([{ id: crypto.randomUUID(), actorId: 'owner', sessionId: 'session', passageId: 7, questionId: 10, kind: 'reading-progress', value: 3, createdAt: '2026-10-17T12:00:00Z' }]);
    const hook = renderHook(({ questionId }) => useRcTraining({ ...options, questionId }), { initialProps: { questionId: 11 } });
    act(() => hook.result.current.setOpen(true));
    await waitFor(() => expect(hook.result.current.paragraphLimit).toBe(3));
    hook.rerender({ questionId: 12 }); expect(hook.result.current.paragraphLimit).toBe(3);
  });
  it('never loads or writes when the caller policy disables training', async () => {
    const hook = renderHook(() => useRcTraining({ ...options, enabled: false }));
    act(() => { hook.result.current.setOpen(true); hook.result.current.save('prediction', 'No protected training.'); });
    expect(api.get).not.toHaveBeenCalled(); expect(api.record).not.toHaveBeenCalled(); expect(hook.result.current.choicesHidden).toBe(false);
  });
  it('ignores an old account acknowledgement after an actor switch', async () => {
    let acknowledge!: (event: RcLearningEvent) => void; api.record.mockImplementationOnce(() => new Promise(resolve => { acknowledge = resolve; }));
    const hook = renderHook(({ actorId }) => useRcTraining({ ...options, actorId }), { initialProps: { actorId: 'owner' } });
    act(() => hook.result.current.setOpen(true)); await waitFor(() => expect(hook.result.current.loaded).toBe(true));
    act(() => hook.result.current.save('prediction', 'An old owner prediction.')); const request = api.record.mock.calls[0][0];
    hook.rerender({ actorId: 'other' }); await act(async () => acknowledge(request));
    expect(hook.result.current.latest('prediction')).toBeUndefined(); expect(hook.result.current.pending).toBeNull();
  });
});
