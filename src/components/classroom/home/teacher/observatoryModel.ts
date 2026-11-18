/**
 * Teacher Home v2 ("observatory"): the pure arithmetic behind the eclipse
 * orrery, the week-load meter, the follow-up gauge and the seven-day strip.
 *
 * Everything is derived from real rows (calendar agenda events and the
 * post-session snapshot). Nothing here invents a session: an empty input
 * produces an empty output, and the view says so.
 */

import type { AgendaEvent } from "./teachingDeskModel";
import type { PostSessionSnapshot } from "./postSessionModel";

export interface TimedEvent {
  event: AgendaEvent;
  start: Date;
  end: Date;
}

const DAY_START_HOUR = 9;
const DAY_END_HOUR = 21;

function valid(d: Date) {
  return !Number.isNaN(d.getTime());
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Timed events only (all-day rows have no time to place), sorted by start. */
export function timedEvents(events: AgendaEvent[] | undefined): TimedEvent[] {
  return (events ?? [])
    .filter((e) => /T/.test(e.starts_at))
    .map((event) => {
      const start = new Date(event.starts_at);
      const parsedEnd = new Date(event.ends_at);
      const end =
        valid(parsedEnd) && parsedEnd.getTime() > start.getTime()
          ? parsedEnd
          : new Date(start.getTime() + 60 * 60_000);
      return { event, start, end };
    })
    .filter((t) => valid(t.start))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Events are [start, end): one is current while it runs, the next has not started. */
export function dayState(events: TimedEvent[], now: Date) {
  const t = now.getTime();
  const current =
    events.find((e) => e.start.getTime() <= t && t < e.end.getTime()) ?? null;
  const next = events.find((e) => e.start.getTime() > t) ?? null;
  return { current, next };
}

/**
 * Angle in radians for a time of day on the orrery: 9 am sits lower left,
 * the arc sweeps over the top, 9 pm sits lower right. Times outside the
 * window clamp to its ends.
 */
export function orbitAngle(date: Date) {
  const h = date.getHours() + date.getMinutes() / 60;
  const f = Math.min(
    1,
    Math.max(0, (h - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)),
  );
  return ((210 - f * 240) * Math.PI) / 180;
}

export type PlanetState = "past" | "current" | "next" | "later";

export function todayPlanets(events: TimedEvent[], now: Date) {
  const { current, next } = dayState(events, now);
  return events
    .filter((e) => sameDay(e.start, now))
    .map((e) => {
      const state: PlanetState =
        current?.event.id === e.event.id
          ? "current"
          : e.end.getTime() <= now.getTime()
            ? "past"
            : !current && next?.event.id === e.event.id
              ? "next"
              : "later";
      return { ...e, state, angle: orbitAngle(e.start) };
    });
}

/** Sessions per day for the seven days starting today. */
export function weekLoad(events: TimedEvent[], now: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    return {
      day,
      isToday: i === 0,
      count: events.filter((e) => sameDay(e.start, day)).length,
    };
  });
}

/**
 * The follow-up gauge: post-session work handled out of all work raised.
 * Returns null when the snapshot has not loaded, so the gauge never shows
 * an invented "0 of 0".
 */
export function followUps(snapshot: PostSessionSnapshot | undefined) {
  if (!snapshot) return null;
  const waiting = snapshot.total ?? snapshot.tasks.length;
  const handled = snapshot.handled_total ?? snapshot.handled.length;
  return { waiting, handled, total: waiting + handled };
}

/**
 * Strip A: for each student, their earliest student session that has not
 * ended within the next seven days, grouped by day. Consultations and
 * unlabelled events are left out; the strip is about students.
 */
export function stripDays(events: TimedEvent[], now: Date) {
  const seen = new Set<string>();
  const picks: TimedEvent[] = [];
  const horizon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  for (const e of events) {
    const sid = e.event.student_id;
    if (!sid || seen.has(sid)) continue;
    if (e.end.getTime() <= now.getTime() || e.start >= horizon) continue;
    seen.add(sid);
    picks.push(e);
  }
  return weekLoad([], now).map(({ day, isToday }) => ({
    day,
    isToday,
    sessions: picks.filter((p) => sameDay(p.start, day)),
  }));
}

/** 0..1 position of a time within the 9 am to 9 pm working day. */
export function dayFraction(date: Date) {
  const h = date.getHours() + date.getMinutes() / 60;
  return Math.min(
    1,
    Math.max(0, (h - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)),
  );
}

export function clockLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })
    .format(date)
    .replace(/\s?AM$/, " am")
    .replace(/\s?PM$/, " pm");
}

export function shortHour(date: Date) {
  return clockLabel(date).replace(":00", "");
}

export function eventName(event: AgendaEvent) {
  if (event.student_name) return event.student_name;
  if (event.kind === "consultation") return "Consultation";
  return event.title;
}
