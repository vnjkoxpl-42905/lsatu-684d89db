import { describe, expect, it } from 'vitest';
import { drillQuestionIds, drillReviewProgress, missedQuestionIds, questionOutcome, type DrillReviewSource } from './drillReview';

const sitting = (overrides: Partial<DrillReviewSource> & { attempts?: Array<{ qid: string; correct: boolean }> } = {}): DrillReviewSource => ({
  source_key: 'drill::type-drill::x',
  reviewed_qids: overrides.reviewed_qids,
  session: {
    status: 'completed',
    question_queue: ['q1', 'q2', 'q3', 'q4'],
    attempts: (overrides.attempts ?? [
      { qid: 'q1', correct: true }, { qid: 'q2', correct: false }, { qid: 'q3', correct: false },
    ]).map((attempt) => ({ ...attempt, selected_answer: 'A', time_ms: 0 })),
  },
} as unknown as DrillReviewSource);

describe('drill review progress', () => {
  it('counts wrong and unanswered questions as needing review, in drill order', () => {
    const run = sitting();
    expect(missedQuestionIds(run)).toEqual(['q2', 'q3', 'q4']);
    expect(questionOutcome(run, 'q4')).toBe('unanswered');
    expect(questionOutcome(run, 'q1')).toBe('correct');
  });

  it('moves from none reviewed, to some, to done, and names the next question', () => {
    expect(drillReviewProgress(sitting())).toMatchObject({ reviewed: 0, next: 'q2', done: false });
    expect(drillReviewProgress(sitting({ reviewed_qids: ['q3', 'q1'] }))).toMatchObject({ reviewed: 1, next: 'q2', done: false });
    expect(drillReviewProgress(sitting({ reviewed_qids: ['q2', 'q3', 'q4'] }))).toMatchObject({ reviewed: 3, next: null, done: true });
  });

  it('treats a perfect drill as having nothing to review', () => {
    const run = sitting({ attempts: [{ qid: 'q1', correct: true }, { qid: 'q2', correct: true }, { qid: 'q3', correct: true }, { qid: 'q4', correct: true }] });
    expect(drillReviewProgress(run)).toMatchObject({ missed: [], done: true, next: null });
  });

  it('reviews only what a Smart Drill actually asked, not its whole queue', () => {
    const run = { ...sitting({ attempts: [{ qid: 'q2', correct: false }] }), source_key: 'drill::adaptive' } as DrillReviewSource;
    expect(drillQuestionIds(run)).toEqual(['q2']);
    expect(missedQuestionIds(run)).toEqual(['q2']);
  });

  it('prefers a live set of opened questions over the saved one', () => {
    expect(drillReviewProgress(sitting(), new Set(['q2', 'q3', 'q4'])).done).toBe(true);
  });
});
