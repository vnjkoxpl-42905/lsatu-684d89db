import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "./grading";

/**
 * The judging stage, minus the judge.
 *
 * A section is 22 stimuli and each one costs a model call. Run one after
 * another they took the grader past its wall clock and it returned 504 having
 * written nothing -- so a run that was recorded, uploaded and transcribed
 * correctly produced no Report Card at all. This is what replaced the loop.
 *
 * Two properties decide whether that trade was safe. Order, because the Report
 * Card is read top to bottom and a section whose stimuli come back shuffled is
 * worse than a slow one. And the bound, because the judge is rate limited and
 * an unbounded fan-out would swap a timeout for a wall of 429s.
 */

/** Resolves after `ms`, recording when it started and finished. */
function slow<T>(value: T, ms: number, log?: string[]) {
  return new Promise<T>((resolve) => setTimeout(() => { log?.push(String(value)); resolve(value); }, ms));
}

describe("mapWithConcurrency", () => {
  it("returns results in the order of the input, not the order they finished", async () => {
    const finished: string[] = [];
    const out = await mapWithConcurrency([50, 10, 30], 3, (ms) => slow(`t${ms}`, ms, finished));
    expect(finished).toEqual(["t10", "t30", "t50"]);
    expect(out).toEqual(["t50", "t10", "t30"]);
  });

  it("runs every item exactly once", async () => {
    const seen: number[] = [];
    const items = Array.from({ length: 22 }, (_, i) => i);
    const out = await mapWithConcurrency(items, 8, async (n) => {
      seen.push(n);
      return n * 2;
    });
    expect(seen.sort((a, b) => a - b)).toEqual(items);
    expect(out).toEqual(items.map((n) => n * 2));
  });

  it("never has more than the limit in flight", async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 22 }, (_, i) => i), 8, async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await slow(null, 5);
      inFlight -= 1;
      return null;
    });
    expect(peak).toBe(8);
  });

  it("passes each item its index", async () => {
    const out = await mapWithConcurrency(["a", "b", "c"], 2, async (item, index) => `${index}:${item}`);
    expect(out).toEqual(["0:a", "1:b", "2:c"]);
  });

  it("does not spawn runners it has no work for", async () => {
    let peak = 0;
    let inFlight = 0;
    await mapWithConcurrency([1, 2], 8, async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await slow(null, 5);
      inFlight -= 1;
      return null;
    });
    expect(peak).toBe(2);
  });

  it("returns nothing for no items rather than hanging", async () => {
    await expect(mapWithConcurrency([], 8, async () => "never")).resolves.toEqual([]);
  });

  /*
   * A throwing worker takes the whole map down, deliberately. There is no
   * swallow-and-continue here: the grader catches per stimulus INSIDE its own
   * worker, so that one unreachable judge call costs its own grade and not the
   * section's. Hiding failures at this level would have hidden that decision
   * too, and a section quietly graded on 19 of 22 stimuli is the failure the
   * `complete` flag exists to prevent.
   */
  it("rejects when a worker rejects, leaving the catching to the caller", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("judge unreachable");
        return n;
      }),
    ).rejects.toThrow("judge unreachable");
  });
});
