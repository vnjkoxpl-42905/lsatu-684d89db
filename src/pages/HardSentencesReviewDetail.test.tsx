import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { HS_DRILL_ITEMS } from '@/bootcamps/main-conclusion/content/hard-sentences-drill.source';
import { M5_CAPSTONE } from '@/bootcamps/main-conclusion/content/m5-capstone.source';
const { fetchOwnedHardSentencesAttempt, listEpisodes, openEpisode } = vi.hoisted(() => ({ fetchOwnedHardSentencesAttempt: vi.fn(), listEpisodes: vi.fn(), openEpisode: vi.fn() }));
vi.mock('@/lib/reviewEpisodes', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/reviewEpisodes')>(), createReviewEpisodeService: () => ({ list: listEpisodes, open: openEpisode }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student' } }) }));
vi.mock('@/components/review/hardSentencesReviewSource', () => ({ fetchOwnedHardSentencesAttempt }));
import HardSentencesReviewDetail from './HardSentencesReviewDetail';
function show() {
  render(<MemoryRouter initialEntries={['/review/hard-sentences/cluster/submission?returnTo=%2Freview%2Fto-review%3Fq%3Dcluster']}>
    <Routes><Route path="/review/hard-sentences/:sourceKind/:attemptKey" element={<HardSentencesReviewDetail />} /></Routes>
  </MemoryRouter>);
}
beforeEach(() => { fetchOwnedHardSentencesAttempt.mockReset(); listEpisodes.mockReset().mockResolvedValue({ episodes: [], events: [] }); openEpisode.mockReset().mockRejectedValue(new Error('save unavailable in this source-link test')); });
it('renders empty lift as saved selection and distinguishes submission from first/Blind Review', async () => {
  fetchOwnedHardSentencesAttempt.mockResolvedValue({ kind: 'cluster', key: 'submission', answer: '', at: '2026-09-30T12:00:00Z', item: HS_DRILL_ITEMS[0] });
  show();
  expect(await screen.findByText('No specifiers were lifted.')).toBeInTheDocument();
  expect(screen.getByText(/not a verified first answer or Blind Review/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to Review' })).toHaveAttribute('href', '/review/to-review?q=cluster');
  expect(fetchOwnedHardSentencesAttempt).toHaveBeenCalledWith('student', 'cluster', 'submission');
  fireEvent.click(await screen.findByRole('button', { name: 'Open review task' }));
  expect(openEpisode).toHaveBeenCalledWith({ actorId: 'student', studentId: 'student', source: 'intro_lr_attempts', sourceId: 'submission', reason: 'missed' });
  await screen.findByRole('alert');
});
it('shows exact current choice explanations for a saved capstone', async () => {
  fetchOwnedHardSentencesAttempt.mockResolvedValue({ kind: 'capstone', key: 'submission', answer: 'B', at: '2026-09-30T12:00:00Z', item: M5_CAPSTONE[0] });
  show();
  expect(await screen.findByRole('heading', { name: 'How to reason through it' })).toBeInTheDocument();
  expect(screen.getByText(M5_CAPSTONE[0].choices[0].rationale)).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Open review task' }));
  expect(openEpisode).toHaveBeenCalledWith({ actorId: 'student', studentId: 'student', source: 'hs_capstone', sourceId: 'submission', reason: 'missed' });
  await screen.findByRole('alert');
});
it('withholds authored answers for inaccessible attempts', async () => {
  fetchOwnedHardSentencesAttempt.mockResolvedValue(null); show();
  expect(await screen.findByText(/unavailable in your account/)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'How to reason through it' })).not.toBeInTheDocument();
  expect(listEpisodes).not.toHaveBeenCalled();
});
it('retries failed account reads', async () => {
  fetchOwnedHardSentencesAttempt.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(null); show();
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByText(/unavailable in your account/)).toBeInTheDocument();
  expect(fetchOwnedHardSentencesAttempt).toHaveBeenCalledTimes(2);
});
