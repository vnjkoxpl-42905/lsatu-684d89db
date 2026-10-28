/** Calendar dates are compared in the connected calendar's zone. Date-only
 * events already identify a calendar day and must never shift across zones. */
export function calendarTimeZone(value?: string): string {
  const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  try {
    if (value) { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); return value; }
  } catch { /* An invalid provider zone falls back to this browser. */ }
  return fallback;
}
export function calendarDayKey(value: string | Date, timeZone: string): string | null {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  return part("year") + "-" + part("month") + "-" + part("day");
}
export function calendarWeek(now: Date, timeZone: string) {
  const key = calendarDayKey(now, timeZone)!;
  const start = new Date(key + "T12:00:00Z");
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    return { key: date.toISOString().slice(0, 10), date };
  });
}
export function calendarDateLabel(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date);
}
export function calendarStartLabel(value: string, timeZone: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return "All day";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(date);
}
