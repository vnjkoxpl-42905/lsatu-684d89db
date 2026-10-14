import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TeacherDeskPreview from './TeacherDeskPreview';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1' } }),
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

vi.mock('@/hooks/useInbox', () => ({
  useInbox: () => ({ conversations: [], loading: false, unreadCount: 0, refresh: vi.fn() }),
}));

vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => ({ is_admin: true, loading: false }),
}));

vi.mock('@/features/admin-inbox/gmail/components/GmailPane', () => ({
  GmailPane: () => <section aria-label="Gmail workspace">Gmail pane</section>,
}));

vi.mock('@/components/inbox/DrivePanel', () => ({
  DrivePanel: () => <section aria-label="Drive workspace">Drive pane</section>,
}));

vi.mock('@/components/inbox/NewConversationDialog', () => ({
  NewConversationDialog: () => <button type="button">New command</button>,
}));

vi.mock('@/hooks/useAITADrafts', () => ({
  useAITADrafts: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useAllClassroomItems', () => ({
  useAllClassroomItems: () => ({
    items: [
      {
        id: 'schedule-1',
        student_id: 'student-1',
        type: 'weekly_plan_task',
        title: 'Timed LR review',
        description: 'Review weaken timing.',
        status: 'assigned',
        due_at: '2026-06-18T20:00:00.000Z',
        unlock_at: null,
        created_at: '2026-06-17T20:00:00.000Z',
      },
    ],
    groups: [],
    totals: { total: 0, notStarted: 0, inProgress: 0, completed: 0, stuck: 0, uniqueStudents: 0 },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/useExternalWorkUploads', () => ({
  useAdminUploadsQueue: () => ({ data: [], isLoading: false }),
}));

vi.mock('./useNextSession', () => ({
  useNextSession: () => ({ data: null }),
}));

vi.mock('@/components/teacher/ai-ta/OperatorChatProvider', () => ({
  OperatorChatProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useOperatorChatContext: () => ({
    conversations: [],
    conversationId: null,
    newConversation: vi.fn(),
    openConversation: vi.fn(),
    deleteConversation: vi.fn(),
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: vi.fn(),
  }),
}));

vi.mock('./DeskChatPanel', () => ({
  DeskChatPanel: () => <section aria-label="Today chat">Today composer</section>,
}));

vi.mock('./DeskChatRail', () => ({
  DeskChatRail: () => <aside aria-label="Saved chats">Saved chats</aside>,
}));

vi.mock('./DeskTodoRail', () => ({
  DeskTodoRail: ({
    items,
    onOpen,
  }: {
    items: Array<{ id: string; label: string; preview: string }>;
    onOpen: (path: string) => void;
  }) => (
    <aside aria-label="To-do rail">
      {items.map((item) => (
        <div key={item.id}>
          {item.label}: {item.preview}
        </div>
      ))}
      <button type="button" onClick={() => onOpen('/inbox?pane=gmail&t=thread-1')}>Open Gmail task</button>
    </aside>
  ),
}));

vi.mock('./DeskPeopleSurface', () => ({
  DeskPeopleSurface: () => <section aria-label="People workspace">People directory</section>,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderDesk(initialEntry = '/teacher') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Routes>
          <Route
            path="/teacher"
            element={
              <>
                <LocationProbe />
                <TeacherDeskPreview />
              </>
            }
          />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeacherDeskPreview workspace rail', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-06-18T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('selects People inside the desk instead of keeping separate Students and Admin workspaces', () => {
    renderDesk();

    fireEvent.click(screen.getByRole('button', { name: 'People' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/teacher?ws=people');
    expect(screen.getByLabelText('People workspace')).toBeInTheDocument();
    expect(screen.getByLabelText('Saved chats')).toBeInTheDocument();
    expect(screen.getByLabelText('To-do rail')).toBeInTheDocument();
    // Student assignments with a due date are their calendar, not Joshua's, so
    // they stay out of the to-do rail.
    expect(screen.queryByText('Schedule: Timed LR review')).not.toBeInTheDocument();
    expect(screen.queryByText(/No active assignment/i)).not.toBeInTheDocument();
  });

  it('maps legacy students and admin desk queries into the People workspace', () => {
    renderDesk('/teacher?ws=students');

    expect(screen.getByTestId('location')).toHaveTextContent('/teacher?ws=people');
    expect(screen.getByLabelText('People workspace')).toBeInTheDocument();

    renderDesk('/teacher?ws=admin');

    expect(screen.getAllByTestId('location').at(-1)).toHaveTextContent('/teacher?ws=people');
    expect(screen.getAllByLabelText('People workspace').length).toBeGreaterThan(0);
  });

  it('restores a workspace from the ws query param and clears it for Today', () => {
    renderDesk('/teacher?ws=library');

    expect(screen.getByTestId('location')).toHaveTextContent('/teacher?ws=library');
    expect(screen.getByRole('button', { name: 'Library' })).toHaveAttribute('aria-current', 'page');
    // Library opens on Bootcamps now that the tab is a route segment with its
    // own default, rather than a query param defaulting to Assignments.
    expect(screen.getByRole('heading', { name: 'Bootcamps' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/teacher');
    expect(screen.getByLabelText('Today chat')).toBeInTheDocument();
  });

  it('redirects legacy inbox to the Messages workspace with no source toggle', () => {
    renderDesk('/teacher?ws=inbox');

    expect(screen.getByTestId('location')).toHaveTextContent('/teacher?ws=messages');
    expect(screen.getByRole('heading', { name: 'Messages' })).toBeInTheDocument();
    // The source toggle (visible-text Gmail/Drive buttons) is gone; the rail's
    // aria-label-only workspace buttons are a separate, expected control.
    expect(screen.queryByText('Gmail')).not.toBeInTheDocument();
    expect(screen.queryByText('Drive')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Saved chats')).toBeInTheDocument();
    expect(screen.getByLabelText('To-do rail')).toBeInTheDocument();
  });

  it('shows the Messages workspace directly with no source toggle', () => {
    renderDesk('/teacher?ws=messages');

    expect(screen.getByTestId('location')).toHaveTextContent('/teacher?ws=messages');
    expect(screen.getByRole('heading', { name: 'Messages' })).toBeInTheDocument();
    expect(screen.queryByText('Gmail')).not.toBeInTheDocument();
    expect(screen.queryByText('Drive')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Gmail workspace')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Drive workspace')).not.toBeInTheDocument();
  });

  it('folds legacy inbox+gmail into the Gmail workspace, preserving the thread', () => {
    renderDesk('/teacher?ws=inbox&pane=gmail&t=thread-1');

    expect(screen.getByTestId('location')).toHaveTextContent('/teacher?ws=gmail&t=thread-1');
    expect(screen.getByLabelText('Gmail workspace')).toBeInTheDocument();
  });

  it('folds legacy inbox+drive into the Drive workspace', () => {
    renderDesk('/teacher?ws=inbox&pane=drive');

    expect(screen.getByTestId('location')).toHaveTextContent('/teacher?ws=drive');
    expect(screen.getByLabelText('Drive workspace')).toBeInTheDocument();
  });

  it('normalizes a bare pane=gmail query into the Gmail workspace', () => {
    renderDesk('/teacher?pane=gmail');

    expect(screen.getByTestId('location')).toHaveTextContent('/teacher?ws=gmail');
    expect(screen.getByLabelText('Gmail workspace')).toBeInTheDocument();
  });

  it('routes inbox to-do links into the Gmail workspace, preserving the thread', () => {
    renderDesk('/teacher');

    fireEvent.click(screen.getByRole('button', { name: 'Open Gmail task' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/teacher?ws=gmail&t=thread-1');
  });
});
