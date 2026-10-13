import type { TeacherTodoPriorityBand } from './teacherTodoTypes';

/**
 * One scoring scale for the Today queue (plan T3.6).
 *
 * Each source used to invent its own magnitude: calendar events scored around
 * two billion (`2_000 + (2e9 - start/1e6)`), Gmail around four thousand
 * (`3_000 + internalDate/1e9`), desk tasks around a thousand. The bands were
 * meaningless — every calendar event outranked every student email by roughly a
 * millionfold, so a routine session next week buried a student waiting on a
 * reply since yesterday.
 *
 * Now: a band decides the tier, and closeness-to-now orders within it. The
 * recency term is capped below 1000 so it can never promote an item out of its
 * band, and the bands are far enough apart that ordering is readable by eye.
 */

export const TODO_BAND_BASE: Record<TeacherTodoPriorityBand, number> = {
  /** A person is waiting on a reply. Nothing routine outranks this. */
  email: 3_000,
  /** Work to review, approve, or hand out. */
  work: 2_000,
  /** Scheduled events, which are usually not actionable yet. */
  calendar: 1_000,
};

/** A session about to start is the exception: it outranks everything. */
export const IMMINENT_BASE = 4_000;
export const IMMINENT_WINDOW_HOURS = 2;

/** The recency term never reaches 1000, so it cannot cross a band boundary. */
const RECENCY_MAX = 999;
const RECENCY_HORIZON_HOURS = 72;

const HOUR_MS = 60 * 60 * 1000;

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * How many points an item earns for being close to now, in either direction.
 *
 * Past-anchored items (an email that arrived, an upload that landed) and
 * future-anchored ones (a session about to start) both matter more the nearer
 * they are, so distance is absolute. Beyond the 72-hour horizon everything
 * scores 0 and falls back to its band.
 */
export function recencyPoints(timestamp: number | string | null | undefined, now = Date.now()): number {
  const ms = typeof timestamp === 'string' ? Date.parse(timestamp) : timestamp;
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return 0;
  const distanceHours = Math.abs(now - ms) / HOUR_MS;
  return Math.round(clamp01(1 - Math.min(distanceHours, RECENCY_HORIZON_HOURS) / RECENCY_HORIZON_HOURS) * RECENCY_MAX);
}

/** True while an event is inside the imminent window (and has not already passed). */
export function isImminent(startAt: number | string | null | undefined, now = Date.now()): boolean {
  const ms = typeof startAt === 'string' ? Date.parse(startAt) : startAt;
  if (ms == null || !Number.isFinite(ms)) return false;
  const hoursUntil = (ms - now) / HOUR_MS;
  return hoursUntil >= 0 && hoursUntil <= IMMINENT_WINDOW_HOURS;
}

/**
 * The queue's only scoring function. Every source calls this and nothing else
 * sets `sortScore` by hand.
 */
export function todoScore(input: {
  band: TeacherTodoPriorityBand;
  /** When the item happened, or when it is due to happen. */
  timestamp?: number | string | null;
  /** Calendar only: promotes a session starting within the next two hours. */
  imminentAt?: number | string | null;
  now?: number;
}): number {
  const now = input.now ?? Date.now();
  const base = isImminent(input.imminentAt, now) ? IMMINENT_BASE : TODO_BAND_BASE[input.band];
  return base + recencyPoints(input.timestamp, now);
}
