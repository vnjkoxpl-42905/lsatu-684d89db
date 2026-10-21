// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { PracticeTestRun } from '@/lib/practiceTest';

const store = vi.hoisted(() => ({
  load: vi.fn(), pending: vi.fn(), save: vi.fn(), continueHere: vi.fn(),
}));
vi.mock('@/lib/practiceTestStore', () => ({
  loadAccountPracticeTestRun: store.load,
  readPendingPracticeTestBackup: store.pending,
  saveAccountPracticeTestRun: store.save,
  continueAccountPracticeTestHere: store.continueHere,
  getPracticeTestDeviceId: () => 'device-one',
  PracticeTestConflictError: class PracticeTestConflictError extends Error {},
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student-one' } }) }));
vi.mock('@/contexts/QuestionBankContext', () => ({ useQuestionBank: () => ({ isLoading: false }) }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ loading: false, has_drill_access: true }) }));
vi.mock('@/lib/questionLoader', () => ({ questionBank: { getQuestion: () => null } }));
vi.mock('@/lib/practiceTestRunner', () => ({ readLegResult: vi.fn(), findRcLegSession: vi.fn(), lrLegLaunch: vi.fn() }));
vi.mock('@/features/rc/api/rcProgress', () => ({ createSession: vi.fn() }));
vi.mock('@/lib/practiceTestReview', () => ({ loadPracticeTestReview: vi.fn().mockResolvedValue([]) }));

import PracticeTestRunPage from './PracticeTestRun';
import { PracticeTestConflictError } from '@/lib/practiceTestStore';

const fixture = (overrides: Partial<PracticeTestRun> = {}): PracticeTestRun => ({
  id: 'pt-one', userId: 'student-one', revision: 3, activeDeviceId: 'device-one',
  pt: 101, pace: 'standard', sectionSeconds: 2100,
  legs: [
    { kind: 'lr', section: 1, questionCount: 25, completedAt: '2026-09-01T00:00:00.000Z' },
    { kind: 'rc', section: 2, questionCount: 26, completedAt: '2026-09-01T00:00:00.000Z' },
    { kind: 'lr', section: 3, questionCount: 25 },
  ],
  currentLeg: 2, breakAfterLeg: 2, breakTaken: false,
  status: 'in-progress', createdAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

async function mount() {
  await act(async () => {
    render(<MemoryRouter initialEntries={['/testing/test/pt-one']}>
      <Routes><Route path="/testing/test/:runId" element={<PracticeTestRunPage />} /></Routes>
    </MemoryRouter>);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-01T00:00:00.000Z'));
  store.load.mockReset();
  store.pending.mockReset();
  store.save.mockReset();
  store.continueHere.mockReset();
  store.pending.mockReturnValue(null);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('account-acknowledged practice test breaks', () => {
  it('shows a paused device copy after an offline reload and waits for account recovery', async () => {
    const server = fixture({ breakStartedAt: '2026-09-01T00:00:00.000Z' });
    const backup = { ...server, breakRemainingSeconds: 420 };
    store.pending.mockReturnValue(backup);
    store.load.mockRejectedValueOnce(new Error('Account connection unavailable'))
      .mockResolvedValueOnce(server);

    await mount();
    expect(screen.getByRole('heading', { name: 'Practice test unavailable' })).toBeTruthy();
    expect(screen.getByText(/An unsynced copy is saved on this device/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Begin section 3' })).toBeNull();
    expect(store.save).not.toHaveBeenCalled();

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry loading account' })); });
    expect(store.load).toHaveBeenCalledTimes(2);
    expect(screen.getByText('7:00')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry saving break' })).toBeTruthy();
    expect(store.save).not.toHaveBeenCalled();
  });

  it('starts a failed break from the retry time, not from the offline wait', async () => {
    let server = fixture();
    store.load.mockImplementation(async () => server);
    store.save.mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(async (_userId: string, candidate: PracticeTestRun) => {
        server = { ...candidate, revision: 4 };
        return server;
      });

    await mount();
    expect(store.save).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('heading', { name: 'Break' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Save pending changes' })).toBeTruthy();

    act(() => { vi.advanceTimersByTime(5 * 60 * 1000); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save pending changes' })); });

    expect(store.save).toHaveBeenCalledTimes(2);
    expect(store.save.mock.calls[0][1].breakStartedAt).toBe('2026-09-01T00:00:00.000Z');
    expect(store.save.mock.calls[1][1].breakStartedAt).toBe('2026-09-01T00:05:00.000Z');
    expect(screen.getByText('10:00')).toBeTruthy();
  });

  it('freezes a failed break exit through another failed retry and a reload', async () => {
    let pending: PracticeTestRun | null = null;
    const server = fixture({ breakStartedAt: '2026-09-01T00:00:00.000Z' });
    store.load.mockImplementation(async () => server);
    store.pending.mockImplementation(() => pending);
    store.save.mockImplementation(async (_userId: string, _candidate: PracticeTestRun, backup: PracticeTestRun) => {
      pending = backup;
      throw new Error('offline');
    });

    await mount();
    act(() => { vi.setSystemTime(new Date('2026-09-01T00:02:00.000Z')); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Skip the break and continue' })); });

    expect(pending?.breakRemainingSeconds).toBe(480);
    expect(screen.getByText('8:00')).toBeTruthy();
    expect(screen.getByText(/break clock is paused/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Begin section 3' })).toBeNull();

    act(() => { vi.advanceTimersByTime(5 * 60 * 1000); });
    expect(screen.getByText('8:00')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry saving and continue' })); });
    expect(store.save).toHaveBeenCalledTimes(2);
    expect(store.save.mock.calls[1][2].breakRemainingSeconds).toBe(480);
    expect(screen.getByText('8:00')).toBeTruthy();

    cleanup();
    await mount();
    expect(screen.getByText('8:00')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Begin section 3' })).toBeNull();
  });

  it('freezes a failed heartbeat before Continue and resumes from the frozen time after retry', async () => {
    let server = fixture({ breakStartedAt: '2026-09-01T00:00:00.000Z' });
    store.load.mockImplementation(async () => server);
    store.save.mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(async (_userId: string, candidate: PracticeTestRun) => {
        const { breakRemainingSeconds: _backup, ...persisted } = candidate;
        server = { ...persisted, revision: 4 };
        return server;
      });

    await mount();
    await act(async () => { vi.advanceTimersByTime(15_000); });
    expect(store.save).toHaveBeenCalledTimes(1);
    expect(store.save.mock.calls[0][1].breakRemainingSeconds).toBeUndefined();
    expect(store.save.mock.calls[0][2].breakRemainingSeconds).toBe(585);
    expect(screen.getByText('9:45')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Skip the break and continue' })).toBeNull();

    act(() => { vi.advanceTimersByTime(5 * 60 * 1000); });
    expect(screen.getByText('9:45')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry saving break' })); });

    expect(store.save.mock.calls[1][1].breakStartedAt).toBe('2026-09-01T00:05:00.000Z');
    expect(screen.getByText('9:45')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Skip the break and continue' })).toBeTruthy();
  });

  it('keeps counting across two acknowledged heartbeats', async () => {
    let server = fixture({ breakStartedAt: '2026-09-01T00:00:00.000Z' });
    store.load.mockImplementation(async () => server);
    store.save.mockImplementation(async (_userId: string, candidate: PracticeTestRun) => {
      server = { ...candidate, revision: (candidate.revision ?? 0) + 1 };
      return server;
    });

    await mount();
    await act(async () => { vi.advanceTimersByTime(15_000); });
    expect(screen.getByText('9:45')).toBeTruthy();
    expect(store.save.mock.calls[0][1].breakRemainingSeconds).toBeUndefined();
    expect(store.save.mock.calls[0][2].breakRemainingSeconds).toBe(585);

    await act(async () => { vi.advanceTimersByTime(15_000); });
    expect(screen.getByText('9:30')).toBeTruthy();
    expect(store.save).toHaveBeenCalledTimes(2);
    expect(store.save.mock.calls[1][1].breakRemainingSeconds).toBeUndefined();
    expect(store.save.mock.calls[1][2].breakRemainingSeconds).toBe(570);
  });

  it('opens the next section only after the break exit is acknowledged', async () => {
    let server = fixture({ breakStartedAt: '2026-09-01T00:00:00.000Z' });
    store.load.mockImplementation(async () => server);
    store.save.mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(async (_userId: string, candidate: PracticeTestRun) => {
        server = { ...candidate, revision: 4 };
        return server;
      });

    await mount();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Skip the break and continue' })); });
    expect(screen.queryByRole('button', { name: 'Begin section 3' })).toBeNull();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry saving and continue' })); });
    expect(screen.getByRole('button', { name: 'Begin section 3' })).toBeTruthy();
    expect(store.save).toHaveBeenCalledTimes(2);
  });

  it('stops a stale device after a heartbeat conflicts with a takeover', async () => {
    const original = fixture({ breakStartedAt: '2026-09-01T00:00:00.000Z' });
    store.load.mockResolvedValueOnce(original).mockResolvedValueOnce({
      ...original, revision: 4, activeDeviceId: 'device-two',
    });
    store.save.mockRejectedValueOnce(new PracticeTestConflictError());

    await mount();
    await act(async () => { vi.advanceTimersByTime(15_000); });

    expect(store.save).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/open on another device/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry saving break' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Skip the break and continue' })).toBeNull();
  });
});
