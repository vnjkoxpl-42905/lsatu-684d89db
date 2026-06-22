import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeskPeopleSurface } from './DeskPeopleSurface';

const { invokeMock, getSessionMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  getSessionMock: vi.fn(),
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
        last_seen_at: '2026-06-18T12:00:00.000Z',
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
    error: vi.fn(),
    success: vi.fn(),
  },
}));

function renderPeople() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DeskPeopleSurface />
    </QueryClientProvider>,
  );
}

const users = [
  {
    class_id: 'student-1',
    email: 'meghan@example.com',
    display_name: 'Meghan Mullins',
    role: 'user',
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
      return Promise.resolve({ data: users, error: null });
    });
  });

  it('combines student context with admin access management in one People workspace', async () => {
    renderPeople();

    expect(await screen.findByRole('heading', { name: 'People' })).toBeInTheDocument();
    expect(screen.getByText('Meghan Mullins')).toBeInTheDocument();
    expect(screen.getByText('3/4')).toBeInTheDocument();
    expect(screen.getByLabelText('Unread message')).toBeInTheDocument();
    expect(screen.getByText('Joshua')).toBeInTheDocument();
    expect(screen.getByText('Primary admin')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Admins' }));

    expect(screen.queryByText('Meghan Mullins')).not.toBeInTheDocument();
    expect(screen.getByText('Joshua')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Expand Joshua/i }));

    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Trial/i })).toBeInTheDocument();
    expect(screen.getByText('Role Management')).toBeInTheDocument();
    expect(screen.getByText('Protected primary admin')).toBeInTheDocument();
  });

  it('exposes access switches when a student row is expanded', async () => {
    renderPeople();

    const row = await screen.findByTestId('people-row-student-1');
    fireEvent.click(within(row).getByRole('button', { name: /Expand Meghan Mullins/i }));

    expect(screen.getByRole('switch', { name: 'Practice' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Export' })).not.toBeChecked();
    expect(within(row).getByRole('button', { name: /Grant All/i })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /Revoke All/i })).toBeInTheDocument();
  });
});
