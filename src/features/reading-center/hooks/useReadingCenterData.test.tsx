import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { usePassages, useSaveProgress, useUpdateBookmark } from "./useReadingCenterData";

const state = vi.hoisted(() => ({ userId: "student-a", calls: [] as unknown[][], error: null as { message: string } | null, toast: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: state.userId } }) }));
vi.mock("sonner", () => ({ toast: { error: state.toast } }));

function request(table: string) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "order", "eq", "or", "upsert", "update", "single", "maybeSingle"]) {
    builder[method] = (...args: unknown[]) => { state.calls.push([table, method, ...args]); return builder; };
  }
  builder.then = (resolve: (result: unknown) => unknown) => Promise.resolve(resolve({ data: [], error: state.error }));
  return builder;
}
vi.mock("../lib/db", () => ({ rcDb: (table: string) => request(table) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => request(table) } }));

function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { client, wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> };
}

beforeEach(() => { state.userId = "student-a"; state.calls = []; state.error = null; state.toast.mockClear(); });

describe("Reading Center Supabase adapters", () => {
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
