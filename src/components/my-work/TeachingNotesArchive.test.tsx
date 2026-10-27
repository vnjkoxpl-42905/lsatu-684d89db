import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { TeachingNotesArchive } from './TeachingNotesArchive';

const state = vi.hoisted(() => ({ data: [] as ClassroomItem[], error: null as Error | null, loading: false, refetch: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student-a' } }) }));
vi.mock('@/hooks/useClassroomItems', () => ({ useClassroomItems: () => ({ data: state.data, isLoading: state.loading, error: state.error, refetch: state.refetch }) }));
function openTypes() {
  const trigger = screen.getByRole('combobox', { name: 'Type' });
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  return trigger;
}
async function chooseType(label: string) {
  openTypes();
  const option = await screen.findByRole('option', { name: label });
  fireEvent.keyDown(option, { key: 'Enter' });
}
function Location() { return <output aria-label="Location">{useLocation().search}</output>; }
function show(path = '/my-work/notes') { return render(<MemoryRouter initialEntries={[path]}><TeachingNotesArchive /><Location /></MemoryRouter>); }
function note(index: number): ClassroomItem {
  return { id: `note-${index}`, title: `Reference ${index}`, type: 'note', created_at: `2026-10-${String(26 - index).padStart(2, '0')}T12:00:00Z`, content_html: `<p>${index === 14 ? 'Complete conditions on older page' : 'A useful explanation.'}</p>`, metadata_json: {}, status: 'assigned' } as ClassroomItem;
}
describe('TeachingNotesArchive', () => {
  beforeEach(() => {
    HTMLElement.prototype.hasPointerCapture = () => false;
    HTMLElement.prototype.setPointerCapture = () => undefined;
    HTMLElement.prototype.releasePointerCapture = () => undefined;
    HTMLElement.prototype.scrollIntoView = () => undefined;
    state.data = Array.from({ length: 15 }, (_, index) => note(index)); state.error = null; state.loading = false; state.refetch.mockReset(); sessionStorage.clear(); });
  it('makes read archive notes visible and opens the current detail route with return state', () => {
    state.data[1].metadata_json = { read_at: '2026-10-26' };
    show('/my-work/notes?q=Reference&shown=24');
    expect(screen.getByRole('heading', { name: 'Teaching notes' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Read Reference 1\./ });
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

  it('combines exact type with unread and search while preserving type on detail links', async () => {
    state.data[0].type = 'session_recap';
    state.data[1].type = 'announcement';
    show('/my-work/notes?filter=unread&shown=24');
    await chooseType('Session recaps');
    expect(screen.getByLabelText('Location')).toHaveTextContent('filter=unread&type=session_recap');
    expect(screen.getByLabelText('Location')).not.toHaveTextContent('shown=');
    expect(screen.getByText('1 note found')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Read Reference 0/ });
    expect(link).toHaveAttribute('href', '/classroom/item/note-0?returnTo=%2Fmy-work%2Fnotes%3Ffilter%3Dunread%26type%3Dsession_recap');
    expect(link.getAttribute('aria-label')).not.toContain('A useful explanation');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'absent' } });
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent('Session recaps');
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByLabelText('Location').textContent).toBe('');
  });
  it('keeps a valid absent type selectable so its empty result can recover', async () => {
    show('/my-work/notes?type=smartboard_recap');
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent('Whiteboard recaps');
    expect(screen.getByText('No notes match these filters.')).toBeInTheDocument();
    await chooseType('All types');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('Reference 0')).toBeInTheDocument();
  });
  it('uses one teaching heading and groups a small archive when months differ', () => {
    state.data = [note(0), { ...note(1), created_at: '2026-09-20T12:00:00Z' }];
    show();
    expect(screen.getAllByRole('heading', { name: 'Teaching notes' })).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Browse your notes' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('presents an excerpt without one repeated leading title while searching the full body', () => {
    state.data = [{ ...note(0), title: 'The complete condition', content_html: '<h2>The complete condition</h2><p>Keep the trigger and result.</p><p>Body search marker</p>' }];
    show();
    const excerpt = document.querySelector('.teaching-note-excerpt');
    expect(excerpt).toHaveTextContent('Keep the trigger and result. Body search marker');
    expect(excerpt).not.toHaveTextContent('The complete condition');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Body search marker' } });
    expect(screen.getByText('1 note found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Read The complete condition/ })).toBeInTheDocument();
  });
  it('prefers the authored description in the excerpt without losing hidden body search', () => {
    state.data = [{ ...note(0), description: 'A short authored preview.', content_html: '<p>Hidden full body search marker</p>' }];
    show();
    expect(document.querySelector('.teaching-note-excerpt')).toHaveTextContent('A short authored preview.');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Hidden full body' } });
    expect(screen.getByText('1 note found')).toBeInTheDocument();
  });

  it('makes read-state counts predict results within the selected type and search', async () => {
    state.data = [
      { ...note(0), type: 'session_recap' },
      { ...note(1), type: 'session_recap', metadata_json: { read_at: '2026-10-26' } },
      { ...note(2), type: 'note' },
    ];
    show('/my-work/notes?type=session_recap&filter=unread');
    expect(screen.getByRole('button', { name: 'All' })).toHaveTextContent('All 2');
    expect(screen.getByRole('button', { name: 'Unread' })).toHaveTextContent('Unread 1');
    expect(screen.getByText('1 note found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('2 notes found')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Reference 1' } });
    expect(screen.getByRole('button', { name: 'All' })).toHaveTextContent('All 1');
    expect(screen.getByRole('button', { name: 'Unread' })).toHaveTextContent('Unread 0');
    openTypes();
    expect(await screen.findByRole('option', { name: 'Notes' })).toBeInTheDocument();
  });

  it('uses a labelled keyboard-operated portal without changing filters on open', async () => {
    state.data[0].type = 'session_recap';
    show('/my-work/notes?q=Reference&filter=unread&shown=24');
    openTypes();
    const menu = await screen.findByRole('listbox');
    expect(menu).toHaveClass('notes-select-content');
    expect(menu).toHaveAttribute('data-input-modality', 'keyboard');
    expect(document.querySelector('.teaching-notes-home')?.contains(menu)).toBe(false);
    expect(screen.getByLabelText('Location')).toHaveTextContent('q=Reference&filter=unread&shown=24');
    fireEvent.keyDown(screen.getByRole('option', { name: 'All types' }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('returns keyboard focus to search when choosing All types removes the selector', async () => {
    show('/my-work/notes?type=smartboard_recap');
    await chooseType('All types');
    await waitFor(() => expect(screen.queryByRole('combobox', { name: 'Type' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('searchbox', { name: 'Search notes' })).toHaveFocus());
  });

});
