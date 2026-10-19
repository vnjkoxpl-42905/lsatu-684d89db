import { beforeEach, describe, expect, it } from "vitest";
import {
  CHECKPOINT_VERSION, checkpointKey, clearCheckpoint, contentKeyFor, listCheckpoints, loadCheckpoint, saveCheckpoint,
  type Checkpoint, type StorageLike,
} from "./checkpoint";
import { ActiveClock, toSeconds } from "./activeClock";

class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

const section = { preptest: 140, section: 4, passageIds: [1, 2, 3, 4] };
const contentKey = contentKeyFor(section);
const stepIds = ["p1-para1-read", "p1-para1-recall", "p1-para1-confirm", "p1-para2-read"];
const make = (over: Partial<Checkpoint> = {}): Checkpoint => ({
  version: CHECKPOINT_VERSION, studentId: "s1", attemptId: "a1", contentKey, scope: "all_read",
  stepIndex: 1, stepId: "p1-para1-recall",
  recaps: [{ key: "p1-para1-recall", voice: "silent", state: "not_recorded", rowId: "row-1", label: "Recall the paragraph" }],
  sectionMs: 95_000, passageMs: 40_000, showElapsedTimer: true, savedAt: 1, pending: null, ...over,
});
const expected = { studentId: "s1", attemptId: "a1", contentKey, stepIds };

let storage: MemoryStorage;
beforeEach(() => { storage = new MemoryStorage(); });

describe("checkpoint round trip", () => {
  it("restores the step, completed recaps, selections and active totals exactly", () => {
    const saved = make();
    expect(saveCheckpoint(saved, storage)).toEqual({ ok: true });
    const loaded = loadCheckpoint(expected, storage);
    expect(loaded).toEqual({ ok: true, checkpoint: saved });
  });

  it("keeps a pending finalization with its original duration", () => {
    const pending = { completed: false, seconds: 777, savedAt: 5 };
    saveCheckpoint(make({ pending }), storage);
    const loaded = loadCheckpoint(expected, storage);
    expect(loaded.ok && loaded.checkpoint.pending).toEqual(pending);
  });

  it("can be cleared once the result is confirmed saved", () => {
    saveCheckpoint(make(), storage);
    clearCheckpoint("s1", "a1", storage);
    expect(loadCheckpoint(expected, storage)).toEqual({ ok: false, reason: "missing" });
  });

  it("reports a full or blocked device instead of pretending the place was kept", () => {
    const full: StorageLike = { ...storage, length: 0, key: () => null, getItem: () => null, removeItem: () => undefined, setItem: () => { throw new DOMException("full", "QuotaExceededError"); } };
    expect(saveCheckpoint(make(), full)).toEqual({ ok: false, reason: "This device has no room to keep your place." });
    expect(saveCheckpoint(make(), null)).toMatchObject({ ok: false });
  });
});

describe("rejecting a checkpoint that does not belong", () => {
  it("another account's record is never loaded, even if copied under this account's key", () => {
    saveCheckpoint(make({ studentId: "s2" }), storage);
    storage.setItem(checkpointKey("s1", "a1"), storage.getItem(checkpointKey("s2", "a1"))!);
    expect(loadCheckpoint(expected, storage)).toEqual({ ok: false, reason: "other_account" });
  });

  it("is looked up by account, so a different account sees nothing for the same attempt id", () => {
    saveCheckpoint(make({ studentId: "s2" }), storage);
    expect(loadCheckpoint(expected, storage)).toEqual({ ok: false, reason: "missing" });
  });

  it("a record filed under another attempt's key is refused", () => {
    saveCheckpoint(make({ attemptId: "other" }), storage);
    storage.setItem(checkpointKey("s1", "a1"), storage.getItem(checkpointKey("s1", "other"))!);
    expect(loadCheckpoint(expected, storage)).toEqual({ ok: false, reason: "other_attempt" });
  });

  it("refuses a checkpoint for different passages", () => {
    saveCheckpoint(make({ contentKey: contentKeyFor({ ...section, passageIds: [9, 2, 3, 4] }) }), storage);
    expect(loadCheckpoint(expected, storage)).toEqual({ ok: false, reason: "content_changed" });
  });

  it("refuses a step that no longer exists or no longer matches", () => {
    saveCheckpoint(make({ stepIndex: 99 }), storage);
    expect(loadCheckpoint(expected, storage)).toEqual({ ok: false, reason: "out_of_range" });
    saveCheckpoint(make({ stepIndex: 1, stepId: "p1-para9-recall" }), storage);
    expect(loadCheckpoint(expected, storage)).toEqual({ ok: false, reason: "out_of_range" });
  });

  it("treats corrupt, stale-version and negative-time records as unreadable", () => {
    for (const raw of ["{not json", JSON.stringify({ ...make(), version: 0 }), JSON.stringify({ ...make(), sectionMs: -5 }), JSON.stringify({ ...make(), stepIndex: 1.5 })]) {
      storage.setItem(checkpointKey("s1", "a1"), raw);
      expect(loadCheckpoint(expected, storage)).toEqual({ ok: false, reason: "unreadable" });
    }
  });

  it("lists only the signed-in account's checkpoints", () => {
    saveCheckpoint(make(), storage);
    saveCheckpoint(make({ attemptId: "a2" }), storage);
    saveCheckpoint(make({ studentId: "s2", attemptId: "a3" }), storage);
    storage.setItem("unrelated", "x");
    expect(listCheckpoints("s1", storage).map((c) => c.attemptId).sort()).toEqual(["a1", "a2"]);
    expect(listCheckpoints("s2", storage).map((c) => c.attemptId)).toEqual(["a3"]);
    expect(listCheckpoints("nobody", storage)).toEqual([]);
  });
});

describe("active time", () => {
  it("counts only while running", () => {
    const clock = new ActiveClock();
    clock.start(1000);
    expect(clock.snapshot(6000)).toEqual({ sectionMs: 5000, passageMs: 5000 });
    clock.pause(6000);
    expect(clock.snapshot(600_000)).toEqual({ sectionMs: 5000, passageMs: 5000 });
  });

  it("a restored clock adds no time away", () => {
    const first = new ActiveClock();
    first.start(0);
    first.pause(30_000);
    const saved = first.snapshot(30_000);
    // Two hours later the student returns.
    const restored = new ActiveClock(saved);
    expect(restored.snapshot(7_230_000)).toEqual({ sectionMs: 30_000, passageMs: 30_000 });
    restored.start(7_230_000);
    expect(toSeconds(restored.snapshot(7_240_000).sectionMs)).toBe(40);
  });

  it("pausing is idempotent, so pagehide followed by unmount counts the interval once", () => {
    const clock = new ActiveClock();
    clock.start(0);
    clock.pause(10_000);
    clock.pause(25_000);
    expect(clock.snapshot(25_000).sectionMs).toBe(10_000);
  });

  it("a new passage resets the passage count but the section keeps running", () => {
    const clock = new ActiveClock();
    clock.start(0);
    clock.resetPassage(12_000);
    expect(clock.snapshot(15_000)).toEqual({ sectionMs: 15_000, passageMs: 3_000 });
  });

  it("does not infer inactivity: a long silent stretch with the screen open still counts", () => {
    const clock = new ActiveClock();
    clock.start(0);
    expect(clock.snapshot(20 * 60_000).sectionMs).toBe(20 * 60_000);
  });

  it("ignores impossible values rather than carrying them forward", () => {
    const clock = new ActiveClock({ sectionMs: Number.NaN, passageMs: -4 });
    expect(clock.snapshot(0)).toEqual({ sectionMs: 0, passageMs: 0 });
    clock.start(100);
    clock.pause(50);
    expect(clock.snapshot(50).sectionMs).toBe(0);
  });
});

it("preserves per-passage times, acknowledged completion and an immutable pending save", () => {
  const progress = { passageId: 2, passagePosition: 2, activeMs: 12500, completed: true };
  const saved = make({ passageTimesMs: [10000, 12500, 0, 0], completedPassagePositions: [1], pendingPassageProgress: progress });
  saveCheckpoint(saved, storage);
  expect(loadCheckpoint(expected, storage)).toEqual({ ok: true, checkpoint: saved });
});
it("refuses malformed per-passage timing instead of restoring a misleading clock", () => {
  saveCheckpoint(make({ passageTimesMs: [100, -10] }), storage);
  expect(loadCheckpoint(expected, storage)).toEqual({ ok: false, reason: "unreadable" });
});
