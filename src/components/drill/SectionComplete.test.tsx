import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SectionComplete } from './SectionComplete';

describe('SectionComplete sealed assignment guard (F1)', () => {
  it('hides Peek at score and Skip to results when the section is sealed behind blind review', () => {
    render(
      <SectionComplete
        sealed
        onBlindReview={vi.fn()}
        onSeeResults={vi.fn()}
        onBackHome={vi.fn()}
        score={18}
        total={25}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Peek at score' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Skip to results' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Blind review' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to Home' })).toBeTruthy();
  });

  it('shows Peek at score and Skip to results when not sealed', () => {
    render(
      <SectionComplete
        onBlindReview={vi.fn()}
        onSeeResults={vi.fn()}
        score={18}
        total={25}
      />,
    );

    expect(screen.getByRole('button', { name: 'Peek at score' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Skip to results' })).toBeTruthy();
  });
});
