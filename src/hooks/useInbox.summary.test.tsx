import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ user: { id: 'viewer' } as { id: string } | null, fail: false, previewFail: false, empty: false, lastReadAt: '2026-10-01T00:00:00Z', secondLastReadAt: null as string | null, reads: [] as any[], messages: [] as any[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/hooks/useNotifications', () => ({ clearConversationNotifications: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => {
    let selected = ''; const filters: Record<string, any> = {};
    const chain: any = {
      select: (value: string) => { selected = value; return chain; },
      eq: (key: string, value: any) => { filters[key] = value; return chain; },
      in: (key: string, value: any) => { filters[key] = value; return chain; },
      neq: () => chain, gt: (key: string, value: any) => { filters[`gt:${key}`] = value; return chain; }, order: () => chain,
      range: (start: number) => { filters.start = start; return chain; },
      then: (resolve: any, reject: any) => {
        state.reads.push({ table, selected, filters });
        let data: any[] = [];
        if (table === 'conversation_participants') data = state.empty ? [] : [{ id: 'p1', conversation_id: 'c1', user_id: state.user?.id, last_read_at: state.lastReadAt }];
        if (table === 'conversation_participants' && !state.empty && state.secondLastReadAt) data.push({ id: 'p2', conversation_id: 'c2', user_id: state.user?.id, last_read_at: state.secondLastReadAt });
        if (table === 'conversations') data = [{ id: 'c1', last_message_at: '2026-10-27T13:00:00Z' }];
        if (table === 'messages') data = filters.id ? state.messages.filter((m) => filters.id.includes(m.id)) : filters.start ? [] : state.messages;
        const failed = state.fail || (state.previewFail && table === 'messages' && !!filters.id);
        return Promise.resolve({ data: failed ? null : data, error: failed ? { message: 'offline' } : null }).then(resolve, reject);
      },
    }; return chain;
  },
  rpc: async (name: string) => ({ data: name === 'get_latest_messages' ? [{ conversation_id: 'c1', body: 'My later reply', sender_id: 'viewer', created_at: '2026-10-27T13:00:00Z' }] : [], error: null }),
  channel: () => { const channel: any = { on: () => channel, subscribe: () => channel }; return channel; }, removeChannel: vi.fn(),
} }));
import { useInbox } from './useInbox';
const incoming = (id: string, created_at = '2026-10-27T12:00:00Z') => ({ id, conversation_id: 'c1', sender_id: 'student', body: id, created_at });
beforeEach(() => {
  state.user = { id: 'viewer' }; state.fail = false; state.previewFail = false; state.empty = false; state.reads = [];
  state.lastReadAt = '2026-10-01T00:00:00Z';
  state.secondLastReadAt = null;
  state.messages = [incoming('a'), incoming('z'), incoming('old', '2026-10-20T12:00:00Z')];
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
describe('inbox Home summary compatibility', () => {
  it('selects newest incoming unread by timestamp and id while preserving latest overall outgoing', async () => {
    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.conversations[0]).toMatchObject({ unread: true, latest_unread_at: '2026-10-27T12:00:00Z', latest_unread_message: { body: 'z', sender_id: 'student' }, last_message: { body: 'My later reply', sender_id: 'viewer' } });
    expect(result.current.unreadCount).toBe(1);
    expect(state.reads.filter((r) => r.table === 'messages').map((r) => [r.selected, r.filters.id])).toEqual([
      ['id, conversation_id, created_at', undefined], ['id, conversation_id, body, created_at, sender_id', ['z']],
    ]);
  });
  it('exposes a successful empty owner snapshot without scanning messages', async () => {
    state.empty = true;
    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.conversations).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(state.reads.every((r) => r.table !== 'messages')).toBe(true);
  });
  it('keeps the successful owner snapshot through a failed refresh', async () => {
    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    state.fail = true;
    await act(async () => { await result.current.refresh(); });
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBeTruthy();
    expect(result.current.conversations[0].latest_unread_message?.body).toBe('z');
  });
  it('refreshes unread state with no stale preview when the bounded preview read fails', async () => {
    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    state.previewFail = true;
    state.messages = [incoming('new', '2026-10-27T14:00:00Z')];
    await act(async () => { await result.current.refresh(); });
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.conversations[0]).toMatchObject({ unread: true, latest_unread_at: '2026-10-27T14:00:00Z', latest_unread_message: null });
    expect(console.warn).toHaveBeenCalledWith('[inbox] load unread previews failed:', { message: 'offline' });
  });
  it('loads a cold snapshot and unread count even when preview bodies cannot load', async () => {
    state.previewFail = true;
    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.conversations[0]).toMatchObject({ unread: true, latest_unread_at: '2026-10-27T12:00:00Z', latest_unread_message: null });
  });
  it('treats an invalid read timestamp as never read for the scan and per-thread comparison', async () => {
    state.lastReadAt = 'invalid';
    state.secondLastReadAt = '2026-10-26T00:00:00Z';
    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.conversations[0].latest_unread_message?.body).toBe('z');
    expect(state.reads.find((r) => r.table === 'messages' && !r.filters.id)?.filters['gt:created_at']).toBe('1970-01-01T00:00:00.000Z');
  });
  it('masks another actor snapshot when the new actor cannot load', async () => {
    const { result, rerender } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    state.user = { id: 'other-viewer' }; state.fail = true; rerender();
    expect(result.current.loaded).toBe(false);
    expect(result.current.conversations).toEqual([]);
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.loaded).toBe(false);
  });
});
