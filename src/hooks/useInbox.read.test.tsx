import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ user: { id: 'viewer-a' } as { id: string } | null, read: vi.fn(), condition: vi.fn(), messages: vi.fn(), visible: true, focused: true }));
vi.mock('@/hooks/useNotifications', () => ({ clearConversationNotifications: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
  from: (table: string) => {
    let update = false;
    let values: any;
    const filters: Record<string, unknown> = {};
    const chain: any = {
      select: () => chain, update: (value: any) => { update = true; values = value; return chain; },
      eq: (key: string, value: unknown) => { filters[key] = value; return chain; },
      order: () => chain, or: (condition: string) => { state.condition(condition); return chain; }, maybeSingle: () => chain, in: () => chain, range: (from: number, to: number) => { filters.range = { from, to }; return chain; },
      then: (resolve: any, reject: any) => Promise.resolve(table === 'messages' ? state.messages(filters) : update ? state.read(values, filters) : { data: [], error: null }).then(resolve, reject),
    };
    return chain;
  },
  channel: () => { const channel: any = { on: () => channel, subscribe: () => channel }; return channel; }, removeChannel: vi.fn(),
} }));
import { acknowledgeConversationMessages, useConversationMessages } from './useInbox';
const incoming = (id = 'm1', at = '2026-10-27T12:00:00.000Z') => ({ id, conversation_id: 'c1', sender_id: 'other', body: id, created_at: at });
function deferred() { let resolve!: (value: any) => void; const promise = new Promise<any>((r) => { resolve = r; }); return { promise, resolve }; }
beforeEach(() => {
  state.user = { id: 'viewer-a' }; state.visible = true; state.focused = true;
  vi.spyOn(document, 'hasFocus').mockImplementation(() => state.focused);
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state.visible ? 'visible' : 'hidden' });
  state.condition.mockReset();
  state.messages.mockReset().mockResolvedValue({ data: [incoming()], error: null });
  state.read.mockReset().mockImplementation((values, filters) => ({ data: [{ conversation_id: filters.conversation_id, ...values }], error: null }));
});
describe('conversation read acknowledgment', () => {
  it('waits for a successful load and does not mark a failed load read', async () => {
    const load = deferred(); state.messages.mockReturnValue(load.promise);
    const { result } = renderHook(() => useConversationMessages('c1'));
    expect(state.read).not.toHaveBeenCalled();
    await act(async () => { load.resolve({ data: null, error: { message: 'offline' } }); });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(state.read).not.toHaveBeenCalled();
  });
  it('uses only the fetched incoming watermark, excluding unseen arrivals and own sends', async () => {
    state.messages.mockResolvedValue({ data: [incoming(), { ...incoming('own', '2026-10-27T13:00:00.000Z'), sender_id: 'viewer-a' }], error: null });
    renderHook(() => useConversationMessages('c1'));
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    expect(state.condition).toHaveBeenCalledWith('last_read_at.is.null,last_read_at.lt.2026-10-27T12:00:00.000Z');
    expect(state.read).toHaveBeenCalledWith({ last_read_at: '2026-10-27T12:00:00.000Z' }, { conversation_id: 'c1', user_id: 'viewer-a' });
  });
  it('does not acknowledge hidden or collapsed readers, then acknowledges on visible focus', async () => {
    state.visible = false;
    const { result, rerender } = renderHook(({ enabled }) => useConversationMessages('c1', enabled), { initialProps: { enabled: false } });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(state.read).not.toHaveBeenCalled();
    rerender({ enabled: true }); expect(state.read).not.toHaveBeenCalled();
    state.visible = true;
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
  });
  it('discards delayed thread responses after switching conversations', async () => {
    const old = deferred(); state.messages.mockImplementation((filters) => filters.conversation_id === 'c1' ? old.promise : { data: [{ ...incoming('m2'), conversation_id: 'c2' }], error: null });
    const { result, rerender } = renderHook(({ id }) => useConversationMessages(id), { initialProps: { id: 'c1' } });
    rerender({ id: 'c2' });
    await waitFor(() => expect(result.current.messages[0]?.id).toBe('m2'));
    await act(async () => { old.resolve({ data: [incoming('old')], error: null }); });
    expect(result.current.messages[0]?.id).toBe('m2');
    expect(state.read.mock.calls.every(([, filters]) => filters.conversation_id === 'c2')).toBe(true);
  });
  it('discards delayed account responses and scopes acknowledgment to the new viewer', async () => {
    const old = deferred(); state.messages.mockReturnValueOnce(old.promise).mockResolvedValue({ data: [incoming('new')], error: null });
    const { result, rerender } = renderHook(() => useConversationMessages('c1'));
    state.user = { id: 'viewer-b' }; rerender();
    await waitFor(() => expect(result.current.messages[0]?.id).toBe('new'));
    await act(async () => { old.resolve({ data: [incoming('old')], error: null }); });
    expect(result.current.messages[0]?.id).toBe('new');
    expect(state.read.mock.calls.every(([, filters]) => filters.user_id === 'viewer-b')).toBe(true);
  });
  it('does not emit a read event when an update affects no own participant and verification fails', async () => {
    state.read.mockResolvedValue({ data: [], error: null });
    const listener = vi.fn(); window.addEventListener('inbox:read', listener);
    await expect(acknowledgeConversationMessages('viewer-a', 'c1', '2026-10-27T12:00:00.000Z')).rejects.toThrow('Could not confirm');
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener('inbox:read', listener);
  });

  it('loads beyond the first server page before acknowledging the latest fetched incoming message', async () => {
    state.messages.mockImplementation((filters) => ({ data: filters.range.from === 0
      ? Array.from({ length: 500 }, (_, index) => incoming(`page-${index}`))
      : [incoming('latest', '2026-10-27T14:00:00.000Z')], error: null }));
    const { result } = renderHook(() => useConversationMessages('c1'));
    await waitFor(() => expect(result.current.messages).toHaveLength(501));
    await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1));
    expect(state.read.mock.calls[0][0].last_read_at).toBe('2026-10-27T14:00:00.000Z');
    expect(state.messages).toHaveBeenCalledTimes(2);
  });

  it('rejects a mismatched authenticated reader before writing any participant', async () => {
    state.user = { id: 'viewer-b' };
    await expect(acknowledgeConversationMessages('viewer-a', 'c1', '2026-10-27T12:00:00.000Z')).rejects.toThrow('signed-in reader changed');
    expect(state.read).not.toHaveBeenCalled();
  });

});
