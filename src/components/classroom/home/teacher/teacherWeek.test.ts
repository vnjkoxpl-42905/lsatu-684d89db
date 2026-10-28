import { describe, expect, it } from "vitest";
import { calendarDayKey, calendarWeek, calendarTimeZone, calendarStartLabel } from "./teacherWeek";
describe("teacher calendar dates", () => {
  it("uses the calendar zone instead of the browser day", () => {
    expect(calendarDayKey("2026-10-29T01:00:00Z", "America/Toronto")).toBe("2026-10-28");
    expect(calendarDayKey("2026-10-29T01:00:00Z", "Asia/Tokyo")).toBe("2026-10-29");
  });
  it("keeps date-only all-day events on their authored calendar date", () => {
    expect(calendarDayKey("2026-10-29", "America/Los_Angeles")).toBe("2026-10-29");
    expect(calendarStartLabel("2026-10-29", "Asia/Tokyo")).toBe("All day");
  });
  it.each(["2026-03-07T18:00:00Z", "2026-10-31T18:00:00Z"])("keeps seven consecutive calendar dates across DST at %s", now => {
    const days = calendarWeek(new Date(now), "America/Toronto");
    expect(days).toHaveLength(7);
    expect(new Set(days.map(day => day.key)).size).toBe(7);
    days.slice(1).forEach((day, index) => expect(day.date.getTime() - days[index].date.getTime()).toBe(86400000));
  });
  it("handles both repeated fall-back hours and spring-forward starts", () => {
    expect(calendarDayKey("2026-11-01T05:30:00Z", "America/Toronto")).toBe("2026-11-01");
    expect(calendarDayKey("2026-11-01T06:30:00Z", "America/Toronto")).toBe("2026-11-01");
    expect(calendarDayKey("2026-03-08T07:30:00Z", "America/Toronto")).toBe("2026-03-08");
  });
  it("rejects invalid timestamp dates and invalid provider zones safely", () => {
    expect(calendarDayKey("not-a-date", "UTC")).toBeNull();
    expect(() => new Intl.DateTimeFormat("en-US", { timeZone: calendarTimeZone("not/a-zone") }).format()).not.toThrow();
  });
});

it.each([
  ["2026-03-08T04:59:00Z", "2026-03-07", "2026-03-08T05:01:00Z", "2026-03-08"],
  ["2026-11-01T03:59:00Z", "2026-10-31", "2026-11-01T04:01:00Z", "2026-11-01"],
])("anchors correctly around local midnight during DST-change weeks", (before, beforeKey, after, afterKey) => {
  expect(calendarWeek(new Date(before), "America/Toronto")[0].key).toBe(beforeKey);
  expect(calendarWeek(new Date(after), "America/Toronto")[0].key).toBe(afterKey);
});
