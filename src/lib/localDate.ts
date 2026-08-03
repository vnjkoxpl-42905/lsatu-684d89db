// Local calendar-date helpers.
//
// Day boundaries for streaks and daily stats must follow the student's local
// timezone, not UTC. `new Date().toISOString().slice(0,10)` returns the UTC
// calendar date, so any evening practice in a US timezone lands under
// "tomorrow" and breaks streak/day-boundary math. Use these instead.

// Format a Date as its LOCAL YYYY-MM-DD (en-CA yields ISO-style order).
export function localDayISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Parse a YYYY-MM-DD calendar date into that day's LOCAL midnight.
//
// `new Date('2026-08-05')` is parsed as UTC midnight, which in any western
// timezone is the evening of the 4th. Scheduling work for "the 5th" that way
// unlocks it a day early. Splitting the parts and using the Date(y, m, d)
// constructor keeps the day the day the teacher picked.
export function parseLocalDay(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

// Local date N days offset from `from`, formatted YYYY-MM-DD. Uses setDate so
// it stays correct across DST transitions (unlike subtracting 86_400_000 ms).
export function addLocalDays(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return localDayISO(d);
}
