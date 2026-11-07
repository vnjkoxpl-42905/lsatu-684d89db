import type { AgendaEvent } from "./teachingDeskModel";

/* Pure calendar arithmetic for the teacher Home week view. Every value is
   read in the calendar's own time zone, never the browser's. */

const DAY_COUNT = 7;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
export const MINUTE = 60_000;
const DAY_MINUTES = 24 * 60;

export interface WeekDay {
  key: string;
  weekday: string;
  dayNumber: string;
  month: string;
  longLabel: string;
  isToday: boolean;
  events: AgendaEvent[];
}

export const isAllDay = (event: AgendaEvent) => DATE_ONLY.test(event.starts_at);

/** Labelled student sessions; anything else is an "other" event until labelled. */
export const isSession = (event: AgendaEvent) => !!event.student_id;

const startOf = (event: AgendaEvent) => new Date(event.starts_at).getTime();

/** End of an event, falling back to one hour when the feed has no usable end. */
export function endOf(event: AgendaEvent): number {
  const start = startOf(event);
  const end = new Date(event.ends_at).getTime();
  return Number.isFinite(end) && end > start ? end : start + 60 * MINUTE;
}

/** YYYY-MM-DD for an instant in the calendar's own time zone. */
export function dayKey(value: string | number, timeZone?: string): string | null {
  if (typeof value === "string" && DATE_ONLY.test(value)) return value;
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
  const allDay = (e: AgendaEvent) => (isAllDay(e) ? 0 : 1);
  if (allDay(a) !== allDay(b)) return allDay(a) - allDay(b);
  return startOf(a) - startOf(b) || 0;
}

const shiftDate = (key: string, days: number) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10);
};

/**
 * First and last calendar dates an event covers. All-day ends are exclusive
 * in Google Calendar; a timed event ending exactly at midnight stays on the
 * day before.
 */
export function coveredDays(
  event: AgendaEvent,
  timeZone?: string,
): [string, string] | null {
  const first = dayKey(event.starts_at, timeZone);
  if (!first) return null;
  if (isAllDay(event)) {
    const end = DATE_ONLY.test(event.ends_at) ? shiftDate(event.ends_at, -1) : first;
    return [first, end > first ? end : first];
  }
  const last = dayKey(endOf(event) - 1, timeZone) ?? first;
  return [first, last > first ? last : first];
}

/**
 * Seven consecutive days starting today, each with the events that touch it,
 * so a multi-day block or a session still running from yesterday shows on
 * every day it covers.
 */
export function buildWeek(
  events: AgendaEvent[],
  now: Date,
  timeZone?: string,
): WeekDay[] {
  const todayKey = dayKey(now.getTime(), timeZone)!;
  const keys = Array.from({ length: DAY_COUNT }, (_, i) => shiftDate(todayKey, i));
  const byDay = new Map<string, AgendaEvent[]>(keys.map((key) => [key, []]));
  for (const event of events) {
    const covered = coveredDays(event, timeZone);
    if (!covered) continue;
    for (const key of keys)
      if (key >= covered[0] && key <= covered[1]) byDay.get(key)!.push(event);
  }
  return keys.map((key, i) => {
    const day = new Date(`${key}T12:00:00Z`);
    const fmt = (opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(day);
    return {
      key,
      weekday: fmt({ weekday: "short" }),
      dayNumber: fmt({ day: "numeric" }),
      month: fmt({ month: "short" }),
      longLabel: fmt({ weekday: "long", month: "short", day: "numeric" }),
      isToday: i === 0,
      events: byDay.get(key)!.sort(startsFirst),
    };
  });
}

/** Minutes after local midnight in the calendar's time zone. */
export function minuteOfDay(value: string | number | Date, timeZone?: string): number | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return part("hour") * 60 + part("minute");
}

/**
 * The part of a timed event that falls on one calendar day, in minutes after
 * that day's midnight. A session running past midnight is cut at 24:00 on its
 * first day and continues from 0:00 on the next.
 */
export function segmentOn(
  event: AgendaEvent,
  key: string,
  timeZone?: string,
): { start: number; end: number; carried: boolean } | null {
  const covered = coveredDays(event, timeZone);
  if (!covered || isAllDay(event) || key < covered[0] || key > covered[1]) return null;
  const carried = key > covered[0];
  const start = carried ? 0 : minuteOfDay(event.starts_at, timeZone);
  if (start === null) return null;
  const endMinute = minuteOfDay(endOf(event), timeZone) ?? DAY_MINUTES;
  const end = key < covered[1] || endMinute === 0 ? DAY_MINUTES : endMinute;
  return { start, end: Math.max(end, start + 1), carried };
}

export interface DayWindow {
  /** Minutes after midnight where the time axis starts and ends. */
  start: number;
  end: number;
}

/**
 * The hours the time axis spans: the week's earliest start to its latest end,
 * rounded out to whole hours, at least eight hours wide, and 9 AM to 9 PM when
 * the week has no timed events.
 */
export function dayWindow(days: WeekDay[], timeZone?: string): DayWindow {
  let start = Infinity;
  let end = -Infinity;
  for (const day of days) {
    for (const event of day.events) {
      const seg = segmentOn(event, day.key, timeZone);
      if (!seg) continue;
      // A carried-over tail starts at midnight by definition; only its end counts.
      if (!seg.carried) start = Math.min(start, seg.start);
      end = Math.max(end, seg.end);
    }
  }
  if (!Number.isFinite(end)) return { start: 9 * 60, end: 21 * 60 };
  if (!Number.isFinite(start)) start = Math.max(0, end - 8 * 60);
  start = Math.floor(start / 60) * 60;
  end = Math.ceil(end / 60) * 60;
  const MIN_SPAN = 8 * 60;
  if (end - start < MIN_SPAN) {
    // Widen around the events, then slide back inside the day if needed.
    start = Math.max(0, start - Math.floor((MIN_SPAN - (end - start)) / 120) * 60);
    end = Math.min(DAY_MINUTES, start + MIN_SPAN);
    start = Math.min(start, end - MIN_SPAN);
  }
  return { start, end };
}

export interface PlacedEvent {
  event: AgendaEvent;
  /** Percent from the top of the day track. */
  top: number;
  height: number;
  /** Side-by-side position when events overlap: lane index of lanes. */
  lane: number;
  lanes: number;
  startMinute: number;
  endMinute: number;
}

const pct = (minutes: number, window: DayWindow) =>
  Math.min(100, Math.max(0, ((minutes - window.start) / (window.end - window.start)) * 100));

/**
 * Places a day's timed events on the track. Overlapping events share the
 * width in lanes; each cluster of overlaps gets its own lane count.
 */
export function layoutDay(
  events: AgendaEvent[],
  window: DayWindow,
  timeZone?: string,
  key?: string,
  /** Minutes an event occupies on screen at minimum, for overlap lanes. */
  minVisual = 0,
): PlacedEvent[] {
  const timed = events
    .map((event) => {
      const day = key ?? coveredDays(event, timeZone)?.[0];
      const seg = day ? segmentOn(event, day, timeZone) : null;
      return seg ? { event, startMinute: seg.start, endMinute: seg.end } : null;
    })
    .filter((row): row is { event: AgendaEvent; startMinute: number; endMinute: number } => !!row)
    .sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);

  const placed: PlacedEvent[] = [];
  let cluster: PlacedEvent[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;
  const closeCluster = () => {
    for (const row of cluster) row.lanes = laneEnds.length;
    cluster = [];
    laneEnds = [];
  };
  for (const row of timed) {
    const visualEnd = Math.max(row.endMinute, row.startMinute + minVisual);
    if (row.startMinute >= clusterEnd) closeCluster();
    let lane = laneEnds.findIndex((end) => end <= row.startMinute);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(visualEnd);
    } else laneEnds[lane] = visualEnd;
    clusterEnd = cluster.length ? Math.max(clusterEnd, visualEnd) : visualEnd;
    const top = pct(row.startMinute, window);
    const item: PlacedEvent = {
      ...row,
      top,
      height: Math.max(0, pct(row.endMinute, window) - top),
      lane,
      lanes: 1,
    };
    cluster.push(item);
    placed.push(item);
  }
  closeCluster();
  return placed;
}

/** Percent down the track for an instant, or null when it falls outside it. */
export function nowOffset(now: Date, window: DayWindow, timeZone?: string): number | null {
  const minute = minuteOfDay(now, timeZone);
  if (minute === null || minute < window.start || minute > window.end) return null;
  return pct(minute, window);
}

/** "6:30 PM" becomes "6:30p", "6:00 PM" becomes "6p"; all-day reads "All day". */
export function shortTime(value: string | number, timeZone?: string): string {
  if (typeof value === "string" && DATE_ONLY.test(value)) return "All day";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" })
    .format(date)
    .replace(":00", "")
    .replace(/\s?([AP])M/i, (_, m: string) => m.toLowerCase());
}

/** "9a", "12p", "6p" for axis labels. */
export function hourLabel(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  return `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
}

/** "4:00 pm" in the calendar's zone. */
export const clockTime = (value: string | number, timeZone?: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" })
    .format(new Date(value))
    .replace(/\s?([AP])M$/i, (_, m: string) => ` ${m.toLowerCase()}m`);

/** "4:00 to 5:00 pm", or "11:30 am to 12:30 pm" when the meridiem changes. */
export function timeRange(event: AgendaEvent, timeZone?: string) {
  if (isAllDay(event)) return "All day";
  const start = clockTime(event.starts_at, timeZone);
  const end = clockTime(endOf(event), timeZone);
  return start.slice(-2) === end.slice(-2)
    ? `${start.slice(0, -3)} to ${end}`
    : `${start} to ${end}`;
}

/** "Happening now", "Starting now", "In 25 min", "Today, in 3h 20m", "Tomorrow", "Thursday". */
export function countdown(event: AgendaEvent, now: Date, timeZone?: string) {
  const start = startOf(event);
  const diff = start - now.getTime();
  if (diff <= 0) return "Happening now";
  if (diff < MINUTE) return "Starting now";
  const minutes = Math.ceil(diff / MINUTE);
  if (minutes < 60) return `In ${minutes} min`;
  const day = dayKey(start, timeZone);
  if (day === dayKey(now.getTime(), timeZone)) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `Today, in ${h}h${m ? ` ${m}m` : ""}`;
  }
  // Noon today plus a day lands on tomorrow's date even across DST.
  const todayKey = dayKey(now.getTime(), timeZone)!;
  const [y, mo, d] = todayKey.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(y, mo - 1, d + 1, 12)).toISOString().slice(0, 10);
  if (day === tomorrow) return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(new Date(start));
}

/** The first timed event that has not ended yet. */
export function nextEvent(events: AgendaEvent[], now: Date): AgendaEvent | null {
  return (
    events
      .filter((event) => !isAllDay(event) && endOf(event) > now.getTime())
      .sort((a, b) => startOf(a) - startOf(b))[0] ?? null
  );
}

/** Fraction of a running event already elapsed, or null before it starts. */
export function elapsedShare(event: AgendaEvent, now: Date): number | null {
  const start = startOf(event);
  if (start > now.getTime()) return null;
  return Math.min(1, (now.getTime() - start) / (endOf(event) - start));
}

/** Eight explicit grid tracks (axis plus seven days) so the accordion can animate. */
export function colsFor(selected: number) {
  return [
    "var(--cal-axis)",
    ...Array.from({ length: DAY_COUNT }, (_, i) =>
      selected < 0 ? "1fr" : i === selected ? "var(--cal-fr-open)" : "var(--cal-fr-shut)",
    ),
  ].join(" ");
}

export type DialMode = "armed" | "standby" | "later" | "live" | "none";
export interface DialState {
  mode: DialMode;
  /** Arc fill, 0 to 100. */
  pct: number;
  /** Under 15 minutes away, or running: the dial turns to the now accent. */
  soon: boolean;
  pre: string;
  big: string;
  post: string;
  /** The big slot holds a word rather than a number. */
  word: boolean;
}

const ARM_MINUTES = 120;

/** What the spotlight dial shows. pre + big + post reads as the countdown phrase. */
export function dialState(event: AgendaEvent | null, now: Date, timeZone?: string): DialState {
  if (!event)
    return { mode: "none", pct: 100, soon: false, pre: "", big: "Clear", post: "Nothing timed this week", word: true };
  const start = startOf(event);
  const end = endOf(event);
  const t = now.getTime();
  if (start <= t) {
    return {
      mode: "live",
      pct: Math.max(1.5, ((end - t) / (end - start)) * 100),
      soon: true,
      pre: "Happening now",
      big: String(Math.max(1, Math.ceil((end - t) / MINUTE))),
      post: "min left",
      word: false,
    };
  }
  const minutes = Math.ceil((start - t) / MINUTE);
  const armed = minutes <= ARM_MINUTES;
  const sameDay = dayKey(start, timeZone) === dayKey(t, timeZone);
  const base = {
    mode: (armed ? "armed" : sameDay ? "standby" : "later") as DialMode,
    pct: armed ? Math.max(1.5, (minutes / ARM_MINUTES) * 100) : 100,
    soon: minutes < 15,
  };
  if (start - t < MINUTE) return { ...base, pre: "", big: "Now", post: "Starting now", word: true };
  if (minutes < 60) return { ...base, pre: "In", big: String(minutes), post: "min", word: false };
  const phrase = countdown(event, now, timeZone);
  if (phrase.startsWith("Today, in "))
    return { ...base, pre: "Today, in", big: phrase.slice("Today, in ".length), post: "", word: false };
  return { ...base, pre: "", big: phrase, post: clockTime(start, timeZone), word: true };
}

/** Full spoken summary of one day, for its day button. */
export function dayAria(
  day: WeekDay,
  timeZone: string | undefined,
  now: Date,
  opts: { nextId?: string | null; unknown?: boolean; mayHaveMore?: boolean } = {},
) {
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${day.key}T12:00:00Z`));
  const head = `${day.isToday ? "Today, " : ""}${date}.`;
  if (opts.unknown) return `${head} Events not loaded; open Calendar.`;
  if (!day.events.length) return `${head} Nothing scheduled.`;
  const t = now.getTime();
  const ended = day.events.filter((e) => !isAllDay(e) && endOf(e) <= t).length;
  const items = day.events.map((e) => {
    const when = isAllDay(e) ? "All day" : clockTime(e.starts_at, timeZone);
    const kind = isSession(e) ? "session" : "not a labelled session";
    const state =
      e.id === opts.nextId
        ? ", next up"
        : !isAllDay(e) && endOf(e) <= t
          ? ", ended"
          : !isAllDay(e) && startOf(e) <= t
            ? ", happening now"
            : "";
    return `${when} ${e.student_name || e.title}, ${kind}${state}.`;
  });
  const count = `${day.events.length} ${day.events.length === 1 ? "event" : "events"}${
    ended ? `, ${ended} ended` : ""
  }.`;
  return [head, count, ...items, opts.mayHaveMore ? "May have more events in Calendar." : ""]
    .filter(Boolean)
    .join(" ");
}

/**
 * When the feed was cut off, the last loaded day may be incomplete and every
 * later day is unknown rather than empty.
 */
export function partialInfo(
  week: WeekDay[],
  events: AgendaEvent[],
  partial: boolean,
  timeZone?: string,
): { lastKey: string | null; unknown: Set<string> } {
  if (!partial) return { lastKey: null, unknown: new Set() };
  const starts = events
    .map((e) => dayKey(e.starts_at, timeZone))
    .filter((k): k is string => !!k)
    .sort();
  const lastKey = starts.length ? starts[starts.length - 1]! : week[0]!.key;
  return { lastKey, unknown: new Set(week.filter((d) => d.key > lastKey).map((d) => d.key)) };
}

/** "EST", "PDT": the calendar zone's short name right now. */
export function zoneName(now: Date, timeZone?: string) {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value ?? ""
  );
}
