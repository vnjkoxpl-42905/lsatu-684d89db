import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ finalizeAttempt: vi.fn() }));
vi.mock("./attempts", async (orig) => ({ ...(await orig<typeof import("./attempts")>()), finalizeAttempt: api.finalizeAttempt }));

import type { AttemptRow, RecapRow } from "./attempts";
import { CHECKPOINT_VERSION, loadCheckpoint, saveCheckpoint, contentKeyFor, type Checkpoint, type StorageLike } from "./checkpoint";
import {
  PROCEDURE_LABEL, STATUS_LABEL, buildEntries, deriveStatus, recapLabel, summarizeHistory,
} from "./history";
import { retryPendingFinalization } from "./pending";

const attempt = (over: Partial<AttemptRow> = {}): AttemptRow => ({
  id: "a1", student_id: "s1", mode: "rc_recall", preptest: 140, section: 4, passage_ids: [1, 2, 3, 4], confirmation_scope: "all_read",
  started_at: "2026-10-01T10:00:00Z", finished_at: null, elapsed_seconds: null, completed: false, ...over,
});
const finished = (over: Partial<AttemptRow> = {}) => attempt({ finished_at: "2026-10-01T10:30:00Z", elapsed_seconds: 1800, completed: true, ...over });
const recap = (over: Partial<RecapRow> = {}): RecapRow => ({
  id: "r1", attempt_id: "a1", student_id: "s1", recap_key: "p1-para1-recall", passage_position: 1, kind: "recall", voice: "silent",
  recording_state: "not_recorded", object_path: null, mime_type: null, duration_ms: null, ...over,
});
const local = (over: Partial<Checkpoint> = {}): Checkpoint => ({
  version: CHECKPOINT_VERSION, studentId: "s1", attemptId: "a1", contentKey: "k", scope: "all_read", stepIndex: 0, stepId: "x",
  recaps: [], sectionMs: 0, passageMs: 0, showElapsedTimer: true, savedAt: 1, pending: null, ...over,
});

describe("attempt status", () => {
  it("separates in progress, completed, ended early, pending save and recording trouble", () => {
    expect(deriveStatus(attempt(), [], null)).toBe("not_resumable_here");
    expect(deriveStatus(attempt(), [], local())).toBe("in_progress");
    expect(deriveStatus(finished(), [], null)).toBe("completed");
    expect(deriveStatus(finished({ completed: false }), [], null)).toBe("ended");
    expect(deriveStatus(attempt(), [], local({ pending: { completed: true, seconds: 100, savedAt: 1 } }))).toBe("pending");
    expect(deriveStatus(finished(), [recap({ voice: "spoken", recording_state: "failed" })], null)).toBe("recovery_needed");
    expect(deriveStatus(finished(), [recap({ voice: "spoken", recording_state: "pending" })], null)).toBe("recovery_needed");
  });

  it("a silent recall that was not recorded is not a recording problem", () => {
    expect(deriveStatus(finished(), [recap({ voice: "silent", recording_state: "not_recorded" })], null)).toBe("completed");
  });

  it("local pending work is ignored once the server says the attempt is finished", () => {
    expect(deriveStatus(finished(), [], local({ pending: { completed: true, seconds: 5, savedAt: 1 } }))).toBe("completed");
  });

  it("every state has a plain label", () => {
    expect(Object.values(STATUS_LABEL).every((label) => label.length > 3)).toBe(true);
  });
});

describe("history entries", () => {
  it("only an unfinished attempt with a place on this device is resumable", () => {
    const entries = buildEntries([attempt(), attempt({ id: "a2" }), finished({ id: "a3" })], [], [local({ attemptId: "a1" }), local({ attemptId: "a3" })]);
    expect(entries.map((e) => [e.attempt.id, e.status, e.resumable])).toEqual([["a1", "in_progress", true], ["a2", "not_resumable_here", false], ["a3", "completed", false]]);
  });

  it("a pending finish is not offered as a resume and carries its original duration", () => {
    const [entry] = buildEntries([attempt()], [], [local({ pending: { completed: false, seconds: 421, savedAt: 1 } })]);
    expect(entry).toMatchObject({ status: "pending", resumable: false, pendingFinalization: { seconds: 421, completed: false } });
  });

  it("attaches recaps to their own attempt and counts unsaved recordings", () => {
    const [one, two] = buildEntries([finished(), finished({ id: "a2" })], [
      recap({ id: "r1", voice: "spoken", recording_state: "saved" }), recap({ id: "r2", voice: "spoken", recording_state: "failed" }),
      recap({ id: "r3", attempt_id: "a2" }),
    ], []);
    expect(one.recaps).toHaveLength(2);
    expect(one.unsavedRecordings).toBe(1);
    expect(two.recaps).toHaveLength(1);
  });

  it("keeps an earlier cumulative attempt under its own name", () => {
    expect(PROCEDURE_LABEL.cumulative_recall).toMatch(/earlier/i);
    expect(PROCEDURE_LABEL.rc_recall).not.toBe(PROCEDURE_LABEL.cumulative_recall);
  });

  it("describes recaps in words", () => {
    expect(recapLabel(recap({ recap_key: "p2-para3-recall", passage_position: 2 }))).toBe("Passage 2, paragraph 3");
    expect(recapLabel(recap({ kind: "passage_recap", recap_key: "p4-passage-recap", passage_position: 4 }))).toBe("Passage 4, whole-passage recall");
  });
});

describe("progress summary", () => {
  it("counts completed single-passage and full-section attempts as attempts", () => {
    const entries = buildEntries([finished({ passage_ids: [3], elapsed_seconds: 300 }), finished({ id: "full", elapsed_seconds: 1200 })], [], []);
    expect(summarizeHistory(entries)).toMatchObject({ completed: 2, practiceSeconds: 1500 });
    expect(entries[0].attempt.passage_ids).toEqual([3]);
  });
  it("counts completion and time from finished attempts only and invents no score", () => {
    const entries = buildEntries(
      [finished(), finished({ id: "b", completed: false, elapsed_seconds: 300 }), attempt({ id: "c" }), finished({ id: "d" })],
      [recap({ attempt_id: "d", voice: "spoken", recording_state: "failed" })], [local({ attemptId: "c" })]);
    const summary = summarizeHistory(entries);
    expect(summary).toEqual({ completed: 2, ended: 1, inProgress: 1, needsAttention: 1, practiceSeconds: 1800 + 300 + 1800 });
    expect(Object.keys(summary)).not.toContain("score");
  });

  it("does not turn an unfinished attempt without a local place into attention, an end, or invented time", () => {
    const row = attempt();
    const entries = buildEntries([row], [], []);
    expect(entries[0]).toMatchObject({ status: "not_resumable_here", resumable: false });
    expect(summarizeHistory(entries)).toEqual({ completed: 0, ended: 0, inProgress: 0, needsAttention: 0, practiceSeconds: 0 });
    expect(row).toMatchObject({ finished_at: null, elapsed_seconds: null, completed: false });
  });
});

describe("interrupted finalization", () => {
  class Store implements StorageLike {
    m = new Map<string, string>();
    get length() { return this.m.size; }
    key(i: number) { return [...this.m.keys()][i] ?? null; }
    getItem(k: string) { return this.m.get(k) ?? null; }
    setItem(k: string, v: string) { this.m.set(k, v); }
    removeItem(k: string) { this.m.delete(k); }
  }
  const store = new Store();
  beforeEach(() => { api.finalizeAttempt.mockReset(); store.m.clear(); });

  const pending = (seconds = 654) => local({ contentKey: contentKeyFor({ preptest: 140, section: 4, passageIds: [1, 2, 3, 4] }), pending: { completed: true, seconds, savedAt: 1 } });

  it("retries with the original duration, and clears the local record only after a confirmed save", async () => {
    const cp = pending();
    saveCheckpoint(cp, store);
    api.finalizeAttempt.mockResolvedValue(finished());
    await retryPendingFinalization(cp, store);
    expect(api.finalizeAttempt).toHaveBeenCalledWith({ attemptId: "a1", studentId: "s1", elapsedSeconds: 654, completed: true });
    expect(store.getItem(`rc-training:checkpoint:v1:s1:a1`)).toBeNull();
  });

  it("keeps the record exactly as it was when the retry fails, so it can be repeated after a reload", async () => {
    const cp = pending();
    saveCheckpoint(cp, store);
    const before = store.getItem(`rc-training:checkpoint:v1:s1:a1`);
    api.finalizeAttempt.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(finished());
    await expect(retryPendingFinalization(cp, store)).rejects.toThrow("offline");
    expect(store.getItem(`rc-training:checkpoint:v1:s1:a1`)).toBe(before);
    const reloaded = loadCheckpoint({ studentId: "s1", attemptId: "a1", contentKey: cp.contentKey, stepIds: ["x"] }, store);
    expect(reloaded.ok && reloaded.checkpoint.pending?.seconds).toBe(654);
    await retryPendingFinalization(reloaded.ok ? reloaded.checkpoint : cp, store);
    expect(api.finalizeAttempt).toHaveBeenLastCalledWith(expect.objectContaining({ elapsedSeconds: 654 }));
    expect(store.getItem(`rc-training:checkpoint:v1:s1:a1`)).toBeNull();
  });

  it("refuses to send anything when nothing is pending", async () => {
    await expect(retryPendingFinalization(local())).rejects.toThrow(/no unsaved result/);
    expect(api.finalizeAttempt).not.toHaveBeenCalled();
  });
});


it("uses a version-neutral family label for unversioned historical paragraph attempts", () => {
  expect(PROCEDURE_LABEL[attempt({ started_at: "2026-09-01T00:00:00Z" }).mode]).toBe("RC paragraph recall");
  expect(PROCEDURE_LABEL.rc_recall).not.toContain("RC Training");
});
