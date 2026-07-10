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

// Local date N days offset from `from`, formatted YYYY-MM-DD. Uses setDate so
// it stays correct across DST transitions (unlike subtracting 86_400_000 ms).
export function addLocalDays(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return localDayISO(d);
}
