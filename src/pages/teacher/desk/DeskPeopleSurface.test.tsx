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
    access_tier: 'tier_2',
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
  {
    class_id: 'student-2',
    email: 'former@example.com',
    display_name: 'Former Student',
    role: 'user',
    last_seen_at: '2026-05-01T12:00:00.000Z',
    archived_at: '2026-06-01T12:00:00.000Z',
    archived_reason: null,
    has_bootcamp_access: false,
    has_classroom_access: false,
    has_analytics_access: false,
    has_schedule_access: false,
    has_practice_access: false,
    has_drill_access: false,
    has_waj_access: false,
    has_flagged_access: false,
    has_chat_access: false,
    has_export_access: false,
    has_ta_access: false,
  },
];

describe('DeskPeopleSurface', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-06-18T13:00:00.000Z'));
    invokeMock.mockClear();
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
      if (options?.method === 'POST' && (options.body as Record<string, unknown>)?.action === 'set_tier') {
        const { class_id, tier } = options.body as Record<string, unknown>;
        return Promise.resolve({
          data: { success: true, profile: { class_id, access_tier: tier } },
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

  it('puts an undecided signup on Tier 3 from the queue with one X', async () => {
    const newcomer = {
      ...users[0],
      class_id: 'student-new',
      email: 'new@example.com',
      display_name: 'New Signup',
      access_tier: null,
      created_at: '2026-06-18T09:00:00.000Z',
    };
    const base = invokeMock.getMockImplementation()!;
    invokeMock.mockImplementation((name, options) =>
      !options?.method || options.method === 'GET'
        ? options?.headers?.['x-mode'] === 'analytics'
          ? base(name, options)
          : Promise.resolve({ data: [...users, newcomer], error: null })
        : base(name, options),
    );
    renderPeople();

    const queue = await screen.findByRole('region', { name: 'Signup queue' });
    expect(within(queue).getByText('New Signup')).toBeInTheDocument();
    // A tiered student is not waiting on anything.
    expect(within(queue).queryByText('Meghan Mullins')).not.toBeInTheDocument();

    fireEvent.click(within(queue).getByRole('button', { name: 'Put New Signup on Tier 3' }));

    await vi.waitFor(() => {
      const call = invokeMock.mock.calls.find(([, options]) => options?.body?.action === 'set_tier');
      expect(call).toBeTruthy();
      expect(call![1].body).toMatchObject({ class_id: 'student-new', tier: 'tier_3' });
    });
  });

  it('applies a tier from the student panel', async () => {
    renderPeople();

    const row = await screen.findByTestId('people-row-student-1');
    expect(within(row).getByText('Tier 2')).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: /Expand Meghan Mullins/i }));

    const tiers = await screen.findByRole('radiogroup', { name: 'Tier for Meghan Mullins' });
    fireEvent.click(within(tiers).getByRole('radio', { name: 'Tier 1' }));

    await vi.waitFor(() => {
      const call = invokeMock.mock.calls.find(([, options]) => options?.body?.action === 'set_tier');
      expect(call![1].body).toMatchObject({ class_id: 'student-1', tier: 'tier_1' });
    });
    // The twelve switches are there, labelled by what they open.
    expect(screen.getByLabelText('TA worksheets for Meghan Mullins')).toBeInTheDocument();
    expect(screen.getByLabelText('Progress and history for Meghan Mullins')).toBeInTheDocument();
  });

  it('shows one whole-account access control per student', async () => {
    renderPeople();

    const row = await screen.findByTestId('people-row-student-1');

    expect(within(row).getByText(/Drill on/i)).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /Revoke All Access/i })).toBeInTheDocument();

    expect(screen.queryByRole('switch', { name: 'Bootcamps' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Classroom' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Practice' })).not.toBeInTheDocument();
  });

  it('revokes every feature except the classroom home page', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPeople();

    const row = await screen.findByTestId('people-row-student-1');
    fireEvent.click(within(row).getByRole('button', { name: /Revoke All Access/i }));

    const call = invokeMock.mock.calls.find(([, options]) => options?.body?.action === 'apply_template');
    expect(call).toBeTruthy();
    const flags = call![1].body.flags as Record<string, boolean>;
    expect(call![1].body.class_id).toBe('student-1');
    expect(flags.has_classroom_access).toBe(false);
    expect(flags.has_drill_access).toBe(false);
    expect(flags.has_chat_access).toBe(false);
    expect(flags.has_practice_access).toBe(false);
  });

  it('keeps archived students off the list until you ask for them', async () => {
    renderPeople();

    await screen.findByTestId('people-row-student-1');
    // The point of archiving: the list shows who you are actually teaching.
    expect(screen.queryByTestId('people-row-student-2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Archived' }));

    expect(await screen.findByTestId('people-row-student-2')).toBeInTheDocument();
    expect(screen.queryByTestId('people-row-student-1')).not.toBeInTheDocument();
  });

  it('archives a student through the edge function', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPeople();

    const row = await screen.findByTestId('people-row-student-1');
    fireEvent.click(within(row).getByRole('button', { name: /Meghan Mullins/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^Archive$/i }));

    const call = invokeMock.mock.calls.find(([, options]) => options?.body?.action === 'archive_student');
    expect(call).toBeTruthy();
    expect(call![1].body.class_id).toBe('student-1');
  });

  it('refuses to delete unless the email is typed exactly', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('wrong@example.com');
    renderPeople();

    const row = await screen.findByTestId('people-row-student-1');
    fireEvent.click(within(row).getByRole('button', { name: /Meghan Mullins/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Delete permanently/i }));

    expect(invokeMock.mock.calls.some(([, options]) => options?.body?.action === 'delete_student')).toBe(false);
    expect(toastErrorMock).toHaveBeenCalled();

    // The same click with the email typed correctly does go through.
    promptSpy.mockReturnValue('meghan@example.com');
    fireEvent.click(screen.getByRole('button', { name: /Delete permanently/i }));

    const call = invokeMock.mock.calls.find(([, options]) => options?.body?.action === 'delete_student');
    expect(call).toBeTruthy();
    expect(call![1].body.confirm_email).toBe('meghan@example.com');
  });

  it('does nothing when the confirmation is dismissed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPeople();

    const row = await screen.findByTestId('people-row-student-1');
    fireEvent.click(within(row).getByRole('button', { name: /Revoke All Access/i }));

    expect(invokeMock.mock.calls.some(([, options]) => options?.body?.action === 'apply_template')).toBe(false);
  });
});
