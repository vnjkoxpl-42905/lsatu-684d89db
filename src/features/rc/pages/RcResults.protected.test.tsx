import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
const saved = vi.hoisted(() => ({ create: vi.fn(async (_config: unknown, _ids: number[]) => ({ id: 'fresh-custom' })), navigate: vi.fn(), historical: false, sealed: false, attempts: vi.fn() }));
vi.mock('../api/rcProtectedRelease', () => ({ assertRcParentReleased: async () => {
  if (saved.sealed) throw new Error('This section stays sealed until the whole practice test is complete.');
} }));
vi.mock('react-router-dom', async () => ({ ...await vi.importActual('react-router-dom'), useNavigate: () => saved.navigate }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('@/components/drill/ScoreRing', () => ({ default: () => <span>Score</span> }));
vi.mock('../api/rcProgress', async () => {
  const actual = await vi.importActual<typeof import('../api/rcProgress')>('../api/rcProgress');
  return {
  getSession: async (id: string) => id !== 'protected-child' ? null : actual.toSession({ id: 'protected-child', passage_ids: [1188, 1190, 1192, 1195], status: 'completed', excluded_from_analytics: false, user_id: 'owner', started_at: '2026-09-30T00:00:00Z', completed_at: '2026-09-30T00:10:00Z',
    timed_section_sitting_id: '10000000-0000-4000-8000-000000000001',
    config: { mode: 'section', reveal: 'end_of_set', timerSeconds: 2100, source: 'manual', timedSectionSittingId: '10000000-0000-4000-8000-000000000001', clockElapsedSeconds: 67, currentQuestionIndex: 2, lastActiveAt: 'old' } } as unknown as Parameters<typeof actual.toSession>[0]),
  getSessionAttempts: async () => { saved.attempts(); return [{ questionId: saved.historical ? 10733 : 10, selected: 'B', isCorrect: saved.historical, isFirstAttempt: true, timeMs: 1000 }]; },
  createSession: async (config: unknown, ids: number[], request: { id: string }) => { await saved.create(config, ids); return { id: request.id, userId: 'owner' }; }, setSessionExcluded: vi.fn(),
}; });
vi.mock('../lib/rcBank', () => ({ loadPassages: async () => [1188,1190,1192,1195].map((passageId, index) => ({ passageId, title: 'Saved passage', frameworks: [], difficulty: 3,
  questions: [{ questionId: saved.historical && index === 0 ? 10733 : (index + 1) * 10, position: 1,
    correctAnswer: saved.historical && index === 0 ? 'D' : 'A', questionType: 'Main point', difficulty: 3, choices: [{ letter: 'A', text: 'Right' }, { letter: 'B', text: 'Wrong' }] }] })) }));
import RcResults from './RcResults';
describe('protected RC retry boundary', () => {
  it('blocks a direct report before attempts or score are rendered when parent release is denied', async () => {
    saved.sealed = true; saved.attempts.mockClear();
    render(<MemoryRouter initialEntries={['/rc/results/protected-child']}><Routes><Route path="/rc/results/:sessionId" element={<RcResults />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('This section stays sealed until the whole practice test is complete.')).toBeInTheDocument();
    expect(saved.attempts).not.toHaveBeenCalled();
    expect(screen.queryByText('Score')).not.toBeInTheDocument();
    saved.sealed = false;
  });
  it('refuses a retry from a protected source section', async () => {
    saved.historical = false;
    render(<MemoryRouter initialEntries={['/rc/results/protected-child']}><Routes><Route path="/rc/results/:sessionId" element={<RcResults />} /></Routes></MemoryRouter>);
    const button = await screen.findByRole('button', { name: 'Drill your misses' });
    expect(button).toBeDisabled(); fireEvent.click(button);
    expect(saved.create).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Exclude from analytics' })).toBeDisabled();
    expect(screen.getByText('Section elapsed time').previousElementSibling).toHaveTextContent('1:07');
  });
  it('discloses a corrected key while retaining the recorded historical score and protected controls', async () => {
    saved.historical = true;
    render(<MemoryRouter initialEntries={['/rc/results/protected-child']}><Routes><Route path="/rc/results/:sessionId" element={<RcResults />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('status')).toHaveTextContent('This report preserves the recorded score and shows the current credited answer.');
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exclude from analytics' })).toBeDisabled();
    saved.historical = false;
  });
});
