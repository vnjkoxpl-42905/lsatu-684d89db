// Pure, framework-free slot-generation + link helpers, shared by the client
// and mirrored by the Deno edge core (supabase/functions/_shared/bookingCore.ts).
// Kept in src/ so Vitest can exercise the DST/buffer/boundary logic directly.

export const BOOKING_CFG = {
  sessionMinDefault: 70,
  bufferMin: 15,
  stepMin: 30,
  leadMin: 1440,
  maxSlots: 200,
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

// Mirror of the edge core's generateSlots: 30-min grid inside seeded windows,
// >= 24h lead, session fits fully, 15-min buffer around busy blocks.
export function generateSlots(opts: {
  sessionMin: number;
  nowMs: number;
  hostTz: string;
  rangesByDow: DowRanges;
  busy: { start: number; end: number }[];
  daysAhead: number;
  expiresAtMs?: number | null;
}): Slot[] {
  const { sessionMin, nowMs, hostTz, rangesByDow, busy, daysAhead, expiresAtMs } = opts;
  const sessionMs = sessionMin * 60_000;
  const bufMs = BOOKING_CFG.bufferMin * 60_000;
  const rangeStart = nowMs + BOOKING_CFG.leadMin * 60_000;
  let rangeEnd = nowMs + daysAhead * 86_400_000;
  if (expiresAtMs && expiresAtMs < rangeEnd) rangeEnd = expiresAtMs;

  const slots: Slot[] = [];
  for (let d = 0; d <= daysAhead && slots.length < BOOKING_CFG.maxSlots; d++) {
    const dayAnchor = new Date(rangeStart + d * 86_400_000);
    const { y, m, d: dd, dow } = hostLocalParts(hostTz, dayAnchor);
    const dayRanges = rangesByDow[dow] ?? [];
    for (const rng of dayRanges) {
      for (let mins = rng.startMin; mins + sessionMin <= rng.endMin; mins += BOOKING_CFG.stepMin) {
        const startUtc = hostLocalToUtc(hostTz, y, m, dd, mins).getTime();
        if (startUtc < rangeStart) continue;
        if (startUtc + sessionMs > rangeEnd) break;
        const conflict = busy.some((b) => b.start - bufMs < startUtc + sessionMs && b.end + bufMs > startUtc);
        if (!conflict) slots.push({ start_at: new Date(startUtc).toISOString(), end_at: new Date(startUtc + sessionMs).toISOString() });
        if (slots.length >= BOOKING_CFG.maxSlots) break;
      }
      if (slots.length >= BOOKING_CFG.maxSlots) break;
    }
  }
  slots.sort((a, b) => a.start_at.localeCompare(b.start_at));
  return slots;
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
