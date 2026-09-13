/**
 * The Classroom Home model.
 *
 * The page reads five things and states them once each: what to pick up, what
 * is assigned, what the coach said, when the next session is, and what the week
 * holds. Everything here is derived from work that actually exists in the
 * student's own record. Nothing on this page may be invented: a count, a due
 * date, or a progress bar that cannot be traced to a row is omitted, not
 * guessed. The view has honest empty variants for every block.
 */

import { localDayISO, parseLocalDay } from "@/lib/localDate";
import type { SectionBriefing } from "@/lib/sectionBriefing";

export type HomeKind =
  | "activity"
  | "guided"
  | "homework"
  | "ta"
  | "bootcamp"
  | "plan"
  | "recap"
  | "note";

/** Which of the three status dots a row carries. */
export type HomeTone = "activity" | "drill" | "recap";

export interface HomeRow {
  key: string;
  title: string;
  kind: HomeKind;
  tone: HomeTone;
  /** "Activity · twelve prompts · due today" */
  meta: string;
  route: string;
  /** "Open" for work, "Read" for a recap or note. */
  actionLabel: string;
  /** Orange pill (the one thing to do next) versus the muted ring. */
  emphasis: boolean;
  /** Never opened. Drives the "N NEW" badge; derived, never stored twice. */
  isNew: boolean;
  dueToday: boolean;
  overdue: boolean;
  /** Work the student can close out by hand; reading matter cannot. */
  canComplete?: boolean;
  /**
   * A timed section's instructions, carried on the row so Home can raise them
   * over the stage rather than sending the student to a page to read them.
   */
  briefing?: SectionBriefing;

}

export interface HomeProgress {
  /** Present only when both halves are provable. */
  completed: number | null;
  total: number;
  /** "prompts", "questions" — plural noun for the count. */
  unit: string;
  estimateMinutes: number | null;
}

export interface HomeHero {
  row: HomeRow;
  eyebrow: string;
  /** "ACTIVITY", "GUIDED DRILL" — the mono tag beside the meta line. */
  kindLabel: string;
  /** The row's meta with the kind dropped: the tag beside it already says it. */
  meta: string;
  prose: string | null;
  primaryLabel: string;
  progress: HomeProgress | null;
}

export interface HomeMessage {
  id: string;
  from: string;
  initial: string;
  timeLabel: string;
  body: string;
  unread: boolean;
  route: string;
}

export interface HomeSession {
  /** ISO start. Null renders the honest "Nothing booked" variant. */
  startsAt: string;
  durationMin: number | null;
  label: string;
  meta: string | null;
}

/** The plan-aware booking link shown next to the session card. */
export interface HomeBookingCta {
  label: string;
  href: string;
  external: boolean;
  detail: string | null;
}

export interface HomeWeekDay {
  iso: string;
  abbr: string;
  dayNum: number;
  isToday: boolean;
  isWeekend: boolean;
  /** The single line under the date, or null for an empty day. */
  label: string | null;
  /**
   * Where pressing this day goes, or null when the day has nothing to open.
   *
   * The route belongs to the FIRST thing on the day, which is the same thing
   * `label` names. A cell reading "Read, Recall, Colour" that opened the
   * schedule instead would be a link that lies about its own text.
   */
  route: string | null;
}

/**
 * What this particular person can actually reach.
 *
 * Home is a shortcut into surfaces the rail already gates, so it has to gate
 * itself the same way: a student without chat access must not be shown a
 * message card that dead-ends on a locked route, and one without schedule
 * access gets a week band that reads but does not click. Admins pass every
 * check, exactly as they do in the rail.
 */
export interface HomeAccess {
  messages: boolean;
  schedule: boolean;
  activities: boolean;
  /** Gates the Question finder. Without it there is nothing to find. */
  drill: boolean;
}

export interface ClassroomHomeModel {
  greeting: string;
  displayName: string;
  /** True when the viewer is staff looking at their own classroom. */
  isAdmin: boolean;
  access: HomeAccess;


  dateline: string;
  subtitle: string;
  dueTodayCount: number;
  hero: HomeHero | null;
  rows: HomeRow[];
  newCount: number;
  message: HomeMessage | null;
  /** Every preview-worthy thread, newest first. `message` is its head. */
  messages: HomeMessage[];
  unreadMessages: number;
  session: HomeSession | null;
  /** The one booking link that matches this student's plan. */
  booking: HomeBookingCta | null;
  week: HomeWeekDay[];
  weekLabel: string;
}

/* ── small formatters ─────────────────────────────────────────────────── */

const ONES = [
  "zero", "one", "two", "three", "four", "five",
  "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
];

/** Editorial voice: small numbers read as words in prose, digits everywhere else. */
export function spell(n: number): string {
  return n >= 0 && n < ONES.length ? ONES[n] : String(n);
}

export function greetingFor(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** "MONDAY · AUGUST 3 · 2026" — three beats, with the date kept whole. */
export function datelineFor(now: Date = new Date()): string {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-CA", options).format(now);
  return [
    part({ weekday: "long" }),
    part({ month: "long", day: "numeric" }),
    part({ year: "numeric" }),
  ].join(" · ");
}

/**
 * The LOCAL calendar day a timestamp falls on.
 *
 * `iso.slice(0, 10)` is right for a bare `YYYY-MM-DD` and wrong for anything
 * carrying a time, because the stored timestamp is UTC. A section due at
 * 23:59 on the 30th in New York is stored as 03:59 on the 31st, and slicing
 * that reads the due date as tomorrow: the row loses its "due today" rank, the
 * hero picks the wrong assignment, and the label says "due Tuesday" for work
 * due Monday night. Every evening deadline in a western timezone hit this.
 */
function calendarDay(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return iso.trim();
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso.slice(0, 10) : localDayISO(parsed);
}

function dayDiff(iso: string, today = localDayISO()): number | null {
  const a = parseLocalDay(calendarDay(iso));
  const b = parseLocalDay(today);
  if (!a || !b) return null;
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

/** "due today" / "due tomorrow" / "overdue" / "due Friday" / "due 12 Sep". */
export function dueLabel(dueAt: string | null, now: Date = new Date()): string | null {
  if (!dueAt) return null;
  const diff = dayDiff(dueAt, localDayISO(now));
  if (diff === null) return null;
  if (diff < 0) return diff === -1 ? "one day overdue" : `${spell(-diff)} days overdue`;
  if (diff === 0) return "due today";
  if (diff === 1) return "due tomorrow";
  if (diff <= 6) {
    const date = parseLocalDay(calendarDay(dueAt));
    return date
      ? `due ${new Intl.DateTimeFormat("en-CA", { weekday: "long" }).format(date)}`
      : null;
  }
  const date = parseLocalDay(calendarDay(dueAt));
  return date
    ? `due ${new Intl.DateTimeFormat("en-CA", { day: "numeric", month: "short" }).format(date)}`
    : null;
}

/** "assigned today" / "assigned yesterday" / "assigned 12 Sep". */
export function assignedLabel(createdAt: string, now: Date = new Date()): string | null {
  const diff = dayDiff(createdAt, localDayISO(now));
  if (diff === null) return null;
  if (diff === 0) return "assigned today";
  if (diff === -1) return "assigned yesterday";
  if (diff < 0 && diff >= -6) return `assigned ${spell(-diff)} days ago`;
  return `assigned ${new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "short",
  }).format(new Date(createdAt))}`;
}

export const KIND_LABEL: Record<HomeKind, string> = {
  activity: "Activity",
  guided: "Guided drill",
  homework: "Homework",
  ta: "From Joshua",
  bootcamp: "Bootcamp",
  plan: "Weekly plan",
  recap: "Recap",
  note: "Note",
};

export const KIND_TONE: Record<HomeKind, HomeTone> = {
  activity: "activity",
  guided: "drill",
  homework: "drill",
  ta: "activity",
  bootcamp: "drill",
  plan: "activity",
  recap: "recap",
  note: "recap",
};

const PRIMARY_LABEL: Record<HomeKind, { start: string; resume: string }> = {
  activity: { start: "Start the activity", resume: "Pick it back up" },
  guided: { start: "Start the drill", resume: "Pick it back up" },
  homework: { start: "Open the set", resume: "Pick it back up" },
  ta: { start: "Open the assignment", resume: "Pick it back up" },
  bootcamp: { start: "Open the bootcamp", resume: "Pick it back up" },
  plan: { start: "Open the plan", resume: "Pick it back up" },
  recap: { start: "Read it", resume: "Read it" },
  note: { start: "Read it", resume: "Read it" },
};

export function primaryLabelFor(kind: HomeKind, started: boolean): string {
  const pair = PRIMARY_LABEL[kind];
  return started ? pair.resume : pair.start;
}

/**
 * The hero shows its kind as a tag, so the meta line beneath must not open by
 * saying it again. Falls back to the whole line when the kind is not the lead.
 */
export function stripKind(meta: string, kind: HomeKind): string {
  const parts = meta.split(" · ");
  if (parts.length > 1 && parts[0] === KIND_LABEL[kind]) return parts.slice(1).join(" · ");
  return meta;
}

/**
 * The one line under the greeting. Built from counts we can prove, and honest
 * when there is nothing: it never invents a streak or a projection.
 */
export function subtitleFor(dueToday: number, openWork: number, unread: number): string {
  /** Every clause here opens a sentence, so the spelled number is capitalised. */
  const Count = (n: number) => `${spell(n)[0].toUpperCase()}${spell(n).slice(1)}`;

  const parts: string[] = [];
  if (dueToday > 0) {
    parts.push(
      dueToday === 1
        ? "One assignment is due today."
        : `${Count(dueToday)} assignments are due today.`,
    );
  }
  const rest = Math.max(0, openWork - dueToday);
  if (rest > 0) {
    parts.push(
      dueToday > 0
        ? `${Count(rest)} more ${rest === 1 ? "is" : "are"} waiting.`
        : `${Count(rest)} ${rest === 1 ? "assignment is" : "assignments are"} waiting for you.`,
    );
  }
  if (!parts.length) {
    parts.push(
      unread > 0
        ? "Nothing is due today."
        : "Nothing is due today. Drill whatever you feel like.",
    );
  }
  if (unread > 0) {
    parts.push(unread === 1 ? "One unread message." : `${Count(unread)} unread messages.`);
  }
  return parts.join(" ");
}

/* ── the week band ────────────────────────────────────────────────────── */

const ABBR = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** The Monday-based week containing `now`, as seven local ISO dates. */
/**
 * Seven days starting TODAY, not Monday to Sunday.
 *
 * A fixed calendar week hides tomorrow whenever today is Sunday, which is
 * exactly when a student most needs to see what is coming: work assigned for
 * Monday night simply was not on the strip. A rolling window always shows
 * today first and the next six days, and it re-labels itself as the days pass,
 * so tomorrow's assignment becomes today's without anything being rewritten.
 */
export function weekDates(now: Date = new Date()): string[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return localDayISO(day);
  });
}

export function weekLabelFor(dates: string[]): string {
  const first = parseLocalDay(dates[0]);
  const last = parseLocalDay(dates[dates.length - 1]);
  if (!first || !last) return "";
  const month = new Intl.DateTimeFormat("en-CA", { month: "long" });
  const same = first.getMonth() === last.getMonth();
  return same
    ? `${month.format(first)} ${first.getDate()} to ${last.getDate()}`
    : `${month.format(first)} ${first.getDate()} to ${month.format(last)} ${last.getDate()}`;
}

/**
 * Folds every dated thing in the week onto its day. `entries` are already
 * resolved to a local ISO day by the caller, so nothing is re-parsed here.
 */
export function buildWeek(
  dates: string[],
  entries: { iso: string; label: string; route?: string | null }[],
  now: Date = new Date(),
): HomeWeekDay[] {
  const today = localDayISO(now);
  const byDay = new Map<string, { label: string; route?: string | null }[]>();
  for (const entry of entries) {
    const bucket = byDay.get(entry.iso);
    if (bucket) bucket.push(entry);
    else byDay.set(entry.iso, [entry]);
  }

  return dates.map((iso) => {
    const date = parseLocalDay(iso);
    const onDay = byDay.get(iso) ?? [];
    const labels = onDay.map((entry) => entry.label);
    const weekday = date ? date.getDay() : 1;
    return {
      iso,
      abbr: ABBR[weekday],
      dayNum: date ? date.getDate() : 0,
      isToday: iso === today,
      isWeekend: weekday === 0 || weekday === 6,
      // One line per cell: the first thing, and a count when there is more.
      label:
        labels.length === 0
          ? null
          : labels.length === 1
            ? labels[0]
            : `${labels[0]} +${labels.length - 1}`,
      // The first entry's own route, and only its own. Falling back to a later
      // entry's route would send her to the second thing on the day while the
      // cell still read the name of the first.
      route: onDay[0]?.route ?? null,
    };
  });
}
