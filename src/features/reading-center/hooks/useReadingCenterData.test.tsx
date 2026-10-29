import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { usePassages, useSaveProgress, useUpdateBookmark, useReadingProfile, useSessions, useRecordSession } from "./useReadingCenterData";
import type { ReadingSession } from "../lib/types";

const state = vi.hoisted(() => ({ userId: "student-a", calls: [] as unknown[][], error: null as { message: string } | null, dataByTable: {} as Record<string, unknown>, responses: [] as { data: unknown; error: { message: string } | null }[], toast: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: state.userId, email: "student@example.com", user_metadata: { display_name: "Canonical Metadata Name", full_name: "Stale Alternate Name" } } }) }));
vi.mock("sonner", () => ({ toast: { error: state.toast } }));

function request(table: string) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "order", "eq", "or", "gte", "upsert", "update", "single", "maybeSingle"]) {
    builder[method] = (...args: unknown[]) => { state.calls.push([table, method, ...args]); return builder; };
  }
  builder.then = (resolve: (result: unknown) => unknown) => Promise.resolve(resolve(state.responses.shift() ?? { data: Object.prototype.hasOwnProperty.call(state.dataByTable, table) ? state.dataByTable[table] : [], error: state.error }));
  return builder;
}
vi.mock("../lib/db", () => ({ rcDb: (table: string) => request(table) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => request(table) } }));

function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { client, wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> };
}

beforeEach(() => { state.userId = "student-a"; state.calls = []; state.error = null; state.dataByTable = {}; state.responses = []; state.toast.mockClear(); });

describe("Reading Center Supabase adapters", () => {
  it("uses the LSAT U account name rather than a separate Reading Center alias", async () => {
    state.dataByTable.profiles = { display_name: "Actual LSAT U Name" };
    const { wrapper } = harness();
    const hook = renderHook(() => useReadingProfile(), { wrapper });
    await waitFor(() => expect(hook.result.current.data).toBe("Actual LSAT U Name"));
    expect(state.calls).toContainEqual(["profiles", "eq", "class_id", "student-a"]);
    expect(state.calls.some(([table]) => table === "reading_center_profile")).toBe(false);
  });
  it("falls back to the canonical auth display_name when no profile row has been provisioned", async () => {
    state.dataByTable.profiles = null;
    const { wrapper } = harness();
    const hook = renderHook(() => useReadingProfile(), { wrapper });
    await waitFor(() => expect(hook.result.current.data).toBe("Canonical Metadata Name"));
  });
  it("queries reading analytics only for the signed-in account", async () => {
    const { wrapper } = harness();
    const hook = renderHook(() => useSessions("2026-10-01T00:00:00Z"), { wrapper });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(state.calls).toContainEqual(["reading_center_sessions", "eq", "user_id", "student-a"]);
  });
  it("confirms an interrupted session write by the same user's exact stable ID without duplicating it", async () => {
    const visit: ReadingSession = { id: "visit", passage_id: "text", reading_mode: "serial", wpm: 200, words_read: 20, active_ms: 6000, paused_ms: 0, started_at: "2026-10-14T12:00:00Z", ended_at: "2026-10-14T12:00:06Z" };
    state.responses = [{ data: null, error: { message: "Connection lost after commit" } }, { data: { ...visit, user_id: "student-a" }, error: null }];
    const { wrapper } = harness();
    const hook = renderHook(() => useRecordSession(), { wrapper });
    await act(async () => { await hook.result.current.mutateAsync(visit); });
    expect(state.calls).toContainEqual(["reading_center_sessions", "upsert", { ...visit, user_id: "student-a" }, { onConflict: "id", ignoreDuplicates: true }]);
    expect(state.calls).toContainEqual(["reading_center_sessions", "eq", "user_id", "student-a"]);
  });
  it("does not reuse the preceding student's cached library after an account switch", async () => {
    const { client, wrapper } = harness();
    const hook = renderHook(() => usePassages(), { wrapper });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    state.userId = "student-b";
    hook.rerender();
    await waitFor(() => expect(client.getQueryState(["reading-center", "student-b", "passages", false])?.status).toBe("success"));
    expect(state.calls).toContainEqual(["reading_center_passage_metadata", "eq", "user_id", "student-b"]);
    expect(state.calls).toContainEqual(["reading_center_passages", "or", "owner_id.is.null,owner_id.eq.student-b"]);
    expect(client.getQueryData(["reading-center", "student-a", "passages", false])).toEqual([]);
  });
  it("rejects an RLS-filtered bookmark update instead of reporting it saved", async () => {
    state.error = { message: "Cannot coerce the result to a single JSON object" };
    const { wrapper } = harness();
    const hook = renderHook(() => useUpdateBookmark(), { wrapper });
    await act(async () => { await expect(hook.result.current.mutateAsync({ id: "other-account-bookmark", note: "Test" })).rejects.toThrow("single JSON object"); });
    expect(state.calls).toContainEqual(["reading_center_bookmarks", "eq", "user_id", "student-a"]);
    expect(state.calls).toContainEqual(["reading_center_bookmarks", "single"]);
    expect(state.toast).toHaveBeenCalled();
  });
  it("waits for confirmed completion and starts only the caller's assigned library item", async () => {
    const { wrapper } = harness();
    const hook = renderHook(() => useSaveProgress(), { wrapper });
    await act(async () => { await hook.result.current.mutateAsync({ passage_id: "shared", word_index: 12, completed: true }); });
    expect(state.calls).toContainEqual(["reading_center_progress", "single"]);
    expect(state.calls).toContainEqual(["classroom_items", "eq", "student_id", "student-a"]);
    expect(state.calls).toContainEqual(["classroom_items", "eq", "status", "assigned"]);
    expect(state.calls).toContainEqual(["classroom_items", "update", { status: "in_progress" }]);
    expect(state.calls.some((call) => call[0] === "classroom_items" && call[1] === "update" && (call[2] as { status: string }).status === "completed")).toBe(false);
  });
});
