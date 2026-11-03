import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WeekStrip, buildWeek } from "./WeekStrip";
import type { AgendaEvent } from "./teachingDeskModel";

const event = (id: string, starts_at: string, student_id: string | null = "s1"): AgendaEvent => ({
  id,
  title: id,
  starts_at,
  ends_at: starts_at,
  status: "confirmed",
  calendar_url: "https://calendar.google.com/calendar/event?eid=x",
  student_id,
  student_name: student_id ? "Student" : null,
});

describe("buildWeek", () => {
  const NOW = new Date("2026-11-02T20:00:00Z");

  it("returns seven consecutive days starting today", () => {
    const week = buildWeek([], NOW, "America/Toronto");
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
  });

  it("places an event on the day it starts in the calendar time zone", () => {
    // 01:30 UTC on Nov 3 is 8:30 pm on Nov 2 in Toronto.
    const week = buildWeek([event("late", "2026-11-03T01:30:00Z")], NOW, "America/Toronto");
    expect(week[0]!.events.map((e) => e.id)).toEqual(["late"]);
    expect(week[1]!.events).toEqual([]);
  });

  it("keeps date-only events on their own date and ignores events outside the window", () => {
    const week = buildWeek(
      [event("allday", "2026-11-05", null), event("far", "2026-11-20T15:00:00Z")],
      NOW,
      "America/Toronto",
    );
    expect(week[3]!.events.map((e) => e.id)).toEqual(["allday"]);
    expect(week.flatMap((d) => d.events).map((e) => e.id)).not.toContain("far");
  });

  it("stays on consecutive dates across the November DST change", () => {
    const week = buildWeek([], new Date("2026-11-01T12:00:00Z"), "America/Toronto");
    expect(week.map((d) => d.dayNumber)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
  });
});

describe("WeekStrip", () => {
  const NOW = new Date("2026-11-02T20:00:00Z");
  const events = [
    event("a", "2026-11-03T23:00:00Z"),
    event("b", "2026-11-03T15:30:00Z", null),
  ];
  const days = buildWeek(events, NOW, "America/Toronto");

  it("describes each day to assistive tech with its event times", () => {
    render(<WeekStrip days={days} selected={null} onSelect={() => {}} timeZone="America/Toronto" />);
    expect(
      screen.getByRole("button", { name: "Tuesday, Nov 3, 2 events at 10:30a, 6p" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Monday, Nov 2, nothing scheduled, today" })).toBeTruthy();
  });

  it("selects a day on click and clears it when clicked again", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <WeekStrip days={days} selected={null} onSelect={onSelect} timeZone="America/Toronto" />,
    );
    const tuesday = screen.getByRole("button", { name: /^Tuesday, Nov 3/ });
    expect(tuesday.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(tuesday);
    expect(onSelect).toHaveBeenLastCalledWith("2026-11-03");
    rerender(
      <WeekStrip days={days} selected="2026-11-03" onSelect={onSelect} timeZone="America/Toronto" />,
    );
    expect(screen.getByRole("button", { name: /^Tuesday, Nov 3/ }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /^Tuesday, Nov 3/ }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });
});
