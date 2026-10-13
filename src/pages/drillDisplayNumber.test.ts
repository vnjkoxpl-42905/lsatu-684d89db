import { describe, expect, it } from "vitest";

import { getDrillDisplayNumber } from "./drillDisplayNumber";

describe("getDrillDisplayNumber", () => {
  it("uses queue-local numbering for intro to lr practice drills", () => {
    expect(
      getDrillDisplayNumber({
        isMcPractice: true,
        qnum: 13,
        currentIndex: 2,
      }),
    ).toBe(3);
  });

  it("preserves the original lsat question number for non-bootcamp drills", () => {
    expect(
      getDrillDisplayNumber({
        isMcPractice: false,
        qnum: 13,
        currentIndex: 2,
      }),
    ).toBe(13);
  });

  it("falls back to queue-local numbering when the source qnum is invalid", () => {
    expect(
      getDrillDisplayNumber({
        isMcPractice: false,
        qnum: undefined,
        currentIndex: 2,
      }),
    ).toBe(3);
  });
});
