import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import {
  CONCLUSION_TYPE_META,
  conclusionTypeMeta,
  ORDERED_CANONICAL_CONCLUSION_TYPE_QUESTIONS,
  type ConclusionType,
} from '@/bootcamps/main-conclusion/data/reference-drills/conclusionTypeQuestions';

import { ConclusionTypeLab } from './ConclusionTypeLab';

vi.mock('@/bootcamps/main-conclusion/hooks/useUser', () => ({
  useUser: () => ({ id: 'student-1' }),
}));

const markDrillComplete = vi.fn();

vi.mock('@/bootcamps/main-conclusion/hooks/useModuleProgress', () => ({
  useModuleProgress: () => ({ markDrillComplete }),
}));

function renderLab() {
  return render(
    <MemoryRouter>
      <ConclusionTypeLab />
    </MemoryRouter>,
  );
}

function optionName(type: ConclusionType) {
  return new RegExp(conclusionTypeMeta(type).label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function choose(type: ConclusionType) {
  fireEvent.click(screen.getByRole('radio', { name: optionName(type) }));
}

function reveal() {
  fireEvent.click(screen.getByRole('button', { name: /reveal the type/i }));
}

function advance() {
  fireEvent.click(screen.getByRole('button', { name: /next question|finish drill/i }));
}

describe('ConclusionTypeLab', () => {
  it('teaches the weakness on reveal and carries first-pick misses into review', () => {
    renderLab();

    const firstOptions = screen.getAllByRole('radio');
    expect(firstOptions).toHaveLength(CONCLUSION_TYPE_META.length);
    expect(firstOptions[0]).not.toHaveClass('ctlab__option--correct');
    expect(firstOptions[0]).not.toHaveClass('ctlab__option--wrong');

    choose('causal');
    reveal();

    const teachBlock = screen.getByRole('status');
    expect(within(teachBlock).getByText(/^It is a Recommendation$/)).toBeInTheDocument();
    expect(screen.getByText(/predictable weakness/i)).toBeInTheDocument();
    expect(screen.getByText(/staggering beats the costs and the alternatives/i)).toBeInTheDocument();

    advance();

    ORDERED_CANONICAL_CONCLUSION_TYPE_QUESTIONS.slice(1).forEach((question) => {
      choose(question.answer);
      reveal();
      advance();
    });

    expect(markDrillComplete).toHaveBeenCalledWith('MC-DRL-CT');
    const slippedCard = screen.getByText(/where it slipped/i).closest('.ctlab__review-card');
    expect(slippedCard).not.toBeNull();
    expect(within(slippedCard as HTMLElement).getByText(/^Recommendation$/)).toBeInTheDocument();
    expect(within(slippedCard as HTMLElement).getByText(/1 miss/i)).toBeInTheDocument();
    expect(within(slippedCard as HTMLElement).getByText(/Watch whether the action actually beats its costs and alternatives/i)).toBeInTheDocument();

    const answerKey = screen.getByText(/answer key/i).closest('.ctlab__answer-key');
    expect(answerKey).not.toBeNull();
    fireEvent.click(within(answerKey as HTMLElement).getByRole('button', { name: /^Review question 1 \(missed\)$/i }));

    expect(screen.getByText(/answer key · q1/i)).toBeInTheDocument();
    expect(screen.getByText(/first pick: causal hypothesis/i)).toBeInTheDocument();
    expect(screen.getByText(/staggering beats the costs and the alternatives/i)).toBeInTheDocument();
  });
});
