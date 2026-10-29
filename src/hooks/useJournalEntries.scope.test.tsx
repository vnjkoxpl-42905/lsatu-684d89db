import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useJournalEntries } from './useJournalEntries';
const state = vi.hoisted(() => ({ classId: 'previous-owner', loading: false, read: vi.fn() }));
vi.mock('@/hooks/useClassId', () => ({ useClassId: () => ({ classId: state.classId, loading: state.loading }) }));
vi.mock('@/lib/journalService', () => ({ getWrongAnswerSmartRows: (...args: unknown[]) => state.read(...args) }));
let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
beforeEach(() => { client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); state.classId='previous-owner'; state.loading=false; state.read.mockReset().mockResolvedValue([]); });
afterEach(() => { cleanup(); client.clear(); });
describe('journal read actor binding', () => {
  it('does not query a stale class during an actor switch and resumes only for the resolved owner', async () => {
    const { rerender } = renderHook(() => useJournalEntries(true, 'current-owner'), { wrapper });
    await act(async () => {}); expect(state.read).not.toHaveBeenCalled();
    state.classId='current-owner'; state.loading=true; rerender();
    await act(async () => {}); expect(state.read).not.toHaveBeenCalled();
    state.loading=false; rerender();
    await waitFor(() => expect(state.read).toHaveBeenCalledExactlyOnceWith('current-owner'));
  });
  it('never queries when the journal capability is disabled', async () => {
    state.classId='current-owner';
    renderHook(() => useJournalEntries(false, 'current-owner'), { wrapper });
    await act(async () => {}); expect(state.read).not.toHaveBeenCalled();
  });
});
