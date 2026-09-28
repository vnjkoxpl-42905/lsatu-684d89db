import { expect, it, vi } from 'vitest';

const owner = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const attemptId = '33333333-3333-4333-8333-333333333333';

const { insert } = vi.hoisted(() => ({ insert: vi.fn() }));

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
            id: sessionId, user_id: owner, config: {}, passage_ids: [3],
            status: 'in_progress', excluded_from_analytics: false,
            started_at: '2026-09-28T00:00:00Z', completed_at: null,
          }, error: null }),
        }),
      }),
      insert,
    }),
  },
}));

import { recordAttempt } from './rcProgress';

it('acknowledges an attempt already saved under the retry UUID without inserting another row', async () => {
  const saved = await recordAttempt({
    id: attemptId, sessionId, questionId: 7, passageId: 3, selected: 'C',
    isCorrect: true, timeMs: 1000, flagged: false, eliminations: [], isFirstAttempt: true,
  });
  expect(saved.id).toBe(attemptId);
  expect(saved.isFirstAttempt).toBe(true);
  expect(insert).not.toHaveBeenCalled();
});
