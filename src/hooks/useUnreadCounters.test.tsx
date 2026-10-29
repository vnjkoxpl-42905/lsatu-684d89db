import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  userId: 'a' as string | undefined,
  requests: [] as Array<{ table: string; filters: Array<[string, unknown]>; head: boolean; from?: number }>,
  resolve: (_request: unknown): Promise<unknown> => Promise.resolve({ data: [], error: null }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.userId ? { id: state.userId } : null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: state.userId } }, error: null }) },
  from: (table: string) => {
    const request = { table, filters: [] as Array<[string, unknown]>, head: false, from: undefined as number | undefined };
    const chain: Record<string, unknown> = {};
    chain.select = (_columns: string, options?: { head?: boolean }) => { request.head = !!options?.head; return chain; };
    chain.update = () => chain;
    for (const method of ['eq', 'neq', 'gt', 'lte', 'in']) chain[method] = (key: string, value: unknown) => { request.filters.push([key, value]); return chain; };
    chain.or = (value: string) => { request.filters.push(['or', value]); return chain; };
    chain.order = () => chain;
    chain.limit = () => chain;
    chain.range = (from: number) => { request.from = from; return chain; };
    chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
      state.requests.push(request);
      return state.resolve(request).then(resolve, reject);
    };
    return chain;
  },
  channel: () => { const ch = { on: () => ch, subscribe: () => ch }; return ch; },
  removeChannel: vi.fn(),
} }));
import { loadUnreadMessageCount, useUnreadMessageCount } from './useUnreadMessageCount';
import { clearConversationNotifications, loadNotificationsUnreadCount, useNotifications } from './useNotifications';

beforeEach(() => { state.userId = 'a'; state.requests = []; state.resolve = async () => ({ data: [], error: null }); });

describe('recipient unread counters', () => {
  it('counts messages exactly per conversation beyond the row limit, excluding own messages', async () => {
    state.resolve = async (raw) => {
      const request = raw as typeof state.requests[number];
      return request.table === 'conversation_participants'
        ? { data: [{ conversation_id: 'one', last_read_at: null }, { conversation_id: 'two', last_read_at: '2026-10-01T00:00:00Z' }], error: null }
        : { count: 1402, error: null };
    };
    expect(await loadUnreadMessageCount('a')).toBe(1402);
    const requests = state.requests.filter((r) => r.table === 'messages');
    expect(requests).toHaveLength(1);
    expect(requests[0].filters).toContainEqual(['or', 'and(conversation_id.eq.one,created_at.gt.1970-01-01T00:00:00.000Z),and(conversation_id.eq.two,created_at.gt.2026-10-01T00:00:00Z)']);
    expect(requests.every((r) => r.head && r.filters.some(([key, value]) => key === 'sender_id' && value === 'a'))).toBe(true);
  });

  it('ignores a previous account count resolving after account switch', async () => {
    let finish: (value: unknown) => void;
    state.resolve = async (raw) => {
      const request = raw as typeof state.requests[number];
      if (request.table === 'messages') return { count: 9, error: null };
      if (request.filters.some(([key, value]) => key === 'user_id' && value === 'a')) return new Promise((resolve) => { finish = resolve; });
      return { data: [], error: null };
    };
    const hook = renderHook(() => useUnreadMessageCount());
    await waitFor(() => expect(finish).toBeDefined());
    state.userId = 'b'; hook.rerender();
    await act(async () => { finish!({ data: [{ conversation_id: 'one', last_read_at: null }], error: null }); });
    expect(hook.result.current).toBe(0);
  });

  it('does not restore a stale unread result after a newer read event', async () => {
    let finishOld: (value: unknown) => void;
    let calls = 0;
    state.resolve = async (raw) => {
      const request = raw as typeof state.requests[number];
      if (request.table === 'conversation_participants') return { data: [{ conversation_id: 'one', last_read_at: null }], error: null };
      calls += 1;
      if (calls === 1) return new Promise((resolve) => { finishOld = resolve; });
      return { count: 0, error: null };
    };
    const hook = renderHook(() => useUnreadMessageCount());
    await waitFor(() => expect(finishOld).toBeDefined());
    await act(async () => { window.dispatchEvent(new CustomEvent('inbox:read', { detail: { userId: 'a' } })); });
    await waitFor(() => expect(calls).toBe(2));
    await act(async () => { finishOld!({ count: 8, error: null }); });
    expect(hook.result.current).toBe(0);
  });

  it('counts every recipient notification separately from the limited feed', async () => {
    state.resolve = async () => ({ data: null, count: 37, error: null });
    expect(await loadNotificationsUnreadCount('a')).toBe(37);
    expect(state.requests[0].head).toBe(true);
    expect(state.requests[0].filters).toContainEqual(['user_id', 'a']);
    expect(state.requests[0].filters).toContainEqual(['read', false]);
  });

  it('shows the exact count when all latest feed entries are read and clears all older unread rows', async () => {
    let count = 37;
    state.resolve = async (raw) => {
      const r = raw as typeof state.requests[number];
      if (r.head) return { data: null, count, error: null };
      if (r.filters.some(([key]) => key === 'read')) { count = 0; return { data: null, error: null }; }
      return { data: [{ id: 'recent', user_id: 'a', read: true }], error: null };
    };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const hook = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(hook.result.current.unreadCount).toBe(37));
    await act(async () => { await hook.result.current.markAllRead(); });
    await waitFor(() => expect(hook.result.current.unreadCount).toBe(0));
  });

  it('refreshes notification count immediately after a scoped inbox-read event', async () => {
    let count = 2;
    state.resolve = async (raw) => (raw as typeof state.requests[number]).head
      ? { data: null, count, error: null } : { data: [], error: null };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const hook = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(hook.result.current.unreadCount).toBe(2));
    count = 0;
    await act(async () => { window.dispatchEvent(new CustomEvent('inbox:read', { detail: { userId: 'a' } })); });
    await waitFor(() => expect(hook.result.current.unreadCount).toBe(0));
  });

  it('rejects clearing another recipient and preserves notification errors', async () => {
    await expect(clearConversationNotifications('b', 'one', '2026-10-27T01:00:00Z')).rejects.toThrow('signed-in reader changed');
    expect(state.requests).toHaveLength(0);
    state.resolve = async () => ({ data: null, error: new Error('offline') });
    await expect(clearConversationNotifications('a', 'one', '2026-10-27T01:00:00Z')).rejects.toThrow('offline');
  });

  it('clears matching delayed alerts after reading when no incoming message remains unread', async () => {
    state.resolve = async (raw) => {
      const r = raw as typeof state.requests[number];
      if (r.table === 'messages') return { data: [], error: null };
      return { data: r.filters.some(([key]) => key === 'id') ? null : [
        { id: 'match', link: '/inbox/one?from=bell', created_at: '2026-10-27T01:00:01Z' }, { id: 'other', link: '/inbox/two' },
        { id: 'external', link: '//elsewhere/inbox/one' }, { id: 'generic', link: '/inbox' },
      ], error: null };
    };
    await clearConversationNotifications('a', 'one', '2026-10-27T01:00:00Z');
    const update = state.requests.find((r) => r.filters.some(([key]) => key === 'id'))!;
    expect(update.filters).toContainEqual(['id', ['match']]);
    expect(update.filters).toContainEqual(['user_id', 'a']);
    expect(update.filters).toContainEqual(['type', 'message']);
    const newer = state.requests.find((r) => r.table === 'messages')!;
    expect(newer.filters).toContainEqual(['created_at', '2026-10-27T01:00:00Z']);
    expect(newer.filters).toContainEqual(['sender_id', 'a']);
  });
  it('preserves alerts at or after an incoming message not included in the read watermark', async () => {
    state.resolve = async (raw) => {
      const r = raw as typeof state.requests[number];
      if (r.table === 'messages') return { data: [{ id: 'unseen-message', created_at: '2026-10-27T01:00:02Z' }], error: null };
      return { data: r.filters.some(([key]) => key === 'id') ? null : [
        { id: 'loaded', link: '/inbox/one', created_at: '2026-10-27T01:00:01Z' },
        { id: 'unseen', link: '/inbox/one', created_at: '2026-10-27T01:00:02Z' },
        { id: 'later', link: '/inbox/one', created_at: '2026-10-27T01:00:03Z' },
      ], error: null };
    };
    await clearConversationNotifications('a', 'one', '2026-10-27T01:00:00Z');
    const update = state.requests.find((r) => r.filters.some(([key]) => key === 'id'))!;
    expect(update.filters).toContainEqual(['id', ['loaded']]);
  });

  it('does not clear alerts if the unread-message boundary cannot be verified', async () => {
    state.resolve = async (raw) => (raw as typeof state.requests[number]).table === 'messages'
      ? { data: null, error: new Error('boundary unavailable') }
      : { data: [{ id: 'candidate', link: '/inbox/one', created_at: '2026-10-27T01:00:01Z' }], error: null };
    await expect(clearConversationNotifications('a', 'one', '2026-10-27T01:00:00Z')).rejects.toThrow('boundary unavailable');
    expect(state.requests.some((r) => r.filters.some(([key]) => key === 'id'))).toBe(false);
  });

});
