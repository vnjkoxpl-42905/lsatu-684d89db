import { beforeEach, expect, it, vi } from 'vitest';
import type { RcDrillConfig } from '../lib/rcTypes';

const owner = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const attemptId = '33333333-3333-4333-8333-333333333333';

const { insert, update, clock } = vi.hoisted(() => ({
  insert: vi.fn(), update: vi.fn(),
  clock: { config: {} as Partial<RcDrillConfig> },
}));

vi.mock('./rcSupabase.types', () => ({
  RC_SESSIONS_TABLE: 'rc_drill_sessions',
  RC_ATTEMPTS_TABLE: 'rc_attempts',
  RC_ANNOTATIONS_TABLE: 'rc_annotations',
  rcDb: {
    auth: { getUser: async () => ({ data: { user: { id: owner } } }) },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: {
            id: attemptId, session_id: sessionId, user_id: owner, question_id: 7,
            passage_id: 3, selected: 'C', is_correct: true, time_ms: 1000,
            flagged: false, eliminations: [], is_first_attempt: true,
            created_at: '2026-09-28T00:00:00Z',
          }, error: null }) }),
          maybeSingle: async () => ({ data: {
            id: sessionId, user_id: owner, config: { ...clock.config }, passage_ids: [3],
            status: 'in_progress', excluded_from_analytics: false,
            started_at: '2026-09-28T00:00:00Z', completed_at: null,
          }, error: null }),
        }),
      }),
      insert,
      update,
    }),
  },
}));

import { recordAttempt, saveSessionClock } from './rcProgress';

beforeEach(() => {
  clock.config = { reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 100 }, source: 'manual' };
  insert.mockClear();
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
