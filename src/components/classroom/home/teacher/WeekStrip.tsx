import * as React from "react";
import type { AgendaEvent } from "./teachingDeskModel";

const DAY_COUNT = 7;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export interface WeekDay {
  key: string;
  weekday: string;
  dayNumber: string;
  longLabel: string;
  isToday: boolean;
  events: AgendaEvent[];
}

/** YYYY-MM-DD for an instant in the calendar's own time zone. */
function dayKey(value: string, timeZone?: string): string | null {
  if (DATE_ONLY.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** All-day events lead; timed events follow in start order. */
function startsFirst(a: AgendaEvent, b: AgendaEvent) {
  const allDay = (e: AgendaEvent) => (DATE_ONLY.test(e.starts_at) ? 0 : 1);
  if (allDay(a) !== allDay(b)) return allDay(a) - allDay(b);
  return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime() || 0;
}

/** Seven consecutive days starting today, each with the events that begin on it. */
export function buildWeek(
  events: AgendaEvent[],
  now: Date,
  timeZone?: string,
): WeekDay[] {
  const todayKey = dayKey(now.toISOString(), timeZone)!;
  const [y, m, d] = todayKey.split("-").map(Number);
  const byDay = new Map<string, AgendaEvent[]>();
  for (const event of events) {
    const key = dayKey(event.starts_at, timeZone);
    if (!key) continue;
    byDay.set(key, [...(byDay.get(key) ?? []), event]);
  }
  return Array.from({ length: DAY_COUNT }, (_, i) => {
    // Noon UTC keeps the calendar date stable across DST changes.
    const day = new Date(Date.UTC(y, m - 1, d + i, 12));
    const key = day.toISOString().slice(0, 10);
    const fmt = (opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(day);
    return {
      key,
      weekday: fmt({ weekday: "short" }),
      dayNumber: fmt({ day: "numeric" }),
      longLabel: fmt({ weekday: "long", month: "short", day: "numeric" }),
      isToday: i === 0,
      events: [...(byDay.get(key) ?? [])].sort(startsFirst),
    };
  });
}

/** "6:30 PM" becomes "6:30p", "6:00 PM" becomes "6p"; all-day stays "All". */
function shortTime(value: string, timeZone?: string): string {
  if (DATE_ONLY.test(value)) return "All";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  })
    .format(date)
    .replace(":00", "")
    .replace(/\s?([AP])M/i, (_, m: string) => m.toLowerCase());
}

/** Student sessions fill the marker; anything not yet labelled stays an outline. */
const isSession = (event: AgendaEvent) => !!event.student_id;

export function WeekStrip({
  days,
  selected,
  onSelect,
  timeZone,
}: {
  days: WeekDay[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  timeZone?: string;
}) {
  return (
    <div className="home-desk-week" role="group" aria-label="Next seven days">
      <ol className="home-desk-week-days">
        {days.map((day) => {
          const count = day.events.length;
          const label = `${day.longLabel}, ${
            count === 0
              ? "nothing scheduled"
              : `${count} ${count === 1 ? "event" : "events"} at ${day.events
                  .map((event) => shortTime(event.starts_at, timeZone))
                  .join(", ")}`
          }${day.isToday ? ", today" : ""}`;
          return (
            <li key={day.key}>
              <button
                type="button"
                className="home-desk-week-day"
                data-today={day.isToday || undefined}
                data-busy={count > 0 || undefined}
                aria-pressed={selected === day.key}
                aria-label={label}
                onClick={() => onSelect(selected === day.key ? null : day.key)}
              >
                <span className="home-desk-week-weekday" aria-hidden="true">
                  {day.weekday}
                </span>
                <span className="home-desk-week-date" aria-hidden="true">
                  {day.dayNumber}
                </span>
                <span className="home-desk-week-marks" aria-hidden="true">
                  {day.events.slice(0, 2).map((event) => (
                    <i key={event.id} data-session={isSession(event) || undefined}>
                      {shortTime(event.starts_at, timeZone)}
                    </i>
                  ))}
                  {count > 2 ? <b>+{count - 2}</b> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="home-desk-week-legend" aria-hidden="true">
        <span>
          <i data-session /> Student session
        </span>
        <span>
          <i /> Other event
        </span>
      </p>
    </div>
  );
}
