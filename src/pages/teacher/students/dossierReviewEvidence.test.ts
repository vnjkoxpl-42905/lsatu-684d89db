import { describe, expect, it } from 'vitest';
import type { GradedQuestionAnswer } from '@/lib/firstAnswerProgress';
import { selectDossierReviewEvidence } from './dossierReviewEvidence';

function answer(input: Partial<GradedQuestionAnswer> & Pick<GradedQuestionAnswer, 'attemptId' | 'questionKey' | 'correct' | 'gradedAt'>): GradedQuestionAnswer {
  return { area: 'LR', source: 'lr_attempts', mode: 'adaptive', ...input };
}

describe('selected student review evidence', () => {
  it('keeps a first miss even after a correct reattempt, with one row per question', () => {
    const rows = selectDossierReviewEvidence([
      answer({ attemptId: 'later', questionKey: 'LR:PT80-S2-Q14', correct: true, gradedAt: '2026-09-02T12:00:00Z' }),
      answer({ attemptId: 'first', questionKey: 'LR:PT80-S2-Q14', correct: false, gradedAt: '2026-09-01T12:00:00Z', topic: 'Necessary Assumption' }),
      answer({ attemptId: 'clean', questionKey: 'LR:PT80-S2-Q15', correct: true, gradedAt: '2026-09-03T12:00:00Z' }),
    ]);

    expect(rows).toEqual([expect.objectContaining({ key: 'LR:PT80-S2-Q14', label: 'PT80-S2-Q14', topic: 'Necessary Assumption' })]);
  });

  it('includes graded RC misses and excludes invalid dates', () => {
    const rows = selectDossierReviewEvidence([
      answer({ attemptId: 'rc', questionKey: 'RC:8:3', area: 'RC', source: 'rc_attempts', mode: 'rc-drill', correct: false, gradedAt: '2026-09-04T12:00:00Z' }),
      answer({ attemptId: 'bad', questionKey: 'LR:bad', correct: false, gradedAt: 'not-a-date' }),
    ]);

    expect(rows).toEqual([expect.objectContaining({ label: 'Passage 8, question 3', source: 'Completed RC drill' })]);
  });
});
