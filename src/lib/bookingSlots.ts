// Pure, framework-free slot-generation + link helpers, shared by the client
// and mirrored by the Deno edge core (supabase/functions/_shared/bookingCore.ts).
// Kept in src/ so Vitest can exercise the DST/buffer/boundary logic directly.

// Fallbacks only. The live numbers come from booking_availability_config:
// Buffer 10 min, 24 h notice, 8-day window (2026-09-11).
export const BOOKING_CFG = {
  sessionMinDefault: 70,
  bufferMinDefault: 10,
  leadMin: 1440,
  lookaheadDaysDefault: 8,
  maxSlots: 400,
};

export function durationLabel(mins: number): string {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
}

// UTC offset (minutes) of an IANA tz at an instant (DST-aware; positive = east).
export function tzOffsetMinutesAt(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const map: Record<string, number> = {};
  for (const p of dtf.formatToParts(at)) if (p.type !== "literal") map[p.type] = Number(p.value);
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

export function hostLocalToUtc(timeZone: string, y: number, m: number, d: number, minutesOfDay: number): Date {
  const naiveUtc = Date.UTC(y, m, d, Math.floor(minutesOfDay / 60), minutesOfDay % 60);
  let guess = new Date(naiveUtc - tzOffsetMinutesAt(timeZone, new Date(naiveUtc)) * 60000);
  guess = new Date(naiveUtc - tzOffsetMinutesAt(timeZone, guess) * 60000);
  return guess;
}

export function hostLocalParts(timeZone: string, at: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(at)) map[p.type] = p.value;
  const wd: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { y: Number(map.year), m: Number(map.month) - 1, d: Number(map.day), dow: wd[map.weekday] };
}

export type Slot = { start_at: string; end_at: string };
export type DowRanges = Record<number, { startMin: number; endMin: number }[]>;
export type DateRanges = Record<string, { startMin: number; endMin: number }[]>;

// Mirror of the edge core's SlotPolicy / BookingHours (bookingCore.ts).
export type SlotPolicy = {
  lengthMin: number;
  pitchMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  leadMin: number;
  windowEndMs: number;
  maxSlots?: number;
};
export type BookingHours = { hostTz: string; rangesByDow: DowRanges; overridesByDate: DateRanges };

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function rangesForDate(hours: BookingHours, date: string, dow: number) {
  const override = hours.overridesByDate[date];
  if (override) return override;
  return hours.rangesByDow[dow] ?? [];
}

// Mirror of the edge core's generateSlots: slots step pitchMin from the start
// of each range on the host's local date (overrides first), the whole session
// fits inside the range, it starts no earlier than the notice and ends inside
// the window, and nothing busy sits within the buffer on either side. Busy
// blocks are not buffered themselves, so two events are one buffer apart.
export function generateSlots(opts: {
  policy: SlotPolicy;
  hours: BookingHours;
  nowMs: number;
  busy: { start: number; end: number }[];
}): Slot[] {
  const { policy, hours, nowMs, busy } = opts;
  const sessionMs = policy.lengthMin * 60_000;
  const beforeMs = policy.bufferBeforeMin * 60_000;
  const afterMs = policy.bufferAfterMin * 60_000;
  const maxSlots = policy.maxSlots ?? BOOKING_CFG.maxSlots;
  const rangeStart = nowMs + policy.leadMin * 60_000;
  const rangeEnd = policy.windowEndMs;
  if (rangeEnd <= rangeStart) return [];

  const slots: Slot[] = [];
  const seen = new Set<string>();
  const daysAhead = Math.ceil((rangeEnd - rangeStart) / 86_400_000) + 1;
  const first = hostLocalParts(hours.hostTz, new Date(rangeStart));
  for (let d = 0; d <= daysAhead && slots.length < maxSlots; d++) {
    const dt = new Date(Date.UTC(first.y, first.m, first.d + d));
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth(), dd = dt.getUTCDate(), dow = dt.getUTCDay();
    const dayRanges = rangesForDate(hours, isoDate(y, m, dd), dow);
    for (const rng of dayRanges) {
      for (let mins = rng.startMin; mins + policy.lengthMin <= rng.endMin; mins += policy.pitchMin) {
        const startUtc = hostLocalToUtc(hours.hostTz, y, m, dd, mins).getTime();
        if (startUtc < rangeStart) continue;
        if (startUtc + sessionMs > rangeEnd) break;
        const conflict = busy.some((b) => b.start < startUtc + sessionMs + afterMs && b.end > startUtc - beforeMs);
        if (!conflict) {
          const startIso = new Date(startUtc).toISOString();
          if (!seen.has(startIso)) {
            seen.add(startIso);
            slots.push({ start_at: startIso, end_at: new Date(startUtc + sessionMs).toISOString() });
          }
        }
        if (slots.length >= maxSlots) break;
      }
      if (slots.length >= maxSlots) break;
    }
  }
  slots.sort((a, b) => a.start_at.localeCompare(b.start_at));
  return slots;
}

// The pass link's policy: pitch is length + buffer so back-to-back slots are
// all bookable (80 minutes for the 70-minute session).
export function passSlotPolicy(opts: {
  sessionMin: number; bufferMin: number; leadMin: number; windowDays: number; nowMs: number; expiresAtMs?: number | null; hostTz?: string;
}): SlotPolicy {
  // Counted in host-local calendar dates: today plus N days, through the end of that day.
  const tz = opts.hostTz ?? "America/Toronto";
  const today = hostLocalParts(tz, new Date(opts.nowMs));
  let windowEndMs = hostLocalToUtc(tz, today.y, today.m, today.d + opts.windowDays + 1, 0).getTime();
  if (opts.expiresAtMs && opts.expiresAtMs < windowEndMs) windowEndMs = opts.expiresAtMs;
  return {
    lengthMin: opts.sessionMin,
    pitchMin: opts.sessionMin + opts.bufferMin,
    bufferBeforeMin: opts.bufferMin,
    bufferAfterMin: opts.bufferMin,
    leadMin: opts.leadMin,
    windowEndMs,
  };
}

// Slug: <firstname>-<128-bit code>. The code's entropy is the bearer secret.
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function genCode(chars = 26, rand: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < chars; i++) out += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return out;
}
export function sanitizeFirstName(name?: string | null, email?: string | null): string {
  const base = (name?.trim().split(/\s+/)[0] || email?.split("@")[0] || "student").toLowerCase();
  return base.replace(/[^a-z0-9]/g, "").slice(0, 20) || "student";
}
