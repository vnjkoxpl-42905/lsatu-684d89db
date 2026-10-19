import { describe, expect, it } from "vitest";
import { isSegmentable, PassageSegmentError, segmentPassage, paragraphDisplayLabel } from "./segment";
import { recapLabel } from "./history";

import { COMPARATIVE, STANDARD } from "./fixtures";

describe("segmentPassage", () => {
  it("shares comparative local numbering with saved recall labels without changing global keys", () => {
    const source = segmentPassage("Passage A\n\nA first.\n\nA second.\n\nPassage B\n\nB first.");
    expect(paragraphDisplayLabel(source, 2)).toBe("Passage B · Paragraph 1 of 1");
    const recap = { recap_key: "p2-para3-recall", kind: "recall" as const, passage_position: 2 };
    expect(recapLabel(recap, source, 4)).toBe("Selected passage 2 · Passage B · Paragraph 1 of 1");
    expect(recap.recap_key).toBe("p2-para3-recall");
    expect(recapLabel(recap)).toBe("Passage 2, paragraph 3");
    expect(paragraphDisplayLabel(source, 99)).toBeNull();
    expect(paragraphDisplayLabel(segmentPassage("Whole first.\n\nWhole second."), 1)).toBe("Paragraph 2 of 2");
  });
  it("splits a standard passage into paragraphs", () => {
    const s = segmentPassage(STANDARD);
    expect(s.comparative).toBe(false);
    expect(s.paragraphs.map((p) => p.text)).toEqual(["One one.", "Two two.", "Three three.", "Four four.", "Five five.", "Six six."]);
    expect(s.paragraphs.every((p) => p.sub === null && p.labels.length === 0)).toBe(true);
  });

  it("normalizes Windows line endings before splitting paragraphs", () => {
    expect(segmentPassage("First paragraph.\r\n\r\nSecond paragraph.").paragraphs.map((p) => p.text))
      .toEqual(["First paragraph.", "Second paragraph."]);
  });

  it("attaches the source note and headings as labels, never as recall units", () => {
    const s = segmentPassage(COMPARATIVE);
    expect(s.comparative).toBe(true);
    expect(s.paragraphs).toHaveLength(6);
    expect(s.paragraphs[0].labels).toEqual([
      "Passage A is from a source published in 2004 and passage B is from a source published in 2007.",
      "Passage A",
    ]);
    expect(s.paragraphs[3].labels).toEqual(["Passage B"]);
    expect(s.paragraphs.map((p) => p.sub)).toEqual(["A", "A", "A", "B", "B", "B"]);
    expect(s.paragraphs.some((p) => /^Passage [AB]$/.test(p.text))).toBe(false);
  });

  it("fails visibly on empty text", () => {
    expect(() => segmentPassage("  \n\n ")).toThrow(PassageSegmentError);
    expect(isSegmentable("")).toBe(false);
    expect(isSegmentable(null)).toBe(false);
    expect(isSegmentable(STANDARD)).toBe(true);
  });
});
