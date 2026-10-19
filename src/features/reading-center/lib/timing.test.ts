import { describe, expect, it } from "vitest";
import { tokenize, chunkTokens } from "./tokenize";
import { chunkDurations, effectiveWpm, formatRemaining, percentRead, remainingMs } from "./timing";

const words300 = Array.from({ length: 300 }, (_, i) => `word${i}`).join(" ");

describe("chunkDurations", () => {
  it("300 words at 300 WPM, no pauses, takes 60 seconds", () => {
    const c = chunkTokens(tokenize(words300), 1, 1);
    const d = chunkDurations(c, { wpm: 300, punctuation_pauses: false, speed_variability: false });
    expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(60000, 0);
  });
  it("adds pauses only for one-word chunks", () => {
    const body = "Stop. Go now";
    const one = chunkDurations(chunkTokens(tokenize(body), 1, 1), { wpm: 60, punctuation_pauses: true, speed_variability: false });
    expect(one[0]).toBe(2000); // sentence end x2 at 1000 ms/word
    const two = chunkDurations(chunkTokens(tokenize(body), 2, 1), { wpm: 60, punctuation_pauses: true, speed_variability: false });
    expect(two[0]).toBe(2000); // two words, no pause multiplier
  });
  it("variability keeps the same total within 1%", () => {
    const body = "a extraordinarily b incomprehensibility c d e f";
    const c = chunkTokens(tokenize(body), 1, 1);
    const off = chunkDurations(c, { wpm: 200, punctuation_pauses: false, speed_variability: false });
    const on = chunkDurations(c, { wpm: 200, punctuation_pauses: false, speed_variability: true });
    const sum = (x: number[]) => x.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum(on) - sum(off)) / sum(off)).toBeLessThan(0.01);
    expect(on[1]).toBeGreaterThan(on[0]); // long word gets more time
  });
});

describe("helpers", () => {
  it("formats remaining time", () => {
    expect(formatRemaining(30000)).toBe("Less than a minute remaining");
    expect(formatRemaining(60000)).toBe("1 minute remaining");
    expect(formatRemaining(150000)).toBe("3 minutes remaining");
  });
  it("percent and remaining", () => {
    expect(percentRead(55, 550)).toBe(10);
    expect(remainingMs([100, 200, 300], 1)).toBe(500);
  });
  it("effective wpm", () => {
    expect(effectiveWpm(300, 60000)).toBe(300);
    expect(effectiveWpm(10, 0)).toBe(0);
  });
});
