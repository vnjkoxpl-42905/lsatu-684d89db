import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ owner: "student-a", actor: "student-a", switchAfterRead: false, rows: [] as unknown[], writes: [] as unknown[], reads: [] as string[], nextWrite: null as null | unknown, failRead: false, onWrite: null as null | (() => void) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: state.owner } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: async () => ({ data: { user: { id: state.actor } }, error: null }) }, from: () => {
  let writing = false;
  let owner = "";
  let payload: unknown;
  const chain = {
    select: () => chain,
    update: (value: unknown) => { writing = true; payload = value; return chain; },
    eq: (_key: string, value: string) => { owner = value; return chain; },
    is: () => chain,
    filter: () => chain,
    maybeSingle: async () => {
      if (writing) {
        state.writes.push(payload);
        state.onWrite?.();
        if (state.nextWrite !== null) return state.nextWrite;
        // Persist like the database would, so a later read sees this write.
        const row = state.rows.find((candidate: { class_id: string }) => candidate.class_id === owner) as { layout_prefs: unknown } | undefined;
        if (row) row.layout_prefs = (payload as { layout_prefs: unknown }).layout_prefs;
        return { data: { class_id: owner, ...(payload as object) }, error: null };
      }
      state.reads.push(owner);
      if (state.switchAfterRead) state.actor = "admin-b";
      if (state.failRead) return { data: null, error: new Error("offline") };
      return { data: state.rows.find((row: { class_id: string }) => row.class_id === owner) ?? null, error: null };
    },
  };
  return chain;
} } }));
import { useRailPrefs } from "./useRailPrefs";
const current = { order: { classroom: ["review", "home"] }, hidden: ["schedule"] };
function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...renderHook(() => useRailPrefs(), { wrapper }) };
}
beforeEach(() => {
  state.owner = "student-a";
  state.actor = "student-a";
  state.switchAfterRead = false;
  state.rows = [{ class_id: "student-a", layout_prefs: { unrelated: "keep", classroom_rail_v2: current } }];
  state.writes = [];
  state.reads = [];
  state.failRead = false;
  state.nextWrite = null;
  state.onWrite = null;
});
describe("acknowledged sidebar preferences", () => {
  it("rejects a prior-owner callback before read or write when the current actor is another account", async () => {
    const hook = harness();
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
    state.reads = [];
    state.actor = "admin-b";
    await act(async () => { await expect(hook.result.current.save({ order: {}, hidden: [] })).rejects.toThrow("account changed"); });
    expect(state.reads).toHaveLength(0);
    expect(state.writes).toHaveLength(0);
    expect(hook.client.getQueryData(["rail-prefs", "student-a"])).toEqual(current);
  });
  it("does not send a preference write after the actor changes during the authoritative read", async () => {
    const hook = harness();
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
    state.switchAfterRead = true;
    await act(async () => { await expect(hook.result.current.save({ order: {}, hidden: [] })).rejects.toThrow("account changed"); });
    expect(state.writes).toHaveLength(0);
    expect(hook.client.getQueryData(["rail-prefs", "student-a"])).toEqual(current);
  });
  it("refuses legacy migration under a different authenticated actor", async () => {
    state.actor = "admin-b";
    state.rows = [{ class_id: "student-a", layout_prefs: { classroom_rail: { hidden: ["schedule"] } } }];
    const hook = harness();
    await waitFor(() => expect(hook.result.current.error).toBeTruthy());
    expect(state.reads).toHaveLength(0);
    expect(state.writes).toHaveLength(0);
    expect(hook.result.current.canSave).toBe(false);
  });
  it("does not permit editing before the authoritative read", async () => {
    const hook = harness();
    expect(hook.result.current.canSave).toBe(false);
    await expect(hook.result.current.save({ order: {}, hidden: [] })).rejects.toThrow("Load your saved");
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
    expect(state.writes).toHaveLength(0);
  });
  it("preserves unrelated settings and updates cache only after an owned acknowledgement", async () => {
    const hook = harness();
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
    await act(() => hook.result.current.save({ order: {}, hidden: ["library"] }));
    expect(state.writes[0]).toEqual({ layout_prefs: { unrelated: "keep", classroom_rail_v2: { order: {}, hidden: ["library"] } } });
    await waitFor(() => expect(hook.result.current.prefs.hidden).toEqual(["library"]));
  });
  it.each([
    { data: null, error: null },
    { data: { class_id: "foreign", layout_prefs: { classroom_rail_v2: { order: {}, hidden: [] } } }, error: null },
    { data: { class_id: "student-a", layout_prefs: { classroom_rail_v2: current } }, error: null },
  ])("rejects missing, foreign or mismatched write acknowledgement", async (response) => {
    const hook = harness();
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
    state.nextWrite = response;
    await act(async () => { await expect(hook.result.current.save({ order: {}, hidden: [] })).rejects.toThrow("not acknowledged"); });
    expect(hook.result.current.prefs).toEqual(current);
  });
  it("holds cached layout on failed refresh and blocks changes until retry succeeds", async () => {
    const hook = harness();
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
    state.failRead = true;
    await act(() => hook.result.current.retry());
    await waitFor(() => expect(hook.result.current.error).toBeTruthy());
    expect(hook.result.current.prefs).toEqual(current);
    expect(hook.result.current.canSave).toBe(false);
    state.failRead = false;
    await act(() => hook.result.current.retry());
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
  });
  it("does not treat a missing owner profile as authoritative defaults", async () => {
    state.rows = [];
    const hook = harness();
    await waitFor(() => expect(hook.result.current.error).toBeTruthy());
    expect(hook.result.current.canSave).toBe(false);
    expect(state.writes).toHaveLength(0);
  });
  it("requires acknowledged legacy migration before editing", async () => {
    state.rows = [{ class_id: "student-a", layout_prefs: { unrelated: "keep", classroom_rail: { hidden: ["schedule"] } } }];
    state.nextWrite = { data: null, error: null };
    const hook = harness();
    await waitFor(() => expect(hook.result.current.error).toBeTruthy());
    expect(hook.result.current.canSave).toBe(false);
    expect((state.writes[0] as { layout_prefs: object }).layout_prefs).toHaveProperty("unrelated", "keep");
  });
  it("switches owner caches without carrying the previous user's layout", async () => {
    const hook = harness();
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
    state.owner = "student-b";
    state.actor = "student-b";
    state.rows.push({ class_id: "student-b", layout_prefs: { classroom_rail_v2: { order: {}, hidden: ["practice"] } } });
    hook.rerender();
    expect(hook.result.current.canSave).toBe(false);
    expect(hook.result.current.prefs.hidden).toEqual([]);
    await waitFor(() => expect(hook.result.current.prefs.hidden).toEqual(["practice"]));
    expect(hook.client.getQueryData(["rail-prefs", "student-a"])).toEqual(current);
  });
  it("does not publish an optimistic layout while the write is pending", async () => {
    const hook = harness();
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
    let resolveWrite: (value: unknown) => void;
    state.nextWrite = new Promise((resolve) => { resolveWrite = resolve; });
    let pending: Promise<unknown>;
    act(() => { pending = hook.result.current.save({ order: {}, hidden: ["library"] }); });
    await waitFor(() => expect(hook.result.current.saving).toBe(true));
    expect(hook.result.current.prefs).toEqual(current);
    await act(async () => {
      resolveWrite({ data: { class_id: "student-a", layout_prefs: { classroom_rail_v2: { order: {}, hidden: ["library"] } } }, error: null });
      await pending;
    });
    await waitFor(() => expect(hook.result.current.prefs.hidden).toEqual(["library"]));
  });
  it("withholds a pending acknowledgement after an authenticated account switch", async () => {
    const hook = harness();
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
    let resolveWrite: (value: unknown) => void;
    state.nextWrite = new Promise((resolve) => { resolveWrite = resolve; });
    let pending: Promise<unknown>;
    act(() => { pending = hook.result.current.save({ order: {}, hidden: ["library"] }); });
    await waitFor(() => expect(hook.result.current.saving).toBe(true));
    state.owner = "student-b";
    state.actor = "student-b";
    state.rows.push({ class_id: "student-b", layout_prefs: { classroom_rail_v2: { order: {}, hidden: ["practice"] } } });
    hook.rerender();
    await waitFor(() => expect(hook.result.current.prefs.hidden).toEqual(["practice"]));
    await act(async () => {
      resolveWrite({ data: { class_id: "student-a", layout_prefs: { classroom_rail_v2: { order: {}, hidden: ["library"] } } }, error: null });
      await expect(pending).rejects.toThrow("account changed");
    });
    expect(hook.result.current.prefs.hidden).toEqual(["practice"]);
    expect(hook.client.getQueryData(["rail-prefs", "student-a"])).toEqual(current);
  });
});

describe("legacy rail migration", () => {
  it("migrates once per account and never again after the acknowledged write", async () => {
    state.rows = [{ class_id: "student-a", layout_prefs: { unrelated: "keep", classroom_rail: { hidden: ["drill", "testing"] } } }];
    const hook = harness();
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
    expect(state.writes).toHaveLength(1);
    expect(hook.result.current.prefs.hidden).toEqual(["practice"]);
    await act(() => hook.result.current.retry());
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
    expect(state.writes).toHaveLength(1);
    // The legacy key is left in place; only the versioned key is added.
    expect((state.rows[0] as { layout_prefs: Record<string, unknown> }).layout_prefs).toHaveProperty("classroom_rail");
  });

  it("does not migrate over a saved v2 layout, even one holding retired ids", async () => {
    state.rows = [{ class_id: "student-a", layout_prefs: { classroom_rail: { hidden: ["drill", "testing"] }, classroom_rail_v2: { order: { classroom: ["journal", "review"] }, hidden: ["analytics", "library"] } } }];
    const hook = harness();
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
    expect(state.writes).toHaveLength(0);
    expect(hook.result.current.prefs).toEqual({ order: { classroom: ["review"] }, hidden: ["library"] });
  });

  it("repairs unknown legacy entries without carrying them forward", async () => {
    state.rows = [{ class_id: "student-a", layout_prefs: { classroom_rail: { order: { classroom: ["bogus", "testing", 7] }, hidden: ["bogus", "messages", "analytics", "history"] } } }];
    const hook = harness();
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
    const written = (state.writes[0] as { layout_prefs: { classroom_rail_v2: { order: { classroom: string[] }; hidden: string[] } } }).layout_prefs.classroom_rail_v2;
    expect(written.hidden).toEqual(["progress"]);
    expect(written.order.classroom[0]).toBe("practice");
    expect(written.order.classroom).not.toContain("bogus");
  });

  it("adopts a layout another device wrote during migration instead of failing or overwriting it", async () => {
    state.rows = [{ class_id: "student-a", layout_prefs: { classroom_rail: { hidden: [] } } }];
    state.nextWrite = { data: null, error: null };
    state.onWrite = () => {
      (state.rows[0] as { layout_prefs: unknown }).layout_prefs = { classroom_rail: { hidden: [] }, classroom_rail_v2: { order: {}, hidden: ["schedule"] } };
    };
    const hook = harness();
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.prefs.hidden).toEqual(["schedule"]);
    expect(state.writes).toHaveLength(1);
  });

  it("refuses to save an edit built on a layout another device has since replaced", async () => {
    const hook = harness();
    await waitFor(() => expect(hook.result.current.canSave).toBe(true));
    (state.rows[0] as { layout_prefs: unknown }).layout_prefs = { unrelated: "keep", classroom_rail_v2: { order: {}, hidden: ["progress"] } };
    await act(async () => { await expect(hook.result.current.save({ ...current, hidden: ["library"] })).rejects.toThrow("another device"); });
    expect(state.writes).toHaveLength(0);
    await waitFor(() => expect(hook.result.current.prefs.hidden).toEqual(["progress"]));
  });
});
