import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const { save } = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('../api/rcProgress', () => ({ setAttemptFlag: save }));
import { useRcFlagPersistence } from './useRcFlagPersistence';

const options = { actorId: 'actor-a', sessionId: 'session-a', enabled: true, recordedQuestionIds: [7] };
beforeEach(() => { localStorage.clear(); save.mockReset().mockResolvedValue(undefined); });

it('keeps rejected flag intent recoverable and acknowledges successful retry only', async () => {
  save.mockRejectedValueOnce(new Error('offline'));
  const view = renderHook(() => useRcFlagPersistence(options));
  act(() => view.result.current.setFlag(7, true));
  await waitFor(() => expect(view.result.current.statusForQuestion(7)).toBe('error'));
  expect(view.result.current.pendingFlags.get(7)).toBe(true);
  expect(view.result.current.errorForQuestion(7)).toBe('offline');
  act(() => view.result.current.retry(7));
  await waitFor(() => expect(view.result.current.statusForQuestion(7)).toBe('saved'));
  expect(save).toHaveBeenLastCalledWith('session-a', 7, true, 'actor-a');
  expect(localStorage.length).toBe(0);
});

it('serializes changed flags and cannot let old acknowledgements clear newer intent', async () => {
  let first!: () => void;
  let second!: () => void;
  save.mockImplementationOnce(() => new Promise<void>((resolve) => { first = resolve; }));
  save.mockImplementationOnce(() => new Promise<void>((resolve) => { second = resolve; }));
  const view = renderHook(() => useRcFlagPersistence(options));
  act(() => view.result.current.setFlag(7, true));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  act(() => view.result.current.setFlag(7, false));
  expect(save).toHaveBeenCalledTimes(1);
  await act(async () => first());
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(view.result.current.statusForQuestion(7)).toBe('saving');
  expect(view.result.current.pendingFlags.get(7)).toBe(false);
  expect(localStorage.length).toBe(1);
  await act(async () => second());
  expect(view.result.current.statusForQuestion(7)).toBe('saved');
});

it('deduplicates Retry while the same flag write is still pending', async () => {
  let acknowledge!: () => void;
  save.mockImplementationOnce(() => new Promise<void>((resolve) => { acknowledge = resolve; }));
  const view = renderHook(() => useRcFlagPersistence(options));
  act(() => { view.result.current.setFlag(7, true); view.result.current.retry(7); view.result.current.retry(7); });
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  await act(async () => acknowledge());
  expect(view.result.current.statusForQuestion(7)).toBe('saved');
});

it('recovers the original account and session only and never auto-replays', async () => {
  const view = renderHook(({ actorId, sessionId }) => useRcFlagPersistence({ ...options, actorId, sessionId }), { initialProps: { actorId: 'actor-a', sessionId: 'session-a' } });
  save.mockRejectedValueOnce(new Error('offline'));
  act(() => view.result.current.setFlag(7, true));
  await waitFor(() => expect(view.result.current.statusForQuestion(7)).toBe('error'));
  view.rerender({ actorId: 'actor-b', sessionId: 'session-a' });
  expect(view.result.current.pendingFlags.size).toBe(0);
  view.rerender({ actorId: 'actor-a', sessionId: 'session-b' });
  expect(view.result.current.pendingFlags.size).toBe(0);
  view.rerender({ actorId: 'actor-a', sessionId: 'session-a' });
  expect(view.result.current.pendingFlags.get(7)).toBe(true);
  expect(view.result.current.statusForQuestion(7)).toBe('recovered');
  expect(save).toHaveBeenCalledTimes(1);
});

it('retains unrecorded flags across teardown until the initial answer is acknowledged', async () => {
  const view = renderHook(() => useRcFlagPersistence({ ...options, recordedQuestionIds: [] }));
  act(() => view.result.current.setFlag(7, true));
  expect(save).not.toHaveBeenCalled();
  view.unmount();
  const restored = renderHook(() => useRcFlagPersistence({ ...options, recordedQuestionIds: [] }));
  expect(restored.result.current.pendingFlags.get(7)).toBe(true);
    act(() => restored.result.current.acknowledgeRecordedFlag(7, true));
  expect(restored.result.current.statusForQuestion(7)).toBe('saved');
  expect(localStorage.length).toBe(0);
});

it('persists newer flag intent when an initial answer acknowledges an older flag', async () => {
  const view = renderHook(() => useRcFlagPersistence({ ...options, recordedQuestionIds: [] }));
  act(() => view.result.current.setFlag(7, true));
  expect(save).not.toHaveBeenCalled();
  act(() => view.result.current.acknowledgeRecordedFlag(7, false));
  await waitFor(() => expect(view.result.current.statusForQuestion(7)).toBe('saved'));
  expect(save).toHaveBeenCalledWith('session-a', 7, true, 'actor-a');
});

it('never replays or changes protected flags', () => {
  const view = renderHook(() => useRcFlagPersistence({ ...options, enabled: false }));
  act(() => { view.result.current.setFlag(7, true); view.result.current.retry(7); });
  expect(view.result.current.pendingFlags.size).toBe(0);
  expect(save).not.toHaveBeenCalled();
  expect(localStorage.length).toBe(0);
});

it('ignores a late account-A acknowledgement while account-B intent is pending', async () => {
  let acknowledge!: () => void;
  save.mockImplementationOnce(() => new Promise<void>((resolve) => { acknowledge = resolve; }));
  let acknowledgeB!: () => void;
  save.mockImplementationOnce(() => new Promise<void>((resolve) => { acknowledgeB = resolve; }));
  const view = renderHook(({ actorId }) => useRcFlagPersistence({ ...options, actorId }), { initialProps: { actorId: 'actor-a' } });
  act(() => view.result.current.setFlag(7, true));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  view.rerender({ actorId: 'actor-b' });
  act(() => view.result.current.setFlag(7, false));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  await act(async () => acknowledge());
  expect(view.result.current.pendingFlags.get(7)).toBe(false);
  expect(view.result.current.statusForQuestion(7)).toBe('saving');
  await act(async () => acknowledgeB());
  expect(view.result.current.statusForQuestion(7)).toBe('saved');
});

it('keeps a lost flag acknowledgement recoverable after reload and retries the same intent once', async () => {
  save.mockImplementationOnce(() => new Promise<void>(() => undefined));
  const view = renderHook(() => useRcFlagPersistence(options));
  act(() => view.result.current.setFlag(7, true));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  view.unmount();
  const restored = renderHook(() => useRcFlagPersistence(options));
  expect(restored.result.current.statusForQuestion(7)).toBe('recovered');
  expect(save).toHaveBeenCalledTimes(1);
  act(() => { restored.result.current.retry(7); restored.result.current.retry(7); });
  await waitFor(() => expect(restored.result.current.statusForQuestion(7)).toBe('saved'));
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[1]).toEqual(save.mock.calls[0]);
  expect(localStorage.length).toBe(0);
});

it('preserves personal recovery without exposing or replaying it in protected review', async () => {
  save.mockRejectedValueOnce(new Error('offline'));
  const view = renderHook(({ enabled }) => useRcFlagPersistence({ ...options, enabled }), { initialProps: { enabled: true } });
  act(() => view.result.current.setFlag(7, true));
  await waitFor(() => expect(view.result.current.statusForQuestion(7)).toBe('error'));
  const recovery = localStorage.getItem(localStorage.key(0)!);
  view.rerender({ enabled: false });
  act(() => {
    view.result.current.setFlag(7, false);
    view.result.current.retry(7);
    view.result.current.acknowledgeRecordedFlag(7, true);
  });
  expect(view.result.current.pendingFlags.size).toBe(0);
  expect(view.result.current.statusForQuestion(7)).toBe('idle');
  expect(save).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem(localStorage.key(0)!)).toBe(recovery);
  view.rerender({ enabled: true });
  expect(view.result.current.pendingFlags.get(7)).toBe(true);
  expect(view.result.current.statusForQuestion(7)).toBe('recovered');
  expect(save).toHaveBeenCalledTimes(1);
});

it('saves the latest flag after an older request rejects without retaining its stale error', async () => {
  let rejectOld!: (error: Error) => void;
  save.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { rejectOld = reject; }));
  const view = renderHook(() => useRcFlagPersistence(options));
  act(() => view.result.current.setFlag(7, true));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  act(() => view.result.current.setFlag(7, false));
  await act(async () => rejectOld(new Error('old flag request failed')));
  await waitFor(() => expect(view.result.current.statusForQuestion(7)).toBe('saved'));
  expect(save).toHaveBeenLastCalledWith('session-a', 7, false, 'actor-a');
  expect(view.result.current.errorForQuestion(7)).toBeNull();
  expect(view.result.current.pendingFlags.size).toBe(0);
  expect(localStorage.length).toBe(0);
});
