import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDraft,
  clearOutbox,
  draftKey,
  flushOutbox,
  loadDraft,
  queueAttempt,
  readOutbox,
  saveDraft,
  type PendingAttempt,
} from "./drafts";

// Everything a student types already reaches the database -- but only as part of
// a SUBMITTED attempt. Between keystrokes and submit there was nothing, and
// after a failed write there was nothing either, while a toast said their
// progress still counted.

const attempt = (over: Partial<PendingAttempt> = {}): PendingAttempt => ({
  assignmentId: "assign-1",
  studentId: "student-1",
  itemOrder: 1,
  responseText: "If the fans run overnight, then the orchids bloom by morning.",
  verdict: "correct",
  attemptNo: 1,
  ...over,
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("drafts", () => {
  it("keeps a half-typed answer keyed to its own question", () => {
    saveDraft(draftKey("a", 24), "half a sentence");
    expect(loadDraft(draftKey("a", 24))).toBe("half a sentence");
    expect(loadDraft(draftKey("a", 25))).toBe("");
    expect(loadDraft(draftKey("b", 24))).toBe("");
  });

  it("returns empty rather than throwing for a question never typed in", () => {
    expect(loadDraft(draftKey("a", 1))).toBe("");
  });

  it("drops the draft when the box is emptied", () => {
    const key = draftKey("a", 1);
    saveDraft(key, "something");
    saveDraft(key, "");
    expect(loadDraft(key)).toBe("");
  });

  it("clears once the attempt is on record", () => {
    const key = draftKey("a", 1);
    saveDraft(key, "submitted now");
    clearDraft(key);
    expect(loadDraft(key)).toBe("");
  });

  it("survives storage being unavailable, because a draft is not worth a crash", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => saveDraft(draftKey("a", 1), "text")).not.toThrow();
    spy.mockRestore();
  });
});

describe("the outbox", () => {
  it("holds an attempt the database refused", () => {
    queueAttempt(attempt());
    expect(readOutbox()).toHaveLength(1);
  });

  it("replaces rather than stacks when the same attempt fails twice", () => {
    queueAttempt(attempt({ responseText: "first try" }));
    queueAttempt(attempt({ responseText: "same attempt, retried" }));
    const queue = readOutbox();
    expect(queue).toHaveLength(1);
    expect(queue[0].responseText).toBe("same attempt, retried");
  });

  it("keeps genuinely different attempts apart", () => {
    queueAttempt(attempt({ itemOrder: 1, attemptNo: 1 }));
    queueAttempt(attempt({ itemOrder: 1, attemptNo: 2 }));
    queueAttempt(attempt({ itemOrder: 2, attemptNo: 1 }));
    expect(readOutbox()).toHaveLength(3);
  });

  it("empties on a successful flush", async () => {
    queueAttempt(attempt());
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await flushOutbox(send);
    expect(result).toEqual({ sent: 1, remaining: 0 });
    expect(readOutbox()).toHaveLength(0);
  });

  it("keeps what still fails and sends what does not", async () => {
    queueAttempt(attempt({ itemOrder: 1 }));
    queueAttempt(attempt({ itemOrder: 2 }));
    const send = vi.fn(async (a: PendingAttempt) => {
      if (a.itemOrder === 2) throw new Error("still down");
    });
    const result = await flushOutbox(send);
    expect(result).toEqual({ sent: 1, remaining: 1 });
    expect(readOutbox().map((a) => a.itemOrder)).toEqual([2]);
  });

  // A flush is a background repair; nothing is waiting on it.
  it("never throws, whatever the send does", async () => {
    queueAttempt(attempt());
    await expect(flushOutbox(async () => { throw new Error("down"); })).resolves.toEqual({
      sent: 0,
      remaining: 1,
    });
  });

  it("does nothing at all when there is nothing queued", async () => {
    const send = vi.fn();
    expect(await flushOutbox(send)).toEqual({ sent: 0, remaining: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it("discards a corrupt queue rather than carrying it forever", () => {
    window.localStorage.setItem("ac:outbox", "{not json");
    expect(readOutbox()).toEqual([]);
    expect(window.localStorage.getItem("ac:outbox")).toBeNull();
  });

  it("stays a retry queue rather than becoming a leak", () => {
    for (let i = 0; i < 60; i += 1) queueAttempt(attempt({ itemOrder: i }));
    expect(readOutbox().length).toBeLessThanOrEqual(50);
  });

  it("clears on demand", () => {
    queueAttempt(attempt());
    clearOutbox();
    expect(readOutbox()).toEqual([]);
  });
});
