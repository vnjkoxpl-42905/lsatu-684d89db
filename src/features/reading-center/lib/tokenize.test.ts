import { describe, expect, it } from "vitest";
import { chunkIndexForWord, chunkTokens, slugify, splitParagraphs, tokenize } from "./tokenize";

const BODY = "One two, three. Four?\n\nFive six seven.";

describe("tokenize", () => {
  it("splits paragraphs on blank lines", () => {
    expect(splitParagraphs(BODY)).toEqual(["One two, three. Four?", "Five six seven."]);
  });
  it("numbers words across the whole passage", () => {
    const t = tokenize(BODY);
    expect(t.map((x) => x.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(t[4].paragraphIndex).toBe(1);
  });
  it("flags punctuation", () => {
    const t = tokenize(BODY);
    expect(t[1].hasPunctuation).toBe(true);   // two,
    expect(t[2].endsSentence).toBe(true);     // three.
    expect(t[3].endsSentence).toBe(true);     // Four?
    expect(t[3].endsParagraph).toBe(true);
    expect(t[0].hasPunctuation).toBe(false);
  });
  it("treats a closing quote or bracket after a full stop as a sentence end", () => {
    expect(tokenize("He left.)")[1].endsSentence).toBe(true);
    expect(tokenize("home.’")[0].endsSentence).toBe(true);
  });
});

describe("chunkTokens", () => {
  it("never crosses a paragraph", () => {
    const c = chunkTokens(tokenize(BODY), 3, 1);
    expect(c.map((x) => [x.startWord, x.endWord])).toEqual([[0, 2], [3, 3], [4, 6]]);
  });
  it("lays a chunk out in rows", () => {
    const c = chunkTokens(tokenize(BODY), 2, 2);
    expect(c[0].rows.map((r) => r.map((t) => t.text))).toEqual([["One", "two,"], ["three.", "Four?"]]);
  });
  it("finds the chunk for a word", () => {
    const c = chunkTokens(tokenize(BODY), 3, 1);
    expect(chunkIndexForWord(c, 5)).toBe(2);
    expect(chunkIndexForWord(c, 99)).toBe(0);
  });
});

describe("slugify", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("Living in a rational society")).toBe("living-in-a-rational-society");
    expect(slugify("  Café: Notes!! ")).toBe("cafe-notes");
  });
});
