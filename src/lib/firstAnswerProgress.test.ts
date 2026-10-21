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
    const session = { id: 'rc-1', user_id: student, status: 'completed', completed_at: '2026-09-27T00:00:00Z', excluded_from_analytics: false, practice_test_run_id: null };
    const attempt = (id: string, date: string, correct: boolean) => ({ id, user_id: student, session_id: 'rc-1', passage_id: 11, question_id: 1, selected: 'B', is_correct: correct, created_at: date });
    const answers = adaptRcAttempts([attempt('later', '2026-09-26T12:00:00Z', true), attempt('earlier', '2026-09-26T11:00:00Z', false)], [session], student, new Set());
    const result = projectFirstAnswerProgress({ answers, window: 'all', asOf: '2026-09-28', coverage });
    expect(result.RC.evidenceAttemptIds).toEqual(['rc_attempts:earlier']);
    expect(result.RC.correct).toBe(0);
  });
});
