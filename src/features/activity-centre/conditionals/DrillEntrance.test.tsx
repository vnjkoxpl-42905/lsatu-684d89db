import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DrillEntrance } from './DrillEntrance';

describe('embedded conditional practice instructions', () => {
  afterEach(cleanup);
  it('uses a subordinate heading and accurately describes a filtered untimed round', () => {
    render(<DrillEntrance mode="general" title="Conditional Rephrase" headingLevel={2} timingPlan="untimed" questionCount={4} onStart={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Conditional Rephrase' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByText('4 questions')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Work without a timer' })).toBeInTheDocument();
    expect(screen.queryByText('Three phases')).not.toBeInTheDocument();
  });
  it('describes the actual timed diagram window separately from answering', () => {
    render(<DrillEntrance mode="general" title="Conditional Rephrase" headingLevel={2} timingPlan="timed" questionCount={3} onStart={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '45 seconds per diagram' })).toBeInTheDocument();
    expect(screen.getByText(/Choosing and checking an answer is untimed/)).toBeInTheDocument();
    expect(screen.queryByText('Three phases')).not.toBeInTheDocument();
  });
  it('keeps the standalone original progression when no embedded configuration is supplied', () => {
    render(<DrillEntrance mode="general" title="General Conditionals" questionCount={62} onStart={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'General Conditionals' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Three phases' })).toBeInTheDocument();
    expect(screen.getByText('38–62')).toBeInTheDocument();
  });
});
