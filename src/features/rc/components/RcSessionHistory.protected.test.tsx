import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], deletes: vi.fn(), filters: vi.fn(), actorId: 'owner' }));
vi.mock('../api/rcSupabase.types', () => ({ RC_SESSIONS_TABLE: 'rc_drill_sessions', RC_ATTEMPTS_TABLE: 'rc_attempts', RC_ANNOTATIONS_TABLE: 'rc_annotations',
  rcDb: {
    auth: { getUser: async () => ({ data: { user: { id: state.actorId } }, error: null }) },
    from: () => ({ select: () => ({ eq: (column: string, value: string) => {
      state.filters(column, value);
      return { order: async () => ({ data: state.rows.filter(row => row[column] === value), error: null }) };
    } }) }),
  } }));
vi.mock('../api/rcProgress', async () => ({ ...await vi.importActual<typeof import('../api/rcProgress')>('../api/rcProgress'), getSessionAttempts: async () => [], deleteSession: state.deletes }));
import RcSessionHistory from './RcSessionHistory';
import { listSessions } from '../api/rcProgress';
const sitting = '10000000-0000-4000-8000-000000000001';
const nativeRow = { id: 'rc-child', user_id: 'owner', status: 'in_progress', passage_ids: [1188,1190,1192,1195], started_at: '2026-09-30T00:00:00Z', completed_at: null, excluded_from_analytics: false,
  timed_section_sitting_id: sitting, config: { mode: 'section', source: 'manual', reveal: 'end_of_set', timedSectionSittingId: sitting, timerSeconds: 2100, currentQuestionIndex: 1, clockElapsedSeconds: 67 } };
function Probe() { const location = useLocation(); return <output data-testid="history-destination">{location.pathname}{location.search}</output>; }
function mount() { return render(<MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}><RcSessionHistory /><Probe /></MemoryRouter>); }
describe('actual native RC history row shapes', () => {
  beforeEach(() => { state.rows = []; state.actorId = 'owner'; state.deletes.mockClear(); state.filters.mockClear(); });
  it('filters the signed-in actor and maps native section authority without including another account', async () => {
    state.rows = [nativeRow, { ...nativeRow, id: 'other-account', user_id: 'student' }, {
      ...nativeRow, id: 'pt-child', timed_section_sitting_id: null, practice_test_run_id: 'full-test', practice_test_leg: 1,
      config: { mode: 'section', timerSeconds: 3150 },
    }];
    const sessions = await listSessions();
    expect(state.filters).toHaveBeenCalledExactlyOnceWith('user_id', 'owner');
    expect(sessions.map(session => session.id)).toEqual(['rc-child', 'pt-child']);
    expect(sessions[0].config).toMatchObject({ timing: { mode: 'per_passage_budget', secondsPerPassage: 525 }, timedSectionSittingId: sitting });
    expect(sessions[1].config).toMatchObject({ timing: { mode: 'per_passage_budget', secondsPerPassage: 787.5 }, practiceTestRunId: 'full-test', practiceTestLegIndex: 1 });
    expect(sessions[1].config.reveal).toBeUndefined();
  });
  it('normalizes standalone and full-PrepTest section budgets through the real listSessions mapper', async () => {
    state.rows = [nativeRow, { ...nativeRow, id: 'pt-child', status: 'completed', timed_section_sitting_id: null, practice_test_run_id: 'full-test', practice_test_leg: 1,
      config: { mode: 'section', source: 'manual', reveal: 'end_of_set', timerSeconds: 3150, clockElapsedSeconds: 80 } }];
    mount();
    await waitFor(() => expect(screen.getAllByText(/4 passages · timed/)).toHaveLength(2));
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Discard' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(screen.getByTestId('history-destination')).toHaveTextContent(`/testing/sections/${sitting}`);
    expect(state.deletes).not.toHaveBeenCalled();
  });
  it('shows untimed only when the native account explicitly acknowledges a null budget', async () => {
    state.rows = [{ ...nativeRow, config: { ...nativeRow.config, timerSeconds: null } }];
    mount();
    expect(await screen.findByText(/4 passages · untimed/)).toBeInTheDocument();
  });
  it('states missing historical feedback timing without inventing a reveal mode', async () => {
    state.rows = [{ ...nativeRow, timed_section_sitting_id: null, practice_test_run_id: 'full-test', config: { mode: 'section', timerSeconds: 2100 } }];
    mount();
    expect(await screen.findByText(/Feedback timing not recorded/)).toBeInTheDocument();
    expect(screen.getByText(/4 passages · timed/)).toBeInTheDocument();
  });
  it('reports missing timing authority instead of crashing or inventing an untimed session', async () => {
    state.rows = [{ ...nativeRow, config: { mode: 'section', reveal: 'end_of_set' } }];
    mount();
    expect(await screen.findByText(/could not be loaded/)).toBeInTheDocument();
    expect(screen.queryByText(/4 passages · untimed/)).not.toBeInTheDocument();
    expect(screen.queryByText('No reading drills yet.')).not.toBeInTheDocument();
  });
});
