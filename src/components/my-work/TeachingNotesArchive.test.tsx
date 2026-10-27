import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { TeachingNotesArchive } from './TeachingNotesArchive';

const state = vi.hoisted(() => ({ data: [] as ClassroomItem[], error: null as Error | null, loading: false, refetch: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student-a' } }) }));
vi.mock('@/hooks/useClassroomItems', () => ({ useClassroomItems: () => ({ data: state.data, isLoading: state.loading, error: state.error, refetch: state.refetch }) }));
function Location() { return <output aria-label="Location">{useLocation().search}</output>; }
function show(path = '/my-work/notes') { return render(<MemoryRouter initialEntries={[path]}><TeachingNotesArchive /><Location /></MemoryRouter>); }
function note(index: number): ClassroomItem {
  return { id: `note-${index}`, title: `Reference ${index}`, type: 'note', created_at: `2026-10-${String(26 - index).padStart(2, '0')}T12:00:00Z`, content_html: `<p>${index === 14 ? 'Complete conditions on older page' : 'A useful explanation.'}</p>`, metadata_json: {}, status: 'assigned' } as ClassroomItem;
}
describe('TeachingNotesArchive', () => {
  beforeEach(() => { state.data = Array.from({ length: 15 }, (_, index) => note(index)); state.error = null; state.loading = false; state.refetch.mockReset(); sessionStorage.clear(); });
  it('makes read archive notes visible and opens the current detail route with return state', () => {
    state.data[1].metadata_json = { read_at: '2026-10-26' };
    show('/my-work/notes?q=Reference&shown=24');
    expect(screen.getByRole('heading', { name: 'Browse your notes' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Reference 1 Oct/ });
    expect(link).toHaveAttribute('href', '/classroom/item/note-1?returnTo=%2Fmy-work%2Fnotes%3Fq%3DReference%26shown%3D24');
    expect(screen.queryByRole('link', { name: /Assigned work/ })).not.toBeInTheDocument();
  });
  it('searches body text beyond the initial twelve and preserves query in the URL', () => {
    show();
    expect(screen.queryByText('Reference 14')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Complete conditions' } });
    expect(screen.getByText('Reference 14')).toBeInTheDocument();
    expect(screen.getByLabelText('Location')).toHaveTextContent('q=Complete+conditions');
    expect(screen.getByText('1 note found')).toHaveAttribute('role', 'status');
  });
  it('loads the next group and stores a user-scoped return anchor', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: /Load more notes/ }));
    expect(screen.getByText('Reference 14')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Reference 14/ }));
    const entry = sessionStorage.getItem('my-work-notes-anchor:student-a:/my-work/notes?shown=24');
    expect(JSON.parse(entry!)).toMatchObject({ id: 'note-14' });
  });
  it('shows a retryable failure instead of empty notes or misleading totals', () => {
    state.error = new Error('Network');
    show();
    expect(screen.getByRole('alert')).toHaveTextContent('complete archive');
    expect(screen.queryByText('All notes')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Assigned work/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Personal notes' })).toHaveAttribute('href', '/my-work/notes?view=mine');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(state.refetch).toHaveBeenCalledOnce();
  });
  it('shows each note once and gives only the unfiltered newest row lead emphasis', () => {
    show();
    expect(screen.getAllByText('Reference 0')).toHaveLength(1);
    expect(screen.getByText('Reference 0').closest('a')).toHaveClass('teaching-note-lead');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Reference 14' } });
    expect(screen.queryByText('Reference 0')).not.toBeInTheDocument();
    expect(screen.getByText('Reference 14').closest('a')).not.toHaveClass('teaching-note-lead');
  });
  it('does not show a read newest note above unread results', () => {
    state.data[0].metadata_json = { read_at: '2026-10-26' };
    show('/my-work/notes?filter=unread');
    expect(screen.queryByText('Reference 0')).not.toBeInTheDocument();
    expect(document.querySelector('.teaching-note-lead')).toBeNull();
  });
  it('shows one empty explanation and retains personal access without empty filters', () => {
    state.data = [];
    show();
    expect(screen.getByRole('heading', { name: 'Your notes will live here.' })).toBeInTheDocument();
    expect(screen.queryByText('Your archive is ready for your first note.')).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Personal notes' })).toBeInTheDocument();
  });
  it('keeps personal access while loading and omits misleading controls', () => {
    state.loading = true;
    state.data = undefined as unknown as ClassroomItem[];
    show();
    expect(screen.getByText('Loading your notes…')).toHaveAttribute('role', 'status');
    expect(screen.getByRole('link', { name: 'Personal notes' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('stores the lead identity on detail navigation and restores its focus on return', () => {
    render(<MemoryRouter initialEntries={['/my-work/notes']}><Routes>
      <Route path="/my-work/notes" element={<TeachingNotesArchive />} />
      <Route path="/classroom/item/:id" element={<Link to="/my-work/notes">Back to notes</Link>} />
    </Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('link', { name: /Reference 0/ }));
    expect(JSON.parse(sessionStorage.getItem('my-work-notes-anchor:student-a:/my-work/notes')!)).toMatchObject({ id: 'note-0' });
    fireEvent.click(screen.getByRole('link', { name: 'Back to notes' }));
    expect(screen.getByRole('link', { name: /Reference 0/ })).toHaveFocus();
  });

});
