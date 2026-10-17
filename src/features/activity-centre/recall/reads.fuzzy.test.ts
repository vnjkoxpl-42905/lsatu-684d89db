import { describe, expect, it } from "vitest";
import { MIN_READ_RATIO, locateRead, readWords, stripVerbatimReads } from "./reads";
import READINGS from "./model-run-reads.json";

/**
 * The read has to be found through the transcript, not despite it.
 *
 * `reads.test.ts` covers what the cut is FOR. This covers whether it can still
 * find the read once a real recording has been through a real engine, which is
 * the audit finding that ordered the rewrite: on the standard's own PT134.S3
 * run the deployed stripper cut 7% of the words and found 38 of 87 chunks,
 * where the aligner that produced the calibration corpus finds 86 and cuts 19%.
 * A stripper that only fires on a perfect match is not an ear, and "at the
 * standard" was a statement about it rather than about her.
 *
 * The words arrive as Deepgram's `punctuated_word`, so every case here is
 * written the way the grader actually receives them -- capitals, commas, full
 * stops -- rather than pre-normalised.
 */

const CHUNK =
  "Our management consultant proposes that we reassign staff so that all employees are doing both what they like to do and what they do well.";
const HER_OWN = "so she wants people put where they are good and happy";

/** As the grader passes them in: one token per word, punctuation attached. */
const spoken = (text: string) => text.split(/\s+/).filter(Boolean);

/** Did any of these content words survive the cut? */
const carries = (kept: string[], phrase: string) => {
  const left = new Set(kept.flatMap((t) => readWords(t)));
  return phrase.split(" ").some((w) => left.has(w));
};

describe("finding the read through the transcript", () => {
  it("cuts a chunk read out word for word, capitals and punctuation and all", () => {
    // The case that was failing in the field. Nothing about this read is fuzzy:
    // it is verbatim. It survived because "Our" was compared against "our".
    const out = stripVerbatimReads(spoken(`${CHUNK} ${HER_OWN}`), [CHUNK]);
    expect(out.chunksReadAloud).toEqual([1]);
    expect(out.kept.join(" ")).toBe(HER_OWN);
  });

  it("cuts it with one word in seven misheard", () => {
    const misheard =
      "Our management consultant proposes that we reassign staff such that all employees are doing both what they like to do and what they do good.";
    const out = stripVerbatimReads(spoken(`${misheard} ${HER_OWN}`), [CHUNK]);
    expect(out.chunksReadAloud).toEqual([1]);
    expect(out.kept.join(" ")).toBe(HER_OWN);
  });

  it("cuts it with a filled hesitation inside it", () => {
    const hesitant =
      "Our management consultant proposes that we, um, you know, reassign staff so that all employees are doing both what they like to do and what they do well.";
    const out = stripVerbatimReads(spoken(`${hesitant} ${HER_OWN}`), [CHUNK]);
    expect(out.chunksReadAloud).toEqual([1]);
    // What has to be true is that the source text is out of the evidence.
    expect(carries(out.kept, "management consultant proposes reassign employees")).toBe(false);
    expect(out.kept.join(" ")).toContain(HER_OWN);
  });

  it("cuts it when the recording opens partway into the read", () => {
    // PT134.S3.Q16 in the corpus: the recording starts mid-sentence, and the
    // old exact match lost not just that chunk but every chunk after it.
    const clipped =
      "consultant proposes that we reassign staff so that all employees are doing both what they like to do and what they do well.";
    const out = stripVerbatimReads(spoken(`${clipped} ${HER_OWN}`), [CHUNK]);
    expect(out.chunksReadAloud).toEqual([1]);
    expect(carries(out.kept, "consultant proposes reassign employees")).toBe(false);
  });

  it("keeps the adjacent retelling when a clipped read ends at a sentence boundary", () => {
    // A fixed-width alignment used to consume the first words of her retell.
    // The ASR sentence boundary identifies the complete read without them.
    const clipped =
      "consultant proposes that we reassign staff so that all employees are doing both what they like to do and what they do well.";
    const out = stripVerbatimReads(spoken(`${clipped} ${HER_OWN}`), [CHUNK]);
    expect(out.kept.join(" ")).toBe(HER_OWN);
  });

  it("leaves a genuine retelling alone, which is the regression that matters", () => {
    // Cutting this would silently delete her real recall and mark her down for
    // Details she carried. It is the failure worth being strict about.
    const hers = spoken(
      "the management consultant wants staff reassigned so everyone does what they enjoy and what they are good at",
    );
    const out = stripVerbatimReads(hers, [CHUNK]);
    expect(out.cut).toBe(0);
    expect(out.chunksReadAloud).toEqual([]);
    expect(out.kept).toEqual(hers);
  });

  it("does not cut a chunk she only half read, and this is the known edge", () => {
    // Half a chunk scores near 0.6 however it is measured, because the half she
    // did not read is still in the needle. That sits below any tolerance loose
    // enough to leave her retelling alone -- 0.6 is also roughly what a close
    // paraphrase scores. So half the source text stays in the evidence, and the
    // cost is bounded to that half of one chunk. Recorded rather than hidden:
    // if it needs closing, it needs a second measure, not a lower tolerance.
    const half = "all employees are doing both what they like to do and what they do well.";
    const out = stripVerbatimReads(spoken(`${half} ${HER_OWN}`), [CHUNK]);
    expect(out.cut).toBe(0);
  });

  it("keeps her words as she said them, punctuation intact, for the transcript she is shown", () => {
    // The normalising is for the comparison only. The expanded row on the
    // Report Card shows this text back to her, and stripped of its capitals and
    // full stops it would be unreadable.
    const out = stripVerbatimReads(spoken(`${CHUNK} So she wants people put where they fit.`), [CHUNK]);
    expect(out.kept.join(" ")).toBe("So she wants people put where they fit.");
  });
});

describe("ordering, when one read is missing", () => {
  const a = "Every dog in the neighbourhood barked at the passing lorry that morning.";
  const b = "Nobody living on that street had complained about the noise before then.";

  it("does not let a chunk she skipped starve the chunks after it", () => {
    // She read chunk 1, said nothing at all about chunk 2, then read chunk 3.
    // A single advancing cursor is what breaks here: chunk 2's best match is
    // junk sitting somewhere arbitrary, and every later chunk is searched from
    // after it.
    const c = "The council had promised a decision before the end of the summer.";
    const out = stripVerbatimReads(spoken(`${a} the dogs barked ${c} and the council promised`), [a, b, c]);
    expect(out.chunksReadAloud).toEqual([1, 3]);
    expect(out.kept.join(" ")).toBe("the dogs barked and the council promised");
  });
});

/**
 * The tolerance, re-derived rather than asserted.
 *
 * `model-run-reads.json` is the best alignment ratio for every one of the 956
 * chunks in the twelve captured sections, scored twice by `locateRead` itself:
 * against the transcript holding the read, and against the same transcript with
 * the read already cut out by the corpus aligner, which leaves his retelling
 * and colouring and nothing else. That second column is the closest thing the
 * corpus has to a student's recording, and separating the two columns is the
 * only job the threshold has.
 *
 * Adding a section is an append to the fixture. Nothing here hard-codes a
 * count, so the assertions re-derive on whatever it holds.
 */
describe("MIN_READ_RATIO, against the captured corpus", () => {
  const rows = (READINGS as [string, number, number, number, number][]).map(
    ([slug, chunk, chunkWords, withRead, readRemoved]) => ({ slug, chunk, chunkWords, withRead, readRemoved }),
  );
  // The 8-word floor is part of the policy, so the calibration is measured
  // where the policy applies.
  const eligible = rows.filter((r) => r.chunkWords >= 8);
  const share = (n: number) => n / eligible.length;

  it("has readings for every chunk of every captured section", () => {
    expect(rows.length).toBeGreaterThanOrEqual(956);
    expect(new Set(rows.map((r) => r.slug.split("_Q")[0])).size).toBeGreaterThanOrEqual(12);
  });

  it("finds at least 95% of the reads that are there", () => {
    const found = eligible.filter((r) => r.withRead >= MIN_READ_RATIO).length;
    expect(share(found)).toBeGreaterThanOrEqual(0.95);
  });

  it("mistakes her own words for a read at most 2% of the time", () => {
    const wrong = eligible.filter((r) => r.readRemoved >= MIN_READ_RATIO).length;
    expect(share(wrong)).toBeLessThanOrEqual(0.02);
  });

  it("would fail both ways at the corpus aligner's own 0.55", () => {
    // Why the ported tolerance is not the ported constant. At 0.55 the stripper
    // cuts something out of more than a quarter of the chunks that hold no read
    // at all, which is her recall being deleted.
    const wrongAt55 = eligible.filter((r) => r.readRemoved >= 0.55).length;
    expect(share(wrongAt55)).toBeGreaterThan(0.2);
  });

  it("is set where the two distributions actually separate", () => {
    // Loosening it costs her words; tightening it lets the source text back in.
    const at = (t: number) => ({
      found: share(eligible.filter((r) => r.withRead >= t).length),
      wrong: share(eligible.filter((r) => r.readRemoved >= t).length),
    });
    const looser = at(MIN_READ_RATIO - 0.05);
    const tighter = at(MIN_READ_RATIO + 0.05);
    expect(looser.wrong).toBeGreaterThan(at(MIN_READ_RATIO).wrong * 1.5);
    expect(tighter.found).toBeLessThan(at(MIN_READ_RATIO).found - 0.03);
  });
});

describe("the tokeniser the alignment runs on", () => {
  it("keeps a contraction whole, which rrcOverlap's does not", () => {
    // The two are deliberately different and the difference is load-bearing:
    // widening rrcOverlap's would move ADR 0022's reciting thresholds, which
    // were calibrated on its output.
    expect(readWords("Thus, they don't really help.")).toEqual(["thus", "they", "don't", "really", "help"]);
  });

  it("folds the curly apostrophe the stimulus text uses and no engine emits", () => {
    expect(readWords("it’s")).toEqual(readWords("it's"));
  });

  it("scores an empty needle as no match rather than a perfect one", () => {
    expect(locateRead([], ["anything"])).toBeNull();
    expect(locateRead(["anything"], [])).toBeNull();
  });
});
