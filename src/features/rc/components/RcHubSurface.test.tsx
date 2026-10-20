vi.mock('../api/rcSavedSets', () => ({ listRcSavedSets: vi.fn(async () => []), getRcSavedSet: vi.fn(), saveRcSet: vi.fn(), renameRcSet: vi.fn() }));
import type { RcDrillSession } from '../lib/rcTypes';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* The surface's own navigate is spied so the autostart's `replace` is
   assertable; the driver below needs the REAL one to change the query. */
const navigate = vi.fn();
const auth = vi.hoisted(() => ({ id: 'owner' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: auth.id } }) }));
const getSession = vi.fn(async (_id: string, _actor?: string) => null as RcDrillSession | null);
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
const createSession = vi.fn(async (config: RcDrillConfig, passageIds: number[], request?: { id: string; actorId: string }) => ({
  id: request?.id ?? 'session-1', userId: request?.actorId ?? 'owner', config, passageIds, status: 'in_progress',
} as RcDrillSession));
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
  getRcHistorySnapshot: vi.fn(async () => { const history = await (await import('../api/rcProgress')).getQuestionHistory(); return { history, displayHistory: history, hasHiddenGradedResults: false }; }),
  createSession: (config: RcDrillConfig, passageIds: number[], request?: { id: string; actorId: string }) =>
    createSession(config, passageIds, request),
  getSession: (id: string, actor?: string) => getSession(id, actor),
  deleteSession: vi.fn(),
  abandonSession: vi.fn(),
  getQuestionHistory: vi.fn(async () => new Map()),
  getSessionAttempts: vi.fn(async () => []),
  listSessions: vi.fn(async () => adoption.sessions),
}));
vi.mock('../api/rcExposure', async () => ({ ...(await vi.importActual('../api/rcExposure')), getRcExposureHistory: vi.fn(async () => new Set<number>()), recordRcPassageExposure: vi.fn(async () => undefined) }));

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
import { getRcSavedSet } from '../api/rcSavedSets';
import type { RcSavedPayload } from '../lib/rcSavedSetCodec';
import type { RcDrillConfig } from '../lib/rcTypes';

beforeEach(async () => {
  localStorage.clear();
  const progress = await import('../api/rcProgress');
  vi.mocked(progress.getQuestionHistory).mockReset().mockResolvedValue(new Map());
});

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

function ModeLocationProbe() {
  const location = useLocation();
  return <output data-testid="mode-location">{JSON.stringify({ search: location.search, state: location.state })}</output>;
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
  it('opens the manual landing entry without selecting or starting any passages', async () => {
    mount('/classroom/drill?section=rc&builder=manual');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pick passages' })).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByRole('button', { name: 'Preview drill' })).toBeDisabled();
    expect(await screen.findByRole('button', { name: 'Add Passage 1188' })).toBeEnabled();
    expect(createSession).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    sessionStorage.clear();
  auth.id = 'owner';
  getSession.mockReset().mockResolvedValue(null);
    navigate.mockClear();
    createSession.mockClear();
    loadPassages.mockClear();
    adoption.enabled = false;
    adoption.sessions = [];
  });

  it('keeps exposure unknown on a failed ledger read while legacy not-attempted selection remains available', async () => {
    const exposure = await import('../api/rcExposure');
    vi.mocked(exposure.getRcExposureHistory).mockRejectedValueOnce(new Error('offline'));
    mount('/classroom/drill?section=rc');
    await screen.findByText(/Recorded exposure could not be checked/);
    fireEvent.click(screen.getByRole('button', { name: 'Advanced filters' }));
    expect(screen.getByRole('button', { name: 'No recorded exposure' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Not attempted' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Preview drill' })).toBeEnabled();
  });

  it('excludes full-text exposure independently from the legacy answer-history filter', async () => {
    const exposure = await import('../api/rcExposure');
    vi.mocked(exposure.getRcExposureHistory).mockResolvedValueOnce(new Set([1188]));
    mount('/classroom/drill?section=rc');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Preview drill' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Advanced filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'No recorded exposure' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include passages whose earlier exposure is unknown' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview drill' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(loadPassages.mock.calls[0][0]).not.toContain(1188);
    expect(screen.queryByText('What is the main point?')).not.toBeInTheDocument();
  });

  it('keeps outcome filters available while withholding unreleased adaptive numbers', async () => {
    const progress = await import('../api/rcProgress');
    vi.mocked(progress.getRcHistorySnapshot).mockResolvedValueOnce({ history: new Map(), displayHistory: new Map(), hasHiddenGradedResults: true });
    mount('/classroom/drill?section=rc');
    await screen.findByText(/Some saved results are still hidden/);
    fireEvent.click(screen.getByRole('button', { name: 'Advanced filters' }));
    expect(screen.getByRole('button', { name: 'Incorrect before' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Incorrect on last try' })).toBeEnabled();
    expect(screen.queryByText(/% correct/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview drill' })).toBeEnabled();
  });
  it.each(['Incorrect before', 'Incorrect on last try'])('previews only released misses with %s despite other hidden results', async label => {
    const progress = await import('../api/rcProgress');
    const miss = { questionId: 11880, attempts: 1, everIncorrect: true, incorrectOnLastTake: true, lastFirstTakeIncorrect: true,
      incorrectCount: 1, lastSeenAt: '2026-10-17T12:00:00Z', lastGradedAt: '2026-10-17T12:00:00Z', answered: true, firstEverCorrect: false, firstTakeCorrect: false };
    vi.mocked(progress.getRcHistorySnapshot).mockResolvedValueOnce({ history: new Map([[11880, miss], [12010, { ...miss, questionId: 12010 }]]),
      displayHistory: new Map([[11880, miss]]), hasHiddenGradedResults: true });
    mount('/classroom/drill?section=rc');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Preview drill' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Advanced filters' }));
    fireEvent.click(screen.getByRole('button', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview drill' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(loadPassages.mock.calls.at(-1)?.[0]).toEqual([1188]);
  });
  it('does not let an unrevealed high grade change the selected difficulty', async () => {
    const progress = await import('../api/rcProgress');
    const bank = await import('../lib/rcBank');
    const passages = await bank.loadAllIndexPassages();
    vi.mocked(bank.loadAllIndexPassages).mockResolvedValueOnce(passages.map((passage, index) => ({ ...passage, difficulty: [2, 4, 5][index] })));
    const hiddenEntry = { questionId: 11880, attempts: 1, everIncorrect: false, incorrectOnLastTake: false, incorrectCount: 0,
      lastSeenAt: '2026-10-17T12:00:00Z', lastGradedAt: '2026-10-17T12:00:00Z', answered: true, firstEverCorrect: true, firstTakeCorrect: true };
    vi.mocked(progress.getRcHistorySnapshot).mockResolvedValueOnce({ history: new Map([[11880, hiddenEntry]]),
      displayHistory: new Map([[11880, { ...hiddenEntry, firstTakeCorrect: null, firstEverCorrect: null, lastGradedAt: null }]]), hasHiddenGradedResults: true });
    mount('/classroom/drill?section=rc');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Preview drill' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Advanced filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Any' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview drill' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(loadPassages.mock.calls[0][0]).toEqual([1188]);
  });

  it('restores a fixed saved selection without starting and verifies its exact question snapshot', async () => {
    const payload: RcSavedPayload = { kind: 'rc-builder', version: 1, mode: 'fixed', count: 1, passageIds: [1188], questionIds: [999], config: { reveal: 'per_question', timing: { mode: 'unlimited' } }, filters: { topics: [], formats: [], frameworks: [], families: [], difficulties: [], status: 'any', preptestMin: 101, preptestMax: 148 } };
    vi.mocked(getRcSavedSet).mockResolvedValue({ id: 'saved-fixed', userId: 'owner', name: 'Fixed passages', createdAt: '2026-10-17', payload, problem: null });
    mount('/classroom/drill?saved=saved-fixed');
    await screen.findByText(/Opened Fixed passages/);
    expect(createSession).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /After each question/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Preview drill' }));
    await screen.findByText(/questions in this fixed set have changed/);
    expect(screen.queryByRole('button', { name: 'Start this drill' })).toBeNull();
    expect(createSession).not.toHaveBeenCalled();
  });
  it('restores recipe filters and timing but requires a new inspection before Start', async () => {
    const payload: RcSavedPayload = { kind: 'rc-builder', version: 1, mode: 'recipe', count: 2, passageIds: [], questionIds: [], config: { reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 600 } }, filters: { topics: ['Science'], formats: [], frameworks: [], families: [], difficulties: [], status: 'fresh', preptestMin: 101, preptestMax: 148 } };
    vi.mocked(getRcSavedSet).mockResolvedValue({ id: 'saved-recipe', userId: 'owner', name: 'Science recipe', createdAt: '2026-10-17', payload, problem: null });
    mount('/classroom/drill?saved=saved-recipe');
    await screen.findByText(/Opened Science recipe/);
    expect(createSession).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Minutes and seconds per passage' })).toHaveValue('10:00');
    fireEvent.click(screen.getByRole('button', { name: 'Preview drill' })); await screen.findByRole('button', { name: 'Start this drill' });
    expect(createSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start this drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][0]).toMatchObject({ source: 'adaptive', reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 600 } });
  });
  it('configures intent presets without creating work', async () => {
    mount('/classroom/drill'); await screen.findByRole('button', { name: 'Preview drill' });
    fireEvent.click(screen.getByRole('button', { name: 'Four passages, then review' }));
    expect(screen.getByRole('button', { name: /At the end/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Standard pace/ })).toHaveAttribute('aria-pressed', 'true');
    expect(createSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'One passage with feedback' }));
    expect(screen.getByRole('button', { name: 'Untimed' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /After each passage/ })).toHaveAttribute('aria-pressed', 'true');
  });
  it('restores an owner timing default but explicit links win', async () => {
    localStorage.setItem('lsatu:rc-timing-default:v1:owner', JSON.stringify({ mode: 'custom', seconds: 600 }));
    const view = mount('/classroom/drill');
    expect(await screen.findByRole('textbox', { name: 'Minutes and seconds per passage' })).toHaveValue('10:00'); view.unmount();
    mount('/classroom/drill?timing=untimed'); await screen.findByRole('button', { name: 'Preview drill' });
    expect(screen.getByRole('button', { name: 'Untimed' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('saves timing only when requested and makes failed defaults honest', async () => {
    localStorage.setItem('lsatu:rc-timing-default:v1:owner', 'broken');
    mount('/classroom/drill'); await screen.findByText(/timing default could not be read/);
    fireEvent.click(screen.getByRole('button', { name: /Standard pace/ }));
    expect(localStorage.getItem('lsatu:rc-timing-default:v1:owner')).toBe('broken');
    fireEvent.click(screen.getByRole('button', { name: 'Save timing default on this device' }));
    expect(JSON.parse(localStorage.getItem('lsatu:rc-timing-default:v1:owner')!)).toEqual({ mode: 'standard', seconds: 525 });
  });
  it('clears just passage filters without resetting the drill timing', async () => {
    mount('/classroom/drill?timing=standard'); await screen.findByRole('button', { name: 'Preview drill' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove status filter' }));
    expect(screen.queryByRole('button', { name: 'Remove status filter' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Clear passage filters' }));
    expect(screen.getByRole('button', { name: /Standard pace/ })).toHaveAttribute('aria-pressed', 'true');
  });
  it('sorts manual passages and reorders the actual inspected selection', async () => {
    mount('/classroom/drill?passages=1188,1201'); await screen.findByRole('button', { name: 'Move Passage 1201 earlier' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort passages' }), { target: { value: 'title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move Passage 1201 earlier' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview drill' }));
    await screen.findByRole('button', { name: 'Start this drill' });
    expect(loadPassages).toHaveBeenLastCalledWith([1201, 1188]);
    expect(createSession).not.toHaveBeenCalled();
  });
  it('requires explicit inclusion of unknown earlier exposure for strict selection', async () => {
    mount('/classroom/drill'); await screen.findByRole('button', { name: 'Preview drill' });
    fireEvent.click(screen.getByRole('button', { name: 'Advanced filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'No recorded exposure' }));
    expect(screen.getByRole('button', { name: 'Preview drill' })).toBeDisabled();
    const permission = screen.getByRole('checkbox', { name: 'Include passages whose earlier exposure is unknown' });
    expect(permission).not.toBeChecked(); fireEvent.click(permission);
    expect(screen.getByRole('button', { name: 'Preview drill' })).toBeEnabled();
  });
  it('rechecks exposure at Start and preserves the selection instead of silently substituting', async () => {
    const exposure = await import('../api/rcExposure');
    mount('/classroom/drill'); await screen.findByRole('button', { name: 'Preview drill' });
    fireEvent.click(screen.getByRole('button', { name: 'Advanced filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'No recorded exposure' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include passages whose earlier exposure is unknown' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview drill' }));
    await screen.findByRole('button', { name: 'Start this drill' });
    const selected = loadPassages.mock.calls.at(-1)![0];
    vi.mocked(exposure.getRcExposureHistory).mockResolvedValueOnce(new Set(selected));
    fireEvent.click(screen.getByRole('button', { name: 'Start this drill' }));
    await screen.findByText(/A selected passage now has recorded exposure/);
    expect(createSession).not.toHaveBeenCalled();
  });
  it('REPLACES the launcher URL when a link starts the drill itself', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&count=1&timing=untimed&reveal=per_passage&start=1');

    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    // Without replace, Back from the player re-mounts this builder, re-reads
    // start=1, and creates a second session for the same click.
    expect(navigate).toHaveBeenCalledWith(
      expect.stringContaining('/rc/drill?sessionId='),
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
      expect.stringMatching(/sessionId=.*&ptRun=run-1&ptLeg=0/),
      { replace: true },
    );
  });

  it('does not autostart a link that only describes a drill', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&count=2');
    await screen.findByRole('button', { name: 'Preview drill' });
    expect(createSession).not.toHaveBeenCalled();
  });

  it('starts a hand-picked link on exactly the passages it names', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188,1201&start=1');
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual([1188, 1201]);
  });

  it.each(['1188,999999', '1188,invalid', '1188,1188', '', '1188,', '-1'])(
    'stops an invalid linked selection at configuration: %s', async ids => {
      mount(`/classroom/drill?section=rc&passages=${ids}&start=1`);
      await screen.findByText(/linked passages could not be verified/);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Preview drill' })).toBeEnabled());
      expect(createSession).not.toHaveBeenCalled();
      expect(loadPassages).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it('requires acknowledgment rather than autostarting a smaller adaptive set', async () => {
    mount('/classroom/drill?section=rc&count=4&start=1');
    await screen.findByRole('region', { name: 'Selected reading set' });
    const start = await screen.findByRole('button', { name: 'Start this drill' });
    expect(start).toBeDisabled();
    expect(createSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox', { name: /Only 3 passages of the 4 you asked for/ }));
    fireEvent.click(start);
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toHaveLength(3);
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('/rc/drill?sessionId='), { replace: true });
  });

  it.each(['missing passage', 'missing questions'])('stops autostart when content has %s', async problem => {
    loadPassages.mockImplementationOnce(async ids => problem === 'missing passage' ? [] :
      ids.map(passageId => ({ passageId, questions: [] })) as never);
    mount('/classroom/drill?section=rc&passages=1188&start=1');
    await screen.findByText(problem === 'missing passage' ? /Some passages could not be loaded/ : /loaded without its questions/);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Preview drill' })).toBeEnabled());
    expect(createSession).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('waits for history and uses the acknowledged Fresh eligibility for autostart', async () => {
    const progress = await import('../api/rcProgress');
    let release!: () => void;
    vi.mocked(progress.getQuestionHistory).mockImplementationOnce(() => new Promise(resolve => {
      release = () => resolve(new Map([[11880, {
        questionId: 11880, attempts: 1, everIncorrect: false, incorrectOnLastTake: false,
        incorrectCount: 0, lastSeenAt: '2026-10-15T12:00:00Z',
      }]]));
    }));
    mount('/classroom/drill?section=rc&count=2&start=1');
    await waitFor(() => expect(release).toBeDefined());
    expect(loadPassages).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
    await act(async () => release());
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect([...createSession.mock.calls[0][1]].sort()).toEqual([1201, 1202]);
    expect(loadPassages.mock.calls[0][0]).toEqual(createSession.mock.calls[0][1]);
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('/rc/drill?sessionId='), { replace: true });
  });

  it('leaves a failed history autostart at configuration after Retry', async () => {
    const progress = await import('../api/rcProgress');
    vi.mocked(progress.getQuestionHistory).mockRejectedValueOnce(new Error('offline'));
    mount('/classroom/drill?section=rc&count=1&start=1');
    await screen.findByText(/answer history could not be loaded/);
    expect(screen.getByRole('button', { name: 'Preview drill' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Preview drill' })).toBeEnabled());
    expect(loadPassages).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('does not launch an autostart inspection after the link settings change', async () => {
    const full = await loadPassages([1188]);
    loadPassages.mockClear();
    let release!: () => void;
    loadPassages.mockImplementationOnce(() => new Promise(resolve => { release = () => resolve(full); }));
    mount('/classroom/drill?section=rc&passages=1188&start=1', 'section=rc&passages=1201');
    await waitFor(() => expect(release).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'next link' }));
    await act(async () => release());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Preview drill' })).toBeEnabled());
    expect(createSession).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Selected reading set' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview drill' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(screen.getByRole('button', { name: 'Start this drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual([1201]);
  });

  it.each(['history', 'content'])('discards delayed autostart %s after an account switch', async delayed => {
    const progress = await import('../api/rcProgress');
    const full = await loadPassages([1188]);
    loadPassages.mockClear();
    let release!: () => void;
    if (delayed === 'history') {
      vi.mocked(progress.getQuestionHistory).mockImplementationOnce(() => new Promise(resolve => {
        release = () => resolve(new Map());
      }));
    } else {
      loadPassages.mockImplementationOnce(() => new Promise(resolve => { release = () => resolve(full); }));
    }
    const entry = '/classroom/drill?section=rc&passages=1188&start=1';
    const view = render(<MemoryRouter initialEntries={[entry]}><RcHubSurface embedded showHistory={false} /></MemoryRouter>);
    await waitFor(() => expect(release).toBeDefined());
    auth.id = 'another-owner';
    view.rerender(<MemoryRouter initialEntries={[entry]}><RcHubSurface embedded showHistory={false} /></MemoryRouter>);
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    await act(async () => release());
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession.mock.calls[0][2]?.actorId).toBe('another-owner');
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('clears a previous hand-pick when the next link names no passages', async () => {
    /* One mount throughout — unmounting between the two links would prove
       nothing, since a fresh surface starts with an empty selection anyway.
       Neither link autostarts: after a real autostart the surface unmounts
       into the player, so the stale-state case only exists on a surface that
       is still on screen. */
    mount(
      '/classroom/drill?section=rc&stage=type-drill&passages=1188,1201&reveal=end_of_set&secondsPerPassage=60',
      'section=rc&stage=type-drill&count=1',
    );
    expect(await screen.findByText(/2 passages ·/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'next link' }));
    await waitFor(() => expect(screen.queryByText(/2 passages ·/)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /After each passage/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Untimed' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Preview drill' }));
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
    fireEvent.click(screen.getAllByRole('button', { name: 'Preview drill' })[0]);
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(loadPassages).toHaveBeenCalledWith([1188, 1201]);
    expect(createSession).not.toHaveBeenCalled();
    expect(screen.queryByText('What is the main point?')).not.toBeInTheDocument();
    for (const button of screen.getAllByRole('button', { name: 'Reveal passage and questions' })) fireEvent.click(button);
    await waitFor(() => expect(screen.getAllByText('What is the main point?')).toHaveLength(2));
    expect(screen.queryByText('Secret explanation')).not.toBeInTheDocument();
    expect(screen.queryByText('Secret reason')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Start this drill' })[0]);
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual([1188, 1201]);
  });

  it('requires a new inspection after passage count changes', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&count=1');
    fireEvent.click(await screen.findByRole('button', { name: 'Preview drill' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(screen.getByRole('button', { name: 'More passages' }));
    expect(screen.queryByRole('region', { name: 'Selected reading set' })).not.toBeInTheDocument();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('keeps the picker bounded to forty rows and preserves selections across pages', async () => {
    const many = Array.from({ length: 100 }, (_, i) => ({
      passageId: 3000 + i, preptest: 101 + (i % 40), section: 1, setNumber: 1 + Math.floor(i / 40),
      title: `Many ${3000 + i}`, firstWords: 'Opening', topic: 'Science', format: 'Single', frameworks: [] as string[],
      difficulty: 3, questionCount: 2, questionIds: [3000 + i * 2, 3001 + i * 2],
    }));
    const bank = await import('../lib/rcBank');
    vi.mocked(bank.loadAllIndexPassages).mockResolvedValue(many as never);
    try {
      mount('/classroom/drill?section=rc&count=1');
      await screen.findByRole('button', { name: 'Preview drill' });
      fireEvent.click(screen.getByRole('button', { name: 'Pick passages' }));
      const list = screen.getByRole('list', { name: 'Available passages' });
      expect(within(list).getAllByRole('listitem')).toHaveLength(40);
      expect(screen.getByText('Showing 1–40 of 100 passages.')).toBeInTheDocument();
      fireEvent.click(within(list).getByRole('button', { name: 'Add Many 3000' }));
      fireEvent.click(screen.getByRole('button', { name: 'Next passages' }));
      expect(within(list).getAllByRole('listitem')).toHaveLength(40);
      expect(within(list).queryByRole('button', { name: 'Remove Many 3000' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Previous passages' }));
      expect(within(list).getByRole('button', { name: 'Remove Many 3000' })).toBeInTheDocument();
      fireEvent.change(screen.getByRole('searchbox', { name: 'Find a passage' }), { target: { value: 'Many 3005' } });
      expect(within(list).getAllByRole('listitem')).toHaveLength(1);
      expect(screen.getByText(/1 passage matches your search, out of 100 passages that match your filters/)).toBeInTheDocument();
    } finally {
      vi.mocked(bank.loadAllIndexPassages).mockReset().mockImplementation(async () =>
        [1188, 1201, 1202].map((passageId, i) => ({
          passageId, preptest: 140 + i, section: 1, setNumber: 1, title: `Passage ${passageId}`, firstWords: 'Some opening words',
          topic: 'Science', format: 'Single', frameworks: [], difficulty: 3, questionCount: 5, questionIds: [passageId * 10, passageId * 10 + 1],
        })) as never);
    }
  });

  it('requires a manual selection and previews only the passages added from the searchable list', async () => {
    mount('/classroom/drill?section=rc&count=3');
    await screen.findByRole('button', { name: 'Preview drill' });
    fireEvent.click(screen.getByRole('button', { name: 'Pick passages' }));
    expect(screen.getByRole('button', { name: 'Preview drill' })).toBeDisabled();
    expect(screen.getByText('No passages selected')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a passage' }), { target: { value: 'PT 141' } });
    const list = screen.getByRole('list', { name: 'Available passages' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    fireEvent.click(within(list).getByRole('button', { name: 'Add Passage 1201' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a passage' }), { target: { value: 'PT 142' } });
    expect(screen.getByRole('button', { name: 'Remove Passage 1201' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview drill' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(loadPassages).toHaveBeenLastCalledWith([1201]);
    expect(screen.getAllByRole('button', { name: 'Start this drill' })).toHaveLength(1);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('uses only the active automatic draft and restores manual passages when switching back', async () => {
    mount('/classroom/drill?section=rc&passages=1188,1201');
    await screen.findByRole('button', { name: 'Choose for me' });
    await screen.findByText(/2 passages ·/);
    fireEvent.click(screen.getByRole('button', { name: 'Choose for me' }));
    expect(screen.queryByRole('region', { name: 'Choose your passages' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More passages' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Preview drill' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(screen.getByRole('button', { name: 'Start this drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][0].source).toBe('adaptive');
    fireEvent.click(screen.getByRole('button', { name: 'Pick passages' }));
    expect(screen.getByRole('region', { name: 'Choose your passages' })).toBeInTheDocument();
    expect(within(screen.getByLabelText('Selected passages')).getByRole('button', { name: 'Remove Passage 1188' })).toBeInTheDocument();
  });
});

describe('RcHubSurface launch truth (#171)', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    navigate.mockClear();
    createSession.mockReset();
    auth.id = 'owner'; getSession.mockReset().mockResolvedValue(null);
    createSession.mockImplementation(async (config, passageIds, request) => ({ id: request!.id, userId: request!.actorId, config, passageIds, status: 'in_progress' } as RcDrillSession));
    loadPassages.mockClear();
    adoption.enabled = false;
    adoption.sessions = [];
    const progress = await import('../api/rcProgress');
    vi.mocked(progress.listSessions).mockClear();
    vi.mocked(progress.deleteSession).mockClear();
  });

  const primary = () => screen.getAllByRole('button', { name: /^(Preview drill|Start this drill|Loading preview…|Starting…)$/ })[0];
  const launchSummary = () => screen.getByRole('region', { name: 'Launch summary' });

  it.each(['Not attempted', 'Incorrect before', 'Incorrect on last try', 'Any'])(
    'waits for acknowledged history before previewing with %s and adaptive difficulty', async status => {
      const progress = await import('../api/rcProgress');
      let release!: () => void;
      vi.mocked(progress.getQuestionHistory).mockImplementationOnce(() => new Promise(resolve => {
        release = () => resolve(new Map([[11880, {
          questionId: 11880, attempts: 1, everIncorrect: true, incorrectOnLastTake: true,
          incorrectCount: 1, lastSeenAt: '2026-10-15T12:00:00Z',
        }]]));
      }));
      mount('/classroom/drill?section=rc&count=1');
      await waitFor(() => expect(release).toBeDefined());
      fireEvent.click(screen.getByRole('button', { name: 'Advanced filters' }));
      fireEvent.click(screen.getByRole('button', { name: status }));
      expect(primary()).toBeDisabled();
      fireEvent.click(primary());
      expect(loadPassages).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();

      await act(async () => release());
      await waitFor(() => expect(primary()).toBeEnabled());
      fireEvent.click(primary());
      await screen.findByRole('region', { name: 'Selected reading set' });
      const inspected = loadPassages.mock.calls[0][0];
      if (status.startsWith('Incorrect')) expect(inspected).toEqual([1188]);
      else expect(inspected).not.toContain(1188);
      expect(createSession).not.toHaveBeenCalled();
    },
  );

  it('blocks a failed history read and waits for the retry before previewing', async () => {
    const progress = await import('../api/rcProgress');
    vi.mocked(progress.getQuestionHistory).mockRejectedValueOnce(new Error('offline'));
    mount('/classroom/drill?section=rc&passages=1188');
    await screen.findByText(/answer history could not be loaded/);
    expect(primary()).toBeDisabled();
    fireEvent.click(primary());
    expect(loadPassages).not.toHaveBeenCalled();

    let release!: () => void;
    vi.mocked(progress.getQuestionHistory).mockImplementationOnce(() => new Promise(resolve => {
      release = () => resolve(new Map());
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(release).toBeDefined());
    expect(primary()).toBeDisabled();
    await act(async () => release());
    await waitFor(() => expect(primary()).toBeEnabled());
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(createSession).not.toHaveBeenCalled();
  });

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
    await screen.findByRole('button', { name: 'Preview drill' });
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
    expect(within(launchSummary()).getByText('Preview to see the passages and exact question count')).toBeInTheDocument();
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    // The loaded passages carry one question each, and that is what is shown.
    expect(within(launchSummary()).getByText('2 passages · 2 questions')).toBeInTheDocument();
    fireEvent.click(primary());
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual([1188, 1201]);
    expect(createSession.mock.calls[0][0]).toMatchObject({ source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' } });
  });

  it('preserves a manually chosen reveal and passage when switching an inspected set to custom timing', async () => {
    const bank = await import('../lib/rcBank');
    const index = await bank.loadAllIndexPassages();
    let releaseIndex!: () => void;
    vi.mocked(bank.loadAllIndexPassages).mockImplementationOnce(() => new Promise((resolve) => { releaseIndex = () => resolve(index); }));
    mount('/classroom/drill?section=rc&stage=type-drill');
    await screen.findByRole('button', { name: 'Preview drill' });
    fireEvent.click(screen.getByRole('button', { name: /At the end/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Pick passages' }));
    await act(async () => releaseIndex());
    fireEvent.click(screen.getByRole('button', { name: 'Add Passage 1201' }));
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(primary()).toHaveTextContent('Preview drill');
    const field = screen.getByRole('textbox', { name: 'Minutes and seconds per passage' });
    fireEvent.change(field, { target: { value: '0:00' } });
    expect(primary()).toBeDisabled();
    fireEvent.change(field, { target: { value: '1:00' } });
    fireEvent.blur(field);
    expect(screen.getByRole('button', { name: /At the end/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('list', { name: 'Available passages' })).getByRole('button', { name: 'Remove Passage 1201' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(primary());
    await waitFor(() => expect(primary()).toHaveTextContent('Start this drill'));
    fireEvent.click(primary());
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual([1201]);
    expect(createSession.mock.calls[0][0]).toMatchObject({ source: 'manual', reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 60 } });
  });

  it('requires acknowledging a smaller adaptive set before Start, and never claims the requested size', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&count=4');
    await screen.findByRole('button', { name: 'Preview drill' });
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
    fireEvent.click(await screen.findByRole('button', { name: 'Preview drill' }));
    fireEvent.click(screen.getByRole('button', { name: 'More passages' }));
    release();
    await waitFor(() => expect(primary()).toHaveTextContent('Preview drill'));
    expect(screen.queryByRole('region', { name: 'Selected reading set' })).not.toBeInTheDocument();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('marks an inspected set stale when a setting changes', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&count=1');
    fireEvent.click(await screen.findByRole('button', { name: 'Preview drill' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(screen.getByRole('button', { name: /At the end/ }));
    expect(screen.getByText(/settings changed. Preview the drill again/)).toBeInTheDocument();
    expect(primary()).toHaveTextContent('Preview drill');
  });

  it('invalidates an adaptive inspection when switching to an empty manual selection', async () => {
    mount('/classroom/drill?section=rc&count=1');
    await waitFor(() => expect(primary()).toBeEnabled());
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(screen.getByRole('button', { name: 'Pick passages' }));
    expect(screen.queryByRole('region', { name: 'Selected reading set' })).not.toBeInTheDocument();
    expect(primary()).toHaveTextContent('Preview drill');
    expect(primary()).toBeDisabled();
    expect(createSession).not.toHaveBeenCalled();
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
    expect(within(launchSummary()).getByText('Preview to see the passages and exact question count')).toBeInTheDocument();
    expect(primary()).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('3 passages match your filters')).toBeInTheDocument();
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
    for (const button of screen.getAllByRole('button', { name: 'Preview drill' })) expect(button).toBeDisabled();
    expect(loadPassages).not.toHaveBeenCalled();
  });

  it('starts once when Start is pressed twice before the create call returns', async () => {
    let finish: (value: RcDrillSession) => void = () => {};
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
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    const [config, passageIds, request] = createSession.mock.calls[0];
    finish({ id: request!.id, userId: request!.actorId, config, passageIds, status: 'in_progress' } as RcDrillSession);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(expect.stringContaining('sessionId=' + request!.id), { replace: undefined }));
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it('recovers only the exact UUID after a lost reply, despite changed settings', async () => {
    createSession.mockRejectedValueOnce(new Error('network reset'));
    getSession.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('offline'));
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188');
    await screen.findByText(/questions? selected$/);
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(primary());
    await screen.findByText(/Press Start again to retry this exact launch/);
    const [config, passageIds, request] = createSession.mock.calls[0];
    fireEvent.click(screen.getByRole('button', { name: /At the end/ }));
    getSession.mockResolvedValueOnce({ id: request!.id, userId: request!.actorId, config, passageIds, status: 'in_progress' } as RcDrillSession);
    fireEvent.click(screen.getByRole('button', { name: 'Retry original launch' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(expect.stringContaining('sessionId=' + request!.id), { replace: undefined }));
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(getSession.mock.calls.every(call => call[0] === request!.id && call[1] === 'owner')).toBe(true);
  });
  it('retries the same UUID and original passages after another set is inspected', async () => {
    createSession.mockRejectedValueOnce(new Error('network reset'));
    getSession.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('offline'));
    mount('/classroom/drill?section=rc&stage=type-drill&count=1');
    fireEvent.click(await screen.findByRole('button', { name: 'Preview drill' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(primary());
    await screen.findByText(/Press Start again to retry this exact launch/);
    const original = createSession.mock.calls[0];
    fireEvent.click(screen.getByRole('button', { name: 'More passages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry original launch' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(2));
    expect(createSession.mock.calls[1]).toEqual(original);
  });
  it('cannot create another row while the exact pending lookup still fails', async () => {
    getSession.mockRejectedValue(new Error('offline'));
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188');
    await screen.findByText(/questions? selected$/); fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' }); fireEvent.click(primary());
    await screen.findByText(/Press Start again to retry this exact launch/);
    fireEvent.click(screen.getByRole('button', { name: 'Retry original launch' }));
    await waitFor(() => expect(getSession).toHaveBeenCalledTimes(2));
    expect(getSession.mock.calls[0]).toEqual(getSession.mock.calls[1]);
    expect(createSession).not.toHaveBeenCalled();
  });
  it('discards a delayed saved launch after the signed-in account changes', async () => {
    let finish!: (value: RcDrillSession) => void;
    createSession.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const view = mount('/classroom/drill?section=rc&stage=type-drill&passages=1188');
    await screen.findByText(/questions? selected$/); fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' }); fireEvent.click(primary());
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    const [config, passageIds, request] = createSession.mock.calls[0];
    auth.id = 'another-owner';
    view.rerender(<MemoryRouter initialEntries={['/classroom/drill?passages=1188']}><RcHubSurface embedded showHistory={false} /></MemoryRouter>);
    finish({ id: request!.id, userId: request!.actorId, config, passageIds, status: 'in_progress' } as RcDrillSession);
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Selected reading set' })).not.toBeInTheDocument());
    expect(navigate).not.toHaveBeenCalled();
  });

  it('recovers the original UUID after remount even when fresh history cannot load', async () => {
    createSession.mockRejectedValueOnce(new Error('network reset'));
    getSession.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('offline'));
    const first = mount('/classroom/drill?section=rc&stage=type-drill&passages=1188');
    await screen.findByText(/questions? selected$/); fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' }); fireEvent.click(primary());
    await screen.findByText(/Press Start again to retry this exact launch/);
    const [config, passageIds, request] = createSession.mock.calls[0];
    first.unmount();
    adoption.sessions = [{ id: 'unrelated-previous-run', config, passageIds, status: 'in_progress', startedAt: new Date().toISOString() }];
    const progress = await import('../api/rcProgress');
    vi.mocked(progress.getQuestionHistory).mockRejectedValueOnce(new Error('offline'));
    mount('/classroom/drill?section=rc&stage=type-drill&count=3');
    await screen.findByText(/answer history could not be loaded/);
    getSession.mockResolvedValueOnce({ id: request!.id, userId: request!.actorId, config, passageIds, status: 'in_progress' } as RcDrillSession);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry original launch' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(expect.stringContaining('sessionId=' + request!.id), { replace: undefined }));
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('lsatu:rc-pending-launch:v1:owner')).toBeNull();
  });
  it('blocks creation when restored pending storage cannot be verified', async () => {
    sessionStorage.setItem('lsatu:rc-pending-launch:v1:owner', '{broken');
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188');
    await screen.findByText(/pending reading drill could not be verified/);
    await screen.findByText(/questions? selected$/); fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' }); fireEvent.click(primary());
    expect(createSession).not.toHaveBeenCalled();
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

  it('renders Skipped, Partial, and Not attempted states in the manual picker and filters Fresh and Incorrect on last try accurately', async () => {
    const progress = await import('../api/rcProgress');
    vi.mocked(progress.getQuestionHistory).mockResolvedValueOnce(
      new Map([
        [
          11880,
          {
            questionId: 11880,
            attempts: 1,
            answered: false,
            firstTakeCorrect: null,
            unansweredOnFirstTake: true,
            everCorrect: false,
            everIncorrect: false,
            incorrectOnLastTake: false,
            lastFirstTakeIncorrect: false,
            incorrectCount: 0,
            reviewCorrected: false,
            completedAnswered: false,
            completedAnsweredSessionIds: [],
            lastSeenAt: '2026-10-15T12:00:00Z',
          },
        ],
        [
          12010,
          {
            questionId: 12010,
            attempts: 1,
            answered: true,
            firstTakeCorrect: false,
            unansweredOnFirstTake: false,
            everCorrect: false,
            everIncorrect: true,
            incorrectOnLastTake: true,
            lastFirstTakeIncorrect: true,
            incorrectCount: 1,
            reviewCorrected: true,
            completedAnswered: false,
            completedAnsweredSessionIds: [],
            lastSeenAt: '2026-10-15T12:05:00Z',
          },
        ],
      ]),
    );
    mount('/classroom/drill?section=rc&count=1');
    await screen.findByRole('button', { name: 'Pick passages' });
    fireEvent.click(screen.getByRole('button', { name: 'Pick passages' }));

    // Default status filter is Fresh: only passage 1202 (not_attempted) matches
    const list = await screen.findByRole('list', { name: 'Available passages' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Passage 1202')).toBeInTheDocument();
    expect(within(list).getByText('Not attempted')).toBeInTheDocument();

    // Switch filter to Any: shows Skipped (1188), Partial · 1 missed (1201), and Not attempted (1202)
    fireEvent.click(screen.getByRole('button', { name: 'Advanced filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Any' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText('Skipped')).toBeInTheDocument();
    expect(within(list).getByText('Partial · 1 missed')).toBeInTheDocument();
    expect(within(list).getByText('Not attempted')).toBeInTheDocument();

    // Switch filter to Incorrect on last try: passage 1201 still matches even though reviewCorrected is true
    fireEvent.click(screen.getByRole('button', { name: 'Incorrect on last try' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Passage 1201')).toBeInTheDocument();
  });

  it('does not show the unresolved launch recovery banner during a normal in-flight start', async () => {
    let finish!: (value: RcDrillSession) => void;
    createSession.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188');
    await screen.findByText(/1 passage ·/);
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(primary());

    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(primary()).toHaveTextContent('Starting…');
    expect(screen.queryByText(/A previous Start is pending for/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retry original launch/ })).not.toBeInTheDocument();

    const [config, passageIds, request] = createSession.mock.calls[0];
    finish({
      id: request!.id,
      userId: request!.actorId,
      config,
      passageIds,
      status: 'in_progress',
    } as RcDrillSession);
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        expect.stringContaining('sessionId=' + request!.id),
        { replace: undefined },
      ),
    );
  });

  it('formats unresolved recovery banner passages with PrepTest, section, and passage numbers instead of raw IDs', async () => {
    createSession.mockRejectedValueOnce(new Error('network reset'));
    getSession.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('offline'));
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188');
    await screen.findByText(/1 passage ·/);
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(primary());

    await screen.findByText(/A previous Start is pending for/);
    expect(screen.getByText(/PT 140 · S1 · P1 \(Passage 1188\)/)).toBeInTheDocument();
    expect(screen.queryByText(/for passages 1188\b/)).not.toBeInTheDocument();
  });

  it.each(['fixed', 'recipe'] as const)('does not reload saved %s work when synchronizing mode URLs', async mode => {
    const payload: RcSavedPayload = { kind: 'rc-builder', version: 1, mode, count: 1, passageIds: mode === 'fixed' ? [1188] : [], questionIds: mode === 'fixed' ? [11880] : [], config: { reveal: 'per_question', timing: { mode: 'unlimited' } }, filters: { topics: [], formats: [], frameworks: [], families: [], difficulties: [], status: 'any', preptestMin: 101, preptestMax: 148 } };
    vi.mocked(getRcSavedSet).mockResolvedValue({ id: 'mode-saved', userId: 'owner', name: 'Mode saved work', createdAt: '2026-10-17', payload, problem: null });
    render(<MemoryRouter initialEntries={['/practice/drills?section=rc&saved=mode-saved']}><RcHubSurface embedded showHistory={false} /><ModeLocationProbe /></MemoryRouter>);
    await screen.findByText(/Opened Mode saved work/);
    const readCount = vi.mocked(getRcSavedSet).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: mode === 'fixed' ? 'Choose for me' : 'Pick passages' }));
    fireEvent.click(screen.getByRole('button', { name: /At the end/ }));
    fireEvent.click(screen.getByRole('button', { name: mode === 'fixed' ? 'Pick passages' : 'Choose for me' }));
    expect(vi.mocked(getRcSavedSet)).toHaveBeenCalledTimes(readCount);
    expect(screen.getByRole('button', { name: /At the end/ })).toHaveAttribute('aria-pressed', 'true');
    if (mode === 'fixed') expect(within(screen.getByLabelText('Selected passages')).getByRole('button', { name: 'Remove Passage 1188' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview drill' })).toBeEnabled();
  });

  it('syncs the mode URL without resetting either drill draft or router return state', async () => {
    render(<MemoryRouter initialEntries={[{ pathname: '/practice/drills', search: '?section=rc&builder=automatic&count=3', state: { fromRcLanding: true } }]}><RcHubSurface embedded showHistory={false} /><ModeLocationProbe /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Preview drill' });
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Minutes and seconds per passage' }), { target: { value: '10:30' } });
    fireEvent.click(screen.getByRole('button', { name: /At the end/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Advanced filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Incorrect before' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pick passages' }));
    expect(screen.getByTestId('mode-location')).toHaveTextContent('builder=manual');
    expect(screen.getByTestId('mode-location')).toHaveTextContent('fromRcLanding');
    fireEvent.click(within(screen.getByRole('list', { name: 'Available passages' })).getByRole('button', { name: 'Add Passage 1188' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Earliest PrepTest' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Choose for me' }));
    expect(screen.getByTestId('mode-location')).toHaveTextContent('builder=automatic');
    expect(screen.getByRole('button', { name: 'Incorrect before' })).toHaveClass('rc-active');
    expect(screen.getByRole('textbox', { name: 'Minutes and seconds per passage' })).toHaveValue('10:30');
    expect(screen.getByRole('button', { name: /At the end/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('group', { name: 'Passages' })).getByText('3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pick passages' }));
    expect(within(screen.getByLabelText('Selected passages')).getByRole('button', { name: 'Remove Passage 1188' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Earliest PrepTest' })).toHaveValue(null);
    expect(screen.getByRole('button', { name: 'Preview drill' })).toBeDisabled();
  });

  it('does not report timing for an inactive automatic count in an empty manual draft', async () => {
    mount('/classroom/drill?section=rc&count=3&timing=standard');
    await screen.findByRole('button', { name: 'Preview drill' });
    fireEvent.click(screen.getByRole('button', { name: 'Pick passages' }));
    expect(screen.getByText(/no passages to time yet/)).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Launch summary' })).getByText('No passages selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview drill' })).toBeDisabled();
  });

  it.each(['PT140 S1 P1', '140.1.1', 'Passage 1188'])(
    'finds passages by title or passage reference: %s', async query => {
      mount('/classroom/drill?section=rc');
      await screen.findByRole('button', { name: 'Preview drill' });
      fireEvent.click(screen.getByRole('button', { name: 'Pick passages' }));
      fireEvent.change(screen.getByRole('searchbox', { name: 'Find a passage' }), { target: { value: query } });
      const list = screen.getByRole('list', { name: 'Available passages' });
      expect(within(list).getAllByRole('listitem')).toHaveLength(1);
      expect(within(list).getByRole('button', { name: 'Add Passage 1188' })).toBeInTheDocument();
    },
  );

  it('preserves each mode filter draft independently', async () => {
    mount('/classroom/drill?section=rc');
    await screen.findByRole('button', { name: 'Preview drill' });
    fireEvent.click(screen.getByRole('button', { name: 'Advanced filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Incorrect before' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pick passages' }));
    expect(screen.getByRole('button', { name: 'Not attempted' })).toHaveClass('rc-active');
    fireEvent.click(screen.getByRole('button', { name: 'Any' }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose for me' }));
    expect(screen.getByRole('button', { name: 'Incorrect before' })).toHaveClass('rc-active');
    fireEvent.click(screen.getByRole('button', { name: 'Pick passages' }));
    expect(screen.getByRole('button', { name: 'Any' })).toHaveClass('rc-active');
  });

  it('keeps invalid PrepTest bounds visible and blocks preview until corrected', async () => {
    mount('/classroom/drill?section=rc');
    await screen.findByRole('button', { name: 'Preview drill' });
    fireEvent.click(screen.getByRole('button', { name: 'Advanced filters' }));
    const minimum = screen.getByRole('spinbutton', { name: 'Earliest PrepTest' });
    const maximum = screen.getByRole('spinbutton', { name: 'Latest PrepTest' });
    fireEvent.change(minimum, { target: { value: '158' } });
    fireEvent.change(maximum, { target: { value: '140' } });
    expect(maximum).toHaveValue(140);
    expect(maximum).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Preview drill' })).toBeDisabled();
    fireEvent.change(maximum, { target: { value: '158' } });
    expect(maximum).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByRole('button', { name: 'Preview drill' })).toBeEnabled();
  });

  it('resets only filters and preserves timing and reveal on embedded Create view', async () => {
    mount('/classroom/drill?section=rc&count=3&timing=standard&reveal=end_of_set');
    await screen.findByRole('button', { name: 'Preview drill' });

    fireEvent.click(screen.getByRole('button', { name: 'Advanced filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Incorrect before' }));
    expect(screen.getByRole('button', { name: 'Incorrect before' })).toHaveClass('rc-active');

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));

    expect(screen.getByRole('button', { name: 'Not attempted' })).toHaveClass('rc-active');
    expect(screen.getByRole('button', { name: /Standard pace/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /At the end/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});


