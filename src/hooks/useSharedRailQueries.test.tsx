import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// The drill hub mounts the Classroom rail and the Today focus, and both ask
// for notifications, homework assignments and TA assignments. These tests pin
// the contract that made the hub read each table twice: two mounts of the
// same hook must produce one read, and a mutation on one mount must be seen
// by the other.

const reads: string[] = [];
const rows = {
  notifications: [] as Array<Record<string, unknown>>,
  homework_assignments: [] as Array<Record<string, unknown>>,
  ta_assignments: [] as Array<Record<string, unknown>>,
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: keyof typeof rows) => {
      const chain: Record<string, unknown> = {};
      const result = () => Promise.resolve({ data: rows[table], error: null });
      chain.select = () => {
        reads.push(table);
        return chain;
      };
      chain.update = () => chain;
      chain.eq = () => chain;
      chain.order = () => chain;
      chain.limit = () => result();
      chain.then = (onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) =>
        result().then(onOk, onErr);
      return chain;
    },
    channel: () => {
      const ch = { on: () => ch, subscribe: () => ch };
      return ch;
    },
    removeChannel: () => undefined,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "student-1" } }),
}));

const { useNotifications } = await import("./useNotifications");
const { useStudentAssignments, useStudentTAAssignments } = await import(
  "./useStudentAssignments"
);

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

beforeEach(() => {
  reads.length = 0;
  rows.notifications = [
    { id: "n1", user_id: "student-1", type: "reminder", title: "Hi", read: false, created_at: "2026-09-10T00:00:00Z" },
    { id: "n2", user_id: "student-1", type: "reminder", title: "Yo", read: true, created_at: "2026-09-09T00:00:00Z" },
  ];
  rows.homework_assignments = [
    { id: "h1", status: "completed", created_at: "2026-09-10T00:00:00Z" },
    { id: "h2", status: "assigned", created_at: "2026-09-08T00:00:00Z" },
    { id: "h3", status: "in_progress", created_at: "2026-09-01T00:00:00Z" },
  ];
  rows.ta_assignments = [
    { id: "t1", status: "completed", assigned_at: "2026-09-10T00:00:00Z" },
    { id: "t2", status: "assigned", assigned_at: "2026-09-08T00:00:00Z" },
  ];
});

describe("shared rail queries", () => {
  it("two mounts of useNotifications share one read and one cache", async () => {
    const wrapper = makeWrapper();
    const rail = renderHook(() => useNotifications(), { wrapper });
    const today = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(rail.result.current.loading).toBe(false));
    await waitFor(() => expect(today.result.current.loading).toBe(false));

    expect(reads.filter((t) => t === "notifications")).toHaveLength(1);
    expect(rail.result.current.unreadCount).toBe(1);
    expect(today.result.current.unreadCount).toBe(1);

    await today.result.current.markRead("n1");
    await waitFor(() => expect(rail.result.current.unreadCount).toBe(0));
  });

  it("two mounts of useStudentAssignments share one read, sorted by status", async () => {
    const wrapper = makeWrapper();
    const rail = renderHook(() => useStudentAssignments(), { wrapper });
    const today = renderHook(() => useStudentAssignments(), { wrapper });

    await waitFor(() => expect(rail.result.current.loading).toBe(false));
    await waitFor(() => expect(today.result.current.loading).toBe(false));

    expect(reads.filter((t) => t === "homework_assignments")).toHaveLength(1);
    expect(rail.result.current.assignments.map((a) => a.id)).toEqual(["h3", "h2", "h1"]);
    expect(today.result.current.assignments).toBe(rail.result.current.assignments);
  });

  it("two mounts of useStudentTAAssignments share one read, sorted by status", async () => {
    const wrapper = makeWrapper();
    const rail = renderHook(() => useStudentTAAssignments(), { wrapper });
    const today = renderHook(() => useStudentTAAssignments(), { wrapper });

    await waitFor(() => expect(rail.result.current.loading).toBe(false));
    await waitFor(() => expect(today.result.current.loading).toBe(false));

    expect(reads.filter((t) => t === "ta_assignments")).toHaveLength(1);
    expect(rail.result.current.assignments.map((a) => a.id)).toEqual(["t2", "t1"]);
  });

  it("refresh re-reads once for every mount", async () => {
    const wrapper = makeWrapper();
    const rail = renderHook(() => useStudentAssignments(), { wrapper });
    renderHook(() => useStudentAssignments(), { wrapper });
    await waitFor(() => expect(rail.result.current.loading).toBe(false));

    await rail.result.current.refresh();
    expect(reads.filter((t) => t === "homework_assignments")).toHaveLength(2);
  });
});
