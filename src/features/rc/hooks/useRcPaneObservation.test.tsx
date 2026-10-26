import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRcPaneObservation } from './useRcPaneObservation';
afterEach(() => { vi.restoreAllMocks(); });
describe('honest pane visibility observations', () => {
  it('keeps split intervals separate and excludes paused, hidden and previous-question time', () => {
    let now = 0; let hidden = false;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => hidden ? 'hidden' : 'visible');
    const hook = renderHook(({ id, paused }) => useRcPaneObservation(id, true, paused), { initialProps: { id: 'question1', paused: false } });
    now = 100; act(() => hook.result.current.setPane('passage'));
    now = 300; hook.rerender({ id: 'question1', paused: true });
    now = 700; hook.rerender({ id: 'question1', paused: false });
    now = 800; act(() => { hidden = true; document.dispatchEvent(new Event('visibilitychange')); });
    now = 1500; act(() => { hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
    now = 1600; act(() => hook.result.current.setPane('question'));
    now = 1650;
    expect(hook.result.current.snapshot()).toEqual({ sharedMs: 100, passageMs: 400, questionMs: 50 });
    hook.rerender({ id: 'question2', paused: false }); now = 1700;
    expect(hook.result.current.snapshot()).toEqual({ sharedMs: 0, passageMs: 0, questionMs: 50 });
  });
});
