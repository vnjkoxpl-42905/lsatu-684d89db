import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DeskPeopleSurface } from './DeskPeopleSurface';

const { invokeMock, getSessionMock, toastErrorMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  getSessionMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
    functions: {
      invoke: invokeMock,
    },
  },
}));

vi.mock('@/hooks/useHubStudents', () => ({
  useHubStudents: () => ({
    rows: [
      {
        class_id: 'student-1',
        display_name: 'Meghan Mullins',
        email: 'meghan@example.com',
        last_seen_at: '2026-06-18T12:58:00.000Z',
        role: 'user',
        has_bootcamp_access: true,
        has_classroom_access: true,
        has_analytics_access: true,
        has_schedule_access: true,
        has_practice_access: true,
        has_drill_access: true,
        has_waj_access: true,
        has_flagged_access: true,
        has_chat_access: true,
        has_export_access: false,
        has_ta_access: false,
        assignments_total: 4,
        assignments_assigned: 0,
        assignments_viewed: 1,
        assignments_completed: 3,
        has_unread_from_student: true,
      },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: vi.fn(),
  },
}));

function renderPeople() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  // Roster names are links into the student dossier (T3.2), so the surface needs
  // a router in scope.
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <DeskPeopleSurface />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const users = [
  {
    class_id: 'student-1',
    email: 'meghan@example.com',
    display_name: 'Meghan Mullins',
    role: 'user',
    last_seen_at: '2026-06-18T12:58:00.000Z',
    has_bootcamp_access: true,
    has_classroom_access: true,
    has_analytics_access: true,
    has_schedule_access: true,
    has_practice_access: true,
    has_drill_access: true,
    has_waj_access: true,
    has_flagged_access: true,
    has_chat_access: true,
    has_export_access: false,
    has_ta_access: false,
  },
  {
    class_id: 'admin-1',
    email: 'contact@aspiringattorneys.com',
    display_name: 'Joshua',
    role: 'admin',
    last_seen_at: '2026-06-18T12:00:00.000Z',
    has_bootcamp_access: true,
    has_classroom_access: true,
    has_analytics_access: true,
    has_schedule_access: true,
    has_practice_access: true,
    has_drill_access: true,
    has_waj_access: true,
    has_flagged_access: true,
    has_chat_access: true,
    has_export_access: true,
    has_ta_access: true,
  },
];

describe('DeskPeopleSurface', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-06-18T13:00:00.000Z'));
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'admin-1' } } } });
    invokeMock.mockImplementation((_name, options) => {
      if (options?.headers?.['x-mode'] === 'analytics') {
        return Promise.resolve({
          data: {
            total_users: 2,
            active_today: 2,
            active_week: 2,
            admin_count: 1,
            feature_adoption: {},
            total_attempts: 0,
            week_attempts: 0,
          },
          error: null,
        });
      }
      if (options?.method === 'POST') {
        const { class_id, field, value } = options.body as Record<string, unknown>;
        return Promise.resolve({
          data: { success: true, profile: { class_id, [field as string]: value } },
          error: null,
        });
      }
      return Promise.resolve({ data: users, error: null });
    });
  });

  it('combines student context with admin access management in one People workspace', async () => {
    renderPeople();

    // The room title lives in the workspace shell now, so the surface itself
    // carries only its landmark and the roster count.
    expect(await screen.findByRole('region', { name: 'Students' })).toBeInTheDocument();
    expect(screen.getByText(/2 people/)).toBeInTheDocument();
    expect(screen.getByText('Meghan Mullins')).toBeInTheDocument();
    expect(screen.getByText('3/4')).toBeInTheDocument();
    expect(screen.getByLabelText('Unread message')).toBeInTheDocument();
    expect(screen.getByLabelText('Online on LSAT U')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Last active 2m ago')).toBeInTheDocument();
    expect(screen.getByText('Joshua')).toBeInTheDocument();
    expect(screen.getByText('Primary admin')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Admins' }));

    expect(screen.queryByText('Meghan Mullins')).not.toBeInTheDocument();
    expect(screen.getByText('Joshua')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Expand Joshua/i }));

    // The simplified People page only manages Drill access plus role. No
    // broad permission matrix, templates, or bulk grant/revoke.
    expect(screen.queryByText('Templates')).not.toBeInTheDocument();
    expect(screen.getByText('Role Management')).toBeInTheDocument();
    expect(screen.getByText('Protected primary admin')).toBeInTheDocument();
  });

  it('shows a single Drill access control per student and no broad bulk actions', async () => {
    renderPeople();

    const row = await screen.findByTestId('people-row-student-1');

    // Drill access status surfaced on the row, with a single revoke action
    // (the seeded student already has drill access).
    expect(within(row).getByText(/Drill on/i)).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /Revoke Drill Access/i })).toBeInTheDocument();

    // No bootcamp/classroom/practice toggles, no Grant All / Revoke All.
    expect(screen.queryByRole('switch', { name: 'Bootcamps' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Classroom' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Practice' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Grant All/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revoke All/i })).not.toBeInTheDocument();
  });

  it('toggles Drill access through the row action', async () => {
    renderPeople();

    const row = await screen.findByTestId('people-row-student-1');
    fireEvent.click(within(row).getByRole('button', { name: /Revoke Drill Access/i }));

    expect(invokeMock).toHaveBeenCalledWith('admin-manage-users', {
      method: 'POST',
      body: { class_id: 'student-1', field: 'has_drill_access', value: false },
    });

    expect(await within(row).findByText(/Drill off/i)).toBeInTheDocument();
  });

  it('reverts the row when the server reports that nothing was written', async () => {
    const listImplementation = invokeMock.getMockImplementation()!;
    invokeMock.mockImplementation((name, options) => {
      if (options?.method === 'POST') {
        // PostgREST treats a filter that matches no row as a success, so the
        // function returns no profile. The row must snap back immediately
        // rather than showing a revoke that never landed.
        return Promise.resolve({ data: { success: true }, error: null });
      }
      return listImplementation(name, options);
    });

    renderPeople();

    const row = await screen.findByTestId('people-row-student-1');
    fireEvent.click(within(row).getByRole('button', { name: /Revoke Drill Access/i }));

    expect(await within(row).findByText(/Drill on/i)).toBeInTheDocument();
    expect(toastErrorMock).toHaveBeenCalledWith('Failed to update permission');
  });
});
