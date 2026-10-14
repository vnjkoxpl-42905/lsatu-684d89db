import { describe, expect, it } from "vitest";
import { slotDays } from "./bookingCalendar";

describe("slotDays", () => {
  it("uses the six actual offered days instead of consuming columns on calendar gaps", () => {
    const days = slotDays([
      { start_at: "2026-08-17T18:00:00Z", end_at: "2026-08-17T19:10:00Z" },
      { start_at: "2026-08-18T17:00:00Z", end_at: "2026-08-18T18:10:00Z" },
      { start_at: "2026-08-20T17:00:00Z", end_at: "2026-08-20T18:10:00Z" },
      { start_at: "2026-08-21T17:00:00Z", end_at: "2026-08-21T18:10:00Z" },
      { start_at: "2026-08-22T18:00:00Z", end_at: "2026-08-22T19:10:00Z" },
      { start_at: "2026-08-24T18:00:00Z", end_at: "2026-08-24T19:10:00Z" },
    ], 6);

    expect(days.map((day) => day.getDate())).toEqual([17, 18, 20, 21, 22, 24]);
  });
});
