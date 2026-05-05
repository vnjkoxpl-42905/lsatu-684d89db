const STREAK_DATES_KEY = 'lsatStreakDates';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
  localStorage.setItem(STREAK_DATES_KEY, JSON.stringify(next));
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
    const y = yesterday.toISOString().slice(0, 10);
    if (set.has(y)) cursor = y;
    else return 0;
  }
  let count = 0;
  let probe = new Date(cursor);
  while (set.has(probe.toISOString().slice(0, 10))) {
    count += 1;
    probe.setDate(probe.getDate() - 1);
  }
  return count;
}
