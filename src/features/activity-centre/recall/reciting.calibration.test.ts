import { describe, expect, it } from "vitest";
import { RECITING_BIGRAM, RECITING_RUN, RECITING_RUN_SHARE, checkReciting } from "./overlap";
import modelRunOverlap from "./model-run-overlap.json";

/**
 * The Reciting thresholds, pinned to the runs they were measured against.
 *
 * Reciting is the drill's named failure: saying a stimulus back close to
 * word-for-word instead of in her own words. Flagging it wrongly tells a
 * student something about herself that is not true, and nothing on the Report
 * Card lets her argue with it.
 *
 * This has now been got wrong twice, the same way both times. The first pair,
 * 12 and 0.50, was never measured at all. The second, 45 and 0.80, was measured
 * on ONE section -- and the moment a longer stimulus appeared, the standard
 * itself started flagging as a recital. So the corpus below is every model run
 * we have, across every captured section, and the assertions are derived from
 * it rather than written beside it.
 */

/**
 * Joshua reading each chunk aloud and then recalling it: the drill done right,
 * 274 times across all twelve captured sections.
 *
 * Computed by the functions under test from `model_runs.transcript_text` against
 * each stimulus's own chunks, 2026-09-04. Rows are `[section, run, bigram]`.
 */
const MODEL_RUNS = (modelRunOverlap as [string, number, number][]).map(([section, run, bigram]) => ({
  section,
  run,
  bigram,
}));

/**
 * A student reading silently and retelling: PT102.S3, done correctly.
 *
 * Kept from the 2026-09-03 trial. It is the only student population measured so
 * far, and it is the one that holds the highest honest share of anything ever
 * recorded, so it sets the floor the run backstop has to clear.
 */
const CORRECT_STUDENT = [
  { run: 15, bigram: 0.382 }, { run: 8, bigram: 0.402 }, { run: 10, bigram: 0.259 },
  { run: 5, bigram: 0.33 }, { run: 3, bigram: 0.145 }, { run: 8, bigram: 0.28 },
  { run: 13, bigram: 0.652 }, { run: 4, bigram: 0.188 }, { run: 18, bigram: 0.422 },
  { run: 6, bigram: 0.287 }, { run: 5, bigram: 0.196 }, { run: 10, bigram: 0.379 },
  { run: 11, bigram: 0.39 }, { run: 3, bigram: 0.163 }, { run: 3, bigram: 0.202 },
  { run: 14, bigram: 0.364 }, { run: 3, bigram: 0.158 }, { run: 9, bigram: 0.464 },
  { run: 4, bigram: 0.312 }, { run: 5, bigram: 0.229 }, { run: 4, bigram: 0.259 },
];

/** Both deliberate recites: the stimulus said back, on purpose, to be caught. */
const DELIBERATE_RECITES = [
  { run: 48, bigram: 0.989 },
  { run: 57, bigram: 0.952 },
];

/**
 * The stimulus the audit caught being called a recital.
 *
 * Joshua's own run, in the standard, at run 46 with a share of 0.258. A share
 * that low says plainly it was not a recital; the run arm said it was anyway.
 */
const THE_FALSE_POSITIVE = { run: 46, bigram: 0.258 };

const flags = (r: { run: number; bigram: number }) =>
  r.bigram >= RECITING_BIGRAM || (r.run >= RECITING_RUN && r.bigram >= RECITING_RUN_SHARE);

describe("what the Reciting thresholds must not do", () => {
  it("never calls one of Joshua's 274 model runs a recital", () => {
    // He reads every chunk aloud before recalling it, which pins any
    // longest-run measure regardless of how well he retells. If the standard
    // itself fails the check, the check is wrong rather than the standard.
    expect(MODEL_RUNS.filter(flags)).toEqual([]);
  });

  it("covers every captured section, not one of them", () => {
    // The whole defect was a threshold measured on PT102.S3 and applied to
    // sections with longer stimuli in them.
    expect(new Set(MODEL_RUNS.map((m) => m.section)).size).toBe(12);
    expect(MODEL_RUNS.length).toBeGreaterThanOrEqual(274);
  });

  it("never calls a correct retelling a recital", () => {
    expect(CORRECT_STUDENT.filter(flags)).toEqual([]);
  });

  it("does not call the standard's own long read a recital", () => {
    expect(flags(THE_FALSE_POSITIVE)).toBe(false);
  });
});

describe("what they must still do", () => {
  it("catches a stimulus said back word for word", () => {
    for (const recite of DELIBERATE_RECITES) expect(flags(recite)).toBe(true);
  });

  it("still catches a long run when the share is elevated beside it", () => {
    // The backstop has to remain a backstop. A response that is mostly the
    // stimulus AND carries a long verbatim stretch is a recital even below the
    // share threshold on its own.
    expect(flags({ run: RECITING_RUN, bigram: RECITING_RUN_SHARE })).toBe(true);
    expect(flags({ run: RECITING_RUN - 1, bigram: RECITING_RUN_SHARE })).toBe(false);
  });
});

describe("the shape of the two measures", () => {
  it("does not let a long run flag on its own, because the standard reaches 60", () => {
    const longest = Math.max(...MODEL_RUNS.map((m) => m.run));
    expect(longest).toBeGreaterThan(RECITING_RUN);
    // Four of the 274 sit at or above the run threshold. Every one of them is
    // an honest read, so the run alone cannot be allowed to decide.
    expect(MODEL_RUNS.filter((m) => m.run >= RECITING_RUN).length).toBeGreaterThan(0);
    expect(MODEL_RUNS.filter((m) => m.run >= RECITING_RUN).filter(flags)).toEqual([]);
  });

  it("keeps the share threshold above every honest retelling", () => {
    const honest = [...MODEL_RUNS, ...CORRECT_STUDENT].map((m) => m.bigram);
    expect(RECITING_BIGRAM).toBeGreaterThan(Math.max(...honest));
  });

  it("keeps the run backstop's share above every honest retelling too", () => {
    // Otherwise the backstop puts back exactly the false positives the share
    // threshold was raised to remove.
    const honest = [...MODEL_RUNS, ...CORRECT_STUDENT].map((m) => m.bigram);
    expect(RECITING_RUN_SHARE).toBeGreaterThan(Math.max(...honest));
  });

  it("reports the reading it decided on, not just the verdict", () => {
    // A flag with no number behind it cannot be argued with, and recalibrating
    // meant reconstructing these from a scratchpad because nothing kept them.
    const check = checkReciting("the sky is blue today", "the sky is blue today and cold");
    expect(check).toEqual({ run: expect.any(Number), bigram: expect.any(Number), reciting: expect.any(Boolean) });
    expect(check.run).toBe(5);
  });
});
