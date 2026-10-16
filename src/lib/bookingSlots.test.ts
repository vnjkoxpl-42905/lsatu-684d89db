import { describe, it, expect } from "vitest";
import {
  BOOKING_CFG, durationLabel, generateSlots, genCode, passSlotPolicy, sanitizeFirstName, hostLocalToUtc,
} from "./bookingSlots";

// Seeded Eastern availability (from Joshua's real hours).
const EASTERN = "America/Toronto";
const RANGES = {
  1: [{ startMin: 14 * 60, endMin: 20 * 60 }],       // Mon 2:00pm-8:00pm
  2: [{ startMin: 13 * 60, endMin: 19 * 60 + 30 }],  // Tue 1:00pm-7:30pm
  6: [{ startMin: 14 * 60, endMin: 17 * 60 }],       // Sat 2:00pm-5:00pm
};

// A fixed "now": 2026-07-01T12:00:00Z (well clear of DST edges), so lead=24h.
const NOW = Date.UTC(2026, 6, 1, 12, 0, 0);

describe("durationLabel", () => {
  it("formats the 70-minute session as 1 hr 10 min", () => {
    expect(durationLabel(70)).toBe("1 hr 10 min");
    expect(durationLabel(60)).toBe("1 hr");
    expect(durationLabel(30)).toBe("30 min");
  });
});

// Wall-clock minutes-of-day in the host tz for a slot start.
function localMinutes(iso: string, tz = EASTERN): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === "hour")?.value) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value);
  return h * 60 + m;
}
function weekdayOf(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: EASTERN, weekday: "short" }).formatToParts(new Date(iso))
    .find((x) => x.type === "weekday")!.value;
}
function onLocalDate(iso: string, y: number, m: number, d: number): boolean {
  const t = new Date(iso).getTime();
  return t >= hostLocalToUtc(EASTERN, y, m, d, 0).getTime() && t < hostLocalToUtc(EASTERN, y, m, d + 1, 0).getTime();
}

const POLICY = { sessionMin: 70, bufferMin: 10, leadMin: 1440, windowDays: 21, nowMs: NOW };

describe("generateSlots", () => {
  const base = {
    policy: passSlotPolicy(POLICY),
    hours: { hostTz: EASTERN, rangesByDow: RANGES, overridesByDate: {} },
    nowMs: NOW,
    busy: [],
  };

  it("steps 80 minutes (session + buffer) from the start of each range, like Cal.com's pitch", () => {
    const slots = generateSlots(base);
    expect(slots.length).toBeGreaterThan(0);
    const monday = slots.filter((s) => weekdayOf(s.start_at) === "Mon").map((s) => localMinutes(s.start_at));
    // Mon 14:00-20:00 -> 14:00, 15:20, 16:40, 18:00 (ends 19:10); 19:20 would end 20:30.
    expect([...new Set(monday)]).toEqual([14 * 60, 15 * 60 + 20, 16 * 60 + 40, 18 * 60]);
    const tuesday = slots.filter((s) => weekdayOf(s.start_at) === "Tue").map((s) => localMinutes(s.start_at));
    // Tue 13:00-19:30 -> 13:00, 14:20, 15:40, 17:00, 18:20 (ends 19:30 exactly).
    expect([...new Set(tuesday)]).toEqual([13 * 60, 14 * 60 + 20, 15 * 60 + 40, 17 * 60, 18 * 60 + 20]);
  });

  it("back-to-back slots are all bookable together (one buffer between them)", () => {
    // Book the 14:00 Monday slot; the 15:20 slot must survive: 15:10 end + 10 min.
    const mon = generateSlots(base).find((s) => weekdayOf(s.start_at) === "Mon" && localMinutes(s.start_at) === 14 * 60)!;
    const busy = [{ start: new Date(mon.start_at).getTime(), end: new Date(mon.end_at).getTime() }];
    const after = generateSlots({ ...base, busy });
    const sameDay = after.filter((s) => s.start_at.slice(0, 10) === mon.start_at.slice(0, 10)).map((s) => localMinutes(s.start_at));
    expect(sameDay).toContain(15 * 60 + 20);
    expect(sameDay).not.toContain(14 * 60);
  });

  it("deduplicates slots from overlapping ranges defensively", () => {
    const slots = generateSlots({
      ...base,
      hours: { ...base.hours, rangesByDow: { 1: [{ startMin: 13 * 60, endMin: 18 * 60 }, { startMin: 14 * 60, endMin: 19 * 60 }] } },
    });
    expect(new Set(slots.map((slot) => slot.start_at)).size).toBe(slots.length);
  });

  it("never emits a slot less than 24h from now", () => {
    const slots = generateSlots(base);
    const minStart = Math.min(...slots.map((s) => new Date(s.start_at).getTime()));
    expect(minStart).toBeGreaterThanOrEqual(NOW + BOOKING_CFG.leadMin * 60_000);
  });

  it("keeps the full 70-min session inside the availability window", () => {
    const satSlots = generateSlots(base).filter((s) => weekdayOf(s.start_at) === "Sat");
    expect(satSlots.length).toBeGreaterThan(0);
    for (const s of satSlots) {
      expect(localMinutes(s.start_at)).toBeLessThanOrEqual(15 * 60 + 50); // last valid start for 70min ending 17:00
    }
  });

  it("excludes slots within the 10-min buffer of a busy block, counted once", () => {
    // Busy Mon Jul 6 2026 15:00-16:00 ET. 14:00 (ends 15:10) collides; 16:40 starts 40 min after, fine.
    const busyStart = hostLocalToUtc(EASTERN, 2026, 6, 6, 15 * 60).getTime();
    const busyEnd = busyStart + 60 * 60_000;
    const withBusy = generateSlots({ ...base, busy: [{ start: busyStart, end: busyEnd }] });
    const bufMs = 10 * 60_000;
    for (const s of withBusy) {
      const st = new Date(s.start_at).getTime();
      const en = new Date(s.end_at).getTime();
      expect(busyStart < en + bufMs && busyEnd > st - bufMs).toBe(false);
    }
    // A block ending exactly one buffer before the 15:20 slot does not block it.
    const slotStart = hostLocalToUtc(EASTERN, 2026, 6, 6, 15 * 60 + 20).getTime();
    const tight = generateSlots({ ...base, busy: [{ start: slotStart - bufMs - 30 * 60_000, end: slotStart - bufMs }] });
    expect(tight.some((s) => new Date(s.start_at).getTime() === slotStart)).toBe(true);
    // One minute closer and it does.
    const tooClose = generateSlots({ ...base, busy: [{ start: slotStart - bufMs - 30 * 60_000, end: slotStart - bufMs + 60_000 }] });
    expect(tooClose.some((s) => new Date(s.start_at).getTime() === slotStart)).toBe(false);
  });

  it("respects pass expiry as a hard ceiling", () => {
    const expiresAtMs = NOW + 3 * 86_400_000; // 3 days out
    const slots = generateSlots({ ...base, policy: passSlotPolicy({ ...POLICY, expiresAtMs }) });
    const maxEnd = Math.max(...slots.map((s) => new Date(s.end_at).getTime()));
    expect(maxEnd).toBeLessThanOrEqual(expiresAtMs);
  });

  it("ends at the rolling window, counted in host dates through the end of the last day", () => {
    // NOW is Wed Jul 1 08:00 ET; 8 days lands on Thu Jul 9 (not seeded), so Tue Jul 7 is the last day with slots.
    const slots = generateSlots({ ...base, policy: passSlotPolicy({ ...POLICY, windowDays: 8 }) });
    const lastStart = Math.max(...slots.map((s) => new Date(s.start_at).getTime()));
    expect(lastStart).toBe(hostLocalToUtc(EASTERN, 2026, 6, 7, 18 * 60 + 20).getTime());
    expect(slots.some((s) => onLocalDate(s.start_at, 2026, 6, 11))).toBe(false);
  });

  it("produces no slots on Sunday (no seeded window)", () => {
    const sunSlots = generateSlots(base).filter((s) => weekdayOf(s.start_at) === "Sun");
    expect(sunSlots).toHaveLength(0);
  });

  it("a date override replaces that day's weekly hours, and a closed override empties it", () => {
    // Sat Jul 11 2026: override to 20:00-21:10 (the Cal.com shape). Sat Jul 18: closed.
    const slots = generateSlots({
      ...base,
      hours: { ...base.hours, overridesByDate: { "2026-07-11": [{ startMin: 20 * 60, endMin: 21 * 60 + 10 }], "2026-07-18": [] } },
    });
    const jul11 = slots.filter((s) => onLocalDate(s.start_at, 2026, 6, 11));
    expect(jul11.map((s) => localMinutes(s.start_at))).toEqual([20 * 60]);
    expect(slots.filter((s) => onLocalDate(s.start_at, 2026, 6, 18))).toHaveLength(0);
    // Other Saturdays keep the weekly hours.
    expect(slots.filter((s) => onLocalDate(s.start_at, 2026, 6, 4)).map((s) => localMinutes(s.start_at))).toEqual([14 * 60, 15 * 60 + 20]);
  });
});

describe("DST correctness", () => {
  const sundays = { hostTz: EASTERN, rangesByDow: { 0: [{ startMin: 14 * 60, endMin: 17 * 60 }] }, overridesByDate: {} };

  it("US spring-forward (Mar 8 2026) still yields wall-clock 14:00 / 15:20 Eastern slots", () => {
    const now = Date.UTC(2026, 2, 1, 12, 0, 0);
    const slots = generateSlots({ policy: passSlotPolicy({ ...POLICY, nowMs: now, windowDays: 14 }), hours: sundays, nowMs: now, busy: [] });
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) expect([14 * 60, 15 * 60 + 20]).toContain(localMinutes(s.start_at));
    expect(slots.some((s) => onLocalDate(s.start_at, 2026, 2, 8))).toBe(true);
  });

  it("US fall-back still yields one unique wall-clock grid", () => {
    const now = Date.UTC(2026, 9, 25, 12, 0, 0);
    const slots = generateSlots({ policy: passSlotPolicy({ ...POLICY, nowMs: now, windowDays: 14 }), hours: sundays, nowMs: now, busy: [] });
    expect(new Set(slots.map((slot) => slot.start_at)).size).toBe(slots.length);
    for (const s of slots) expect([14 * 60, 15 * 60 + 20]).toContain(localMinutes(s.start_at));
    expect(slots.some((s) => onLocalDate(s.start_at, 2026, 10, 1))).toBe(true);
  });
});

describe("slug helpers", () => {
  it("sanitizes a first name to lowercase alnum", () => {
    expect(sanitizeFirstName("Joshua Fisseha", null)).toBe("joshua");
    expect(sanitizeFirstName(null, "jane.doe@example.com")).toBe("janedoe");
    expect(sanitizeFirstName("  ", null)).toBe("student");
    expect(sanitizeFirstName("O'Brien", null)).toBe("obrien");
  });

  it("generates a 26-char code from the unambiguous alphabet (>=128 bits)", () => {
    const c = genCode(26, () => 0.5);
    expect(c).toHaveLength(26);
    expect(c).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]+$/);
    // 26 * log2(31) ≈ 128.8 bits
    expect(26 * Math.log2(31)).toBeGreaterThanOrEqual(128);
  });
});
