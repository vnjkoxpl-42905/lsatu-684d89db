/**
 * Homepage message-card dismissal persistence.
 *
 * Clearing a message off Home must stick for the account, not the browser:
 * the dismissed list lives in a per-user bootcamp_kv row, merged in on load
 * (another device, a cleared cache, a fresh login) and rewritten on every
 * change. localStorage is only the instant read cache.
 */
import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const USER_ID = "user-1";
const CONVO_ID = "conv-1";
const MSG_CREATED_AT = "2026-08-23T12:00:00.000Z";
const DISMISS_KEY = `${CONVO_ID}:${MSG_CREATED_AT}`;

// ── supabase client mock ────────────────────────────────────────────────────
const maybeSingle = vi.fn();
const upsert = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => {
      const query: Record<string, unknown> = {};
      query.select = vi.fn(() => query);
      query.eq = vi.fn(() => query);
      query.maybeSingle = maybeSingle;
      query.upsert = upsert;
      return query;
    }),
  },
}));

// ── hook dependency mocks ───────────────────────────────────────────────────
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

const markConversationRead = vi.fn(async () => {});
vi.mock("@/hooks/useInbox", () => ({
  useInbox: () => ({
    unreadCount: 1,
    markConversationRead,
    conversations: [
      {
        id: CONVO_ID,
        unread: true,
        last_message: {
          sender_id: "joshua-id",
          created_at: MSG_CREATED_AT,
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
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  maybeSingle.mockReset();
  upsert.mockReset();
  upsert.mockResolvedValue({ error: null });
  markConversationRead.mockClear();
});

describe("useClassroomHome dismissed messages", () => {
  it("shows the coach's latest message when nothing is dismissed", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useClassroomHome(), { wrapper });
    await waitFor(() => expect(result.current.model.message).not.toBeNull());
    expect(result.current.model.message?.body).toBe("How did the drill go?");
  });

  it("hides a message already dismissed in the cloud, even with a cold local cache", async () => {
    maybeSingle.mockResolvedValue({
      data: { data: { keys: [DISMISS_KEY] } },
      error: null,
    });
    const { result } = renderHook(() => useClassroomHome(), { wrapper });
    // The cloud merge is async: the card may render once from the empty local
    // cache, then must drop the message once the account's row arrives.
    await waitFor(() => expect(result.current.model.message).toBeNull());
  });

  it("persists a dismissal to localStorage and the account's cloud row", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useClassroomHome(), { wrapper });
    await waitFor(() => expect(result.current.model.message).not.toBeNull());

    await act(async () => {
      await result.current.clearMessage(CONVO_ID);
    });

    expect(result.current.model.message).toBeNull();
    expect(markConversationRead).toHaveBeenCalledWith(CONVO_ID);

    const stored = window.localStorage.getItem(
      `classroom-home:cleared-messages:${USER_ID}`,
    );
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toContain(DISMISS_KEY);

    await waitFor(() =>
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_ID,
          table_name: "home_message_dismissals",
          record_id: USER_ID,
          data: { keys: expect.arrayContaining([DISMISS_KEY]) },
        }),
        { onConflict: "user_id,table_name,record_id" },
      ),
    );
  });

  it("keeps the dismissal after a remount (refresh) from localStorage alone", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    window.localStorage.setItem(
      `classroom-home:cleared-messages:${USER_ID}`,
      JSON.stringify([DISMISS_KEY]),
    );
    const { result } = renderHook(() => useClassroomHome(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.model.message).toBeNull();
  });
});
