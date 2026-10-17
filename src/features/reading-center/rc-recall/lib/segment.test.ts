import { describe, expect, it } from "vitest";
import { isSegmentable, PassageSegmentError, segmentPassage } from "./segment";

import { COMPARATIVE, STANDARD } from "./fixtures";

describe("segmentPassage", () => {
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
