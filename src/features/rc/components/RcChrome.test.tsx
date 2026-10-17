import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RcPager } from './RcChrome';
import type { RcPagerEntry } from '../lib/rcSession';

const entries: RcPagerEntry[] = [
  { kind: 'question', passageId: 10, questionId: 101, index: 0, label: '1', sourceLabel: 'PT 140 · Section 4 · Passage 3 · Question 17', passageLabel: 'PT 140 · Section 4 · Passage 3 · Science' },
  { kind: 'divider', passageId: 20, index: -1, label: '' },
  { kind: 'question', passageId: 20, questionId: 202, index: 1, label: '2', sourceLabel: 'PT 111 · Section 2 · Passage 1 · Question 6', passageLabel: 'PT 111 · Section 2 · Passage 1 · Law' },
];
const props = () => ({ entries, currentIndex: 0, pillState: () => '', pillStatus: () => 'answered' as const,
  isFlagged: (entry: RcPagerEntry) => entry.questionId === 202, onNavigate: vi.fn(), onPrev: vi.fn(), onNext: vi.fn(), canPrev: false, canNext: true });

describe('RC passage-grouped question navigation', () => {
  it('keeps mixed source identities distinct from drill ordinals and navigates from each group', () => {
    const controls = props();
    render(<RcPager {...controls} />);
    const first = screen.getByRole('region', { name: 'PT 140 · Section 4 · Passage 3 · Science' });
    const second = screen.getByRole('region', { name: 'PT 111 · Section 2 · Passage 1 · Law' });
    expect(within(first).getByRole('button', { name: /Question 17 \(1 of 2\), answered/ })).toHaveAttribute('aria-current', 'true');
    const destination = within(second).getByRole('button', { name: /Question 6 \(2 of 2\), answered, flagged/ });
    fireEvent.click(destination);
    expect(controls.onNavigate).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    expect(controls.onNext).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Previous question' })).toBeDisabled();
  });

  it('announces only answered status until the reveal provider permits correctness', () => {
    const controls = props();
    const view = render(<RcPager {...controls} />);
    expect(screen.queryByRole('button', { name: /, correct|, incorrect/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Question 17 \(1 of 2\), answered/ })).toHaveLength(2);
    view.rerender(<RcPager {...controls} pillStatus={(entry) => entry.questionId === 101 ? 'correct' : 'incorrect'} />);
    expect(screen.getAllByRole('button', { name: /Question 17 \(1 of 2\), correct/ })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /Question 6 \(2 of 2\), incorrect, flagged/ })).toHaveLength(2);
  });
});
