import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ list: vi.fn(), assignments: vi.fn(), drill: vi.fn(), launchProps: null as any, resultProps: null as any }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('@/contexts/QuestionBankContext', () => ({ useQuestionBank: () => ({ isLoading: false }) }));
vi.mock('@/lib/guidedDrills', () => ({ getGuidedDrillBySlug: mocks.drill, listAssignmentsForStudent: mocks.assignments }));
vi.mock('@/lib/drillRunLedger', () => ({ listStandaloneDrillRuns: mocks.list }));
vi.mock('@/pages/GuidedDrillStart', () => ({ default: (props: any) => { mocks.launchProps = props; return <button onClick={() => props.onLaunch({ kind: 'guided-drill', drillId: 'native-id', assignmentId: props.assignmentId, options: { returnTo: props.launchReturnTo } })}>Start native drill</button>; } }));
vi.mock('@/components/drill/DrillLaunchGate', () => ({ default: ({ launch, children }: any) => <div data-testid="launch">{JSON.stringify(launch)}{children}</div> }));
vi.mock('@/pages/Drill', () => ({ default: () => <div>Shared native runner</div> }));
vi.mock('@/components/drill/PracticeSetResults', () => ({ PracticeSetResults: (props: any) => { mocks.resultProps = props; return <div>Saved results<p>{props.subtitle}</p></div>; } }));

import { GuidedConditionalActivity, conditionalGuidedHistory } from './GuidedConditionalActivity';
import { CONDITIONAL_GUIDED_SETS } from './guidedConditionalCatalog';
const slug = 'w2-04-conditional-logic-easier-set-1';
const drill = { id: 'native-id', slug, title: 'Conditional Logic (Easier) Set 1' } as any;
const assignment = { id: 'guided-assignment', student_id: 'owner', guided_drill_id: drill.id, guided_drill: drill } as any;
const run = (key: string, userId = 'owner') => ({ id: 'saved-run', user_id: userId, source_key: key, updated_at: '2026-10-27T12:00:00Z', session: { status: 'in_progress', question_queue: ['q1', 'q2'], current_index: 1, attempts: [{ qid: 'q1', selected_answer: 'B', correct: false }] } }) as any;
const props = { slug, backUrl: '/bootcamp/conditionals/centre', launchUrl: '/bootcamp/conditionals/guided/easier1?assignment=course-grant', runUrl: '/bootcamp/conditionals/guided/easier1/run?assignment=course-grant' };
function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}</output>; }
function mount(query = '', more = {}) { return render(<MemoryRouter initialEntries={[`/bootcamp/conditionals/guided/easier1${query}`]}><GuidedConditionalActivity {...props} {...more} /><Location /></MemoryRouter>); }

beforeEach(() => { vi.clearAllMocks(); mocks.drill.mockResolvedValue(drill); mocks.assignments.mockResolvedValue([assignment]); mocks.list.mockResolvedValue([]); });
describe('conditional guided reuse', () => {
  it('contains precisely the thirteen native conditional sets, with no invented easier three', () => {
    expect(CONDITIONAL_GUIDED_SETS).toHaveLength(13);
    expect(new Set(CONDITIONAL_GUIDED_SETS.map(set => set.slug)).size).toBe(13);
    expect(CONDITIONAL_GUIDED_SETS.some(set => /easier-set-3$/.test(set.slug))).toBe(false);
  });
  it('aggregates assigned, direct and local-fallback histories without accepting foreign or unrelated runs', () => {
    const assigned = run('guided::guided-assignment');
    const direct = run('guided::drill:native-id');
    const local = run(`guided::drill:${slug}`);
    const result = conditionalGuidedHistory(drill, [assignment, { ...assignment, id: 'foreign', student_id: 'other' }], [assigned, direct, local, run('guided::foreign'), run('guided::drill:native-id', 'other'), run('guided::drill:other')], 'owner');
    expect(result.assignments).toEqual([assignment]);
    expect(result.runs).toEqual([assigned, direct, local]);
  });
  it('keeps local preview free of account reads or native runner effects', () => {
    mount('', { localOnly: true });
    expect(screen.getByText(/This preview does not load student work/)).toBeTruthy();
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.drill).not.toHaveBeenCalled();
    expect(screen.queryByText('Start native drill')).toBeNull();
  });
  it('starts an existing assigned drill internally while preserving the distinct course grant', async () => {
    mount('?assignment=course-grant&guidedAssignment=guided-assignment');
    fireEvent.click(await screen.findByText('Start native drill'));
    const output = screen.getByTestId('location').textContent!;
    const url = new URL(output, 'https://local.test');
    expect(url.pathname).toBe('/bootcamp/conditionals/guided/easier1/run');
    expect(url.searchParams.get('assignment')).toBe('course-grant');
    expect(url.searchParams.get('guidedAssignment')).toBe('guided-assignment');
    expect(url.searchParams.get('guidedDrill')).toBe('native-id');
  });
  it('keeps earlier assignments discoverable even when their work predates individual sitting rows', async () => {
    mocks.assignments.mockResolvedValue([{ ...assignment, status: 'completed' }]);
    mount('?assignment=course-grant');
    fireEvent.click(await screen.findByText('Open assigned work'));
    expect(screen.getByTestId('location').textContent).toContain('guidedAssignment=guided-assignment');
    expect(mocks.launchProps.assignmentId).toBe('guided-assignment');
  });
  it('reuses the shared runner with a reconstructed native launch rather than interpreting the course grant as a guided assignment', async () => {
    mount('?assignment=course-grant&guidedAssignment=guided-assignment&drill=guided-drill&guidedDrill=native-id&returnTo=%2Funrelated', { view: 'run' });
    await screen.findByText('Shared native runner');
    const launch = JSON.parse(screen.getByTestId('launch').childNodes[0].textContent!);
    expect(launch.assignmentId).toBe('guided-assignment');
    expect(launch.options.returnTo).toBe(props.launchUrl);
  });
  it('rejects an unrelated native drill even with a valid containing grant', async () => {
    mount('?assignment=course-grant&drill=guided-drill&guidedDrill=unrelated', { view: 'run' });
    await screen.findByText('This saved guided work is unavailable.');
    expect(screen.queryByText('Shared native runner')).toBeNull();
  });
  it('does not allow a pasted foreign run ID to reach results or runner', async () => {
    mocks.list.mockResolvedValue([run('guided::drill:native-id', 'other')]);
    mount('?view=results&run=saved-run');
    await screen.findByText('This saved guided work is unavailable.');
    expect(screen.queryByText('Saved results')).toBeNull();
  });
  it('shows assigned sitting history and resumes it with its original assignment identity', async () => {
    mocks.list.mockResolvedValue([run('guided::guided-assignment')]);
    mount('?assignment=course-grant');
    fireEvent.click(await screen.findByText('Continue'));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toContain('/run?'));
    const url = new URL(screen.getByTestId('location').textContent!, 'https://local.test');
    expect(url.searchParams.get('assignment')).toBe('course-grant');
    expect(url.searchParams.get('guidedAssignment')).toBe('guided-assignment');
    expect(url.searchParams.get('run')).toBe('saved-run');
  });
  it('shows an unfinished legacy slug sitting as read-only saved work instead of offering an impossible resume', async () => {
    const saved = run(`guided::slug:${slug}`);
    const before = JSON.stringify(saved);
    mocks.list.mockResolvedValue([saved]);
    mount('?assignment=course-grant');
    fireEvent.click(await screen.findByText('View saved work'));
    await screen.findByText('Unfinished earlier sitting. Saved answers only.');
    expect(screen.queryByText('Continue')).toBeNull();
    expect(screen.queryByText('Shared native runner')).toBeNull();
    expect(screen.queryByText('Start native drill')).toBeNull();
    expect(mocks.resultProps.session.questionQueue).toEqual(['q1', 'q2']);
    expect(mocks.resultProps.session.attempts.get('q1').selectedAnswer).toBe('B');
    expect(JSON.stringify(saved)).toBe(before);
    fireEvent.click(screen.getByText('Open current practice'));
    await screen.findByText('Start native drill');
    expect(screen.getByTestId('location').textContent).not.toContain('run=');
  });
  it('keeps completed legacy slug results readable and current practice available without changing the saved completion', async () => {
    const saved = run(`guided::slug:${slug}`);
    saved.session.status = 'completed';
    mocks.list.mockResolvedValue([saved]);
    mount('?assignment=course-grant');
    fireEvent.click(await screen.findByText('Results and review'));
    await screen.findByText('Earlier completed sitting');
    expect(mocks.resultProps.session.attempts.get('q1').selectedAnswer).toBe('B');
    expect(saved.session.status).toBe('completed');
    fireEvent.click(screen.getByText('Open current practice'));
    await screen.findByText('Start native drill');
  });
});
