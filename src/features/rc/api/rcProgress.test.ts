import { beforeEach, expect, it, vi } from 'vitest';
import type { RcDrillConfig } from '../lib/rcTypes';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRcHighlights } from '../hooks/useRcHighlights';
import { useRcFlagPersistence } from '../hooks/useRcFlagPersistence';

const owner = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const attemptId = '33333333-3333-4333-8333-333333333333';

const { insert, update, clock, getUser, personalList, annotations, upsert, deviceActive } = vi.hoisted(() => ({
  insert: vi.fn(), update: vi.fn(), getUser: vi.fn(), upsert: vi.fn(),
  annotations: { rows: [] as Record<string, unknown>[], filters: vi.fn(), error: null as { message: string } | null },
  clock: { config: {} as Partial<RcDrillConfig>, status: 'in_progress' },
  deviceActive: vi.fn(),
  personalList: { rows: [] as Record<string, unknown>[], filters: vi.fn() },
}));
vi.mock('@/lib/practiceTestStore', () => ({ isActivePracticeTestDevice: deviceActive }));

vi.mock('./rcSupabase.types', () => ({
  RC_SESSIONS_TABLE: 'rc_drill_sessions',
  RC_ATTEMPTS_TABLE: 'rc_attempts',
  RC_ANNOTATIONS_TABLE: 'rc_annotations',
  rcDb: {
    auth: { getUser },
    from: (_table: string) => _table === 'rc_annotations' ? {
      select: () => ({ eq: (column: string, value: string) => {
        annotations.filters(column, value);
        return { in: async () => ({ data: annotations.rows, error: annotations.error }) };
      } }),
      upsert,
    } : ({
      select: () => ({
        order: async () => ({ data: personalList.rows, error: null }),
        eq: (column: string, value: string) => column === 'user_id' ? {
          order: async () => {
            personalList.filters(column, value);
            return { data: personalList.rows.filter(row => row[column] === value), error: null };
          },
        } : ({
          eq: () => ({ maybeSingle: async () => ({ data: {
            id: attemptId, session_id: sessionId, user_id: owner, question_id: 7,
            passage_id: 3, selected: 'C', is_correct: true, time_ms: 1000,
            flagged: false, eliminations: [], is_first_attempt: true,
            created_at: '2026-09-28T00:00:00Z',
          }, error: null }) }),
          maybeSingle: async () => ({ data: {
            id: sessionId, user_id: owner, config: { ...clock.config }, passage_ids: [3],
            status: clock.status, excluded_from_analytics: false,
            started_at: '2026-09-28T00:00:00Z', completed_at: null,
          }, error: null }),
        }),
      }),
      insert,
      update,
    }),
  },
}));

import { createSession, getSession, listSessions, recordAttempt, saveSessionClock, loadAnnotations, saveAnnotationsNow, setAttemptFlag } from './rcProgress';

beforeEach(() => {
  localStorage.clear();
  getUser.mockReset().mockResolvedValue({ data: { user: { id: owner } } });
  clock.config = { reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 100 }, source: 'manual' };
  clock.status = 'in_progress';
  deviceActive.mockReset().mockResolvedValue(true);
  insert.mockClear();
  personalList.filters.mockClear();
  personalList.rows = [];
  annotations.rows = [];
  annotations.error = null;
  annotations.filters.mockClear();
  upsert.mockReset().mockImplementation((payload) => ({ select: () => ({ single: async () => ({ data: payload, error: null }) }) }));
  update.mockReset().mockImplementation((changes: { config: RcDrillConfig }) => {
    const query = {
      eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => {
        clock.config = changes.config;
        return { data: { id: sessionId }, error: null };
      }),
    };
    return query;
  });
});

it('shows only the signed-in admin own drills when RLS also grants access to student sessions', async () => {
  const row = {
    id: sessionId, user_id: owner, config: { ...clock.config }, passage_ids: [3],
    status: 'completed', excluded_from_analytics: false,
    started_at: '2026-09-28T00:00:00Z', completed_at: '2026-09-28T01:00:00Z',
  };
  personalList.rows = [row, { ...row, id: 'student-drill', user_id: 'student-owner' }];
  const sessions = await listSessions();
  expect(sessions.map(session => session.id)).toEqual([sessionId]);
  expect(personalList.filters).toHaveBeenCalledWith('user_id', owner);
});

it('acknowledges an attempt already saved under the retry UUID without inserting another row', async () => {
  const saved = await recordAttempt({
    id: attemptId, sessionId, questionId: 7, passageId: 3, selected: 'C',
    isCorrect: true, timeMs: 1000, flagged: false, eliminations: [], isFirstAttempt: true,
  });
  expect(saved.id).toBe(attemptId);
  expect(saved.isFirstAttempt).toBe(true);
  expect(insert).not.toHaveBeenCalled();
});

it('acknowledges clock and question position together while preserving older session settings', async () => {
  await saveSessionClock(sessionId, 19.9, 2);
  expect(clock.config).toEqual(expect.objectContaining({
    reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 100 },
    clockElapsedSeconds: 19, currentQuestionIndex: 2,
  }));
  const query = update.mock.results[0].value;
  expect(query.eq).toHaveBeenCalledWith('user_id', owner);
  expect(query.eq).toHaveBeenCalledWith('status', 'in_progress');
});

it('keeps the acknowledged question position during a later clock-only heartbeat', async () => {
  clock.config.currentQuestionIndex = 2;
  clock.config.clockElapsedSeconds = 20;
  await saveSessionClock(sessionId, 19);
  expect(clock.config.currentQuestionIndex).toBe(2);
  expect(clock.config.clockElapsedSeconds).toBe(20);
});

it('serializes clock heartbeats behind navigation so a stale config cannot overwrite its position', async () => {
  let acknowledge!: () => void;
  update.mockImplementationOnce((changes: { config: RcDrillConfig }) => {
    const query = {
      eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => new Promise((resolve) => {
        acknowledge = () => {
          clock.config = changes.config;
          resolve({ data: { id: sessionId }, error: null });
        };
      })),
    };
    return query;
  });
  const navigation = saveSessionClock(sessionId, 19, 2);
  const heartbeat = saveSessionClock(sessionId, 20);
  await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  acknowledge();
  await Promise.all([navigation, heartbeat]);
  expect(update).toHaveBeenCalledTimes(2);
  expect(clock.config.currentQuestionIndex).toBe(2);
  expect(clock.config.clockElapsedSeconds).toBe(20);
});

it('rejects an unacknowledged save and lets the next deliberate retry succeed', async () => {
  update.mockImplementationOnce(() => ({
    eq() { return this; }, select() { return this; },
    maybeSingle: async () => ({ data: null, error: new Error('offline') }),
  }));
  await expect(saveSessionClock(sessionId, 19, 2)).rejects.toThrow('offline');
  expect(clock.config.currentQuestionIndex).toBeUndefined();
  await saveSessionClock(sessionId, 19, 2);
  expect(clock.config.currentQuestionIndex).toBe(2);
});

it('rejects invalid question positions before writing', async () => {
  await expect(saveSessionClock(sessionId, 19, -1)).rejects.toThrow('question position');
  expect(update).not.toHaveBeenCalled();
});

it('inserts the stable client launch UUID and verifies its account acknowledgement', async () => {
  insert.mockImplementationOnce((payload) => ({ select: () => ({ single: async () => ({ data: { ...payload, status: 'in_progress', started_at: '2026-10-02T00:00:00Z' }, error: null }) }) }));
  const saved = await createSession(clock.config as RcDrillConfig, [3], { id: sessionId, actorId: owner });
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ id: sessionId, user_id: owner, passage_ids: [3] }));
  expect(saved.id).toBe(sessionId);
});
it('rejects an actor switch before inserting a launch', async () => {
  getUser.mockResolvedValueOnce({ data: { user: { id: owner } } }).mockResolvedValueOnce({ data: { user: { id: 'another-owner' } } });
  await expect(createSession(clock.config as RcDrillConfig, [3], { id: sessionId, actorId: owner })).rejects.toThrow('account changed');
  expect(insert).not.toHaveBeenCalled();
});
it('rejects an actor switch while the insert acknowledgement is pending', async () => {
  insert.mockImplementationOnce((payload) => ({ select: () => ({ single: async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'another-owner' } } });
    return { data: { ...payload, status: 'in_progress' }, error: null };
  } }) }));
  await expect(createSession(clock.config as RcDrillConfig, [3], { id: sessionId, actorId: owner })).rejects.toThrow('account changed');
});
it('rejects an exact-session lookup after an actor change', async () => {
  getUser.mockResolvedValueOnce({ data: { user: { id: owner } } }).mockResolvedValueOnce({ data: { user: { id: 'another-owner' } } });
  await expect(getSession(sessionId, owner)).rejects.toThrow('account changed');
});

it('explicitly filters admin annotation reads and never hydrates a foreign row', async () => {
  annotations.rows = [
    { user_id: owner, passage_id: 3, highlights: [{ target: 'passage', start: 0, end: 3, color: 'yellow' }] },
    { user_id: 'student-owner', passage_id: 3, highlights: [{ target: 'passage', start: 50, end: 60, color: 'pink' }] },
  ];
  const marks = await loadAnnotations([3], owner);
  expect(annotations.filters).toHaveBeenCalledWith('user_id', owner);
  expect(marks.get(3)?.[0].start).toBe(0);
});

it('rejects annotation hydration if the account changes during the read', async () => {
  getUser.mockResolvedValueOnce({ data: { user: { id: owner } } }).mockResolvedValueOnce({ data: { user: { id: 'other' } } });
  await expect(loadAnnotations([3], owner)).rejects.toThrow('account changed');
});

it('retains an annotation read failure instead of turning it into an empty success', async () => {
  annotations.error = { message: 'offline' };
  await expect(loadAnnotations([3], owner)).rejects.toThrow('offline');
});

it('rejects a queued annotation edit from another account before writing', async () => {
  await expect(saveAnnotationsNow(3, [], 'original-owner')).rejects.toThrow('account changed');
  expect(upsert).not.toHaveBeenCalled();
});

it('requires an exact owner, passage and payload acknowledgement for marks', async () => {
  upsert.mockImplementationOnce(() => ({ select: () => ({ single: async () => ({ data: { user_id: owner, passage_id: 99, highlights: [] }, error: null }) }) }));
  await expect(saveAnnotationsNow(3, [], owner)).rejects.toThrow('could not be acknowledged');
  await expect(saveAnnotationsNow(3, [], owner)).resolves.toBeUndefined();
  expect(upsert).toHaveBeenLastCalledWith(expect.objectContaining({ user_id: owner, passage_id: 3, highlights: [] }), { onConflict: 'user_id,passage_id' });
});

it('rejects a mark acknowledgement after an account switch', async () => {
  getUser.mockResolvedValueOnce({ data: { user: { id: owner } } }).mockResolvedValueOnce({ data: { user: { id: 'other' } } });
  await expect(saveAnnotationsNow(3, [], owner)).rejects.toThrow('account changed');
});

it('accepts matching JSONB highlights regardless of object property order', async () => {
  upsert.mockImplementationOnce(() => ({ select: () => ({ single: async () => ({ data: { user_id: owner, passage_id: 3, highlights: [{ color: 'yellow', end: 10, start: 0, target: 'passage' }] }, error: null }) }) }));
  await expect(saveAnnotationsNow(3, [{ target: 'passage', start: 0, end: 10, color: 'yellow' }], owner)).resolves.toBeUndefined();
});

it('requires stored flag acknowledgement and filters the original owner', async () => {
  update.mockImplementationOnce(() => {
    const query = { eq: vi.fn().mockReturnThis(), select: vi.fn(async () => ({ data: [{ id: attemptId, user_id: owner, flagged: true }], error: null })) };
    return query;
  });
  await setAttemptFlag(sessionId, 7, true, owner);
  expect(update.mock.results[0].value.eq).toHaveBeenCalledWith('user_id', owner);
});

it('rejects a flag save without an acknowledged row', async () => {
  update.mockImplementationOnce(() => {
    const query = { eq: vi.fn().mockReturnThis(), select: vi.fn(async () => ({ data: [], error: null })) };
    return query;
  });
  await expect(setAttemptFlag(sessionId, 7, true, owner)).rejects.toThrow('could not be acknowledged');
});

it('preserves protected source flags', async () => {
  clock.config.timedSectionSittingId = 'protected';
  clock.status = 'completed';
  await expect(setAttemptFlag(sessionId, 7, true, owner)).rejects.toThrow('protected source');
  expect(update).not.toHaveBeenCalled();
});

it('allows active practice-test flags only on the authorized device', async () => {
  clock.config.practiceTestRunId = 'active-run';
  update.mockImplementationOnce((payload: { flagged: boolean }) => ({
    eq() { return this; }, select: async () => ({ data: [{ id: attemptId, user_id: owner, flagged: payload.flagged }], error: null }),
  }));
  await expect(setAttemptFlag(sessionId, 7, true, owner)).resolves.toBeUndefined();
  expect(deviceActive).toHaveBeenCalledWith(owner, 'active-run');
  expect(update).toHaveBeenCalledWith({ flagged: true });
});

it('rejects active practice-test flags after device authorization is revoked', async () => {
  clock.config.practiceTestRunId = 'active-run';
  deviceActive.mockResolvedValue(false);
  await expect(setAttemptFlag(sessionId, 7, true, owner)).rejects.toThrow('active on another device');
  expect(update).not.toHaveBeenCalled();
});

it('rejects completed practice-test source flag changes before writing', async () => {
  clock.config.practiceTestRunId = 'finished-run';
  clock.status = 'completed';
  await expect(setAttemptFlag(sessionId, 7, false, owner)).rejects.toThrow('protected source');
  expect(update).not.toHaveBeenCalled();
});

it('serializes annotation writes across hook unmount and remount for the same owner and passage', async () => {
  let acknowledgeOld!: () => void;
  upsert.mockImplementationOnce((payload) => ({ select: () => ({ single: () => new Promise((resolve) => {
    acknowledgeOld = () => resolve({ data: payload, error: null });
  }) }) }));
  const old = renderHook(() => useRcHighlights([3], owner));
  await waitFor(() => expect(old.result.current.loaded).toBe(true));
  act(() => old.result.current.add(3, 'passage', 0, 10));
  await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1), { timeout: 2000 });
  old.unmount();
  const next = renderHook(() => useRcHighlights([3], owner));
  await waitFor(() => expect(next.result.current.loaded).toBe(true));
  act(() => next.result.current.add(3, 'passage', 20, 30));
  // Mature the new hook's debounce while the original write is unresolved.
  await act(async () => new Promise((resolve) => setTimeout(resolve, 1100)));
  expect(upsert).toHaveBeenCalledTimes(1);
  await act(async () => acknowledgeOld());
  await waitFor(() => expect(next.result.current.statusForPassage(3)).toBe('saved'));
  expect(upsert).toHaveBeenCalledTimes(2);
  expect(upsert.mock.calls[1][0].highlights).toHaveLength(2);
});

it('serializes flag writes across hook unmount and remount for the same owner/session/question', async () => {
  let acknowledgeOld!: () => void;
  update.mockImplementation((payload: { flagged: boolean }) => ({
    eq() { return this; },
    select: async () => ({ data: [{ id: attemptId, user_id: owner, flagged: payload.flagged }], error: null }),
  }));
  update.mockImplementationOnce((payload: { flagged: boolean }) => ({
    eq() { return this; },
    select: () => new Promise((resolve) => { acknowledgeOld = () => resolve({ data: [{ id: attemptId, user_id: owner, flagged: payload.flagged }], error: null }); }),
  }));
  const options = { actorId: owner, sessionId, enabled: true, recordedQuestionIds: [7] };
  const old = renderHook(() => useRcFlagPersistence(options));
  act(() => old.result.current.setFlag(7, true));
  await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  old.unmount();
  const next = renderHook(() => useRcFlagPersistence(options));
  act(() => next.result.current.setFlag(7, false));
  await act(async () => Promise.resolve());
  expect(update).toHaveBeenCalledTimes(1);
  await act(async () => acknowledgeOld());
  await waitFor(() => expect(next.result.current.statusForQuestion(7)).toBe('saved'));
  expect(update).toHaveBeenCalledTimes(2);
  expect(update).toHaveBeenLastCalledWith({ flagged: false });
});

it('keeps a remounted annotation A/B/A intent recoverable after both older replies arrive', async () => {
  let acknowledgeOld!: () => void;
  upsert.mockImplementationOnce((payload) => ({ select: () => ({ single: () => new Promise((resolve) => {
    acknowledgeOld = () => resolve({ data: payload, error: null });
  }) }) }));
  const old = renderHook(() => useRcHighlights([3], owner));
  await waitFor(() => expect(old.result.current.loaded).toBe(true));
  act(() => old.result.current.add(3, 'passage', 0, 10));
  await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1), { timeout: 2000 });
  const originalToken = JSON.parse(localStorage.getItem(`rc:annotations:pending:${owner}:3`)!).intentId;
  old.unmount();
  const next = renderHook(() => useRcHighlights([3], owner));
  await waitFor(() => expect(next.result.current.loaded).toBe(true));
  act(() => next.result.current.removeRange(3, 'passage', 0, 10));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 1100)));
  act(() => next.result.current.add(3, 'passage', 0, 10));
  const finalToken = JSON.parse(localStorage.getItem(`rc:annotations:pending:${owner}:3`)!).intentId;
  expect(finalToken).not.toBe(originalToken);
  next.unmount();
  await act(async () => acknowledgeOld());
  await waitFor(() => expect(upsert).toHaveBeenCalledTimes(2));
  const recovery = JSON.parse(localStorage.getItem(`rc:annotations:pending:${owner}:3`)!);
  expect(recovery.intentId).toBe(finalToken);
  expect(recovery.highlights).toHaveLength(1);
  const final = renderHook(() => useRcHighlights([3], owner));
  await waitFor(() => expect(final.result.current.loaded).toBe(true));
  expect(final.result.current.statusForPassage(3)).toBe('recovered');
  expect(final.result.current.forPassage(3)).toHaveLength(1);
});

it('keeps a remounted flag true/false/true intent recoverable after older replies', async () => {
  let acknowledgeOld!: () => void;
  update.mockImplementation((payload: { flagged: boolean }) => ({
    eq() { return this; }, select: async () => ({ data: [{ id: attemptId, user_id: owner, flagged: payload.flagged }], error: null }),
  }));
  update.mockImplementationOnce((payload: { flagged: boolean }) => ({
    eq() { return this; }, select: () => new Promise((resolve) => { acknowledgeOld = () => resolve({ data: [{ id: attemptId, user_id: owner, flagged: payload.flagged }], error: null }); }),
  }));
  const options = { actorId: owner, sessionId, enabled: true, recordedQuestionIds: [7] };
  const old = renderHook(() => useRcFlagPersistence(options));
  act(() => old.result.current.setFlag(7, true));
  await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  const key = `rc:flags:pending:${owner}:${sessionId}:7`;
  const originalToken = JSON.parse(localStorage.getItem(key)!).intentId;
  old.unmount();
  const next = renderHook(() => useRcFlagPersistence(options));
  act(() => next.result.current.setFlag(7, false));
  await act(async () => Promise.resolve());
  act(() => next.result.current.setFlag(7, true));
  const finalToken = JSON.parse(localStorage.getItem(key)!).intentId;
  expect(finalToken).not.toBe(originalToken);
  next.unmount();
  await act(async () => acknowledgeOld());
  await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
  expect(update).toHaveBeenLastCalledWith({ flagged: false });
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ flagged: true, intentId: finalToken });
  const final = renderHook(() => useRcFlagPersistence(options));
  expect(final.result.current.pendingFlags.get(7)).toBe(true);
  expect(final.result.current.statusForQuestion(7)).toBe('recovered');
});
