import { describe, expect, it } from "vitest";
import type { AgendaEvent } from "./teachingDeskModel";
import {
  buildWeek,
  countdown,
  dayWindow,
  elapsedShare,
  layoutDay,
  nextEvent,
  nowOffset,
  timeRange,
} from "./weekCalendar";

const TZ = "America/Toronto";
const event = (
  id: string,
  starts_at: string,
  ends_at = starts_at,
  student_id: string | null = "s1",
): AgendaEvent => ({
  id,
  title: id,
  starts_at,
  ends_at,
  status: "confirmed",
  calendar_url: "https://calendar.google.com/calendar/event?eid=x",
  student_id,
  student_name: student_id ? "Student" : null,
});

describe("buildWeek", () => {
  const NOW = new Date("2026-11-02T20:00:00Z");

  it("returns seven consecutive days starting today", () => {
    const week = buildWeek([], NOW, TZ);
    expect(week.map((d) => d.key)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
    expect(week[0]!.isToday).toBe(true);
    expect(week.slice(1).some((d) => d.isToday)).toBe(false);
    expect(week[0]!.month).toBe("Nov");
  });

  it("places an event on the day it starts in the calendar time zone", () => {
    // 01:30 UTC on Nov 3 is 8:30 pm on Nov 2 in Toronto.
    const week = buildWeek([event("late", "2026-11-03T01:30:00Z")], NOW, TZ);
    expect(week[0]!.events.map((e) => e.id)).toEqual(["late"]);
    expect(week[1]!.events).toEqual([]);
  });

  it("keeps date-only events on their own date and ignores events outside the window", () => {
    const week = buildWeek(
      [event("allday", "2026-11-05", "2026-11-06", null), event("far", "2026-11-20T15:00:00Z")],
      NOW,
      TZ,
    );
    expect(week[3]!.events.map((e) => e.id)).toEqual(["allday"]);
    expect(week.flatMap((d) => d.events).map((e) => e.id)).not.toContain("far");
  });

  it("stays on consecutive dates across the November DST change", () => {
    const week = buildWeek([], new Date("2026-11-01T12:00:00Z"), TZ);
    expect(week.map((d) => d.dayNumber)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
  });
});

describe("dayWindow", () => {
  const NOW = new Date("2026-11-02T14:00:00Z");

  it("spans 9 AM to 9 PM on an empty week", () => {
    expect(dayWindow(buildWeek([], NOW, TZ), TZ)).toEqual({ start: 540, end: 1260 });
  });

  it("rounds out to the hours the week uses", () => {
    // 10:30 AM start; the last event runs 8:15 to 9:15 PM Toronto.
    const week = buildWeek(
      [
        event("a", "2026-11-03T15:30:00Z", "2026-11-03T16:30:00Z"),
        event("b", "2026-11-04T01:15:00Z", "2026-11-04T02:15:00Z"),
      ],
      NOW,
      TZ,
    );
    expect(dayWindow(week, TZ)).toEqual({ start: 600, end: 1320 });
  });

  it("is never narrower than eight hours and stays inside the day", () => {
    const late = buildWeek(
      [event("late", "2026-11-03T04:00:00Z", "2026-11-03T04:59:00Z")], // 11 PM Toronto
      NOW,
      TZ,
    );
    const window = dayWindow(late, TZ);
    expect(window.end - window.start).toBe(480);
    expect(window.end).toBe(1440);
  });

  it("ignores all-day events", () => {
    const week = buildWeek([event("all", "2026-11-03", "2026-11-04", null)], NOW, TZ);
    expect(dayWindow(week, TZ)).toEqual({ start: 540, end: 1260 });
  });
});

describe("layoutDay", () => {
  const window = { start: 600, end: 1320 }; // 10 AM to 10 PM

  it("places an event by time and length", () => {
    const [placed] = layoutDay(
      [event("a", "2026-11-03T17:00:00Z", "2026-11-03T18:00:00Z")], // noon to 1 PM
      window,
      TZ,
    );
    expect(placed!.top).toBeCloseTo((120 / 720) * 100);
    expect(placed!.height).toBeCloseTo((60 / 720) * 100);
    expect(placed!.lanes).toBe(1);
  });

  it("puts overlapping events side by side and leaves later ones full width", () => {
    const placed = layoutDay(
      [
        event("a", "2026-11-03T17:00:00Z", "2026-11-03T18:00:00Z"),
        event("b", "2026-11-03T17:30:00Z", "2026-11-03T18:30:00Z"),
        event("c", "2026-11-03T21:00:00Z", "2026-11-03T22:00:00Z"),
      ],
      window,
      TZ,
    );
    const by = Object.fromEntries(placed.map((p) => [p.event.id, p]));
    expect([by.a!.lane, by.b!.lane]).toEqual([0, 1]);
    expect([by.a!.lanes, by.b!.lanes]).toEqual([2, 2]);
    expect([by.c!.lane, by.c!.lanes]).toEqual([0, 1]);
  });

  it("reuses a lane once it frees up inside a cluster", () => {
    const placed = layoutDay(
      [
        event("long", "2026-11-03T17:00:00Z", "2026-11-03T20:00:00Z"),
        event("x", "2026-11-03T17:00:00Z", "2026-11-03T18:00:00Z"),
        event("y", "2026-11-03T18:00:00Z", "2026-11-03T19:00:00Z"),
      ],
      window,
      TZ,
    );
    const by = Object.fromEntries(placed.map((p) => [p.event.id, p]));
    expect(by.x!.lane).toBe(by.y!.lane);
    expect(placed.every((p) => p.lanes === 2)).toBe(true);
  });

  it("skips all-day events and clamps to the track", () => {
    const placed = layoutDay(
      [
        event("all", "2026-11-03", "2026-11-04", null),
        event("early", "2026-11-03T12:00:00Z", "2026-11-03T13:00:00Z"), // 7 AM
      ],
      window,
      TZ,
    );
    expect(placed.map((p) => p.event.id)).toEqual(["early"]);
    expect(placed[0]!.top).toBe(0);
  });
});

describe("spotlight helpers", () => {
  const NOW = new Date("2026-11-02T20:00:00Z"); // 3 PM Toronto

  it("counts down in plain words", () => {
    expect(countdown(event("a", "2026-11-02T20:25:00Z"), NOW, TZ)).toBe("In 25 min");
    expect(countdown(event("a", "2026-11-02T23:20:00Z"), NOW, TZ)).toBe("Today, in 3h 20m");
    expect(countdown(event("a", "2026-11-02T22:00:00Z"), NOW, TZ)).toBe("Today, in 2h");
    expect(countdown(event("a", "2026-11-03T23:00:00Z"), NOW, TZ)).toBe("Tomorrow");
    expect(countdown(event("a", "2026-11-05T23:00:00Z"), NOW, TZ)).toBe("Thursday");
    expect(countdown(event("a", "2026-11-02T19:30:00Z"), NOW, TZ)).toBe("Happening now");
  });

  it("calls a 1 AM UTC event on the calendar's evening today", () => {
    expect(countdown(event("a", "2026-11-03T01:00:00Z"), NOW, TZ)).toBe("Today, in 5h");
  });

  it("writes time ranges compactly", () => {
    expect(timeRange(event("a", "2026-11-02T23:30:00Z", "2026-11-03T00:30:00Z"), TZ)).toBe(
      "6:30 to 7:30 pm",
    );
    expect(timeRange(event("a", "2026-11-02T16:30:00Z", "2026-11-02T17:30:00Z"), TZ)).toBe(
      "11:30 am to 12:30 pm",
    );
    expect(timeRange(event("a", "2026-11-03", "2026-11-04", null), TZ)).toBe("All day");
  });

  it("picks the first timed event that has not ended, including one in progress", () => {
    const running = event("run", "2026-11-02T19:30:00Z", "2026-11-02T20:30:00Z");
    const later = event("later", "2026-11-02T22:00:00Z", "2026-11-02T23:00:00Z");
    const done = event("done", "2026-11-02T17:00:00Z", "2026-11-02T18:00:00Z");
    const allDay = event("all", "2026-11-02", "2026-11-03", null);
    expect(nextEvent([later, done, allDay, running], NOW)?.id).toBe("run");
    expect(elapsedShare(running, NOW)).toBeCloseTo(0.5);
    expect(elapsedShare(later, NOW)).toBeNull();
    expect(nextEvent([done], NOW)).toBeNull();
  });

  it("marks now on the track only inside the window", () => {
    expect(nowOffset(NOW, { start: 600, end: 1320 }, TZ)).toBeCloseTo((300 / 720) * 100);
    expect(nowOffset(NOW, { start: 960, end: 1320 }, TZ)).toBeNull();
  });
});

describe("events that span days", () => {
  const NOW = new Date("2026-11-03T19:00:00Z"); // Tue 2 PM Toronto

  it("shows a multi-day all-day block on every day it covers, end exclusive", () => {
    const week = buildWeek([event("ooo", "2026-11-02", "2026-11-06", null)], NOW, TZ);
    expect(week.map((d) => d.events.length)).toEqual([1, 1, 1, 0, 0, 0, 0]);
  });

  it("keeps a session still running from yesterday on today", () => {
    // 11 PM Mon to 1 AM Tue Toronto.
    const late = event("late", "2026-11-03T04:00:00Z", "2026-11-03T06:00:00Z");
    const week = buildWeek([late], new Date("2026-11-03T05:00:00Z"), TZ);
    expect(week[0]!.events.map((e) => e.id)).toEqual(["late"]);
    const [placed] = layoutDay(week[0]!.events, { start: 0, end: 480 }, TZ, week[0]!.key);
    expect(placed!.startMinute).toBe(0);
    expect(placed!.endMinute).toBe(60);
  });

  it("cuts a late session at midnight on its first day", () => {
    const late = event("late", "2026-11-04T04:00:00Z", "2026-11-04T06:00:00Z"); // Tue 11 PM
    const week = buildWeek([late], NOW, TZ);
    expect(week[0]!.events.map((e) => e.id)).toEqual(["late"]);
    expect(week[1]!.events.map((e) => e.id)).toEqual(["late"]);
    const [first] = layoutDay(week[0]!.events, { start: 960, end: 1440 }, TZ, week[0]!.key);
    expect([first!.startMinute, first!.endMinute]).toEqual([1380, 1440]);
  });

  it("does not move a session that ends exactly at midnight onto the next day", () => {
    const week = buildWeek(
      [event("mid", "2026-11-04T04:00:00Z", "2026-11-04T05:00:00Z")], // 11 PM to midnight
      NOW,
      TZ,
    );
    expect(week[1]!.events).toEqual([]);
  });
});
