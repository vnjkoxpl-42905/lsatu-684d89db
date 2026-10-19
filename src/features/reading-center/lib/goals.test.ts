import { describe, expect, it } from "vitest";
import { readingTestWpm, recommendedGoal } from "./goals";

describe("Spreeder goals", () => {
  it("measures a reading test", () => {
    expect(readingTestWpm(550, 165)).toBe(200);
  });

  it("recommends goals along Spreeder's curve", () => {
    expect(recommendedGoal(10)).toBe(100); // <= 1% of 2000 -> 5%
    expect(recommendedGoal(200)).toBe(600); // 10% -> 30%
    expect(recommendedGoal(300)).toBe(730);
    expect(recommendedGoal(2000)).toBe(2000);
  });
});
