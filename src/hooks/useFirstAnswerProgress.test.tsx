import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFirstAnswerProgress } from './useFirstAnswerProgress';
import type { GradedQuestionAnswer, ProgressCoverage } from '@/lib/firstAnswerProgress';

const mocks = vi.hoisted(() => ({
  resolution: { state: 'ready', scope: { actorId: 'actor-a', studentId: 'student-a' } } as { state: string; scope?: { actorId: string; studentId: string } },
  load: vi.fn(),
}));
vi.mock('@/hooks/useStudentSubjectScope', () => ({ useStudentSubjectScope: () => mocks.resolution }));
vi.mock('@/lib/firstAnswerSources', () => ({ loadFirstAnswerLedger: (scope: unknown) => mocks.load(scope) }));

const coverage: ProgressCoverage = { includedSources: ['lr_attempts'], missingSources: [], excludedRows: {} };
const answer = (id: string, gradedAt: string): GradedQuestionAnswer => ({ attemptId: id, questionKey: `LR:${id}`, area: 'LR', source: 'lr_attempts', mode: 'adaptive', correct: true, gradedAt });
const ledger = (ownerId: string, ...answers: GradedQuestionAnswer[]) => ({ answers, coverage, ownerId });
const sleep = (ms = 8) => new Promise((resolve) => setTimeout(resolve, ms));

function setup(options?: Parameters<typeof useFirstAnswerProgress>[2]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...renderHook((props: { window: 7 | 30 | 'all' }) => useFirstAnswerProgress(props.window, undefined, options), { wrapper, initialProps: { window: 30 as 7 | 30 | 'all' } }) };
}

beforeEach(() => {
  mocks.load.mockReset();
  mocks.resolution = { state: 'ready', scope: { actorId: 'actor-a', studentId: 'student-a' } };
});

describe('first-answer read boundary', () => {
  it('holds one boundary per successful read and advances it only on a new read', async () => {
    mocks.load.mockResolvedValue(ledger('student-a', answer('one', '2026-10-01T12:00:00Z')));
    const { result, rerender } = setup({ revalidateOnMount: true });
    await waitFor(() => expect(result.current.asOf).not.toBeNull());
    const first = result.current.asOf;
    await sleep();
    rerender({ window: 7 });
    rerender({ window: 30 });
    expect(result.current.asOf).toBe(first);
    await sleep();
    await act(async () => { await result.current.refresh(); });
    // Notification is batched after the read resolves, so wait for the new boundary.
    await waitFor(() => expect(result.current.asOf).not.toBe(first));
    expect(Date.parse(result.current.asOf!)).toBeGreaterThan(Date.parse(first!));
    expect(result.current.progress?.LR.denominator).toBeDefined();
  });

  it('keeps earlier answers visible and reports a failed refresh instead of silent success', async () => {
    mocks.load.mockResolvedValueOnce(ledger('student-a', answer('one', '2026-10-01T12:00:00Z')));
    const { result } = setup({ revalidateOnMount: true });
    await waitFor(() => expect(result.current.ledger).not.toBeNull());
    const checkedAt = result.current.dataUpdatedAt;
    mocks.load.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { await result.current.refresh(); });
    await waitFor(() => expect(result.current.refreshError).toBeTruthy());
    expect(result.current.ledger?.answers).toHaveLength(1);
    expect(result.current.dataUpdatedAt).toBe(checkedAt);
  });

  it('does not refetch on focus, so evidence is not cleared', async () => {
    mocks.load.mockResolvedValue(ledger('student-a', answer('one', '2026-10-01T12:00:00Z')));
    const { result } = setup({ revalidateOnMount: true });
    await waitFor(() => expect(result.current.ledger).not.toBeNull());
    const calls = mocks.load.mock.calls.length;
    act(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('online')); });
    await sleep(20);
    expect(mocks.load.mock.calls.length).toBe(calls);
    expect(result.current.ledger).not.toBeNull();
  });

  it('revalidates on every mount only when Progress opts in', async () => {
    mocks.load.mockResolvedValue(ledger('student-a', answer('one', '2026-10-01T12:00:00Z')));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const plain = renderHook(() => useFirstAnswerProgress(30), { wrapper });
    await waitFor(() => expect(plain.result.current.ledger).not.toBeNull());
    plain.unmount();
    const afterPlain = mocks.load.mock.calls.length;
    const again = renderHook(() => useFirstAnswerProgress(30), { wrapper });
    await sleep(20);
    expect(mocks.load.mock.calls.length).toBe(afterPlain);
    again.unmount();
    const opted = renderHook(() => useFirstAnswerProgress(30, undefined, { revalidateOnMount: true }), { wrapper });
    // Cached content shows at once while the fresh read is checked.
    expect(opted.result.current.ledger).not.toBeNull();
    await waitFor(() => expect(mocks.load.mock.calls.length).toBe(afterPlain + 1));
  });

  it('never shows another account’s cached answers when the scope changes', async () => {
    mocks.load.mockImplementation(async (scope: { studentId: string }) => scope.studentId === 'student-a'
      ? ledger('student-a', answer('mine', '2026-10-01T12:00:00Z')) : ledger('student-b', answer('theirs', '2026-10-02T12:00:00Z')));
    const { result, rerender } = setup({ revalidateOnMount: true });
    await waitFor(() => expect(result.current.accountId).toBe('student-a'));
    mocks.resolution = { state: 'ready', scope: { actorId: 'actor-a', studentId: 'student-b' } };
    rerender({ window: 30 });
    expect(result.current.ledger).toBeNull();
    expect(result.current.asOf).toBeNull();
    await waitFor(() => expect(result.current.accountId).toBe('student-b'));
    expect(result.current.ledger?.answers.map((row) => row.attemptId)).toEqual(['theirs']);
  });
});
