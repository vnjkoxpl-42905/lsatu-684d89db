import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
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
  useInbox: () => ({ conversations: [], loading: false }),
}));

vi.mock('@/hooks/useAITADrafts', () => ({
  useAITADrafts: () => ({ data: [], isLoading: false }),
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
  DeskTodoRail: () => <aside aria-label="To-do rail">To-do rail</aside>,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderDesk(initialEntry = '/teacher') {
  return render(
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
    </MemoryRouter>,
  );
}

describe('TeacherDeskPreview workspace rail', () => {
  it('selects Students inside the desk instead of routing to the old students page', () => {
    renderDesk();

    fireEvent.click(screen.getByRole('button', { name: 'Students' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/teacher?ws=students');
    expect(screen.getByText('Meghan Mullins')).toBeInTheDocument();
    expect(screen.getByLabelText('Saved chats')).toBeInTheDocument();
    expect(screen.getByLabelText('To-do rail')).toBeInTheDocument();
  });

  it('restores a workspace from the ws query param and clears it for Today', () => {
    renderDesk('/teacher?ws=library');

    expect(screen.getByTestId('location')).toHaveTextContent('/teacher?ws=library');
    expect(screen.getByRole('heading', { name: 'Library' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/teacher');
    expect(screen.getByLabelText('Today chat')).toBeInTheDocument();
  });
});
