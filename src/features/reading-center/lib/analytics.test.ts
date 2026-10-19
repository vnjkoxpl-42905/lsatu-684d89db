import { describe, expect, it } from "vitest";
import { readingSeries, summarizeReading } from "./analytics";
import type { ReadingSession } from "./types";

const session = (overrides: Partial<ReadingSession> = {}): ReadingSession => ({ id: "visit", passage_id: "text", reading_mode: "serial", wpm: 200, words_read: 100, active_ms: 30_000, paused_ms: 0, started_at: "2026-10-14T12:00:00Z", ended_at: "2026-10-14T12:00:30Z", ...overrides });

describe("recorded reading analytics", () => {
  it("shows missing activity as unknown rather than a fabricated zero pace or attention score", () => {
    expect(summarizeReading([])).toMatchObject({ visits: 0, paceWpm: null, activeShare: null });
    expect(readingSeries([], "speed")).toEqual([]);
  });
  it("keeps short active reading time visible as fractional minutes", () => {
    expect(readingSeries([session({ active_ms: 12_000 })], "time")[0].y).toBe(0.2);
  });
  it("weights pace and active share by actual recorded time rather than averaging unequal visits", () => {
    const visits = [session({ words_read: 10, active_ms: 6_000, paused_ms: 54_000 }), session({ words_read: 600, active_ms: 60_000, paused_ms: 0 })];
    expect(summarizeReading(visits)).toMatchObject({ paceWpm: 555, activeShare: 55, activeMs: 66_000 });
    expect(readingSeries(visits, "focus")[0].y).toBe(55);
  });
  it("ignores invalid durations and sorts dated activity chronologically", () => {
    const visits = [session({ ended_at: "2026-10-14T12:00:00Z" }), session({ ended_at: "2026-10-13T12:00:00Z", words_read: 50 }), session({ ended_at: "invalid", active_ms: 20_000 }), session({ active_ms: 0 })];
    expect(readingSeries(visits, "speed").map((point) => point.y)).toEqual([100, 200]);
  });
});
