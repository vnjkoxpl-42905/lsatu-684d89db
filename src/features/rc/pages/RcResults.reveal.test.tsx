import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: {} as any, reveal: vi.fn(), exclude: vi.fn(), create: vi.fn(), get: vi.fn(), navigate: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('react-router-dom', async () => ({ ...await vi.importActual('react-router-dom'), useNavigate: () => mocks.navigate }));
vi.mock('@/components/drill/ScoreRing', () => ({ default: () => <span>Score ring</span> }));
vi.mock('../api/rcProgress', () => ({ getSession: (...args: unknown[]) => mocks.get(...args), getSessionAttempts: async () => [{ questionId: 10, selected: 'B', isCorrect: false, isFirstAttempt: true, timeMs: 1000 }], revealSessionResults: (...args: unknown[]) => mocks.reveal(...args), setSessionExcluded: (...args: unknown[]) => mocks.exclude(...args), createSession: (...args: unknown[]) => mocks.create(...args) }));
vi.mock('../lib/rcBank', () => ({ loadPassages: async () => [{ passageId: 7, title: 'Saved passage', frameworks: [], difficulty: 3, questions: [{ questionId: 10, position: 1, correctAnswer: 'A', questionType: 'Main point', difficulty: 3, choices: [{ letter: 'A', text: 'Alpha' }, { letter: 'B', text: 'Beta' }] }] }] }));
import RcResults from './RcResults';
const show = () => render(<MemoryRouter initialEntries={['/rc/results/done']}><Routes><Route path="/rc/results/:sessionId" element={<RcResults />} /></Routes></MemoryRouter>);
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  mocks.session = { id: 'done', userId: 'owner', status: 'completed', passageIds: [7], excludedFromAnalytics: false, config: { source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' } } };
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
    expect(screen.getByRole('button', { name: 'Exclude from analytics' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Exclude from analytics' }));
    expect(await screen.findByRole('button', { name: 'Include in analytics' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('recovers a lost create reply with the same durable id after remount', async () => {
    mocks.session.config.resultsRevealedAt = '2026-10-17T12:00:00Z';
    mocks.create.mockRejectedValueOnce(new Error('Lost reply'));
    const view = show();
    fireEvent.click(await screen.findByRole('button', { name: 'Drill your misses' }));
    await screen.findByRole('alert');
    const request = mocks.create.mock.calls[0][2];
    expect(localStorage.getItem('lsatu:rc-missed-create:v1:owner:done')).toBe(request.id);
    view.unmount();
    mocks.get.mockImplementation(async (id: string) => id === 'done' ? mocks.session : { id, userId: 'owner' });
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Drill your misses' }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/rc/drill?sessionId=' + request.id));
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});
