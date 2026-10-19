import { describe, expect, it } from "vitest";
import { isSegmentable, PassageSegmentError, segmentPassage, paragraphDisplayLabel } from "./segment";
import { recapLabel } from "./history";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { COMPARATIVE, STANDARD } from "./fixtures";

describe("segmentPassage", () => {
  it("repairs only editorial notes, bare backticks and the two confirmed dependent lists in version 2", () => {
    const dir = resolve("public/data/rc");
    const passages = readdirSync(dir).filter((name) => /^RC-PT\d+\.json$/.test(name)).flatMap((name) => JSON.parse(readFileSync(resolve(dir, name), "utf8")).passages);
    let removedNotes = 0;
    for (const source of passages) {
      const before = segmentPassage(source.text);
      const after = segmentPassage(source.text, 2, source);
      expect(after.comparative).toBe(before.comparative);
      const leadingNote = before.paragraphs[0].text;
      if (/^\*[^*][\s\S]*\*$/.test(leadingNote)) {
        removedNotes++;
        expect(after.paragraphs.some((item) => item.text === leadingNote)).toBe(false);
      }
      expect(after.paragraphs.some((item) => /^`+$/.test(item.text))).toBe(false);
      if (source.preptest === 141 && [30, 201].includes(source.passageId)) {
        const prefix = source.passageId === 30 ? "Given such principles" : "Now consider the phenomenon of rivalry";
        const combined = after.paragraphs.find((item) => item.text.startsWith(prefix))!;
        expect(combined).toBeDefined();
        for (const block of before.paragraphs.filter((item) => /^(?:[123]\. |[AB]\. You earn)/.test(item.text))) expect(combined.text).toContain(block.text);
        expect(after.paragraphs).toHaveLength(before.paragraphs.length - (source.passageId === 30 ? 3 : 2));
      } else {
        expect(after.paragraphs.map((item) => item.text)).toEqual(before.paragraphs.filter((item) => item.text !== leadingNote || !/^\*[^*][\s\S]*\*$/.test(leadingNote)).filter((item) => !/^`+$/.test(item.text)).map((item) => item.text));
      }
    }
    expect(passages).toHaveLength(320);
    expect(removedNotes).toBe(26);
    expect(segmentPassage("*An italic claim remains body prose.*\n\nNext paragraph.", 2).paragraphs).toHaveLength(2);
  });
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
