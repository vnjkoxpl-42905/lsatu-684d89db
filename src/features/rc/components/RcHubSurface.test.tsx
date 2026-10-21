vi.mock('../api/rcSavedSets', () => ({ listRcSavedSets: vi.fn(async () => []), getRcSavedSet: vi.fn(), saveRcSet: vi.fn(), renameRcSet: vi.fn() }));
import type { RcDrillSession } from '../lib/rcTypes';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* The surface's own navigate is spied so the autostart's `replace` is
   assertable; the driver below needs the REAL one to change the query. */
const navigate = vi.fn();
const auth = vi.hoisted(() => ({ id: 'owner' as string | null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: auth.id } }) }));
const profileTiming = vi.hoisted(() => ({ mode: '35' as '35' | '52.5' | '70' | 'unlimited', savedMode: null as '35' | '52.5' | '70' | 'unlimited' | null, save: vi.fn(async () => false) }));
vi.mock('@/contexts/UserSettingsContext', () => ({ useUserSettings: () => ({ settings: { defaultTimingMode: profileTiming.mode }, profileTimingMode: profileTiming.savedMode, ownerId: auth.id, ready: true, profileTimingStatus: profileTiming.savedMode ? 'saved' : 'not-saved', profileTimingError: null, saveProfileTiming: profileTiming.save }) }));
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
  profileTiming.mode = '35'; profileTiming.savedMode = null; profileTiming.save.mockClear();
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

/** Mirrors the host prop that changes when Apply synchronizes builder=manual. */
function RouteDrivenPickerSurface() {
  const [params] = useSearchParams();
  return <RcHubSurface embedded showHistory={false} openPickerOnEntry={params.get('builder') === 'manual'} />;
}

function ModeLocationProbe() {
  const location = useLocation();
  return <output data-testid="mode-location">{JSON.stringify({ search: location.search, state: location.state })}</output>;
}

function mount(entry: string, next?: string, showHistory = false, openPickerOnEntry = false) {
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
              <RcHubSurface embedded showHistory={showHistory} openPickerOnEntry={openPickerOnEntry} />
              {next && <QueryDriver to={next} />}
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const commitDrawerIfOpen = () => { const dialog = screen.queryByRole('dialog'); if (dialog) fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' })); };
const editSetup = () => { const button = screen.queryByRole('button', { name: 'Edit setup' }); if (button) fireEvent.click(button); };
const openOptions = () => { editSetup(); if (!screen.queryByRole('dialog')) fireEvent.click(screen.getByRole('button', { name: 'Customize drill' })); };
const choosePassageMethod = (mode: 'automatic' | 'manual') => { editSetup(); if (!screen.queryByRole('dialog')) fireEvent.click(screen.getByRole('button', { name: /^Customize drill$/ })); fireEvent.click(screen.getByRole('button', { name: mode === 'automatic' ? /^Tutor's choice/ : /^Pick passages/ })); if (mode === 'automatic') commitDrawerIfOpen(); };
const openFilter = (label: string) => { const details = screen.getByText(label, { exact: true }).closest('details')!; if (!details.open) fireEvent.click(details.querySelector('summary')!); };
const openAdvancedOptions = () => { openOptions(); const details = document.querySelector<HTMLDetailsElement>('.rc-final-advanced'); if (details && !details.open) fireEvent.click(details.querySelector('summary')!); };

const openSelectedPassages = () => { editSetup(); if (!screen.queryByRole('dialog')) fireEvent.click(screen.getByRole('button', { name: 'Edit selection' })); };
const selectStatus = (label: string) => { openOptions(); const values: Record<string, string> = { Any: 'any', 'Not attempted': 'fresh', 'No recorded exposure': 'strict_no_exposure', 'Incorrect before': 'incorrect_before', 'Incorrect on last try': 'incorrect_last' }; fireEvent.change(screen.getByRole('combobox', { name: 'Practice history' }), { target: { value: values[label] } }); };
const previewDrill = () => { expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Review passages' })); };

describe('RC builder transactional drawers', () => {
  beforeEach(() => {
    sessionStorage.clear(); auth.id = 'owner'; navigate.mockClear(); createSession.mockClear(); loadPassages.mockClear();
    getSession.mockReset().mockResolvedValue(null); adoption.enabled = false; adoption.sessions = [];
  });

  it.each(['Cancel', 'Close', 'Escape'] as const)('discards a passage draft through %s without changing the inspected drill', async (dismiss) => {
    mount('/classroom/drill?section=rc&count=3');
    fireEvent.click(await screen.findByRole('button', { name: 'Review passages' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    const inspectedIds = [...loadPassages.mock.calls.at(-1)![0]];
    editSetup(); choosePassageMethod('manual');
    const drawer = await screen.findByRole('dialog', { name: 'Pick passages' });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add Passage 1201' }));
    if (dismiss === 'Escape') fireEvent.keyDown(drawer, { key: 'Escape', code: 'Escape' });
    else fireEvent.click(within(drawer).getByRole('button', { name: dismiss }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    previewDrill();
    expect(loadPassages).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('region', { name: 'Selected reading set' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual(inspectedIds);
    expect(createSession.mock.calls[0][0].source).toBe('adaptive');
  });

  it('applies the selected passage count only on Apply and preserves main timing and reveal', async () => {
    mount('/classroom/drill?section=rc&count=3&timing=standard&reveal=end_of_set');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    editSetup(); choosePassageMethod('manual');
    const drawer = await screen.findByRole('dialog', { name: 'Pick passages' });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add Passage 1201' }));
    expect(createSession).not.toHaveBeenCalled();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('combobox', { name: 'Timing' })).toHaveValue('standard');
    expect(screen.getByRole('combobox', { name: 'Show answers' })).toHaveValue('end_of_set');
    commitDrawerIfOpen(); previewDrill();
    await screen.findByRole('button', { name: 'Start drill' });
    expect(loadPassages).toHaveBeenLastCalledWith([1201]);
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual([1201]);
    expect(createSession.mock.calls[0][0]).toMatchObject({ source: 'manual', reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 525 } });
  });

  it('keeps selected passages hidden by search or filters and applies their chosen order', async () => {
    mount('/classroom/drill?section=rc');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    editSetup(); choosePassageMethod('manual');
    const drawer = await screen.findByRole('dialog', { name: 'Pick passages' });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add Passage 1188' }));
    fireEvent.change(within(drawer).getByRole('searchbox', { name: 'Find a passage' }), { target: { value: 'PT 141' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add Passage 1201' }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Move Passage 1201 earlier' }));
    expect(within(drawer).getByRole('button', { name: 'Move Passage 1188 earlier' })).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Apply' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Customize drill' }));
    const filters = await screen.findByRole('dialog', { name: 'Customize drill' });
    fireEvent.click(within(filters).getByText('Passage features and format'));
    fireEvent.change(within(filters).getByRole('spinbutton', { name: 'Earliest PrepTest' }), { target: { value: '141' } });
    fireEvent.click(within(filters).getByRole('button', { name: 'Apply' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit selection' }));
    const reopened = await screen.findByRole('dialog', { name: 'Pick passages' });
    const selectedRows = within(within(reopened).getByRole('list', { name: 'Selected passages' })).getAllByRole('listitem');
    expect(selectedRows[0]).toHaveTextContent('1. Passage 1201');
    expect(selectedRows[1]).toHaveTextContent('2. Passage 1188');
    expect(within(reopened).getByText('Picks outside the current search or filters stay selected.')).toBeInTheDocument();
    fireEvent.click(within(reopened).getByRole('button', { name: 'Apply' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Review passages' }));
    await screen.findByRole('button', { name: 'Start drill' });
    expect(loadPassages).toHaveBeenLastCalledWith([1201, 1188]);
  });

  it('discards Customize changes until Apply and invalidates the preview only after applying', async () => {
    mount('/classroom/drill?section=rc');
    fireEvent.click(await screen.findByRole('button', { name: 'Review passages' }));
    await screen.findByRole('button', { name: 'Start drill' });
    openOptions();
    let drawer = await screen.findByRole('dialog', { name: 'Customize drill' });
    fireEvent.change(within(drawer).getByRole('combobox', { name: 'Practice history' }), { target: { value: 'any' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Cancel' }));
    previewDrill();
    expect(await screen.findByRole('button', { name: 'Start drill' })).toBeEnabled();
    openOptions();
    drawer = await screen.findByRole('dialog', { name: 'Customize drill' });
    expect(within(drawer).getByRole('combobox', { name: 'Practice history' })).toHaveValue('fresh');
    fireEvent.change(within(drawer).getByRole('combobox', { name: 'Practice history' }), { target: { value: 'any' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Apply' }));
    expect(await screen.findByRole('button', { name: 'Review passages' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Start drill' })).not.toBeInTheDocument();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('can pick an attempted passage when the entire default manual pool has been practiced', async () => {
    const progress = await import('../api/rcProgress');
    const history = new Map([11880, 12010, 12020].map(questionId => [questionId, {
      questionId, attempts: 1, everIncorrect: true, incorrectOnLastTake: true, lastFirstTakeIncorrect: true,
      incorrectCount: 1, answered: true, firstEverCorrect: false, firstTakeCorrect: false,
      lastSeenAt: '2026-10-20T12:00:00Z', lastGradedAt: '2026-10-20T12:00:00Z',
    }]));
    vi.mocked(progress.getRcHistorySnapshot).mockResolvedValueOnce({ history, displayHistory: history, hasHiddenGradedResults: false });
    mount('/classroom/drill?section=rc');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    editSetup(); choosePassageMethod('manual');
    const drawer = await screen.findByRole('dialog', { name: 'Pick passages' });
    fireEvent.change(within(drawer).getByRole('searchbox', { name: 'Find a passage' }), { target: { value: 'Passage 1188' } });
    expect(within(drawer).getByText(/Matching passages are excluded by your active filters/)).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Adjust passage filters' }));
    expect(within(drawer).getByRole('button', { name: 'Apply' })).toBeEnabled();
    fireEvent.change(within(drawer).getByRole('combobox', { name: 'Practice history' }), { target: { value: 'any' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add Passage 1188' }));
    expect(within(drawer).getByRole('button', { name: 'Apply' })).toBeEnabled();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Apply' }));
    previewDrill();
    await screen.findByRole('button', { name: 'Start drill' });
    expect(loadPassages).toHaveBeenLastCalledWith([1188]);
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual([1188]);
    expect(createSession.mock.calls[0][0].source).toBe('manual');
  });

  it.each(['Cancel', 'Close', 'Escape', 'outside'] as const)('discards filters on %s and returns focus to Customize drill', async dismiss => {
    mount('/classroom/drill?section=rc');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    previewDrill();
    await screen.findByRole('button', { name: 'Start drill' });
    editSetup();
    const opener = screen.getByRole('button', { name: 'Customize drill' });
    fireEvent.click(opener);
    const drawer = await screen.findByRole('dialog', { name: 'Customize drill' });
    fireEvent.change(within(drawer).getByRole('combobox', { name: 'Practice history' }), { target: { value: 'any' } });
    if (dismiss === 'Escape') fireEvent.keyDown(drawer, { key: 'Escape', code: 'Escape' });
    else if (dismiss === 'outside') {
      const overlay = document.querySelector<HTMLElement>('[data-state="open"].inset-0');
      expect(overlay).not.toBeNull();
      fireEvent.pointerDown(overlay!, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    } else fireEvent.click(within(drawer).getByRole('button', { name: dismiss }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
    previewDrill();
    expect(screen.getByRole('button', { name: 'Start drill' })).toBeEnabled();
    editSetup();
    openOptions();
    expect(screen.getByRole('combobox', { name: 'Practice history' })).toHaveValue('fresh');
  });

  it('keeps the exact inspected drill after applying an unchanged filters draft', async () => {
    mount('/classroom/drill?section=rc');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    previewDrill();
    await screen.findByRole('button', { name: 'Start drill' });
    const inspectedIds = [...loadPassages.mock.calls.at(-1)![0]];
    openOptions();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    previewDrill();
    expect(await screen.findByRole('button', { name: 'Start drill' })).toBeEnabled();
    expect(loadPassages).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual(inspectedIds);
  });

  it('returns the manual catalog to its first page when draft filters narrow a later page', async () => {
    const bank = await import('../lib/rcBank');
    vi.mocked(bank.loadAllIndexPassages).mockResolvedValueOnce(Array.from({ length: 30 }, (_, index) => ({
      passageId: 5000 + index, preptest: 101 + Math.floor(index / 4), section: 1, setNumber: index % 4 + 1,
      title: `Pagination ${5000 + index}`, firstWords: 'Opening', topic: index < 5 ? 'Law' : 'Science',
      format: 'Standard (Non-Comparative)', frameworks: [], difficulty: 3, questionCount: 1, questionIds: [(5000 + index) * 10],
    })) as never);
    mount('/classroom/drill?section=rc');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    editSetup(); choosePassageMethod('manual');
    const drawer = await screen.findByRole('dialog', { name: 'Pick passages' });
    const announcement = within(drawer).getAllByRole('status').find(node => node.getAttribute('aria-live') === 'polite')!;
    expect(announcement).toBeEmptyDOMElement();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Next passages' }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Next passages' }));
    expect(within(drawer).getByText('Showing 25–30 of 30 passages.')).toBeInTheDocument();
    fireEvent.click(within(drawer).getByText('Filters'));
    openFilter('Topic'); fireEvent.click(within(drawer).getByRole('checkbox', { name: 'Law' }));
    expect(announcement).toBeEmptyDOMElement();
    const catalog = within(drawer).getByRole('list', { name: 'Available passages' });
    expect(within(catalog).getAllByRole('listitem')).toHaveLength(5);
    expect(within(catalog).getByRole('button', { name: 'Add Pagination 5000' })).toBeInTheDocument();
    expect(within(drawer).queryByText(/Showing 25/)).not.toBeInTheDocument();
    fireEvent.click(within(catalog).getByRole('button', { name: 'Add Pagination 5000' }));
    expect(announcement).toHaveTextContent('1 passage selected');
    expect(announcement).not.toHaveTextContent('1 passages selected');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Apply' }));
    previewDrill();
    await screen.findByRole('button', { name: 'Start drill' });
    expect(loadPassages).toHaveBeenLastCalledWith([5000]);
  });

  it('opens direct manual entry once and leaves a dismissed picker closed during setup edits', async () => {
    mount('/classroom/drill?section=rc&builder=manual', undefined, false, true);
    const drawer = await screen.findByRole('dialog', { name: 'Pick passages' });
    expect(within(drawer).getByRole('button', { name: 'Add Passage 1188' })).toBeEnabled();
    expect(createSession).not.toHaveBeenCalled();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.change(screen.getByRole('combobox', { name: 'Timing' }), { target: { value: 'standard' } });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose passages' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Review passages' })).toBeDisabled();
  });

  it('keeps topic and difficulty in Customize drill and preserves exact review through Edit setup', async () => {
    mount('/classroom/drill?section=rc');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    expect(document.querySelectorAll('.rc-essential-control')).toHaveLength(0);
    openOptions();
    const drawer = screen.getByRole('dialog', { name: 'Customize drill' });
    openFilter('Topic'); fireEvent.click(within(drawer).getByRole('checkbox', { name: 'Science' }));
    openFilter('Passage difficulty');
    fireEvent.click(within(drawer).getByRole('button', { name: '3' }));
    fireEvent.click(within(drawer).getByRole('button', { name: '2' }));
    expect(within(drawer).getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(drawer).getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'true');
    commitDrawerIfOpen();
    previewDrill();
    await screen.findByRole('heading', { name: 'Review your RC drill' });
    expect(screen.queryByRole('combobox', { name: 'Timing' })).not.toBeInTheDocument();
    const ids = [...loadPassages.mock.calls.at(-1)![0]];
    editSetup();
    expect(screen.getByRole('heading', { name: /Choose your next passages?/ })).toBeInTheDocument();
    previewDrill();
    await screen.findByRole('heading', { name: 'Review your RC drill' });
    expect(loadPassages).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual(ids);
  });
});


describe('RC refinement workflow regressions', () => {
  beforeEach(() => {
    sessionStorage.clear(); auth.id = 'owner'; navigate.mockClear(); createSession.mockClear(); loadPassages.mockClear();
    getSession.mockReset().mockResolvedValue(null); adoption.enabled = false; adoption.sessions = [];
  });

  it('preserves uncommitted picks when switching methods inside the drawer and discards them on Cancel', async () => {
    mount('/classroom/drill?section=rc&count=2');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    choosePassageMethod('manual');
    const drawer = screen.getByRole('dialog', { name: 'Pick passages' });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add Passage 1188' }));
    fireEvent.click(within(drawer).getByRole('button', { name: "Tutor's choice" }));
    expect(screen.getByRole('dialog', { name: 'Customize drill' })).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Pick passages' }));
    expect(within(within(drawer).getByRole('list', { name: 'Selected passages' })).getByRole('button', { name: 'Remove Passage 1188 from selection' })).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText("Optional. Leave blank for Tutor’s choice.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit selection' })).not.toBeInTheDocument();
    previewDrill();
    await screen.findByRole('button', { name: 'Start drill' });
    expect(loadPassages.mock.calls.at(-1)![0]).toHaveLength(2);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('closes Apply when automatic entry changes the host prop to manual and does not reopen on Edit selection', async () => {
    render(<MemoryRouter initialEntries={['/practice/drills?section=rc&builder=automatic']}><RouteDrivenPickerSurface /><ModeLocationProbe /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    const opener = screen.getByRole('button', { name: /^Customize drill$/ });
    choosePassageMethod('manual');
    const drawer = await screen.findByRole('dialog', { name: 'Pick passages' });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add Passage 1188' }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add Passage 1201' }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Move Passage 1201 earlier' }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('mode-location')).toHaveTextContent('builder=manual');
    await waitFor(() => expect(opener).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: 'Edit selection' }));
    const reopened = await screen.findByRole('dialog', { name: 'Pick passages' });
    const selected = within(reopened).getByRole('list', { name: 'Selected passages' });
    expect(within(selected).getAllByRole('listitem').map(row => row.textContent)).toEqual([expect.stringContaining('Passage 1201'), expect.stringContaining('Passage 1188')]);
    fireEvent.click(within(reopened).getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(createSession).not.toHaveBeenCalled();
    previewDrill();
    await screen.findByRole('button', { name: 'Start drill' });
    expect(loadPassages).toHaveBeenLastCalledWith([1201, 1188]);
  });

  it('applies an empty manual selection and retains it when returning from automatic mode', async () => {
    mount('/classroom/drill?section=rc&passages=1188,1201');
    await screen.findByRole('button', { name: 'Edit selection' });
    openSelectedPassages();
    const drawer = await screen.findByRole('dialog');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Clear selection' }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Choose passages' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Review passages' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Edit selection' })).not.toBeInTheDocument();
    expect(createSession).not.toHaveBeenCalled();
    choosePassageMethod('automatic');
    choosePassageMethod('manual');
    const empty = await screen.findByRole('dialog');
    expect(within(within(empty).getByRole('list', { name: 'Selected passages' })).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('replaces the stale-preview warning with an actionable empty state after clearing reviewed manual picks', async () => {
    mount('/classroom/drill?section=rc&passages=1188,1201');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    previewDrill();
    await screen.findByRole('region', { name: 'Selected reading set' });
    editSetup();
    fireEvent.click(screen.getByRole('button', { name: 'Edit selection' }));
    const drawer = await screen.findByRole('dialog', { name: 'Pick passages' });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Clear selection' }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Choose at least one passage to continue.')).toBeInTheDocument();
    expect(screen.queryByText('Your settings changed. Review the selection again before starting.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose passages' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Review passages' })).toBeDisabled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each(['Timing', 'Show answers'] as const)('keeps automatically reviewed IDs after changing only %s', async control => {
    mount('/classroom/drill?section=rc&count=2');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    previewDrill();
    await screen.findByRole('button', { name: 'Start drill' });
    const ids = [...loadPassages.mock.calls.at(-1)![0]];
    editSetup();
    fireEvent.change(screen.getByRole('combobox', { name: control }), { target: { value: control === 'Timing' ? 'standard' : 'end_of_set' } });
    previewDrill();
    await screen.findByRole('button', { name: 'Start drill' });
    expect(loadPassages).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual(ids);
    expect(createSession.mock.calls[0][0]).toMatchObject(control === 'Timing' ? { timing: { mode: 'per_passage_budget', secondsPerPassage: 525 } } : { reveal: 'end_of_set' });
  });

  it('keeps manual picks and order while browsing filters change without claiming a final topic restriction', async () => {
    mount('/classroom/drill?section=rc');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    choosePassageMethod('manual');
    const drawer = await screen.findByRole('dialog');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add Passage 1188' }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add Passage 1201' }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Move Passage 1201 earlier' }));
    fireEvent.click(within(drawer).getByText('Filters'));
    openFilter('Topic'); fireEvent.click(within(drawer).getByRole('checkbox', { name: 'Law' }));
    expect(within(drawer).getByText(/Picks outside the current search or filters stay selected/)).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const selected = screen.getByRole('list', { name: 'Selected drill passages' });
    expect(within(selected).getAllByRole('listitem').map(row => row.textContent)).toEqual([expect.stringContaining('Passage 1201'), expect.stringContaining('Passage 1188')]);
    expect(screen.queryByText('Applied filters')).not.toBeInTheDocument();
    expect(screen.queryByText('Topic', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('Difficulty', { exact: true })).not.toBeInTheDocument();
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    expect(loadPassages).toHaveBeenLastCalledWith([1201, 1188]);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('visibly preserves the manual no-recorded-exposure launch requirement and rechecks it at Start', async () => {
    const exposure = await import('../api/rcExposure');
    mount('/classroom/drill?section=rc&passages=1188');
    await screen.findByRole('button', { name: 'Edit selection' });
    selectStatus('No recorded exposure');
    commitDrawerIfOpen();
    expect(screen.getByText('Launch requirement: No recorded exposure')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review passages' })).toBeDisabled();
    openOptions();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include passages whose earlier exposure is unknown' }));
    commitDrawerIfOpen(); previewDrill();
    await screen.findByRole('button', { name: 'Start drill' });
    expect(screen.getByText('Launch requirement: No recorded exposure')).toBeInTheDocument();
    vi.mocked(exposure.getRcExposureHistory).mockResolvedValueOnce(new Set([1188]));
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await screen.findByText(/A selected passage now has recorded exposure/);
    expect(screen.getByRole('button', { name: 'Start drill' })).toBeDisabled();
    const blocked = screen.getByRole('region', { name: 'Selected reading set' });
    expect(within(blocked).getByText(/Passage 1188: Does not meet No recorded exposure/)).toBeInTheDocument();
    expect(createSession).not.toHaveBeenCalled();
    expect(loadPassages).toHaveBeenLastCalledWith([1188]);
  });

  it('blocks a selected attempted passage under the manual exposure requirement even without an exposure ledger row', async () => {
    const progress = await import('../api/rcProgress');
    vi.mocked(progress.getQuestionHistory).mockResolvedValue(new Map([[11880, {
      questionId: 11880, attempts: 1, everIncorrect: false, incorrectOnLastTake: false, lastFirstTakeIncorrect: false,
      incorrectCount: 0, answered: true, firstEverCorrect: true, firstTakeCorrect: true,
      lastSeenAt: '2026-10-20T12:00:00Z', lastGradedAt: '2026-10-20T12:00:00Z',
    }]]));
    mount('/classroom/drill?section=rc&passages=1188');
    await screen.findByRole('button', { name: 'Edit selection' });
    selectStatus('No recorded exposure');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include passages whose earlier exposure is unknown' }));
    commitDrawerIfOpen();
    expect(screen.getByText('Launch requirement: No recorded exposure')).toBeInTheDocument();
    expect(screen.getByText(/1 selected passage does not meet No recorded exposure/)).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Selected drill passages' })).getByText(/Does not meet No recorded exposure/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review passages' })).toBeDisabled();
    expect(loadPassages).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('rechecks saved answer history at Start for strict manual picks even when no exposure row exists', async () => {
    const progress = await import('../api/rcProgress');
    mount('/classroom/drill?section=rc&passages=1188');
    await screen.findByRole('button', { name: 'Edit selection' });
    selectStatus('No recorded exposure');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include passages whose earlier exposure is unknown' }));
    commitDrawerIfOpen(); previewDrill();
    await screen.findByRole('button', { name: 'Start drill' });
    const history = new Map([[11880, {
      questionId: 11880, attempts: 1, everIncorrect: false, incorrectOnLastTake: false, lastFirstTakeIncorrect: false,
      incorrectCount: 0, answered: true, firstEverCorrect: true, firstTakeCorrect: true,
      lastSeenAt: '2026-10-21T12:00:00Z', lastGradedAt: '2026-10-21T12:00:00Z',
    }]]);
    const priorReads = vi.mocked(progress.getRcHistorySnapshot).mock.calls.length;
    vi.mocked(progress.getRcHistorySnapshot).mockResolvedValueOnce({ history, displayHistory: history, hasHiddenGradedResults: false });
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await screen.findByText(/A selected passage now has saved answers and does not meet No recorded exposure/);
    expect(vi.mocked(progress.getRcHistorySnapshot).mock.calls.length).toBeGreaterThan(priorReads);
    expect(screen.getByText('Launch requirement: No recorded exposure')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start drill' })).toBeDisabled();
    const blocked = screen.getByRole('region', { name: 'Selected reading set' });
    expect(within(blocked).getByText(/Passage 1188: Does not meet No recorded exposure/)).toBeInTheDocument();
    expect(loadPassages).toHaveBeenLastCalledWith([1188]);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('keeps the reviewed set visible while a different automatic selection loads', async () => {
    mount('/classroom/drill?section=rc');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    const originalLoad = loadPassages.getMockImplementation()!;
    let release!: () => Promise<void>;
    loadPassages.mockImplementationOnce(ids => new Promise(resolve => {
      release = async () => resolve(await originalLoad(ids));
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose different passages' }));
    expect(screen.getByRole('heading', { name: 'Review your RC drill' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Choose your next passages?/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Starting|Start drill/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit setup' })).toBeDisabled();
    await act(async () => release());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start drill' })).toBeEnabled());
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each(['missing passage', 'missing questions', 'load failure'] as const)('explains that the reviewed set remains selected when choosing different passages fails: %s', async failure => {
    mount('/classroom/drill?section=rc&count=2');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    const originalIds = [...loadPassages.mock.calls.at(-1)![0]];
    const originalLoad = loadPassages.getMockImplementation()!;
    loadPassages.mockImplementationOnce(async ids => {
      if (failure === 'load failure') throw new Error('Load failed');
      const passages = await originalLoad(ids);
      return failure === 'missing passage' ? passages.slice(1) : passages.map(passage => ({ ...passage, questions: [] }));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Choose different passages' }));
    await screen.findByText(/The previously reviewed passages are still selected\./);
    expect(screen.getByRole('heading', { name: 'Review your RC drill' })).toBeInTheDocument();
    expect(screen.queryByText('What is the main point?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start drill' })).toBeEnabled();
    expect(createSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual(originalIds);
  });

  it('requires explicit reveal again when a fresh automatic inspection selects the same passage', async () => {
    const bank = await import('../lib/rcBank');
    const index = await bank.loadAllIndexPassages();
    vi.mocked(bank.loadAllIndexPassages).mockResolvedValueOnce(index.slice(0, 1));
    mount('/classroom/drill?section=rc');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    fireEvent.click(screen.getByRole('button', { name: 'Reveal passage and questions · records exposure' }));
    await screen.findByText('What is the main point?');
    expect(screen.queryByRole('button', { name: 'Reveal passage and questions · records exposure' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choose different passages' }));
    await waitFor(() => expect(loadPassages).toHaveBeenCalledTimes(2));
    await screen.findByRole('button', { name: 'Reveal passage and questions · records exposure' });
    expect(loadPassages.mock.calls[0][0]).toEqual(loadPassages.mock.calls[1][0]);
    expect(screen.queryByText('What is the main point?')).not.toBeInTheDocument();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('recomputes automatically reviewed selection when the requested count changes', async () => {
    mount('/classroom/drill?section=rc&count=1');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    editSetup(); fireEvent.click(screen.getByRole('button', { name: 'More passages, 1 selected' }));
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    expect(loadPassages).toHaveBeenCalledTimes(2);
    expect(loadPassages.mock.calls.at(-1)![0]).toHaveLength(2);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('restores exact saved passages without presenting their obsolete browsing topic as a drill restriction', async () => {
    const payload: RcSavedPayload = { kind: 'rc-builder', version: 1, mode: 'fixed', count: 2, passageIds: [1201, 1188], questionIds: [12010, 11880], config: { reveal: 'per_question', timing: { mode: 'unlimited' } }, filters: { topics: ['Law'], formats: [], frameworks: [], families: [], difficulties: [5], status: 'any', preptestMin: 101, preptestMax: 148 } };
    vi.mocked(getRcSavedSet).mockResolvedValue({ id: 'mixed-fixed', userId: 'owner', name: 'Mixed exact selection', createdAt: '2026-10-17', payload, problem: null });
    mount('/classroom/drill?saved=mixed-fixed');
    await screen.findByText(/Opened Mixed exact selection/);
    expect(screen.queryByText('Applied filters')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Passage topic' })).not.toBeInTheDocument();
    expect(screen.getByText('Passage 1201')).toBeInTheDocument();
    expect(screen.getByText('Passage 1188')).toBeInTheDocument();
    expect(screen.getByText(/PT 141/)).toBeInTheDocument();
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    expect(loadPassages).toHaveBeenLastCalledWith([1201, 1188]);
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual([1201, 1188]);
  });
});

describe('RcHubSurface autostart', () => {
  it('opens the manual landing entry without selecting or starting any passages', async () => {
    mount('/classroom/drill?section=rc&builder=manual');
    expect(await screen.findByRole('heading', { name: /Choose your next passages?/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review passages' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Choose passages' }));
    expect(await screen.findByRole('button', { name: 'Add Passage 1188' })).toBeEnabled();
    expect(screen.queryByRole('combobox', { name: 'Timing' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Show answers' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sort passages' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^More passages/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
    const firstRow = within(screen.getByRole('list', { name: 'Available passages' })).getAllByRole('listitem')[0];
    expect(firstRow.querySelector('details')).not.toHaveAttribute('open');
    expect(within(firstRow).getByText('Some opening words')).not.toBeVisible();
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
    openOptions();
    expect(screen.getByRole('option', { name: 'No recorded exposure' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Not attempted' })).toBeEnabled();
    commitDrawerIfOpen();
    expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled();
  });

  it('excludes full-text exposure independently from the legacy answer-history filter', async () => {
    const exposure = await import('../api/rcExposure');
    vi.mocked(exposure.getRcExposureHistory).mockResolvedValueOnce(new Set([1188]));
    mount('/classroom/drill?section=rc');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    openOptions();
    selectStatus('No recorded exposure');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include passages whose earlier exposure is unknown' }));
    commitDrawerIfOpen(); previewDrill();
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(loadPassages.mock.calls[0][0]).not.toContain(1188);
    expect(screen.queryByText('What is the main point?')).not.toBeInTheDocument();
  });

  it('keeps outcome filters available while withholding unreleased adaptive numbers', async () => {
    const progress = await import('../api/rcProgress');
    vi.mocked(progress.getRcHistorySnapshot).mockResolvedValueOnce({ history: new Map(), displayHistory: new Map(), hasHiddenGradedResults: true });
    mount('/classroom/drill?section=rc');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    openOptions();
    expect(screen.getByRole('option', { name: 'Incorrect before' })).toBeEnabled();
    expect(screen.getByRole('option', { name: 'Incorrect on last try' })).toBeEnabled();
    fireEvent.click(screen.getByText('How adaptive selection works'));
    expect(await within(screen.getByRole('dialog')).findByText(/Some saved results are still hidden/)).toBeInTheDocument();
    expect(screen.queryByText(/% correct/)).not.toBeInTheDocument();
    commitDrawerIfOpen();
    expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled();
  });
  it.each(['Incorrect before', 'Incorrect on last try'])('previews only released misses with %s despite other hidden results', async label => {
    const progress = await import('../api/rcProgress');
    const miss = { questionId: 11880, attempts: 1, everIncorrect: true, incorrectOnLastTake: true, lastFirstTakeIncorrect: true,
      incorrectCount: 1, lastSeenAt: '2026-10-17T12:00:00Z', lastGradedAt: '2026-10-17T12:00:00Z', answered: true, firstEverCorrect: false, firstTakeCorrect: false };
    vi.mocked(progress.getRcHistorySnapshot).mockResolvedValueOnce({ history: new Map([[11880, miss], [12010, { ...miss, questionId: 12010 }]]),
      displayHistory: new Map([[11880, miss]]), hasHiddenGradedResults: true });
    mount('/classroom/drill?section=rc');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    openOptions();
    selectStatus(label);
    commitDrawerIfOpen(); previewDrill();
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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    openOptions();
    openOptions(); selectStatus('Any');
    commitDrawerIfOpen(); previewDrill();
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(loadPassages.mock.calls[0][0]).toEqual([1188]);
  });

  it('restores a fixed saved selection without starting and verifies its exact question snapshot', async () => {
    const payload: RcSavedPayload = { kind: 'rc-builder', version: 1, mode: 'fixed', count: 1, passageIds: [1188], questionIds: [999], config: { reveal: 'per_question', timing: { mode: 'unlimited' } }, filters: { topics: [], formats: [], frameworks: [], families: [], difficulties: [], status: 'any', preptestMin: 101, preptestMax: 148 } };
    vi.mocked(getRcSavedSet).mockResolvedValue({ id: 'saved-fixed', userId: 'owner', name: 'Fixed passages', createdAt: '2026-10-17', payload, problem: null });
    mount('/classroom/drill?saved=saved-fixed');
    await screen.findByText(/Opened Fixed passages/);
    expect(createSession).not.toHaveBeenCalled();
    commitDrawerIfOpen(); editSetup(); expect(screen.getByRole('combobox', { name: 'Show answers' })).toHaveValue('per_question');
    commitDrawerIfOpen(); previewDrill();
    await screen.findByText(/questions in this fixed set have changed/);
    expect(screen.queryByRole('button', { name: 'Start drill' })).toBeNull();
    expect(createSession).not.toHaveBeenCalled();
  });
  it('restores recipe filters and timing but requires a new inspection before Start', async () => {
    const payload: RcSavedPayload = { kind: 'rc-builder', version: 1, mode: 'recipe', count: 2, passageIds: [], questionIds: [], config: { reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 600 } }, filters: { topics: ['Science'], formats: [], frameworks: [], families: [], difficulties: [], status: 'fresh', preptestMin: 101, preptestMax: 148 } };
    vi.mocked(getRcSavedSet).mockResolvedValue({ id: 'saved-recipe', userId: 'owner', name: 'Science recipe', createdAt: '2026-10-17', payload, problem: null });
    mount('/classroom/drill?saved=saved-recipe');
    await screen.findByText(/Opened Science recipe/);
    expect(createSession).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Minutes and seconds per passage' })).toHaveValue('10:00');
    commitDrawerIfOpen(); previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    expect(createSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][0]).toMatchObject({ source: 'adaptive', reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 600 } });
  });
  it.each(['fixed', 'recipe'] as const)('restores %s training settings while preserving the saved exact clock over the profile', async mode => {
    profileTiming.mode = '70'; profileTiming.savedMode = '70';
    const payload: RcSavedPayload = {
      kind: 'rc-builder', version: 1, mode, count: 1,
      passageIds: mode === 'fixed' ? [1188] : [], questionIds: mode === 'fixed' ? [11880] : [],
      config: { reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 600 }, training: { anticipation: true, lineByLine: false } },
      filters: { topics: [], formats: [], frameworks: [], families: [], difficulties: [], status: 'any', preptestMin: 101, preptestMax: 148 },
    };
    vi.mocked(getRcSavedSet).mockResolvedValue({ id: 'training-saved', userId: 'owner', name: 'Training set', createdAt: '2026-10-17', payload, problem: null });
    mount('/classroom/drill?saved=training-saved');
    await screen.findByText(/Opened Training set/);
    expect(createSession).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Minutes and seconds per passage' })).toHaveValue('10:00');
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    expect(screen.getByText('Training: Anticipation')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][0]).toMatchObject({ training: { anticipation: true, lineByLine: false }, timing: { mode: 'per_passage_budget', secondsPerPassage: 600 } });
  });
  it('configures one-passage feedback and four-passage review from the main controls without creating work', async () => {
    mount('/classroom/drill'); await screen.findByRole('button', { name: 'Review passages' });
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: /^More passages/ }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Show answers' }), { target: { value: 'end_of_set' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Timing' }), { target: { value: 'standard' } });
    expect(within(screen.getByRole('group', { name: 'Passages' })).getByText('4')).toBeInTheDocument();
    commitDrawerIfOpen(); editSetup(); expect(screen.getByRole('combobox', { name: 'Show answers' })).toHaveValue('end_of_set');
    commitDrawerIfOpen(); editSetup(); expect(screen.getByRole('combobox', { name: 'Timing' })).toHaveValue('standard');
    expect(createSession).not.toHaveBeenCalled();
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: /^Fewer passages/ }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Show answers' }), { target: { value: 'per_passage' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Timing' }), { target: { value: 'untimed' } });
    expect(within(screen.getByRole('group', { name: 'Passages' })).getByText('1')).toBeInTheDocument();
    commitDrawerIfOpen(); editSetup(); expect(screen.getByRole('combobox', { name: 'Timing' })).toHaveValue('untimed');
    commitDrawerIfOpen(); editSetup(); expect(screen.getByRole('combobox', { name: 'Show answers' })).toHaveValue('per_passage');
  });
  it('reads a legacy owner timing default without exposing another device-only save control', async () => {
    localStorage.setItem('lsatu:rc-timing-default:v1:owner', JSON.stringify({ mode: 'custom', seconds: 600 }));
    const view = mount('/classroom/drill');
    expect(await screen.findByRole('textbox', { name: 'Minutes and seconds per passage' })).toHaveValue('10:00');
    openOptions(); fireEvent.click(screen.getByText('Accommodations'));
    expect(screen.getByRole('combobox', { name: 'Profile time accommodation' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save timing default on this device' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(localStorage.getItem('lsatu:rc-timing-default:v1:owner')).toBe(JSON.stringify({ mode: 'custom', seconds: 600 }));
    view.unmount();
    mount('/classroom/drill?timing=untimed');
    await screen.findByRole('button', { name: 'Review passages' });
    expect(screen.getByRole('combobox', { name: 'Timing' })).toHaveValue('untimed');
  });
  it('keeps a corrupt legacy preference honest and does not silently overwrite it', async () => {
    localStorage.setItem('lsatu:rc-timing-default:v1:owner', 'broken');
    mount('/classroom/drill'); await screen.findByText(/timing default could not be read/);
    fireEvent.change(screen.getByRole('combobox', { name: 'Timing' }), { target: { value: 'standard' } });
    openOptions(); fireEvent.click(screen.getByText('Accommodations'));
    expect(screen.getByRole('button', { name: 'Save to profile' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(localStorage.getItem('lsatu:rc-timing-default:v1:owner')).toBe('broken');
    expect(profileTiming.save).not.toHaveBeenCalled();
  });
  it('keeps direct lookup separate from practice conditions and optional tools in the drawer', async () => {
    mount('/classroom/drill');
    await screen.findByRole('button', { name: 'Review passages' });
    const workspace = document.querySelector<HTMLElement>('.rc-setup-workspace')!;
    expect(workspace.firstElementChild).toHaveClass('rc-config-groups');
    expect(screen.getByRole('combobox', { name: 'Lookup PrepTest' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Change passage selection/ })).not.toBeInTheDocument();
    expect(within(workspace).getByRole('button', { name: /^Customize drill$/ })).toHaveAccessibleName('Customize drill');
    expect(screen.queryByText('Accommodations')).not.toBeInTheDocument();
    expect(screen.queryByText('Training modes')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start drill' })).not.toBeInTheDocument();
    openOptions();
    expect(screen.getByText('Accommodations')).toBeInTheDocument();
    expect(screen.getByText('Training modes')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Immediate feedback/ })).not.toBeInTheDocument();
  });
  it('does not save profile timing by opening, changing a draft, applying or cancelling the drawer', async () => {
    mount('/classroom/drill?timing=standard');
    await screen.findByRole('button', { name: 'Review passages' });
    openOptions(); fireEvent.click(screen.getByText('Accommodations'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Profile time accommodation' }), { target: { value: '70' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    openOptions(); commitDrawerIfOpen();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(profileTiming.save).not.toHaveBeenCalled();
    expect(localStorage.getItem('lsatu:rc-timing-default:v1:owner')).toBeNull();
  });
  it.each([['52.5', 788], ['70', 1050]] as const)('uses the saved %s profile pace for a new timed drill', async (mode, seconds) => {
    profileTiming.mode = mode; profileTiming.savedMode = mode;
    mount('/classroom/drill');
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Timing' })).toHaveValue('standard'));
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][0].timing).toEqual({ mode: 'per_passage_budget', secondsPerPassage: seconds });
  });
  it.each([
    ['timing=standard', { mode: 'per_passage_budget', secondsPerPassage: 525 }],
    ['secondsPerPassage=600', { mode: 'per_passage_budget', secondsPerPassage: 600 }],
    ['timing=untimed', { mode: 'unlimited' }],
  ] as const)('preserves the explicit clock in %s over profile timing', async (query, expected) => {
    profileTiming.mode = '70'; profileTiming.savedMode = '70';
    mount(`/classroom/drill?${query}`);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][0].timing).toEqual(expected);
  });
  it('refreshes the profile pace without rerolling reviewed passages', async () => {
    profileTiming.savedMode = '35';
    mount('/classroom/drill');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    const ids = [...loadPassages.mock.calls.at(-1)![0]];
    const calls = loadPassages.mock.calls.length;
    editSetup(); profileTiming.mode = '70'; profileTiming.savedMode = '70';
    fireEvent.change(screen.getByRole('combobox', { name: 'Show answers' }), { target: { value: 'end_of_set' } });
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    expect(loadPassages).toHaveBeenCalledTimes(calls);
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual(ids);
    expect(createSession.mock.calls[0][0].timing).toEqual({ mode: 'per_passage_budget', secondsPerPassage: 1050 });
  });
  it('keeps a saved unlimited profile untimed until the student explicitly chooses a pace', async () => {
    profileTiming.mode = 'unlimited'; profileTiming.savedMode = 'unlimited';
    mount('/classroom/drill');
    await screen.findByRole('button', { name: 'Review passages' });
    expect(screen.getByRole('combobox', { name: 'Timing' })).toHaveValue('untimed');
    fireEvent.change(screen.getByRole('combobox', { name: 'Timing' }), { target: { value: 'standard' } });
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][0].timing).toEqual({ mode: 'per_passage_budget', secondsPerPassage: 525 });
  });
  it('disables profile saving when signed out without replacing this drill clock', async () => {
    auth.id = null; mount('/classroom/drill?timing=standard');
    await screen.findByRole('button', { name: 'Review passages' });
    openOptions(); fireEvent.click(screen.getByText('Accommodations'));
    expect(screen.getByRole('button', { name: 'Save to profile' })).toBeDisabled();
    expect(profileTiming.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('combobox', { name: 'Timing' })).toHaveValue('standard');
  });
  it('applies training only on Apply and preserves the exact inspected IDs through Cancel and training edits', async () => {
    mount('/classroom/drill?count=2');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    const ids = [...loadPassages.mock.calls.at(-1)![0]];
    const calls = loadPassages.mock.calls.length;
    openOptions(); fireEvent.click(screen.getByText('Training modes'));
    fireEvent.click(screen.getByRole('checkbox', { name: /Anticipation/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    openOptions(); fireEvent.click(screen.getByText('Training modes'));
    expect(screen.getByRole('checkbox', { name: /Anticipation/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: /Anticipation/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Line-by-line/ }));
    commitDrawerIfOpen(); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    expect(loadPassages).toHaveBeenCalledTimes(calls);
    expect(screen.getByText('Training: Anticipation · Line-by-line')).toBeInTheDocument();
    expect(createSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual(ids);
    expect(createSession.mock.calls[0][0].training).toEqual({ anticipation: true, lineByLine: true });
  });
  it('clears just passage filters without resetting the drill timing', async () => {
    mount('/classroom/drill?timing=standard'); await screen.findByRole('button', { name: 'Review passages' });
    openAdvancedOptions(); fireEvent.click(screen.getByRole('button', { name: 'Clear passage filters' }));
    expect(screen.getByRole('combobox', { name: 'Practice history' })).toHaveValue('any');
    commitDrawerIfOpen(); editSetup(); expect(screen.getByRole('combobox', { name: 'Timing' })).toHaveValue('standard');
  });
  it('sorts manual passages and reorders the actual inspected selection', async () => {
    mount('/classroom/drill?passages=1188,1201'); await screen.findByText('2 selected');
    openSelectedPassages(); fireEvent.change(screen.getByRole('combobox', { name: 'Sort passages' }), { target: { value: 'title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move Passage 1201 earlier' }));
    commitDrawerIfOpen(); previewDrill();
    await screen.findByRole('button', { name: 'Start drill' });
    expect(loadPassages).toHaveBeenLastCalledWith([1201, 1188]);
    expect(createSession).not.toHaveBeenCalled();
  });
  it('requires explicit inclusion of unknown earlier exposure for strict selection', async () => {
    mount('/classroom/drill'); await screen.findByRole('button', { name: 'Review passages' });
    openOptions();
    selectStatus('No recorded exposure');
    commitDrawerIfOpen();
    expect(screen.getByRole('button', { name: 'Review passages' })).toBeDisabled();
    openOptions();
    const permission = screen.getByRole('checkbox', { name: 'Include passages whose earlier exposure is unknown' });
    expect(permission).not.toBeChecked(); fireEvent.click(permission);
    commitDrawerIfOpen();
    expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled();
  });
  it('rechecks exposure at Start and preserves the selection instead of silently substituting', async () => {
    const exposure = await import('../api/rcExposure');
    mount('/classroom/drill'); await screen.findByRole('button', { name: 'Review passages' });
    openOptions();
    selectStatus('No recorded exposure');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include passages whose earlier exposure is unknown' }));
    commitDrawerIfOpen(); previewDrill();
    await screen.findByRole('button', { name: 'Start drill' });
    const selected = loadPassages.mock.calls.at(-1)![0];
    vi.mocked(exposure.getRcExposureHistory).mockResolvedValueOnce(new Set(selected));
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
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
    await screen.findByRole('button', { name: 'Review passages' });
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
      await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
      expect(createSession).not.toHaveBeenCalled();
      expect(loadPassages).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it('requires acknowledgment rather than autostarting a smaller adaptive set', async () => {
    mount('/classroom/drill?section=rc&count=4&start=1');
    await screen.findByRole('region', { name: 'Selected reading set' });
    const start = await screen.findByRole('button', { name: 'Start drill' });
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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
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
    expect(screen.getByRole('button', { name: 'Review passages' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    expect(createSession).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Selected reading set' })).not.toBeInTheDocument();
    commitDrawerIfOpen(); previewDrill();
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
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
    expect(await screen.findByText('2 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'next link' }));
    await waitFor(() => expect(screen.queryByText('2 selected')).not.toBeInTheDocument());
    commitDrawerIfOpen(); editSetup(); expect(screen.getByRole('combobox', { name: 'Show answers' })).toHaveValue('per_passage');
    commitDrawerIfOpen(); editSetup(); expect(screen.getByRole('combobox', { name: 'Timing' })).toHaveValue('untimed');

    commitDrawerIfOpen(); previewDrill();
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(createSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
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
    await screen.findByText('2 selected');
    fireEvent.click(screen.getAllByRole('button', { name: 'Review passages' })[0]);
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(loadPassages).toHaveBeenCalledWith([1188, 1201]);
    expect(createSession).not.toHaveBeenCalled();
    expect(screen.queryByText('What is the main point?')).not.toBeInTheDocument();
    for (const button of screen.getAllByRole('button', { name: 'Reveal passage and questions · records exposure' })) fireEvent.click(button);
    await waitFor(() => expect(screen.getAllByText('What is the main point?')).toHaveLength(2));
    expect(screen.queryByText('Secret explanation')).not.toBeInTheDocument();
    expect(screen.queryByText('Secret reason')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Start drill' })[0]);
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual([1188, 1201]);
  });

  it('requires a new inspection after passage count changes', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&count=1');
    fireEvent.click(await screen.findByRole('button', { name: 'Review passages' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    editSetup(); fireEvent.click(screen.getByRole('button', { name: /^More passages/ }));
    expect(screen.queryByRole('region', { name: 'Selected reading set' })).not.toBeInTheDocument();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('keeps the picker bounded to twelve rows and preserves selections across pages', async () => {
    const many = Array.from({ length: 100 }, (_, i) => ({
      passageId: 3000 + i, preptest: 101 + (i % 40), section: 1, setNumber: 1 + Math.floor(i / 40),
      title: `Many ${3000 + i}`, firstWords: 'Opening', topic: 'Science', format: 'Single', frameworks: [] as string[],
      difficulty: 3, questionCount: 2, questionIds: [3000 + i * 2, 3001 + i * 2],
    }));
    const bank = await import('../lib/rcBank');
    vi.mocked(bank.loadAllIndexPassages).mockResolvedValue(many as never);
    try {
      mount('/classroom/drill?section=rc&count=1');
      await screen.findByRole('button', { name: 'Review passages' });
      editSetup(); choosePassageMethod('manual');
      const list = screen.getByRole('list', { name: 'Available passages' });
      expect(within(list).getAllByRole('listitem')).toHaveLength(12);
      expect(screen.getByText('Showing 1–12 of 100 passages.')).toBeInTheDocument();
      fireEvent.click(within(list).getByRole('button', { name: 'Add Many 3000' }));
      fireEvent.click(screen.getByRole('button', { name: 'Next passages' }));
      expect(within(list).getAllByRole('listitem')).toHaveLength(12);
      expect(within(list).queryByRole('button', { name: 'Remove Many 3000' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Previous passages' }));
      expect(within(list).getByRole('button', { name: 'Remove Many 3000' })).toBeInTheDocument();
      fireEvent.change(screen.getByRole('searchbox', { name: 'Find a passage' }), { target: { value: 'Many 3005' } });
      expect(within(list).getAllByRole('listitem')).toHaveLength(1);
      expect(screen.getByText(/1 selected · 1 passage matches your search and browsing filters/)).toBeInTheDocument();
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
    await screen.findByRole('button', { name: 'Review passages' });
    editSetup(); choosePassageMethod('manual');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a passage' }), { target: { value: 'PT 141' } });
    const list = screen.getByRole('list', { name: 'Available passages' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    fireEvent.click(within(list).getByRole('button', { name: 'Add Passage 1201' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a passage' }), { target: { value: 'PT 142' } });
    openSelectedPassages(); expect(screen.getByRole('button', { name: 'Remove Passage 1201 from selection' })).toBeInTheDocument();
    commitDrawerIfOpen(); previewDrill();
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(loadPassages).toHaveBeenLastCalledWith([1201]);
    expect(screen.getAllByRole('button', { name: 'Start drill' })).toHaveLength(1);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('uses only the active automatic draft and restores manual passages when switching back', async () => {
    mount('/classroom/drill?section=rc&passages=1188,1201');
    await screen.findByRole('button', { name: /^Customize drill$/ });
    await screen.findByText('2 selected');
    choosePassageMethod('automatic');
    expect(screen.queryByRole('region', { name: 'Choose your passages' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^More passages/ })).toBeEnabled();
    commitDrawerIfOpen(); previewDrill();
    await screen.findByRole('region', { name: 'Selected reading set' });
    editSetup(); choosePassageMethod('manual');
    expect(screen.getByRole('dialog', { name: 'Pick passages' })).toBeInTheDocument();
    expect(within(screen.getByLabelText('Selected passages')).getByRole('button', { name: 'Remove Passage 1188 from selection' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    previewDrill();
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][0].source).toBe('adaptive');
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

  const primary = () => { expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); return screen.getAllByRole('button', { name: /^(Review passages|Start drill|Preparing review…|Starting…)$/ })[0]; };
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
      openOptions();
      selectStatus(status); commitDrawerIfOpen();
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
    await screen.findByText('2 selected');
    expect(screen.getByRole('combobox', { name: 'Timing' })).toHaveValue('standard');
    expect(screen.queryByRole('button', { name: /^More passages/ })).not.toBeInTheDocument();
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(launchSummary()).not.toHaveTextContent('10 questions');
    commitDrawerIfOpen(); editSetup(); expect(screen.getByRole('combobox', { name: 'Timing' })).toHaveValue('standard');
  });

  it('keeps an invalid custom time editable, explains it, and blocks Inspect until it is valid', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&count=1');
    await screen.findByRole('button', { name: 'Review passages' });
    commitDrawerIfOpen(); editSetup(); fireEvent.change(screen.getByRole('combobox', { name: 'Timing' }), { target: { value: 'custom' } });
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
    await screen.findByText('2 selected');
    // The index says five questions each; nothing is promised before loading.
    expect(launchSummary()).not.toHaveTextContent(/\d+ questions/);
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    // The loaded passages carry one question each, and that is what is shown.
    expect(launchSummary()).toHaveTextContent('2 passages · 2 questions');
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
    await screen.findByRole('button', { name: 'Review passages' });
    commitDrawerIfOpen(); editSetup(); fireEvent.change(screen.getByRole('combobox', { name: 'Show answers' }), { target: { value: 'end_of_set' } });
    editSetup(); choosePassageMethod('manual');
    await act(async () => releaseIndex());
    fireEvent.click(screen.getByRole('button', { name: 'Add Passage 1201' }));
    commitDrawerIfOpen();
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    commitDrawerIfOpen(); editSetup(); fireEvent.change(screen.getByRole('combobox', { name: 'Timing' }), { target: { value: 'custom' } });
    expect(primary()).toHaveTextContent('Review passages');
    const field = screen.getByRole('textbox', { name: 'Minutes and seconds per passage' });
    fireEvent.change(field, { target: { value: '0:00' } });
    expect(primary()).toBeDisabled();
    fireEvent.change(field, { target: { value: '1:00' } });
    fireEvent.blur(field);
    commitDrawerIfOpen(); editSetup(); expect(screen.getByRole('combobox', { name: 'Show answers' })).toHaveValue('end_of_set');
    openSelectedPassages();
    expect(within(screen.getByRole('list', { name: 'Available passages' })).getByRole('button', { name: 'Remove Passage 1201' })).toHaveAttribute('aria-pressed', 'true');
    commitDrawerIfOpen();
    fireEvent.click(primary());
    await waitFor(() => expect(primary()).toHaveTextContent('Start drill'));
    fireEvent.click(primary());
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual([1201]);
    expect(createSession.mock.calls[0][0]).toMatchObject({ source: 'manual', reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 60 } });
  });

  it('requires acknowledging a smaller adaptive set before Start, and never claims the requested size', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&count=4');
    await screen.findByRole('button', { name: 'Review passages' });
    expect(screen.getByText(/Only 3 passages match/)).toBeInTheDocument();
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(launchSummary()).toHaveTextContent('3 passages · 3 questions');
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
    fireEvent.click(await screen.findByRole('button', { name: 'Review passages' }));
    editSetup(); fireEvent.click(screen.getByRole('button', { name: /^More passages/ }));
    release();
    await waitFor(() => expect(primary()).toHaveTextContent('Review passages'));
    expect(screen.queryByRole('region', { name: 'Selected reading set' })).not.toBeInTheDocument();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('marks an inspected set stale when a selection-affecting setting changes', async () => {
    mount('/classroom/drill?section=rc&stage=type-drill&count=1');
    fireEvent.click(await screen.findByRole('button', { name: 'Review passages' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    commitDrawerIfOpen(); editSetup(); fireEvent.click(screen.getByRole('button', { name: /^More passages/ }));
    expect(screen.getByText(/settings changed. Review the selection again/)).toBeInTheDocument();
    expect(primary()).toHaveTextContent('Review passages');
  });

  it('keeps an adaptive inspection until a nonempty manual selection is applied', async () => {
    mount('/classroom/drill?section=rc&count=1');
    await waitFor(() => expect(primary()).toBeEnabled());
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    editSetup(); choosePassageMethod('manual');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    previewDrill();
    expect(screen.getByRole('region', { name: 'Selected reading set' })).toBeInTheDocument();
    expect(primary()).toHaveTextContent('Start drill');
    editSetup(); choosePassageMethod('manual');
    fireEvent.click(screen.getByRole('button', { name: 'Add Passage 1201' }));
    commitDrawerIfOpen();
    expect(screen.queryByRole('region', { name: 'Selected reading set' })).not.toBeInTheDocument();
    expect(primary()).toHaveTextContent('Review passages');
    expect(createSession).not.toHaveBeenCalled();
  });

  it('will not pass inspection when a passage loads without questions', async () => {
    loadPassages.mockImplementationOnce(async (ids: number[]) =>
      ids.map((passageId) => ({ passageId, preptest: 140, title: 'Empty', setNumber: 1, text: 'x', questions: [] })) as never);
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188');
    await screen.findByText('1 selected');
    fireEvent.click(primary());
    expect(await screen.findByText(/loaded without its questions/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Selected reading set' })).not.toBeInTheDocument();
  });

  it('shows no pool count on a failed first read, then Retry restores the builder', async () => {
    const bank = await import('../lib/rcBank');
    vi.mocked(bank.loadAllIndexPassages).mockRejectedValueOnce(new Error('offline'));
    mount('/classroom/drill?section=rc&stage=type-drill&count=1');
    expect(await screen.findByText(/The passage list could not be loaded\./)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('The passage list could not be loaded.');
    expect(screen.queryByText(/Choosing from 0 of 0/)).not.toBeInTheDocument();
    expect(launchSummary()).not.toHaveTextContent(/\d+ questions/);
    expect(primary()).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(primary()).toBeEnabled());
    editSetup(); choosePassageMethod('manual');
    expect(within(screen.getByRole('list', { name: 'Available passages' })).getAllByRole('listitem')).toHaveLength(3);
  });

  it('keeps hand-picks but blocks launch when a refresh fails', async () => {
    const bank = await import('../lib/rcBank');
    const progress = await import('../api/rcProgress');
    // History fails first, so the builder offers Retry; the retry then loses
    // the passage list after the hand-picks were already applied.
    vi.mocked(progress.getQuestionHistory).mockRejectedValueOnce(new Error('offline'));
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188,1201');
    await screen.findByText('2 selected');
    expect(screen.getByText(/answer history could not be loaded/)).toBeInTheDocument();

    vi.mocked(bank.loadAllIndexPassages).mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/Your choices are kept/)).toBeInTheDocument();
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    for (const button of screen.getAllByRole('button', { name: 'Review passages' })) expect(button).toBeDisabled();
    expect(loadPassages).not.toHaveBeenCalled();
  });

  it('starts once when Start is pressed twice before the create call returns', async () => {
    let finish: (value: RcDrillSession) => void = () => {};
    createSession.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188');
    await screen.findByText('1 selected');
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
    await screen.findByText('1 selected');
    fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(primary());
    await screen.findByText(/Press Start again to retry this exact launch/);
    const [config, passageIds, request] = createSession.mock.calls[0];
    commitDrawerIfOpen(); editSetup(); fireEvent.change(screen.getByRole('combobox', { name: 'Show answers' }), { target: { value: 'end_of_set' } });
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
    fireEvent.click(await screen.findByRole('button', { name: 'Review passages' }));
    await screen.findByRole('region', { name: 'Selected reading set' });
    fireEvent.click(primary());
    await screen.findByText(/Press Start again to retry this exact launch/);
    const original = createSession.mock.calls[0];
    editSetup(); fireEvent.click(screen.getByRole('button', { name: /^More passages/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry original launch' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(2));
    expect(createSession.mock.calls[1]).toEqual(original);
  });
  it('cannot create another row while the exact pending lookup still fails', async () => {
    getSession.mockRejectedValue(new Error('offline'));
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188');
    await screen.findByText('1 selected'); fireEvent.click(primary());
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
    await screen.findByText('1 selected'); fireEvent.click(primary());
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
    await screen.findByText('1 selected'); fireEvent.click(primary());
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
    await screen.findByText('1 selected'); fireEvent.click(primary());
    await screen.findByRole('region', { name: 'Selected reading set' }); fireEvent.click(primary());
    expect(createSession).not.toHaveBeenCalled();
  });

  it('inspects without creating, deleting, or listing sessions', async () => {
    const progress = await import('../api/rcProgress');
    mount('/classroom/drill?section=rc&stage=type-drill&passages=1188,1201');
    await screen.findByText('2 selected');
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
    await screen.findByRole('button', { name: /^Customize drill$/ });
    editSetup(); choosePassageMethod('manual');

    // Default status filter is Fresh: only passage 1202 (not_attempted) matches
    let list = await screen.findByRole('list', { name: 'Available passages' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Passage 1202')).toBeInTheDocument();
    expect(within(list).getByText('Not attempted')).toBeInTheDocument();

    // Switch filter to Any: shows Skipped (1188), Partial · 1 missed (1201), and Not attempted (1202)
    fireEvent.click(within(list).getByRole('button', { name: 'Add Passage 1202' })); commitDrawerIfOpen();
    openOptions(); selectStatus('Any'); commitDrawerIfOpen(); openSelectedPassages();
    list = screen.getByRole('list', { name: 'Available passages' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText('Skipped')).toBeInTheDocument();
    expect(within(list).getByText('Partial · 1 missed')).toBeInTheDocument();
    expect(within(list).getByText('Not attempted')).toBeInTheDocument();

    // Switch filter to Incorrect on last try: passage 1201 still matches even though reviewCorrected is true
    commitDrawerIfOpen(); openOptions(); selectStatus('Incorrect on last try'); commitDrawerIfOpen(); openSelectedPassages();
    list = screen.getByRole('list', { name: 'Available passages' });
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
    await screen.findByText('1 selected');
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
    await screen.findByText('1 selected');
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
    choosePassageMethod(mode === 'fixed' ? 'automatic' : 'manual');
    if (mode === 'recipe') { fireEvent.click(screen.getByRole('button', { name: 'Add Passage 1188' })); commitDrawerIfOpen(); }
    commitDrawerIfOpen(); editSetup(); fireEvent.change(screen.getByRole('combobox', { name: 'Show answers' }), { target: { value: 'end_of_set' } });
    choosePassageMethod(mode === 'fixed' ? 'manual' : 'automatic');
    commitDrawerIfOpen();
    expect(vi.mocked(getRcSavedSet)).toHaveBeenCalledTimes(readCount);
    commitDrawerIfOpen(); editSetup(); expect(screen.getByRole('combobox', { name: 'Show answers' })).toHaveValue('end_of_set');
    if (mode === 'fixed') expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled();
  });

  it('syncs the mode URL without resetting either drill draft or router return state', async () => {
    render(<MemoryRouter initialEntries={[{ pathname: '/practice/drills', search: '?section=rc&builder=automatic&count=3', state: { fromRcLanding: true } }]}><RcHubSurface embedded showHistory={false} /><ModeLocationProbe /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Review passages' });
    commitDrawerIfOpen(); editSetup(); fireEvent.change(screen.getByRole('combobox', { name: 'Timing' }), { target: { value: 'custom' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Minutes and seconds per passage' }), { target: { value: '10:30' } });
    commitDrawerIfOpen(); editSetup(); fireEvent.change(screen.getByRole('combobox', { name: 'Show answers' }), { target: { value: 'end_of_set' } });
    openOptions();
    selectStatus('Incorrect before');
    commitDrawerIfOpen();
    editSetup(); choosePassageMethod('manual');
    fireEvent.click(within(screen.getByRole('list', { name: 'Available passages' })).getByRole('button', { name: 'Add Passage 1188' }));
    commitDrawerIfOpen();
    expect(screen.getByTestId('mode-location')).toHaveTextContent('builder=manual');
    expect(screen.getByTestId('mode-location')).toHaveTextContent('fromRcLanding');
    openAdvancedOptions();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Earliest PrepTest' }), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    choosePassageMethod('automatic');
    expect(screen.getByTestId('mode-location')).toHaveTextContent('builder=automatic');
    openOptions(); expect(screen.getByRole('combobox', { name: 'Practice history' })).toHaveValue('incorrect_before'); commitDrawerIfOpen();
    expect(screen.getByRole('textbox', { name: 'Minutes and seconds per passage' })).toHaveValue('10:30');
    commitDrawerIfOpen(); editSetup(); expect(screen.getByRole('combobox', { name: 'Show answers' })).toHaveValue('end_of_set');
    expect(within(screen.getByRole('group', { name: 'Passages' })).getByText('3')).toBeInTheDocument();
    editSetup(); choosePassageMethod('manual');
    expect(within(screen.getByLabelText('Selected passages')).getByRole('button', { name: 'Remove Passage 1188 from selection' })).toBeInTheDocument();
    commitDrawerIfOpen(); openAdvancedOptions();
    expect(screen.getByRole('spinbutton', { name: 'Earliest PrepTest' })).toHaveValue(101);
  });

  it('keeps automatic timing and count committed when an empty manual draft is cancelled', async () => {
    mount('/classroom/drill?section=rc&count=3&timing=standard');
    await screen.findByRole('button', { name: 'Review passages' });
    editSetup(); choosePassageMethod('manual');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('combobox', { name: 'Timing' })).toHaveValue('standard');
    expect(within(screen.getByRole('group', { name: 'Passages' })).getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled();
  });

  it.each(['PT140 S1 P1', '140.1.1', 'Passage 1188'])(
    'finds passages by title or passage reference: %s', async query => {
      mount('/classroom/drill?section=rc');
      await screen.findByRole('button', { name: 'Review passages' });
      editSetup(); choosePassageMethod('manual');
      fireEvent.change(screen.getByRole('searchbox', { name: 'Find a passage' }), { target: { value: query } });
      const list = screen.getByRole('list', { name: 'Available passages' });
      expect(within(list).getAllByRole('listitem')).toHaveLength(1);
      expect(within(list).getByRole('button', { name: 'Add Passage 1188' })).toBeInTheDocument();
    },
  );

  it('preserves each mode filter draft independently', async () => {
    mount('/classroom/drill?section=rc');
    await screen.findByRole('button', { name: 'Review passages' });
    openOptions();
    selectStatus('Incorrect before');
    commitDrawerIfOpen();
    editSetup(); choosePassageMethod('manual');
    fireEvent.click(screen.getByRole('button', { name: 'Add Passage 1188' })); commitDrawerIfOpen();
    openOptions(); expect(screen.getByRole('combobox', { name: 'Practice history' })).toHaveValue('fresh');
    selectStatus('Any'); commitDrawerIfOpen();
    choosePassageMethod('automatic');
    openOptions(); expect(screen.getByRole('combobox', { name: 'Practice history' })).toHaveValue('incorrect_before'); commitDrawerIfOpen();
    editSetup(); choosePassageMethod('manual');
    commitDrawerIfOpen(); openOptions(); expect(screen.getByRole('combobox', { name: 'Practice history' })).toHaveValue('any');
  });

  it('keeps invalid PrepTest bounds visible and blocks preview until corrected', async () => {
    mount('/classroom/drill?section=rc');
    await screen.findByRole('button', { name: 'Review passages' });
    openAdvancedOptions();
    const minimum = screen.getByRole('spinbutton', { name: 'Earliest PrepTest' });
    const maximum = screen.getByRole('spinbutton', { name: 'Latest PrepTest' });
    fireEvent.change(minimum, { target: { value: '158' } });
    fireEvent.change(maximum, { target: { value: '140' } });
    expect(maximum).toHaveValue(140);
    expect(maximum).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    fireEvent.change(maximum, { target: { value: '158' } });
    expect(maximum).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
  });

  it('resets only filters and preserves timing and reveal on embedded Create view', async () => {
    mount('/classroom/drill?section=rc&count=3&timing=standard&reveal=end_of_set');
    await screen.findByRole('button', { name: 'Review passages' });

    openOptions();
    selectStatus('Incorrect before');
    expect(screen.getByRole('combobox', { name: 'Practice history' })).toHaveValue('incorrect_before');

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));

    expect(screen.getByRole('combobox', { name: 'Practice history' })).toHaveValue('fresh');
    commitDrawerIfOpen(); editSetup(); expect(screen.getByRole('combobox', { name: 'Timing' })).toHaveValue('standard');
    commitDrawerIfOpen(); editSetup(); expect(screen.getByRole('combobox', { name: 'Show answers' })).toHaveValue('end_of_set');
    expect(navigate).not.toHaveBeenCalled();
  });
});



describe('RC direct passage lookup', () => {
  beforeEach(() => {
    sessionStorage.clear(); auth.id = 'owner'; navigate.mockClear(); createSession.mockClear(); loadPassages.mockClear();
    getSession.mockReset().mockResolvedValue(null); adoption.enabled = false; adoption.sessions = [];
  });
  const chooseAddress = (pt: string) => {
    fireEvent.change(screen.getByRole('combobox', { name: 'Lookup PrepTest' }), { target: { value: pt } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Lookup section' }), { target: { value: '1' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Lookup passage' }), { target: { value: '1' } });
  };
  it('requires a complete authoritative address and reviews exact IDs without starting or revealing', async () => {
    mount('/classroom/drill?count=3');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    fireEvent.change(screen.getByRole('combobox', { name: 'Lookup PrepTest' }), { target: { value: '141' } });
    expect(screen.getByRole('button', { name: 'Review passages' })).toBeDisabled();
    chooseAddress('141');
    previewDrill();
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(loadPassages.mock.calls.at(-1)![0]).toEqual([1201]);
    expect(createSession).not.toHaveBeenCalled();
    expect(screen.queryByText('Passage text.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][0].source).toBe('manual');
    expect(createSession.mock.calls[0][1]).toEqual([1201]);
  });
  it('restores the previous automatic count and reviewed IDs after clearing a reviewed direct lookup', async () => {
    mount('/classroom/drill?count=2');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    previewDrill(); await screen.findByRole('region', { name: 'Selected reading set' });
    const original = [...loadPassages.mock.calls.at(-1)![0]];
    editSetup(); chooseAddress('142'); previewDrill();
    await screen.findByRole('region', { name: 'Selected reading set' });
    expect(loadPassages.mock.calls.at(-1)![0]).toEqual([1202]);
    editSetup(); fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('group', { name: 'Passages' })).toHaveTextContent('2');
    const calls = loadPassages.mock.calls.length;
    previewDrill(); await screen.findByRole('region', { name: 'Selected reading set' });
    expect(loadPassages).toHaveBeenCalledTimes(calls);
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual(original);
    expect(createSession.mock.calls[0][0].source).toBe('adaptive');
  });
  it.each(['automatic', 'manual'] as const)('keeps the %s draft intact when applying practice options during lookup', async mode => {
    mount('/classroom/drill?count=2');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review passages' })).toBeEnabled());
    if (mode === 'manual') {
      choosePassageMethod('manual');
      fireEvent.click(screen.getByRole('button', { name: 'Add Passage 1188' }));
      fireEvent.click(screen.getByRole('button', { name: 'Add Passage 1201' }));
      commitDrawerIfOpen();
    }
    previewDrill(); await screen.findByRole('region', { name: 'Selected reading set' });
    const original = [...loadPassages.mock.calls.at(-1)![0]];
    editSetup(); chooseAddress('142');
    fireEvent.click(screen.getByRole('button', { name: 'Customize drill' }));
    expect(screen.getByRole('dialog', { name: 'Customize drill' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Passage selection method' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Practice history' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Training modes'));
    fireEvent.click(screen.getByRole('checkbox', { name: /Anticipation/ }));
    commitDrawerIfOpen();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('combobox', { name: 'Lookup PrepTest' })).toHaveValue('142');
    previewDrill(); await screen.findByRole('button', { name: 'Start drill' });
    expect(loadPassages.mock.calls.at(-1)![0]).toEqual([1202]);
    editSetup();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('button', { name: 'Customize drill' })).toBeEnabled();
    const calls = loadPassages.mock.calls.length;
    previewDrill(); await screen.findByRole('region', { name: 'Selected reading set' });
    expect(loadPassages).toHaveBeenCalledTimes(calls);
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(createSession.mock.calls[0][1]).toEqual(original);
    expect(createSession.mock.calls[0][0].source).toBe(mode === 'manual' ? 'manual' : 'adaptive');
  });

  it('keeps strict launch closed and explains a failed saved-answer history read', async () => {
    const progress = await import('../api/rcProgress');
    mount('/classroom/drill?section=rc&passages=1188');
    await screen.findByRole('button', { name: 'Edit selection' });
    selectStatus('No recorded exposure');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include passages whose earlier exposure is unknown' }));
    commitDrawerIfOpen(); previewDrill();
    await screen.findByRole('button', { name: 'Start drill' });
    vi.mocked(progress.getRcHistorySnapshot).mockRejectedValueOnce(new Error('Failed to fetch private backend diagnostic'));
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    await screen.findByText('Saved answers could not be checked. Nothing started. Retry before starting this exposure-filtered drill.');
    expect(screen.queryByText('Failed to fetch private backend diagnostic')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Selected reading set' })).toBeInTheDocument();
    expect(createSession).not.toHaveBeenCalled();
  });

});
