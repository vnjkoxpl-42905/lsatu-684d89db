import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
const state = vi.hoisted(() => ({ user: 'student-1', admin: false, allowed: false, fail: false, rpc: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: state.user }, authReady: true }) }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ is_admin: state.admin, loading: false }) }));
vi.mock('@/components/ProtectedRoute', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/LockedModule', () => ({ default: () => <div>Reading Center locked</div> }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: state.rpc } }));
import ReadingCenterGate from './ReadingCenterGate';
function open(cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const view = render(<QueryClientProvider client={cache}><MemoryRouter initialEntries={['/reading-center/read/example']}>
    <ReadingCenterGate><div>Reading tool opened</div></ReadingCenterGate>
  </MemoryRouter></QueryClientProvider>);
  return { ...view, cache };
}
beforeEach(() => { state.user = 'student-1'; state.admin = false; state.allowed = false; state.fail = false;
  state.rpc.mockReset().mockImplementation(async () => ({ data: state.allowed, error: state.fail ? new Error('offline') : null })); });
describe('assignment-only Reading Center route', () => {
  it('denies direct reader links to unassigned students', async () => { open(); expect(await screen.findByText('Reading Center locked')).toBeTruthy(); });
  it('opens an assigned reader on a fresh load', async () => { state.allowed = true; open(); expect(await screen.findByText('Reading tool opened')).toBeTruthy(); });
  it('does not reuse another student’s cached access', async () => {
    const view = open(); expect(await screen.findByText('Reading Center locked')).toBeTruthy(); view.unmount();
    view.cache.setQueryData(['reading-center-access', 'student-1'], true); state.user = 'student-2'; open(view.cache);
    expect(await screen.findByText('Reading Center locked')).toBeTruthy();
  });
  it('closes the mounted tool when access is revoked and rechecked', async () => {
    state.allowed = true; const view = open(); expect(await screen.findByText('Reading tool opened')).toBeTruthy();
    state.allowed = false; await view.cache.invalidateQueries({ queryKey: ['reading-center-access'] });
    await waitFor(() => expect(screen.queryByText('Reading tool opened')).toBeNull());
    expect(screen.getByText('Reading Center locked')).toBeTruthy();
  });
  it('fails closed and offers a retry when the grant cannot be checked', async () => { state.fail = true; open(); expect(await screen.findByRole('alert')).toBeTruthy(); expect(screen.queryByText('Reading tool opened')).toBeNull(); });
  it('allows the teacher without issuing any student assignment', () => { state.admin = true; open(); expect(screen.getByText('Reading tool opened')).toBeTruthy(); expect(state.rpc).not.toHaveBeenCalled(); });
});
