import { describe, expect, it } from "vitest";
import { stripVerbatimReads } from "./reads";
import { words } from "./overlap";

/**
 * Cutting the reads out before anything is judged.
 *
 * ADR 0017 closed one asymmetry between the run and the standard -- the
 * transcript engine. This is the other one. The 1,294 Details were calibrated
 * against transcripts that `student_shaped.py` had already stripped of the
 * verbatim reads, on the stated assumption that "the student never does: she
 * reads silently". Nothing in the app enforces that, and when she reads aloud
 * the source text lands in the judge's only evidence, where every Detail is
 * trivially present.
 *
 * The failure is silent and it points the wrong way: the student who reads
 * aloud is scored HIGHER for doing less, on the same recording that gets her
 * flagged for Reciting.
 */

const CHUNK =
  "Our management consultant proposes that we reassign staff so that all employees are doing both what they like to do and what they do well.";

describe("what gets cut", () => {
  it("removes a chunk read out word for word", () => {
    const spoken = words(`${CHUNK} so she wants people put where they are good and happy`);
    const out = stripVerbatimReads(spoken, [CHUNK]);
    expect(out.chunksReadAloud).toEqual([1]);
    // What is left is what she SAID about it, which is the whole point.
    expect(out.kept.join(" ")).toBe("so she wants people put where they are good and happy");
  });

  it("leaves a genuine retelling alone, even one that reuses the nouns", () => {
    const spoken = words(
      "the management consultant wants staff reassigned so everyone does what they enjoy and what they are good at",
    );
    const out = stripVerbatimReads(spoken, [CHUNK]);
    expect(out.cut).toBe(0);
    expect(out.chunksReadAloud).toEqual([]);
    expect(out.kept).toEqual(spoken);
  });

  it("never cuts a short chunk, where a read and a coincidence stop being separable", () => {
    // Leaving a short read in costs a little accuracy on one Detail. Cutting a
    // short paraphrase costs her the Detail outright, so this errs the safe way.
    const short = "But Ace has a commitment.";
    const spoken = words(`${short} ${short}`);
    const out = stripVerbatimReads(spoken, [short]);
    expect(out.cut).toBe(0);
  });

  it("cuts each chunk's read once, in order, and not over her own words", () => {
    const a = "Every dog in the neighbourhood barked at the passing lorry that morning.";
    const b = "Nobody living on that street had complained about the noise before then.";
    const spoken = words(`${a} the dogs all barked ${b} and no one had complained`);
    const out = stripVerbatimReads(spoken, [a, b]);
    expect(out.chunksReadAloud).toEqual([1, 2]);
    expect(out.kept.join(" ")).toBe("the dogs all barked and no one had complained");
  });

  it("says how much it cut, so a run that was mostly reading is visible", () => {
    const out = stripVerbatimReads(words(CHUNK), [CHUNK]);
    expect(out.cut).toBe(words(CHUNK).length);
    expect(out.kept).toEqual([]);
  });

  it("does nothing to a run with no reading in it at all", () => {
    const spoken = words("she says reassigning people will make them more productive");
    const out = stripVerbatimReads(spoken, [CHUNK, "A second chunk of some length that she never read."]);
    expect(out.kept).toEqual(spoken);
  });
});
