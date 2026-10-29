import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const fixture = vi.hoisted(() => ({ actor: 'teacher', student: 'student', load: vi.fn(), save: vi.fn() }));
vi.mock('@/hooks/useStudentSubjectScope', () => ({ useStudentSubjectScope: () => ({ state: 'ready', scope: { mode: 'selected_student', actorId: fixture.actor, studentId: fixture.student } }) }));
vi.mock('@/lib/scopedReviewEpisodes', () => ({ loadScopedReviewSelections: fixture.load, selectScopedReview: fixture.save, boundedReviewBinding: () => ({ source: 'intro_lr_attempts', sourceId: 'attempt' }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import TeacherReviewSelections from './TeacherReviewSelections';
import { StudentIdentityUnavailableError } from '@/lib/studentAccountScope';
const source = { key: 'source', label: 'Conclusion Type Lab · saved miss', href: '/review/native-lab/attempt', qid: 'Q1' };
beforeEach(() => { fixture.actor = 'teacher'; fixture.student = 'student'; fixture.load.mockReset().mockResolvedValue({ items: [source], episodes: [], events: [], unavailable: [], canSelect: true }); fixture.save.mockReset(); });
function show() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); const view = () => <QueryClientProvider client={client}><TeacherReviewSelections studentId={fixture.student} /></QueryClientProvider>; return { ...render(view()), view }; }
it('requires a teacher reason, retains it on failure and retries the same actor/subject/source', async () => {
  fixture.save.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ id: 'saved' }); show();
  fireEvent.click(await screen.findByRole('button', { name: 'Choose this submission' }));
  expect(screen.getByRole('button', { name: 'Save teacher selection' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Reason for the student'), { target: { value: 'Compare the claim with its support.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save teacher selection' }));
  await screen.findByRole('alert'); expect(screen.queryByText(/saved in the student's account/)).not.toBeInTheDocument();
  expect(screen.getByLabelText('Reason for the student')).toHaveValue('Compare the claim with its support.');
  fireEvent.click(screen.getByRole('button', { name: 'Retry teacher selection' }));
  await screen.findByText(/saved in the student's account/);
  expect(fixture.save.mock.calls[0]).toEqual(fixture.save.mock.calls[1]);
  expect(fixture.save.mock.calls[0][0]).toEqual({ mode: 'selected_student', actorId: 'teacher', studentId: 'student' });
});
it('withholds controls when review episode records fail to load', async () => {
  fixture.load.mockResolvedValue({ items: [source], episodes: [], events: [], unavailable: ['Saved review episodes'], canSelect: false }); show();
  expect(await screen.findByRole('button', { name: 'Choose this submission' })).toBeDisabled(); expect(screen.getByRole('alert')).toHaveTextContent('Saved review episodes');
});
it('discloses conflicting canonical identity without claiming zero saved misses', async () => {
  fixture.load.mockRejectedValue(new StudentIdentityUnavailableError('Canonical account identity conflicts. Account records are unavailable.'));
  show(); expect(await screen.findByRole('alert')).toHaveTextContent('Canonical account identity conflicts');
  expect(screen.queryByText('No supported saved misses are available.')).not.toBeInTheDocument(); expect(fixture.save).not.toHaveBeenCalled();
});
it('recovers a conflicting earlier teacher selection by reading its reason without overwriting it', async () => {
  fixture.save.mockRejectedValue(new Error('existing selection has different reason'));
  const earlier = { id: 'earlier', actor_id: 'teacher', student_id: 'student', source_kind: 'intro_lr_attempts', source_id: 'attempt', reason: 'teacher_selected', selection_reason: 'Earlier reason from another tab.' };
  fixture.load.mockResolvedValueOnce({ items: [source], episodes: [], events: [], unavailable: [], canSelect: true }).mockResolvedValue({ items: [source], episodes: [earlier], events: [], unavailable: [], canSelect: true });
  show(); fireEvent.click(await screen.findByRole('button', { name: 'Choose this submission' }));
  fireEvent.change(screen.getByLabelText('Reason for the student'), { target: { value: 'New conflicting reason.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save teacher selection' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Close editor and reload selections' }));
  await screen.findByText(/Your saved reason: Earlier reason from another tab/);
  expect(fixture.save).toHaveBeenCalledTimes(1); expect(screen.queryByLabelText('Reason for the student')).not.toBeInTheDocument();
});
it('keeps an earlier account response from confirming work in the newly selected student view', async () => {
  let resolve: (value: unknown) => void = () => {}; fixture.save.mockImplementation(() => new Promise(done => { resolve = done; }));
  const view = show(); fireEvent.click(await screen.findByRole('button', { name: 'Choose this submission' }));
  fireEvent.change(screen.getByLabelText('Reason for the student'), { target: { value: 'Private reason for first student.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save teacher selection' }));
  fixture.actor = 'new-admin'; fixture.student = 'other-student'; view.rerender(view.view());
  await screen.findByRole('button', { name: 'Choose this submission' });
  await act(async () => { resolve({ id: 'old-save' }); });
  expect(screen.queryByDisplayValue('Private reason for first student.')).not.toBeInTheDocument();
  expect(screen.queryByText(/saved in the student's account/)).not.toBeInTheDocument();
  await waitFor(() => expect(fixture.load).toHaveBeenLastCalledWith({ mode: 'selected_student', actorId: 'new-admin', studentId: 'other-student' }));
});
