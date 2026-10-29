import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
const { fetchOwnedNativeLabAttempt, listEpisodes, openEpisode } = vi.hoisted(() => ({ fetchOwnedNativeLabAttempt: vi.fn(), listEpisodes: vi.fn(), openEpisode: vi.fn() }));
vi.mock('@/lib/reviewEpisodes', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/reviewEpisodes')>(), createReviewEpisodeService: () => ({ list: listEpisodes, open: openEpisode }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student' } }) }));
vi.mock('@/components/review/nativeLabReviewSource', () => ({ fetchOwnedNativeLabAttempt }));
import NativeLabReviewDetail from './NativeLabReviewDetail';
beforeEach(() => { fetchOwnedNativeLabAttempt.mockReset(); listEpisodes.mockReset().mockResolvedValue({ episodes: [], events: [] }); openEpisode.mockReset(); });
function show() { render(<MemoryRouter initialEntries={['/review/native-lab/attempt']}><Routes><Route path="/review/native-lab/:attemptId" element={<NativeLabReviewDetail />} /></Routes></MemoryRouter>); }
it('shows saved first submission and current reasoning without claiming Blind Review', async () => {
  fetchOwnedNativeLabAttempt.mockResolvedValue({ ordinal: 1, answer: 'causal', kind: 'conclusion-type', row: { question_id: 'CT-Q01', created_at: '2026-09-30T12:00:00Z' }, question: { title: 'Conclusion Type Lab', stimulus: 'A clinic argument.', options: ['causal', 'recommendation'], explanation: 'It recommends an action.' } });
  show(); expect(await screen.findByRole('heading', { name: 'How to reason through it' })).toBeInTheDocument();
  expect(screen.getByText(/first submission for this question in this sitting/)).toHaveTextContent('do not record a separate Blind Review');
  expect(fetchOwnedNativeLabAttempt).toHaveBeenCalledWith('student', 'attempt');
  expect(await screen.findByRole('button', { name: 'Open review task' })).toBeInTheDocument();
  expect(listEpisodes).toHaveBeenCalledWith('student', 'student'); expect(openEpisode).not.toHaveBeenCalled();
});
it('withholds current explanations without an owned miss', async () => {
  fetchOwnedNativeLabAttempt.mockResolvedValue(null); show();
  expect(await screen.findByText(/unavailable in your account/)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'How to reason through it' })).not.toBeInTheDocument();
  expect(listEpisodes).not.toHaveBeenCalled();
});
it('shows an existing teacher-selected reason for the exact attempt without opening a student miss', async () => {
  fetchOwnedNativeLabAttempt.mockResolvedValue({ ordinal: 1, answer: 'causal', kind: 'conclusion-type', row: { question_id: 'CT-Q01', created_at: '2026-09-30T12:00:00Z' }, question: { title: 'Conclusion Type Lab', stimulus: 'A clinic argument.', options: ['causal', 'recommendation'], explanation: 'It recommends an action.' } });
  listEpisodes.mockResolvedValue({ episodes: [{ id: 'teacher-episode', student_id: 'student', actor_id: 'teacher', source_kind: 'intro_lr_attempts', source_id: 'attempt', reason: 'teacher_selected', selection_reason: 'Compare the conclusion and its support.' }], events: [] });
  show(); expect(await screen.findByText(/Teacher’s reason: Compare the conclusion/)).toBeInTheDocument();
  expect(openEpisode).not.toHaveBeenCalled(); expect(screen.queryByLabelText('Error diagnosis')).not.toBeInTheDocument();
});
