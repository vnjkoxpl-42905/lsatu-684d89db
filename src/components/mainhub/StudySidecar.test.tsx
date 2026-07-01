import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Conversation } from "@/hooks/useInbox";
import type { Notification } from "@/hooks/useNotifications";
import type { ClassroomItem } from "@/hooks/useClassroomItems";
import type { StudentAssignment, StudentTAAssignment } from "@/hooks/useStudentAssignments";
import { TooltipProvider } from "@/components/ui/tooltip";
import StudySidecar from "./StudySidecar";

const {
  mockNavigate,
  mockAddTab,
  mockSend,
  mockRefreshInbox,
  mockMarkRead,
  mockMarkAllRead,
  mockStartJoshuaConversation,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockAddTab: vi.fn(),
  mockSend: vi.fn(),
  mockRefreshInbox: vi.fn(),
  mockMarkRead: vi.fn(),
  mockMarkAllRead: vi.fn(),
  mockStartJoshuaConversation: vi.fn(),
}));

let mockConversations: Conversation[] = [];
let mockNotifications: Notification[] = [];
let mockClassroomItems: ClassroomItem[] = [];
let mockStudentAssignments: StudentAssignment[] = [];
let mockStudentTAAssignments: StudentTAAssignment[] = [];
let inboxLoading = false;
let notificationsLoading = false;
let notificationsError: string | null = null;
let mockIsAdmin = false;
let mockPermissions = {
  has_bootcamp_access: true,
  has_classroom_access: true,
  has_analytics_access: true,
  has_schedule_access: true,
  has_practice_access: true,
  has_drill_access: true,
  has_waj_access: true,
  has_journal_access: true,
  has_flagged_access: true,
  has_chat_access: true,
  has_export_access: true,
  has_ta_access: true,
  has_activity_access: true,
  is_admin: false,
  loading: false,
};

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "student-1", email: "student@example.com" },
  }),
}));

vi.mock("@/hooks/useUserPermissions", () => ({
  useUserPermissions: () => ({ ...mockPermissions, is_admin: mockIsAdmin }),
}));

vi.mock("@/components/mainhub/SidecarGmailPanel", () => ({
  default: () => <div>Gmail panel</div>,
}));

vi.mock("@/hooks/useStudyChat", () => ({
  useStudyChat: () => ({
    tabs: [{ id: "chat-1", label: "Chat 1", messages: [] }],
    activeTabId: "chat-1",
    setActiveTabId: vi.fn(),
    addTab: mockAddTab,
    activeMessages: [],
    thinking: false,
    streamingContent: "",
    send: mockSend,
  }),
}));

vi.mock("@/hooks/useInbox", () => ({
  useInbox: () => ({
    conversations: mockConversations,
    loading: inboxLoading,
    unreadCount: mockConversations.filter((conversation) => conversation.unread).length,
    refresh: mockRefreshInbox,
  }),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: mockNotifications,
    unreadCount: mockNotifications.filter((notification) => !notification.read).length,
    loading: notificationsLoading,
    error: notificationsError,
    refresh: vi.fn(),
    markRead: mockMarkRead,
    markAllRead: mockMarkAllRead,
  }),
}));

vi.mock("@/hooks/useClassroomItems", () => ({
  useClassroomItems: () => ({
    data: mockClassroomItems,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useStudentAssignments", () => ({
  useStudentAssignments: () => ({
    assignments: mockStudentAssignments,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
  useStudentTAAssignments: () => ({
    assignments: mockStudentTAAssignments,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/joshuaThread", () => ({
  startJoshuaConversation: mockStartJoshuaConversation,
}));

vi.mock("@/components/inbox/ConversationView", () => ({
  ConversationView: ({
    conversation,
    compact,
    emptyStateLabel,
    studentFacing,
  }: {
    conversation: Conversation;
    compact?: boolean;
    emptyStateLabel?: string;
    studentFacing?: boolean;
  }) => (
    <div>
      Conversation {conversation.id} {compact ? "compact" : "full"} {emptyStateLabel ?? ""}
      {studentFacing ? " student-facing" : ""}
    </div>
  ),
}));

vi.mock("@/components/inbox/MessageComposer", () => ({
  MessageComposer: ({
    conversationId,
    studentFacing,
  }: {
    conversationId: string | null;
    studentFacing?: boolean;
  }) => <div>Composer {conversationId ?? "none"} {studentFacing ? "student-facing" : ""}</div>,
}));

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "thread-1",
    subject: null,
    created_by: "admin-1",
    created_at: "2026-06-29T12:00:00.000Z",
    last_message_at: "2026-06-29T12:30:00.000Z",
    participants: [
      {
        id: "part-student",
        conversation_id: "thread-1",
        user_id: "student-1",
        last_read_at: "2026-06-29T12:00:00.000Z",
        display_name: "Student",
        is_admin: false,
        last_seen_at: null,
      },
      {
        id: "part-admin",
        conversation_id: "thread-1",
        user_id: "admin-1",
        last_read_at: "2026-06-29T12:00:00.000Z",
        display_name: "Joshua",
        is_admin: true,
        last_seen_at: "2026-06-29T12:31:00.000Z",
      },
    ],
    unread: false,
    hasAttachments: false,
    ...overrides,
  };
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notif-1",
    user_id: "student-1",
    type: "assignment",
    title: "New assignment",
    body: "Open your drill",
    link: "/drill/123",
    read: false,
    created_at: "2026-06-29T12:32:00.000Z",
    ...overrides,
  };
}

function makeClassroomItem(overrides: Partial<ClassroomItem> = {}): ClassroomItem {
  return {
    id: "classroom-1",
    student_id: "student-1",
    class_id: "class-1",
    created_by: "admin-1",
    type: "homework",
    title: "Flaw homework",
    description: "Finish the assigned flaw questions.",
    content_html: null,
    content_markdown: null,
    source_table: "homework_assignments",
    source_id: "homework-1",
    status: "assigned",
    unlock_at: null,
    due_at: "2026-07-02T12:00:00.000Z",
    completed_at: null,
    priority: 10,
    visible_to_student: true,
    metadata_json: {},
    created_at: "2026-06-29T12:00:00.000Z",
    updated_at: "2026-06-29T12:00:00.000Z",
    ...overrides,
  };
}

function makeStudentAssignment(overrides: Partial<StudentAssignment> = {}): StudentAssignment {
  return {
    id: "homework-2",
    set_id: "set-1",
    student_id: "student-1",
    question_qids: ["q1", "q2"],
    set_title: "Assumption set",
    set_description: "Assigned assumption questions.",
    status: "assigned",
    started_at: null,
    completed_at: null,
    score: null,
    assigned_by: "admin-1",
    class_id: "class-1",
    created_at: "2026-06-29T12:00:00.000Z",
    ...overrides,
  };
}

function makeStudentTAAssignment(overrides: Partial<StudentTAAssignment> = {}): StudentTAAssignment {
  return {
    id: "ta-1",
    student_id: "student-1",
    interaction_id: null,
    title: "Review this explanation",
    content_html: "<p>Read this.</p>",
    asset_ids: [],
    pdf_url: null,
    status: "assigned",
    assigned_by: "admin-1",
    assigned_at: "2026-06-29T12:00:00.000Z",
    viewed_at: null,
    completed_at: null,
    created_at: "2026-06-29T12:00:00.000Z",
    ...overrides,
  };
}

function renderSidecar() {
  return render(
    <TooltipProvider>
      <StudySidecar open onClose={vi.fn()} presentation="docked" />
    </TooltipProvider>,
  );
}

describe("StudySidecar", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    mockNavigate.mockReset();
    mockAddTab.mockReset();
    mockSend.mockReset();
    mockRefreshInbox.mockReset();
    mockMarkRead.mockReset();
    mockMarkAllRead.mockReset();
    mockStartJoshuaConversation.mockReset();
    mockConversations = [];
    mockNotifications = [];
    mockClassroomItems = [];
    mockStudentAssignments = [];
    mockStudentTAAssignments = [];
    inboxLoading = false;
    notificationsLoading = false;
    notificationsError = null;
    mockIsAdmin = false;
    mockPermissions = {
      has_bootcamp_access: true,
      has_classroom_access: true,
      has_analytics_access: true,
      has_schedule_access: true,
      has_practice_access: true,
      has_drill_access: true,
      has_waj_access: true,
      has_journal_access: true,
      has_flagged_access: true,
      has_chat_access: true,
      has_export_access: true,
      has_ta_access: true,
      has_activity_access: true,
      is_admin: false,
      loading: false,
    };
  });

  it("shows the student Messages and Tasks tabs with real unread badges", () => {
    mockConversations = [makeConversation({ unread: true })];
    mockNotifications = [makeNotification({ id: "notif-1", read: false })];

    renderSidecar();

    expect(screen.getByRole("button", { name: "Messages, 1 unread" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tasks, 1 unread" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Study Partner" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Inbox" })).not.toBeInTheDocument();
  });

  it("does not render the student AI assistant or study partner composer", () => {
    renderSidecar();

    expect(screen.queryByText("Chat 1")).not.toBeInTheDocument();
    expect(screen.queryByText("AI assistant")).not.toBeInTheDocument();
    expect(screen.queryByText("Study Partner")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("How can I help?")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New conversation" })).not.toBeInTheDocument();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("renders the real Joshua thread in student Messages mode", () => {
    mockConversations = [makeConversation()];

    renderSidecar();

    expect(screen.getByText(/Conversation thread-1 compact .*student-facing/)).toBeInTheDocument();
  });

  it("shows an honest empty Messages state with the starter composer when no thread exists", () => {
    renderSidecar();

    expect(screen.getByText("No messages yet. Send Joshua a message here.")).toBeInTheDocument();
    expect(screen.getByText("Composer none student-facing")).toBeInTheDocument();
  });

  it("renders do-this-next from classroom items and opens its resolved route", () => {
    mockClassroomItems = [makeClassroomItem()];

    renderSidecar();

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
    fireEvent.click(screen.getByRole("button", { name: /Flaw homework/ }));

    expect(mockNavigate).toHaveBeenCalledWith("/classroom/homework-1");
  });

  it("renders fallback assigned work when classroom items are absent", () => {
    mockStudentAssignments = [makeStudentAssignment()];
    mockStudentTAAssignments = [makeStudentTAAssignment()];

    renderSidecar();

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));

    expect(screen.getByText("Assumption set")).toBeInTheDocument();
    expect(screen.getByText("Review this explanation")).toBeInTheDocument();
  });

  it("renders permission-gated task commands", () => {
    mockPermissions = {
      ...mockPermissions,
      has_schedule_access: false,
      has_activity_access: false,
      has_journal_access: false,
      has_waj_access: false,
    };

    renderSidecar();

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
    fireEvent.click(screen.getByRole("button", { name: "Assigned work" }));

    expect(mockNavigate).toHaveBeenCalledWith("/classroom");
    expect(screen.queryByRole("button", { name: "Schedule" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activity Centre" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Journal" })).not.toBeInTheDocument();
  });

  it("routes message notifications into inbox mode instead of navigating away", () => {
    mockConversations = [makeConversation()];
    mockNotifications = [
      makeNotification({
        id: "notif-message",
        type: "message",
        title: "Joshua replied",
        link: "/inbox/thread-1",
      }),
    ];

    renderSidecar();

    fireEvent.click(screen.getByRole("button", { name: "Tasks, 1 unread" }));
    fireEvent.click(screen.getByRole("button", { name: /Joshua replied/ }));

    expect(mockMarkRead).toHaveBeenCalledWith("notif-message");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText(/Conversation thread-1 compact .*student-facing/)).toBeInTheDocument();
  });

  it("shows LSAT U student messaging under the admin Messages tab", () => {
    mockIsAdmin = true;

    renderSidecar();

    expect(screen.getByRole("button", { name: "Messages" })).toBeInTheDocument();
    expect(screen.getByText("Pick a student to reply.")).toBeInTheDocument();
    expect(screen.queryByText("Gmail panel")).not.toBeInTheDocument();
  });

  it("opens Gmail only under the admin Inbox tab", () => {
    mockIsAdmin = true;
    mockConversations = [makeConversation()];

    renderSidecar();

    fireEvent.click(screen.getByRole("button", { name: "Inbox" }));

    expect(screen.getByText("Gmail panel")).toBeInTheDocument();
    expect(screen.queryByText("Pick a student to reply.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Conversation thread-1/)).not.toBeInTheDocument();
  });

  it("navigates route-backed notifications to their linked destination", () => {
    mockNotifications = [
      makeNotification({
        id: "notif-route",
        type: "assignment",
        title: "Open drill",
        link: "/drill/123",
      }),
    ];

    renderSidecar();

    fireEvent.click(screen.getByRole("button", { name: "Tasks, 1 unread" }));
    fireEvent.click(screen.getByRole("button", { name: /Open drill/ }));

    expect(mockMarkRead).toHaveBeenCalledWith("notif-route");
    expect(mockNavigate).toHaveBeenCalledWith("/drill/123");
  });
});
