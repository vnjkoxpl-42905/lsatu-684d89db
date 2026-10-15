import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HS_DRILL_ID, HS_DRILL_ITEMS } from '@/bootcamps/main-conclusion/content/hard-sentences-drill.source';
import { M5_CAPSTONE } from '@/bootcamps/main-conclusion/content/m5-capstone.source';
import type { ReviewEpisode, ReviewEpisodeEvent } from '@/lib/reviewEpisodes';
import type { FlaggedQuestionRow } from '@/lib/flaggedService';

const fixture = vi.hoisted(() => ({
  owner: 'student-a', classroomAccess: true, failedCluster: false, failedCapstone: false,
  clusters: {} as Record<string, unknown[]>, capstones: {} as Record<string, unknown[]>,
  reads: [] as { table: string; owner: string }[],
  pendingOwner: null as string | null,
  releases: [] as (() => void)[],
  episodeRecords: {} as Record<string, { episodes: ReviewEpisode[]; events: ReviewEpisodeEvent[] }>, episodeFailed: false,
  flags: [] as FlaggedQuestionRow[], flagAccess: false,
}));
vi.mock('@/lib/reviewEpisodes', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/reviewEpisodes')>(), createReviewEpisodeService: () => ({ list: async (_actor: string, student: string) => {
  if (fixture.episodeFailed) throw new Error('episode read failed'); return fixture.episodeRecords[student] ?? { episodes: [], events: [] };
} }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: fixture.owner } }) }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ loading: false, is_admin: false, has_classroom_access: fixture.classroomAccess, has_flagged_access: fixture.flagAccess }) }));
vi.mock('@/hooks/useFlagged', () => ({ useFlagged: () => ({ data: fixture.flags, isLoading: false, isError: false }) }));
vi.mock('@/hooks/useJournalEntries', () => ({ useJournalEntries: () => ({ data: [], isLoading: false, isError: false }) }));
vi.mock('@/components/review/rcReviewSource', () => ({ loadRcReviewQueue: async () => [] }));
vi.mock('@/components/review/ptReviewSource', () => ({ loadPracticeTestReviewQueue: async () => [] }));
vi.mock('@/components/review/nativeLabReviewSource', () => ({ loadNativeLabReview: async () => [] }));
vi.mock('@/components/review/introLrReviewSource', () => ({ loadIntroLrReviewQueue: async () => [] }));
vi.mock('@/lib/sectionHistory', () => ({ fetchSectionHistory: async () => [] }));
vi.mock('@/features/activity-centre/api/activitiesClient', () => ({ listAssignmentsForStudent: async () => [], listResponsesForAssignments: async () => [] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  let owner = '';
  const chain = {
    select: () => chain,
    eq: (key: string, value: string) => { if (key === 'user_id') owner = value; return chain; },
    order: () => chain,
    range: async () => {
      fixture.reads.push({ table, owner });
      if (fixture.pendingOwner === owner) await new Promise<void>(resolve => fixture.releases.push(resolve));
      const fail = table === 'intro_lr_attempts' ? fixture.failedCluster : fixture.failedCapstone;
      return fail ? { data: null, error: new Error('source read failed') }
        : { data: (table === 'intro_lr_attempts' ? fixture.clusters : fixture.capstones)[owner] ?? [], error: null };
    },
  };
  return chain;
} } }));
import ReviewQueuePage from './ReviewQueuePage';

function mount(path = '/review/to-review?reason=missed') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = () => <QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><ReviewQueuePage /></MemoryRouter></QueryClientProvider>;
  return { ...render(view()), view };
}
function seed(owner = 'student-a') {
  fixture.clusters[owner] = [{ id: `${owner}-cluster`, user_id: owner, drill_id: HS_DRILL_ID,
    question_id: HS_DRILL_ITEMS[0].id, mode: 'cluster_decomposition', correct: false,
    selected_answer: '', created_at: '2026-09-30T12:00:00Z' }];
  fixture.capstones[owner] = [{ record_id: `${owner}-envelope`, data: {
    id: 'different-legacy-payload-id', user_id: owner, calibration_only: true, calibration_module: 'M5',
    item_id: M5_CAPSTONE[0].id, picked: 'B', correct: false, attempted_at: '2026-09-30T12:01:00Z',
  } }];
}
beforeEach(() => {
  Object.assign(fixture, { owner: 'student-a', classroomAccess: true, failedCluster: false, failedCapstone: false,
    clusters: {}, capstones: {}, reads: [], pendingOwner: null, releases: [], episodeRecords: {}, episodeFailed: false, flags: [], flagAccess: false });
  seed();
});
afterEach(cleanup);

describe('Hard Sentences in the rendered Review queue', () => {
  it('shows an exact teacher-selected task with reason and removes only its completed episode', async () => {
    fixture.episodeRecords['student-a'] = { episodes: [{ id: 'teacher-task', student_id: 'student-a', actor_id: 'teacher', source_kind: 'hs_capstone', source_id: 'student-a-envelope', question_id: M5_CAPSTONE[0].id, reason: 'teacher_selected', selection_reason: 'Compare which details bear the weight.', created_at: '2026-09-30T13:00:00Z' }], events: [] };
    const view = mount('/review/to-review?reason=teacher_selected');
    const link = await screen.findByRole('link', { name: /Compare which details bear the weight/ });
    expect(link).toHaveAttribute('href', `/review/hard-sentences/capstone/student-a-envelope?episode=teacher-task&returnTo=${encodeURIComponent('/review/to-review?reason=teacher_selected&selected=review-episode%3Ateacher-task')}`);
    view.unmount();
    fixture.episodeRecords['student-a'].events = [{ id: 'done', episode_id: 'teacher-task', actor_id: 'student-a', kind: 'complete', payload: {}, created_at: '2026-09-30T14:00:00Z' }];
    mount('/review/to-review?reason=teacher_selected');
    await screen.findByText('0 items');
    expect(screen.queryByRole('link', { name: /Compare which details/ })).not.toBeInTheDocument();
  });
  it('reports failed saved episode reads and retains available saved source misses', async () => {
    fixture.episodeFailed = true; mount();
    await screen.findByRole('alert'); expect(screen.getByRole('alert')).toHaveTextContent('Saved review tasks');
    expect(screen.getByRole('link', { name: /Hard Sentences · Capstone/ })).toBeInTheDocument();
  });
  it('shows both saved misses with their exact source identity and current filter return link', async () => {
    mount('/review/to-review?reason=missed&q=Hard+Sentences');
    const capstone = await screen.findByRole('link', { name: /Hard Sentences · Capstone/ });
    const cluster = screen.getByRole('link', { name: /Hard Sentences · Cluster drill/ });
    const expectedReturn = '/review/to-review?reason=missed&q=Hard+Sentences&selected=';
    expect(capstone).toHaveAttribute('href', `/review/hard-sentences/capstone/student-a-envelope?returnTo=${encodeURIComponent(expectedReturn + 'hard-sentences%3Acapstone%3Astudent-a-envelope')}`);
    expect(cluster).toHaveAttribute('href', `/review/hard-sentences/cluster/student-a-cluster?returnTo=${encodeURIComponent(expectedReturn + 'hard-sentences%3Acluster%3Astudent-a-cluster')}`);
    expect(capstone).toHaveTextContent('Hard Sentences saved submission');
    expect(cluster).toHaveTextContent('Missed answer');
    expect(await screen.findByText('2 items')).toBeInTheDocument();
  });
  it('does not label a saved submission as a verified first answer in the detailed table', async () => {
    mount('/review/to-review?view=table&reason=missed');
    const link = await screen.findByRole('link', { name: /Hard Sentences · Capstone/ });
    const row = link.closest('tr')!;
    expect(within(row).getByText('Not recorded')).toBeInTheDocument();
    expect(within(row).getByText('B')).toBeInTheDocument();
    expect(within(row).getByText('Hard Sentences saved submission')).toBeInTheDocument();
  });
  it.each([
    ['failedCluster', 'Hard Sentences cluster attempts', /Hard Sentences · Capstone/],
    ['failedCapstone', 'Hard Sentences capstone attempts', /Hard Sentences · Cluster drill/],
  ] as const)('retains the available family when %s fails, and restores both on retry', async (failure, warning, retained) => {
    fixture[failure] = true;
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent(warning);
    expect(screen.getByRole('link', { name: retained })).toBeInTheDocument();
    expect(screen.getByText('1 item')).toBeInTheDocument();
    fixture[failure] = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Hard Sentences · Capstone/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Hard Sentences · Cluster drill/ })).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
  });
  it('does not reuse the previous account’s misses while the next owner loads', async () => {
    const mounted = mount();
    expect(await screen.findByRole('link', { name: /Hard Sentences · Capstone/ })).toHaveAttribute('href', expect.stringContaining('student-a-envelope'));
    fixture.owner = 'student-b';
    fixture.pendingOwner = 'student-b';
    seed('student-b');
    mounted.rerender(mounted.view());
    expect(screen.queryByRole('link', { name: /Hard Sentences · Capstone/ })).not.toBeInTheDocument();
    expect(screen.getByText('Loading saved work…')).toBeInTheDocument();
    await waitFor(() => expect(fixture.releases).toHaveLength(2));
    await act(async () => { fixture.releases.forEach(release => release()); });
    expect(await screen.findByRole('link', { name: /Hard Sentences · Capstone/ })).toHaveAttribute('href', expect.stringContaining('student-b-envelope'));
    expect(screen.queryByRole('link', { name: /student-a/ })).not.toBeInTheDocument();
    expect(fixture.reads.filter(read => read.owner === 'student-b')).toHaveLength(2);
  });
  it('does not read or show assigned-work misses with Classroom and practice off', async () => {
    fixture.classroomAccess = false;
    mount();
    expect(await screen.findByText('No saved work here yet')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Hard Sentences ·/ })).not.toBeInTheDocument();
    expect(fixture.reads).toHaveLength(0);
  });
  it('distinguishes failed source coverage from a verified empty Review queue', async () => {
    fixture.failedCluster = true;
    fixture.failedCapstone = true;
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Hard Sentences cluster attempts, Hard Sentences capstone attempts');
    expect(screen.getByText('The full review queue is unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No saved work here yet')).not.toBeInTheDocument();
  });
  it('does not claim an empty queue when a saved task has no supported source', async () => {
    fixture.clusters['student-a'] = [];
    fixture.capstones['student-a'] = [];
    fixture.episodeRecords['student-a'] = { episodes: [{ id: 'unsupported-task', student_id: 'student-a', actor_id: 'teacher', source_kind: 'hs_capstone', source_id: 'missing-submission', question_id: M5_CAPSTONE[0].id, reason: 'teacher_selected', selection_reason: 'Review this answer.', created_at: '2026-09-30T13:00:00Z' }], events: [] };
    mount();
    expect(await screen.findByText('The full review queue is unavailable')).toBeInTheDocument();
    expect(screen.getByText(/1 saved review task has an unavailable or unsupported source/)).toBeInTheDocument();
    expect(screen.queryByText('No saved work here yet')).not.toBeInTheDocument();
  });
  it('keeps source, area, table and last-opened identity in the detail return route', async () => {
    mount('/review/to-review?reason=missed&source=hard_sentences&area=lr&view=table&show=60&selected=hard-sentences%3Acapstone%3Astudent-a-envelope');
    const link = await screen.findByRole('link', { name: /Hard Sentences · Capstone/ });
    expect(link).toHaveAttribute('aria-current', 'true');
    expect(within(link.closest('tr')!).getByText('Last opened')).toBeInTheDocument();
    const target = new URL(link.getAttribute('href')!, 'https://example.test').searchParams.get('returnTo')!;
    const retained = new URL(target, 'https://example.test').searchParams;
    expect(Object.fromEntries(retained)).toMatchObject({ source: 'hard_sentences', area: 'lr', view: 'table', show: '60', selected: 'hard-sentences:capstone:student-a-envelope' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Review area' }), { target: { value: 'rc' } });
    expect(await screen.findByText('No items match these filters')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Review area' }), { target: { value: 'lr' } });
    expect(await screen.findByRole('link', { name: /Hard Sentences · Capstone/ })).not.toHaveAttribute('aria-current');
    const changed = new URL(screen.getByRole('link', { name: /Hard Sentences · Capstone/ }).getAttribute('href')!, 'https://example.test').searchParams.get('returnTo')!;
    expect(new URL(changed, 'https://example.test').searchParams.has('show')).toBe(false);
  });
  it('searches saved flag notes and filters multi-source work without relabeling it', async () => {
    fixture.flagAccess = true;
    fixture.flags = [{ qid: 'PT101.S2.Q1', pt: 101, section: 2, qnum: 1, note: 'Check the quantifier shift', flagged_at: '2026-10-02T12:00:00Z', qtype: 'Flaw' } as FlaggedQuestionRow];
    mount('/review/to-review?source=flagged_questions&q=quantifier');
    const link = await screen.findByRole('link', { name: /Check the quantifier shift/ });
    expect(link).toHaveAttribute('href', expect.stringContaining('/flagged/PT101.S2.Q1'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Review source' }), { target: { value: 'hard_sentences' } });
    expect(await screen.findByText('No items match these filters')).toBeInTheDocument();
  });
});
