import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Runner, { standaloneCreationRequest } from './TimedStandaloneSectionRunner';
import type { TimedSectionController, TimedSectionState } from '@/lib/timedSectionController';
import { TimedSectionError } from '@/lib/timedSectionClient';
const owner = '10000000-0000-4000-8000-000000000001'; const work = '20000000-0000-4000-8000-000000000001';
let actor = owner;
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: actor } }) }));
vi.mock('@/lib/practiceTestStore', () => ({ getPracticeTestDeviceId: () => 'device-a' }));
vi.mock('@/components/drill/official/OfficialDrillFrame', () => ({ default: ({ header, children, isPaused, onResume }: { header: React.ReactNode; children: React.ReactNode; isPaused: boolean; onResume(): void }) => <div>{header}{isPaused ? <button onClick={onResume}>Resume section</button> : children}</div> }));
vi.mock('@/components/timed/RcTimedReader', () => ({
  RcTimedReader: (props: { item: { passage: { text: string }; question: { questionId: number } }; marks: unknown[]; onMarksChange(next: unknown[]): void; onSelect(letter: string): void; blocked: boolean }) =>
    <div data-testid="rc-reader">{props.item.passage.text}
      <span data-testid="mark-count">{props.marks.length}</span>
      <button disabled={props.blocked} onClick={() => props.onSelect('B')}>Pick B</button>
      <button onClick={() => props.onMarksChange([...props.marks, { target: 'passage', start: 0, end: 4, color: 'yellow', kind: 'highlight' }])}>Mark text</button>
    </div>,
}));
vi.mock('@/lib/highlightUtils', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/highlightUtils')>()), captureSelectionAcross: () => nextCapture }));
let nextCapture: { section: 'stimulus'; start: number; end: number; text: string }[] = [];
vi.mock('@/components/drill/official/OfficialQuestionPane', () => ({ default: ({ question, onAnswerSelect, interactionLocked, highlights, onTextSelection }: { question: { questionStem: string }; onAnswerSelect(answer: string): void; interactionLocked: boolean; highlights: { start: number; end: number }[]; onTextSelection(regions: unknown[]): boolean }) => <div>{question.questionStem}<span data-testid="lr-marks">{highlights.map(value => `${value.start}-${value.end}`).join(',')}</span><button onClick={() => onTextSelection([])}>Drag select</button><button disabled={interactionLocked} onClick={() => onAnswerSelect('A')}>Select A</button></div> }));
function state(phase = 'running'): TimedSectionState {
  return { snapshot: { sitting: { id: work, owner_id: owner, pt: 140, section: 1, kind: 'lr', phase, budget_ms: 2100000 }, pending: null },
    questions: [{ qid: 'q1', qnum: 1, questionStem: 'Verified question', stimulus: 'Text', answerChoices: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' }, correctAnswer: 'A', qtype: 'Necessary Assumption', difficulty: 3 }],
    passages: [], currentIndex: 0, answers: { q1: { selected: null, timeMs: 0, flagged: false, switchCount: 0, eliminations: [] } },
  } as unknown as TimedSectionState;
}
let controller: Record<string, ReturnType<typeof vi.fn>>;
beforeEach(() => {
  actor = owner;
  localStorage.clear();
  vi.restoreAllMocks();
  controller = { load: vi.fn().mockResolvedValue(state()), clock: vi.fn().mockReturnValue({ writer: 'active', remainingMs: 2100000 }),
    pending: vi.fn().mockReturnValue(null), rejection: vi.fn().mockReturnValue(null), create: vi.fn().mockResolvedValue(state('ready')),
    control: vi.fn().mockResolvedValue(state('paused')), checkpoint: vi.fn().mockResolvedValue(state()), close: vi.fn().mockResolvedValue(state('complete')),
    retry: vi.fn().mockResolvedValue(state()), recoverRejected: vi.fn().mockResolvedValue(state('paused')), reportHref: vi.fn().mockReturnValue('/testing/attempts/section/lr/history') };
});
const factory = () => controller as unknown as TimedSectionController;
function tree(query = '') { return <MemoryRouter initialEntries={[`/testing/sections/${work}${query}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/testing/sections/:sittingId" element={<Runner controllerFactory={factory} />} /><Route path="/testing" element={<div>Testing destination</div>} /></Routes></MemoryRouter>; }
function mount(query = '') { return render(tree(query)); }
describe('standalone account section runner', () => {
  it('requires a deliberate prepare and start; a creation URL cannot begin the clock', async () => {
    controller.load.mockRejectedValue(new TimedSectionError('access', 'Unknown account sitting'));
    mount('?kind=lr&pt=140&section=1&pace=standard');
    await screen.findByRole('button', { name: 'Prepare section' });
    expect(controller.create).not.toHaveBeenCalled(); expect(controller.control).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Prepare section' }));
    await screen.findByRole('button', { name: 'Start section' }); expect(controller.control).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start section' }));
    await waitFor(() => expect(controller.control).toHaveBeenCalledWith(expect.anything(), 'start'));
  });
  it('cannot turn an arbitrary unknown sitting URL into a new account record', async () => {
    controller.load.mockRejectedValue(new TimedSectionError('access', 'Unknown sitting')); mount();
    await screen.findByText('Unknown sitting'); expect(screen.queryByRole('button', { name: 'Prepare section' })).toBeNull(); expect(controller.create).not.toHaveBeenCalled();
  });
  it('checkpoints selected answers before pausing', async () => {
    mount(); await screen.findByText('Verified question'); fireEvent.click(screen.getByRole('button', { name: 'Select A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(() => expect(controller.control).toHaveBeenCalledWith(expect.anything(), 'pause'));
    expect(controller.checkpoint).toHaveBeenCalledWith(expect.anything(), 0, expect.objectContaining({ q1: expect.objectContaining({ selected: 'A' }) }), undefined);
    expect(controller.checkpoint.mock.invocationCallOrder[0]).toBeLessThan(controller.control.mock.invocationCallOrder[0]);
  });
  it('does not pause or close after a failed account checkpoint; exposes exact saved retry', async () => {
    controller.checkpoint.mockImplementation(async () => { controller.pending.mockReturnValue({ operation: 'checkpoint' }); throw new Error('Lost reply'); });
    mount(); await screen.findByText('Verified question'); fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await screen.findByText('Lost reply'); expect(controller.control).not.toHaveBeenCalled(); expect(controller.close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry saved command' }));
    await waitFor(() => expect(controller.retry).toHaveBeenCalledTimes(1));
    expect(controller.checkpoint).toHaveBeenCalledTimes(1);
  });
  it('shows a claim screen instead of opening questions for an expired writer', async () => {
    controller.clock.mockReturnValue({ writer: 'claim-required', remainingMs: 2070000 }); mount();
    await screen.findByRole('button', { name: 'Claim this section' }); expect(screen.queryByText('Verified question')).toBeNull();
    expect(controller.control).not.toHaveBeenCalled();
  });
  it('only exposes reports after complete account authority', async () => {
    controller.load.mockResolvedValue(state('complete')); controller.clock.mockReturnValue({ writer: 'terminal', remainingMs: 0 }); mount();
    await screen.findByRole('button', { name: 'View section report' }); expect(controller.close).not.toHaveBeenCalled();
    expect(screen.queryByText('Verified question')).toBeNull();
  });
  it('rejects malformed creation and arbitrary custom durations', () => {
    expect(standaloneCreationRequest(new URLSearchParams('kind=lr&pt=140&section=1&pace=custom'))).toBeNull();
    expect(standaloneCreationRequest(new URLSearchParams('kind=rc&pt=140x&section=1&pace=standard'))).toBeNull();
  });
  function rcState(): TimedSectionState {
    const rc = state(); rc.snapshot.sitting.kind = 'rc';
    rc.questions = [{ ...rc.questions[0], qid: '501', qtype: 'RC' }];
    rc.answers = { '501': { selected: null, timeMs: 0, flagged: false, switchCount: 0, eliminations: [], attemptId: 'attempt-501' } };
    rc.passages = [{ passageId: 7, preptest: 140, section: 1, setNumber: 1, title: 'T', topic: null, format: null, frameworks: [], difficulty: null,
      text: 'Passage body text for the reader.', summaries: {}, questions: [{ questionId: 501, position: 1, questionType: 'Main Point', questionTypeFamily: 'x', difficulty: null,
        prompt: 'Which one best states the main point?', correctAnswer: 'A', hasWrittenExplanation: false, explanationBlocks: null, totalResponses: null, features: [],
        choices: [{ letter: 'A', text: 'a' }, { letter: 'B', text: 'b' }, { letter: 'C', text: 'c' }, { letter: 'D', text: 'd' }, { letter: 'E', text: 'e' }] }] }] as never;
    return rc;
  }
  it('mounts the RC reader with display controls for an RC sitting, and still checkpoints answers to the account', async () => {
    const rc = rcState(); controller.load.mockResolvedValue(rc);
    mount();
    expect((await screen.findByTestId('rc-reader')).textContent).toContain('Passage body text for the reader.');
    expect(screen.getByLabelText('Text size')).toBeInTheDocument();
    expect(screen.getByLabelText('Find in passage')).toBeInTheDocument();
    expect(screen.getByLabelText('Marker')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Passage only' })).toBeInTheDocument();
    expect(screen.queryByText('Select A')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Pick B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(() => expect(controller.checkpoint).toHaveBeenCalled());
    expect(controller.checkpoint).toHaveBeenCalledWith(expect.anything(), 0, expect.objectContaining({ '501': expect.objectContaining({ selected: 'B' }) }), undefined);
  });
  it('keeps RC marks on this device only: stored locally, never sent in the account checkpoint', async () => {
    localStorage.clear();
    controller.load.mockResolvedValue(rcState());
    const view = mount();
    await screen.findByTestId('rc-reader');
    fireEvent.click(screen.getByRole('button', { name: 'Mark text' }));
    expect(screen.getByTestId('mark-count')).toHaveTextContent('1');
    const key = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).find((name) => name.startsWith('lsatu:timed-section-markers:v1:'));
    expect(key).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(key!)!).rcMarks['7']).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(() => expect(controller.checkpoint).toHaveBeenCalled());
    expect(JSON.stringify(controller.checkpoint.mock.calls[0][2])).not.toContain('"target":"passage"');
    view.unmount();
    mount();
    await screen.findByTestId('rc-reader');
    expect(screen.getByTestId('mark-count')).toHaveTextContent('1');
  });
  it('groups and persists supported display settings without adding answer aids', async () => {
    controller.load.mockResolvedValue(rcState()); const view = mount(); await screen.findByTestId('rc-reader');
    expect(screen.getByText('Display')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Line spacing'), { target: { value: '0.4' } });
    fireEvent.change(screen.getByLabelText('Color scheme'), { target: { value: 'navy' } });
    fireEvent.click(screen.getByLabelText('Paragraph focus'));
    view.unmount(); mount(); await screen.findByTestId('rc-reader');
    expect(screen.getByLabelText('Line spacing')).toHaveValue('0.4');
    expect(screen.getByLabelText('Color scheme')).toHaveValue('navy');
    expect(screen.getByLabelText('Paragraph focus')).toBeChecked();
    expect(controller.checkpoint).not.toHaveBeenCalled();
  });
  it('discards malformed or foreign stored marks and restores valid display settings', async () => {
    const valid = { target: 'passage', start: 0, end: 4, color: 'yellow', kind: 'highlight' };
    localStorage.setItem(`lsatu:timed-section-markers:v1:${owner}:${work}`, JSON.stringify({ ownerId: owner, sittingId: work,
      fontScale: 1.3, passageOnly: false, rcMarks: { '7': [valid, null, { ...valid, end: 10000 }, { ...valid, target: 'q999:stem' },
        { ...valid, color: 'red' }, { ...valid, kind: 'script' }, { ...valid, start: -1 }, { ...valid, end: 0 }, { ...valid, start: 0.5 }], '999': [valid] } }));
    controller.load.mockResolvedValue(rcState()); mount();
    await screen.findByTestId('rc-reader');
    expect(screen.getByTestId('mark-count')).toHaveTextContent('1');
    expect(screen.getByLabelText('Text size')).toHaveValue('1.3');
  });
  it('reports a local save failure separately and retries without checkpointing account answers', async () => {
    controller.load.mockResolvedValue(rcState()); mount(); await screen.findByTestId('rc-reader');
    const save = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
    fireEvent.click(screen.getByRole('button', { name: 'Mark text' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Marks and display settings are not saved on this device');
    expect(screen.getByTestId('mark-count')).toHaveTextContent('1');
    expect(controller.checkpoint).not.toHaveBeenCalled();
    save.mockRestore(); fireEvent.click(screen.getByRole('button', { name: 'Retry saving marks' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(JSON.parse(localStorage.getItem(`lsatu:timed-section-markers:v1:${owner}:${work}`)!).rcMarks['7']).toHaveLength(1);
  });
  it('does not overwrite unread stored marks when device storage cannot be read', async () => {
    const read = vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('Storage denied'); });
    const write = vi.spyOn(localStorage, 'setItem');
    controller.load.mockResolvedValue(rcState()); mount(); await screen.findByTestId('rc-reader');
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be restored');
    fireEvent.click(screen.getByRole('button', { name: 'Mark text' }));
    expect(screen.getByTestId('mark-count')).toHaveTextContent('0');
    expect(write).not.toHaveBeenCalled();
    read.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving marks' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
  it('refuses annotation callbacks while the account checkpoint is busy', async () => {
    controller.load.mockResolvedValue(rcState()); controller.checkpoint.mockReturnValue(new Promise(() => {}));
    mount(); await screen.findByTestId('rc-reader');
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark text' }));
    expect(screen.getByTestId('mark-count')).toHaveTextContent('0');
  });
  it('closes RC at its acknowledged budget boundary after saving current answers', async () => {
    const rc = state(); rc.snapshot.sitting.kind = 'rc'; controller.load.mockResolvedValue(rc);
    controller.clock.mockReturnValue({ writer: 'active', remainingMs: 0, elapsedMs: 2100000 });
    controller.close.mockImplementation(async () => { controller.clock.mockReturnValue({ writer: 'terminal', remainingMs: 0 }); return state('complete'); });
    mount();
    await waitFor(() => expect(controller.close).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(controller.checkpoint.mock.invocationCallOrder[0]).toBeLessThan(controller.close.mock.invocationCallOrder[0]);
  });
  it.each([3150000, 4200000, 2400000])('uses the acknowledged RC budget %i when expiring without overtime', async budgetMs => {
    const rc = rcState(); rc.snapshot.sitting.budget_ms = budgetMs;
    rc.answers[rc.questions[0].qid].selected = 'B';
    controller.load.mockResolvedValue(rc);
    controller.clock.mockReturnValue({ writer: 'active', remainingMs: 0, elapsedMs: budgetMs });
    controller.checkpoint.mockResolvedValue(rc);
    const done = { ...rc, snapshot: { ...rc.snapshot, sitting: { ...rc.snapshot.sitting, phase: 'complete' } } };
    controller.close.mockImplementation(async () => { controller.clock.mockReturnValue({ writer: 'terminal', remainingMs: 0, elapsedMs: budgetMs }); return done; });
    mount();
    await screen.findByRole('button', { name: 'View section report' });
    expect(controller.checkpoint).toHaveBeenCalledWith(expect.objectContaining({ snapshot: expect.objectContaining({ sitting: expect.objectContaining({ budget_ms: budgetMs }) }) }), 0, expect.objectContaining({ [rc.questions[0].qid]: expect.objectContaining({ selected: 'B' }) }), undefined);
    expect(controller.checkpoint.mock.invocationCallOrder[0]).toBeLessThan(controller.close.mock.invocationCallOrder[0]);
    expect(controller.control).not.toHaveBeenCalled();
    expect(screen.queryByText(/Overtime/)).toBeNull();
  });
  it('withholds automatic RC close after expiry save failure and resumes only after retained-command acknowledgement', async () => {
    const rc = rcState(); controller.load.mockResolvedValue(rc);
    controller.clock.mockReturnValue({ writer: 'active', remainingMs: 0, elapsedMs: rc.snapshot.sitting.budget_ms });
    controller.checkpoint.mockImplementationOnce(async () => { controller.pending.mockReturnValue({ operation: 'checkpoint' }); throw new Error('Expiry checkpoint lost'); }).mockResolvedValue(rc);
    controller.retry.mockImplementation(async () => { controller.pending.mockReturnValue(null); return rc; });
    const done = { ...rc, snapshot: { ...rc.snapshot, sitting: { ...rc.snapshot.sitting, phase: 'complete' } } };
    controller.close.mockImplementation(async () => { controller.clock.mockReturnValue({ writer: 'terminal', remainingMs: 0 }); return done; });
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Expiry checkpoint lost');
    expect(controller.close).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'View section report' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry saved command' }));
    await screen.findByRole('button', { name: 'View section report' });
    expect(controller.retry).toHaveBeenCalledTimes(1);
    expect(controller.retry.mock.invocationCallOrder[0]).toBeLessThan(controller.close.mock.invocationCallOrder[0]);
    expect(controller.close).toHaveBeenCalledTimes(1);
  });
  it('keeps LR highlights on this device, cuts overlaps, and restores them after a reload', async () => {
    const view = mount();
    await screen.findByText('Verified question');
    fireEvent.change(screen.getByLabelText('Marker'), { target: { value: 'yellow' } });
    nextCapture = [{ section: 'stimulus', start: 0, end: 4, text: 'Text' }];
    fireEvent.click(screen.getByRole('button', { name: 'Drag select' }));
    fireEvent.change(screen.getByLabelText('Marker'), { target: { value: 'pink' } });
    nextCapture = [{ section: 'stimulus', start: 2, end: 6, text: 'xt ab' }];
    fireEvent.click(screen.getByRole('button', { name: 'Drag select' }));
    expect(screen.getByTestId('lr-marks').textContent).toBe('0-2,2-6');
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(() => expect(controller.checkpoint).toHaveBeenCalled());
    expect(JSON.stringify(controller.checkpoint.mock.calls[0][2])).not.toContain('"section":"stimulus"');
    view.unmount();
    mount();
    await screen.findByText('Verified question');
    expect(screen.getByTestId('lr-marks').textContent).toBe('0-2,2-6');
  });
  it('freezes LR regulation answers before permitting overtime answers', async () => {
    const lr = state(); lr.answers.q1.selected = 'A'; controller.load.mockResolvedValue(lr);
    controller.clock.mockReturnValue({ writer: 'active', remainingMs: 0, elapsedMs: 2100001 });
    controller.checkpoint.mockImplementation(async (_state, _index, _answers, regulation) => ({ ...state(), regulationAnsweredQids: regulation }));
    mount();
    await waitFor(() => expect(controller.checkpoint).toHaveBeenCalledWith(expect.anything(), 0, expect.anything(), ['q1']), { timeout: 2000 });
    await screen.findByText('Overtime +0:01');
    expect(controller.close).not.toHaveBeenCalled();
  });
  it('hides the former account section immediately on an account switch', async () => {
    const view = mount(); await screen.findByText('Verified question');
    controller.load.mockReturnValue(new Promise(() => {}));
    actor = '10000000-0000-4000-8000-000000000002'; view.rerender(tree());
    expect(screen.queryByText('Verified question')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Loading your account section');
    expect(controller.checkpoint).not.toHaveBeenCalled();
  });
  it('surfaces disabled creation without silently swallowing the capability reason', async () => {
    controller.load.mockRejectedValue(new TimedSectionError('access', 'Unknown account sitting'));
    controller.create.mockRejectedValue(new TimedSectionError('capability', 'The protected section writer is not available.'));
    mount('?kind=lr&pt=140&section=1&pace=standard');
    fireEvent.click(await screen.findByRole('button', { name: 'Prepare section' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The protected section writer is not available.');
    expect(controller.control).not.toHaveBeenCalled();
  });
  it('resets busy for a new owner while an old owner command remains in flight', async () => {
    let finishOld: (value: TimedSectionState) => void = () => {};
    controller.checkpoint.mockReturnValue(new Promise<TimedSectionState>(resolve => { finishOld = resolve; }));
    const view = mount(); await screen.findByText('Verified question'); fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(() => expect(controller.checkpoint).toHaveBeenCalledTimes(1));
    const next = state(); actor = '10000000-0000-4000-8000-000000000002'; next.snapshot.sitting.owner_id = actor;
    controller.load.mockResolvedValue(next); view.rerender(tree());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Select A' })).toBeEnabled());
    await act(async () => finishOld(state()));
    expect(screen.getByRole('button', { name: 'Select A' })).toBeEnabled();
    expect(controller.control).not.toHaveBeenCalled();
  });
  it('does not describe local answer changes as acknowledged account saves', async () => {
    let acknowledge: (value: TimedSectionState) => void = () => {};
    controller.checkpoint.mockReturnValue(new Promise<TimedSectionState>(resolve => { acknowledge = resolve; }));
    mount(); await screen.findByText('Verified question');
    fireEvent.click(screen.getByRole('button', { name: 'Select A' }));
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('status')).toHaveTextContent('Saving to your account');
    await act(async () => acknowledge(state()));
    expect(screen.getByRole('status')).toHaveTextContent('Account save acknowledged');
  });
  it('acknowledges checkpoint and pause before leaving a running section', async () => {
    mount(); await screen.findByText('Verified question');
    fireEvent.click(screen.getByRole('button', { name: 'Testing' }));
    await screen.findByText('Testing destination');
    expect(controller.checkpoint.mock.invocationCallOrder[0]).toBeLessThan(controller.control.mock.invocationCallOrder[0]);
    expect(controller.control).toHaveBeenCalledWith(expect.anything(), 'pause');
  });
  it('stays in recovery when the account cannot acknowledge the exit checkpoint', async () => {
    controller.checkpoint.mockRejectedValue(new Error('Exit save failed'));
    mount(); await screen.findByText('Verified question');
    fireEvent.click(screen.getByRole('button', { name: 'Testing' }));
    await screen.findByRole('alert'); expect(screen.queryByText('Testing destination')).toBeNull();
    expect(controller.control).not.toHaveBeenCalled();
  });
});
