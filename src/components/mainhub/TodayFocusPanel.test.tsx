import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassroomItem } from "@/hooks/useClassroomItems";
import type { InstructorMessage } from "@/hooks/useInstructorMessages";
import type { Notification } from "@/hooks/useNotifications";
import type { StudentAssignment, StudentTAAssignment } from "@/hooks/useStudentAssignments";
import type { GuidedDrill, GuidedDrillAssignment } from "@/lib/guidedDrills";
import type { LastActivityRow } from "@/lib/lastActivity";
import TodayFocusPanel from "./TodayFocusPanel";

const navigateMock = vi.fn();
const markReadMock = vi.fn(() => Promise.resolve());
type GuidedAssignmentForTest = GuidedDrillAssignment & { guided_drill: GuidedDrill };

const state = {
  classroomItems: [] as ClassroomItem[],
  classroomLoading: false,
  classroomError: false,
  homework: [] as StudentAssignment[],
  homeworkLoading: false,
  homeworkError: null as string | null,
  taAssignments: [] as StudentTAAssignment[],
  taLoading: false,
  taError: null as string | null,
  notifications: [] as Notification[],
  notificationsLoading: false,
  notificationsError: null as string | null,
  instructorMessages: [] as InstructorMessage[],
  inboxLoading: false,
  lastActivity: null as LastActivityRow | null,
  lastActivityLoading: false,
  lastActivityError: false,
  guided: [] as GuidedAssignmentForTest[],
};

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "student-1", email: "student@example.com" },
    authReady: true,
  }),
}));

vi.mock("@/hooks/useClassroomItems", () => ({
  useClassroomItems: () => ({
    data: state.classroomItems,
    isLoading: state.classroomLoading,
    isError: state.classroomError,
  }),
}));

vi.mock("@/hooks/useStudentAssignments", () => ({
  useStudentAssignments: () => ({
    assignments: state.homework,
    loading: state.homeworkLoading,
    error: state.homeworkError,
    refresh: vi.fn(),
  }),
  useStudentTAAssignments: () => ({
    assignments: state.taAssignments,
    loading: state.taLoading,
    error: state.taError,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: state.notifications,
    unreadCount: state.notifications.filter((n) => !n.read).length,
    loading: state.notificationsLoading,
    error: state.notificationsError,
    refresh: vi.fn(),
    markRead: markReadMock,
    markAllRead: vi.fn(),
  }),
}));

vi.mock("@/hooks/useInstructorMessages", () => ({
  useInstructorMessages: () => ({
    data: state.instructorMessages,
    isLoading: state.inboxLoading,
    isError: false,
  }),
}));

vi.mock("@/hooks/useLastActivity", () => ({
  useLastActivity: () => ({
    data: state.lastActivity,
    isLoading: state.lastActivityLoading,
    isError: state.lastActivityError,
  }),
}));

vi.mock("@/lib/guidedDrills", () => ({
  listAssignmentsForStudent: vi.fn(() => Promise.resolve(state.guided)),
}));

function resetState() {
  state.classroomItems = [];
  state.classroomLoading = false;
  state.classroomError = false;
  state.homework = [];
  state.homeworkLoading = false;
  state.homeworkError = null;
  state.taAssignments = [];
  state.taLoading = false;
  state.taError = null;
  state.notifications = [];
  state.notificationsLoading = false;
  state.notificationsError = null;
  state.instructorMessages = [];
  state.inboxLoading = false;
  state.lastActivity = null;
  state.lastActivityLoading = false;
  state.lastActivityError = false;
  state.guided = [];
  navigateMock.mockClear();
  markReadMock.mockClear();
}

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <TodayFocusPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function classroomItem(overrides: Partial<ClassroomItem> = {}): ClassroomItem {
  return {
    id: "classroom-1",
    student_id: "student-1",
    class_id: null,
    created_by: "admin-1",
    type: "homework",
    title: "Intro to LR: Flaw Foundations",
    description: "Foundational LR skills",
    content_html: null,
    content_markdown: null,
    source_table: null,
    source_id: null,
    status: "assigned",
    unlock_at: null,
    due_at: null,
    completed_at: null,
    priority: 0,
    visible_to_student: true,
    metadata_json: {},
    created_at: "2026-06-29T12:00:00.000Z",
    updated_at: "2026-06-29T12:00:00.000Z",
    ...overrides,
  };
}

function instructorMessage(overrides: Partial<InstructorMessage> = {}): InstructorMessage {
  return {
    conversationId: "conversation-1",
    subject: "Question 14",
    body: "Review question 14 before our session.",
    createdAt: "2026-06-29T13:00:00.000Z",
    ...overrides,
  };
}

describe("TodayFocusPanel", () => {
  beforeEach(() => {
    resetState();
  });

  it("renders a same-shape skeleton while loading", () => {
    state.classroomLoading = true;
    renderPanel();

    expect(screen.getByRole("region", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByLabelText("Loading today")).toBeInTheDocument();
    expect(screen.queryByText(/Loading focus items/i)).not.toBeInTheDocument();
  });

  it("renders the honest empty state", async () => {
    renderPanel();

    expect(await screen.findByRole("heading", { name: "All caught up" })).toBeInTheDocument();
    expect(screen.getByText("Nothing assigned for today.")).toBeInTheDocument();
  });

  it("keeps assigned work ahead of an unread instructor message", async () => {
    state.classroomItems = [classroomItem()];
    state.instructorMessages = [instructorMessage()];

    renderPanel();

    expect(await screen.findByRole("heading", { name: "Intro to LR: Flaw Foundations" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Message from Joshua/i })).toBeInTheDocument();
  });

  it("shows nothing for Messages when the feed has no unread instructor message", async () => {
    // Peer and already-read threads are filtered inside useInstructorMessages,
    // so the panel only ever sees rows it should draw. An empty feed is the
    // caught-up state.
    state.instructorMessages = [];

    renderPanel();

    expect(await screen.findByRole("heading", { name: "All caught up" })).toBeInTheDocument();
    expect(screen.queryByText(/Message from Joshua/i)).not.toBeInTheDocument();
  });

  it("promotes a secondary rail without navigating", async () => {
    state.classroomItems = [
      classroomItem({ id: "classroom-1", title: "Primary assignment", priority: 2 }),
      classroomItem({ id: "classroom-2", title: "Secondary assignment", priority: 1 }),
    ];

    renderPanel();
    expect(await screen.findByRole("heading", { name: "Primary assignment" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Secondary assignment/i }));

    expect(screen.getByRole("heading", { name: "Secondary assignment" })).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("activation rail navigates to the real route", async () => {
    state.classroomItems = [classroomItem({ id: "classroom-route", type: "note", title: "Session note" })];

    renderPanel();
    expect(await screen.findByRole("heading", { name: "Session note" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Start/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/classroom/item/classroom-route", undefined);
    });
  });

  it("expands the primary surface in place", async () => {
    state.classroomItems = [classroomItem()];
    renderPanel();

    const primaryToggle = await screen.findByRole("button", { name: /Next up/i });
    expect(primaryToggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(primaryToggle);

    expect(primaryToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("This is next because it is assigned work.")).toBeInTheDocument();
  });
});
