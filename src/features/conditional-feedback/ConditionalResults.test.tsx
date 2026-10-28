import { fireEvent, render, screen, within, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResultBadge, ResultDistribution } from './ConditionalResults';
afterEach(cleanup);
describe('conditional result primitives', () => {
  it('retains exact counts and exposes actions only for nonempty segments', () => {
    const select = vi.fn();
    render(<ResultDistribution title="This round" onSelect={select} segments={[
      { id: 'correct', label: 'Correct first time', count: 2, tone: 'correct' },
      { id: 'missed', label: 'Needs review', count: 1, tone: 'missed' },
      { id: 'empty', label: 'Unchecked', count: 0, tone: 'neutral' },
    ]} />);
    const section = screen.getByRole('region', { name: 'This round' });
    expect(within(section).getByText('3 total')).toBeInTheDocument();
    expect(within(section).getByText('2 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Needs review/ }));
    expect(select).toHaveBeenCalledWith('missed');
    expect(screen.queryByRole('button', { name: /Unchecked/ })).toBeNull();
  });
  it('does not use the graphic or colour as the only source of status', () => {
    render(<ResultBadge tone="revealed" label="Answer shown" />);
    expect(screen.getByText('Answer shown')).toBeInTheDocument();
    expect(screen.getByText('Answer shown').previousElementSibling).toHaveAttribute('aria-hidden', 'true');
  });
  it('keeps a zero-result display finite and honest', () => {
    render(<ResultDistribution title="No attempt" segments={[{ id: 'a', label: 'Unchecked', count: 0, tone: 'neutral' }]} />);
    expect(screen.getByText('0 of 0')).toBeInTheDocument();
    expect(screen.getByText('No results yet.')).toBeInTheDocument();
  });
});
