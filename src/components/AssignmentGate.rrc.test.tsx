import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ActivityAssignmentGate, ReadingCenterRrcGate } from './AssignmentGate';

const state = vi.hoisted(() => ({
  hub: true, pending: false, classroom: false, owner: 'student-1',
  mode: 'section', format: 'spoken-recall', legacy: false,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student-1' }, authReady: true }) }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({
  loading: false, is_admin: false, has_activity_access: false, has_classroom_access: state.classroom,
}) }));
vi.mock('@/hooks/useReadingCenterAccess', () => ({ useReadingCenterAccess: () => ({ allowed: state.hub && !state.pending, isPending: state.pending }) }));
vi.mock('@/components/ProtectedRoute', () => ({ default: ({ allowSignedIn, children }: { allowSignedIn?: boolean; children: React.ReactNode }) => allowSignedIn ? children : <div>Locked</div> }));
vi.mock('@/components/LockedModule', () => ({ default: () => <div>Locked</div> }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  const filters: Record<string, unknown> = {};
  const query = {
    select: () => query,
    eq: (key: string, value: unknown) => { filters[key] = value; return query; },
    maybeSingle: async () => ({ data: filters.student_id === state.owner
      ? { id: 'attempt', mode: state.mode, item_format: state.format } : null, error: null }),
    limit: async () => ({ data: state.legacy && filters.student_id === state.owner && filters.mode === 'section-library' ? [{ id: 'library' }] : [], error: null }),
  };
  return query;
} } }));

function open(kind: 'new' | 'legacy' | 'library' = 'new') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={['/attempt/attempt']}><Routes><Route path="/attempt/:assignmentId" element={kind === 'library'
      ? <ReadingCenterRrcGate><div>RRC opened</div></ReadingCenterRrcGate>
      : <ActivityAssignmentGate rrcOnly={kind === 'new'}><div>RRC opened</div></ActivityAssignmentGate>} /></Routes></MemoryRouter>
  </QueryClientProvider>);
}
beforeEach(() => Object.assign(state, { hub: true, pending: false, classroom: false, owner: 'student-1', mode: 'section', format: 'spoken-recall', legacy: false }));
describe('Reading Center RRC access remains scoped', () => {
  it('opens the hub student’s own spoken-recall section without Classroom', async () => {
    open(); expect(await screen.findByText('RRC opened')).toBeInTheDocument();
  });
  it('does not open another student’s section', async () => {
    state.owner = 'other'; open(); expect(await screen.findByText('Locked')).toBeInTheDocument();
  });
  it.each([['quiz', 'typed'], ['section', 'typed'], ['section-library', 'spoken-recall']])('rejects %s/%s on the new attempt route', async (mode, format) => {
    state.classroom = true; state.mode = mode; state.format = format;
    open(); expect(await screen.findByText('Locked')).toBeInTheDocument();
  });
  it('hub access cannot open unrelated activities on the legacy route', async () => {
    state.mode = 'quiz'; state.format = 'typed'; open('legacy'); expect(await screen.findByText('Locked')).toBeInTheDocument();
  });
  it('a hub student can follow an owned legacy library assignment into RRC', async () => {
    state.mode = 'section-library'; open('legacy'); expect(await screen.findByText('RRC opened')).toBeInTheDocument();
  });
  it('preserves existing Classroom assignments without a hub grant', async () => {
    state.hub = false; state.classroom = true; open(); expect(await screen.findByText('RRC opened')).toBeInTheDocument();
  });
  it('waits for the hub permission before opening', () => {
    state.pending = true; open(); expect(screen.getByRole('status')).toBeInTheDocument(); expect(screen.queryByText('RRC opened')).toBeNull();
  });
  it('opens the library with a hub grant', async () => {
    open('library'); expect(await screen.findByText('RRC opened')).toBeInTheDocument();
  });
  it('preserves specifically assigned legacy libraries without a hub grant', async () => {
    state.hub = false; state.classroom = true; state.legacy = true;
    open('library'); expect(await screen.findByText('RRC opened')).toBeInTheDocument();
  });
  it('a general Classroom grant cannot open the RRC collection', async () => {
    state.hub = false; state.classroom = true;
    open('library'); expect(await screen.findByText('Locked')).toBeInTheDocument();
  });
});
