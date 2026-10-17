import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Inbox from "./Inbox";

const ADMIN_ID = "admin-1";
const STUDENT_ID = "student-1";

let currentUserId = STUDENT_ID;
let isAdmin = false;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: currentUserId }, authReady: true }),
}));

vi.mock("@/hooks/useUserPermissions", () => ({
  useUserPermissions: () => ({ loading: false, is_admin: isAdmin, has_chat_access: true }),
}));

const joshuaThread = {
  id: "conv-joshua",
  subject: null,
  created_by: ADMIN_ID,
  created_at: "2026-01-01T00:00:00Z",
  last_message_at: "2026-01-02T00:00:00Z",
  participants: [
    { id: "p1", conversation_id: "conv-joshua", user_id: STUDENT_ID, last_read_at: "2026-01-01T00:00:00Z", is_admin: false },
    { id: "p2", conversation_id: "conv-joshua", user_id: ADMIN_ID, last_read_at: "2026-01-02T00:00:00Z", is_admin: true },
  ],
  last_message: { body: "hi", created_at: "2026-01-02T00:00:00Z", sender_id: ADMIN_ID },
  unread: true,
  hasAttachments: false,
};

vi.mock("@/hooks/useInbox", () => ({
  useInbox: () => ({
    conversations: [joshuaThread],
    loading: false,
    error: null,
    unreadCount: 1,
    refresh: vi.fn(),
    deleteConversation: vi.fn(),
  }),
}));

// The surface under test is which pane renders, not how either pane draws, so
// both are stubbed down to a marker.
vi.mock("@/components/inbox/ConversationView", () => ({
  ConversationView: ({ onBack }: { onBack?: () => void }) => (
    <div data-testid="conversation">{onBack ? "has-back" : "no-back"}</div>
  ),
}));

vi.mock("@/components/inbox/ThreadList", () => ({
  ThreadList: () => <div data-testid="thread-list" />,
  ThreadListSkeleton: () => <div data-testid="thread-skeleton" />,
}));

vi.mock("@/components/inbox/NewConversationDialog", () => ({
  NewConversationDialog: () => <div />,
}));

function PathProbe() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}

function renderInbox(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <PathProbe />
      <Routes>
        <Route path="/inbox/*" element={<Inbox />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Inbox", () => {
  it("gives a student the admin thread itself, with no list and no URL bounce", () => {
    currentUserId = STUDENT_ID;
    isAdmin = false;
    renderInbox("/inbox");

    expect(screen.getByTestId("conversation")).toBeTruthy();
    expect(screen.queryByTestId("thread-list")).toBeNull();
    // The thread is the destination, so there is nothing to go back to.
    expect(screen.getByTestId("conversation").textContent).toBe("no-back");
    // Resolved in place: no redirect to /inbox/:id.
    expect(screen.getByTestId("path").textContent).toBe("/inbox");
  });

  it("still lands an admin on the thread list", () => {
    currentUserId = ADMIN_ID;
    isAdmin = true;
    renderInbox("/inbox");

    expect(screen.getByTestId("thread-list")).toBeTruthy();
    expect(screen.queryByTestId("conversation")).toBeNull();
  });

  it("opens the routed thread for an admin, with a way back to the list", () => {
    currentUserId = ADMIN_ID;
    isAdmin = true;
    renderInbox("/inbox/conv-joshua");

    expect(screen.getByTestId("conversation").textContent).toBe("has-back");
  });
});
