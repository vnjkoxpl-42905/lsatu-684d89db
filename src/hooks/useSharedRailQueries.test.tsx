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
let taFailure = false;
const rows = {
  notifications: [] as Array<Record<string, unknown>>,
  homework_assignments: [] as Array<Record<string, unknown>>,
  ta_assignments: [] as Array<Record<string, unknown>>,
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: keyof typeof rows) => {
      const chain: Record<string, unknown> = {};
      const result = () => Promise.resolve(table === 'ta_assignments' && taFailure
        ? { data: null, error: new Error('TA read failed') }
        : { data: rows[table], error: null });
      chain.select = (_columns?: string, options?: { count?: string }) => {
        if (options?.count) {
          chain.then = (onOk: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null, count: rows[table].filter((row) => !row.read).length }).then(onOk);
        } else reads.push(table);
        return chain;
      };
      let update: Record<string, unknown> | undefined;
      const filters: Array<[string, unknown]> = [];
      chain.update = (value: Record<string, unknown>) => { update = value; return chain; };
      chain.eq = (key: string, value: unknown) => { filters.push([key, value]); return chain; };
      chain.order = () => chain;
      chain.limit = () => result();
      chain.then = (onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) =>
        Promise.resolve().then(() => {
          if (update) rows[table].forEach((row) => {
            if (filters.every(([key, value]) => row[key] === value)) Object.assign(row, update);
          });
          return result();
        }).then(onOk, onErr);
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
const { useStudentAssignments, useStudentTAAssignments, useAdminTAAssignmentsForStudent } = await import(
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
  taFailure = false;
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

  it('keeps only the selected student\'s cached TA rows after a failed refresh', async () => {
    const wrapper = makeWrapper();
    const view = renderHook(({ studentId }) => useAdminTAAssignmentsForStudent(studentId), {
      wrapper,
      initialProps: { studentId: 'student-a' },
    });
    await waitFor(() => expect(view.result.current.assignments.map((row) => row.id)).toEqual(['t1', 't2']));

    taFailure = true;
    await view.result.current.refresh();
    await waitFor(() => expect(view.result.current.error).toBe('TA read failed'));
    expect(view.result.current.assignments.map((row) => row.id)).toEqual(['t1', 't2']);

    view.rerender({ studentId: 'student-b' });
    expect(view.result.current.assignments).toEqual([]);
  });
});
