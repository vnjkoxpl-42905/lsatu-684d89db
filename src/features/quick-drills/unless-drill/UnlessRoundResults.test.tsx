import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UnlessRoundResults, unlessOutcome } from './UnlessRoundResults';
describe('Unless round outcomes', () => {
  it('classifies a late correct arrangement as timeout, never success', () => {
    expect(unlessOutcome({ pattern: 1, seconds: 10, timedOut: true, verdict: 'correct' })).toEqual({ tone: 'missed', label: 'Time ran out' });
    expect(unlessOutcome({ pattern: 1, seconds: 4, timedOut: false, verdict: 'correct' }).tone).toBe('correct');
  });
  it('renders actual subset rounds and preserves elapsed time alongside timeout', () => {
    const select = vi.fn(); render(<UnlessRoundResults paceSeconds={10} onSelect={select} results={[{ pattern: 3, seconds: 10.2, timedOut: true, verdict: 'correct' }, { pattern: 1, seconds: 3.4, timedOut: false, verdict: 'correct' }]}/>);
    expect(screen.getByText('2 statements in this round. Each had a 10-second limit.')).toBeVisible();
    expect(screen.getByText('10.2s elapsed')).toBeVisible();
    expect(screen.getByText('3.4s elapsed')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Review statement 1, form 3: Time ran out' }));
    expect(select).toHaveBeenCalledWith(0);
    expect(screen.getAllByRole('button', { name: /Review statement/ })).toHaveLength(2);
  });
});
