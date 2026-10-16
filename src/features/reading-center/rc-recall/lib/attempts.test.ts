import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ calls: [] as { table: string; op: string; payload?: unknown }[], result: {} as Record<string, unknown>, upload: vi.fn(), list: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => {
  const builder = (table: string) => {
    let op = "select";
    let payload: unknown;
    const chain: Record<string, unknown> = {};
    for (const name of ["eq", "neq", "is", "in", "order", "limit", "range"]) chain[name] = () => chain;
    chain.insert = (p: unknown) => { op = "insert"; payload = p; return chain; };
    chain.update = (p: unknown) => { op = "update"; payload = p; return chain; };
    chain.select = () => chain;
    const settle = () => { db.calls.push({ table, op, payload }); return Promise.resolve(db.result[`${table}:${op}`] ?? { data: null, error: null }); };
    chain.single = settle;
    chain.then = (resolve: (v: unknown) => unknown) => settle().then(resolve);
    return chain;
  };
  return { supabase: { from: builder, storage: { from: () => ({ upload: db.upload, list: db.list }) } } };
});

import {
  createAttempt, finalizeAttempt, insertRecap, recordingPath, resetFailedRecap, summarizeRecordings, uploadRecording,
} from "./attempts";

beforeEach(() => {
  db.calls.length = 0; db.result = {}; db.upload.mockReset(); db.list.mockReset();
});

describe("recording paths", () => {
  it("sit under the student and attempt, and are unique per recording", () => {
    const a = recordingPath("s1", "att", "p1-para1-recall", "audio/webm;codecs=opus");
    const b = recordingPath("s1", "att", "p1-para1-recall", "audio/webm;codecs=opus");
    expect(a.startsWith("s1/att/p1-para1-recall-")).toBe(true);
    expect(a.endsWith(".webm")).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe("createAttempt", () => {
  it("inserts a fresh UUID attempt for the student and verifies it", async () => {
    let inserted: { id: string; student_id: string } | undefined;
    // Echo the inserted row back, as the database would.
    const { supabase } = await import("@/integrations/supabase/client");
    const spy = vi.spyOn(supabase as never, "from" as never);
    spy.mockImplementation(((table: string) => ({
      insert: (row: { id: string; student_id: string }) => { inserted = row; db.calls.push({ table, op: "insert", payload: row }); return { select: () => ({ single: () => Promise.resolve({ data: row, error: null }) }) }; },
    })) as never);
    const row = await createAttempt({ studentId: "s1", mode: "rc_recall", preptest: 140, section: 4, passageIds: [1, 2, 3, 4], confirmationScope: "current_sub_passage" });
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(inserted).toMatchObject({ student_id: "s1", mode: "rc_recall", confirmation_scope: "current_sub_passage" });
    spy.mockRestore();
  });

  it("Cumulative Recall saves no confirmation scope", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    let inserted: { confirmation_scope: unknown } | undefined;
    const spy = vi.spyOn(supabase as never, "from" as never);
    spy.mockImplementation((() => ({
      insert: (row: { confirmation_scope: unknown }) => { inserted = row; return { select: () => ({ single: () => Promise.resolve({ data: row, error: null }) }) }; },
    })) as never);
    await createAttempt({ studentId: "s1", mode: "cumulative_recall", preptest: 1, section: 1, passageIds: [1, 2, 3, 4], confirmationScope: "all_read" });
    expect(inserted!.confirmation_scope).toBeNull();
    spy.mockRestore();
  });

  it("surfaces an insert failure instead of continuing", async () => {
    db.result["rc_recall_attempts:insert"] = { data: null, error: new Error("denied") };
    await expect(createAttempt({ studentId: "s1", mode: "rc_recall", preptest: 1, section: 1, passageIds: [1, 2, 3, 4], confirmationScope: "all_read" })).rejects.toThrow("denied");
  });
});

describe("insertRecap", () => {
  it("starts a spoken recap as pending and a silent one as not_recorded", async () => {
    const seen: string[] = [];
    const { supabase } = await import("@/integrations/supabase/client");
    const spy = vi.spyOn(supabase as never, "from" as never);
    spy.mockImplementation((() => ({
      insert: (row: { recording_state: string }) => { seen.push(row.recording_state); return { select: () => ({ single: () => Promise.resolve({ data: row, error: null }) }) }; },
    })) as never);
    const base = { attemptId: "a", studentId: "s", recapKey: "k", passagePosition: 1, kind: "recall" as const };
    await insertRecap({ ...base, voice: "spoken" });
    await insertRecap({ ...base, voice: "silent" });
    expect(seen).toEqual(["pending", "not_recorded"]);
    spy.mockRestore();
  });
});

describe("resetFailedRecap", () => {
  it("reuses only the failed pathless recap and can switch it to silent", async () => {
    db.result["rc_recall_recaps:update"] = { data: { id: "r1", recording_state: "not_recorded", voice: "silent" }, error: null };
    await expect(resetFailedRecap("r1", "s1", "silent")).resolves.toMatchObject({ recording_state: "not_recorded" });
    expect(db.calls.at(-1)?.payload).toMatchObject({ voice: "silent", recording_state: "not_recorded", object_path: null });
  });
});

describe("uploadRecording", () => {
  const input = { studentId: "s1", attemptId: "a1", recapId: "r1", path: "s1/a1/k-uuid.webm", blob: new Blob(["x"]), mimeType: "audio/webm", durationMs: 1200 };

  it("never overwrites: uploads with upsert false", async () => {
    db.upload.mockResolvedValue({ error: null });
    db.list.mockResolvedValue({ data: [{ name: "k-uuid.webm" }], error: null });
    db.result["rc_recall_recaps:update"] = { data: { recording_state: "saved", object_path: input.path }, error: null };
    await uploadRecording(input);
    expect(db.upload).toHaveBeenCalledWith(input.path, input.blob, expect.objectContaining({ upsert: false }));
  });

  it("is not saved when the object is missing after upload, and the row is marked failed", async () => {
    db.upload.mockResolvedValue({ error: null });
    db.list.mockResolvedValue({ data: [], error: null });
    await expect(uploadRecording(input)).rejects.toThrow(/not found/);
    expect(db.calls.some((c) => c.op === "update" && (c.payload as { recording_state: string }).recording_state === "failed")).toBe(true);
    expect(db.calls.some((c) => c.op === "update" && (c.payload as { recording_state: string }).recording_state === "saved")).toBe(false);
  });

  it("is not saved when the row does not read back as saved", async () => {
    db.upload.mockResolvedValue({ error: null });
    db.list.mockResolvedValue({ data: [{ name: "k-uuid.webm" }], error: null });
    db.result["rc_recall_recaps:update"] = { data: { recording_state: "pending", object_path: null }, error: null };
    await expect(uploadRecording(input)).rejects.toThrow(/verified/);
  });

  it("marks failed when the upload itself is rejected", async () => {
    db.upload.mockResolvedValue({ error: { message: "network down" } });
    await expect(uploadRecording(input)).rejects.toMatchObject({ message: "network down" });
    expect(db.calls.some((c) => (c.payload as { recording_state?: string })?.recording_state === "failed")).toBe(true);
  });
});

describe("finalizeAttempt", () => {
  it("only reports success when the row reads back finished", async () => {
    db.result["rc_recall_attempts:update"] = { data: { finished_at: null, completed: false }, error: null };
    await expect(finalizeAttempt({ attemptId: "a", studentId: "s", elapsedSeconds: 10, completed: true })).rejects.toThrow(/verified/);
    db.result["rc_recall_attempts:update"] = { data: { finished_at: "2026-10-16T00:00:00Z", completed: true }, error: null };
    await expect(finalizeAttempt({ attemptId: "a", studentId: "s", elapsedSeconds: 10, completed: true })).resolves.toMatchObject({ completed: true });
  });
});

describe("summarizeRecordings", () => {
  it("never calls an attempt saved when a recap failed", () => {
    const sum = summarizeRecordings([{ recording_state: "saved" }, { recording_state: "failed" }, { recording_state: "not_recorded" }]);
    expect(sum).toEqual({ spoken: 2, saved: 1, failed: 1, pending: 0, silent: 1 });
  });
});
