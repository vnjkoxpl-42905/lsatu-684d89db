import { describe, it, expect } from 'vitest';
import {
  guidedSessionKey,
  guidedAttemptId,
  isLegacyGuidedSessionSuperseded,
  guidedSessionKeyForRunner,
  isResumableGuidedSession,
  guidedResumeIndex,
  guidedResumeNotice,
  guidedSessionToDrillSession,
  GUIDED_SESSION_PREFIX,
  type GuidedDrillSession,
} from './guidedDrillSession';

function session(overrides: Partial<GuidedDrillSession> = {}): GuidedDrillSession {
  return {
    id: '00000000-0000-4000-8000-000000000000',
    user_id: '00000000-0000-4000-8000-000000000001',
    pool_slug: 'guided::abc',
    completion_id: 'guided::abc',
    question_queue: ['q1', 'q2', 'q3'],
    current_index: 1,
    attempts: [{ qid: 'q1', selected_answer: 'B', correct: true, time_ms: 4000 }],
    status: 'in_progress',
    started_at: '2026-08-10T17:00:00.000Z',
    updated_at: '2026-08-10T17:05:00.000Z',
    ...overrides,
  } as GuidedDrillSession;
}

describe('guidedSessionKey', () => {
  it('hides a stale legacy resume when its completed individual sitting contains the same saved work', () => {
    const legacy = session({ attempts: [{ qid: 'q1', selected_answer: 'B', correct: true, time_ms: 4000 }] });
    const completed = session({
      status: 'completed',
      attempts: [...legacy.attempts, { qid: 'q2', selected_answer: 'D', correct: false, time_ms: 5000 }],
    });
    expect(isLegacyGuidedSessionSuperseded(legacy, [completed])).toBe(true);
    expect(isLegacyGuidedSessionSuperseded(legacy, [session({ ...completed, question_queue: ['other'] })])).toBe(false);
  });
  it('uses one attempt ID per sitting and question across retries', async () => {
    const first = await guidedAttemptId('11111111-1111-4111-8111-111111111111', 'PT140-S3-Q5');
    expect(first).toBe(await guidedAttemptId('11111111-1111-4111-8111-111111111111', 'PT140-S3-Q5'));
    expect(first).not.toBe(await guidedAttemptId('22222222-2222-4222-8222-222222222222', 'PT140-S3-Q5'));
    expect(first).not.toBe(await guidedAttemptId('11111111-1111-4111-8111-111111111111', 'PT140-S3-Q6'));
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it('keeps the same closeout ID when the final choice changes before finish', async () => {
    const firstPick = session();
    const changedPick = session({ attempts: [{ ...firstPick.attempts[0], selected_answer: 'C', answer_trail: [
      { answer: 'B', at_ms: 100 }, { answer: 'C', at_ms: 200 },
    ] }] });
    const runId = '11111111-1111-4111-8111-111111111111';
    expect(await guidedAttemptId(runId, firstPick.attempts[0].qid)).toBe(
      await guidedAttemptId(runId, changedPick.attempts[0].qid),
    );
    expect(changedPick.attempts).toHaveLength(1);
    expect(changedPick.attempts[0].answer_trail).toHaveLength(2);
  });
  it('prefers the assignment id so each assignment gets its own run', () => {
    expect(guidedSessionKey({ assignmentId: 'abc', slug: 'parallel-flaw' })).toBe(
      `${GUIDED_SESSION_PREFIX}abc`,
    );
  });

  it('falls back to the slug for the assignment-less library route', () => {
    expect(guidedSessionKey({ slug: 'parallel-flaw' })).toBe(
      `${GUIDED_SESSION_PREFIX}slug:parallel-flaw`,
    );
  });

  it('uses the drill id for a named assignment-less run', () => {
    expect(guidedSessionKey({ drillId: 'gd_7', slug: 'parallel-flaw' })).toBe(
      `${GUIDED_SESSION_PREFIX}drill:gd_7`,
    );
  });

  it('namespaces away from practice-pool slugs', () => {
    const key = guidedSessionKey({ slug: 'mc-practice-1' })!;
    expect(key.startsWith(GUIDED_SESSION_PREFIX)).toBe(true);
    expect(key).not.toBe('mc-practice-1');
  });

  it('is null with nothing to key on', () => {
    expect(guidedSessionKey({})).toBeNull();
    expect(guidedSessionKey({ assignmentId: '  ' })).toBeNull();
  });
});

describe('guidedSessionKeyForRunner', () => {
  it('uses the guidedAssignmentId param when the runner has one', () => {
    expect(guidedSessionKeyForRunner({ guidedAssignmentId: 'abc', returnTo: '/classroom' })).toBe(
      `${GUIDED_SESSION_PREFIX}abc`,
    );
  });

  it('recovers the assignment from the returnTo path', () => {
    expect(guidedSessionKeyForRunner({ returnTo: '/guided/abc?returnTo=/classroom' })).toBe(
      `${GUIDED_SESSION_PREFIX}abc`,
    );
  });

  it('recovers the slug from the library route', () => {
    expect(guidedSessionKeyForRunner({ returnTo: '/guided-drills/parallel-flaw?returnTo=/x' })).toBe(
      `${GUIDED_SESSION_PREFIX}slug:parallel-flaw`,
    );
  });

  it('uses the drill id carried through the expanded URL', () => {
    expect(
      guidedSessionKeyForRunner({
        guidedDrillId: 'gd_7',
        returnTo: '/guided-drills/parallel-flaw',
      }),
    ).toBe(`${GUIDED_SESSION_PREFIX}drill:gd_7`);
  });

  it('is null for every non-guided drill surface', () => {
    expect(guidedSessionKeyForRunner({ returnTo: '/classroom/drill' })).toBeNull();
    expect(guidedSessionKeyForRunner({ returnTo: '/flagged' })).toBeNull();
    expect(guidedSessionKeyForRunner({})).toBeNull();
  });

  it('returns null for Intro to LR practice sets even when returnTo starts with /guided-drills/', () => {
    expect(
      guidedSessionKeyForRunner({
        returnTo: '/guided-drills/first-sentence-conclusions?returnTo=%2Fbootcamp%2Fintro-to-lr',
        practiceSource: 'intro-to-lr-practice-drills',
      }),
    ).toBeNull();
  });
});

describe('isResumableGuidedSession', () => {
  it('resumes the same set regardless of order', () => {
    expect(isResumableGuidedSession(session(), ['q3', 'q1', 'q2'])).toBe(true);
  });

  it('refuses a set that changed under the saved run', () => {
    expect(isResumableGuidedSession(session(), ['q1', 'q2', 'q9'])).toBe(false);
    expect(isResumableGuidedSession(session(), ['q1', 'q2'])).toBe(false);
  });

  it('never resumes a completed run, so a re-attempt draws fresh', () => {
    expect(isResumableGuidedSession(session({ status: 'completed' }), ['q1', 'q2', 'q3'])).toBe(
      false,
    );
  });

  it('handles nothing stored', () => {
    expect(isResumableGuidedSession(null, ['q1'])).toBe(false);
  });
});

describe('guidedResumeIndex', () => {
  const queue = ['q1', 'q2', 'q3', 'q4'];

  it('honours the stored index when that question is unanswered', () => {
    expect(guidedResumeIndex(queue, 2, ['q1', 'q2'])).toBe(2);
  });

  it('skips past an already-answered question, so a stale index cannot strand the student', () => {
    // The snapshot's cloud copy can lag one write behind the local one.
    expect(guidedResumeIndex(queue, 1, ['q1', 'q2'])).toBe(2);
  });

  it('falls back to a question missed earlier in the queue', () => {
    expect(guidedResumeIndex(queue, 2, ['q1', 'q3', 'q4'])).toBe(1);
  });

  it('lands on the last question when everything is answered', () => {
    expect(guidedResumeIndex(queue, 1, queue)).toBe(3);
  });

  it('clamps an out-of-range stored index', () => {
    expect(guidedResumeIndex(queue, 99, [])).toBe(3);
    expect(guidedResumeIndex(queue, -5, [])).toBe(0);
    expect(guidedResumeIndex([], 3, [])).toBe(0);
  });
});

describe('guidedResumeNotice', () => {
  it('names the question and how much is already answered', () => {
    expect(guidedResumeNotice(session())).toBe(
      'Picking up where you left off — question 2 of 3, 1 already answered.',
    );
  });

  it('names the question the drill will actually open, not a stale stored index', () => {
    // Stored index 0, but q1 is already answered — the drill opens q2, so must the card.
    expect(guidedResumeNotice(session({ current_index: 0 }))).toBe(
      'Picking up where you left off — question 2 of 3, 1 already answered.',
    );
  });

  it('stays quiet when there is nothing worth resuming', () => {
    expect(guidedResumeNotice(null)).toBeUndefined();
    expect(guidedResumeNotice(session({ attempts: [] }))).toBeUndefined();
    expect(guidedResumeNotice(session({ status: 'completed' }))).toBeUndefined();
  });
});

describe('guidedSessionToDrillSession', () => {
  const finished = session({
    status: 'completed',
    current_index: 2,
    attempts: [
      { qid: 'q1', selected_answer: 'B', correct: true, time_ms: 4000 },
      { qid: 'q2', selected_answer: 'E', correct: false, time_ms: 9000 },
    ],
  });

  it('keeps a finished run readable, so completing a drill is not losing it', () => {
    const rehydrated = guidedSessionToDrillSession(finished);
    expect(rehydrated?.questionQueue).toEqual(['q1', 'q2', 'q3']);
    expect(rehydrated?.attempts.size).toBe(2);
  });

  it('carries each answer back exactly as it was given', () => {
    const attempts = guidedSessionToDrillSession(finished)!.attempts;
    expect(attempts.get('q1')).toMatchObject({ selectedAnswer: 'B', correct: true, timeMs: 4000 });
    expect(attempts.get('q2')).toMatchObject({ selectedAnswer: 'E', correct: false, timeMs: 9000 });
  });

  it('leaves an unanswered question absent rather than inventing a blank attempt', () => {
    expect(guidedSessionToDrillSession(finished)!.attempts.has('q3')).toBe(false);
  });

  it('defaults a missing time to zero instead of NaN', () => {
    const noTime = session({
      attempts: [{ qid: 'q1', selected_answer: 'A', correct: true } as never],
    });
    expect(guidedSessionToDrillSession(noTime)!.attempts.get('q1')?.timeMs).toBe(0);
  });

  it('has nothing to show for no row or an empty queue', () => {
    expect(guidedSessionToDrillSession(null)).toBeNull();
    expect(guidedSessionToDrillSession(session({ question_queue: [] }))).toBeNull();
  });
});
