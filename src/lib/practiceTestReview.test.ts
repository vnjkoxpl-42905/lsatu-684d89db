import { describe, expect, it } from 'vitest';
import { mapLrReviewQuestions, mapRcReviewQuestions } from './practiceTestReview';

describe('mapLrReviewQuestions', () => {
  it('uses the saved first answer and saved timing, not later blind review', () => {
    expect(mapLrReviewQuestions([{
      qid: 'PT101-S2-Q3', qnum: 3, qtype: 'Flaw', initialAnswer: 'B',
      correctAnswer: 'C', initialCorrect: false, brAnswer: 'C', timeMs: 81000, flagged: true,
    }], 'run-1')).toEqual([expect.objectContaining({
      id: 'PT101-S2-Q3', selected: 'B', correctAnswer: 'C', correct: false,
      blindReviewAnswer: 'C', timeMs: 81000, flagged: true,
      href: expect.stringContaining('qids=PT101-S2-Q3'),
    })]);
  });

  it('preserves unanswered and older missing detail honestly', () => {
    expect(mapLrReviewQuestions([{ qid: 'PT101-S2-Q4', qnum: 4, initialAnswer: '—', correctAnswer: 'A' }], 'run-1'))
      .toEqual([expect.objectContaining({ selected: null, correct: null, timeMs: null, flagged: null })]);
    expect(mapLrReviewQuestions(null, 'run-1')).toEqual([]);
  });
});

describe('mapRcReviewQuestions', () => {
  it('uses only the supplied first attempt and links to the completed session review', () => {
    const passages = [{ text: 'The passage text', questions: [{ questionId: 481, position: 7, questionType: 'Inference', prompt: 'Which inference?', correctAnswer: 'D', choices: [{ letter: 'D', text: 'The supported inference' }] }] }] as Parameters<typeof mapRcReviewQuestions>[0];
    expect(mapRcReviewQuestions(passages, [{ question_id: 481, selected: 'B', is_correct: false, time_ms: 42000, flagged: true }], 'session-1'))
      .toEqual([expect.objectContaining({
        number: 7, selected: 'B', correctAnswer: 'D', correct: false,
        timeMs: 42000, flagged: true, href: '/rc/drill?sessionId=session-1&review=1&q=481',
        rcContent: { passage: 'The passage text', prompt: 'Which inference?', choices: [{ letter: 'D', text: 'The supported inference' }] },
      })]);
  });
});
