import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RcSessionItem } from '../lib/rcSession';
import type { RcAttempt } from '../lib/rcTypes';
const api = vi.hoisted(() => ({ get: vi.fn(), navigate: vi.fn() }));
vi.mock('../lib/rcLearning', () => ({ getRcLearningEvents: (...args: unknown[]) => api.get(...args) }));
vi.mock('react-router-dom', async () => ({ ...await vi.importActual('react-router-dom'), useNavigate: () => api.navigate }));
import { RcReviewSuggestions } from './RcReviewSuggestions';
const items = [{ passage: { passageId: 7, preptest: 140, section: 1, setNumber: 1 }, question: { questionId: 1, position: 1 } }] as RcSessionItem[];
const answers = new Map([[1, { selected: 'A', flagged: true, timeMs: 1000 }]]) as Map<number, RcAttempt>;
const show = () => render(<MemoryRouter><RcReviewSuggestions actorId="owner" sessionId="saved-session" items={items} firstAttempts={answers} /></MemoryRouter>);
beforeEach(() => { vi.clearAllMocks(); api.get.mockResolvedValue([]); });
describe('configurable RC review suggestions', () => {
  it('uses flags by default and opens the exact saved question without any creation or correctness lookup', () => {
    show(); expect(api.get).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Review suggestions'));
    fireEvent.click(screen.getByRole('button', { name: 'PT 140 · S1 · P1 · Q1' }));
    expect(api.navigate).toHaveBeenCalledWith('/rc/drill?sessionId=saved-session&review=1&q=1');
  });
  it('loads confidence only when selected and retains Unknown after a failed read', async () => {
    api.get.mockRejectedValue(new Error('offline')); show(); fireEvent.click(screen.getByText('Review suggestions'));
    fireEvent.click(screen.getByLabelText('Low confidence'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Confidence remains Unknown');
    expect(api.get).toHaveBeenCalledWith('owner', 'saved-session');
    expect(screen.queryByText('Low confidence (your report)')).toBeNull();
    fireEvent.click(screen.getByLabelText('Flagged')); expect(screen.queryByRole('button', { name: 'PT 140 · S1 · P1 · Q1' })).toBeNull();
  });
  it('lets the learner choose a recorded-time threshold explicitly', async () => {
    show(); fireEvent.click(screen.getByText('Review suggestions')); fireEvent.click(screen.getByLabelText('Flagged'));
    fireEvent.change(screen.getByLabelText('Recorded question time threshold'), { target: { value: '60' } });
    await waitFor(() => expect(screen.getByText(/No questions match/)).toBeInTheDocument());
    expect(api.get).not.toHaveBeenCalled();
  });
});
