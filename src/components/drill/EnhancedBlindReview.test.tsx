import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EnhancedBlindReview } from './EnhancedBlindReview';
import type { DrillSession } from '@/types/drill';

const mockGetQuestion = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/lib/questionLoader', () => ({
  questionBank: {
    getQuestion: (qid: string) => mockGetQuestion(qid),
  },
}));
vi.mock('@/hooks/useQuestionHighlights', () => ({
  useQuestionHighlights: () => ({
    highlightsFor: () => [],
    applySelection: vi.fn(),
    removeHighlight: vi.fn(),
    undo: vi.fn(),
  }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          in: async () => ({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

const session: DrillSession = {
  mode: 'full-section',
  fullSectionConfig: { pt: 130, section: 2, timer: { mode: '35', isPaused: false, elapsedMs: 0, startedAt: 0 } },
  questionQueue: ['retired-qid', 'live-qid'],
  currentIndex: 0,
  attempts: new Map([
    ['retired-qid', { selectedAnswer: 'A', correct: false, timeMs: 30_000, timestamp: 1, reviewDone: false }],
    ['live-qid', { selectedAnswer: 'B', correct: false, timeMs: 30_000, timestamp: 2, reviewDone: false }],
  ]),
};

describe('EnhancedBlindReview (F6)', () => {
  beforeEach(() => {
    mockGetQuestion.mockReset();
  });

  it('never stalls on Loading... when a question was retired from the bank and keeps that question untouched', () => {
    mockGetQuestion.mockImplementation((qid: string) => {
      if (qid === 'live-qid') {
        return {
          qid: 'live-qid',
          pt: 130,
          section: 2,
          qnum: 2,
          qtype: 'Flaw',
          difficulty: 3,
          stimulus: 'Live stimulus text.',
          questionStem: 'Which one is the flaw?',
          answerChoices: {
            A: 'Choice A',
            B: 'Choice B',
            C: 'Choice C',
            D: 'Choice D',
            E: 'Choice E',
          },
          correctAnswer: 'C',
        };
      }
      return undefined;
    });

    const onComplete = vi.fn();
    render(
      <EnhancedBlindReview
        session={session}
        reviewQids={['retired-qid', 'live-qid']}
        onComplete={onComplete}
        onBack={vi.fn()}
      />,
    );

    expect(screen.queryByText('Loading...')).toBeNull();
    expect(screen.getByText(/no longer available/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    expect(screen.getByText('Live stimulus text.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit blind review' }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const results = onComplete.mock.calls[0][0] as Array<{ qid: string; brAnswer: string }>;
    expect(results.find((r) => r.qid === 'retired-qid')).toBeUndefined();
    expect(results.find((r) => r.qid === 'live-qid')?.brAnswer).toBe('C');
  });
});
