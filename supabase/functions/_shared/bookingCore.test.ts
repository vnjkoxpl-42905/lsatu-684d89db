import {
  BOOKING_CFG,
  deterministicGoogleEventId,
  generateSlots,
  type BookingPass,
} from "./bookingCore.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const pass: BookingPass = {
  id: "pass", status: "active", total_credits: 5, used_credits: 0,
  session_length_minutes: 70, expires_at: null, student_id: null,
  student_name: "C", student_email: null,
};

Deno.test("deterministic Google event IDs use UUID hex", () => {
  const id = deterministicGoogleEventId("01234567-89ab-cdef-0123-456789abcdef");
  assert(id === "0123456789abcdef0123456789abcdef", `unexpected id ${id}`);
  assert(/^[0-9a-v]+$/.test(id), "Google event id has invalid characters");
});

Deno.test("13:15 ranges align to the 30-minute wall-clock grid and deduplicate", () => {
  const nowMs = Date.UTC(2026, 6, 1, 12);
  const slots = generateSlots({
    pass,
    nowMs,
    hostTz: "America/Toronto",
    rangesByDow: { 1: [{ startMin: 13 * 60 + 15, endMin: 18 * 60 }, { startMin: 13 * 60 + 30, endMin: 18 * 60 }] },
    busy: [],
    daysAhead: 14,
  });
  assert(slots.length > 0, "expected slots");
  assert(new Set(slots.map((slot) => slot.start_at)).size === slots.length, "duplicate slots");
  for (const slot of slots) {
    const minute = Number(new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Toronto", minute: "2-digit", hour12: false,
    }).formatToParts(new Date(slot.start_at)).find((part) => part.type === "minute")?.value);
    assert(minute === 0 || minute === BOOKING_CFG.stepMin, `off-grid minute ${minute}`);
  }
});
