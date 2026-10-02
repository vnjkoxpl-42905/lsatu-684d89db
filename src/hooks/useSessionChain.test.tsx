import * as React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { BOOKING_B, OTHER_STUDENT, STUDENT, booking, item, link } from '@/test/sessionChainFixtures';

const mocks = vi.hoisted(() => ({
  getClassroomItem: vi.fn(),
  updateIfUnchanged: vi.fn(),
  from: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, functions: { invoke: mocks.invoke } } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: STUDENT } }) }));
vi.mock('@/lib/classroomItems', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/classroomItems')>()),
  getClassroomItem: mocks.getClassroomItem,
  updateClassroomItemMetadataIfUnchanged: mocks.updateIfUnchanged,
}));

import { commitSessionLink, deriveSessionChainState, fetchTeacherBookings, useSessionLinkWriter } from './useSessionChain';

function q<T>(data: T | undefined, flags: { isLoading?: boolean; isError?: boolean } = {}) {
  return { data, isLoading: !!flags.isLoading, isError: !!flags.isError, refetch: vi.fn() };
}

describe('deriveSessionChainState', () => {
  const linked = item({ metadata_json: { session_chain: link() } });

  it('reports booking failure as failure, not an empty schedule', () => {
    const s = deriveSessionChainState({ audience: 'student', subjectId: STUDENT, bookingQuery: q(undefined, { isError: true }), itemQuery: q([linked]) });
    expect(s.bookingsFailed).toBe(true);
    expect(s.bookings).toEqual([]);
  });

  it('names item failure separately and keeps the appointment', () => {
    const s = deriveSessionChainState({ audience: 'student', subjectId: STUDENT, bookingQuery: q([booking()]), itemQuery: q(undefined, { isError: true }) });
    expect(s.itemsFailed).toBe(true);
    expect(s.bookingsFailed).toBe(false);
    expect(s.bookings).toHaveLength(1);
  });

  it('keeps verified rows during a failed background refresh and marks them stale', () => {
    const s = deriveSessionChainState({ audience: 'student', subjectId: STUDENT, bookingQuery: q([booking()]), itemQuery: q([linked], { isError: true }) });
    expect(s.stale).toBe(true);
    expect(s.itemsFailed).toBe(false);
    expect(s.projection.byBooking.size).toBe(1);
  });

  it('distinguishes initial loading from empty', () => {
    const s = deriveSessionChainState({ audience: 'student', subjectId: STUDENT, bookingQuery: q(undefined, { isLoading: true }), itemQuery: q(undefined, { isLoading: true }) });
    expect(s.bookingsLoading).toBe(true);
    expect(s.itemsLoading).toBe(true);
  });

  it('never projects another subject’s rows even if a cache holds them', () => {
    const foreign = item({ student_id: OTHER_STUDENT, metadata_json: { session_chain: link() } });
    const s = deriveSessionChainState({ audience: 'teacher', subjectId: STUDENT, bookingQuery: q([booking()]), itemQuery: q([foreign]) });
    expect(s.items).toEqual([]);
    expect(s.projection.byBooking.size).toBe(0);
  });

  it('shows nothing without a subject', () => {
    const s = deriveSessionChainState({ audience: 'student', subjectId: null, bookingQuery: q([booking()]), itemQuery: q([linked]) });
    expect(s.bookings).toEqual([]);
  });
});

describe('fetchTeacherBookings', () => {
  beforeEach(() => { mocks.from.mockReset(); mocks.invoke.mockReset(); });

  function redemptionQuery(rows: unknown[]) {
    const chain = { select: () => chain, eq: () => chain, order: async () => ({ data: rows, error: null }) };
    mocks.from.mockReturnValue(chain);
  }

  it('keeps verified rows only and never possible email matches', async () => {
    redemptionQuery([
      { id: booking().id, start_at: booking().startAt, end_at: booking().endAt, status: 'booked', meet_url: null, booking_passes: { student_id: STUDENT } },
      { id: BOOKING_B, start_at: booking().startAt, end_at: null, status: 'booked', meet_url: null, booking_passes: { student_id: OTHER_STUDENT } },
    ]);
    mocks.invoke.mockResolvedValue({
      data: {
        single_session_bookings: [{ id: BOOKING_B, start_at: '2026-10-06T15:00:00Z', end_at: null, status: 'booked', user_id: STUDENT, association: 'verified_account' }],
        single_session_possible_matches: [{ id: '44444444-4444-4444-8444-444444444444', start_at: '2026-10-07T15:00:00Z', status: 'booked', user_id: null, association: 'possible_match_unverified_email' }],
      },
      error: null,
    });
    const rows = await fetchTeacherBookings(STUDENT);
    expect(rows.map((r) => `${r.source}:${r.id}`).sort()).toEqual([`redemption:${booking().id}`, `single_session:${BOOKING_B}`].sort());
  });

  it('fails loudly rather than returning an empty list', async () => {
    redemptionQuery([]);
    mocks.invoke.mockResolvedValue({ data: null, error: { message: 'forbidden' } });
    await expect(fetchTeacherBookings(STUDENT)).rejects.toThrow('forbidden');
  });
});

describe('commitSessionLink', () => {
  beforeEach(() => { mocks.getClassroomItem.mockReset(); mocks.updateIfUnchanged.mockReset(); });

  const base = (overrides: Partial<ClassroomItem> = {}) => item({ id: 'target', metadata_json: { read_at: 'x', nested: { k: 1 } }, ...overrides });

  it('writes only the association, conditioned on the row it just read', async () => {
    const fresh = base({ updated_at: 'T1' });
    mocks.getClassroomItem.mockResolvedValue(fresh);
    mocks.updateIfUnchanged.mockImplementation(async (input) => ({ ...fresh, metadata_json: input.metadata, updated_at: 'T2' }));
    const out = await commitSessionLink({ itemId: 'target', studentId: STUDENT, expected: null, next: link() });
    expect(out.kind).toBe('saved');
    expect(mocks.updateIfUnchanged).toHaveBeenCalledWith({
      id: 'target', studentId: STUDENT, expectedUpdatedAt: 'T1',
      metadata: { read_at: 'x', nested: { k: 1 }, session_chain: link() },
    });
  });

  it('refuses a cross-owner write', async () => {
    mocks.getClassroomItem.mockResolvedValue(base({ student_id: OTHER_STUDENT }));
    expect(await commitSessionLink({ itemId: 'target', studentId: STUDENT, expected: null, next: link() })).toEqual({ kind: 'unavailable' });
    expect(mocks.updateIfUnchanged).not.toHaveBeenCalled();
  });

  it('refuses when the association changed since it was shown', async () => {
    mocks.getClassroomItem.mockResolvedValue(base({ metadata_json: { session_chain: link({ booking_id: BOOKING_B }) } }));
    const out = await commitSessionLink({ itemId: 'target', studentId: STUDENT, expected: null, next: link() });
    expect(out).toEqual({ kind: 'conflict', current: link({ booking_id: BOOKING_B }) });
    expect(mocks.updateIfUnchanged).not.toHaveBeenCalled();
  });

  it('reports a conflict when another write lands between read and write', async () => {
    mocks.getClassroomItem
      .mockResolvedValueOnce(base({ updated_at: 'T1' }))
      .mockResolvedValueOnce(base({ updated_at: 'T2', metadata_json: { read_at: 'y' } }));
    mocks.updateIfUnchanged.mockResolvedValue(null);
    expect(await commitSessionLink({ itemId: 'target', studentId: STUDENT, expected: null, next: link() })).toEqual({ kind: 'conflict', current: null });
  });

  it('treats a lost reply whose write landed as saved, without writing again', async () => {
    mocks.getClassroomItem
      .mockResolvedValueOnce(base({ updated_at: 'T1' }))
      .mockResolvedValueOnce(base({ updated_at: 'T2', metadata_json: { session_chain: link() } }));
    mocks.updateIfUnchanged.mockRejectedValue(new Error('network'));
    const out = await commitSessionLink({ itemId: 'target', studentId: STUDENT, expected: null, next: link() });
    expect(out.kind).toBe('saved');
    expect(mocks.updateIfUnchanged).toHaveBeenCalledTimes(1);
  });

  it('reports not saved when the row is unchanged after a failed write', async () => {
    const fresh = base({ updated_at: 'T1' });
    mocks.getClassroomItem.mockResolvedValue(fresh);
    mocks.updateIfUnchanged.mockRejectedValue(new Error('denied'));
    expect(await commitSessionLink({ itemId: 'target', studentId: STUDENT, expected: null, next: link() })).toEqual({ kind: 'not_saved', message: 'denied' });
  });

  it('reports unknown when the write and the re-read both fail', async () => {
    mocks.getClassroomItem.mockResolvedValueOnce(base()).mockRejectedValueOnce(new Error('offline'));
    mocks.updateIfUnchanged.mockRejectedValue(new Error('timeout'));
    expect(await commitSessionLink({ itemId: 'target', studentId: STUDENT, expected: null, next: link() })).toEqual({ kind: 'unknown', message: 'timeout' });
  });

  it('is idempotent when the target state is already stored', async () => {
    mocks.getClassroomItem.mockResolvedValue(base({ metadata_json: { session_chain: link() } }));
    expect((await commitSessionLink({ itemId: 'target', studentId: STUDENT, expected: null, next: link() })).kind).toBe('saved');
    expect(mocks.updateIfUnchanged).not.toHaveBeenCalled();
  });

  it('removes only the association', async () => {
    const fresh = base({ metadata_json: { keep: 1, session_chain: link() }, updated_at: 'T1' });
    mocks.getClassroomItem.mockResolvedValue(fresh);
    mocks.updateIfUnchanged.mockImplementation(async (input) => ({ ...fresh, metadata_json: input.metadata }));
    await commitSessionLink({ itemId: 'target', studentId: STUDENT, expected: link(), next: null });
    expect(mocks.updateIfUnchanged.mock.calls[0][0].metadata).toEqual({ keep: 1 });
  });
});

describe('useSessionLinkWriter', () => {
  beforeEach(() => { mocks.getClassroomItem.mockReset(); mocks.updateIfUnchanged.mockReset(); });

  function setup(initial: string) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return renderHook(({ id }) => useSessionLinkWriter(id), { wrapper, initialProps: { id: initial } });
  }

  it('reports a save that finishes after a student switch as superseded', async () => {
    let release: (v: ClassroomItem | null) => void = () => {};
    mocks.getClassroomItem.mockResolvedValue(item({ id: 'target' }));
    mocks.updateIfUnchanged.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    const hook = setup(STUDENT);
    let pending!: Promise<unknown>;
    act(() => { pending = hook.result.current.save('target', null, link()); });
    await vi.waitFor(() => expect(mocks.updateIfUnchanged).toHaveBeenCalled());
    hook.rerender({ id: OTHER_STUDENT });
    await act(async () => { release(item({ id: 'target' })); await pending; });
    await expect(pending).resolves.toEqual({ kind: 'superseded' });
    expect(hook.result.current.pending).toBe(false);
  });

  it('blocks a duplicate submit while one is in flight', async () => {
    let release: (v: ClassroomItem | null) => void = () => {};
    mocks.getClassroomItem.mockResolvedValue(item({ id: 'target' }));
    mocks.updateIfUnchanged.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    const hook = setup(STUDENT);
    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    act(() => { first = hook.result.current.save('target', null, link()); second = hook.result.current.save('target', null, link()); });
    await expect(second).resolves.toBeNull();
    await vi.waitFor(() => expect(mocks.updateIfUnchanged).toHaveBeenCalled());
    await act(async () => { release(item({ id: 'target' })); await first; });
    expect(mocks.updateIfUnchanged).toHaveBeenCalledTimes(1);
  });
});
