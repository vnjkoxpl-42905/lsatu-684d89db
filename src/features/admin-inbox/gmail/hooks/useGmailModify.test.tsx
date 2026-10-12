import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { GmailApiError } from '../api';
import type { GmailThreadSummary, ListThreadsResult } from '../api';
import { useGmailModify } from './useGmailModify';

const batchModifyThreads = vi.fn();

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>();
  return {
    ...actual,
    batchModifyThreads: (...args: unknown[]) => batchModifyThreads(...args),
  };
});

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const LIST_KEY = ['gmail', 'threads', { labelIds: ['INBOX'], q: '', categoryLabelIds: [], pageToken: null, maxResults: 50 }];

function summary(id: string): GmailThreadSummary {
  return {
    id,
    snippet: '',
    from: `sender-${id}@example.com`,
    to: '',
    subject: `Subject ${id}`,
    date: '',
    internalDate: '1',
    messageCount: 1,
    senders: [],
    labelIds: ['INBOX'],
    unread: false,
    starred: false,
    hasAttachments: false,
  };
}

function harness() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  client.setQueryData<ListThreadsResult>(LIST_KEY, {
    threads: [summary('a'), summary('b'), summary('c')],
    nextPageToken: null,
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const ids = () => client.getQueryData<ListThreadsResult>(LIST_KEY)?.threads.map((t) => t.id) ?? [];
  return { client, wrapper, ids };
}

describe('useGmailModify partial failure', () => {
  it('keeps the threads that archived when only some of the batch fails', async () => {
    batchModifyThreads.mockRejectedValueOnce(
      new GmailApiError('1 of 3 failed', 0, {
        results: [
          { id: 'a', ok: true },
          { id: 'b', ok: true },
          { id: 'c', ok: false, error: 'notFound' },
        ],
      }),
    );

    const { wrapper, ids } = harness();
    const { result } = renderHook(() => useGmailModify(), { wrapper });

    result.current.mutate({ kind: 'archive', ids: ['a', 'b', 'c'] });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // a and b really did archive, so they stay gone; only c comes back.
    await waitFor(() => expect(ids()).toEqual(['c']));
  });

  it('rolls the whole batch back when nothing is known to have landed', async () => {
    batchModifyThreads.mockRejectedValueOnce(new GmailApiError('network down', 500));

    const { wrapper, ids } = harness();
    const { result } = renderHook(() => useGmailModify(), { wrapper });

    result.current.mutate({ kind: 'archive', ids: ['a', 'b', 'c'] });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await waitFor(() => expect(ids()).toEqual(['a', 'b', 'c']));
  });
});
