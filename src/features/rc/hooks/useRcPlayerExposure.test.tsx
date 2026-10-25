import * as React from 'react';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock('../api/rcExposure', async () => ({ ...await vi.importActual('../api/rcExposure'), recordRcPassageExposure: (...args: unknown[]) => api.record(...args) }));
import { useRcPlayerExposure } from './useRcPlayerExposure';
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); api.record.mockResolvedValue(undefined); });
describe('shown player passage exposure', () => {
  it('survives child-before-parent effects and deduplicates rerenders and acknowledged reloads', async () => {
    function Child({ shown }: { shown: (id: number) => void }) { React.useEffect(() => { shown(7); }, [shown]); return <p>Shown passage</p>; }
    function Player() { const exposure = useRcPlayerExposure('owner', 'session', true); return <Child shown={exposure.onShown} />; }
    const view = render(<Player />); await waitFor(() => expect(api.record).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('lsatu:rc-player-exposures:v1:owner:session')!)[0].acknowledged).toBe(true));
    view.rerender(<Player />); view.unmount(); render(<Player />);
    expect(api.record).toHaveBeenCalledTimes(1);
  });
  it('marks failed exposure unknown and retries the same UUID', async () => {
    api.record.mockRejectedValueOnce(new Error('offline'));
    const hook = renderHook(() => useRcPlayerExposure('owner', 'session', true));
    act(() => hook.result.current.onShown(7)); await waitFor(() => expect(hook.result.current.error).toBe(true));
    const request = api.record.mock.calls[0][0]; act(() => hook.result.current.retry());
    await waitFor(() => expect(hook.result.current.error).toBe(false)); expect(api.record.mock.calls[1][0]).toEqual(request);
  });
  it('does not record anything before actual shown content or when disabled', () => {
    const hook = renderHook(() => useRcPlayerExposure('owner', 'session', false));
    act(() => hook.result.current.onShown(7)); expect(api.record).not.toHaveBeenCalled();
  });
});
