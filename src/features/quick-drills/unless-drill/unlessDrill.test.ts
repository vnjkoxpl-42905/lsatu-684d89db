import { describe, expect, it } from "vitest";
import { contrapositiveOf, gradeUnless, unlessAnswer, unlessStatement, type UnlessRound } from "@/features/conditional-refresher/content";

const round = (pattern: 1 | 2 | 3 | 4): UnlessRound => ({ pattern, x: "A", y: "B" });

describe("Unless drill answers follow the Group 3 move", () => {
  // Joshua's answer key, letter for letter.
  it.each([
    [1, "/A, unless B.", "A", "B"],
    [2, "Unless B, A.", "/A", "B"],
    [3, "Unless /B, /A.", "A", "/B"],
    [4, "A, unless /B.", "/A", "/B"],
  ] as const)("pattern %i (%s) is %s -> %s", (pattern, statement, left, right) => {
    expect(unlessStatement(round(pattern))).toBe(statement);
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
    const r = round(2); // Unless B, A.  ->  /A -> B
    expect(gradeUnless(r, null, "A")).toBe("no-answer");
    expect(gradeUnless(r, "A", "B")).toBe("kept-both");
    expect(gradeUnless(r, "B", "/A")).toBe("reversed");
    expect(gradeUnless(r, "/A", "/B")).toBe("changed-unless");
    expect(gradeUnless(r, "A", "/A")).toBe("other");
  });
});
