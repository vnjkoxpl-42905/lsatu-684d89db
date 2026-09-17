import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { PaperDiagramPanel } from './PaperDiagramPanel';

vi.mock('./CoachFeedback', () => ({ CoachFeedback: () => <div>Feedback</div> }));

const prompt = 'Every approved request receives a reference number.';
function props(overrides: Partial<ComponentProps<typeof PaperDiagramPanel>> = {}): ComponentProps<typeof PaperDiagramPanel> {
  return {
    item: { order: 13, prompt, credited_answers: ['A → B'], explanation: 'Approval gives a reference number.' },
    choices: [{ id: 'a', routes: [{ ifSide: { text: 'approved', inverted: false }, thenSide: { text: 'reference', inverted: false } }], responseText: 'A → B', verdict: 'correct', feedback: 'Correct.' }],
    value: '', onChange: vi.fn(), onSubmit: vi.fn(), onRetry: vi.fn(), onShowAnswer: vi.fn(), onNext: vi.fn(),
    judging: false, attempts: 0, result: null, revealed: false, resolved: false, isLast: false,
    ...overrides,
  };
}

describe('timed paper diagram phase', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-17T12:00:00Z')); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('presents four labeled diagram and contrapositive pairs with accessible negations', () => {
    const base = props();
    const paired = Array.from({ length: 4 }, (_, index) => ({ ...base.choices[0], id: String(index),
      contrapositiveRoutes: [{ ifSide: { text: 'reference', inverted: true }, thenSide: { text: 'approved', inverted: true } }],
    }));
    render(<PaperDiagramPanel {...base} paperReady choices={paired} />);
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getAllByText('Diagram', { exact: true })).toHaveLength(4);
    expect(screen.getAllByText('Contrapositive', { exact: true })).toHaveLength(4);
    expect(screen.getAllByRole('img', { name: 'not approved' })).toHaveLength(4);
    expect(screen.getByRole('heading', { name: 'Which option matches the diagram you made?' })).toBeInTheDocument();
  });

  it('shows the statement while diagramming and hides it when the deadline expires', () => {
    const onPaperReady = vi.fn();
    render(<PaperDiagramPanel {...props({ diagramSeconds: 45, paperDeadline: '2026-09-17T12:00:45Z', onPaperReady })} />);
    expect(screen.getByText(prompt)).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off');
    act(() => vi.advanceTimersByTime(45_000));
    expect(onPaperReady).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(prompt)).not.toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(60_000));
    expect(onPaperReady).toHaveBeenCalledTimes(1);
  });

  it('uses the persisted absolute deadline instead of giving another full interval on reload', () => {
    vi.setSystemTime(new Date('2026-09-17T12:00:40Z'));
    render(<PaperDiagramPanel {...props({ diagramSeconds: 45, paperDeadline: '2026-09-17T12:00:45Z' })} />);
    expect(screen.getByRole('timer')).toHaveAccessibleName('5 seconds remaining');
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('opens choices immediately when resuming after the deadline', () => {
    render(<PaperDiagramPanel {...props({ diagramSeconds: 30, paperDeadline: '2026-09-17T11:59:59Z' })} />);
    expect(screen.queryByText(prompt)).not.toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('hides the expired statement even if the controlled save does not advance', () => {
    const onPaperReady = vi.fn();
    render(<PaperDiagramPanel {...props({ diagramSeconds: 30, paperReady: false, paperDeadline: '2026-09-17T12:00:30Z', onPaperReady })} />);
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.queryByText(prompt)).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to choices' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(30_000));
    expect(onPaperReady).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Continue to choices' }));
    expect(onPaperReady).toHaveBeenCalledTimes(2);
  });

  it('allows readiness before expiry without retaining a choice timer', () => {
    const onPaperReady = vi.fn();
    render(<PaperDiagramPanel {...props({ diagramSeconds: 30, paperDeadline: '2026-09-17T12:00:30Z', onPaperReady })} />);
    fireEvent.click(screen.getByRole('button', { name: 'I’m ready' }));
    expect(screen.queryByText(prompt)).not.toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(90_000));
    expect(onPaperReady).toHaveBeenCalledTimes(1);
  });

  it('keeps the timed prompt hidden across retries and restores it only for resolved feedback', () => {
    const base = props({ diagramSeconds: 30, paperReady: true, attempts: 1, result: { verdict: 'incorrect', feedback: 'Try again.' } });
    const { rerender } = render(<PaperDiagramPanel {...base} />);
    expect(screen.queryByText(prompt)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    rerender(<PaperDiagramPanel {...base} result={null} />);
    expect(screen.queryByText(prompt)).not.toBeInTheDocument();
    rerender(<PaperDiagramPanel {...base} resolved result={{ verdict: 'correct', feedback: 'Correct.' }} />);
    expect(screen.getByText(prompt)).toBeInTheDocument();
  });

  it('does not impose a timer on the untimed phase or duplicate its external statement', () => {
    render(<PaperDiagramPanel {...props({ phaseLabel: 'Phase 1: Untimed' })} />);
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByText(prompt)).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(120_000));
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'I’ve diagrammed it' }));
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });
});
