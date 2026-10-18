import { describe, expect, it } from 'vitest';
import { firstRcAttempts, rcRetryPassageIds } from './rcRetrySelection';
import type { RcSessionItem } from './rcSession';
import type { RcAttempt } from './rcTypes';
const items = [[7, 10], [7, 11], [8, 12], [9, 13], [10, 14]].map(([passageId, questionId]) => ({ passage: { passageId }, question: { questionId } })) as RcSessionItem[];
const attempts = new Map([[10, { selected: 'B', isCorrect: false }], [11, { selected: 'C', isCorrect: false }], [12, { selected: null, isCorrect: null }], [13, { selected: 'A', isCorrect: true }]]) as Map<number, RcAttempt>;
describe('RC retry selection', () => {
  it('keeps the original first answer when historical duplicate first rows exist', () => {
    const rows = [{ questionId: 10, selected: 'B', isCorrect: false, isFirstAttempt: true }, { questionId: 10, selected: 'A', isCorrect: true, isFirstAttempt: true }, { questionId: 10, selected: 'C', isCorrect: false, isFirstAttempt: false }] as RcAttempt[];
    expect(firstRcAttempts(rows).get(10)).toBe(rows[0]);
  });
  it('deduplicates whole missed passages and excludes unanswered material by default', () => {
    expect(rcRetryPassageIds(items, attempts, false)).toEqual([7]);
  });
  it('includes skipped and missing answers only after the learner opts in', () => {
    expect(rcRetryPassageIds(items, attempts, true)).toEqual([7, 8, 10]);
  });
});
