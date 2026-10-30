const HOST_TIME_ZONE = "America/Toronto";

function offsetMsAt(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const values: Record<string, number> = {};
  for (const part of parts) if (part.type !== "literal") values[part.type] = Number(part.value);
  return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) - at.getTime();
}
function localMidnightIso(dateOnly: string, timeZone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!match) throw new Error("invalid_expiry_date");
  const naive = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  let instant = new Date(naive - offsetMsAt(timeZone, new Date(naive)));
  instant = new Date(naive - offsetMsAt(timeZone, instant));
  return instant.toISOString();
}

export function validThroughDateToExclusiveIso(dateOnly: string, timeZone = HOST_TIME_ZONE): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDateOnly = [
    nextDate.getUTCFullYear(),
    String(nextDate.getUTCMonth() + 1).padStart(2, "0"),
    String(nextDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
  return localMidnightIso(nextDateOnly, timeZone);
}

export function exclusiveIsoToValidThroughDate(iso: string, timeZone = HOST_TIME_ZONE): string {
  const inclusiveInstant = new Date(new Date(iso).getTime() - 1);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(inclusiveInstant);
  const values: Record<string, string> = {};
  for (const part of parts) if (part.type !== "literal") values[part.type] = part.value;
  return `${values.year}-${values.month}-${values.day}`;
}
