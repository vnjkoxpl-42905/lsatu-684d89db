import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
const state = vi.hoisted(() => ({ user: 'student-1' as string | null, ready: true, allowed: false, fail: false, admin: false, permissionsLoading: false, rpc: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user ? { id: state.user } : null, authReady: state.ready }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: state.rpc } }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ loading: state.permissionsLoading, is_admin: state.admin }) }));
import AssignedReadingCenterLink from './AssignedReadingCenterLink';

function Menu({ cache }: { cache: QueryClient }) {
  return <QueryClientProvider client={cache}><MemoryRouter initialEntries={['/classroom']}><Routes>
    <Route path="/classroom" element={<nav aria-label="Quick access"><AssignedReadingCenterLink /></nav>} />
    <Route path="/reading-center" element={<div>Assigned tool opened</div>} />
  </Routes></MemoryRouter></QueryClientProvider>;
}
function open(cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return { ...render(<Menu cache={cache} />), cache };
}
beforeEach(() => {
  state.user = 'student-1'; state.ready = true; state.allowed = false; state.fail = false;
  state.admin = false; state.permissionsLoading = false;
  state.rpc.mockReset().mockImplementation(async () => ({ data: state.allowed, error: state.fail ? new Error('offline') : null }));
});
describe('assignment-only persistent Reading Center launcher', () => {
  it('keeps the student launcher out of the admin sidebar even though admin can preview', () => {
    state.admin = true; state.allowed = true; open();
    expect(screen.queryByRole('button', { name: 'Reading Center' })).toBeNull();
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it('shows no launcher while the current account role is unknown', () => {
    state.permissionsLoading = true; state.allowed = true; open();
    expect(screen.queryByRole('button', { name: 'Reading Center' })).toBeNull();
  });
  it('shows and opens the assigned tool without needing any broad permission flags', async () => {
    state.allowed = true; open();
    fireEvent.click(await screen.findByRole('button', { name: 'Reading Center' }));
    expect(await screen.findByText('Assigned tool opened')).toBeTruthy();
  });
  it('hides the launcher when unassigned, scheduled or revoked', async () => {
    const view = open(); await waitFor(() => expect(state.rpc).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Reading Center' })).toBeNull();
    state.allowed = true; await view.cache.invalidateQueries({ queryKey: ['reading-center-access'] });
    expect(await screen.findByRole('button', { name: 'Reading Center' })).toBeTruthy();
    state.allowed = false; await view.cache.invalidateQueries({ queryKey: ['reading-center-access'] });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Reading Center' })).toBeNull());
  });
  it('does not display cached entitlement before authentication resolves or when signed out', () => {
    const cache = new QueryClient(); cache.setQueryData(['reading-center-access', 'student-1'], true);
    state.ready = false; const view = open(cache);
    expect(screen.queryByRole('button', { name: 'Reading Center' })).toBeNull(); expect(state.rpc).not.toHaveBeenCalled();
    state.ready = true; state.user = null; view.rerender(<Menu cache={cache} />);
    expect(screen.queryByRole('button', { name: 'Reading Center' })).toBeNull();
  });
  it('holds the launcher while the grant is unknown', () => {
    state.rpc.mockImplementation(() => new Promise(() => {})); open();
    expect(screen.queryByRole('button', { name: 'Reading Center' })).toBeNull();
  });
  it('hides a previously verified link if access revalidation fails', async () => {
    state.allowed = true; const view = open(); expect(await screen.findByRole('button', { name: 'Reading Center' })).toBeTruthy();
    state.fail = true; await view.cache.invalidateQueries({ queryKey: ['reading-center-access'] });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Reading Center' })).toBeNull());
  });
  it('never uses a different signed-in student’s cached grant', async () => {
    state.allowed = true; const view = open(); expect(await screen.findByRole('button', { name: 'Reading Center' })).toBeTruthy();
    state.user = 'other-student'; state.allowed = false; view.rerender(<Menu cache={view.cache} />);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Reading Center' })).toBeNull());
  });
});
