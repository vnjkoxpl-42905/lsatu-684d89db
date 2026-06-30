import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Conversation } from "@/hooks/useInbox";
import type { Notification } from "@/hooks/useNotifications";
import { TooltipProvider } from "@/components/ui/tooltip";
import StudySidecar from "./StudySidecar";

const {
  mockNavigate,
  mockSetActiveTabId,
  mockAddTab,
  mockSend,
  mockRefreshInbox,
  mockMarkRead,
  mockMarkAllRead,
  mockStartJoshuaConversation,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSetActiveTabId: vi.fn(),
  mockAddTab: vi.fn(),
  mockSend: vi.fn(),
  mockRefreshInbox: vi.fn(),
  mockMarkRead: vi.fn(),
  mockMarkAllRead: vi.fn(),
  mockStartJoshuaConversation: vi.fn(),
}));

let mockConversations: Conversation[] = [];
let mockNotifications: Notification[] = [];
let inboxLoading = false;
let notificationsLoading = false;
let notificationsError: string | null = null;

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

vi.mock("@/hooks/useStudyChat", () => ({
  useStudyChat: () => ({
    tabs: [{ id: "chat-1", label: "Chat 1", messages: [] }],
    activeTabId: "chat-1",
    setActiveTabId: mockSetActiveTabId,
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

vi.mock("@/lib/joshuaThread", () => ({
  startJoshuaConversation: mockStartJoshuaConversation,
}));

vi.mock("@/components/inbox/ConversationView", () => ({
  ConversationView: ({
    conversation,
    compact,
    emptyStateLabel,
  }: {
    conversation: Conversation;
    compact?: boolean;
    emptyStateLabel?: string;
  }) => (
    <div>
      Conversation {conversation.id} {compact ? "compact" : "full"} {emptyStateLabel ?? ""}
    </div>
  ),
}));

vi.mock("@/components/inbox/MessageComposer", () => ({
  MessageComposer: ({
    conversationId,
  }: {
    conversationId: string | null;
  }) => <div>Composer {conversationId ?? "none"}</div>,
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
    mockSetActiveTabId.mockReset();
    mockAddTab.mockReset();
    mockSend.mockReset();
    mockRefreshInbox.mockReset();
    mockMarkRead.mockReset();
    mockMarkAllRead.mockReset();
    mockStartJoshuaConversation.mockReset();
    mockConversations = [];
    mockNotifications = [];
    inboxLoading = false;
    notificationsLoading = false;
    notificationsError = null;
  });

  it("shows mode tabs with real unread badges", () => {
    mockConversations = [makeConversation({ unread: true })];
    mockNotifications = [makeNotification({ id: "notif-1", read: false })];

    renderSidecar();

    expect(screen.getByRole("button", { name: "Chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inbox, 1 unread" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Notifications, 1 unread" }),
    ).toBeInTheDocument();
  });

  it("renders the real inbox thread in inbox mode", () => {
    mockConversations = [makeConversation()];

    renderSidecar();

    fireEvent.click(screen.getByRole("button", { name: "Inbox" }));

    expect(screen.getByText(/Conversation thread-1 compact/)).toBeInTheDocument();
  });

  it("shows an honest empty inbox state with the starter composer when no thread exists", () => {
    renderSidecar();

    fireEvent.click(screen.getByRole("button", { name: "Inbox" }));

    expect(screen.getByText("No messages yet. Send Joshua a message here.")).toBeInTheDocument();
    expect(screen.getByText("Composer none")).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: "Notifications, 1 unread" }));
    fireEvent.click(screen.getByRole("button", { name: /Joshua replied/ }));

    expect(mockMarkRead).toHaveBeenCalledWith("notif-message");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText(/Conversation thread-1 compact/)).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: "Notifications, 1 unread" }));
    fireEvent.click(screen.getByRole("button", { name: /Open drill/ }));

    expect(mockMarkRead).toHaveBeenCalledWith("notif-route");
    expect(mockNavigate).toHaveBeenCalledWith("/drill/123");
  });
});
