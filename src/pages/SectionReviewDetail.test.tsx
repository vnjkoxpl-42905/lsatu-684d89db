import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { adaptLrSections, type LrSectionSourceRow } from '@/lib/firstAnswerProgress';
import { resolveProgressReviewCapability } from '@/lib/progressReviewCapability';
import { UNANSWERED } from '@/lib/sectionAnswer';
import type { SectionHistoryRow } from '@/lib/sectionHistory';
import SectionReviewDetail from './SectionReviewDetail';

const state = vi.hoisted(() => ({ actor: 'owner', history: null as unknown, read: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: state.actor } }) }));
vi.mock('@/contexts/QuestionBankContext', () => ({ useQuestionBank: () => ({ isLoading: false, error: null }) }));
vi.mock('@/lib/questionLoader', () => ({ CANONICAL_QTYPES: { allTypes: ['Weaken'] }, questionBank: { getQuestion: () => null } }));
vi.mock('@/components/drill/shared/LrChoiceNote', () => ({ LrChoiceNote: () => null }));
vi.mock('@/lib/sectionHistory', () => ({ fetchOwnedSectionHistoryItem: (owner: string, historyId: string) => state.read(owner, historyId), sectionLabel: () => 'PT101.S2' }));
const qid = 'PT101-S2-Q1';
const question = { qid, qnum: 1, qtype: 'Weaken', initialAnswer: 'B', initialCorrect: false, correctAnswer: 'A', brAnswer: 'C' };
const raw = (overrides: Partial<LrSectionSourceRow> = {}): LrSectionSourceRow => ({ id: 'history', user_id: 'owner', mode: 'full-section', completed_at: '2026-10-28T12:00:00Z', practice_test_run_id: null, questions_json: [question], ...overrides });
const history = (overrides: Partial<SectionHistoryRow> = {}) => ({ id: 'history', mode: 'full-section', practiceTestRunId: null, completedAt: '2026-10-28T12:00:00Z', questions: [question], ...overrides }) as SectionHistoryRow;
const access = { actorId: 'owner', ownerId: 'owner', resolved: true, analytics: true };
function mount(href: string) {
  return render(<MemoryRouter initialEntries={[href]}><Routes><Route path="/review/section/:historyId/:qid" element={<SectionReviewDetail />} /></Routes></MemoryRouter>);
}
beforeEach(() => {
  cleanup(); state.actor = 'owner'; state.history = history();
  state.read.mockReset().mockImplementation(async (owner: string, id: string) => owner === 'owner' && id === 'history' ? state.history : null);
});

describe('Progress section evidence opens its actual owned detail destination', () => {
  it.each([true, false])('shows saved graded first-answer correctness=%s through the actual resolver URL', async (correct) => {
    const saved = { ...question, initialCorrect: correct };
    state.history = history({ questions: [saved] as never });
    const [answer] = adaptLrSections([raw({ questions_json: [saved] })], 'owner', new Set());
    const capability = resolveProgressReviewCapability(answer, access);
    expect(capability.status).toBe('available');
    if (capability.status !== 'available') throw new Error('Expected released section capability');
    mount(capability.href);
    await screen.findByRole('heading', { name: 'Saved section outcome' });
    expect(screen.getByText('Saved first answer', { exact: false })).toBeTruthy();
    expect(screen.getByText(correct ? 'Correct' : 'Missed', { exact: true })).toBeTruthy();
    expect(screen.getByText('First answer:', { exact: false }).textContent).toContain('B');
    expect(screen.getByText('Blind Review answer:', { exact: false }).textContent).toContain('C');
    expect(state.read).toHaveBeenCalledWith('owner', 'history');
  });
  it('preserves opened blank review without asserting an initial correctness verdict', async () => {
    state.history = history({ questions: [{ ...question, initialAnswer: UNANSWERED, everVisited: true }] as never });
    mount(`/review/section/history/${qid}`);
    await screen.findByRole('heading', { name: 'Saved section outcome' });
    expect(screen.getByText('First answer: none recorded.', { exact: false })).toBeTruthy();
    expect(screen.queryByText('Missed', { exact: true })).toBeNull();
  });
  it('does not emit or open an unvisited saved blank as graded Progress evidence', async () => {
    state.history = history({ questions: [{ ...question, qid: 'PT110-S2-Q1', initialAnswer: UNANSWERED, initialCorrect: false, everVisited: undefined }] as never });
    expect(adaptLrSections([raw({ questions_json: [{ ...question, qid: 'PT110-S2-Q1', initialAnswer: UNANSWERED, initialCorrect: false }] })], 'owner', new Set())).toEqual([]);
    mount('/review/section/history/PT110-S2-Q1');
    await screen.findByText('This completed section item is not available for review in your account.');
    expect(screen.queryByRole('heading', { name: 'Saved section outcome' })).toBeNull();
    expect(screen.queryByText('You opened this question', { exact: false })).toBeNull();
  });
  it.each([
    { mode: 'adaptive' }, { practiceTestRunId: 'pt' }, { completedAt: 'invalid' },
    { questions: [{ ...question, initialAnswer: UNANSWERED, everVisited: false, initialCorrect: undefined }] },
    { questions: [{ ...question, initialCorrect: undefined }] }, { questions: [] },
  ])('rejects unavailable or incompatible saved detail %j', async (overrides) => {
    state.history = history(overrides as Partial<SectionHistoryRow>);
    mount(`/review/section/history/${qid}`);
    await screen.findByText('This completed section item is not available for review in your account.');
    expect(screen.queryByRole('heading', { name: 'Saved section outcome' })).toBeNull();
  });
  it('does not adapt unowned, unfinished, ungraded or incompatible section rows into clickable evidence', () => {
    for (const row of [raw({ user_id: 'other' }), raw({ completed_at: null }), raw({ mode: 'adaptive' }), raw({ practice_test_run_id: 'unfinished' }), raw({ questions_json: [{ ...question, initialCorrect: null }] })]) {
      expect(adaptLrSections([row], 'owner', new Set())).toEqual([]);
    }
  });
  it('blocks another actor in the resolver and scopes crafted detail URLs to that actor', async () => {
    const [answer] = adaptLrSections([raw()], 'owner', new Set());
    expect(resolveProgressReviewCapability(answer, { ...access, actorId: 'other' }).status).toBe('unavailable');
    state.actor = 'other'; mount(`/review/section/history/${qid}`);
    await screen.findByText('This completed section item is not available for review in your account.');
    expect(state.read).toHaveBeenCalledWith('other', 'history');
    expect(screen.queryByRole('heading', { name: 'Saved section outcome' })).toBeNull();
  });
});
