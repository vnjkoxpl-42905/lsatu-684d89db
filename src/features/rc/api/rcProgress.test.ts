import { beforeEach, expect, it, vi } from 'vitest';
import type { RcDrillConfig } from '../lib/rcTypes';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRcHighlights } from '../hooks/useRcHighlights';
import { useRcFlagPersistence } from '../hooks/useRcFlagPersistence';

const owner = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const attemptId = '33333333-3333-4333-8333-333333333333';

const { insert, update, clock, getUser, personalList, historyStore, annotations, upsert, deviceActive } = vi.hoisted(() => ({
  insert: vi.fn(), update: vi.fn(), getUser: vi.fn(), upsert: vi.fn(),
  annotations: { rows: [] as Record<string, unknown>[], filters: vi.fn(), error: null as { message: string } | null },
  clock: { config: {} as Partial<RcDrillConfig>, status: 'in_progress' },
  deviceActive: vi.fn(),
  personalList: { rows: [] as Record<string, unknown>[], filters: vi.fn() },
  historyStore: {
    sessions: [] as Record<string, unknown>[],
    parents: [] as Record<string, unknown>[],
    attempts: [] as Record<string, unknown>[],
    bypassEqFilter: false,
    sessionFilters: vi.fn(),
    attemptFilters: vi.fn(),
    sessionOrders: [] as Array<{ column: string; ascending?: boolean }>,
    attemptOrders: [] as Array<{ column: string; ascending?: boolean }>,
    sessionRanges: [] as Array<[number, number]>,
    attemptRanges: [] as Array<[number, number]>,
  },
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
          order: (orderCol: string, opts?: { ascending?: boolean }) => {
            const isAttempts = _table === 'rc_attempts';
            const orders = isAttempts ? historyStore.attemptOrders : historyStore.sessionOrders;
            orders.push({ column: orderCol, ascending: opts?.ascending });
            if (isAttempts) {
              historyStore.attemptFilters(column, value);
            } else {
              personalList.filters(column, value);
              historyStore.sessionFilters(column, value);
            }
            const firstOrderResult = {
              then: (onFulfilled?: (val: { data: Record<string, unknown>[]; error: null }) => unknown, onRejected?: (err: unknown) => unknown) =>
                Promise.resolve({
                  data: personalList.rows.filter(row => row[column] === value),
                  error: null,
                }).then(onFulfilled, onRejected),
              order: (secondCol: string, secondOpts?: { ascending?: boolean }) => {
                orders.push({ column: secondCol, ascending: secondOpts?.ascending });
                return {
                  range: async (from: number, to: number) => {
                    const ranges = isAttempts ? historyStore.attemptRanges : historyStore.sessionRanges;
                    ranges.push([from, to]);
                    const sourceRows = isAttempts
                      ? historyStore.attempts
                      : _table === 'practice_test_runs' ? historyStore.parents : (historyStore.sessions.length > 0 ? historyStore.sessions : personalList.rows);
                    const filtered = historyStore.bypassEqFilter
                      ? [...sourceRows]
                      : sourceRows.filter(row => row[column] === value);
                    filtered.sort((a, b) => {
                      const av1 = String(a[orderCol] ?? '');
                      const bv1 = String(b[orderCol] ?? '');
                      if (av1 !== bv1) return av1.localeCompare(bv1);
                      const av2 = String(a[secondCol] ?? '');
                      const bv2 = String(b[secondCol] ?? '');
                      return av2.localeCompare(bv2);
                    });
                    return { data: filtered.slice(from, to + 1), error: null };
                  },
                };
              },
            };
            return firstOrderResult;
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

import { abandonSession, createSession, getQuestionHistory, getRcHistorySnapshot, getSession, listSessions, recordAttempt, saveSessionClock, loadAnnotations, saveAnnotationsNow, setAttemptFlag } from './rcProgress';

beforeEach(() => {
  localStorage.clear();
  getUser.mockReset().mockResolvedValue({ data: { user: { id: owner } } });
  clock.config = { reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 100 }, source: 'manual' };
  clock.status = 'in_progress';
  deviceActive.mockReset().mockResolvedValue(true);
  insert.mockClear();
  personalList.filters.mockClear();
  personalList.rows = [];
  historyStore.sessions = [];
  historyStore.parents = [];
  historyStore.attempts = [];
  historyStore.bypassEqFilter = false;
  historyStore.sessionFilters.mockClear();
  historyStore.attemptFilters.mockClear();
  historyStore.sessionOrders = [];
  historyStore.attemptOrders = [];
  historyStore.sessionRanges = [];
  historyStore.attemptRanges = [];
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

it('preserves exposure and completed state while withholding unrevealed correctness from display history', async () => {
  historyStore.sessions = [{ id: sessionId, user_id: owner, status: 'completed', excluded_from_analytics: false, config: { ...clock.config } }];
  historyStore.attempts = [{ id: attemptId, user_id: owner, session_id: sessionId, question_id: 7, selected: 'C', is_correct: false, is_first_attempt: true, created_at: '2026-10-17T10:00:00Z' }];
  const snapshot = await getRcHistorySnapshot(owner);
  expect(snapshot.hasHiddenGradedResults).toBe(true);
  expect(snapshot.history.get(7)).toMatchObject({ firstTakeCorrect: false, everIncorrect: true });
  expect(snapshot.displayHistory.get(7)).toMatchObject({ attempts: 1, answered: true, completedAnswered: true, firstTakeCorrect: null, everIncorrect: false });
  expect((await getQuestionHistory(owner, { correctness: 'released-only' })).get(7)?.firstTakeCorrect).toBeNull();
  historyStore.sessions[0].config = { ...clock.config, resultsRevealedAt: '2026-10-17T11:00:00Z' };
  expect((await getRcHistorySnapshot(owner)).hasHiddenGradedResults).toBe(false);
  expect((await getQuestionHistory(owner, { correctness: 'released-only' })).get(7)?.firstTakeCorrect).toBe(false);
});

it.each(['config', 'column'])('keeps full-test correctness hidden despite an ordinary reveal marker (%s parent identity)', async location => {
  historyStore.sessions = [{ id: sessionId, user_id: owner, status: 'completed', excluded_from_analytics: false,
    ...(location === 'column' ? { practice_test_run_id: 'parent-exam' } : {}),
    config: { ...clock.config, resultsRevealedAt: '2026-10-17T11:00:00Z', ...(location === 'config' ? { practiceTestRunId: 'parent-exam' } : {}) } }];
  historyStore.attempts = [{ id: attemptId, user_id: owner, session_id: sessionId, question_id: 7, selected: 'C', is_correct: false, is_first_attempt: true, created_at: '2026-10-17T10:00:00Z' }];
  const snapshot = await getRcHistorySnapshot(owner);
  expect(snapshot.hasHiddenGradedResults).toBe(true);
  expect(snapshot.history.get(7)).toMatchObject({ firstTakeCorrect: false, everIncorrect: true });
  expect(snapshot.displayHistory.get(7)).toMatchObject({ attempts: 1, answered: true, firstTakeCorrect: null, everIncorrect: false });
});

it('keeps the earliest first take within a sitting while a different later sitting still updates recent performance', async () => {
  historyStore.sessions = [{ id: sessionId, user_id: owner, status: 'completed', excluded_from_analytics: false },
    { id: 'later-sitting', user_id: owner, status: 'completed', excluded_from_analytics: false }];
  const original = { id: 'original', user_id: owner, session_id: sessionId, question_id: 7, selected: 'B', is_correct: false, is_first_attempt: true, created_at: '2026-10-17T10:00:00Z' };
  historyStore.attempts = [original, { ...original, id: 'duplicate-first', selected: 'C', is_correct: true, created_at: '2026-10-17T10:01:00Z' }];
  expect((await getQuestionHistory(owner)).get(7)).toMatchObject({ attempts: 1, firstEverCorrect: false, firstTakeCorrect: false, incorrectCount: 1 });
  historyStore.attempts.push({ ...original, id: 'later-first', session_id: 'later-sitting', selected: 'C', is_correct: true, created_at: '2026-10-17T11:00:00Z' });
  expect((await getQuestionHistory(owner)).get(7)).toMatchObject({ attempts: 2, firstEverCorrect: false, firstTakeCorrect: true, incorrectCount: 1, lastGradedAt: '2026-10-17T11:00:00Z' });
});

it('retries a concurrent config change without overwriting acknowledged learning metadata', async () => {
  const original = update.getMockImplementation()!;
  update.mockImplementationOnce(() => ({ eq() { return this; }, select() { return this; }, async maybeSingle() {
    clock.config = { ...clock.config, learning: [{ id: 'reflection-one' }] } as RcDrillConfig;
    return { data: null, error: null };
  } })).mockImplementation(original);
  await saveSessionClock(sessionId, 19, 1);
  expect(clock.config).toMatchObject({ learning: [{ id: 'reflection-one' }], clockElapsedSeconds: 19, currentQuestionIndex: 1 });
  expect(update).toHaveBeenCalledTimes(2);
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

it('refuses an answer retry belonging to another signed-in account before inserting', async () => {
  await expect(recordAttempt({ id: attemptId, userId: 'another-owner', sessionId, questionId: 7, passageId: 3,
    selected: 'C', isCorrect: true, timeMs: 1000, flagged: false, eliminations: [], isFirstAttempt: false,
  })).rejects.toThrow('account changed');
  expect(insert).not.toHaveBeenCalled();
});

it('refuses reanswers to a completed protected source section', async () => {
  clock.status = 'completed';
  clock.config = { ...clock.config, timedSectionSittingId: 'protected-sitting' };
  await expect(recordAttempt({ id: attemptId, userId: owner, sessionId, questionId: 7, passageId: 3,
    selected: 'C', isCorrect: true, timeMs: 1000, flagged: false, eliminations: [], isFirstAttempt: false,
  })).rejects.toThrow('protected source section');
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

it('discards a drill in progress by marking it abandoned, scoped to the owner and the in-progress state', async () => {
  await abandonSession(sessionId);
  expect(update).toHaveBeenCalledTimes(1);
  expect(update.mock.calls[0][0]).toEqual({ status: 'abandoned' });
  const query = update.mock.results[0].value;
  expect(query.eq).toHaveBeenCalledWith('id', sessionId);
  expect(query.eq).toHaveBeenCalledWith('user_id', owner);
  expect(query.eq).toHaveBeenCalledWith('status', 'in_progress');
});

it('refuses to discard a finished drill or a protected section and writes nothing', async () => {
  clock.status = 'completed';
  await expect(abandonSession(sessionId)).rejects.toThrow('Only a drill in progress can be discarded.');
  clock.status = 'in_progress';
  clock.config = { ...clock.config, timedSectionSittingId: 'sitting-1' };
  await expect(abandonSession(sessionId)).rejects.toThrow('A protected section cannot be discarded here.');
  expect(update).not.toHaveBeenCalled();
});

it('keeps the acknowledged question position during a later clock-only heartbeat', async () => {
  clock.config.currentQuestionIndex = 2;
  clock.config.clockElapsedSeconds = 20;
  await saveSessionClock(sessionId, 19);
  expect(clock.config.currentQuestionIndex).toBe(2);
  expect(clock.config.clockElapsedSeconds).toBe(20);
});

const draft = { questionId: 7, selected: 'B' as const, attemptId, timeMs: 1500, flagged: true, eliminations: ['C' as const] };

it('serializes account drafts with the clock and preserves them through a queued heartbeat without scoring', async () => {
  let acknowledge!: () => void;
  update.mockImplementationOnce((changes: { config: RcDrillConfig }) => ({
    eq() { return this; }, select() { return this; },
    maybeSingle: () => new Promise((resolve) => {
      acknowledge = () => { clock.config = changes.config; resolve({ data: { id: sessionId }, error: null }); };
    }),
  }));
  const exit = saveSessionClock(sessionId, 19, 1, { actorId: owner, answers: [draft] });
  const heartbeat = saveSessionClock(sessionId, 20);
  await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  acknowledge();
  await Promise.all([exit, heartbeat]);
  expect(clock.config).toMatchObject({ draftAnswers: [draft], currentQuestionIndex: 1, clockElapsedSeconds: 20 });
  expect(insert).not.toHaveBeenCalled();
  await saveSessionClock(sessionId, 21, 1, { actorId: owner, answers: [] });
  expect(clock.config.draftAnswers).toEqual([]);
});

it('validates persisted draft entries on read and rejects invalid snapshots before writing', async () => {
  clock.config.draftAnswers = [draft, { ...draft, questionId: 8, selected: 'Z' }] as RcDrillConfig['draftAnswers'];
  expect((await getSession(sessionId))?.config.draftAnswers).toEqual([draft]);
  await expect(saveSessionClock(sessionId, 20, 1, { actorId: owner, answers: [{ ...draft, attemptId: 'invalid' }] })).rejects.toThrow('drafts');
  await expect(saveSessionClock(sessionId, 20, 1, { actorId: owner, answers: [draft, draft] })).rejects.toThrow('drafts');
  await expect(saveSessionClock(sessionId, 20, 1, { actorId: owner, answers: [{ ...draft, timeMs: -1 }] })).rejects.toThrow('drafts');
  expect(update).not.toHaveBeenCalled();
});

it('rejects draft saves for another actor or a session that is no longer active', async () => {
  await expect(saveSessionClock(sessionId, 20, 1, { actorId: 'other-actor', answers: [draft] })).rejects.toThrow('account changed');
  clock.status = 'completed';
  await expect(saveSessionClock(sessionId, 20, 1, { actorId: owner, answers: [draft] })).rejects.toThrow('no longer available');
  expect(update).not.toHaveBeenCalled();
});

it.each(['timedSectionSittingId', 'practiceTestRunId'] as const)('rejects draft snapshots for protected %s sessions', async (key) => {
  clock.config[key] = 'protected';
  await expect(saveSessionClock(sessionId, 20, 1, { actorId: owner, answers: [draft] })).rejects.toThrow('drafts');
  expect(update).not.toHaveBeenCalled();
});

it('requires a matching active row acknowledgement for drafts and can retry the same intent after rejection', async () => {
  update.mockImplementationOnce(() => ({ eq() { return this; }, select() { return this; }, maybeSingle: async () => ({ data: null, error: null }) }));
  await expect(saveSessionClock(sessionId, 20, 1, { actorId: owner, answers: [draft] })).rejects.toThrow('did not reach');
  expect(clock.config.draftAnswers).toBeUndefined();
  await saveSessionClock(sessionId, 20, 1, { actorId: owner, answers: [draft] });
  expect(clock.config.draftAnswers).toEqual([draft]);
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
it('does not carry another session draft answers into a newly created drill', async () => {
  insert.mockImplementationOnce((payload) => ({ select: () => ({ single: async () => ({ data: { ...payload, status: 'in_progress', started_at: '2026-10-02T00:00:00Z' }, error: null }) }) }));
  const saved = await createSession({ ...clock.config, draftAnswers: [draft], resultsRevealedAt: '2026-10-17T10:00:00Z', learningRecords: [{ id: 'old-reflection' }] } as RcDrillConfig, [3]);
  expect(insert.mock.calls.at(-1)[0].config.draftAnswers).toBeUndefined();
  expect(saved.config.draftAnswers).toBeUndefined();
  expect(insert.mock.calls.at(-1)[0].config.learningRecords).toBeUndefined();
  expect(saved.config.resultsRevealedAt).toBeUndefined();
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

it('ignores attempts from sessions with excluded_from_analytics = true', async () => {
  historyStore.sessions = [
    {
      id: 'session-excluded',
      user_id: owner,
      status: 'completed',
      excluded_from_analytics: true,
      started_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'session-included',
      user_id: owner,
      status: 'completed',
      excluded_from_analytics: false,
      started_at: '2026-10-02T00:00:00Z',
    },
  ];
  historyStore.attempts = [
    {
      id: 'att-excluded',
      session_id: 'session-excluded',
      user_id: owner,
      question_id: 101,
      passage_id: 10,
      selected: 'A',
      is_correct: false,
      is_first_attempt: true,
      created_at: '2026-10-01T00:01:00Z',
    },
    {
      id: 'att-included',
      session_id: 'session-included',
      user_id: owner,
      question_id: 102,
      passage_id: 10,
      selected: 'B',
      is_correct: true,
      is_first_attempt: true,
      created_at: '2026-10-02T00:01:00Z',
    },
  ];
  const history = await getQuestionHistory();
  expect(history.has(101)).toBe(false);
  expect(history.get(102)).toMatchObject({
    questionId: 102,
    attempts: 1,
    answered: true,
    firstTakeCorrect: true,
    everIncorrect: false,
    lastFirstTakeIncorrect: false,
  });
});

it.each([null, false])('treats skipped rows with selected null and is_correct %s as unanswered exposure, never graded', async correctness => {
  historyStore.sessions = [
    {
      id: 'session-completed',
      user_id: owner,
      status: 'completed',
      excluded_from_analytics: false,
      started_at: '2026-10-01T00:00:00Z',
    },
  ];
  historyStore.attempts = [
    {
      id: 'att-skipped',
      session_id: 'session-completed',
      user_id: owner,
      question_id: 201,
      passage_id: 20,
      selected: null,
      is_correct: correctness,
      is_first_attempt: true,
      created_at: '2026-10-01T00:01:00Z',
    },
  ];
  const history = await getQuestionHistory();
  const entry = history.get(201);
  expect(entry).toBeDefined();
  expect(entry).toMatchObject({
    questionId: 201,
    attempts: 1,
    answered: false,
    firstTakeCorrect: null,
    unansweredOnFirstTake: true,
    everCorrect: false,
    everIncorrect: false,
    incorrectOnLastTake: false,
    lastFirstTakeIncorrect: false,
    completedAnswered: false,
    completedAnsweredSessionIds: [],
  });
});

it('pages past 1,000 rows and orders deterministically by created_at asc then id asc across 2,500 rows with the same created_at', async () => {
  historyStore.sessions = [
    {
      id: 'session-bulk',
      user_id: owner,
      status: 'completed',
      excluded_from_analytics: false,
      started_at: '2026-10-01T00:00:00Z',
    },
  ];
  const sharedTimestamp = '2026-10-05T12:00:00Z';
  historyStore.sessions.push({ ...historyStore.sessions[0], id: 'session-bulk-retake' });
  const rows: Record<string, unknown>[] = [];
  // Insert 2,500 rows with identical created_at. Question 9999 appears on the first and last id.
  for (let i = 2499; i >= 0; i--) {
    const id = `att-${String(i).padStart(4, '0')}`;
    const isTrackedQuestion = i === 0 || i === 2499;
    rows.push({
      id,
      session_id: i === 2499 ? 'session-bulk-retake' : 'session-bulk',
      user_id: owner,
      question_id: isTrackedQuestion ? 9999 : 1000 + i,
      passage_id: 30,
      selected: i === 0 ? 'B' : 'A',
      is_correct: i === 0 ? true : false,
      is_first_attempt: true,
      created_at: sharedTimestamp,
    });
  }
  historyStore.attempts = rows;

  const history = await getQuestionHistory();
  expect(historyStore.attemptRanges).toEqual([
    [0, 999],
    [1000, 1999],
    [2000, 2999],
  ]);
  expect(historyStore.attemptOrders).toEqual([
    { column: 'created_at', ascending: true },
    { column: 'id', ascending: true },
    { column: 'created_at', ascending: true },
    { column: 'id', ascending: true },
    { column: 'created_at', ascending: true },
    { column: 'id', ascending: true },
  ]);
  // 2,498 distinct single-attempt questions + question 9999 (attempted twice) = 2,499 entries
  expect(history.size).toBe(2499);
  // For question 9999, id att-0000 was correct (first) and id att-2499 was incorrect (last)
  const tracked = history.get(9999);
  expect(tracked).toMatchObject({
    questionId: 9999,
    attempts: 2,
    firstEverCorrect: true,
    firstTakeCorrect: false,
    everCorrect: true,
    everIncorrect: true,
    lastFirstTakeIncorrect: true,
    incorrectOnLastTake: true,
    incorrectCount: 1,
  });
});

it('preserves first-take incorrect status when a missed question is fixed in blind review (is_first_attempt = false)', async () => {
  historyStore.sessions = [
    {
      id: 'session-br',
      user_id: owner,
      status: 'completed',
      excluded_from_analytics: false,
      started_at: '2026-10-01T00:00:00Z',
    },
  ];
  historyStore.attempts = [
    {
      id: 'att-1-miss',
      session_id: 'session-br',
      user_id: owner,
      question_id: 301,
      passage_id: 40,
      selected: 'D',
      is_correct: false,
      is_first_attempt: true,
      created_at: '2026-10-01T00:01:00Z',
    },
    {
      id: 'att-2-review-fix',
      session_id: 'session-br',
      user_id: owner,
      question_id: 301,
      passage_id: 40,
      selected: 'A',
      is_correct: true,
      is_first_attempt: false,
      created_at: '2026-10-01T00:10:00Z',
    },
  ];
  const history = await getQuestionHistory();
  expect(history.get(301)).toMatchObject({
    questionId: 301,
    attempts: 1,
    answered: true,
    firstEverCorrect: false,
    firstTakeCorrect: false,
    unansweredOnFirstTake: false,
    everCorrect: false,
    everIncorrect: true,
    incorrectCount: 1,
    lastFirstTakeIncorrect: true,
    incorrectOnLastTake: true,
    reviewCorrected: true,
  });
});

it('counts partial in-progress sessions as exposure and accuracy without marking completedAnswered', async () => {
  historyStore.sessions = [
    {
      id: 'session-in-progress',
      user_id: owner,
      status: 'in_progress',
      excluded_from_analytics: false,
      started_at: '2026-10-01T00:00:00Z',
    },
  ];
  historyStore.attempts = [
    {
      id: 'att-ip-1',
      session_id: 'session-in-progress',
      user_id: owner,
      question_id: 401,
      passage_id: 50,
      selected: 'A',
      is_correct: true,
      is_first_attempt: true,
      created_at: '2026-10-01T00:01:00Z',
    },
  ];
  const history = await getQuestionHistory();
  expect(history.get(401)).toMatchObject({
    questionId: 401,
    attempts: 1,
    answered: true,
    firstEverCorrect: true,
    firstTakeCorrect: true,
    everCorrect: true,
    everIncorrect: false,
    completedAnswered: false,
    completedAnsweredSessionIds: [],
  });
});

it('counts abandoned sessions as exposure only, never as accuracy or misses', async () => {
  historyStore.sessions = [
    {
      id: 'session-abandoned',
      user_id: owner,
      status: 'abandoned',
      excluded_from_analytics: false,
      started_at: '2026-10-01T00:00:00Z',
    },
  ];
  historyStore.attempts = [
    {
      id: 'att-abandoned-wrong',
      session_id: 'session-abandoned',
      user_id: owner,
      question_id: 501,
      passage_id: 60,
      selected: 'E',
      is_correct: false,
      is_first_attempt: true,
      created_at: '2026-10-01T00:01:00Z',
    },
    {
      id: 'att-abandoned-right',
      session_id: 'session-abandoned',
      user_id: owner,
      question_id: 502,
      passage_id: 60,
      selected: 'A',
      is_correct: true,
      is_first_attempt: true,
      created_at: '2026-10-01T00:02:00Z',
    },
  ];
  const history = await getQuestionHistory();
  expect(history.get(501)).toMatchObject({
    questionId: 501,
    attempts: 1,
    answered: false,
    firstEverCorrect: null,
    firstTakeCorrect: null,
    unansweredOnFirstTake: false,
    everCorrect: false,
    everIncorrect: false,
    incorrectCount: 0,
    lastFirstTakeIncorrect: false,
    incorrectOnLastTake: false,
    completedAnswered: false,
    completedAnsweredSessionIds: [],
  });
  expect(history.get(502)).toMatchObject({
    questionId: 502,
    attempts: 1,
    answered: false,
    firstEverCorrect: null,
    firstTakeCorrect: null,
    unansweredOnFirstTake: false,
    everCorrect: false,
    everIncorrect: false,
  });
});

it('never includes rows belonging to another user even when RLS returns foreign sessions or attempts', async () => {
  historyStore.bypassEqFilter = true;
  historyStore.sessions = [
    {
      id: 'owner-session',
      user_id: owner,
      status: 'completed',
      excluded_from_analytics: false,
      started_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'foreign-session',
      user_id: 'other-student-id',
      status: 'completed',
      excluded_from_analytics: false,
      started_at: '2026-10-01T00:00:00Z',
    },
  ];
  historyStore.attempts = [
    {
      id: 'owner-att',
      session_id: 'owner-session',
      user_id: owner,
      question_id: 601,
      passage_id: 70,
      selected: 'A',
      is_correct: true,
      is_first_attempt: true,
      created_at: '2026-10-01T00:01:00Z',
    },
    {
      id: 'foreign-att-1',
      session_id: 'foreign-session',
      user_id: 'other-student-id',
      question_id: 602,
      passage_id: 70,
      selected: 'B',
      is_correct: false,
      is_first_attempt: true,
      created_at: '2026-10-01T00:02:00Z',
    },
    {
      id: 'foreign-att-in-foreign-session',
      session_id: 'foreign-session',
      user_id: owner,
      question_id: 603,
      passage_id: 70,
      selected: 'C',
      is_correct: false,
      is_first_attempt: true,
      created_at: '2026-10-01T00:03:00Z',
    },
  ];
  const history = await getQuestionHistory();
  expect(historyStore.sessionFilters).toHaveBeenCalledWith('user_id', owner);
  expect(historyStore.attemptFilters).toHaveBeenCalledWith('user_id', owner);
  expect([...history.keys()]).toEqual([601]);
  expect(history.has(602)).toBe(false);
  expect(history.has(603)).toBe(false);
});

it('updates firstTakeCorrect to the latest graded first take across multiple drills while preserving firstEverCorrect', async () => {
  historyStore.sessions = [
    {
      id: 'drill-1',
      user_id: owner,
      status: 'completed',
      excluded_from_analytics: false,
      started_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'drill-2',
      user_id: owner,
      status: 'completed',
      excluded_from_analytics: false,
      started_at: '2026-10-02T00:00:00Z',
    },
  ];
  historyStore.attempts = [
    // Question 701: Drill 1 wrong -> Drill 2 right
    {
      id: 'att-701-d1',
      session_id: 'drill-1',
      user_id: owner,
      question_id: 701,
      passage_id: 80,
      selected: 'B',
      is_correct: false,
      is_first_attempt: true,
      created_at: '2026-10-01T00:01:00Z',
    },
    {
      id: 'att-701-d2',
      session_id: 'drill-2',
      user_id: owner,
      question_id: 701,
      passage_id: 80,
      selected: 'A',
      is_correct: true,
      is_first_attempt: true,
      created_at: '2026-10-02T00:01:00Z',
    },
    // Question 702: Drill 1 right -> Drill 2 wrong
    {
      id: 'att-702-d1',
      session_id: 'drill-1',
      user_id: owner,
      question_id: 702,
      passage_id: 80,
      selected: 'A',
      is_correct: true,
      is_first_attempt: true,
      created_at: '2026-10-01T00:02:00Z',
    },
    {
      id: 'att-702-d2',
      session_id: 'drill-2',
      user_id: owner,
      question_id: 702,
      passage_id: 80,
      selected: 'C',
      is_correct: false,
      is_first_attempt: true,
      created_at: '2026-10-02T00:02:00Z',
    },
  ];
  const history = await getQuestionHistory();
  expect(history.get(701)).toMatchObject({
    questionId: 701,
    attempts: 2,
    firstEverCorrect: false,
    firstTakeCorrect: true,
    everCorrect: true,
    everIncorrect: true,
    lastFirstTakeIncorrect: false,
    incorrectOnLastTake: false,
  });
  expect(history.get(702)).toMatchObject({
    questionId: 702,
    attempts: 2,
    firstEverCorrect: true,
    firstTakeCorrect: false,
    everCorrect: true,
    everIncorrect: true,
    lastFirstTakeIncorrect: true,
    incorrectOnLastTake: true,
  });
});

it('does not erase lastFirstTakeIncorrect when a previously missed question is skipped on a later drill', async () => {
  historyStore.sessions = [
    {
      id: 'drill-miss',
      user_id: owner,
      status: 'completed',
      excluded_from_analytics: false,
      started_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'drill-skip',
      user_id: owner,
      status: 'completed',
      excluded_from_analytics: false,
      started_at: '2026-10-02T00:00:00Z',
    },
  ];
  historyStore.attempts = [
    {
      id: 'att-801-miss',
      session_id: 'drill-miss',
      user_id: owner,
      question_id: 801,
      passage_id: 90,
      selected: 'D',
      is_correct: false,
      is_first_attempt: true,
      created_at: '2026-10-01T00:01:00Z',
    },
    {
      id: 'att-801-skip',
      session_id: 'drill-skip',
      user_id: owner,
      question_id: 801,
      passage_id: 90,
      selected: null,
      is_correct: null,
      is_first_attempt: true,
      created_at: '2026-10-02T00:01:00Z',
    },
  ];
  const history = await getQuestionHistory();
  expect(history.get(801)).toMatchObject({
    questionId: 801,
    attempts: 2,
    answered: true,
    firstEverCorrect: false,
    firstTakeCorrect: false,
    unansweredOnFirstTake: false,
    everIncorrect: true,
    lastFirstTakeIncorrect: true,
    incorrectOnLastTake: true,
  });
});



it('refuses answers and flag changes in discarded ordinary drills without mutating records', async () => {
  clock.status = 'abandoned';
  await expect(recordAttempt({ id: attemptId, userId: owner, sessionId, questionId: 7, passageId: 3, selected: 'C', isCorrect: true, timeMs: 1000, flagged: false, eliminations: [], isFirstAttempt: false })).rejects.toThrow('discarded');
  await expect(setAttemptFlag(sessionId, 7, true, owner)).rejects.toThrow('discarded');
  expect(insert).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});


it.each(['config', 'column'])('releases protected completed misses using persisted parent status (%s)', async location => {
  historyStore.sessions = [{ id: sessionId, user_id: owner, status: 'completed', config: { ...clock.config,
    ...(location === 'config' ? { practiceTestRunId: 'exam' } : {}) }, ...(location === 'column' ? { practice_test_run_id: 'exam' } : {}) }];
  historyStore.attempts = [{ id: attemptId, user_id: owner, session_id: sessionId, question_id: 7, selected: 'C', is_correct: false, created_at: '2026-10-17T10:00:00Z' }];
  historyStore.parents = [{ id: 'exam', user_id: owner, status: 'in_progress' }];
  expect((await getRcHistorySnapshot(owner)).displayHistory.get(7)?.everIncorrect).toBe(false);
  historyStore.parents[0].status = 'complete';
  expect((await getRcHistorySnapshot(owner)).displayHistory.get(7)?.everIncorrect).toBe(true);
  historyStore.bypassEqFilter = true;
  historyStore.parents[0].user_id = 'other';
  expect((await getRcHistorySnapshot(owner)).displayHistory.get(7)?.everIncorrect).toBe(false);
});
it.each(['config', 'column'])('releases completed timed-section misses without a drill reveal marker (%s)', async location => {
  historyStore.sessions = [{ id: sessionId, user_id: owner, status: 'completed', config: { ...clock.config,
    ...(location === 'config' ? { timedSectionSittingId: 'sitting' } : {}) }, ...(location === 'column' ? { timed_section_sitting_id: 'sitting' } : {}) }];
  historyStore.attempts = [{ id: attemptId, user_id: owner, session_id: sessionId, question_id: 7, selected: 'C', is_correct: false, created_at: '2026-10-17T10:00:00Z' }];
  expect((await getRcHistorySnapshot(owner)).displayHistory.get(7)?.everIncorrect).toBe(true);
  historyStore.sessions[0].status = 'in_progress';
  expect((await getRcHistorySnapshot(owner)).displayHistory.get(7)?.everIncorrect).toBe(false);
});
it('preserves a released miss and its last-try result beneath a newer hidden answer', async () => {
  historyStore.sessions = [{ id: sessionId, user_id: owner, status: 'completed', config: { ...clock.config, resultsRevealedAt: '2026-10-17T11:00:00Z' } },
    { id: 'hidden', user_id: owner, status: 'in_progress', config: clock.config }];
  historyStore.attempts = [{ id: attemptId, user_id: owner, session_id: sessionId, question_id: 7, selected: 'C', is_correct: false, created_at: '2026-10-17T10:00:00Z' },
    { id: 'new', user_id: owner, session_id: 'hidden', question_id: 7, selected: 'A', is_correct: true, created_at: '2026-10-18T10:00:00Z' }];
  const snapshot = await getRcHistorySnapshot(owner);
  expect(snapshot.hasHiddenGradedResults).toBe(true);
  expect(snapshot.displayHistory.get(7)).toMatchObject({ everIncorrect: true, firstTakeCorrect: false, incorrectOnLastTake: true, incorrectCount: 1, lastGradedAt: '2026-10-17T10:00:00Z' });
});
it('retains sessionless legacy misses but excludes a missing linked session', async () => {
  historyStore.attempts = [{ id: attemptId, user_id: owner, question_id: 7, selected: 'C', is_correct: false, created_at: '2026-10-17T10:00:00Z' },
    { id: 'missing', user_id: owner, session_id: 'missing', question_id: 8, selected: 'C', is_correct: false, created_at: '2026-10-17T10:00:00Z' }];
  const snapshot = await getRcHistorySnapshot(owner);
  expect(snapshot.displayHistory.get(7)?.everIncorrect).toBe(true);
  expect(snapshot.displayHistory.has(8)).toBe(false);
});
