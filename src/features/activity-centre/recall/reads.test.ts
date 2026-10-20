import { describe, expect, it } from "vitest";
import { stripVerbatimReads } from "./reads";
import { words } from "./overlap";
import SOURCE from "../content/read-recall-colour-pt105-s2.json";
import REFERENCES from "./fixtures/reference-read-boundaries.json";

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

describe("saved reference read boundaries", () => {
  const strip = (slug: string) => {
    const transcript = REFERENCES.rows.find(row => row.slug === slug)!.transcript;
    const chunks = SOURCE.items.find(item => item.slug === slug)!.chunks.map(chunk => chunk.text);
    return stripVerbatimReads(transcript.split(/\s+/), chunks).kept.join(" ");
  };
  it("preserves the end of the cave retelling's joke without retaining a source fragment", () => {
    const left = strip("PT105_S2_Q1");
    expect(left).toContain("It's very funny. Okay. So inside this cave");
    expect(left).not.toContain("It's very stalagmites");
    expect(left).not.toContain("contains numerous large stalagmites");
    expect(left).toContain("from this, we can infer that it wasn't always totally filled with water");
  });
  it("preserves once a year rather than attaching the source's patient", () => {
    const left = strip("PT105_S2_Q2");
    expect(left).toContain("you only get a flu shot once a year. Okay.");
    expect(left).not.toContain("once a patient");
    expect(left).not.toContain("In support of this claim, the director argued");
    expect(left).toContain("every single person gets a vaccine one time");
  });
  it("removes the complete network source sentence without a leftover charges", () => {
    const left = strip("PT105_S2_Q3");
    expect(left.startsWith("Okay. The manager is saying")).toBe(true);
    expect(left).not.toContain("which would entail much higher installation charges");
    expect(left).toContain("that would cost a lot more money");
    expect(left).toContain("what if the higher installation charges");
  });
});

describe("an aside between comma-split reads", () => {
  const first = "The city council argued that the proposed new network should be installed during the day to reduce the overall costs,";
  const second = "because the installation contractors charge much higher fees at night and the council believes that saving money is important.";
  it.each(["Actually, I disagree.", "actually I disagree"])("preserves her own interruption: %s", aside => {
    const tokens = `${first} ${aside} ${second} Okay, that argument ignores lost productivity.`.split(/\s+/);
    const result = stripVerbatimReads(tokens, [first, second]);
    expect(result.kept.join(" ")).toContain(aside);
    expect(result.kept.join(" ")).toContain("Okay, that argument ignores lost productivity.");
    expect(result.kept.join(" ")).not.toContain("The city council argued");
    expect(result.kept.join(" ")).not.toContain("the installation contractors charge much higher fees");
  });
  it("preserves an unpunctuated aside even when every word also occurs in the source", () => {
    const firstWithCommonWords = "The city council argued that the proposed new network is wrong for this building and should instead be installed elsewhere,";
    const tokens = `${firstWithCommonWords} that is wrong ${second} Okay, that argument ignores lost productivity.`.split(/\s+/);
    const result = stripVerbatimReads(tokens, [firstWithCommonWords, second]);
    expect(result.kept.join(" ")).toContain("that is wrong");
    expect(result.kept.join(" ")).toContain("Okay, that argument ignores lost productivity.");
    expect(result.kept.join(" ")).not.toContain("The city council argued");
  });
});
