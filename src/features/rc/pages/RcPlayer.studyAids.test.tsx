import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RcDrillSession, RcPassage } from '../lib/rcTypes';
import { eliminationsFor, emptyStudyTools, loadStudyTools, saveStudyTools, studyToolsStorageKey, toggleBookmark } from '@/lib/questionStudyTools';

const api = vi.hoisted(() => ({
  getSession: vi.fn(), getSessionAttempts: vi.fn(), recordAttempt: vi.fn(),
  saveSessionClock: vi.fn(), completeSession: vi.fn(), setAttemptFlag: vi.fn(), createSession: vi.fn(),
}));
const auth = vi.hoisted(() => ({ user: { id: 'student-one' } as { id: string } | null }));
const release = vi.hoisted(() => ({ check: vi.fn() }));
vi.mock('../api/rcProtectedRelease', () => ({ assertRcParentReleased: release.check }));
vi.mock('../api/rcProgress', () => api);
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('../lib/rcBank', () => ({ loadPassages: async () => [passage], loadPassage: vi.fn() }));
vi.mock('../hooks/useRcA11y', () => ({ RC_FONT_SIZES: [100], useRcA11y: () => ({ settings: {}, fontScale: 1, update: vi.fn() }) }));
vi.mock('../hooks/useRcHighlights', () => ({ useRcHighlights: () => ({ forPassage: () => [] }) }));
vi.mock('@/components/drill/official/OfficialDrillFrame', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/drill/official/OfficialSessionStrip', () => ({ default: () => null }));
vi.mock('@/components/drill/official/OfficialDrillToolbar', () => ({
  default: ({ studyTools }: { studyTools: ReactNode }) => <div>{studyTools}</div>,
}));
vi.mock('@/components/drill/official/OfficialSmartDrillBar', () => ({
  default: ({ pager }: { pager: ReactNode }) => <div>{pager}</div>,
}));
vi.mock('../components/RcExamPane', () => ({
  rcTypeStyles: () => ({}),
  RcExamPane: ({ question }: { question: ReactNode }) => <div>{question}</div>,
}));
vi.mock('../components/RcQuestionPane', () => ({
  RcQuestionPane: ({ item, eliminations, onToggleElimination, onSelect }: {
    item: { number: number }; eliminations: string[]; onToggleElimination: (letter: string) => void; onSelect: (letter: string) => void;
  }) => <div>
    <p>Question {item.number} crossed: [{eliminations.join(',')}]</p>
    <button onClick={() => onToggleElimination('C')}>Cross out C</button>
    <button onClick={() => onToggleElimination('D')}>Cross out D</button>
    <button onClick={() => { onToggleElimination('C'); onToggleElimination('D'); }}>Cross out C and D together</button>
    <button onClick={() => onSelect('C')}>Select C</button>
    <button onClick={() => onSelect('D')}>Select D</button>
  </div>,
}));
vi.mock('../components/RcChrome', () => ({
  formatClock: (seconds: number) => String(seconds),
  RcToolbarButton: () => null, RcToolbarIcon: () => null, RcPager: () => null,
}));
vi.mock('../components/RcPassagePane', () => ({ RcPassagePane: () => null }));
vi.mock('../components/RcPassageSummary', () => ({ RcPassageSummary: () => null }));
vi.mock('../components/RcModals', () => ({
  RcQuestionDetails: () => null, RcSubmitConfirm: () => null, RcTextSettings: () => null, RcLineSpacingMenu: () => null,
}));
vi.mock('@/components/help/HelpSheet', () => ({ default: () => null }));

import RcPlayer from './RcPlayer';

const passage: RcPassage = {
  passageId: 10, preptest: 101, section: 2, setNumber: 1, title: null,
  topic: null, format: null, frameworks: [], difficulty: null, text: 'Passage text',
  summaries: { standard: null, brief: null, anotherWay: null },
  questions: [1, 2].map((questionId) => ({
    questionId, position: questionId, questionType: 'Main point', questionTypeFamily: 'Main point',
    difficulty: null, prompt: `Question ${questionId}`, correctAnswer: 'A' as const, hasWrittenExplanation: false,
    explanationBlocks: [], totalResponses: null, features: [], choices: (['C', 'D'] as const).map((letter) => ({
      letter, text: letter, tag: null, percent: null, responseCount: null, correct: false, explanation: null,
    })),
  })),
};
const session: RcDrillSession = {
  id: 'session-one', userId: 'student-one', passageIds: [10], status: 'in_progress',
  excludedFromAnalytics: false, startedAt: '2026-09-01T00:00:00Z', completedAt: null,
  config: { reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 100 }, source: 'manual', clockElapsedSeconds: 0 },
};
const Q1 = { family: 'rc' as const, id: 'session-one:1' };

const tree = () => (
  <MemoryRouter initialEntries={['/rc/drill?sessionId=session-one']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <RcPlayer />
  </MemoryRouter>
);

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  auth.user = { id: 'student-one' };
  api.getSession.mockResolvedValue(session);
  release.check.mockResolvedValue(undefined);
  api.getSessionAttempts.mockResolvedValue([]);
  api.saveSessionClock.mockResolvedValue(undefined);
  api.recordAttempt.mockImplementation(async (value: unknown) => value);
});
afterEach(() => cleanup());

describe('RC study aids in the mounted player', () => {
  it('does not redirect a departed routed-state review after its parent check resolves', async () => {
    let releaseParent!: () => void;
    release.check.mockReturnValue(new Promise<void>(resolve => { releaseParent = resolve; }));
    api.getSession.mockResolvedValue({ ...session, config: { ...session.config, practiceTestRunId: 'parent-exam' } });
    function Navigation() {
      const navigate = useNavigate();
      const location = useLocation();
      return <><button onClick={() => navigate('/away')}>Leave pending review</button><p>Current path: {location.pathname}</p></>;
    }
    render(<MemoryRouter initialEntries={[{ pathname: '/rc/drill', search: '?review=1', state: { passageIds: [10], sessionId: session.id } }]}>
      <Navigation />
      <Routes><Route path="/rc/drill" element={<RcPlayer />} /><Route path="/away" element={<p>Other page</p>} /></Routes>
    </MemoryRouter>);
    await vi.waitFor(() => expect(release.check).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Leave pending review' }));
    await act(async () => { releaseParent(); });
    expect(screen.getByText('Current path: /away')).toBeInTheDocument();
    expect(screen.getByText('Other page')).toBeInTheDocument();
    expect(api.getSessionAttempts).not.toHaveBeenCalled();
  });
  it('blocks a direct completed full-test child review before loading answers when the parent is sealed', async () => {
    const child = { ...session, status: 'completed', config: { ...session.config, practiceTestRunId: 'parent-exam' } };
    api.getSession.mockResolvedValue(child);
    release.check.mockRejectedValue(new Error('This section stays sealed until the whole practice test is complete.'));
    render(<MemoryRouter initialEntries={['/rc/drill?sessionId=session-one&review=1']}><RcPlayer /></MemoryRouter>);
    expect(await screen.findByText('This section stays sealed until the whole practice test is complete.')).toBeInTheDocument();
    expect(release.check).toHaveBeenCalledWith(child, 'student-one');
    expect(api.getSessionAttempts).not.toHaveBeenCalled();
    expect(screen.queryByText('Question 1 crossed: []')).not.toBeInTheDocument();
  });
  it('selecting a crossed-out letter durably restores it after a later pick and reload', async () => {
    const first = render(tree());
    await screen.findByText('Question 1 crossed: []');
    fireEvent.click(screen.getByRole('button', { name: 'Cross out C' }));
    expect(eliminationsFor(loadStudyTools('student-one').state, Q1)).toEqual(['C']);
    fireEvent.click(screen.getByRole('button', { name: 'Select C' }));
    expect(screen.getByText('Question 1 crossed: []')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select D' }));
    expect(eliminationsFor(loadStudyTools('student-one').state, Q1)).toEqual([]);
    first.unmount();
    render(tree());
    expect(await screen.findByText('Question 1 crossed: []')).toBeInTheDocument();
    expect(api.recordAttempt).not.toHaveBeenCalled();
  });

  it('rapid cross-outs persist the reducer result rather than the last stale event', async () => {
    const first = render(tree());
    await screen.findByText('Question 1 crossed: []');
    fireEvent.click(screen.getByRole('button', { name: 'Cross out C and D together' }));
    expect(screen.getByText('Question 1 crossed: [C,D]')).toBeInTheDocument();
    expect(eliminationsFor(loadStudyTools('student-one').state, Q1)).toEqual(['C', 'D']);
    first.unmount();
    render(tree());
    expect(await screen.findByText('Question 1 crossed: [C,D]')).toBeInTheDocument();
    expect(api.recordAttempt).not.toHaveBeenCalled();
  });

  it('explicit clear removes only this question cross-outs and survives reload', async () => {
    const marks = toggleBookmark(emptyStudyTools(), {
      family: 'rc', id: '1', label: 'Retained bookmark', passageId: 10,
    });
    expect(saveStudyTools('student-one', {
      ...marks, eliminations: { 'rc:session-one:2': ['D'] },
    })).toBe(true);
    const first = render(tree());
    await screen.findByText('Question 1 crossed: []');
    fireEvent.click(screen.getByRole('button', { name: 'Cross out C' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bookmarks and study marks' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear cross-outs on this question' }));
    expect(screen.getByText('Question 1 crossed: []')).toBeInTheDocument();
    const saved = loadStudyTools('student-one').state;
    expect(eliminationsFor(saved, Q1)).toEqual([]);
    expect(eliminationsFor(saved, { family: 'rc', id: 'session-one:2' })).toEqual(['D']);
    expect(saved.bookmarks).toEqual(marks.bookmarks);
    first.unmount();
    render(tree());
    expect(await screen.findByText('Question 1 crossed: []')).toBeInTheDocument();
    expect(api.recordAttempt).not.toHaveBeenCalled();
  });

  it('an unanswered cross-out comes back after a reload, with no attempt written', async () => {
    const first = render(tree());
    await screen.findByText('Question 1 crossed: []');
    fireEvent.click(screen.getByRole('button', { name: 'Cross out C' }));
    expect(screen.getByText('Question 1 crossed: [C]')).toBeInTheDocument();
    first.unmount();

    render(tree());
    expect(await screen.findByText('Question 1 crossed: [C]')).toBeInTheDocument();
    expect(api.recordAttempt).not.toHaveBeenCalled();
    expect(api.createSession).not.toHaveBeenCalled();
  });

  it('switching actors boots B-owned work without copying A marks or cross-outs', async () => {
    const loadedActors: string[] = [];
    api.getSession.mockImplementation(async () => {
      const actorId = auth.user!.id;
      loadedActors.push(actorId);
      return { ...session, userId: actorId };
    });
    expect(saveStudyTools('student-one', toggleBookmark(emptyStudyTools(), {
      family: 'rc', id: '1', label: 'A private bookmark', passageId: 10,
    }))).toBe(true);
    const view = render(tree());
    await screen.findByText('Question 1 crossed: []');
    fireEvent.click(screen.getByRole('button', { name: 'Cross out C' }));
    expect(screen.getByText('Question 1 crossed: [C]')).toBeInTheDocument();
    const aStore = localStorage.getItem(studyToolsStorageKey('student-one'));
    expect(eliminationsFor(loadStudyTools('student-one').state, Q1)).toEqual(['C']);
    expect(Object.keys(loadStudyTools('student-one').state.bookmarks)).toHaveLength(1);

    await act(async () => {
      auth.user = { id: 'student-two' };
      view.rerender(tree());
    });
    expect(await screen.findByText('Question 1 crossed: []')).toBeInTheDocument();
    expect(loadedActors).toEqual(['student-one', 'student-two']);
    expect(api.getSessionAttempts).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/belongs to another account/)).not.toBeInTheDocument();
    expect(screen.queryByText('Question 1 crossed: [C]')).not.toBeInTheDocument();
    expect(loadStudyTools('student-two').state).toEqual(emptyStudyTools());

    fireEvent.click(screen.getByRole('button', { name: 'Cross out D' }));
    expect(screen.getByText('Question 1 crossed: [D]')).toBeInTheDocument();
    const bState = loadStudyTools('student-two').state;
    expect(eliminationsFor(bState, Q1)).toEqual(['D']);
    expect(bState.bookmarks).toEqual({});
    expect(bState.highlights).toEqual({});
    expect(localStorage.getItem(studyToolsStorageKey('student-one'))).toBe(aStore);
    expect(api.recordAttempt).not.toHaveBeenCalled();
    expect(api.createSession).not.toHaveBeenCalled();
  });
});

it.each(['url', 'routed state'])('blocks a discarded drill through %s before loading answers or exposing editing controls', async (entry) => {
  api.getSession.mockResolvedValue({ ...session, status: 'abandoned' });
  render(entry === 'url' ? tree() : <MemoryRouter initialEntries={[{ pathname: '/rc/drill', state: { sessionId: session.id, passageIds: session.passageIds } }]}><RcPlayer /></MemoryRouter>);
  expect(await screen.findByText('This drill was discarded. Start a new drill from Practice.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Select C' })).not.toBeInTheDocument();
  expect(api.getSessionAttempts).not.toHaveBeenCalled();
  expect(api.recordAttempt).not.toHaveBeenCalled();
  expect(api.saveSessionClock).not.toHaveBeenCalled();
});
