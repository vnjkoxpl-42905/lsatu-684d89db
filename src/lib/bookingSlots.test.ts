import { describe, it, expect } from "vitest";
import {
  BOOKING_CFG, durationLabel, generateSlots, genCode, sanitizeFirstName, hostLocalToUtc,
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

describe("generateSlots", () => {
  const base = { sessionMin: 70, nowMs: NOW, hostTz: EASTERN, rangesByDow: RANGES, busy: [], daysAhead: 21 };

  it("only emits slots on :00 / :30 boundaries in host tz", () => {
    const slots = generateSlots(base);
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) {
      // reconstruct minute-of-hour in host tz
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: EASTERN, minute: "2-digit", hour12: false }).formatToParts(new Date(s.start_at));
      const min = Number(parts.find((p) => p.type === "minute")?.value);
      expect([0, 30]).toContain(min);
    }
  });

  it("aligns a 13:15 availability start to the 13:30 grid", () => {
    const slots = generateSlots({
      ...base,
      rangesByDow: { 1: [{ startMin: 13 * 60 + 15, endMin: 18 * 60 }] },
    });
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: EASTERN, minute: "2-digit", hour12: false })
        .formatToParts(new Date(slot.start_at));
      expect([0, 30]).toContain(Number(parts.find((part) => part.type === "minute")?.value));
    }
  });

  it("deduplicates slots from overlapping ranges defensively", () => {
    const slots = generateSlots({
      ...base,
      rangesByDow: { 1: [{ startMin: 13 * 60, endMin: 18 * 60 }, { startMin: 14 * 60, endMin: 19 * 60 }] },
    });
    expect(new Set(slots.map((slot) => slot.start_at)).size).toBe(slots.length);
  });

  it("never emits a slot less than 24h from now", () => {
    const slots = generateSlots(base);
    const minStart = Math.min(...slots.map((s) => new Date(s.start_at).getTime()));
    expect(minStart).toBeGreaterThanOrEqual(NOW + BOOKING_CFG.leadMin * 60_000);
  });

  it("keeps the full 70-min session inside the availability window", () => {
    const slots = generateSlots(base);
    // Every slot's end must be <= the day's window end; the last Sat slot must
    // start no later than 15:50 (so 70 min ends by 17:00).
    const satSlots = slots.filter((s) => {
      const p = new Intl.DateTimeFormat("en-US", { timeZone: EASTERN, weekday: "short" }).formatToParts(new Date(s.start_at));
      return p.find((x) => x.type === "weekday")?.value === "Sat";
    });
    expect(satSlots.length).toBeGreaterThan(0);
    for (const s of satSlots) {
      const startParts = new Intl.DateTimeFormat("en-US", { timeZone: EASTERN, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(s.start_at));
      const h = Number(startParts.find((x) => x.type === "hour")?.value);
      const m = Number(startParts.find((x) => x.type === "minute")?.value);
      expect(h * 60 + m).toBeLessThanOrEqual(15 * 60 + 50); // last valid start for 70min ending 17:00
    }
  });

  it("excludes slots that collide with a busy block (plus 15-min buffer)", () => {
    // Put a busy block on the first Monday 3:00-4:00pm Eastern.
    // Find that Monday relative to NOW.
    const busyStart = hostLocalToUtc(EASTERN, 2026, 6, 6, 15 * 60).getTime(); // Mon Jul 6 2026 15:00 ET
    const busyEnd = busyStart + 60 * 60_000;
    const withBusy = generateSlots({ ...base, busy: [{ start: busyStart, end: busyEnd }] });
    // No slot may overlap [busyStart-15m, busyEnd+15m] with its 70-min span.
    const bufMs = BOOKING_CFG.bufferMin * 60_000;
    for (const s of withBusy) {
      const st = new Date(s.start_at).getTime();
      const en = new Date(s.end_at).getTime();
      const overlaps = busyStart - bufMs < en && busyEnd + bufMs > st;
      expect(overlaps).toBe(false);
    }
  });

  it("respects pass expiry as a hard ceiling", () => {
    const expiresAtMs = NOW + 3 * 86_400_000; // 3 days out
    const slots = generateSlots({ ...base, expiresAtMs });
    const maxEnd = Math.max(...slots.map((s) => new Date(s.end_at).getTime()));
    expect(maxEnd).toBeLessThanOrEqual(expiresAtMs);
  });

  it("produces no slots on Sunday (no seeded window)", () => {
    const sunSlots = generateSlots(base).filter((s) => {
      const p = new Intl.DateTimeFormat("en-US", { timeZone: EASTERN, weekday: "short" }).formatToParts(new Date(s.start_at));
      return p.find((x) => x.type === "weekday")?.value === "Sun";
    });
    expect(sunSlots).toHaveLength(0);
  });
});

describe("DST correctness", () => {
  it("US spring-forward (Mar 8 2026) still yields correctly-spaced Eastern slots", () => {
    // now = Mar 1 2026; window includes the DST transition on Mar 8.
    const now = Date.UTC(2026, 2, 1, 12, 0, 0);
    const slots = generateSlots({
      sessionMin: 70, nowMs: now, hostTz: EASTERN,
      rangesByDow: { 0: [{ startMin: 14 * 60, endMin: 17 * 60 }] }, // Sundays 2-5pm to hit Mar 8
      busy: [], daysAhead: 14,
    });
    // Every Sunday slot must still read as :00/:30 in Eastern despite the offset shift.
    for (const s of slots) {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: EASTERN, minute: "2-digit", hour12: false }).formatToParts(new Date(s.start_at));
      expect([0, 30]).toContain(Number(parts.find((p) => p.type === "minute")?.value));
    }
  });

  it("US fall-back still yields one unique wall-clock grid", () => {
    const now = Date.UTC(2026, 9, 25, 12, 0, 0);
    const slots = generateSlots({
      sessionMin: 70, nowMs: now, hostTz: EASTERN,
      rangesByDow: { 0: [{ startMin: 14 * 60, endMin: 17 * 60 }] },
      busy: [], daysAhead: 14,
    });
    expect(new Set(slots.map((slot) => slot.start_at)).size).toBe(slots.length);
    for (const slot of slots) {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: EASTERN, minute: "2-digit", hour12: false })
        .formatToParts(new Date(slot.start_at));
      expect([0, 30]).toContain(Number(parts.find((part) => part.type === "minute")?.value));
    }
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
