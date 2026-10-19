import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
const state = vi.hoisted(() => ({ allowed: false, classroom: false, loading: false, rpc: vi.fn() }));
vi.mock('@/components/classroom/OrientationCard', () => ({
  useOrientation: () => ({ loaded: true, completed: true }), OrientationCardView: () => <div>Intake</div>,
}));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ loading: state.loading, is_admin: false, has_classroom_access: state.classroom }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student-1' }, authReady: true }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: state.rpc } }));
vi.mock('@/components/classroom/home/ClassroomHome', () => ({ default: () => <div>Broad classroom dashboard</div> }));
vi.mock('@/components/classroom/AnnouncementBanner', () => ({ default: () => <div>Course announcement</div> }));
vi.mock('@/components/LockedModule', () => ({ default: () => <div>Classroom locked</div> }));
import Classroom from './Classroom';
function open() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><Classroom /></MemoryRouter>
  </QueryClientProvider>);
}
beforeEach(() => { state.allowed = false; state.classroom = false; state.loading = false;
  state.rpc.mockReset().mockImplementation(async () => ({ data: state.allowed, error: null })); });
describe('Classroom Home with Reading Center assignment only', () => {
  it('shows a verified assigned tool when all general access is off', async () => {
    state.allowed = true; open();
    expect(await screen.findByText('Reading Center is assigned to you')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Open Reading Center' })).toBeTruthy();
    expect(screen.queryByText('Broad classroom dashboard')).toBeNull();
    expect(screen.queryByText('Course announcement')).toBeNull();
  });
  it('keeps the ordinary locked state for unassigned, scheduled and revoked accounts', async () => {
    open(); expect(await screen.findByText('Classroom locked')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Open Reading Center' })).toBeNull();
  });
  it('shows no tool before the grant has been checked', async () => {
    state.rpc.mockImplementation(() => new Promise(() => {})); open();
    await waitFor(() => expect(state.rpc).toHaveBeenCalled());
    expect(screen.getByRole('status').textContent).toBe('Checking assigned work…');
    expect(screen.queryByText('Reading Center is assigned to you')).toBeNull();
  });
  it('does not grant the broad dashboard when access verification fails', async () => {
    state.rpc.mockResolvedValue({ data: null, error: new Error('offline') }); open();
    expect(await screen.findByText('Classroom locked')).toBeTruthy();
    expect(screen.queryByText('Broad classroom dashboard')).toBeNull();
  });
  it('preserves the ordinary dashboard when Classroom permission is on', () => {
    state.classroom = true; open(); expect(screen.getByText('Broad classroom dashboard')).toBeTruthy();
  });
  it('holds the broad dashboard until general permissions are known', () => {
    state.loading = true; state.classroom = true; open();
    expect(screen.getByRole('status').textContent).toBe('Checking workspace access…');
    expect(screen.queryByText('Broad classroom dashboard')).toBeNull();
  });
});
