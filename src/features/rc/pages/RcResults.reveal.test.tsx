import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RcDrillSession } from '../lib/rcTypes';
const mocks = vi.hoisted(() => ({ session: {} as RcDrillSession, reveal: vi.fn(), exclude: vi.fn(), create: vi.fn(), get: vi.fn(), navigate: vi.fn(), route: 'done', correctWithSkips: false }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('react-router-dom', async () => ({ ...await vi.importActual('react-router-dom'), useNavigate: () => mocks.navigate, useParams: () => ({ sessionId: mocks.route }) }));
vi.mock('@/components/drill/ScoreRing', () => ({ default: () => <span>Score ring</span> }));
vi.mock('../api/rcProgress', () => ({ getSession: (...args: unknown[]) => mocks.get(...args), getSessionAttempts: async () => mocks.correctWithSkips
  ? [{ questionId: 10, selected: 'A', isCorrect: true, isFirstAttempt: true, timeMs: 1000 }, { questionId: 11, selected: null, isCorrect: false, isFirstAttempt: true, timeMs: 0 }]
  : [{ questionId: 10, selected: 'B', isCorrect: false, isFirstAttempt: true, timeMs: 1000 }], revealSessionResults: (...args: unknown[]) => mocks.reveal(...args), setSessionExcluded: (...args: unknown[]) => mocks.exclude(...args), createSession: (...args: unknown[]) => mocks.create(...args) }));
vi.mock('../lib/rcBank', () => ({ loadPassages: async () => [{ passageId: 7, preptest: 139, section: 3, setNumber: 1, title: 'Saved passage', frameworks: [], difficulty: 3, questions: (mocks.correctWithSkips ? [10, 11, 12] : [10]).map((questionId, index) => ({ questionId, position: index + 1, correctAnswer: 'A', questionType: 'Main point', difficulty: 3, choices: [{ letter: 'A', text: 'Alpha' }, { letter: 'B', text: 'Beta' }] })) }] }));
import RcResults from './RcResults';
const show = () => render(<MemoryRouter initialEntries={['/rc/results/done']}><Routes><Route path="/rc/results/:sessionId" element={<RcResults />} /></Routes></MemoryRouter>);
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); mocks.route = 'done'; mocks.correctWithSkips = false;
  mocks.session = { id: 'done', userId: 'owner', status: 'completed', startedAt: '2026-10-17T12:00:00Z', completedAt: '2026-10-17T12:01:00Z', passageIds: [7], excludedFromAnalytics: false, config: { source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' } } };
  mocks.get.mockImplementation(async (id: string) => id === 'done' ? mocks.session : null);
  mocks.exclude.mockResolvedValue(undefined);
});
describe('RC results release', () => {
  it('hides keys, scores and derived cues until reveal is acknowledged', async () => {
    let acknowledge!: (value: unknown) => void;
    mocks.reveal.mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Reveal score and answers' }));
    expect(screen.queryByText('Score ring')).toBeNull();
    expect(screen.queryByText('Every question')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Drill your misses' })).toBeNull();
    acknowledge({ ...mocks.session, config: { ...mocks.session.config, resultsRevealedAt: '2026-10-17T12:00:00Z' } });
    expect(await screen.findByText('Every question')).toBeInTheDocument();
    expect(mocks.reveal).toHaveBeenCalledWith('done', 'owner');
  });
  it('keeps feedback hidden after a rejected reveal and allows blind review', async () => {
    mocks.reveal.mockRejectedValue(new Error('Reveal did not save'));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Reveal score and answers' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reveal did not save');
    expect(screen.queryByText('Score ring')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Review without answers' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/rc/drill?sessionId=done&review=1');
  });
  it('preserves analytics state after rejection, then shows acknowledged inclusion copy', async () => {
    mocks.exclude.mockRejectedValueOnce(new Error('Analytics did not save'));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Exclude from analytics' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Analytics did not save');
    expect(screen.getByText('This sitting is included in analytics.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exclude from analytics' })).not.toHaveAttribute('aria-pressed');
    fireEvent.click(screen.getByRole('button', { name: 'Exclude from analytics' }));
    expect(await screen.findByRole('button', { name: 'Include in analytics' })).not.toHaveAttribute('aria-pressed');
    expect(screen.getByText('This sitting is excluded from analytics.')).toBeInTheDocument();
  });
  it('offers unanswered passage retries after reveal when every answered question was correct', async () => {
    mocks.correctWithSkips = true;
    mocks.reveal.mockImplementation(async () => ({ ...mocks.session, config: { ...mocks.session.config, resultsRevealedAt: '2026-10-17T12:00:00Z' } }));
    mocks.create.mockImplementation(async (config, passageIds, request) => ({ id: request.id, userId: 'owner', status: 'in_progress', config, passageIds }));
    show();
    expect(await screen.findByRole('button', { name: 'Reveal score and answers' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Include unanswered questions' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reveal score and answers' }));
    const include = await screen.findByRole('checkbox', { name: 'Include unanswered questions' });
    expect(include).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Drill your misses' })).toBeDisabled();
    fireEvent.click(include);
    expect(screen.getByRole('button', { name: 'Drill your misses' })).not.toBeDisabled();
    expect(screen.getByText(/A new drill includes every question in each selected passage/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Drill your misses' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create.mock.calls[0][1]).toEqual([7]);
    const request = mocks.create.mock.calls[0][2];
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(`/rc/drill?sessionId=${request.id}`));
  });
  it('recovers a lost create reply with the same durable id after remount', async () => {
    mocks.session.config.resultsRevealedAt = '2026-10-17T12:00:00Z';
    mocks.create.mockRejectedValueOnce(new Error('Lost reply'));
    const view = show();
    fireEvent.click(await screen.findByRole('button', { name: 'Drill your misses' }));
    await screen.findByRole('alert');
    const request = mocks.create.mock.calls[0][2];
    expect(JSON.parse(localStorage.getItem('lsatu:rc-missed-create:v1:owner:done')!).id).toBe(request.id);
    view.unmount();
    mocks.get.mockImplementation(async (id: string) => id === 'done' ? mocks.session : { id, userId: 'owner', status: 'in_progress', config: { source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' } }, passageIds: [7] });
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Drill your misses' }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/rc/drill?sessionId=' + request.id));
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it('does not apply a delayed reveal from another session in the same account', async () => {
    let acknowledge!: (value: unknown) => void;
    mocks.reveal.mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
    const view = show();
    fireEvent.click(await screen.findByRole('button', { name: 'Reveal score and answers' }));
    mocks.route = 'other';
    mocks.get.mockImplementation(async (id: string) => ({ ...mocks.session, id }));
    view.rerender(<MemoryRouter><Routes><Route path="*" element={<RcResults />} /></Routes></MemoryRouter>);
    await screen.findByRole('button', { name: 'Review without answers' });
    acknowledge({ ...mocks.session, config: { ...mocks.session.config, resultsRevealedAt: '2026-10-17T12:00:00Z' } });
    await waitFor(() => expect(screen.queryByText('Score ring')).toBeNull());
    expect(screen.getByRole('button', { name: 'Review without answers' })).toBeInTheDocument();
  });
  it('refuses a recovered UUID belonging to a different payload', async () => {
    mocks.session.config.resultsRevealedAt = '2026-10-17T12:00:00Z';
    const id = '11111111-1111-4111-8111-111111111111';
    const config = { source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' } };
    localStorage.setItem('lsatu:rc-missed-create:v1:owner:done', JSON.stringify({ id, config, passageIds: [7] }));
    mocks.get.mockImplementation(async (key: string) => key === 'done' ? mocks.session : { id, userId: 'owner', status: 'in_progress', config, passageIds: [99] });
    show();
    expect(await screen.findByText('PT 139 · S3 · P1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Drill your misses' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('does not match');
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it('rejects a malformed UUID without looking up or creating work', async () => {
    mocks.session.config.resultsRevealedAt = '2026-10-17T12:00:00Z';
    localStorage.setItem('lsatu:rc-missed-create:v1:owner:done', JSON.stringify({ id: '-'.repeat(36), config: {}, passageIds: [] }));
    show(); fireEvent.click(await screen.findByRole('button', { name: 'Drill your misses' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('does not match');
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.get).toHaveBeenCalledTimes(1);
  });

});
