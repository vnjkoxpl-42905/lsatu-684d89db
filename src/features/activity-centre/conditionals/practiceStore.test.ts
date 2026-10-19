import { beforeEach, describe, expect, it, vi } from "vitest";
import { cachePracticeRun, createPracticeRun, loadPracticeRuns, practiceSaveMessage, readCachedRuns, syncPendingPractice, syncPracticeRun, type PracticeRun } from "./practiceStore";

type MockRow = {
  id: string;
  user_id: string;
  revision: number;
  snapshot: Pick<PracticeRun, "mode" | "questions" | "general" | "createdAt">;
  state: Omit<PracticeRun, "id" | "userId" | "mode" | "questions" | "general" | "createdAt">;
};
const backend = vi.hoisted(() => ({ rows: new Map<string, MockRow>(), offline: false, loseInsert: false, loseUpdate: false,
  beforeSelectReturn: null as null | (() => Promise<void>) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  let operation = "select";
  let payload: Partial<MockRow>;
  const filters: Record<string, unknown> = {};
  const execute = () => {
    if (backend.offline) return { error: { message: "offline" }, data: null };
    if (operation === "insert") {
      if (backend.rows.has(payload.id)) return { error: { code: "23505" }, data: null };
      backend.rows.set(payload.id, structuredClone(payload as MockRow));
      if (backend.loseInsert) { backend.loseInsert = false; return { error: { message: "response lost" }, data: null }; }
      return { error: null, data: null };
    }
    const rows = [...backend.rows.values()].filter(row => Object.entries(filters).every(([key, value]) => row[key as keyof MockRow] === value));
    if (operation === "update") {
      for (const row of rows) Object.assign(row, structuredClone(payload));
      if (backend.loseUpdate) { backend.loseUpdate = false; return { error: { message: "response lost" }, data: null }; }
    }
    return { error: null, data: structuredClone(rows) };
  };
  const query = {
    insert: (value: MockRow) => { operation = "insert"; payload = value; return query; },
    update: (value: Partial<MockRow>) => { operation = "update"; payload = value; return query; },
    select: () => query,
    eq: (key: string, value: unknown) => { filters[key] = value; return query; },
    order: () => query,
    single: async () => { const result = execute(); return { ...result, data: result.data?.[0] }; },
    then: async (resolve: (value: unknown) => void) => {
      const result = execute();
      if (operation === "select" && backend.beforeSelectReturn) {
        const beforeReturn = backend.beforeSelectReturn;
        backend.beforeSelectReturn = null;
        await beforeReturn();
      }
      return resolve(result);
    },
  };
  return query;
} } }));

beforeEach(() => {
  backend.rows.clear(); backend.offline = false; backend.loseInsert = false; backend.loseUpdate = false;
  backend.beforeSelectReturn = null;
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    get length() { return storage.size; },
    key: (index: number) => [...storage.keys()][index] ?? null,
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { storage.set(key, value); }),
  });
});
const answer = (id: string) => ({ id, questionId: "q1", text: "answer", verdict: null, attempt: 1, revealed: false, at: "2026-09-16T12:00:00Z" });

describe("practice persistence", () => {
  it("retains offline work and syncs it when connected", async () => {
    const run = createPracticeRun("alice", "linking", []);
    backend.offline = true;
    await expect(syncPracticeRun("alice", run.id)).rejects.toThrow("Saved on this device");
    expect(readCachedRuns("alice")).toEqual([run]);
    backend.offline = false;
    await syncPracticeRun("alice", run.id);
    expect(backend.rows.get(run.id).revision).toBe(0);
  });

  it("recovers a lost insert response despite JSONB key ordering", async () => {
    const run = createPracticeRun("alice", "linking", []);
    backend.loseInsert = true;
    await expect(syncPracticeRun("alice", run.id)).rejects.toThrow();
    const row = backend.rows.get(run.id);
    row.state = Object.fromEntries(Object.entries(row.state).reverse()) as MockRow["state"];
    row.snapshot = Object.fromEntries(Object.entries(row.snapshot).reverse()) as MockRow["snapshot"];
    await expect(syncPracticeRun("alice", run.id)).resolves.toBeUndefined();
    expect(backend.rows.size).toBe(1);
  });

  it("recovers a lost CAS update and then uploads newer local answers", async () => {
    const run = createPracticeRun("alice", "linking", []);
    await syncPracticeRun("alice", run.id);
    const first = { ...run, answers: [answer("a1")] };
    cachePracticeRun(first);
    backend.loseUpdate = true;
    await expect(syncPracticeRun("alice", run.id)).rejects.toThrow();
    cachePracticeRun({ ...first, answers: [...first.answers, answer("a2")] });
    await syncPracticeRun("alice", run.id);
    expect(backend.rows.get(run.id).revision).toBe(2);
    expect(backend.rows.get(run.id).state.answers).toHaveLength(2);
  });

  it("rejects stale tabs removing or rewriting answers or changing snapshots", () => {
    const run = createPracticeRun("alice", "linking", []);
    const saved = { ...run, answers: [answer("a1")] };
    cachePracticeRun(saved);
    expect(() => cachePracticeRun(run)).toThrow("another tab");
    expect(() => cachePracticeRun({ ...saved, answers: [{ ...answer("a1"), text: "changed" }] })).toThrow("another tab");
    expect(() => cachePracticeRun({ ...saved, mode: "general" })).toThrow("another tab");
    expect(readCachedRuns("alice")[0]).toEqual(saved);
  });

  it("keeps another device's conflicting update and the local pending copy", async () => {
    const run = createPracticeRun("alice", "linking", []);
    await syncPracticeRun("alice", run.id);
    cachePracticeRun({ ...run, answers: [answer("local")] });
    const remote = backend.rows.get(run.id);
    remote.revision = 1;
    remote.state.answers = [answer("remote")];
    await expect(syncPracticeRun("alice", run.id)).rejects.toThrow("another tab");
    expect(readCachedRuns("alice")[0].answers[0].id).toBe("local");
    expect(remote.state.answers[0].id).toBe("remote");
  });

  it("isolates cached and remote history by account", async () => {
    const alice = createPracticeRun("alice", "linking", []);
    const bob = createPracticeRun("bob", "linking", []);
    await syncPracticeRun("alice", alice.id);
    await syncPracticeRun("bob", bob.id);
    expect(await loadPracticeRuns("alice")).toEqual([alice]);
    expect(readCachedRuns("bob")).toEqual([bob]);
    await syncPracticeRun("bob", alice.id);
    expect(backend.rows.get(alice.id).user_id).toBe("alice");
  });

  it("does not claim a failed local write was saved", () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error("quota"); });
    try { createPracticeRun("alice", "linking", []); throw new Error("expected failure"); }
    catch (error) { expect(practiceSaveMessage(error)).toContain("could not save this change"); }
    expect(readCachedRuns("alice")).toEqual([]);
  });

  it("keeps unsynced local answers when refreshing account history", async () => {
    const run = createPracticeRun("alice", "linking", []);
    await syncPracticeRun("alice", run.id);
    const pending = { ...run, answers: [answer("pending")] };
    cachePracticeRun(pending);
    expect(await loadPracticeRuns("alice")).toEqual([pending]);
    expect(backend.rows.get(run.id).state.answers).toEqual([]);
  });

  it("does not replace a newer synced answer with a stale history response", async () => {
    const run = createPracticeRun("alice", "linking", []);
    await syncPracticeRun("alice", run.id);
    const newer = { ...run, answers: [answer("newer")] };
    backend.beforeSelectReturn = async () => {
      cachePracticeRun(newer);
      await syncPracticeRun("alice", run.id);
    };
    expect(await loadPracticeRuns("alice")).toEqual([newer]);
    expect(backend.rows.get(run.id).revision).toBe(1);
  });

  it("syncs other pending sessions even when one session conflicts", async () => {
    const conflicting = createPracticeRun("alice", "linking", []);
    await syncPracticeRun("alice", conflicting.id);
    cachePracticeRun({ ...conflicting, answers: [answer("local")] });
    backend.rows.get(conflicting.id).revision = 4;
    const healthy = createPracticeRun("alice", "must-be-true", []);
    await expect(syncPendingPractice("alice")).rejects.toThrow("another tab");
    expect(backend.rows.get(healthy.id).revision).toBe(0);
    expect(readCachedRuns("alice").find(run => run.id === conflicting.id)?.answers[0].id).toBe("local");
  });

  it("preserves corrupt data and distinguishes read failure from saved work", async () => {
    localStorage.setItem("lsatu:conditional-practice:v1:alice:broken", "not JSON");
    try { readCachedRuns("alice"); throw new Error("expected failure"); }
    catch (error) { expect(practiceSaveMessage(error)).toContain("could not be read"); }
    expect(localStorage.getItem("lsatu:conditional-practice:v1:alice:broken")).toBe("not JSON");
    backend.offline = true;
    await expect(loadPracticeRuns("bob")).rejects.toMatchObject({ message: "offline" });
    expect(practiceSaveMessage({ message: "offline" })).toContain("history could not be loaded");
  });
});
