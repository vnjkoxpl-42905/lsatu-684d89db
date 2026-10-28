import { describe, expect, it } from "vitest";
import { exclusiveIsoToValidThroughDate, validThroughDateToExclusiveIso } from "./bookingExpiry";

describe("booking expiry inclusive local date", () => {
  it("round trips a Toronto winter date", () => {
    const iso = validThroughDateToExclusiveIso("2026-01-15");
    expect(iso).toBe("2026-01-16T05:00:00.000Z");
    expect(exclusiveIsoToValidThroughDate(iso)).toBe("2026-01-15");
  });

  it("round trips across Toronto spring and fall DST", () => {
    for (const date of ["2026-03-08", "2026-11-01"]) {
      expect(exclusiveIsoToValidThroughDate(validThroughDateToExclusiveIso(date))).toBe(date);
    }
  });
});
