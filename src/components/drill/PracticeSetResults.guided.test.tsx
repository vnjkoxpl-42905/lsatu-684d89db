import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { guidedSessionToDrillSession, type GuidedDrillSession } from '@/lib/guidedDrillSession';
import type { DrillSession } from '@/types/drill';

// The scorecard resolves every qid through the bank, so the bank is what turns
// a stored queue back into something a student can read.
const mockQuestions = [
  { qid: 'q1', pt: 116, section: 3, qnum: 20, qtype: 'Flaw', difficulty: 4, correctAnswer: 'E' },
  { qid: 'q2', pt: 116, section: 3, qnum: 21, qtype: 'Must Be True', difficulty: 2, correctAnswer: 'B' },
  { qid: 'q3', pt: 116, section: 3, qnum: 22, qtype: 'Weaken', difficulty: 3, correctAnswer: 'A' },
];

vi.mock('@/lib/questionLoader', () => ({
  questionBank: {
    getQuestion: (qid: string) => mockQuestions.find((q) => q.qid === qid),
  },
}));

import { PracticeSetResults } from './PracticeSetResults';

function finishedRun(): GuidedDrillSession {
  return {
    id: '00000000-0000-4000-8000-000000000000',
    user_id: '00000000-0000-4000-8000-000000000001',
    pool_slug: 'guided::abc',
    completion_id: 'guided::abc',
    question_queue: ['q1', 'q2', 'q3'],
    current_index: 2,
    attempts: [
      { qid: 'q1', selected_answer: 'E', correct: true, time_ms: 62_000 },
      { qid: 'q2', selected_answer: 'D', correct: false, time_ms: 41_000 },
    ],
    status: 'completed',
    started_at: '2026-08-20T21:00:00.000Z',
    updated_at: '2026-08-20T21:40:00.000Z',
  } as GuidedDrillSession;
}

function renderReview(overrides: Record<string, unknown> = {}) {
  const session = guidedSessionToDrillSession(finishedRun()) as DrillSession;
  render(
    <PracticeSetResults
      session={session}
      title="Abstract + Flaw (set 1)"
      subtitle="You completed this on August 20."
      onBack={() => {}}
      onRetry={() => {}}
      {...overrides}
    />,
  );
}

// This is the bug Celia reported: she finished the drill, reopened it, and her
// completed questions were gone. These assert the reopened view actually shows
// the run back to her.
describe('a finished guided drill, reopened', () => {
  it('names the drill she finished rather than the practice-set default', () => {
    renderReview();
    expect(screen.getByText('Abstract + Flaw (set 1)')).toBeInTheDocument();
    expect(screen.queryByText('Practice Set Results')).not.toBeInTheDocument();
  });

  it('shows the questions she actually answered', () => {
    renderReview();
    expect(screen.getByText('PT116-S3-Q20')).toBeInTheDocument();
    expect(screen.getByText('PT116-S3-Q21')).toBeInTheDocument();
  });

  it('scores the run off her stored answers', () => {
    renderReview();
    // 2 answered, 1 correct → 50%
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('offers a fresh attempt, and only on request', () => {
    const onRetry = vi.fn();
    renderReview({ onRetry });
    fireEvent.click(screen.getByRole('button', { name: /fresh attempt/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('hides the in-runner review buttons, which have no session to act on here', () => {
    renderReview();
    expect(screen.queryByRole('button', { name: /Review All/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Review Wrong/i })).not.toBeInTheDocument();
  });
});
