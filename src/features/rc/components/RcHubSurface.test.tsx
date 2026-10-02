import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* The surface's own navigate is spied so the autostart's `replace` is
   assertable; the driver below needs the REAL one to change the query. */
const navigate = vi.fn();
const adoption = vi.hoisted(() => ({ enabled: false, sessions: [] as unknown[] }));
vi.mock('@/lib/timedSectionAdoption', async () => {
  const actual = await vi.importActual<typeof import('@/lib/timedSectionAdoption')>('@/lib/timedSectionAdoption');
  return { ...actual, manualSectionsEnabled: vi.fn(async () => adoption.enabled), canonicalRcSection: (ids: number[]) => ids.length === 1 && ids[0] === 1188 ? { pt: 101, section: 1 } : undefined };
});
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

/* Typed with the real signature. A `(...args: unknown[])` wrapper makes
   TypeScript infer `mock.calls[n]` as a zero-length tuple, so every assertion
   that reads the passage-ids argument is a type error. */
const createSession = vi.fn(async (_config: RcDrillConfig, _passageIds: number[]) => ({
  id: 'session-1',
}));
const loadPassages = vi.fn(async (ids: number[]) => ids.map((passageId) => ({
  passageId,
  preptest: 140,
  section: 1,
  setNumber: 1,
  title: `Passage ${passageId}`,
  topic: 'Science',
  format: 'Single',
  frameworks: [],
  difficulty: 3,
  text: 'Passage text.',
  summaries: { standard: null, brief: null, anotherWay: null },
  questions: [{
    questionId: passageId * 10,
    position: 1,
    questionType: 'Main point',
    questionTypeFamily: 'Main point',
    difficulty: 3,
    prompt: 'What is the main point?',
    correctAnswer: 'A',
    hasWrittenExplanation: true,
    explanationBlocks: [{ heading: null, body: 'Secret explanation' }],
    totalResponses: 1,
    features: [],
    choices: ['A', 'B', 'C', 'D', 'E'].map((letter) => ({
      letter, text: `${letter} choice`, tag: null, percent: null,
      responseCount: null, correct: letter === 'A', explanation: 'Secret reason',
    })),
  }],
})));
vi.mock('../api/rcProgress', () => ({
  createSession: (config: RcDrillConfig, passageIds: number[]) =>
    createSession(config, passageIds),
  deleteSession: vi.fn(),
  getQuestionHistory: vi.fn(async () => new Map()),
  getSessionAttempts: vi.fn(async () => []),
  listSessions: vi.fn(async () => adoption.sessions),
}));

/** Three drillable passages, enough for the adaptive selector to return one. */
vi.mock('../lib/rcBank', () => ({
  loadPassages: (ids: number[]) => loadPassages(ids),
  loadAllIndexPassages: vi.fn(async () =>
    [1188, 1201, 1202].map((passageId, i) => ({
      passageId,
      preptest: 140 + i,
      section: 1,
      setNumber: 1,
      title: `Passage ${passageId}`,
      firstWords: 'Some opening words',
      topic: 'Science',
      format: 'Single',
      frameworks: [],
      difficulty: 3,
      questionCount: 5,
      questionIds: [passageId * 10, passageId * 10 + 1],
    })),
  ),
}));

import { RcHubSurface } from './RcHubSurface';
import type { RcDrillConfig } from '../lib/rcTypes';

/**
 * Changes the query WITHOUT remounting the surface. Both URLs match the same
 * route, so React Router keeps the component mounted — which is the case the
 * stale-selection bug actually lived in.
 */
function QueryDriver({ to }: { to: string }) {
  // useSearchParams, not useNavigate: this file mocks the useNavigate EXPORT so
  // the surface's own navigation is assertable, and the driver has to do a real
  // one. useSearchParams routes through the router's internals, which the mock
  // does not touch.
  const [, setSearchParams] = useSearchParams();
  return (
    <button type="button" onClick={() => setSearchParams(new URLSearchParams(to))}>
      next link
    </button>
  );
}

function mount(entry: string, next?: string, showHistory = false) {
  return render(
    <MemoryRouter
      initialEntries={[entry]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route
          path="/classroom/drill"
          element={
            <>
              <RcHubSurface embedded showHistory={showHistory} />
              {next && <QueryDriver to={next} />}
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RcHubSurface autostart', () => {
  beforeEach(() => {
    navigate.mockClear();
    createSession.mockClear();
    loadPassages.mockClear();
    adoption.enabled = false;
    adoption.sessions = [];
  });

  it('REPLACES the launcher URL when a link starts the drill itself', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&count=1&timing=untimed&reveal=per_passage&start=1');

    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    // Without replace, Back from the player re-mounts this builder, re-reads
    // start=1, and creates a second session for the same click.
    expect(navigate).toHaveBeenCalledWith(
      expect.stringContaining('/rc/drill?sessionId=session-1'),
      { replace: true },
    );
  });
  it('hands an explicitly marked canonical full section to protected timing without creating a legacy child', async () => {
    adoption.enabled = true;
    mount('/classroom/drill?section=rc&passages=1188&start=1&reveal=end_of_set&timing=standard&secondsPerPassage=788&timedSection=manual-canonical');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(expect.stringMatching(/^\/testing\/sections\/[0-9a-f-]+\?kind=rc&pt=101&section=1&pace=time-and-a-half$/), { replace: true }));
    expect(createSession).not.toHaveBeenCalled();
  });
  it.each([
    '&timedSection=manual-canonical',
    '',
    '&timedSection=manual-canonical&assignmentId=assignment',
    '&timedSection=manual-canonical&ptRun=test&ptLeg=0',
  ])('preserves disabled and nonmanual legacy launches: %s', async suffix => {
    adoption.enabled = suffix !== '&timedSection=manual-canonical';
    mount(`/classroom/drill?section=rc&passages=1188&start=1&reveal=end_of_set&timing=standard${suffix}`);
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('/rc/drill?sessionId='), { replace: true });
  });
  it('keeps protected resume dedicated even with creation disabled', async () => {
    const id = '10000000-0000-4000-8000-000000000001';
    adoption.sessions = [{ id: 'child', config: { timedSectionSittingId: id, timing: { mode: 'unlimited' }, reveal: 'end_of_set' }, status: 'in_progress', passageIds: [1188], startedAt: '2026-09-30T00:00:00Z' }];
    mount('/classroom/drill?section=rc', undefined, true);
    fireEvent.click(await screen.findByRole('button', { name: 'Resume' }));
    expect(navigate).toHaveBeenCalledWith(`/testing/sections/${id}`);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('carries the practice-test identity into the RC player route', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188&start=1&ptRun=run-1&ptLeg=0');
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][0]).toMatchObject({
      practiceTestRunId: 'run-1',
      practiceTestLegIndex: 0,
    });
    expect(navigate).toHaveBeenCalledWith(
      expect.stringContaining('/rc/drill?sessionId=session-1&ptRun=run-1&ptLeg=0'),
      { replace: true },
    );
  });

  it('does not autostart a link that only describes a drill', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&count=2');
    await screen.findByRole('button', { name: 'Inspect set' });
    expect(createSession).not.toHaveBeenCalled();
  });

  it('starts a hand-picked link on exactly the passages it names', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188,1201&start=1');
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual([1188, 1201]);
  });

  it('clears a previous hand-pick when the next link names no passages', async () => {
    /* One mount throughout — unmounting between the two links would prove
       nothing, since a fresh surface starts with an empty selection anyway.
       Neither link autostarts: after a real autostart the surface unmounts
       into the player, so the stale-state case only exists on a surface that
       is still on screen. */
    mount(
      '/classroom/drill?section=rc&stage=type-drill&passages=1188,1201',
      'section=rc&stage=type-drill&count=1',
    );
    expect(await screen.findByText(/2 passages ·/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'next link' }));
    await waitFor(() => expect(screen.queryByText(/2 passages ·/)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Inspect set' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(createSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start this drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    // One adaptive passage, not the two the PREVIOUS link named.
    expect(createSession.mock.calls[0][1]).toHaveLength(1);
  });

  it('says so rather than starting nothing when the passage index fails', async () => {
    const bank = await import('../lib/rcBank');
    vi.mocked(bank.loadAllIndexPassages).mockRejectedValueOnce(new Error('offline'));
    mount('/classroom/drill?section=rc&stage=type-drill&count=1&start=1');
    expect(await screen.findByText(/The passage list could not be loaded\./)).toBeInTheDocument();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('inspects exact passages without exposing answer keys or creating an attempt', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188,1201');
    await screen.findByText(/2 passages ·/);
    fireEvent.click(screen.getAllByRole('button', { name: 'Inspect set' })[0]);
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(loadPassages).toHaveBeenCalledWith([1188, 1201]);
    expect(createSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText(/PT 140 · Passage 1188/));
    expect(screen.getAllByText('What is the main point?')).toHaveLength(2);
    expect(screen.queryByText('Secret explanation')).not.toBeInTheDocument();
    expect(screen.queryByText('Secret reason')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Start this drill' })[0]);
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual([1188, 1201]);
  });

  it('requires a new inspection after passage count changes', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&count=1');
    fireEvent.click(await screen.findByRole('button', { name: 'Inspect set' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(screen.getByRole('button', { name: 'More passages' }));
    expect(screen.queryByRole('region', { name: 'Selected reading set' })).not.toBeInTheDocument();
    expect(createSession).not.toHaveBeenCalled();
  });
});

describe('RcHubSurface launch truth (#171)', () => {
  beforeEach(async () => {
    navigate.mockClear();
    createSession.mockReset();
    createSession.mockImplementation(async () => ({ id: 'session-1' }));
    loadPassages.mockClear();
    adoption.enabled = false;
    adoption.sessions = [];
    const progress = await import('../api/rcProgress');
    vi.mocked(progress.listSessions).mockClear();
    vi.mocked(progress.deleteSession).mockClear();
  });

  const primary = () => screen.getAllByRole('button', { name: /^(Inspect set|Start this drill|Loading set…|Starting…)$/ })[0];
  const launchSummary = () => screen.getByRole('region', { name: 'Launch summary' });

  it('times the hand-picked passages, not the stepper, and says the count is in passages', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188,1201&timing=standard');
    await screen.findByText(/2 passages ·/);
    expect(screen.getByText('8:45 per passage · 17:30 for 2 passages')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More passages' })).toBeDisabled();
    expect(screen.getByText(/Using your 2 hand-picked passages/)).toBeInTheDocument();
    expect(within(launchSummary()).getByText('2 hand-picked passages')).toBeInTheDocument();
    expect(within(launchSummary()).getByText('Timed, 8:45 per passage (17:30 in all)')).toBeInTheDocument();
  });

  it('keeps an invalid custom time editable, explains it, and blocks Inspect until it is valid', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&count=1');
    await screen.findByRole('button', { name: 'Inspect set' });
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    const field = screen.getByRole('textbox', { name: 'Minutes and seconds per passage' });
    fireEvent.change(field, { target: { value: '8:75' } });
    expect(field).toHaveValue('8:75');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Seconds must be between 00 and 59.');
    expect(primary()).toBeDisabled();

    fireEvent.change(field, { target: { value: '10' } });
    fireEvent.blur(field);
    expect(field).toHaveValue('10:00');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(primary());
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    // The validated pace is what the session is created with.
    expect(createSession.mock.calls[0][0]).toMatchObject({
      source: 'adaptive',
      reveal: 'per_passage',
      timing: { mode: 'per_passage_budget', secondsPerPassage: 600 },
    });
  });

  it('counts launched questions from loaded content and launches exactly the inspected passages', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188,1201&reveal=end_of_set');
    await screen.findByText(/2 passages ·/);
    // The index says five questions each; nothing is promised before loading.
    expect(within(launchSummary()).getByText('Inspect the set to see its exact passages and question count')).toBeInTheDocument();
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    // The loaded passages carry one question each, and that is what is shown.
    expect(within(launchSummary()).getByText('2 passages · 2 questions')).toBeInTheDocument();
    fireEvent.click(primary());
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual([1188, 1201]);
    expect(createSession.mock.calls[0][0]).toMatchObject({ source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' } });
  });

  it('requires acknowledging a smaller adaptive set before Start, and never claims the requested size', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&count=4');
    await screen.findByRole('button', { name: 'Inspect set' });
    expect(screen.getByText(/Only 3 passages match/)).toBeInTheDocument();
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(within(launchSummary()).getByText('3 passages · 3 questions')).toBeInTheDocument();
    expect(primary()).toBeDisabled();
    fireEvent.click(primary());
    expect(createSession).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox', { name: /Only 3 passages of the 4 you asked for/ }));
    expect(primary()).toBeEnabled();
    fireEvent.click(primary());
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toHaveLength(3);
  });

  it('drops an inspection that resolves after a setting changed, and says the set was cleared', async () => {
    let release: () => void = () => {};
    loadPassages.mockImplementationOnce(async (ids: number[]) => {
      await new Promise<void>((resolve) => { release = resolve; });
      return ids.map((passageId) => ({ passageId, questions: [{ questionId: 1, position: 1, prompt: 'Q', choices: [] }] })) as never;
    });
    mount('/classroom/drill?section=rc&stage=type-drill&count=1');
    fireEvent.click(await screen.findByRole('button', { name: 'Inspect set' }));
    fireEvent.click(screen.getByRole('button', { name: 'More passages' }));
    release();
    await waitFor(() => expect(primary()).toHaveTextContent('Inspect set'));
    expect(screen.queryByRole('region', { name: 'Selected reading set' })).not.toBeInTheDocument();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('marks an inspected set stale when a setting changes', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&count=1');
    fireEvent.click(await screen.findByRole('button', { name: 'Inspect set' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(screen.getByRole('button', { name: /At the end/ }));
    expect(screen.getByText(/settings changed, so the inspected set was cleared/)).toBeInTheDocument();
    expect(primary()).toHaveTextContent('Inspect set');
  });

  it('will not pass inspection when a passage loads without questions', async () => {
    loadPassages.mockImplementationOnce(async (ids: number[]) =>
      ids.map((passageId) => ({ passageId, preptest: 140, title: 'Empty', setNumber: 1, text: 'x', questions: [] })) as never);
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188');
    await screen.findByText(/1 passage ·/);
    fireEvent.click(primary());
    expect(await screen.findByText(/loaded without its questions/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Selected reading set' })).not.toBeInTheDocument();
  });

  it('shows no pool count on a failed first read, then Retry restores the builder', async () => {
    const bank = await import('../lib/rcBank');
    vi.mocked(bank.loadAllIndexPassages).mockRejectedValueOnce(new Error('offline'));
    mount('/classroom/drill?section=rc&stage=type-drill&count=1');
    expect(await screen.findByText(/The passage list could not be loaded\./)).toBeInTheDocument();
    expect(screen.getByText('Passage list unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/Choosing from 0 of 0/)).not.toBeInTheDocument();
    expect(within(launchSummary()).getByText('Not known until the passage list loads')).toBeInTheDocument();
    expect(primary()).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Choosing from 3 of 3 passages')).toBeInTheDocument();
    expect(primary()).toBeEnabled();
  });

  it('keeps hand-picks but blocks launch when a refresh fails', async () => {
    const bank = await import('../lib/rcBank');
    const progress = await import('../api/rcProgress');
    // History fails first, so the builder offers Retry; the retry then loses
    // the passage list after the hand-picks were already applied.
    vi.mocked(progress.getQuestionHistory).mockRejectedValueOnce(new Error('offline'));
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188,1201');
    await screen.findByText(/2 passages ·/);
    expect(screen.getByText(/answer history could not be loaded/)).toBeInTheDocument();

    vi.mocked(bank.loadAllIndexPassages).mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/Your choices are kept/)).toBeInTheDocument();
    expect(screen.getByText(/2 passages ·/)).toBeInTheDocument();
    for (const button of screen.getAllByRole('button', { name: 'Inspect set' })) expect(button).toBeDisabled();
    expect(loadPassages).not.toHaveBeenCalled();
  });

  it('starts once when Start is pressed twice before the create call returns', async () => {
    let finish: (value: { id: string }) => void = () => {};
    createSession.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188');
    await screen.findByText(/1 passage ·/);
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    const startButton = primary();
    // Both clicks land in one batch, before React re-renders the button as
    // disabled, which is the window a double-click or a key repeat hits.
    act(() => {
      startButton.click();
      startButton.click();
    });
    finish({ id: 'session-once' });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(expect.stringContaining('sessionId=session-once'), { replace: undefined }));
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it('recovers the session a failed create actually saved instead of making a second one', async () => {
    const progress = await import('../api/rcProgress');
    createSession.mockRejectedValueOnce(new Error('network reset'));
    vi.mocked(progress.listSessions)
      .mockRejectedValueOnce(new Error('still offline'))
      .mockResolvedValueOnce([{
        id: 'saved-before-reset', status: 'in_progress', passageIds: [1188],
        startedAt: new Date().toISOString(), config: { reveal: 'per_passage', timing: { mode: 'unlimited' } },
      }] as never);
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188');
    await screen.findByText(/1 passage ·/);
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });

    fireEvent.click(primary());
    expect(await screen.findByText('network reset We could not confirm whether the drill was created. Press Start again and we will check before making a new one.')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();

    fireEvent.click(primary());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(expect.stringContaining('sessionId=saved-before-reset'), { replace: undefined }));
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it('inspects without creating, deleting, or listing sessions', async () => {
    const progress = await import('../api/rcProgress');
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188,1201');
    await screen.findByText(/2 passages ·/);
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(createSession).not.toHaveBeenCalled();
    expect(progress.deleteSession).not.toHaveBeenCalled();
    expect(progress.listSessions).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
