import { describe, expect, it } from "vitest";
import type { AgendaEvent } from "./teachingDeskModel";
import {
  dayState,
  followUps,
  orbitAngle,
  stripDays,
  timedEvents,
  todayPlanets,
  weekLoad,
} from "./observatoryModel";

const ev = (id: string, start: string, end: string, student?: string): AgendaEvent => ({
  id,
  title: student ? `Session: ${student}` : "Consultation",
  starts_at: start,
  ends_at: end,
  status: "confirmed",
  calendar_url: "",
  student_id: student ? `id-${student}` : null,
  student_name: student ?? null,
  kind: student ? "session" : "consultation",
});

const EVENTS = timedEvents([
  ev("c", "2026-11-18T19:00:00", "2026-11-18T19:45:00"),
  ev("l", "2026-11-18T15:00:00", "2026-11-18T16:00:00", "Lydia Park"),
  ev("c2", "2026-11-19T13:00:00", "2026-11-19T14:00:00", "Celia Moreno"),
  ev("c3", "2026-11-20T13:00:00", "2026-11-20T14:00:00", "Celia Moreno"),
  { ...ev("allday", "2026-11-19", "2026-11-20"), starts_at: "2026-11-19" },
]);
const at = (hm: string) => new Date(`2026-11-18T${hm}:00`);

describe("observatory model", () => {
  it("drops all-day rows and sorts by start", () => {
    expect(EVENTS.map((e) => e.event.id)).toEqual(["l", "c", "c2", "c3"]);
  });

  it("treats events as [start, end)", () => {
    expect(dayState(EVENTS, at("10:00")).next?.event.id).toBe("l");
    expect(dayState(EVENTS, at("15:30")).current?.event.id).toBe("l");
    expect(dayState(EVENTS, at("16:00")).current).toBeNull();
    expect(dayState(EVENTS, at("16:00")).next?.event.id).toBe("c");
    expect(dayState(EVENTS, at("20:30")).next?.event.id).toBe("c2");
  });

  it("marks today's planets past, current, next and later", () => {
    expect(todayPlanets(EVENTS, at("10:00")).map((p) => p.state)).toEqual(["next", "later"]);
    expect(todayPlanets(EVENTS, at("15:30")).map((p) => p.state)).toEqual(["current", "later"]);
    expect(todayPlanets(EVENTS, at("17:00")).map((p) => p.state)).toEqual(["past", "next"]);
  });

  it("sweeps 9 am to 9 pm over the top and clamps outside it", () => {
    expect(orbitAngle(at("09:00"))).toBeCloseTo((210 * Math.PI) / 180);
    expect(orbitAngle(at("15:00"))).toBeCloseTo(Math.PI / 2);
    expect(orbitAngle(at("23:00"))).toBeCloseTo((-30 * Math.PI) / 180);
  });

  it("counts seven days from today", () => {
    expect(weekLoad(EVENTS, at("10:00")).map((d) => d.count)).toEqual([2, 1, 1, 0, 0, 0, 0]);
  });

  it("strip shows each student's next session only, keeping one in progress", () => {
    const days = stripDays(EVENTS, at("15:30"));
    expect(days[0].sessions.map((s) => s.event.id)).toEqual(["l"]);
    expect(days[1].sessions.map((s) => s.event.id)).toEqual(["c2"]);
    expect(days[2].sessions).toEqual([]);
  });

  it("follow-ups never invent a count", () => {
    expect(followUps(undefined)).toBeNull();
    expect(
      followUps({ settings: null, tasks: [], handled: [], total: 3, handled_total: 3 }),
    ).toEqual({ waiting: 3, handled: 3, total: 6 });
  });
});
