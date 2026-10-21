import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

let finishPlanRead: ((result: { data: null; error: Error }) => void) | undefined;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'student-1' } }),
}));
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
vi.mock('@/lib/guidedDrills', () => ({ listAssignmentsForStudent: async () => [] }));
vi.mock('@/features/activity-centre/api/activitiesClient', () => ({ listStudentAssignments: async () => [] }));
vi.mock('@/lib/studentWorkEvidence', () => ({
  loadAssignmentWorkEvidence: async () => ({ guided: {}, homework: {} }),
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
    expect(screen.getByText('Read the passage')).toBeInTheDocument();
    expect(screen.getByText('Intro to LR')).toBeInTheDocument();
  });
});
