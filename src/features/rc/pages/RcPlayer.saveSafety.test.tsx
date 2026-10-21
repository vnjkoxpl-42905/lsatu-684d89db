import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RcAttempt, RcDrillSession, RcPassage } from '../lib/rcTypes';
import type { RcPagerEntry } from '../lib/rcSession';

const api = vi.hoisted(() => ({
  getSession: vi.fn(), getSessionAttempts: vi.fn(), recordAttempt: vi.fn(),
  saveSessionClock: vi.fn(), completeSession: vi.fn(),
  setAttemptFlag: vi.fn(),
}));
vi.mock('../api/rcProgress', () => ({ ...api, createSession: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student-one' } }) }));
vi.mock('../lib/rcBank', () => ({ loadPassages: async () => loadedPassages, loadPassage: vi.fn() }));
vi.mock('../hooks/useRcA11y', () => ({ RC_FONT_SIZES: [100], useRcA11y: () => ({ settings: {}, fontScale: 1, update: vi.fn() }) }));
vi.mock('../hooks/useRcHighlights', () => ({ useRcHighlights: () => ({ forPassage: () => [], loaded: true, loadError: null, statusForPassage: () => 'idle' }) }));
vi.mock('@/components/drill/official/OfficialDrillFrame', () => ({
  default: ({ children, header, maxWidthClassName }: { children: ReactNode; header: ReactNode; maxWidthClassName?: string }) => <div data-testid="player-frame" data-width={maxWidthClassName}>{header}{children}</div>,
}));
vi.mock('@/components/drill/official/OfficialSessionStrip', () => ({
  default: ({ onComplete, breadcrumbs, onTogglePause, isPaused }: { onComplete?: () => void; breadcrumbs: { label: string }[]; onTogglePause?: () => void; isPaused: boolean }) => <div>
    <p data-testid="source-breadcrumb">{breadcrumbs.map((entry) => entry.label).join(' / ')}</p>
    {onComplete && <button onClick={onComplete}>Complete Drill</button>}
    {onTogglePause && <button onClick={onTogglePause}>{isPaused ? 'Resume Drill' : 'Pause Drill'}</button>}
  </div>,
}));
vi.mock('@/components/drill/official/OfficialDrillToolbar', () => ({
  default: ({ timerLabel, leftTools }: { timerLabel: string; leftTools: ReactNode }) => <div>{leftTools}<output data-testid="clock">{timerLabel}</output></div>,
}));
vi.mock('@/components/drill/official/OfficialSmartDrillBar', () => ({
  default: ({ pager, onOpenMenu, menuLabel, onEnd, endLabel, primaryVisible, primaryLabel, primaryDisabled, onSubmit }: { pager: ReactNode; onOpenMenu: () => void; menuLabel: string; onEnd: () => void; endLabel: string; primaryVisible: boolean; primaryLabel: string; primaryDisabled: boolean; onSubmit: () => void }) => <div>{pager}<button onClick={onOpenMenu}>{menuLabel}</button><button onClick={onEnd}>{endLabel}</button>{primaryVisible && <button disabled={primaryDisabled} onClick={onSubmit}>{primaryLabel}</button>}</div>,
}));
vi.mock('../components/RcExamPane', () => ({
  rcTypeStyles: () => ({}),
  RcExamPane: ({ question, passageOnly }: { question: ReactNode; passageOnly: boolean }) => <div>{passageOnly ? <p>Full passage view</p> : question}</div>,
}));
vi.mock('../components/RcQuestionPane', () => ({
  RcQuestionPane: ({ item, selected, onSelect, onToggleFlag, interactionDisabled, reattemptMode, onSkipToAnswer }: {
    item: { number: number }; selected: string; onSelect: (letter: string) => void; onToggleFlag(): void; interactionDisabled: boolean; reattemptMode: boolean; onSkipToAnswer(): void;
  }) => <div>
    <p>Question {item.number}: {selected ?? 'blank'}</p>
    <button disabled={interactionDisabled} onClick={() => onSelect('B')}>Choose B</button>
    <button disabled={interactionDisabled} onClick={onToggleFlag}>Toggle question flag</button>
    {reattemptMode && <button onClick={onSkipToAnswer}>Show saved answer</button>}
  </div>,
}));
vi.mock('../components/RcChrome', () => ({
  formatClock: (seconds: number) => String(seconds),
  RcToolbarButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>, RcToolbarIcon: () => null,
  RcPager: ({ onNext, onPrev, onNavigate, entries, pillStatus }: { onNext: () => void; onPrev: () => void; onNavigate: (index: number) => void; entries: RcPagerEntry[]; pillStatus: (entry: RcPagerEntry) => string }) => <div>
    <output data-testid="pager-statuses">{entries.filter((entry) => entry.kind === 'question').map((entry) => `${entry.sourceLabel} · Drill ${entry.label}: ${pillStatus(entry)}`).join(' / ')}</output>
    <button onClick={onNext}>Next question</button>
    <button onClick={onPrev}>Previous question</button>
    <button onClick={() => onNavigate(1)}>Jump to question 2</button>
  </div>,
}));
vi.mock('../components/RcPassagePane', () => ({ RcPassagePane: () => null }));
vi.mock('../components/RcPassageSummary', () => ({ RcPassageSummary: () => null }));
vi.mock('../components/RcModals', () => ({
  RcQuestionDetails: ({ number, passage: source }: { number: number; passage: RcPassage }) => <div role="dialog" aria-label="Question details">PT {source.preptest} Section {source.section} Passage {source.setNumber} Question {number}</div>,
  RcSubmitConfirm: ({ onConfirm }: { onConfirm: () => void }) => <button onClick={onConfirm}>Confirm submission</button>,
  RcTextSettings: () => null, RcLineSpacingMenu: () => null,
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
let loadedPassages = [passage];
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
function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="location">{location.pathname}{location.search}</output>
    <button onClick={() => navigate('/rc/drill?sessionId=session-two')}>Switch to another drill</button></>;
}
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  loadedPassages = [passage];
  api.getSession.mockResolvedValue(session());
  api.getSessionAttempts.mockResolvedValue([]);
  api.saveSessionClock.mockResolvedValue(undefined);
  api.recordAttempt.mockImplementation(async (value: RcAttempt) => value);
  api.setAttemptFlag.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('RC account save safety', () => {
  it('reports saved answer status in blind review without exposing correctness until reveal', async () => {
    api.getSession.mockResolvedValue({ ...session(), status: 'completed' });
    api.getSessionAttempts.mockResolvedValue([attempt, { ...attempt, id: 'answer-two', questionId: 2, selected: 'A', isCorrect: true }]);
    mount('&review=1&q=1');
    await screen.findByRole('button', { name: 'Show saved answer' });
    const statuses = screen.getByTestId('pager-statuses');
    expect(statuses).toHaveTextContent('Drill 1: answered');
    expect(statuses).toHaveTextContent('Drill 2: answered');
    expect(statuses).toHaveTextContent('Drill 3: unanswered');
    expect(statuses).not.toHaveTextContent('correct');
    fireEvent.click(screen.getByRole('button', { name: 'Show saved answer' }));
    expect(statuses).toHaveTextContent('Drill 1: incorrect');
    expect(statuses).toHaveTextContent('Drill 2: answered');
    expect(api.recordAttempt).not.toHaveBeenCalled();
    expect(api.saveSessionClock).not.toHaveBeenCalled();
  });
  it('pauses and resumes the clock, then counts past the practice budget without silently submitting', async () => {
    mount();
    await screen.findByText('Question 1: blank');
    fireEvent.click(screen.getByRole('button', { name: 'Pause Drill' }));
    expect(screen.getByRole('button', { name: 'Choose B' })).toBeDisabled();
    vi.useFakeTimers();
    await act(async () => { vi.advanceTimersByTime(4_000); });
    expect(screen.getByTestId('clock')).toHaveTextContent('88');
    fireEvent.click(screen.getByRole('button', { name: 'Resume Drill' }));
    await act(async () => { vi.advanceTimersByTime(3_000); });
    expect(screen.getByTestId('clock')).toHaveTextContent('85');
    fireEvent.click(screen.getByRole('button', { name: 'Pause Drill' }));
    await act(async () => { vi.advanceTimersByTime(5_000); });
    expect(screen.getByTestId('clock')).toHaveTextContent('85');
    fireEvent.click(screen.getByRole('button', { name: 'Resume Drill' }));
    await act(async () => { vi.advanceTimersByTime(90_000); });
    expect(screen.getByTestId('clock')).toHaveTextContent('+5');
    expect(api.completeSession).not.toHaveBeenCalled();
    expect(api.recordAttempt).not.toHaveBeenCalled();
  });

  it('reveals a passage only after every answer is selected and Check passage is acknowledged', async () => {
    api.getSession.mockResolvedValue(session({ reveal: 'per_passage' }));
    mount();
    await screen.findByText('Question 1: blank');
    expect(screen.getByRole('button', { name: 'Check passage' })).toBeDisabled();
    for (const ordinal of [1, 2, 3]) {
      fireEvent.click(screen.getByRole('button', { name: 'Choose B' }));
      expect(screen.getByTestId('pager-statuses')).not.toHaveTextContent('incorrect');
      if (ordinal < 3) {
        fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
        await screen.findByText(`Question ${ordinal + 1}: blank`);
      }
    }
    fireEvent.click(screen.getByRole('button', { name: 'Check passage' }));
    await waitFor(() => expect(screen.getByTestId('pager-statuses').textContent?.match(/incorrect/g)).toHaveLength(3));
    expect(screen.getByRole('button', { name: 'Finish drill' })).toBeInTheDocument();
    expect(api.recordAttempt).toHaveBeenCalledTimes(3);
    expect(api.completeSession).not.toHaveBeenCalled();
  });

  it('restores every selected passage answer after teardown during a partially acknowledged passage save', async () => {
    api.getSession.mockResolvedValue(session({ reveal: 'per_passage' }));
    const first = mount();
    await screen.findByText('Question 1: blank');
    for (const ordinal of [1, 2, 3]) {
      fireEvent.click(screen.getByRole('button', { name: 'Choose B' }));
      if (ordinal < 3) {
        fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
        await screen.findByText(`Question ${ordinal + 1}: blank`);
      }
    }
    let rejectLostResponse!: (reason: Error) => void;
    api.recordAttempt.mockImplementationOnce(() => new Promise<RcAttempt>((_, reject) => {
      rejectLostResponse = reject;
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Check passage' }));
    await waitFor(() => expect(api.recordAttempt).toHaveBeenCalledTimes(1));
    const committedFirst = api.recordAttempt.mock.calls[0][0] as RcAttempt;
    first.unmount();
    api.getSession.mockResolvedValue(session({ reveal: 'per_passage', currentQuestionIndex: 2 }));
    api.getSessionAttempts.mockResolvedValue([committedFirst]);
    mount();
    await screen.findByText('Question 3: B');
    expect(screen.getByTestId('pager-statuses')).toHaveTextContent('Question 1 · Drill 1: answered');
    expect(screen.getByTestId('pager-statuses')).toHaveTextContent('Question 2 · Drill 2: answered');
    expect(screen.getByTestId('pager-statuses')).toHaveTextContent('Question 3 · Drill 3: answered');
    expect(screen.getByTestId('pager-statuses')).not.toHaveTextContent('incorrect');
    api.recordAttempt.mockRejectedValueOnce(new Error('Recovery save temporarily rejected'));
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await waitFor(() => expect(screen.getByRole('alertdialog')).toHaveTextContent('That answer did not save'));
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(api.recordAttempt.mock.calls.map(([value]) => value.questionId)).toEqual([1, 2, 2, 3]);
    expect(api.recordAttempt.mock.calls.map(([value]) => value.selected)).toEqual(['B', 'B', 'B', 'B']);
    expect(api.recordAttempt.mock.calls[1][0].id).toBe(api.recordAttempt.mock.calls[2][0].id);
    expect(localStorage.getItem('lsatu:rc-answer:student-one:session-one')).toBeNull();
    // The old browser's response arrives after the new player recovered its
    // answers. It must not erase another question's current draft.
    await act(async () => { rejectLostResponse(new Error('Connection closed after server commit')); });
    expect(localStorage.getItem('lsatu:rc-answer:student-one:session-one')).toBeNull();
  });

  it.each(['per_question', 'per_passage'] as const)('keeps unconfirmed %s drafts hidden through clock recovery and a second reload', async (reveal) => {
    api.getSession.mockResolvedValue(session({ reveal }));
    const first = mount();
    await screen.findByText('Question 1: blank');
    for (const ordinal of [1, 2, 3]) {
      fireEvent.click(screen.getByRole('button', { name: 'Choose B' }));
      if (ordinal < 3) {
        fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
        await screen.findByText(`Question ${ordinal + 1}: blank`);
      }
    }
    first.unmount();
    localStorage.setItem('lsatu:rc-clock:session-one', '30');
    api.getSession.mockResolvedValue(session({ reveal, currentQuestionIndex: 2 }));
    const second = mount();
    await screen.findByText('Question 3: B');
    expect(screen.getByTestId('pager-statuses')).toHaveTextContent('Question 1 · Drill 1: answered');
    expect(screen.getByTestId('pager-statuses')).toHaveTextContent('Question 2 · Drill 2: answered');
    expect(screen.getByTestId('pager-statuses')).not.toHaveTextContent('incorrect');
    expect(api.recordAttempt).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Choose B', hidden: true })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(api.recordAttempt).not.toHaveBeenCalled();
    second.unmount();
    api.getSession.mockResolvedValue(session({ reveal, currentQuestionIndex: 2, clockElapsedSeconds: 30 }));
    mount();
    await screen.findByText('Question 3: B');
    expect(screen.getByTestId('pager-statuses')).not.toHaveTextContent('incorrect');
    expect(api.recordAttempt).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('button', { name: reveal === 'per_question' ? 'Confirm' : 'Check passage' })).not.toBeDisabled();
  });

  it.each(['per_passage', 'end_of_set'] as const)('does not adopt an old %s save continuation after switching sessions', async (reveal) => {
    api.getSession.mockImplementation(async (id: string) => id === 'session-two'
      ? { ...session({ reveal, clockElapsedSeconds: 0 }), id: 'session-two' }
      : session({ reveal }));
    localStorage.setItem('lsatu:rc-clock:session-two', '30');
    mount();
    await screen.findByText('Question 1: blank');
    fireEvent.click(screen.getByRole('button', { name: 'Choose B' }));
    if (reveal === 'per_passage') {
      for (const ordinal of [2, 3]) {
        fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
        await screen.findByText(`Question ${ordinal}: blank`);
        fireEvent.click(screen.getByRole('button', { name: 'Choose B' }));
      }
    }
    let resolveOldWrite!: (value: RcAttempt) => void;
    api.recordAttempt.mockImplementationOnce(() => new Promise<RcAttempt>((resolve) => { resolveOldWrite = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: reveal === 'per_passage' ? 'Check passage' : 'Next question' }));
    await waitFor(() => expect(api.recordAttempt).toHaveBeenCalledTimes(1));
    const oldAttempt = api.recordAttempt.mock.calls[0][0] as RcAttempt;
    fireEvent.click(screen.getByRole('button', { name: 'Switch to another drill' }));
    await screen.findByRole('alertdialog');
    expect(screen.getByTestId('location')).toHaveTextContent('session-two');
    expect(screen.getByText('Question 1: blank')).toBeInTheDocument();
    await act(async () => { resolveOldWrite(oldAttempt); });
    const clocksBeforeRetry = api.saveSessionClock.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(api.recordAttempt).toHaveBeenCalledTimes(1);
    expect(api.saveSessionClock.mock.calls.slice(clocksBeforeRetry).every(([id]) => id === 'session-two')).toBe(true);
    expect(screen.getByText('Question 1: blank')).toBeInTheDocument();
    expect(screen.getByTestId('pager-statuses')).toHaveTextContent('Question 1 · Drill 1: unanswered');
    expect(screen.getByRole('button', { name: 'Choose B' })).not.toBeDisabled();
  });

  it('does not exit a new drill when an older Save and exit clock acknowledgement arrives', async () => {
    api.getSession.mockImplementation(async (id: string) => id === 'session-two'
      ? { ...session(), id: 'session-two' } : session());
    mount();
    await screen.findByText('Question 1: blank');
    let resolveExitClock!: () => void;
    api.saveSessionClock.mockImplementationOnce(() => new Promise<void>((resolve) => { resolveExitClock = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'Save and exit' }));
    await waitFor(() => expect(api.saveSessionClock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Switch to another drill' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('session-two'));
    await screen.findByText('Question 1: blank');
    await act(async () => { resolveExitClock(); });
    expect(screen.getByTestId('location')).toHaveTextContent('/rc/drill?sessionId=session-two');
    expect(screen.getByRole('button', { name: 'Choose B' })).not.toBeDisabled();
    expect(api.completeSession).not.toHaveBeenCalled();
  });

  it('reloads the acknowledged answer and saved position after Save and exit', async () => {
    const first = mount();
    await screen.findByText('Question 1: blank');
    fireEvent.click(screen.getByRole('button', { name: 'Choose B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    await screen.findByText('Question 2: blank');
    fireEvent.click(screen.getByRole('button', { name: 'Save and exit' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/rc'));
    const acknowledgedClock = api.saveSessionClock.mock.calls.filter((call) => call[2] !== undefined).at(-1);
    expect(acknowledgedClock[2]).toBe(1);
    first.unmount();
    api.getSession.mockResolvedValue(session({ clockElapsedSeconds: acknowledgedClock[1], currentQuestionIndex: acknowledgedClock[2] }));
    api.getSessionAttempts.mockResolvedValue([attempt]);
    mount();
    await screen.findByText('Question 2: blank');
    expect(screen.getByTestId('pager-statuses')).toHaveTextContent('Question 1 · Drill 1: answered');
    expect(api.recordAttempt).toHaveBeenCalledTimes(1);
    expect(api.completeSession).not.toHaveBeenCalled();
  });
  it('uses official Question 17 in breadcrumb and details while separately showing Drill 1', async () => {
    loadedPassages = [{ ...passage, preptest: 140, section: 4, setNumber: 3,
      questions: passage.questions.map((question, index) => ({ ...question, position: index + 17 })) }];
    mount();
    await screen.findByText('Question 1: blank');
    expect(screen.getByTestId('source-breadcrumb')).toHaveTextContent('Section 4 · Passage 3 · Question 17 · Drill 1 of 3');
    expect(screen.getByTestId('pager-statuses')).toHaveTextContent('PT 140 · Section 4 · Passage 3 · Question 17 · Drill 1: unanswered');
    fireEvent.click(screen.getByRole('button', { name: 'Question details' }));
    expect(screen.getByRole('dialog', { name: 'Question details' })).toHaveTextContent('PT 140 Section 4 Passage 3 Question 17');
    expect(api.recordAttempt).not.toHaveBeenCalled();
    expect(api.saveSessionClock).not.toHaveBeenCalled();
  });

  it('keeps pager correctness hidden until the configured per-question confirmation', async () => {
    api.getSession.mockResolvedValue(session({ reveal: 'per_question' }));
    mount();
    await screen.findByText('Question 1: blank');
    fireEvent.click(screen.getByRole('button', { name: 'Choose B' }));
    expect(screen.getByTestId('pager-statuses')).toHaveTextContent('Question 1 · Drill 1: answered');
    expect(screen.getByTestId('pager-statuses')).not.toHaveTextContent('incorrect');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.getByTestId('pager-statuses')).toHaveTextContent('Question 1 · Drill 1: incorrect'));
    expect(api.recordAttempt).toHaveBeenCalledTimes(1);
  });

  it('keeps an unanswered flag pending until the answer is recorded, then announces Saved', async () => {
    mount();
    await screen.findByText('Question 1: blank');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle question flag' }));
    expect(await screen.findByText(/Flag: Pending until this answer is recorded/)).toBeInTheDocument();
    expect(api.setAttemptFlag).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Choose B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    await screen.findByText('Question 2: blank');
    expect(api.recordAttempt.mock.calls[0][0].flagged).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
    expect(await screen.findByText('Flag: Saved')).toBeInTheDocument();
    expect(localStorage.getItem('rc:flags:pending:student-one:session-one:1')).toBeNull();
  });

  it('shows a failed recorded flag save and retries without another answer attempt', async () => {
    api.getSessionAttempts.mockResolvedValue([attempt]);
    api.setAttemptFlag.mockRejectedValueOnce(new Error('Offline'));
    mount('&q=1');
    await screen.findByText('Question 1: B');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle question flag' }));
    expect(await screen.findByText(/Flag: Not saved/)).toBeInTheDocument();
    expect(localStorage.getItem('rc:flags:pending:student-one:session-one:1')).toContain('true');
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving flag' }));
    expect(await screen.findByText('Flag: Saved')).toBeInTheDocument();
    expect(api.setAttemptFlag).toHaveBeenCalledTimes(2);
    expect(api.setAttemptFlag).toHaveBeenLastCalledWith('session-one', 1, true, 'student-one');
    expect(api.recordAttempt).not.toHaveBeenCalled();
  });

  it('refuses in-progress ordinary review without starting a timer or saving anything', async () => {
    mount('&review=1');
    await screen.findByText(/Review has not started, and the clock remains paused/);
    vi.useFakeTimers();
    await act(async () => { vi.advanceTimersByTime(10_000); });
    vi.useRealTimers();
    expect(screen.queryByRole('button', { name: 'Choose B' })).not.toBeInTheDocument();
    expect(api.recordAttempt).not.toHaveBeenCalled();
    expect(api.setAttemptFlag).not.toHaveBeenCalled();
    expect(api.saveSessionClock).not.toHaveBeenCalled();
    expect(api.completeSession).not.toHaveBeenCalled();
  });
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
    await screen.findByText(/keeps its saved answers and flags unchanged/);
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

  it('serializes duplicate completion clicks and retries a rejected acknowledgement without rewriting answers', async () => {
    const savedAnswers = [attempt, { ...attempt, id: 'answer-two', questionId: 2 }];
    api.getSessionAttempts.mockResolvedValue(savedAnswers);
    let rejectCompletion!: (reason: Error) => void;
    api.completeSession.mockImplementationOnce(() => new Promise<void>((_, reject) => {
      rejectCompletion = reject;
    })).mockResolvedValueOnce(undefined);
    mount();
    await screen.findByText('Question 3: blank');
    fireEvent.click(screen.getByRole('button', { name: 'Choose B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete Drill' }));
    const confirm = screen.getByRole('button', { name: 'Confirm submission' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(api.completeSession).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Saving your section…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose B' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Complete Drill' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm submission' }));
    expect(api.completeSession).toHaveBeenCalledTimes(1);
    expect(api.recordAttempt).toHaveBeenCalledTimes(1);
    expect(api.recordAttempt.mock.calls[0][0]).toMatchObject({ questionId: 3, selected: 'B' });

    await act(async () => { rejectCompletion(new Error('Completion acknowledgement rejected')); });
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('The drill did not finish saving');
    expect(screen.getByText('Question 3: B')).toBeInTheDocument();
    expect(screen.getByTestId('pager-statuses').textContent?.match(/: answered/g)).toHaveLength(3);
    const pausedClock = screen.getByTestId('clock').textContent;
    vi.useFakeTimers();
    await act(async () => { vi.advanceTimersByTime(10_000); });
    expect(screen.getByTestId('clock').textContent).toBe(pausedClock);
    vi.useRealTimers();
    expect(screen.getByTestId('location')).toHaveTextContent('/rc/drill');
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/rc/results/session-one'));
    expect(api.completeSession).toHaveBeenCalledTimes(2);
    expect(api.recordAttempt).toHaveBeenCalledTimes(1);
    expect(savedAnswers.map((answer) => answer.selected)).toEqual(['B', 'B']);
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
