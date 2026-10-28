import { ScrollTrigger } from 'gsap/ScrollTrigger';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const evidenceState = vi.hoisted(() => ({ broken: false }));
beforeEach(() => { evidenceState.broken = false; });
afterEach(cleanup);
// Registering ScrollTrigger starts an app-lifetime polling interval. JSDOM
// ends after this suite, so stop that plugin service after component cleanup.
afterAll(() => ScrollTrigger.disable());

let finishPlanRead: ((result: { data: null; error: Error }) => void) | undefined;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'student-1' } }),
}));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ loading: false, is_admin: false, has_classroom_access: true }) }));
vi.mock('@/hooks/useReadingCenterAccess', () => ({ useReadingCenterAccess: () => ({ allowed: false, isPending: false }) }));
vi.mock('@/hooks/useStudentAssignments', () => ({
  useStudentAssignments: () => ({ assignments: [], loading: false, error: null, refresh: async () => undefined }),
  useStudentTAAssignments: () => ({ assignments: [], loading: false, error: null, refresh: async () => undefined }),
}));
vi.mock('@/hooks/useClassroomItems', () => ({
  useClassroomItems: () => ({
    data: [
      { id: 'plan-mirror', type: 'weekly_plan_task', title: 'Read the passage', status: 'assigned', source_table: 'weekly_plan_items', source_id: 'plan-task-1', created_at: '2026-09-29T00:00:00Z', due_at: null },
      { id: 'bootcamp', type: 'bootcamp_module', title: 'Intro to LR', status: 'assigned', source_table: 'bootcamps', source_id: '/bootcamp/intro-to-lr', created_at: '2026-09-28T00:00:00Z', due_at: null },
    ],
    isLoading: false,
    isError: false,
    refetch: async () => undefined,
  }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => new Promise((resolve) => { finishPlanRead = resolve; }),
      }),
    }),
  },
}));
// The prescribed week reads its own query and has its own tests.
vi.mock('@/components/classroom/PrescribedWeek', () => ({ default: () => null }));
vi.mock('@/lib/guidedDrills', () => ({ listAssignmentsForStudent: async () => evidenceState.broken ? [{ id: 'guided-1', assigned_at: '2026-09-30T00:00:00Z', status: 'assigned', completed_at: null, guided_drill: { title: 'Saved reasoning drill', question_count: 5 } }] : [] }));
vi.mock('@/features/activity-centre/api/activitiesClient', () => ({ listStudentAssignments: async () => [] }));
vi.mock('@/lib/studentWorkEvidence', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/studentWorkEvidence')>(),
  loadAssignmentWorkEvidence: async () => ({ guided: {}, homework: {}, diagnostics: evidenceState.broken ? [{ source: 'practice_sessions', family: 'guided', reason: 'invalid_record', assignmentId: 'guided-1' }] : [] }),
  loadActivityWorkEvidence: async () => new Set(),
}));

import MyWorkPage from './MyWorkPage';

describe('My Work while weekly plan status refreshes', () => {
  it('keeps assigned rows visible during a refetch and after its failure', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['weekly-plan', 'assigned-status', 'student-1'], { 'plan-task-1': 'assigned' });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/my-work/to-do']}>
          <MyWorkPage completed={false} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(finishPlanRead).toBeDefined());
    await waitFor(() => expect(screen.getByText('Read the passage')).toBeInTheDocument());
    expect(screen.getByText('Intro to LR')).toBeInTheDocument();
    expect(screen.queryByText('Loading your work…')).not.toBeInTheDocument();

    await act(async () => { finishPlanRead!({ data: null, error: new Error('status unavailable') }); });
    await waitFor(() => expect(screen.getByText('Some assignments could not refresh. Your saved work is still shown.')).toBeInTheDocument());
    expect(screen.getByText('2 shown (list may be incomplete)')).toBeInTheDocument();
    expect(screen.getByText('Read the passage')).toBeInTheDocument();
    expect(screen.getByText('Intro to LR')).toBeInTheDocument();
  });
});


it('names rejected saved progress, retains other work, and clears the warning after retry', async () => {
  evidenceState.broken = true;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['weekly-plan', 'assigned-status', 'student-1'], { 'plan-task-1': 'assigned' });
  render(<QueryClientProvider client={client}><MemoryRouter><MyWorkPage completed={false} /></MemoryRouter></QueryClientProvider>);
  await waitFor(() => expect(screen.getByText('Progress unverified')).toBeInTheDocument());
  expect(screen.getByText(/Could not confirm saved assignment sessions/)).toBeInTheDocument();
  expect(screen.getByText(/shown \(list may be incomplete\)/)).toBeInTheDocument();
  expect(screen.getByText('Intro to LR')).toBeInTheDocument();
  evidenceState.broken = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(screen.queryByText(/Could not confirm saved assignment sessions/)).not.toBeInTheDocument());
  expect(screen.getByText('Intro to LR')).toBeInTheDocument();
});
