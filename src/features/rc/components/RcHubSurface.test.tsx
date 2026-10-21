import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* The surface's own navigate is spied so the autostart's `replace` is
   assertable; the driver below needs the REAL one to change the query. */
const navigate = vi.fn();
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
  listSessions: vi.fn(async () => []),
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

function mount(entry: string, next?: string) {
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
              <RcHubSurface embedded showHistory={false} />
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
    expect(await screen.findByText('The passage list could not be loaded.')).toBeInTheDocument();
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
