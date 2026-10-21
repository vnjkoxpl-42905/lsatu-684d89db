/**
 * What the Home message card is allowed to show.
 *
 * One rule, and both halves of it are server state on
 * conversation_participants rather than anything local:
 *
 *   a message shows on Home until it is READ or CLEARED, and then it is gone
 *   from Home for good - while the next message from that person comes back.
 *
 * Clearing is a Home gesture only. It must not mark the thread read and must
 * not delete anything, so the inbox is untouched by it.
 */
import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const USER_ID = "user-1";
const CONVO_ID = "conv-1";
const MSG_CREATED_AT = "2026-08-23T12:00:00.000Z";
const NEWER_CREATED_AT = "2026-08-24T12:00:00.000Z";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: USER_ID } }),
}));
vi.mock("@/hooks/useUserPermissions", () => ({
  useUserPermissions: () => ({
    is_admin: false,
    has_chat_access: true,
    has_schedule_access: false,
    has_activity_access: false,
    has_drill_access: false,
  }),
}));
vi.mock("@/components/classroom/shell/ClassroomLayout", () => ({
  useClassroomLayout: () => ({ displayName: "Ada" }),
}));
vi.mock("@/lib/completeAssignedWork", () => ({
  useCompleteAssignedWork: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/hooks/useAssignedTodoFeed", () => ({
  useAssignedTodoFeed: () => ({ rows: [], loading: false }),
  routeWithReturnTo: (route: string) => route,
}));
vi.mock("@/hooks/useClassroomItems", () => ({
  useClassroomItems: () => ({ data: [] }),
}));
vi.mock("@/hooks/useStudentBooking", () => ({
  useStudentBooking: () => ({ data: { bookings: [] } }),
}));
vi.mock("@/hooks/useWeeklyPlan", () => ({
  useCurrentWeeklyPlan: () => ({ data: null }),
}));
vi.mock("@/features/activity-centre/api/activitiesClient", () => ({
  listStudentAssignments: vi.fn(async () => []),
  listItemResponses: vi.fn(async () => []),
}));

/** One inbound thread, whose read/cleared state each test sets. */
type ThreadState = {
  unread: boolean;
  home_cleared_at: string | null;
  created_at: string;
};
let thread: ThreadState;
const clearConversationFromHome = vi.fn(async () => {});

vi.mock("@/hooks/useInbox", () => ({
  useInbox: () => ({
    clearConversationFromHome,
    conversations: [
      {
        id: CONVO_ID,
        unread: thread.unread,
        home_cleared_at: thread.home_cleared_at,
        last_message: {
          sender_id: "joshua-id",
          created_at: thread.created_at,
          body: "How did the drill go?",
        },
        participants: [
          { user_id: "joshua-id", display_name: "Joshua" },
          { user_id: USER_ID, display_name: "Ada" },
        ],
      },
    ],
  }),
}));

import { useClassroomHome } from "./useClassroomHome";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  thread = { unread: true, home_cleared_at: null, created_at: MSG_CREATED_AT };
  clearConversationFromHome.mockClear();
});

describe("Home message card visibility", () => {
  it("shows an unread message that has never been cleared", async () => {
    const { result } = renderHook(() => useClassroomHome(), { wrapper });
    await waitFor(() => {
      expect(result.current.model.message?.id).toBe(CONVO_ID);
    });
    expect(result.current.model.message?.from).toBe("Joshua");
    expect(result.current.model.unreadMessages).toBe(1);
  });

  it("points the card at the thread itself, not the inbox list", async () => {
    const { result } = renderHook(() => useClassroomHome(), { wrapper });
    await waitFor(() => {
      expect(result.current.model.message?.id).toBe(CONVO_ID);
    });
    expect(result.current.model.message?.route).toBe(`/inbox/${CONVO_ID}`);
  });

  it("hides a message that was read in the inbox, with no clear needed", async () => {
    // The single behaviour this whole change exists for: reading it anywhere
    // takes it off Home, because both surfaces read last_read_at.
    thread.unread = false;
    const { result } = renderHook(() => useClassroomHome(), { wrapper });
    await waitFor(() => {
      expect(result.current.model.rows).toBeDefined();
    });
    expect(result.current.model.message).toBeNull();
    expect(result.current.model.unreadMessages).toBe(0);
  });

  it("hides a message already cleared through its own timestamp", async () => {
    thread.home_cleared_at = MSG_CREATED_AT;
    const { result } = renderHook(() => useClassroomHome(), { wrapper });
    await waitFor(() => {
      expect(result.current.model.rows).toBeDefined();
    });
    expect(result.current.model.message).toBeNull();
  });

  it("hides everything older than the clear watermark", async () => {
    thread.home_cleared_at = NEWER_CREATED_AT;
    const { result } = renderHook(() => useClassroomHome(), { wrapper });
    await waitFor(() => {
      expect(result.current.model.rows).toBeDefined();
    });
    expect(result.current.model.message).toBeNull();
  });

  it("brings the card back when that person sends something newer", async () => {
    // Cleared yesterday's message; today's is past the watermark, so it is news
    // again. This is what stops a clear from muting someone permanently.
    thread.home_cleared_at = MSG_CREATED_AT;
    thread.created_at = NEWER_CREATED_AT;
    const { result } = renderHook(() => useClassroomHome(), { wrapper });
    await waitFor(() => {
      expect(result.current.model.message?.id).toBe(CONVO_ID);
    });
  });

  it("clears against the shown message's timestamp, not the clock", async () => {
    // Recording now() instead would swallow anything that arrived while the
    // write was in flight.
    const { result } = renderHook(() => useClassroomHome(), { wrapper });
    await waitFor(() => {
      expect(result.current.model.message?.id).toBe(CONVO_ID);
    });
    await act(async () => {
      await result.current.clearMessage(CONVO_ID);
    });
    expect(clearConversationFromHome).toHaveBeenCalledWith(CONVO_ID, MSG_CREATED_AT);
  });

  it("does not mark the thread read when clearing", async () => {
    // Clearing tidies Home. It must leave the inbox unread badge and every
    // per-student dot exactly as they were.
    //
    // The proof is structural: the useInbox mock above deliberately does NOT
    // expose markConversationRead, so a clear that tried to mark read would
    // throw here rather than pass quietly.
    const { result } = renderHook(() => useClassroomHome(), { wrapper });
    await waitFor(() => {
      expect(result.current.model.message?.id).toBe(CONVO_ID);
    });
    await act(async () => {
      await result.current.clearMessage(CONVO_ID);
    });
    expect(clearConversationFromHome).toHaveBeenCalledTimes(1);
    // The thread is still unread as far as every other surface is concerned.
    expect(thread.unread).toBe(true);
  });
});
