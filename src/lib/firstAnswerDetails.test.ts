import { describe, expect, it } from 'vitest';
import { firstAnswerDetails, inProgressWindow } from './firstAnswerDetails';
import type { GradedQuestionAnswer } from './firstAnswerProgress';

const answer = (id: string, key: string, date: string, correct: boolean, topic?: string): GradedQuestionAnswer => ({
  attemptId: id, questionKey: key, area: 'LR', source: 'lr_attempts', mode: 'adaptive', correct, gradedAt: date, topic,
});

describe('first-answer History and Topics', () => {
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
