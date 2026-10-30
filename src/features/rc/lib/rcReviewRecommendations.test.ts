import { describe, expect, it } from 'vitest';
import { rcReviewRecommendations } from './rcReviewRecommendations';
import type { RcSessionItem } from './rcSession';
import type { RcAttempt } from './rcTypes';
import type { RcLearningEvent } from './rcLearning';
const items = [1, 2, 3].map(questionId => ({ passage: { passageId: 7, preptest: 140, section: 1, setNumber: 1 }, question: { questionId, position: questionId } })) as RcSessionItem[];
const attempts = new Map([[1, { selected: 'A', flagged: true, timeMs: 95000, isCorrect: true }], [2, { selected: null, flagged: false, timeMs: 1000, isCorrect: null }], [3, { selected: 'B', flagged: false, timeMs: 5000, isCorrect: false }]]) as Map<number, RcAttempt>;
const preferences = { flagged: true, unanswered: true, lowConfidence: true, timeThresholdMs: 90000 };
describe('spoiler-safe review reasons', () => {
  it('uses only selected observations and leaves missing confidence unknown', () => {
    const rows = rcReviewRecommendations(items, attempts, [], preferences);
    expect(rows.map(row => row.questionId)).toEqual([1, 2]);
    expect(rows[0].reasons).toEqual(['Flagged', 'Recorded question time over 90 seconds']);
    expect(rows[1].reasons).toEqual(['Unanswered']);
  });
  it('does not change when correctness or the credited answer changes', () => {
    const changed = new Map([...attempts].map(([id, row]) => [id, { ...row, isCorrect: !row.isCorrect }]));
    const changedItems = items.map(item => ({ ...item, question: { ...item.question, correctAnswer: 'E' as const } }));
    expect(rcReviewRecommendations(changedItems, changed, [], preferences)).toEqual(rcReviewRecommendations(items, attempts, [], preferences));
  });
  it('uses the latest explicitly reported confidence for the exact question and passage', () => {
    const learning = [{ passageId: 7, questionId: 3, kind: 'confidence', value: 'low' }, { passageId: 99, questionId: 1, kind: 'confidence', value: 'low' }] as RcLearningEvent[];
    expect(rcReviewRecommendations(items, attempts, learning, preferences).at(-1)?.reasons).toEqual(['Low confidence (your report)']);
    learning.push({ passageId: 7, questionId: 3, kind: 'confidence', value: 'high' } as RcLearningEvent);
    expect(rcReviewRecommendations(items, attempts, learning, preferences).map(row => row.questionId)).toEqual([1, 2]);
  });
});
