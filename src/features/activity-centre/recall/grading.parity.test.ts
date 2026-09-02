import { describe, expect, it } from "vitest";
import pt102 from "../content/read-recall-colour-pt102-s3.json";
import pt105 from "../content/read-recall-colour-pt105-s2.json";
import pt134 from "../content/read-recall-colour-pt134-s3.json";
import { classifyDetail, isKindResidue, type DetailKind } from "./grading";

/**
 * Cross-language parity with the Python classifier.
 *
 * `classifyDetail` is a port of
 * `system/scripts/activity-centre/classify_details.py`, and the two have to
 * agree exactly: the Python one produced the census in
 * `corpus/loophole-online/rrc-sections/coverage-baseline.md` that the band
 * floor was measured from, and this one decides what a student is shown. A
 * drift between them is invisible -- scores just move slightly -- so it is
 * asserted against the counts the census was computed with.
 */

type Section = { items: { chunks: { details: { text: string }[] }[] }[] };
const SECTIONS = [pt102, pt105, pt134] as unknown as Section[];

function everyDetail(): string[] {
  return SECTIONS.flatMap((s) => s.items.flatMap((i) => i.chunks.flatMap((c) => c.details.map((d) => d.text))));
}

describe("the classifier agrees with the one that produced the census", () => {
  const details = everyDetail();

  it("sees the whole authored key", () => {
    expect(details).toHaveLength(1294);
  });

  it("splits it exactly as Python did", () => {
    const counts: Record<DetailKind, number> = { content: 0, structure: 0, modality: 0 };
    for (const text of details) counts[classifyDetail(text)]++;
    expect(counts).toEqual({ content: 1133, structure: 137, modality: 24 });
  });

  it("leaves the same four residue lines, all of them correctly content", () => {
    const residue = details.filter((t) => isKindResidue(t, classifyDetail(t)));
    expect(residue.sort()).toEqual(
      [
        "This is a rule about companies.",
        "This is around running boat engines.",
        "This is during the next century.",
        "This is how the data were obtained.",
      ].sort(),
    );
  });
});
