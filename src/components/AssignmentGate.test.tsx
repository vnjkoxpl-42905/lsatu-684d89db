import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DrillAssignmentGate } from './AssignmentGate';

const state = vi.hoisted(() => ({
  runStatus: 'in-progress', sessionStatus: 'in_progress', sessionOwner: 'student-1',
  sessionRun: 'run-1', sessionLeg: 0,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'student-1' }, authReady: true }),
}));
vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => ({ loading: false, is_admin: false, has_drill_access: false }),
}));
vi.mock('@/components/ProtectedRoute', () => ({
  default: () => <div>Access locked</div>,
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => { filters[key] = value; return query; },
        neq: () => query,
        limit: async () => ({ data: [{ id: 'assignment-1' }], error: null }),
        maybeSingle: async () => {
          if (table === 'practice_test_runs') return {
            data: filters.id === 'run-1' && filters.user_id === 'student-1'
              ? { pt: 140, status: state.runStatus, current_leg: 0,
                  legs: [{ kind: 'rc', startedAt: '2026-09-28', passageIds: [51, 52] }] }
              : null,
            error: null,
          };
          if (table === 'rc_drill_sessions') return {
            data: filters.id === 'session-1' && filters.user_id === state.sessionOwner &&
              filters.practice_test_run_id === state.sessionRun && filters.practice_test_leg === state.sessionLeg
              ? { user_id: state.sessionOwner, practice_test_run_id: state.sessionRun,
                  practice_test_leg: state.sessionLeg, status: state.sessionStatus, passage_ids: [51, 52] }
              : null,
            error: null,
          };
          return { data: null, error: null };
        },
      };
      return query;
    },
  },
}));

function renderRoute(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/rc/drill" element={<DrillAssignmentGate><div>RC player opened</div></DrillAssignmentGate>} />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>);
}

describe('assigned-only PrepTest RC route', () => {
  beforeEach(() => {
    state.runStatus = 'in-progress';
    state.sessionStatus = 'in_progress';
    state.sessionOwner = 'student-1';
    state.sessionRun = 'run-1';
    state.sessionLeg = 0;
  });

  it('resumes only its own active session', async () => {
    renderRoute('/rc/drill?sessionId=session-1&ptRun=run-1&ptLeg=0');
    expect(await screen.findByText('RC player opened')).toBeTruthy();
  });

  it('locks a completed run and a mismatched leg', async () => {
    state.runStatus = 'complete';
    renderRoute('/rc/drill?sessionId=session-1&ptRun=run-1&ptLeg=0');
    expect(await screen.findByText('Access locked')).toBeTruthy();
  });

  it('locks a session owned by another account', async () => {
    state.sessionOwner = 'other-student';
    renderRoute('/rc/drill?sessionId=session-1&ptRun=run-1&ptLeg=0');
    expect(await screen.findByText('Access locked')).toBeTruthy();
  });

  it('locks a mismatched leg', async () => {
    renderRoute('/rc/drill?sessionId=session-1&ptRun=run-1&ptLeg=1');
    expect(await screen.findByText('Access locked')).toBeTruthy();
  });
});
