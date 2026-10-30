import { describe, expect, it } from 'vitest';
import { firstAnswerDetails, inProgressWindow } from './firstAnswerDetails';
import { adaptRcAttempts, type GradedQuestionAnswer, type ProgressCoverage } from './firstAnswerProgress';
import { buildPrototypeModel } from '@/components/analytics/prototype/model';

const answer = (id: string, key: string, date: string, correct: boolean, topic?: string): GradedQuestionAnswer => ({
  attemptId: id, questionKey: key, area: 'LR', source: 'lr_attempts', mode: 'adaptive', correct, gradedAt: date, topic,
});

describe('first-answer History and Topics', () => {
  it('excludes future-created RC answers from history, first identity, repeats and full chronology until the snapshot advances', () => {
    const asOf = '2026-10-01T00:00:00Z';
    const coverage: ProgressCoverage = { includedSources: ['lr_attempts', 'lr_section_history', 'rc_attempts'], missingSources: [], excludedRows: {} };
    const answers = adaptRcAttempts([
      { id: 'first', user_id: 'student', session_id: 'completed', passage_id: 11, question_id: 1, selected: 'B', is_correct: false, created_at: '2026-09-26T00:00:00Z' },
      { id: 'future-review', user_id: 'student', session_id: 'completed', passage_id: 11, question_id: 1, selected: 'C', is_correct: true, created_at: '2026-10-02T00:00:00Z' },
      { id: 'future-first', user_id: 'student', session_id: 'completed', passage_id: 11, question_id: 2, selected: 'C', is_correct: true, created_at: '2026-10-02T00:00:00Z' },
    ], [{ id: 'completed', user_id: 'student', status: 'completed', completed_at: '2026-09-27T00:00:00Z', excluded_from_analytics: false, practice_test_run_id: null, config: { resultsRevealedAt: '2026-09-27T00:00:00Z' } }], 'student', new Set());

    // The adapter preserves saved dates; snapshot projections, not backdating, hide future rows.
    expect(answers.find(row => row.attemptId === 'rc_attempts:future-review')?.gradedAt).toBe('2026-10-02T00:00:00Z');
    expect(firstAnswerDetails(answers, 'all', asOf).history.map(row => [row.attemptId, row.isFirst])).toEqual([['rc_attempts:first', true]]);
    const model = buildPrototypeModel(answers, coverage, 'all', asOf);
    expect(model.progress.RC).toMatchObject({ correct: 0, denominator: 1, evidenceAttemptIds: ['rc_attempts:first'] });
    expect(model.progress.repeatCount).toBe(0);
    expect(model.allAnswers.map(row => row.attemptId)).toEqual(['rc_attempts:first']);

    const advanced = buildPrototypeModel(answers, coverage, 'all', '2026-10-03T00:00:00Z');
    expect(advanced.progress.RC).toMatchObject({ correct: 1, denominator: 2 });
    expect(advanced.progress.repeatCount).toBe(1);
    expect(advanced.history.find(row => row.attemptId === 'rc_attempts:future-review')?.isFirst).toBe(false);
    expect(advanced.allAnswers).toHaveLength(3);
  });

  it('uses one inclusive saved-date window and excludes undated work', () => {
    expect(inProgressWindow('2026-09-21', 7, '2026-09-28')).toBe(true);
    expect(inProgressWindow('2026-09-20', 7, '2026-09-28')).toBe(false);
    expect(inProgressWindow('unknown', 'all', '2026-09-28')).toBe(false);
  });
  it('shows a repeat in History but excludes it from the window topic denominator', () => {
    const details = firstAnswerDetails([
      answer('old', 'LR:q1', '2026-08-01', false, 'Weaken'),
      answer('repeat', 'LR:q1', '2026-09-27', true, 'Weaken'),
      answer('new', 'LR:q2', '2026-09-27', true, 'Weaken'),
    ], 7, '2026-09-28');
    expect(details.history.map((row) => [row.attemptId, row.isFirst])).toEqual([['repeat', false], ['new', true]]);
    expect(details.topics).toEqual([{ topic: 'Weaken', correct: 1, denominator: 1, percent: null, evidenceAttemptIds: ['new'] }]);
  });

  it('shows each persisted attempt once in History and Topics after overlapping reads', () => {
    const first = answer('attempts:first', 'LR:q1', '2026-09-26', false, 'Weaken');
    const repeat = answer('attempts:repeat', 'LR:q1', '2026-09-27', true, 'Weaken');
    const details = firstAnswerDetails([repeat, first, { ...first }, { ...repeat }], 7, '2026-09-28');
    expect(details.history.map((row) => [row.attemptId, row.isFirst])).toEqual([
      ['attempts:repeat', false], ['attempts:first', true],
    ]);
    expect(details.topics).toEqual([{
      topic: 'Weaken', correct: 0, denominator: 1, percent: null, evidenceAttemptIds: ['attempts:first'],
    }]);
  });

  it('only groups persisted LR topics and discloses untyped first answers', () => {
    const details = firstAnswerDetails([
      answer('a', 'LR:a', '2026-09-27', false),
      { ...answer('rc', 'RC:p1:q1', '2026-09-27', true, 'Inference'), area: 'RC', source: 'rc_attempts' },
      ...[1, 2, 3].map((n) => answer(`w${n}`, `LR:w${n}`, '2026-09-27', n !== 1, 'Weaken')),
    ], 'all', '2026-09-28');
    expect(details.untypedFirstAnswers).toBe(1);
    expect(details.topics).toEqual([{ topic: 'Weaken', correct: 2, denominator: 3, percent: 67, evidenceAttemptIds: ['w3', 'w2', 'w1'] }]);
  });
});
