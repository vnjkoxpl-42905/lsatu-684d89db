import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: 'student-1' as string | null, ready: true, classroom: false, admin: false,
  grantOwner: 'student-1', active: true, fail: false, rpc: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user ? { id: state.user } : null, authReady: state.ready }) }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ loading: false, is_admin: state.admin, has_classroom_access: state.classroom }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: state.rpc } }));
vi.mock('@/hooks/useAssignedTodoFeed', () => ({
  useAssignedTodoFeed: () => ({ loading: false, failed: false, retry: vi.fn(), rows: [
    { key: 'rc', sourceTable: 'reading_center', refId: 'library', title: 'Reading Center', subtitle: 'Five reading modes', route: '/reading-center', status: 'in_progress' },
    { key: 'other', sourceTable: 'homework_assignments', refId: 'homework', title: 'Other coursework', route: '/classroom/homework', status: 'assigned' },
    { key: 'invalid', sourceTable: 'reading_center', refId: 'wrong-source', title: 'Wrong source', route: '/activities/wrong-source', status: 'assigned' },
  ] }), routeWithReturnTo: (route: string) => route,
}));
vi.mock('@/components/classroom/PrescribedWeek', () => ({ default: () => <div>Weekly plan</div> }));
import MyWorkGate from '@/components/MyWorkGate';
import ProtectedRoute from '@/components/ProtectedRoute';
import { StudentDestination } from './StudentDestination';
import MyWorkPage from './MyWorkPage';

function open() {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={cache}><MemoryRouter initialEntries={['/my-work/to-do']}><Routes>
    <Route path="/my-work" element={<StudentDestination destination="my-work" />}>
      <Route path="to-do" element={<MyWorkGate><MyWorkPage completed={false} /></MyWorkGate>} />
      <Route path="notes" element={<ProtectedRoute flag="has_classroom_access"><div>Private course notes</div></ProtectedRoute>} />
    </Route>
    <Route path="/auth" element={<div>Sign in</div>} />
  </Routes></MemoryRouter></QueryClientProvider>);
  return { ...view, cache };
}
beforeEach(() => {
  state.user = 'student-1'; state.ready = true; state.classroom = false; state.admin = false;
  state.grantOwner = 'student-1'; state.active = true; state.fail = false;
  state.rpc.mockReset().mockImplementation(async () => ({ data: state.active && state.user === state.grantOwner, error: state.fail ? new Error('offline') : null }));
});

describe('My Work with a specific Reading Center grant', () => {
  it('shows only the assigned tool without broad Classroom access or weekly plans', async () => {
    open(); expect(await screen.findByRole('link', { name: /Reading Center Five reading modes In progress/ })).toHaveAttribute('href', '/reading-center');
    expect(screen.queryByText('Other coursework')).toBeNull(); expect(screen.queryByText('Weekly plan')).toBeNull();
    expect(screen.queryByText('Wrong source')).toBeNull();
    expect(screen.getByText('1 to do')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'To do' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Completed' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Notes & recaps' })).toBeNull();
  });
  it('removes the assignment list when its grant is revoked or scheduled', async () => {
    const view = open(); expect(await screen.findByText('Reading Center')).toBeTruthy();
    state.active = false;
    await act(async () => { await view.cache.invalidateQueries({ queryKey: ['reading-center-access'] }); });
    await waitFor(() => expect(screen.queryByText('Reading Center')).toBeNull());
    expect(screen.getByText('Not open yet')).toBeTruthy();
  });
  it('does not grant access for a different student', async () => {
    state.user = 'other-student'; open(); expect(await screen.findByText('Not open yet')).toBeTruthy();
    expect(screen.queryByText('Reading Center')).toBeNull();
  });
  it('retains ordinary coursework but excludes stale RC rows for a broadly entitled unassigned student', async () => {
    state.classroom = true; state.active = false; open();
    expect(await screen.findByText('Other coursework')).toBeTruthy(); expect(screen.getByText('Weekly plan')).toBeTruthy();
    expect(screen.queryByText('Reading Center')).toBeNull(); expect(screen.queryByText('Wrong source')).toBeNull();
  });
  it('holds the assignment list while the grant is unknown', () => {
    state.rpc.mockImplementation(() => new Promise(() => {})); open();
    expect(screen.queryByText('Reading Center')).toBeNull(); expect(screen.queryByText('Other coursework')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Checking assigned work access…');
  });
  it('fails closed if the grant cannot be verified', async () => {
    state.fail = true; open(); expect(await screen.findByRole('alert')).toHaveTextContent('could not verify access');
    expect(screen.queryByText('Reading Center')).toBeNull();
  });
  it('redirects a signed-out account before any coursework renders', async () => {
    state.user = null; open(); expect(await screen.findByText('Sign in')).toBeTruthy();
    expect(screen.queryByText('Reading Center')).toBeNull(); expect(screen.queryByText('Other coursework')).toBeNull();
  });
});
