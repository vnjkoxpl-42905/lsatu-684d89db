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
vi.mock('@/components/drill/official/OfficialQuestionPane', () => ({ default: ({ question, onAnswerSelect, interactionLocked }: { question: { questionStem: string }; onAnswerSelect(answer: string): void; interactionLocked: boolean }) => <div>{question.questionStem}<button disabled={interactionLocked} onClick={() => onAnswerSelect('A')}>Select A</button></div> }));
function state(phase = 'running'): TimedSectionState {
  return { snapshot: { sitting: { id: work, owner_id: owner, pt: 140, section: 1, kind: 'lr', phase, budget_ms: 2100000 }, pending: null },
    questions: [{ qid: 'q1', qnum: 1, questionStem: 'Verified question', stimulus: 'Text', answerChoices: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' }, correctAnswer: 'A', qtype: 'Necessary Assumption', difficulty: 3 }],
    passages: [], currentIndex: 0, answers: { q1: { selected: null, timeMs: 0, flagged: false, switchCount: 0, eliminations: [] } },
  } as unknown as TimedSectionState;
}
let controller: Record<string, ReturnType<typeof vi.fn>>;
beforeEach(() => {
  actor = owner;
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
  it('closes RC at its acknowledged budget boundary after saving current answers', async () => {
    const rc = state(); rc.snapshot.sitting.kind = 'rc'; controller.load.mockResolvedValue(rc);
    controller.clock.mockReturnValue({ writer: 'active', remainingMs: 0, elapsedMs: 2100000 });
    controller.close.mockImplementation(async () => { controller.clock.mockReturnValue({ writer: 'terminal', remainingMs: 0 }); return state('complete'); });
    mount();
    await waitFor(() => expect(controller.close).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(controller.checkpoint.mock.invocationCallOrder[0]).toBeLessThan(controller.close.mock.invocationCallOrder[0]);
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
