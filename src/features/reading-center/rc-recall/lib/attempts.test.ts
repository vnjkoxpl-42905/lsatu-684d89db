import { beforeEach, describe, expect, it, vi } from "vitest";

type Reply = { data: unknown; error: unknown; throws?: unknown };
interface Call { table: string; op: string; payload?: unknown; range?: [number, number]; filters: Record<string, unknown> }

/**
 * An explicit mock of the Supabase client boundary. Each `table:op` key holds
 * either a reply, a list of replies consumed in order (the last one repeats), or
 * a function that decides. Nothing here is a real backend.
 */
const db = vi.hoisted(() => ({
  calls: [] as Call[],
  replies: {} as Record<string, unknown>,
  upload: vi.fn(), list: vi.fn(), signed: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const next = (key: string, call: Call): Promise<Reply> => {
    const entry = db.replies[key];
    let reply: Reply = { data: null, error: null };
    if (typeof entry === "function") reply = (entry as (c: Call) => Reply)(call);
    else if (Array.isArray(entry)) reply = (entry.length > 1 ? entry.shift() : entry[0]) as Reply;
    else if (entry) reply = entry as Reply;
    if ((reply as { throws?: unknown }).throws) return Promise.reject(reply.throws);
    return Promise.resolve(reply);
  };
  const builder = (table: string) => {
    const call: Call = { table, op: "select", filters: {} };
    const chain: Record<string, unknown> = {};
    for (const name of ["eq", "neq", "is", "in"]) chain[name] = (column: string, value: unknown) => { call.filters[`${name}:${column}`] = value; return chain; };
    chain.order = () => chain;
    chain.limit = () => chain;
    chain.range = (from: number, to: number) => { call.range = [from, to]; return chain; };
    chain.insert = (p: unknown) => { call.op = "insert"; call.payload = p; return chain; };
    chain.update = (p: unknown) => { call.op = "update"; call.payload = p; return chain; };
    chain.select = () => chain;
    const settle = () => { const record = { ...call, filters: { ...call.filters } }; db.calls.push(record); return next(`${table}:${record.op}`, record); };
    chain.single = settle;
    chain.maybeSingle = settle;
    chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => settle().then(resolve, reject);
    return chain;
  };
  return { supabase: { from: builder, storage: { from: () => ({ upload: db.upload, list: db.list, createSignedUrl: db.signed }) } } };
});

import {
  AttemptOutcomeUnknownError, classifyFailure, createAttempt, finalizeAttempt, insertRecap, listAttempts, markRecapFailed,
  probeAttemptsBackend, recordingPath, resetFailedRecap, markUnstartedRecapFailed, signedRecordingUrl, summarizeRecordings, uploadRecording,
} from "./attempts";

const base = { studentId: "s1", mode: "rc_recall" as const, preptest: 1, section: 1, passageIds: [1, 2, 3, 4], confirmationScope: "all_read" as const };
const inserted = () => db.calls.filter((c) => c.table === "rc_recall_attempts" && c.op === "insert");
const echoInsert = (c: Call) => ({ data: c.payload, error: null });

beforeEach(() => {
  db.calls.length = 0; db.replies = {}; db.upload.mockReset(); db.list.mockReset().mockResolvedValue({ data: [], error: null }); db.signed.mockReset();
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

describe("classifyFailure", () => {
  it("separates a missing table, a refusal, a dropped connection and everything else", () => {
    expect(classifyFailure({ code: "PGRST205", message: "Could not find the table 'public.rc_recall_attempts' in the schema cache" })).toBe("missing_table");
    expect(classifyFailure({ code: "42501", message: "new row violates row-level security policy" })).toBe("denied");
    expect(classifyFailure(new TypeError("Failed to fetch"))).toBe("network");
    expect(classifyFailure({ message: "boom" })).toBe("network");
    expect(classifyFailure({ code: "23505", message: "duplicate key" })).toBe("other");
  });
});

describe("probeAttemptsBackend", () => {
  it("is available when the table answers", async () => {
    db.replies["rc_recall_attempts:select"] = { data: [], error: null };
    expect(await probeAttemptsBackend("s1")).toEqual({ state: "available" });
  });
  it("is unavailable, not merely failing, when the table is missing (PGRST205)", async () => {
    db.replies["rc_recall_attempts:select"] = { data: null, error: { code: "PGRST205", message: "Could not find the table" } };
    expect(await probeAttemptsBackend("s1")).toEqual({ state: "unavailable", reason: "missing_table" });
  });
  it("is unknown when the connection fails, so launch stays off without blaming the table", async () => {
    db.replies["rc_recall_attempts:select"] = { throws: new TypeError("Failed to fetch") };
    expect(await probeAttemptsBackend("s1")).toEqual({ state: "unknown" });
  });
  it("never writes anything", async () => {
    db.replies["rc_recall_attempts:select"] = { data: [], error: null };
    await probeAttemptsBackend("s1");
    expect(db.calls.every((c) => c.op === "select")).toBe(true);
  });
});

describe("createAttempt", () => {
  it("inserts a UUID attempt for the student and verifies it", async () => {
    db.replies["rc_recall_attempts:insert"] = echoInsert;
    const row = await createAttempt({ ...base, confirmationScope: "current_sub_passage" });
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(inserted()[0].payload).toMatchObject({ student_id: "s1", mode: "rc_recall", confirmation_scope: "current_sub_passage" });
  });

  it("Cumulative Recall saves no confirmation scope", async () => {
    db.replies["rc_recall_attempts:insert"] = echoInsert;
    await createAttempt({ ...base, mode: "cumulative_recall" });
    expect(inserted()[0].payload).toMatchObject({ confirmation_scope: null });
  });

  it("reports a definite refusal as not saved once the read-back finds no row", async () => {
    db.replies["rc_recall_attempts:insert"] = { data: null, error: { code: "42501", message: "denied" } };
    db.replies["rc_recall_attempts:select"] = { data: null, error: null };
    await expect(createAttempt(base)).rejects.toMatchObject({ message: "denied" });
  });

  describe("a response lost after the insert committed", () => {
    it("reads the row back and returns it instead of creating a second attempt", async () => {
      const id = "11111111-1111-4111-8111-111111111111";
      db.replies["rc_recall_attempts:insert"] = { throws: new TypeError("Failed to fetch") };
      db.replies["rc_recall_attempts:select"] = { data: { id, student_id: "s1", mode: "rc_recall" }, error: null };
      const row = await createAttempt({ ...base, id });
      expect(row.id).toBe(id);
      expect(inserted()).toHaveLength(1);
      const read = db.calls.find((c) => c.op === "select")!;
      expect(read.filters).toMatchObject({ "eq:id": id, "eq:student_id": "s1" });
    });

    it("treats a duplicate-key answer as success when the stored row is this attempt", async () => {
      const id = "22222222-2222-4222-8222-222222222222";
      db.replies["rc_recall_attempts:insert"] = { data: null, error: { code: "23505", message: "duplicate key value" } };
      db.replies["rc_recall_attempts:select"] = { data: { id, student_id: "s1" }, error: null };
      await expect(createAttempt({ ...base, id })).resolves.toMatchObject({ id });
    });

    it("says the outcome is unknown, keeping the id, when the read-back also cannot reach the server", async () => {
      const id = "33333333-3333-4333-8333-333333333333";
      db.replies["rc_recall_attempts:insert"] = { throws: new TypeError("Failed to fetch") };
      db.replies["rc_recall_attempts:select"] = { throws: new TypeError("Failed to fetch") };
      const error = await createAttempt({ ...base, id }).catch((e) => e);
      expect(error).toBeInstanceOf(AttemptOutcomeUnknownError);
      expect(error.attemptId).toBe(id);
    });

    it("says nothing was saved only when the read-back confirms there is no row", async () => {
      db.replies["rc_recall_attempts:insert"] = { throws: new TypeError("Failed to fetch") };
      db.replies["rc_recall_attempts:select"] = { data: null, error: null };
      await expect(createAttempt(base)).rejects.toBeInstanceOf(TypeError);
    });

    it("a retry with the same id reuses it", async () => {
      const id = "44444444-4444-4444-8444-444444444444";
      db.replies["rc_recall_attempts:insert"] = [{ throws: new TypeError("Failed to fetch") }, echoInsert];
      db.replies["rc_recall_attempts:select"] = { throws: new TypeError("Failed to fetch") };
      await expect(createAttempt({ ...base, id })).rejects.toBeInstanceOf(AttemptOutcomeUnknownError);
      // Re-queue: the second insert now succeeds.
      db.replies["rc_recall_attempts:insert"] = echoInsert;
      await expect(createAttempt({ ...base, id })).resolves.toMatchObject({ id });
      expect(inserted().map((c) => (c.payload as { id: string }).id)).toEqual([id, id]);
    });
  });
});

describe("insertRecap", () => {
  it("starts a spoken recap as pending and a silent one as not_recorded", async () => {
    db.replies["rc_recall_recaps:insert"] = echoInsert;
    const input = { attemptId: "a", studentId: "s", recapKey: "k", passagePosition: 1, kind: "recall" as const };
    await insertRecap({ ...input, voice: "spoken" });
    await insertRecap({ ...input, voice: "silent" });
    expect(db.calls.map((c) => (c.payload as { recording_state: string }).recording_state)).toEqual(["pending", "not_recorded"]);
  });
});

describe("recap status writes", () => {
  it("failed-start reconciliation only touches an owner-scoped pending pathless row", async () => {
    await markUnstartedRecapFailed("r1", "s1");
    expect(db.calls[0].filters).toMatchObject({ "eq:id": "r1", "eq:student_id": "s1", "eq:recording_state": "pending", "is:object_path": null });
  });
  it("markRecapFailed propagates a failed update instead of pretending the row changed", async () => {
    db.replies["rc_recall_recaps:update"] = { data: null, error: { code: "42501", message: "denied" } };
    await expect(markRecapFailed("r1", "s1")).rejects.toMatchObject({ message: "denied" });
  });
  it("markRecapFailed never overwrites a saved recording", async () => {
    db.replies["rc_recall_recaps:update"] = { data: null, error: null };
    await markRecapFailed("r1", "s1");
    expect(db.calls[0].filters).toMatchObject({ "neq:recording_state": "saved", "eq:student_id": "s1" });
  });
  it("resetFailedRecap reuses only the failed pathless recap and can switch it to silent", async () => {
    db.replies["rc_recall_recaps:update"] = { data: { id: "r1", recording_state: "not_recorded", voice: "silent" }, error: null };
    await expect(resetFailedRecap("r1", "s1", "silent")).resolves.toMatchObject({ recording_state: "not_recorded" });
    expect(db.calls.at(-1)?.payload).toMatchObject({ voice: "silent", recording_state: "not_recorded", object_path: null });
  });
});

describe("uploadRecording", () => {
  const input = { studentId: "s1", attemptId: "a1", recapId: "r1", path: "s1/a1/k-uuid.webm", blob: new Blob(["x"]), mimeType: "audio/webm", durationMs: 1200 };
  const failedMarkers = () => db.calls.filter((c) => c.op === "update" && (c.payload as { recording_state: string }).recording_state === "failed");
  const savedMarkers = () => db.calls.filter((c) => c.op === "update" && (c.payload as { recording_state: string }).recording_state === "saved");

  it("never overwrites: uploads with upsert false", async () => {
    db.upload.mockResolvedValue({ error: null });
    db.list.mockResolvedValue({ data: [{ name: "k-uuid.webm" }], error: null });
    db.replies["rc_recall_recaps:update"] = { data: { recording_state: "saved", object_path: input.path }, error: null };
    await uploadRecording(input);
    expect(db.upload).toHaveBeenCalledWith(input.path, input.blob, expect.objectContaining({ upsert: false }));
  });

  it("is not saved when the object is missing after upload, and the row is marked failed", async () => {
    db.upload.mockResolvedValue({ error: null });
    db.list.mockResolvedValue({ data: [], error: null });
    await expect(uploadRecording(input)).rejects.toThrow(/not found/);
    expect(failedMarkers()).toHaveLength(1);
    expect(savedMarkers()).toHaveLength(0);
  });

  it("is not saved when the row does not read back as saved", async () => {
    db.upload.mockResolvedValue({ error: null });
    db.list.mockResolvedValue({ data: [{ name: "k-uuid.webm" }], error: null });
    db.replies["rc_recall_recaps:update"] = [{ data: { recording_state: "pending", object_path: null }, error: null }];
    await expect(uploadRecording(input)).rejects.toThrow(/verified/);
  });

  it("marks failed when the upload itself is rejected", async () => {
    db.upload.mockResolvedValue({ error: { message: "network down" } });
    await expect(uploadRecording(input)).rejects.toMatchObject({ message: "network down" });
    expect(failedMarkers()).toHaveLength(1);
  });

  it("a repeated upload whose object already landed is accepted when the size matches", async () => {
    db.upload.mockResolvedValue({ error: { message: "The resource already exists" } });
    db.list.mockResolvedValue({ data: [{ name: "k-uuid.webm", metadata: { size: 1 } }], error: null });
    db.replies["rc_recall_recaps:update"] = { data: { recording_state: "saved", object_path: input.path }, error: null };
    await expect(uploadRecording(input)).resolves.toBeUndefined();
  });

  it("refuses an existing object of a different size rather than calling it saved", async () => {
    db.upload.mockResolvedValue({ error: { message: "The resource already exists" } });
    db.list.mockResolvedValue({ data: [{ name: "k-uuid.webm", metadata: { size: 99 } }], error: null });
    await expect(uploadRecording(input)).rejects.toThrow(/different size/);
    expect(savedMarkers()).toHaveLength(0);
  });
});

describe("finalizeAttempt", () => {
  const args = { attemptId: "a", studentId: "s", elapsedSeconds: 10, completed: true };

  it("only reports success when the row reads back finished", async () => {
    db.replies["rc_recall_attempts:update"] = { data: { finished_at: null, completed: false }, error: null };
    await expect(finalizeAttempt(args)).rejects.toThrow(/verified/);
    db.replies["rc_recall_attempts:update"] = { data: { finished_at: "2026-10-16T00:00:00Z", completed: true }, error: null };
    await expect(finalizeAttempt(args)).resolves.toMatchObject({ completed: true });
  });

  it("only finishes an unfinished attempt, so a second finish cannot overwrite the first", async () => {
    db.replies["rc_recall_attempts:update"] = { data: { finished_at: "2026-10-16T00:00:00Z", completed: true }, error: null };
    await finalizeAttempt(args);
    expect(db.calls[0].filters).toMatchObject({ "is:finished_at": null, "eq:student_id": "s" });
  });

  it("returns the stored result when the response was lost but the finish had committed", async () => {
    db.replies["rc_recall_attempts:update"] = { data: null, error: { message: "Failed to fetch" } };
    db.replies["rc_recall_attempts:select"] = { data: { id: "a", finished_at: "2026-10-16T00:00:00Z", completed: true, elapsed_seconds: 10 }, error: null };
    await expect(finalizeAttempt(args)).resolves.toMatchObject({ completed: true, elapsed_seconds: 10 });
  });

  it("a duplicate End after Finish reports what the server holds instead of failing or rewriting it", async () => {
    db.replies["rc_recall_attempts:update"] = { data: null, error: { code: "PGRST116", message: "0 rows" } };
    db.replies["rc_recall_attempts:select"] = { data: { id: "a", finished_at: "2026-10-16T00:00:00Z", completed: true, elapsed_seconds: 600 }, error: null };
    const row = await finalizeAttempt({ ...args, completed: false, elapsedSeconds: 3 });
    expect(row).toMatchObject({ completed: true, elapsed_seconds: 600 });
    expect(db.calls.filter((c) => c.op === "update")).toHaveLength(1);
  });

  it("throws, so the caller keeps the result pending, when nothing can be confirmed", async () => {
    db.replies["rc_recall_attempts:update"] = { data: null, error: { message: "Failed to fetch" } };
    db.replies["rc_recall_attempts:select"] = { data: { id: "a", finished_at: null }, error: null };
    await expect(finalizeAttempt(args)).rejects.toMatchObject({ message: "Failed to fetch" });
  });
});

describe("listAttempts pagination", () => {
  const row = (n: number) => ({ id: `a${n}`, student_id: "s1", started_at: "2026-10-01T00:00:00Z" });

  it("asks for one extra row to learn whether more exist, and keeps a stable offset", async () => {
    db.replies["rc_recall_attempts:select"] = ({ range }: Call) => ({ data: Array.from({ length: (range![1] - range![0]) + 1 }, (_, i) => row(range![0] + i)), error: null });
    db.replies["rc_recall_recaps:select"] = { data: [], error: null };
    const first = await listAttempts("s1", 0, 50);
    expect(first.attempts).toHaveLength(50);
    expect(first.hasMore).toBe(true);
    expect(first.nextOffset).toBe(50);
    const second = await listAttempts("s1", first.nextOffset, 50);
    expect(second.attempts[0].id).toBe("a50");
    expect(db.calls.filter((c) => c.table === "rc_recall_attempts").map((c) => c.range)).toEqual([[0, 50], [50, 100]]);
  });

  it("ends cleanly on a short final page, with no repeat of an earlier attempt", async () => {
    db.replies["rc_recall_attempts:select"] = { data: [row(50), row(51), row(52)], error: null };
    db.replies["rc_recall_recaps:select"] = { data: [], error: null };
    const page = await listAttempts("s1", 50, 50);
    expect(page).toMatchObject({ hasMore: false, nextOffset: 53 });
    expect(page.attempts.map((a) => a.id)).toEqual(["a50", "a51", "a52"]);
  });

  it("only ever asks for this student's rows", async () => {
    db.replies["rc_recall_attempts:select"] = { data: [row(1)], error: null };
    db.replies["rc_recall_recaps:select"] = { data: [], error: null };
    await listAttempts("s1");
    expect(db.calls.every((c) => c.filters["eq:student_id"] === "s1")).toBe(true);
  });
});

describe("signedRecordingUrl", () => {
  const saved = { student_id: "s1", recording_state: "saved" as const, object_path: "s1/a1/k.webm" };

  it("signs a short-lived link for a verified saved recording of the signed-in student", async () => {
    db.list.mockResolvedValue({ data: [{ name: "k.webm" }], error: null });
    db.signed.mockResolvedValue({ data: { signedUrl: "https://signed" }, error: null });
    await expect(signedRecordingUrl("s1", saved)).resolves.toBe("https://signed");
    expect(db.signed).toHaveBeenCalledWith("s1/a1/k.webm", 300, undefined);
    await signedRecordingUrl("s1", saved, { download: true });
    expect(db.signed).toHaveBeenLastCalledWith("s1/a1/k.webm", 300, { download: true });
  });

  it.each([
    ["another account's recording", { ...saved, student_id: "s2", object_path: "s2/a1/k.webm" }],
    ["a path outside the student's folder", { ...saved, object_path: "s2/a1/k.webm" }],
    ["a recording that is not saved", { ...saved, recording_state: "failed" as const }],
    ["a row with no stored object", { ...saved, object_path: null }],
  ])("refuses %s", async (_name, recap) => {
    await expect(signedRecordingUrl("s1", recap)).rejects.toThrow(/not available/);
    expect(db.signed).not.toHaveBeenCalled();
  });

  it("refuses when the object is not actually in storage", async () => {
    db.list.mockResolvedValue({ data: [], error: null });
    await expect(signedRecordingUrl("s1", saved)).rejects.toThrow(/could not be found/);
    expect(db.signed).not.toHaveBeenCalled();
  });
});

describe("summarizeRecordings", () => {
  it("never calls an attempt saved when a recap failed", () => {
    const sum = summarizeRecordings([{ recording_state: "saved" }, { recording_state: "failed" }, { recording_state: "not_recorded" }]);
    expect(sum).toEqual({ spoken: 2, saved: 1, failed: 1, pending: 0, silent: 1 });
  });
});


describe("recap uncertain response reconciliation", () => {
  it("reads the committed recap by account, attempt and key after a lost response", async () => {
    db.replies["rc_recall_recaps:insert"] = { throws: new TypeError("Failed to fetch") };
    db.replies["rc_recall_recaps:select"] = { data: { id: "committed", student_id: "s1" }, error: null };
    await expect(insertRecap({ attemptId: "a1", studentId: "s1", recapKey: "p1", passagePosition: 1, kind: "recall", voice: "silent" })).resolves.toMatchObject({ id: "committed" });
    expect(db.calls.at(-1)?.filters).toMatchObject({ "eq:student_id": "s1", "eq:attempt_id": "a1", "eq:recap_key": "p1" });
  });
});


it("reconciles finalization when the client throws after commit", async () => {
  db.replies["rc_recall_attempts:update"] = { throws: new TypeError("Failed to fetch") };
  db.replies["rc_recall_attempts:select"] = { data: { id: "a", finished_at: "2026-10-16", completed: true }, error: null };
  await expect(finalizeAttempt({ attemptId: "a", studentId: "s", elapsedSeconds: 3, completed: true })).resolves.toMatchObject({ completed: true });
});


it("keeps launch unavailable when only the recap table is missing", async () => {
  db.replies["rc_recall_recaps:select"] = { data: null, error: { code: "PGRST205" } };
  expect(await probeAttemptsBackend("s1")).toEqual({ state: "unavailable", reason: "missing_table" });
});
it("checks the recording bucket without writing and rejects a missing bucket", async () => {
  db.list.mockResolvedValue({ data: null, error: { message: "Bucket not found" } });
  expect(await probeAttemptsBackend("s1")).toEqual({ state: "unavailable", reason: "missing_storage" });
  expect(db.list).toHaveBeenCalledWith("s1", { limit: 1 });
  expect(db.upload).not.toHaveBeenCalled();
});


describe("session failures do not imply unavailable storage", () => {
  it.each([
    { code: "PGRST301", message: "JWT expired" },
    { status: 401, message: "Unauthorized" },
    { statusCode: "401", message: "Unauthorized" },
  ])("maps an expired or invalid identity to unknown: %j", async (error) => {
    expect(classifyFailure(error)).toBe("session");
    db.replies["rc_recall_attempts:select"] = { data: null, error };
    expect(await probeAttemptsBackend("s1")).toEqual({ state: "unknown" });
  });
  it("also treats a storage-folder authentication failure as unknown", async () => {
    db.list.mockResolvedValue({ data: null, error: { statusCode: "401", message: "Unauthorized" } });
    expect(await probeAttemptsBackend("s1")).toEqual({ state: "unknown" });
  });
  it("still identifies a policy refusal separately", () => {
    expect(classifyFailure({ code: "42501", message: "permission denied" })).toBe("denied");
  });
});
