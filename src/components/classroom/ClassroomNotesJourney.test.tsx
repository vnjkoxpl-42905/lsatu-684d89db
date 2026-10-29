import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ items: [] as any[] }));
const intent = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useClassroomMotion', () => ({ notifyClassroomListIntent: intent }));
vi.mock('@/hooks/useClassroomItems', async () => {
  const { useQuery } = await import('@tanstack/react-query');
  return { useClassroomItems: () => useQuery({ queryKey: ['classroom-items', 'reader'], queryFn: async () => [...fixture.items], staleTime: Infinity }) };
});
vi.mock('@/lib/markNoteRead', () => ({ isReadInMetadata: (item: any) => item.status === 'completed' || !!item.metadata_json?.read_at }));
// The journey exercises routing and archive restoration. The real foreground,
// ownership and RPC failure rules have their own receipt-hook tests.
vi.mock('@/hooks/useStudentWorkState', async () => {
  const { useEffect } = await import('react');
  const { useQueryClient } = await import('@tanstack/react-query');
  return { useLoadedStudentWorkAcknowledgment: ({ sourceTable, sourceId, studentId, ready }: { sourceTable: string; sourceId?: string; studentId?: string; ready: boolean }) => {
    const client = useQueryClient();
    useEffect(() => {
      if (!ready || sourceTable !== 'classroom_items' || studentId !== 'reader') return;
      const item = fixture.items.find(row => row.id === sourceId && row.student_id === studentId);
      if (!item || item.metadata_json?.read_at) return;
      const updated = { ...item, metadata_json: { ...item.metadata_json, read_at: '2026-10-28T12:00:00Z' } };
      fixture.items = fixture.items.map(row => row.id === item.id ? updated : row);
      client.setQueryData<any[]>(['classroom-items', studentId], rows => rows?.map(row => row.id === item.id ? updated : row));
    }, [client, sourceTable, sourceId, studentId, ready]);
  } };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'reader' } }) }));
vi.mock('@/hooks/useStudentAssignments', () => ({ useStudentAssignments: () => ({ assignments: [] }), useStudentTAAssignments: () => ({ assignments: [] }), useStudentAssignment: vi.fn(), useStudentTAAssignment: vi.fn(), markTAAssignmentCompleted: vi.fn(), markTAAssignmentViewed: vi.fn() }));
vi.mock('@/hooks/useFlagged', () => ({ useFlagged: () => ({ data: [] }) }));
vi.mock('@/hooks/useAssignedTodoFeed', () => ({ useAssignedTodoFeed: () => ({ rows: [] }), routeWithReturnTo: (route: string) => route }));
vi.mock('@/lib/routePreload', () => ({ preloadDrillHub: vi.fn() }));
vi.mock('@/hooks/useExternalWorkUploads', () => ({ useStudentExternalUploads: vi.fn() }));
vi.mock('@/hooks/useHomeworkSets', () => ({ useHomeworkSet: vi.fn() }));
vi.mock('@/components/classroom/StructuredTAAssignmentWorkspace', () => ({ default: () => null }));
vi.mock('@/components/classroom/ClassroomMarkdown', () => ({ default: () => null }));
vi.mock('@/lib/drillLaunch', () => ({ launchDrill: vi.fn() }));
import { TeachingNotesArchive } from '../my-work/TeachingNotesArchive';
import { ClassroomItemView } from './ClassroomRouteViews';
import { ClassroomSectionList } from './shell/ClassroomLayout';
const archivePath = '/my-work/notes?q=Reference&filter=unread&type=note&shown=24';
function Journey() {
  const location = useLocation();
  const navigate = useNavigate();
  const id = /^\/classroom\/item\/(.+)/.exec(location.pathname)?.[1];
  return <><button onClick={() => navigate(-1)}>History Back</button><output aria-label="Journey location">{location.pathname}{location.search}</output>{id && <aside aria-label="Notes rail"><ClassroomSectionList section="notes" activeId={id} /></aside>}<Routes><Route path="/my-work/notes" element={<TeachingNotesArchive />} /><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /></Routes></>;
}
function show(path = archivePath) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['classroom-items', 'reader'], [...fixture.items]);
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Journey /></MemoryRouter></QueryClientProvider>);
}
async function expectOpened(id: string) {
  await waitFor(() => expect(fixture.items.find(item => item.id === id)).toMatchObject({
    student_id: 'reader', status: 'assigned', metadata_json: { read_at: '2026-10-28T12:00:00Z' },
  }));
}
beforeEach(() => {
  sessionStorage.clear(); intent.mockReset(); HTMLElement.prototype.scrollIntoView = vi.fn();
  fixture.items = ['a', 'b', 'c'].map((id, i) => ({ id, student_id: 'reader', type: i === 1 ? 'session_recap' : 'note', title: `Reference ${id}`, created_at: `2026-10-${25 - i}T12:00:00Z`, status: 'assigned', metadata_json: {}, content_html: '<p>Full note</p>' }));
});
it('returns archive A through real rail B to the nearest surviving filtered row, preserving return filters', async () => {
  show();
  fireEvent.click(screen.getByRole('link', { name: /^Read Reference a\./ }));
  await screen.findByRole('heading', { level: 1, name: 'Reference a' });
  await expectOpened('a');
  fireEvent.click(within(screen.getByRole('complementary', { name: 'Notes rail' })).getByRole('button', { name: /^Reference b/ }));
  await screen.findByRole('heading', { level: 1, name: 'Reference b' });
  await expectOpened('b');
  fireEvent.click(screen.getByRole('button', { name: 'Back to notes' }));
  await waitFor(() => expect(screen.getByRole('link', { name: /^Read Reference c\./ })).toHaveFocus());
  expect(screen.getByRole('status', { name: 'Journey location' })).toHaveTextContent(archivePath);
  expect(intent).toHaveBeenCalledWith(expect.any(HTMLElement), 'restore');
  expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
});
it('does not restore an unrelated stale archive anchor when a reader has no explicit origin', async () => {
  const key = `my-work-notes-anchor:reader:${archivePath}`;
  sessionStorage.setItem(key, JSON.stringify({ id: 'a', ids: ['a', 'c'], pointer: true }));
  show(`/classroom/item/b?${new URLSearchParams({ returnTo: archivePath })}`);
  fireEvent.click(await screen.findByRole('button', { name: 'Back to notes' }));
  await screen.findByRole('link', { name: /^Read Reference a\./ });
  expect(screen.getByRole('link', { name: /^Read Reference a\./ })).not.toHaveFocus();
  expect(intent).not.toHaveBeenCalledWith(expect.anything(), 'restore');
  expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
});

it('preserves archive origin through native history Back from B to A to archive', async () => {
  show();
  fireEvent.click(screen.getByRole('link', { name: /^Read Reference a\./ }));
  await screen.findByRole('heading', { level: 1, name: 'Reference a' });
  await expectOpened('a');
  fireEvent.click(within(screen.getByRole('complementary', { name: 'Notes rail' })).getByRole('button', { name: /^Reference b/ }));
  await screen.findByRole('heading', { level: 1, name: 'Reference b' });
  await expectOpened('b');
  fireEvent.click(screen.getByRole('button', { name: 'History Back' }));
  await screen.findByRole('heading', { level: 1, name: 'Reference a' });
  fireEvent.click(screen.getByRole('button', { name: 'History Back' }));
  await waitFor(() => expect(screen.getByRole('link', { name: /^Read Reference c\./ })).toHaveFocus());
  expect(screen.getByRole('status', { name: 'Journey location' })).toHaveTextContent(archivePath);
});

it('does not revive a same-id stale anchor from a reader opened without archive origin', async () => {
  const key = `my-work-notes-anchor:reader:${archivePath}`;
  sessionStorage.setItem(key, JSON.stringify({ id: 'a', ids: ['a', 'c'], pointer: true }));
  show(`/classroom/item/a?${new URLSearchParams({ returnTo: archivePath })}`);
  fireEvent.click(await screen.findByRole('button', { name: 'Back to notes' }));
  await screen.findByRole('link', { name: /^Read Reference c\./ });
  expect(screen.getByRole('link', { name: /^Read Reference c\./ })).not.toHaveFocus();
  expect(intent).not.toHaveBeenCalledWith(expect.anything(), 'restore');
  expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
});
