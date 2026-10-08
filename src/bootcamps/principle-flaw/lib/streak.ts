import { localDayISO } from '@/lib/localDate';
import { mirroredSetItem } from '@/lib/cloudMirror';

const STREAK_DATES_KEY = 'pf:streakDates';

function todayISO(): string {
  return localDayISO();
}

// Parse a YYYY-MM-DD string into a Date at LOCAL midnight (new Date('YYYY-MM-DD')
// parses as UTC, which shifts the calendar day in negative-offset timezones).
function parseLocalDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function readStreakDates(): string[] {
  try {
    const raw = localStorage.getItem(STREAK_DATES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function recordCompletionToday(): string[] {
  const dates = readStreakDates();
  const today = todayISO();
  if (dates.includes(today)) return dates;
  const next = [...dates, today].sort();
  mirroredSetItem(STREAK_DATES_KEY, JSON.stringify(next));
  return next;
}

export function computeStreak(dates: string[] = readStreakDates()): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates);
  const today = todayISO();
  // Allow streak to count if last entry is today or yesterday.
  let cursor = set.has(today) ? today : null;
  if (!cursor) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = localDayISO(yesterday);
    if (set.has(y)) cursor = y;
    else return 0;
  }
  let count = 0;
  const probe = parseLocalDay(cursor);
  while (set.has(localDayISO(probe))) {
    count += 1;
    probe.setDate(probe.getDate() - 1);
  }
  return count;
}
