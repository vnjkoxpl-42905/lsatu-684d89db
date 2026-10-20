import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const { saveNativeLabSubmission } = vi.hoisted(() => ({ saveNativeLabSubmission: vi.fn() }));
vi.mock('@/bootcamps/main-conclusion/lib/nativeLabAttempt', () => ({ saveNativeLabSubmission }));
import { useNativeLabSave } from './useNativeLabSave';
beforeEach(() => saveNativeLabSubmission.mockReset().mockResolvedValue(undefined));
it('retains UUID, frozen answer and ordinal through failed save retry', async () => {
  saveNativeLabSubmission.mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(() => useNativeLabSave('main-conclusion', 'student'));
  await act(async () => { expect(await result.current.save('Q1', '0', false)).toBe(false); });
  const first = saveNativeLabSubmission.mock.calls[0][0]; expect(result.current.blocked).toBe(true);
  await act(async () => { expect(await result.current.save('Q1', '1', true)).toBe(false); });
  expect(saveNativeLabSubmission).toHaveBeenCalledTimes(1);
  await act(async () => { expect(await result.current.save('Q1', '0', false)).toBe(true); });
  expect(saveNativeLabSubmission.mock.calls[1][0]).toEqual(first);
  await act(async () => { await result.current.save('Q1', '1', true); });
  const next = saveNativeLabSubmission.mock.calls[2][0]; expect(next.id).not.toBe(first.id);
  expect(JSON.parse(next.selected_answer).ordinal).toBe(2);
});
it('creates another sitting on retake while retaining previous immutable submissions', async () => {
  const { result } = renderHook(() => useNativeLabSave('conclusion-type', 'student'));
  await act(async () => { await result.current.save('Q1', 'causal', false); });
  const first = saveNativeLabSubmission.mock.calls[0][0];
  act(() => { expect(result.current.restart()).toBe(true); });
  await act(async () => { await result.current.save('Q1', 'causal', false); });
  const next = saveNativeLabSubmission.mock.calls[1][0]; expect(next.drill_id).not.toBe(first.drill_id); expect(next.id).not.toBe(first.id);
  expect(JSON.parse(next.selected_answer).ordinal).toBe(1);
});
it('preserves unconfirmed prior-owner response and denies actor switch retry', async () => {
  saveNativeLabSubmission.mockRejectedValueOnce(new Error('offline'));
  const { result, rerender } = renderHook(({ owner }) => useNativeLabSave('structure', owner), { initialProps: { owner: 'student' } });
  await act(async () => { await result.current.save('Q1', 'rebuttal', false); });
  rerender({ owner: 'other' });
  await act(async () => { expect(await result.current.save('Q1', 'rebuttal', false)).toBe(false); });
  expect(saveNativeLabSubmission).toHaveBeenCalledTimes(1);
  act(() => { expect(result.current.restart()).toBe(false); });
});
it('does not acknowledge owner A response in owner B UI after an in-flight account switch', async () => {
  let acknowledge!: () => void;
  saveNativeLabSubmission.mockImplementationOnce(() => new Promise<void>(resolve => { acknowledge = resolve; }));
  const { result, rerender } = renderHook(({ owner }) => useNativeLabSave('structure', owner), { initialProps: { owner: 'A' } });
  let saving!: Promise<boolean>;
  act(() => { saving = result.current.save('Q1', 'rebuttal', false); });
  rerender({ owner: 'B' });
  await act(async () => { acknowledge(); expect(await saving).toBe(false); });
  await act(async () => { expect(await result.current.save('Q1', 'rebuttal', false)).toBe(false); });
  expect(saveNativeLabSubmission).toHaveBeenCalledTimes(1);
});
it('does not acknowledge a response after its lab unmounts', async () => {
  let acknowledge!: () => void;
  saveNativeLabSubmission.mockImplementationOnce(() => new Promise<void>(resolve => { acknowledge = resolve; }));
  const { result, unmount } = renderHook(() => useNativeLabSave('structure', 'A'));
  let saving!: Promise<boolean>;
  act(() => { saving = result.current.save('Q1', 'rebuttal', false); }); unmount();
  acknowledge(); expect(await saving).toBe(false);
});
