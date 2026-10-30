import { describe, expect, it } from 'vitest';
import {
  adaptLrAttempts,
  adaptLrSections,
  adaptRcAttempts,
  completedPracticeTestIds,
  projectFirstAnswerProgress,
  type GradedQuestionAnswer,
  type ProgressCoverage,
} from './firstAnswerProgress';

const student = 'student-1';
const coverage: ProgressCoverage = {
  includedSources: ['lr_attempts', 'lr_section_history', 'rc_attempts'],
  missingSources: [],
  excludedRows: {},
};
const graded = (id: string, key: string, date: string, correct: boolean): GradedQuestionAnswer => ({
  attemptId: id,
  questionKey: key,
  area: 'LR',
  source: 'lr_attempts',
  mode: 'adaptive',
  correct,
  gradedAt: date,
});

describe('first saved graded response', () => {
  it('dedupes by question before filtering a date window', () => {
    const first = graded('first', 'LR:PT101-S2-Q1', '2026-08-01T00:00:00Z', false);
    const repeat = graded('repeat', first.questionKey, '2026-09-27T00:00:00Z', true);
    const newQuestion = graded('new', 'LR:PT101-S2-Q2', '2026-09-27T00:00:00Z', true);
    const result = projectFirstAnswerProgress({ answers: [repeat, newQuestion, first], window: 7, asOf: '2026-09-28T00:00:00Z', coverage });
    expect(result.LR.denominator).toBe(1);
    expect(result.LR.correct).toBe(1);
    expect(result.LR.evidenceAttemptIds).toEqual(['new']);
    expect(result.repeatCount).toBe(1);
  });

  it('counts a persisted attempt once when a paged read overlaps, while retaining real repeats', () => {
    const first = graded('attempts:first', 'LR:q1', '2026-09-26', false);
    const repeat = graded('attempts:repeat', 'LR:q1', '2026-09-27', true);
    const result = projectFirstAnswerProgress({
      answers: [repeat, first, { ...first }, { ...repeat }],
      window: 7, asOf: '2026-09-28', coverage,
    });
    expect(result.LR).toMatchObject({ correct: 0, denominator: 1, evidenceAttemptIds: ['attempts:first'] });
    expect(result.repeatCount).toBe(1);
  });

  it('keeps LR and RC separate and suppresses percentages below three', () => {
    const result = projectFirstAnswerProgress({
      answers: [graded('lr-1', 'LR:one', '2026-09-27', true), { ...graded('rc-1', 'RC:1:1', '2026-09-27', false), area: 'RC', source: 'rc_attempts' }],
      window: 'all', asOf: '2026-09-28', coverage,
    });
    expect(result.LR).toMatchObject({ correct: 1, denominator: 1, percent: null, sample: 'insufficient' });
    expect(result.RC).toMatchObject({ correct: 0, denominator: 1, percent: null, sample: 'insufficient' });
  });

  it('labels three to nine questions as an early signal', () => {
    const answers = [1, 2, 3].map((n) => graded(`a-${n}`, `LR:q-${n}`, '2026-09-27', n < 3));
    const result = projectFirstAnswerProgress({ answers, window: 'all', asOf: '2026-09-28', coverage });
    expect(result.LR).toMatchObject({ correct: 2, denominator: 3, percent: 67, sample: 'early' });
  });
});

describe('persisted source eligibility', () => {
  it('keeps protected standalone RC provenance distinct from ordinary drills and PrepTests', () => {
    const session = { id: 'rc-1', user_id: student, status: 'completed', completed_at: '2026-09-27T00:00:00Z', excluded_from_analytics: false, practice_test_run_id: null };
    const attempt = { id: 'a-1', user_id: student, session_id: 'rc-1', passage_id: 11, question_id: 1, selected: 'B', is_correct: false, created_at: '2026-09-26T00:00:00Z' };
    expect(adaptRcAttempts([attempt], [session], student, new Set())[0].mode).toBe('rc-drill');
    expect(adaptRcAttempts([attempt], [{ ...session, timed_section_sitting_id: 'protected' }], student, new Set())[0].mode).toBe('timed-section');
    expect(adaptRcAttempts([attempt], [{ ...session, practice_test_run_id: 'run' }], student, new Set(['run']))[0].mode).toBe('practice-test');
  });
  it('takes saved LR drill answers and excludes Inspect, blind and unfinished section rows', () => {
    const rows = ['adaptive', 'post-answer', 'full-section', 'inspect'].map((mode, index) => ({
      id: `a-${index}`, user_id: student, qid: `PT101-S2-Q${index + 1}`, mode,
      selected_answer: 'B', correct: true, qtype: 'Strengthen', timestamp_iso: '2026-09-27T00:00:00Z',
    }));
    expect(adaptLrAttempts(rows, student).map((a) => a.attemptId)).toEqual(['attempts:a-0']);
    expect(adaptLrAttempts(rows, student)[0].topic).toBe('Strengthen');
  });

  it('includes the bank-backed bootcamp modal writer mode', () => {
    expect(adaptLrAttempts([{
      id: 'bootcamp-answer', user_id: student, qid: 'PT101-S2-Q3', mode: 'bootcamp-pf',
      selected_answer: 'C', correct: true, timestamp_iso: '2026-09-27T00:00:00Z',
    }], student)).toMatchObject([{ source: 'lr_attempts', mode: 'bootcamp-pf', correct: true }]);
  });

  it('uses only answered question detail from a completed LR section and gates full tests', () => {
    const section = {
      id: 'section-1', user_id: student, mode: 'full-section', completed_at: '2026-09-27T00:00:00Z',
      practice_test_run_id: 'run-1', questions_json: [
        { qid: 'PT101-S2-Q1', qtype: 'Weaken', initialAnswer: 'B', initialCorrect: false, brAnswer: 'C', brCorrect: true },
        { qid: 'PT101-S2-Q2', initialAnswer: '—', initialCorrect: false },
      ],
    };
    expect(adaptLrSections([section], student, new Set())).toEqual([]);
    expect(adaptLrSections([section], student, new Set(['run-1']))).toMatchObject([
      { questionKey: 'LR:PT101-S2-Q1', correct: false, mode: 'practice-test', topic: 'Weaken' },
    ]);
  });

  it('gates RC on completed, included sessions and their enclosing full test', () => {
    const runIds = completedPracticeTestIds([
      { id: 'run-1', user_id: student, status: 'in_progress', completed_at: null },
      { id: 'run-2', user_id: student, status: 'complete', completed_at: '2026-09-27T00:00:00Z' },
    ], student);
    const sessions = [
      { id: 'rc-1', user_id: student, status: 'completed', completed_at: '2026-09-27T00:00:00Z', excluded_from_analytics: false, practice_test_run_id: 'run-1' },
      { id: 'rc-2', user_id: student, status: 'completed', completed_at: '2026-09-27T00:00:00Z', excluded_from_analytics: false, practice_test_run_id: 'run-2' },
      { id: 'rc-3', user_id: student, status: 'completed', completed_at: '2026-09-27T00:00:00Z', excluded_from_analytics: true, practice_test_run_id: null },
    ];
    const attempts = sessions.map((session, n) => ({
      id: `a-${n}`, user_id: student, session_id: session.id, passage_id: 11,
      question_id: n + 1, selected: 'B', is_correct: n === 1, created_at: '2026-09-26T00:00:00Z',
    }));
    expect(adaptRcAttempts(attempts, sessions, student, runIds).map((a) => a.attemptId)).toEqual(['rc_attempts:a-1']);
  });

  it('uses answer time to choose the first RC pick when a session grades multiple attempts together', () => {
    const session = { id: 'rc-1', user_id: student, status: 'completed', completed_at: '2026-09-27T00:00:00Z', excluded_from_analytics: false, practice_test_run_id: null, config: { resultsRevealedAt: '2026-09-27T00:00:00Z' } };
    const attempt = (id: string, date: string, correct: boolean) => ({ id, user_id: student, session_id: 'rc-1', passage_id: 11, question_id: 1, selected: 'B', is_correct: correct, created_at: date });
    const answers = adaptRcAttempts([attempt('later', '2026-09-26T12:00:00Z', true), attempt('earlier', '2026-09-26T11:00:00Z', false)], [session], student, new Set());
    const result = projectFirstAnswerProgress({ answers, window: 'all', asOf: '2026-09-28', coverage });
    expect(result.RC.evidenceAttemptIds).toEqual(['rc_attempts:earlier']);
    expect(result.RC.correct).toBe(0);
  });
});

describe('RC grading date and provenance corrections', () => {
  const session = (over: Record<string, unknown> = {}) => ({ id: 'rc-1', user_id: student, status: 'completed', completed_at: '2026-09-27T00:00:00Z', excluded_from_analytics: false, practice_test_run_id: null, config: { resultsRevealedAt: '2026-09-27T00:00:00Z' }, ...over });
  const attempt = (id: string, created: string, over: Record<string, unknown> = {}) => ({ id, user_id: student, session_id: 'rc-1', passage_id: 11, question_id: 1, selected: 'B', is_correct: true, created_at: created, ...over });
  const one = (a: ReturnType<typeof attempt>, s = session(), runs: string[] = []) => adaptRcAttempts([a], [s as never], student, new Set(runs));

  it('retains withheld earliest RC identity before accuracy selection, rather than promoting a released repeat', () => {
    const answers = adaptRcAttempts([
      attempt('hidden-first', '2026-09-01', { session_id: 'hidden', is_correct: false }),
      attempt('released-repeat', '2026-09-26', { session_id: 'released', is_correct: true }),
    ], [session({ id: 'hidden', completed_at: '2026-09-02', config: {} }), session({ id: 'released' })] as never, student, new Set());
    expect(answers[0]).toMatchObject({ correct: null, resultVisibility: 'withheld', provenance: { sessionId: 'hidden' } });
    expect(projectFirstAnswerProgress({ answers, coverage, window: 'all', asOf: '2026-09-28' }).RC).toMatchObject({ denominator: 0, evidenceAttemptIds: [] });
    expect(projectFirstAnswerProgress({ answers, coverage, window: 'all', asOf: '2026-09-28' }).repeatCount).toBe(1);
  });

  it('does not follow a released parent when the player parent or full-test leg conflicts', () => {
    const pick = attempt('pick', '2026-09-26');
    for (const parents of [
      { practice_test_run_id: 'complete', config: { practiceTestRunId: 'unfinished' } },
      { practice_test_run_id: 'unfinished', config: { practiceTestRunId: 'complete' } },
      { practice_test_run_id: 'complete', config: { practiceTestRunId: 42 } },
    ]) expect(one(pick, session(parents), ['complete'])).toEqual([]);
    const matched = one(pick, session({ practice_test_run_id: 'complete', practice_test_leg: 1, config: { practiceTestRunId: 'complete', practiceTestLegIndex: 1 } }), ['complete']);
    expect(matched[0]).toMatchObject({ correct: true, provenance: { runId: 'complete', legIndex: 1 } });
    const conflicting = one(pick, session({ practice_test_run_id: 'complete', practice_test_leg: 1, config: { practiceTestRunId: 'complete', practiceTestLegIndex: 2 } }), ['complete']);
    expect(conflicting[0]).toMatchObject({ correct: null, resultVisibility: 'withheld' });
    expect(conflicting[0].provenance).not.toHaveProperty('legIndex');
  });

  it('grades a pre-completion pick at completion and keeps a later review at its saved date', () => {
    expect(one(attempt('pick', '2026-09-26T00:00:00Z'))[0].gradedAt).toBe('2026-09-27T00:00:00Z');
    expect(one(attempt('pick', '2026-09-26T00:00:00Z'))[0].answeredAt).toBe('2026-09-26T00:00:00Z');
    expect(one(attempt('review', '2026-10-01T00:00:00Z'))[0].gradedAt).toBe('2026-10-01T00:00:00Z');
  });

  it('never introduces an invalid date from a bad created_at', () => {
    const [answer] = one(attempt('bad', 'not-a-date'));
    expect(answer.gradedAt).toBe('2026-09-27T00:00:00Z');
    expect(Number.isFinite(Date.parse(answer.answeredAt!))).toBe(true);
    expect(one(attempt('x', '2026-09-26T00:00:00Z'), session({ completed_at: null }))).toEqual([]);
  });

  it('lets a cross-session first answer win when an old session was reviewed later', () => {
    const old = session({ id: 'old', completed_at: '2026-09-05T00:00:00Z' });
    const recent = session({ id: 'recent', completed_at: '2026-09-07T00:00:00Z' });
    const answers = adaptRcAttempts([
      attempt('old-review', '2026-09-09T00:00:00Z', { session_id: 'old', is_correct: true }),
      attempt('recent-pick', '2026-09-06T00:00:00Z', { session_id: 'recent', is_correct: false }),
    ], [old, recent] as never, student, new Set());
    const result = projectFirstAnswerProgress({ answers, window: 'all', asOf: '2026-10-01T00:00:00Z', coverage });
    expect(result.RC).toMatchObject({ correct: 0, denominator: 1, evidenceAttemptIds: ['rc_attempts:recent-pick'] });
    expect(result.repeatCount).toBe(1);
  });

  it('excludes a review record saved after asOf from every projection', () => {
    const answers = one(attempt('future', '2026-12-01T00:00:00Z'));
    const result = projectFirstAnswerProgress({ answers, window: 'all', asOf: '2026-10-01T00:00:00Z', coverage });
    expect(result.RC.denominator).toBe(0);
    expect(result.repeatCount).toBe(0);
  });

  it.each([
    ['column', { practice_test_run_id: 'run-1' }],
    ['config', { config: { practiceTestRunId: 'run-1' } }],
    ['trimmed config', { config: { practiceTestRunId: '  run-1 ' } }],
    ['empty column, config id', { practice_test_run_id: '', config: { practiceTestRunId: 'run-1' } }],
  ])('gates %s parent provenance on a completed practice test', (_name, over) => {
    expect(one(attempt('a', '2026-09-26T00:00:00Z'), session(over), [])).toEqual([]);
    expect(one(attempt('a', '2026-09-26T00:00:00Z'), session(over), ['run-1'])[0].mode).toBe('practice-test');
  });

  it('treats empty and null identities as absent and an unknown parent as unreleased', () => {
    expect(one(attempt('a', '2026-09-26T00:00:00Z'), session({ practice_test_run_id: '', config: { practiceTestRunId: '' } }))).toHaveLength(1);
    expect(one(attempt('a', '2026-09-26T00:00:00Z'), session({ config: { practiceTestRunId: null } }))).toHaveLength(1);
    expect(one(attempt('a', '2026-09-26T00:00:00Z'), session({ config: { practiceTestRunId: 'unknown' } }), ['run-1'])).toEqual([]);
  });

  it('excludes malformed identities and conflicting parent provenance rather than guessing the player parent', () => {
    expect(one(attempt('a', '2026-09-26T00:00:00Z'), session({ config: { practiceTestRunId: 42 } }), ['42'])).toEqual([]);
    expect(one(attempt('a', '2026-09-26T00:00:00Z'), session({ practice_test_run_id: 7 }), ['7'])).toEqual([]);
    const conflicting = session({ practice_test_run_id: 'run-1', config: { practiceTestRunId: 'run-2' } });
    expect(one(attempt('a', '2026-09-26T00:00:00Z'), conflicting, ['run-1'])).toEqual([]);
    expect(one(attempt('a', '2026-09-26T00:00:00Z'), conflicting, ['run-2'])).toEqual([]);
  });

  it('uses timed sitting provenance for mode only', () => {
    expect(one(attempt('a', '2026-09-26T00:00:00Z'), session({ config: { timedSectionSittingId: 'sit-1' } }))[0].mode).toBe('timed-section');
    expect(one(attempt('a', '2026-09-26T00:00:00Z'), session({ timed_section_sitting_id: 'sit-1' }))[0].mode).toBe('timed-section');
  });

  it('keeps unfinished sessions out for both column and config parents', () => {
    expect(one(attempt('a', '2026-09-26T00:00:00Z'), session({ status: 'in_progress', config: { practiceTestRunId: 'run-1' } }), ['run-1'])).toEqual([]);
    expect(one(attempt('a', '2026-09-26T00:00:00Z'), session({ status: 'in_progress', practice_test_run_id: 'run-1' }), ['run-1'])).toEqual([]);
  });
});
