import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FinderLrPreview } from './FinderLrPreview';
import type { LRQuestion } from '@/lib/questionLoader';

export const previewQuestion = {
  qid: 'PT90-S1-Q12', pt: 90, section: 1, qnum: 12, qtype: 'Flaw',
  stimulus: 'The ecologist considers drought.', questionStem: 'Which is a flaw?',
  answerChoices: { A: 'First', B: 'Second', C: 'Third', D: 'Fourth', E: 'Fifth' },
  correctAnswer: 'B', answerChoiceExplanations: { B: { verdict: 'correct', whyCorrect: 'The missing possibility.' } },
} as LRQuestion;

describe('FinderLrPreview', () => {
  it('shows the complete question but hides correctness and explanations until reveal', () => {
    render(<FinderLrPreview question={previewQuestion} onClose={vi.fn()} onRestoreFocus={vi.fn()} />);
    expect(screen.getByText(previewQuestion.stimulus)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.queryByText('Correct answer')).toBeNull();
    expect(screen.queryByText('The missing possibility.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }));
    expect(screen.getByText('Correct answer')).toBeInTheDocument();
    expect(screen.getByText('The missing possibility.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide answer' }));
    expect(screen.queryByText('Correct answer')).toBeNull();
  });
  it('closes on Back without running an attempt', () => {
    const close = vi.fn();
    render(<FinderLrPreview question={previewQuestion} onClose={close} onRestoreFocus={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(close).toHaveBeenCalledOnce();
  });
});
