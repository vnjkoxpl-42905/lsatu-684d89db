import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SectionReviewWalk from '@/components/drill/SectionReviewWalk';
import { sectionHistoryToWalkSession } from './sectionWalkAdapter';
import type { SectionHistoryRow } from '@/lib/sectionHistory';

const mockGetQuestion = vi.fn();

vi.mock('@/lib/questionLoader', () => ({
  questionBank: {
    getQuestion: (qid: string) => mockGetQuestion(qid),
  },
}));
vi.mock('@/hooks/useLrExplanation', () => ({
  useLrExplanation: () => ({ data: null }),
}));
vi.mock('@/hooks/useQuestionHighlights', () => ({
  useQuestionHighlights: () => ({
    highlightsFor: () => [],
    applySelection: vi.fn(),
    removeHighlight: vi.fn(),
  }),
}));

const savedRow: SectionHistoryRow = {
  id: 'hist-walk-1',
  practiceTestRunId: null,
  pt: 130,
  section: 1,
  mode: 'full-section',
  initialScore: 1,
  initialTotal: 2,
  initialPercent: 50,
  brScore: 2,
  brPercent: 100,
  brDelta: 1,
  brUsed: true,
  totalTimeMs: 120_000,
  avgTimeMs: 60_000,
  unansweredCount: 0,
  byQtype: {},
  byDifficulty: {},
  questions: [
    {
      qid: 'q-changed-key',
      qnum: 1,
      qtype: 'Flaw',
      difficulty: 3,
      initialAnswer: 'B',
      correctAnswer: 'B', // Saved credited answer was B; bank now says D
      initialCorrect: true,
      timeMs: 60_000,
      switchCount: 0,
      flagged: false,
    },
    {
      qid: 'q-removed-from-bank',
      qnum: 2,
      qtype: 'Weaken',
      difficulty: 4,
      initialAnswer: 'A',
      correctAnswer: 'C',
      initialCorrect: false,
      brAnswer: 'C',
      brCorrect: true,
      brChanged: true,
      timeMs: 60_000,
      switchCount: 1,
      flagged: false,
    },
  ],
  analysis: null,
  completedAt: '2026-11-23T10:00:00Z',
};

describe('SectionReviewWalk with saved section history', () => {
  beforeEach(() => {
    mockGetQuestion.mockReset();
  });

  it('grades from the saved credited answer even if the bank key changed and labels current wording', () => {
    mockGetQuestion.mockImplementation((qid: string) => {
      if (qid === 'q-changed-key') {
        return {
          qid: 'q-changed-key',
          pt: 130,
          section: 1,
          qnum: 1,
          qtype: 'Flaw',
          difficulty: 3,
          stimulus: 'Stimulus text.',
          questionStem: 'Which one is the flaw?',
          answerChoices: { A: 'Choice A', B: 'Choice B', C: 'Choice C', D: 'Choice D', E: 'Choice E' },
          correctAnswer: 'D', // Changed in the bank!
        };
      }
      return null;
    });

    const walk = sectionHistoryToWalkSession(savedRow);
    expect(walk.savedCorrectAnswers['q-changed-key']).toBe('B');

    render(
      <SectionReviewWalk
        session={walk.session}
        brResults={walk.brResults}
        savedCorrectAnswers={walk.savedCorrectAnswers}
        savedStatsByQid={walk.savedStatsByQid}
        onBack={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Current question wording\. Graded from the credited answer saved with this section\./),
    ).toBeTruthy();

    // Switch to Actual tab and toggle Show answers
    fireEvent.click(screen.getByRole('tab', { name: 'Actual' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Show answers' }));

    // Choice B should be marked correct (from savedCorrectAnswers), not D.
    expect(screen.getByText(/First answer: B/)).toBeTruthy();
  });

  it('shows saved outcome and explicit message when a question is no longer in the bank', () => {
    mockGetQuestion.mockReturnValue(null);
    const walk = sectionHistoryToWalkSession(savedRow);

    render(
      <SectionReviewWalk
        session={walk.session}
        brResults={walk.brResults}
        savedCorrectAnswers={walk.savedCorrectAnswers}
        savedStatsByQid={walk.savedStatsByQid}
        initialIndex={1}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText('Question text is no longer available.')).toBeTruthy();
    expect(screen.queryByText('Loading…')).toBeNull();
    expect(screen.getByText(/Missed/)).toBeTruthy();
    expect(screen.getByText(/Blind review answer:/)).toBeTruthy();

    // Toggle Show answers to reveal saved credited answer C
    fireEvent.click(screen.getByRole('switch', { name: 'Show answers' }));
    expect(screen.getByText(/Saved credited answer:/)).toBeTruthy();
  });
});
