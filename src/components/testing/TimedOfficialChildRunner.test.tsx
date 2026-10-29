import * as React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TimedOfficialChildRunner from './TimedOfficialChildRunner';
import type { TimedChildController, TimedChildState } from '@/lib/timedChildController';

const auth = vi.hoisted(() => ({ owner: 'owner' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: auth.owner } }) }));
vi.mock('@/lib/practiceTestStore', () => ({ getPracticeTestDeviceId: () => 'device' }));
vi.mock('@/components/drill/official/OfficialDrillFrame', () => ({ default: ({ header, children, isPaused, onResume }: { header: React.ReactNode; children: React.ReactNode; isPaused: boolean; onResume(): void }) => <div>{header}{isPaused ? <button onClick={onResume}>Resume section</button> : children}</div> }));
vi.mock('@/components/drill/official/OfficialQuestionPane', () => ({ default: ({ question, selectedAnswer, onAnswerSelect, interactionLocked }: { question: { qid: string }; selectedAnswer: string; onAnswerSelect(value: string): void; interactionLocked: boolean }) => <div data-testid="question-pane">{question.qid}<span>{selectedAnswer}</span><button disabled={interactionLocked} onClick={() => onAnswerSelect('B')}>Choose B</button></div> }));
function fixture(owner = 'owner'): TimedChildState {
  const questions = [1, 2].map(qnum => ({ qid: `Q${qnum}`, qnum, pt: 101, section: 1, qtype: 'Must Be True', difficulty: 3, stimulus: 'Text', questionStem: 'Prompt', answerChoices: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' }, correctAnswer: 'A' }));
  return { snapshot: { parent: { id: 'run', user_id: owner, pt: 101, current_leg: 0, timed_phase: 'leg-running', timed_frozen_legs: [{ kind: 'lr' }], section_seconds: 35 },
    observedAt: 0 }, view: { questions, session: { regulation_answered_qids: undefined } }, questions,
    passages: [], answers: { Q1: { selected: 'A', timeMs: 0, flagged: false, switchCount: 0, eliminations: [] } }, currentIndex: 0, pending: null } as unknown as TimedChildState;
}
let current: TimedChildState; let elapsed: number; let remaining: number; let pending: unknown;
let load: ReturnType<typeof vi.fn>; let checkpoint: ReturnType<typeof vi.fn>; let close: ReturnType<typeof vi.fn>; let retry: ReturnType<typeof vi.fn>; let control: ReturnType<typeof vi.fn>;
const factory = () => ({ load, checkpoint, close, retry, pending: () => pending, clock: () => ({ writer: 'active', elapsedMs: elapsed, remainingMs: remaining, leaseExpired: false }), control }) as unknown as TimedChildController;
const ui = (kind: 'lr' | 'rc' = 'lr') => <MemoryRouter initialEntries={['/testing/test/run/lr/0']}><Routes><Route path="/testing/test/:runId/lr/:legIndex" element={<TimedOfficialChildRunner kind={kind} controllerFactory={factory} />} /><Route path="/testing/test/run" element={<p>PrepTest parent</p>} /></Routes></MemoryRouter>;
async function mount() { const result = render(ui()); await act(async () => { await Promise.resolve(); }); return result; }
beforeEach(() => {
  vi.useFakeTimers(); auth.owner = 'owner'; localStorage.clear(); current = fixture(); elapsed = 0; remaining = 35000; pending = null;
  load = vi.fn(async () => current); close = vi.fn(async () => ({ ...current, snapshot: { ...current.snapshot, parent: { ...current.snapshot.parent, current_leg: 1 } }, view: null, pending: null }));
  checkpoint = vi.fn(async (_state, index, answers, regulation) => {
    current = { ...current, currentIndex: index, answers, view: { ...current.view, session: { ...(current.view as { session: object }).session, regulation_answered_qids: regulation } } } as TimedChildState;
    return current;
  });
  retry = vi.fn(async () => { pending = null; return { ...current, pending: null }; });
  control = vi.fn(async (_state, operation) => ({ ...current, snapshot: { ...current.snapshot, parent: { ...current.snapshot.parent, timed_phase: operation === 'pause' ? 'leg-paused' : 'leg-running' } } }));
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('official timed child integration boundaries', () => {
  it('acknowledges the latest checkpoint and account pause before returning to the PrepTest', async () => {
    await mount();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^PrepTest$/ })); await Promise.resolve(); });
    expect(checkpoint).toHaveBeenCalledTimes(1); expect(control).toHaveBeenCalledWith(expect.anything(), 'pause');
    expect(screen.getByText('PrepTest parent')).toBeInTheDocument();
  });
  it('marks LR regulation answers at cutoff and continues overtime until explicit finish', async () => {
    await mount(); remaining = 0; elapsed = 35000;
    await act(async () => { vi.advanceTimersByTime(1000); await Promise.resolve(); });
    expect(checkpoint.mock.calls[0][3]).toEqual(['Q1']); expect(close).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Section time remaining')).toHaveTextContent('Overtime');
    expect(screen.getByRole('button', { name: 'Choose B' })).not.toBeDisabled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Finish section' })); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirm finish' })); await Promise.resolve(); });
    expect(close).toHaveBeenCalledTimes(1); expect(screen.getByText('PrepTest parent')).toBeInTheDocument();
  });
  it('hides questions after a failed save and retries only the retained command', async () => {
    checkpoint.mockImplementation(async () => { pending = { operation: 'checkpoint', commandId: 'retained' }; throw new Error('TypeError: Failed to fetch'); });
    await mount();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Choose B' })); await Promise.resolve(); });
    expect(screen.queryByTestId('question-pane')).not.toBeInTheDocument(); expect(screen.getByText('The account could not be reached. Your section is paused. Retry to confirm your saved work.')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry saved command' })); await Promise.resolve(); });
    expect(retry).toHaveBeenCalledTimes(1); expect(checkpoint).toHaveBeenCalledTimes(1); expect(screen.getByTestId('question-pane')).toBeInTheDocument();
  });
  it('preserves dwell accumulated during a pending acknowledgment in the next checkpoint', async () => {
    let acknowledge!: (value: TimedChildState) => void;
    checkpoint.mockImplementationOnce(() => new Promise<TimedChildState>(resolve => { acknowledge = resolve; }));
    await mount();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Choose B' })); });
    elapsed = 2000;
    await act(async () => { vi.advanceTimersByTime(1000); });
    await act(async () => { acknowledge({ ...current, answers: { Q1: { ...current.answers.Q1, selected: 'B', timeMs: 0 } } }); await Promise.resolve(); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Next' })); await Promise.resolve(); });
    expect(checkpoint.mock.calls[1][2].Q1.timeMs).toBe(2000);
  });
  it('validates restored RC marks before rendering the real shared reader', async () => {
    const passage = { passageId: 7, preptest: 101, section: 1, setNumber: 1, title: 'Synthetic RC passage', text: 'A synthetic passage about research.', summaries: {},
      questions: [{ questionId: 501, position: 1, prompt: 'Synthetic main point?', correctAnswer: 'A', questionType: 'Main Point', choices: ['A','B','C','D','E'].map(letter => ({ letter, text: `Choice ${letter}` })) }] };
    const q = { ...current.questions[0], qid: '501' };
    current = { ...current, snapshot: { ...current.snapshot, parent: { ...current.snapshot.parent, timed_frozen_legs: [{ kind: 'rc' }] } },
      passages: [passage], questions: [q], answers: { '501': { selected: null, timeMs: 0, flagged: false, switchCount: 0, eliminations: [] } },
      view: { state: { currentIndex: 0, items: [{ passage, question: passage.questions[0], number: 1, passageIndex: 0 }] }, session: {} } } as unknown as TimedChildState;
    localStorage.setItem('lsatu:timed-markers:v1:owner:run:0', JSON.stringify({ ownerId: 'owner', runId: 'run', legIndex: 0,
      rcHighlights: { '7': { malformed: 'not an array' } }, telemetry: { visits: null, trail: 'bad' } }));
    render(ui('rc')); await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('Synthetic main point?')).toBeInTheDocument();
    expect(screen.getByText('A synthetic passage about research.')).toBeInTheDocument();
  });
  it('reports local marker write failures separately and retries without an account checkpoint', async () => {
    await mount();
    const save = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    // A local write accompanies an account-answer change, but is not its acknowledgement.
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Choose B' })); await Promise.resolve(); });
    expect(screen.getByRole('alert')).toHaveTextContent('Marks are not saved on this device');
    expect(screen.getByRole('status')).toHaveTextContent('Account save acknowledged');
    const checkpoints = checkpoint.mock.calls.length;
    save.mockRestore();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry saving marks' })); });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(checkpoint).toHaveBeenCalledTimes(checkpoints);
  });
  it('preserves unread device storage when marker hydration fails', async () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('Storage denied'); });
    const write = vi.spyOn(localStorage, 'setItem');
    await mount();
    expect(screen.getByRole('alert')).toHaveTextContent('Marks could not be restored');
    expect(write).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Choose B' })).toBeEnabled();
  });
  it('ignores delayed replies after the signed-in owner changes', async () => {
    let acknowledge!: (value: TimedChildState) => void;
    checkpoint.mockImplementationOnce(() => new Promise<TimedChildState>(resolve => { acknowledge = resolve; }));
    const mounted = await mount();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Choose B' })); });
    const old = current; auth.owner = 'other-owner'; current = fixture('other-owner');
    await act(async () => { mounted.rerender(ui()); await Promise.resolve(); });
    await act(async () => { acknowledge({ ...old, snapshot: { ...old.snapshot, parent: { ...old.snapshot.parent, current_leg: 1 } }, view: null }); await Promise.resolve(); });
    expect(screen.queryByText('PrepTest parent')).not.toBeInTheDocument(); expect(screen.getByTestId('question-pane')).toBeInTheDocument(); expect(close).not.toHaveBeenCalled();
  });
});
