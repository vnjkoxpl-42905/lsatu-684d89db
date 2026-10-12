import { describe, expect, it } from "vitest";
import { contrapositiveOf, gradeUnless, unlessAnswer, type UnlessRound } from "./content";

const round = (pattern: 1 | 2 | 3 | 4): UnlessRound => ({ pattern, x: "A", y: "B" });

describe("Unless drill answers follow the Group 3 move", () => {
  // Negate the idea after "unless", put it left, keep the other idea as written.
  it.each([
    [1, "/A unless B", "/B", "/A"],
    [2, "Unless B, A", "/B", "A"],
    [3, "Unless /B, /A", "B", "/A"],
    [4, "A unless /B", "B", "A"],
  ] as const)("pattern %i (%s) is %s -> %s", (pattern, _statement, left, right) => {
    expect(unlessAnswer(round(pattern))).toEqual({ left, right });
  });

  it.each([1, 2, 3, 4] as const)("pattern %i accepts the diagram and its contrapositive", pattern => {
    const r = round(pattern);
    const a = unlessAnswer(r);
    const c = contrapositiveOf(a.left, a.right);
    expect(gradeUnless(r, a.left, a.right)).toBe("correct");
    expect(gradeUnless(r, c.left, c.right)).toBe("correct");
  });

  it("names the common mistakes", () => {
    const r = round(2); // Unless B, A  ->  /B -> A
    expect(gradeUnless(r, null, "A")).toBe("no-answer");
    expect(gradeUnless(r, "B", "A")).toBe("not-negated");
    expect(gradeUnless(r, "A", "/B")).toBe("reversed");
    expect(gradeUnless(r, "/B", "/A")).toBe("both-negated");
    expect(gradeUnless(r, "A", "/A")).toBe("other");
  });
});
