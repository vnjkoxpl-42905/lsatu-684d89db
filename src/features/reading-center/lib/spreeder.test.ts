import { describe, expect, it } from "vitest";
import { SEED_PASSAGE } from "../data/seed";
import {
  breakToSections,
  buildLines,
  buildTextModel,
  chunkDelays,
  evenChunkDelays,
  formatDuration,
  highlightPages,
  normalizeText,
  progressPercent,
  remainingMs,
  sectionTime,
  serialChunks,
} from "./spreeder";

const mono = (t: string) => t.length * 10; // 10px per character, space included

describe("text model", () => {
  it("collapses paragraphs and swaps em dashes, as Spreeder does", () => {
    expect(normalizeText("One.\n\nTwo—three  four")).toBe("One. Two-three four");
  });

  it("keeps sentences under 2000 characters together", () => {
    expect(breakToSections("First one. Second one. Third one.")).toEqual(["First one. Second one. Third one."]);
  });

  it("does not close a section after Mr. or a single initial", () => {
    const long = "x".repeat(1990);
    const s = breakToSections(`${long} said Mr. Smith. Next.`);
    expect(s[0]).toContain("Mr. Smith.");
  });

  it("splits the seed passage into sections of at most about 2400 characters", () => {
    const m = buildTextModel(SEED_PASSAGE.body);
    expect(m.words.length).toBe(SEED_PASSAGE.body.trim().split(/\s+/).length);
    for (const s of m.sections) expect(s.text.length).toBeLessThanOrEqual(2600);
    expect(m.words[0].charPosition).toBe(0);
  });
});

describe("layout", () => {
  const model = buildTextModel("aa bb cc dd ee");
  const words = model.sections[0].words;

  it("caps a line at words per line", () => {
    const lines = buildLines(words, mono, 1000, 2);
    expect(lines.map((l) => l.words.map((w) => w.word.text))).toEqual([["aa", "bb"], ["cc", "dd"], ["ee"]]);
  });

  it("wraps on measured width before the word cap", () => {
    // each word is 30px with its space; 70px fits two
    const lines = buildLines(words, mono, 70, 6);
    expect(lines[0].words.length).toBe(2);
  });

  it("groups lines into serial slides and highlight pages", () => {
    const lines = buildLines(words, mono, 1000, 1);
    expect(serialChunks(lines, 2).map((c) => c.text)).toEqual(["aa bb", "cc dd", "ee"]);
    const pages = highlightPages(lines, 20 + 36 * 3, 36, 1); // 3 lines per page
    expect(pages.map((p) => p.lines.length)).toEqual([3, 2]);
  });
});

describe("timing", () => {
  it("shortens the last chunk by how full it is", () => {
    expect(evenChunkDelays(1000, 3, 1, 2)).toEqual({ even: 400, last: 200 });
  });

  it("gives a 200 WPM single-word slide 300 ms, doubled after punctuation", () => {
    const m = buildTextModel("one two three four.");
    const s = m.sections[0];
    const chunks = serialChunks(buildLines(s.words, mono, 1000, 1), 1);
    const d = chunkDelays(s, chunks, { wpm: 200, numberOfLines: 1, speedVariability: false, punctuationPauses: true });
    expect(d).toEqual([300, 300, 300, 600]);
  });

  it("does not pause on an ASCII hyphen (Spreeder's shipped regex), but does on an en dash", () => {
    const m = buildTextModel("fast-food one two–three four");
    const s = m.sections[0];
    const chunks = serialChunks(buildLines(s.words, mono, 1000, 1), 1);
    const d = chunkDelays(s, chunks, { wpm: 200, numberOfLines: 1, speedVariability: false, punctuationPauses: true });
    expect(d).toEqual([300, 300, 600, 300]);
  });

  it("Speed Variability scales each chunk by its characters and keeps the section total", () => {
    const m = buildTextModel("a bbb cc dddd");
    const s = m.sections[0];
    const chunks = serialChunks(buildLines(s.words, mono, 1000, 1), 1);
    const d = chunkDelays(s, chunks, { wpm: 200, numberOfLines: 1, speedVariability: true, punctuationPauses: false });
    // Spreeder: round(T/n) * (chars + 1 unless last) / (sectionChars / n); T = 1200, n = 4, 13 chars.
    [600 / 3.25, 1200 / 3.25, 900 / 3.25, 1200 / 3.25].forEach((v, i) => expect(d[i]).toBeCloseTo(v, 6));
    expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(1200, 6);
  });

  it("formats remaining time like Spreeder", () => {
    expect(formatDuration(30_000)).toBe("Less than a minute");
    expect(formatDuration(3 * 60_000)).toBe("3 minutes");
    expect(formatDuration(61 * 60_000)).toBe("1 hour and 1 minute");
  });

  it("estimates the seed at about 3 minutes at 200 WPM", () => {
    const m = buildTextModel(SEED_PASSAGE.body);
    const ms = remainingMs(m, 0, { wpm: 200, groupSize: 1, numberOfLines: 1, punctuationPauses: false });
    expect(formatDuration(ms)).toBe("2 minutes");
    expect(sectionTime("a b", { wpm: 60, groupSize: 1, numberOfLines: 1, punctuationPauses: false })).toBe(2000);
  });

  it("reports progress by section", () => {
    const m = buildTextModel("A b. C d.");
    expect(progressPercent(m, 0)).toBe(0);
  });
});
