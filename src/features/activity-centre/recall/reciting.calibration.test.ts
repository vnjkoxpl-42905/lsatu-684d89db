import { describe, expect, it } from "vitest";
import { RECITING_BIGRAM, RECITING_RUN, checkReciting } from "./overlap";

/**
 * The Reciting thresholds, pinned to the runs they were measured against.
 *
 * Reciting is the drill's named failure: saying a stimulus back close to
 * word-for-word instead of in her own words. Flagging it wrongly tells a
 * student something about herself that is not true, and nothing on the Report
 * Card lets her argue with it.
 *
 * The first pair of numbers, 12 and 0.50, was never measured. It flagged all 22
 * of Joshua's own model runs -- the recordings that define a correct
 * performance -- and 4 of 21 correct stimuli on the first real trial. These
 * hold the replacement to the three populations it was calibrated against, so a
 * later tweak cannot quietly put the false positives back.
 *
 * The readings below are real, from `model_runs` for PT102.S3 and from the
 * 2026-09-03 trial of that same section.
 */

/** Joshua reading each chunk aloud and then recalling it: the drill done right. */
const MODEL_RUNS = [
  { run: 19, bigram: 0.18 }, { run: 20, bigram: 0.207 }, { run: 21, bigram: 0.218 },
  { run: 21, bigram: 0.225 }, { run: 22, bigram: 0.238 }, { run: 25, bigram: 0.255 },
  { run: 27, bigram: 0.268 }, { run: 28, bigram: 0.274 }, { run: 28, bigram: 0.289 },
  { run: 31, bigram: 0.29 }, { run: 32, bigram: 0.293 }, { run: 32, bigram: 0.296 },
  { run: 33, bigram: 0.318 }, { run: 34, bigram: 0.326 }, { run: 34, bigram: 0.335 },
  { run: 35, bigram: 0.337 }, { run: 35, bigram: 0.345 }, { run: 36, bigram: 0.345 },
  { run: 38, bigram: 0.351 }, { run: 39, bigram: 0.352 }, { run: 40, bigram: 0.403 },
  { run: 43, bigram: 0.404 },
];

/** A student reading silently and retelling: the same section, done correctly. */
const CORRECT_STUDENT = [
  { run: 15, bigram: 0.382 }, { run: 8, bigram: 0.402 }, { run: 10, bigram: 0.259 },
  { run: 5, bigram: 0.33 }, { run: 3, bigram: 0.145 }, { run: 8, bigram: 0.28 },
  { run: 13, bigram: 0.652 }, { run: 4, bigram: 0.188 }, { run: 18, bigram: 0.422 },
  { run: 6, bigram: 0.287 }, { run: 5, bigram: 0.196 }, { run: 10, bigram: 0.379 },
  { run: 11, bigram: 0.39 }, { run: 3, bigram: 0.163 }, { run: 3, bigram: 0.202 },
  { run: 14, bigram: 0.364 }, { run: 3, bigram: 0.158 }, { run: 9, bigram: 0.464 },
  { run: 4, bigram: 0.312 }, { run: 5, bigram: 0.229 }, { run: 4, bigram: 0.259 },
];

/** The one deliberate recite planted in that trial: the stimulus said back twice. */
const DELIBERATE_RECITE = { run: 48, bigram: 0.989 };

const flags = (r: { run: number; bigram: number }) =>
  r.run >= RECITING_RUN || r.bigram >= RECITING_BIGRAM;

describe("what the Reciting thresholds must not do", () => {
  it("never calls Joshua's own model run a recital", () => {
    // He reads every chunk aloud before recalling it, which pins any
    // longest-run measure regardless of how well he retells. If the standard
    // itself fails the check, the check is wrong rather than the standard.
    expect(MODEL_RUNS.filter(flags)).toEqual([]);
  });

  it("never calls a correct retelling a recital", () => {
    expect(CORRECT_STUDENT.filter(flags)).toEqual([]);
  });
});

describe("what they must still do", () => {
  it("catches a stimulus said back word for word", () => {
    expect(flags(DELIBERATE_RECITE)).toBe(true);
  });
});

describe("the shape of the two measures", () => {
  it("keeps the run threshold above everything reading aloud produces", () => {
    // 43 is the worst Joshua's own reading-aloud produced. A threshold at or
    // below it makes reading the text out loud indistinguishable from reciting
    // it from memory, which are different things and only one is a failure.
    expect(RECITING_RUN).toBeGreaterThan(Math.max(...MODEL_RUNS.map((m) => m.run)));
  });

  it("keeps the share threshold above every honest retelling", () => {
    const honest = [...MODEL_RUNS, ...CORRECT_STUDENT].map((m) => m.bigram);
    expect(RECITING_BIGRAM).toBeGreaterThan(Math.max(...honest));
  });

  it("reports the reading it decided on, not just the verdict", () => {
    // A flag with no number behind it cannot be argued with, and recalibrating
    // meant reconstructing these from a scratchpad because nothing kept them.
    const check = checkReciting("the sky is blue today", "the sky is blue today and cold");
    expect(check).toEqual({ run: expect.any(Number), bigram: expect.any(Number), reciting: expect.any(Boolean) });
    expect(check.run).toBe(5);
  });
});
