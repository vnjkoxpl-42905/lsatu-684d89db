import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RcAttempt, RcDrillSession, RcPassage } from '../lib/rcTypes';

const api = vi.hoisted(() => ({
  getSession: vi.fn(), getSessionAttempts: vi.fn(), recordAttempt: vi.fn(),
  saveSessionClock: vi.fn(), completeSession: vi.fn(),
  setAttemptFlag: vi.fn(),
}));
vi.mock('../api/rcProgress', () => ({ ...api, createSession: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student-one' } }) }));
vi.mock('../lib/rcBank', () => ({ loadPassages: async () => [passage], loadPassage: vi.fn() }));
vi.mock('../hooks/useRcA11y', () => ({ RC_FONT_SIZES: [100], useRcA11y: () => ({ settings: {}, fontScale: 1, update: vi.fn() }) }));
vi.mock('../hooks/useRcHighlights', () => ({ useRcHighlights: () => ({ forPassage: () => [] }) }));
vi.mock('@/components/drill/official/OfficialDrillFrame', () => ({
  default: ({ children, header, maxWidthClassName }: { children: ReactNode; header: ReactNode; maxWidthClassName?: string }) => <div data-testid="player-frame" data-width={maxWidthClassName}>{header}{children}</div>,
}));
vi.mock('@/components/drill/official/OfficialSessionStrip', () => ({
  default: ({ onComplete }: { onComplete?: () => void }) => onComplete ? <button onClick={onComplete}>Complete Drill</button> : null,
}));
vi.mock('@/components/drill/official/OfficialDrillToolbar', () => ({
  default: ({ timerLabel, leftTools }: { timerLabel: string; leftTools: ReactNode }) => <div>{leftTools}<output data-testid="clock">{timerLabel}</output></div>,
}));
vi.mock('@/components/drill/official/OfficialSmartDrillBar', () => ({
  default: ({ pager, onOpenMenu, menuLabel, onEnd, endLabel }: { pager: ReactNode; onOpenMenu: () => void; menuLabel: string; onEnd: () => void; endLabel: string }) => <div>{pager}<button onClick={onOpenMenu}>{menuLabel}</button><button onClick={onEnd}>{endLabel}</button></div>,
}));
vi.mock('../components/RcExamPane', () => ({
  rcTypeStyles: () => ({}),
  RcExamPane: ({ question, passageOnly }: { question: ReactNode; passageOnly: boolean }) => <div>{passageOnly ? <p>Full passage view</p> : question}</div>,
}));
vi.mock('../components/RcQuestionPane', () => ({
  RcQuestionPane: ({ item, selected, onSelect, onToggleFlag, interactionDisabled }: {
    item: { number: number }; selected: string; onSelect: (letter: string) => void; onToggleFlag(): void; interactionDisabled: boolean;
  }) => <div>
    <p>Question {item.number}: {selected ?? 'blank'}</p>
    <button disabled={interactionDisabled} onClick={() => onSelect('B')}>Choose B</button>
    <button disabled={interactionDisabled} onClick={onToggleFlag}>Toggle question flag</button>
  </div>,
}));
vi.mock('../components/RcChrome', () => ({
  formatClock: (seconds: number) => String(seconds),
  RcToolbarButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>, RcToolbarIcon: () => null,
  RcPager: ({ onNext, onPrev, onNavigate }: { onNext: () => void; onPrev: () => void; onNavigate: (index: number) => void }) => <div>
    <button onClick={onNext}>Next question</button>
    <button onClick={onPrev}>Previous question</button>
    <button onClick={() => onNavigate(1)}>Jump to question 2</button>
  </div>,
}));
vi.mock('../components/RcPassagePane', () => ({ RcPassagePane: () => null }));
vi.mock('../components/RcPassageSummary', () => ({ RcPassageSummary: () => null }));
vi.mock('../components/RcModals', () => ({
  RcQuestionDetails: () => <div role="dialog" aria-label="Question details">Question metadata</div>,
  RcSubmitConfirm: ({ onConfirm }: { onConfirm: () => void }) => <button onClick={onConfirm}>Confirm submission</button>,
  RcTextSettings: () => null,
}));
vi.mock('@/components/help/HelpSheet', () => ({ default: () => null }));

import RcPlayer from './RcPlayer';

const passage: RcPassage = {
  passageId: 10, preptest: 101, section: 2, setNumber: 1, title: null,
  topic: null, format: null, frameworks: [], difficulty: null, text: 'Passage text',
  summaries: { standard: null, brief: null, anotherWay: null },
  questions: [1, 2, 3].map((questionId) => ({
    questionId, position: questionId, questionType: 'Main point', questionTypeFamily: 'Main point',
    difficulty: null, prompt: `Question ${questionId}`, correctAnswer: 'A' as const, hasWrittenExplanation: false,
    explanationBlocks: [], totalResponses: null, features: [], choices: [{ letter: 'B' as const, text: 'Choice B', tag: null, percent: null, responseCount: null, correct: false, explanation: null }],
  })),
};
const session = (overrides: Partial<RcDrillSession['config']> = {}): RcDrillSession => ({
  id: 'session-one', userId: 'student-one', passageIds: [10], status: 'in_progress',
  excludedFromAnalytics: false, startedAt: '2026-09-01T00:00:00Z', completedAt: null,
  config: { reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 100 }, source: 'manual', clockElapsedSeconds: 12, ...overrides },
});
const attempt: RcAttempt = {
  id: 'answer-one', sessionId: 'session-one', questionId: 1, passageId: 10,
  selected: 'B', isCorrect: false, timeMs: 1000, flagged: false, eliminations: [], isFirstAttempt: true,
};

function mount(search = '') {
  return render(<MemoryRouter initialEntries={[`/rc/drill?sessionId=session-one${search}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><RcPlayer /><LocationProbe /></MemoryRouter>);
}
function LocationProbe() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}</output>; }
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  api.getSession.mockResolvedValue(session());
  api.getSessionAttempts.mockResolvedValue([]);
  api.saveSessionClock.mockResolvedValue(undefined);
  api.recordAttempt.mockImplementation(async (value: RcAttempt) => value);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('RC account save safety', () => {
  it('shows the current passage-only mode and gives reading the full canvas without saving', async () => {
    mount();
    await screen.findByText('Question 1: blank');
    const toggle = screen.getByRole('button', { name: 'Passage only' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('player-frame')).toHaveAttribute('data-width', 'max-w-none');
    expect(screen.getByText('Full passage view')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByText('Question 1: blank')).toBeInTheDocument();
    expect(api.saveSessionClock).not.toHaveBeenCalled();
    expect(api.recordAttempt).not.toHaveBeenCalled();
  });

  it('opens question details directly without changing answers or the session', async () => {
    mount();
    await screen.findByText('Question 1: blank');
    fireEvent.click(screen.getByRole('button', { name: 'Question details' }));
    expect(screen.getByRole('dialog', { name: 'Question details' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
    expect(api.recordAttempt).not.toHaveBeenCalled();
    expect(api.completeSession).not.toHaveBeenCalled();
  });

  it('saves and exits without completing the drill', async () => {
    mount();
    await screen.findByText('Question 1: blank');
    fireEvent.click(screen.getByRole('button', { name: 'Save and exit' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/rc'));
    expect(api.saveSessionClock).toHaveBeenCalled();
    expect(api.completeSession).not.toHaveBeenCalled();
  });

  it.each([
    { timedSectionSittingId: '10000000-0000-4000-8000-000000000001' },
    { practiceTestRunId: 'full-test', practiceTestLegIndex: 1 },
  ])('reviews protected completed answers and flags read-only without legacy source writes: %o', async marker => {
    api.getSession.mockResolvedValue({ ...session(marker), status: 'completed' });
    api.getSessionAttempts.mockResolvedValue([attempt]);
    mount('&review=1&q=1');
    await screen.findByText(/Review is read-only/);
    await screen.findByText('Question 1: B');
    expect(screen.getByRole('button', { name: 'Choose B' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Toggle question flag' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle question flag' }));
    fireEvent.keyDown(document, { key: 'b' });
    expect(api.recordAttempt).not.toHaveBeenCalled();
    expect(api.setAttemptFlag).not.toHaveBeenCalled();
    expect(api.saveSessionClock).not.toHaveBeenCalled();
    expect(api.completeSession).not.toHaveBeenCalled();
  });
  it('does not resume an in-progress protected sitting through a review link', async () => {
    const sitting = '10000000-0000-4000-8000-000000000001';
    api.getSession.mockResolvedValue(session({ timedSectionSittingId: sitting }));
    mount('&review=1');
    await screen.findByText(/clock remains paused/);
    expect(screen.getByTestId('location')).toHaveTextContent('/rc/drill');
    expect(api.recordAttempt).not.toHaveBeenCalled();
    expect(api.saveSessionClock).not.toHaveBeenCalled();
  });
  it('does not copy the visible question time onto untouched closeout rows', async () => {
    mount();
    expect(await screen.findByText('Question 1: blank')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Complete Drill' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm submission' }));
    await waitFor(() => expect(api.completeSession).toHaveBeenCalledWith('session-one'));
    const writes = api.recordAttempt.mock.calls.map(([value]) => value as RcAttempt);
    expect(writes).toHaveLength(3);
    expect(writes.map((value) => value.selected)).toEqual([null, null, null]);
    expect(writes.filter((value) => value.questionId !== 1).map((value) => value.timeMs)).toEqual([0, 0]);
    expect(api.saveSessionClock).toHaveBeenCalled();
  });

  it('reports a missing routed account session instead of waiting forever for an owner', async () => {
    api.getSession.mockResolvedValue(null);
    render(<MemoryRouter initialEntries={[{ pathname: '/rc/drill', state: { sessionId: 'missing', passageIds: [10] } }]}><RcPlayer /></MemoryRouter>);
    expect(await screen.findByText('That drill could not be found.')).toBeInTheDocument();
    expect(api.getSessionAttempts).not.toHaveBeenCalled();
    expect(api.saveSessionClock).not.toHaveBeenCalled();
  });

  it('waits for saved answers before starting the clock or accepting navigation', async () => {
    let resolve!: (value: RcAttempt[]) => void;
    api.getSessionAttempts.mockReturnValue(new Promise<RcAttempt[]>((done) => { resolve = done; }));
    mount();
    expect(await screen.findByText('Loading your saved answers…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next question' })).toBeNull();
    vi.useFakeTimers();
    await act(async () => { vi.advanceTimersByTime(10_000); });
    expect(api.saveSessionClock).not.toHaveBeenCalled();
    await act(async () => { resolve([attempt]); });
    vi.useRealTimers();
    expect(await screen.findByText('Question 2: blank')).toBeInTheDocument();
    expect(screen.getByTestId('clock')).toHaveTextContent('88');
  });

  it('blocks a failed resume read and retries the read without writing blank attempts', async () => {
    api.getSessionAttempts.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([attempt]);
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Your saved answers could not be loaded');
    expect(screen.queryByRole('button', { name: 'Choose B' })).toBeNull();
    expect(api.recordAttempt).not.toHaveBeenCalled();
    expect(api.saveSessionClock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading answers' }));
    expect(await screen.findByText('Question 2: blank')).toBeInTheDocument();
    expect(api.getSessionAttempts).toHaveBeenCalledTimes(2);
  });

  it.each(['Next question', 'Jump to question 2'])('pauses blank navigation through %s until position is acknowledged', async (control) => {
    mount();
    await screen.findByText('Question 1: blank');
    api.saveSessionClock.mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(screen.getByRole('button', { name: control }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Your question position did not save');
    expect(screen.getByText('Question 1: blank')).toBeInTheDocument();
    expect(api.saveSessionClock).toHaveBeenCalledWith('session-one', 12, 1);
    expect(api.recordAttempt).not.toHaveBeenCalled();
    vi.useFakeTimers();
    await act(async () => { vi.advanceTimersByTime(7_000); });
    expect(screen.getByTestId('clock')).toHaveTextContent('88');
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    expect(await screen.findByText('Question 2: blank')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('keeps an acknowledged answer intact when position saving fails, then retries without another attempt', async () => {
    mount();
    await screen.findByText('Question 1: blank');
    fireEvent.click(screen.getByRole('button', { name: 'Choose B' }));
    api.saveSessionClock.mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    await screen.findByRole('alertdialog');
    expect(screen.getByText('Question 1: B')).toBeInTheDocument();
    expect(api.recordAttempt).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await screen.findByText('Question 2: blank');
    expect(api.recordAttempt).toHaveBeenCalledTimes(1);
  });

  it('retries a failed answer with the same attempt ID before saving the destination', async () => {
    mount();
    await screen.findByText('Question 1: blank');
    fireEvent.click(screen.getByRole('button', { name: 'Choose B' }));
    api.recordAttempt.mockRejectedValueOnce(new Error('lost response'));
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    await screen.findByRole('alertdialog');
    expect(screen.getByText('Question 1: B')).toBeInTheDocument();
    expect(api.saveSessionClock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await screen.findByText('Question 2: blank');
    expect(api.recordAttempt).toHaveBeenCalledTimes(2);
    expect(api.recordAttempt.mock.calls[0][0].id).toBe(api.recordAttempt.mock.calls[1][0].id);
    expect(api.saveSessionClock).toHaveBeenCalledWith('session-one', expect.any(Number), 1);
  });

  it('restores the saved position over the first unanswered question, with a fallback for older configs', async () => {
    api.getSession.mockResolvedValue(session({ currentQuestionIndex: 2 }));
    mount();
    await screen.findByText('Question 3: blank');
    cleanup();
    api.getSession.mockResolvedValue(session());
    api.getSessionAttempts.mockResolvedValue([attempt]);
    mount();
    await screen.findByText('Question 2: blank');
  });

  it('keeps a newer device clock paused until the account acknowledges it even when the pending answer already landed', async () => {
    localStorage.setItem('lsatu:rc-clock:session-one', '30');
    localStorage.setItem('lsatu:rc-answer:student-one:session-one', JSON.stringify({
      userId: 'student-one', sessionId: 'session-one', questionId: 1, selected: 'B',
      attemptId: '33333333-3333-4333-8333-333333333333', currentIndex: 0, elapsed: 30,
    }));
    api.getSessionAttempts.mockResolvedValue([attempt]);
    mount();
    await screen.findByRole('alertdialog');
    expect(screen.getByTestId('clock')).toHaveTextContent('70');
    expect(api.saveSessionClock).not.toHaveBeenCalled();
    vi.useFakeTimers();
    await act(async () => { vi.advanceTimersByTime(2_000); });
    expect(screen.getByTestId('clock')).toHaveTextContent('70');
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(api.saveSessionClock).toHaveBeenCalledWith('session-one', 30, 1);
    expect(api.recordAttempt).not.toHaveBeenCalled();
  });

  it('accepts a fractional clock backup within the same acknowledged account second', async () => {
    localStorage.setItem('lsatu:rc-clock:session-one', '12.75');
    mount();
    await screen.findByText('Question 1: blank');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Choose B' })).not.toBeDisabled();
    expect(api.saveSessionClock).not.toHaveBeenCalled();
  });

  it('leaves completed review navigation read-only', async () => {
    api.getSession.mockResolvedValue({ ...session({ currentQuestionIndex: 2 }), status: 'completed' });
    api.getSessionAttempts.mockResolvedValue([attempt]);
    mount('&review=1');
    await screen.findByText('Question 2: blank');
    fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
    await screen.findByText('Question 1: B');
    expect(api.saveSessionClock).not.toHaveBeenCalled();
    expect(api.recordAttempt).not.toHaveBeenCalled();
  });
});
