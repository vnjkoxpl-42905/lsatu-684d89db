import {
  activeSingleSessionBusyIntervals,
  deterministicGoogleEventId,
  generateSlots,
  parseAvailability,
  passSlotPolicy,
  type BookingPass,
} from "./bookingCore.ts";
import {
  generateSingleSessionSlots,
  hasConflictingCalendarEvent,
  SINGLE_SESSION_EVENT,
  singleSessionWindowEndDate,
  unwrapRpcRow,
} from "./singleSessionCore.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const TZ = "America/Toronto";

function localMinutes(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === "hour")?.value) % 24;
  return h * 60 + Number(parts.find((p) => p.type === "minute")?.value);
}
function localDate(iso: string): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  return `${p.find((x) => x.type === "year")!.value}-${p.find((x) => x.type === "month")!.value}-${p.find((x) => x.type === "day")!.value}`;
}

const pass: BookingPass = {
  id: "pass", status: "active", total_credits: 5, used_credits: 0,
  session_length_minutes: 70, expires_at: null, student_id: null,
  student_name: "C", student_email: null,
};

// The live get_booking_availability() shape after the 2026-09-11 migration.
const AVAIL_PAYLOAD = {
  timezone: TZ,
  buffer_minutes: 10,
  minimum_notice_minutes: 1440,
  window_days: 8,
  ranges: [
    { day_of_week: 1, start_time: "14:00", end_time: "20:00" },
    { day_of_week: 2, start_time: "13:00", end_time: "19:30" },
    { day_of_week: 6, start_time: "14:00", end_time: "17:00" },
  ],
  overrides: [{ date: "2026-07-11", start_time: "20:00", end_time: "21:10" }],
};

Deno.test("deterministic Google event IDs use UUID hex", () => {
  const id = deterministicGoogleEventId("01234567-89ab-cdef-0123-456789abcdef");
  assert(id === "0123456789abcdef0123456789abcdef", `unexpected id ${id}`);
  assert(/^[0-9a-v]+$/.test(id), "Google event id has invalid characters");
});

Deno.test("parseAvailability reads the buffer, notice, window and overrides from the RPC payload", () => {
  const avail = parseAvailability(AVAIL_PAYLOAD);
  assert(avail.bufferMin === 10 && avail.leadMin === 1440 && avail.windowDays === 8, "config numbers");
  assert(avail.rangesByDow[1][0].startMin === 14 * 60, "weekly range");
  assert(avail.overridesByDate["2026-07-11"][0].endMin === 21 * 60 + 10, "override range");
  const closed = parseAvailability({ ...AVAIL_PAYLOAD, overrides: [{ date: "2026-07-11", start_time: null, end_time: null }] });
  assert(Array.isArray(closed.overridesByDate["2026-07-11"]) && closed.overridesByDate["2026-07-11"].length === 0, "closed day");
});

Deno.test("expired single-session drafts and checkouts do not block availability", () => {
  const nowMs = Date.parse("2026-09-15T23:30:00.000Z");
  const rows = [
    { status: "draft", start_at: "2026-09-16T18:10:00Z", end_at: "2026-09-16T19:20:00Z", draft_expires_at: "2026-09-15T18:05:00Z", stripe_expires_at: null },
    { status: "checkout_open", start_at: "2026-09-16T19:20:00Z", end_at: "2026-09-16T20:30:00Z", draft_expires_at: "2026-09-15T18:05:00Z", stripe_expires_at: "2026-09-15T19:00:00Z" },
    { status: "draft", start_at: "2026-09-16T20:40:00Z", end_at: "2026-09-16T21:50:00Z", draft_expires_at: "2026-09-16T00:00:00Z", stripe_expires_at: null },
    { status: "booked", start_at: "2026-09-16T21:30:00Z", end_at: "2026-09-16T22:40:00Z", draft_expires_at: "2026-09-15T18:05:00Z", stripe_expires_at: null },
  ];

  const intervals = activeSingleSessionBusyIntervals(rows, nowMs);
  assert(intervals.length === 2, `expected active draft + booked, got ${JSON.stringify(intervals)}`);
  assert(intervals.some((row) => row.start === Date.parse("2026-09-16T20:40:00Z")), "active draft missing");
  assert(intervals.some((row) => row.start === Date.parse("2026-09-16T21:30:00Z")), "booked session missing");
});

Deno.test("pass slots step length + buffer from each range start and dedupe overlapping ranges", () => {
  const nowMs = Date.UTC(2026, 6, 1, 12);
  const avail = parseAvailability({
    ...AVAIL_PAYLOAD,
    ranges: [
      { day_of_week: 1, start_time: "13:15", end_time: "18:00" },
      { day_of_week: 1, start_time: "13:15", end_time: "18:00" },
    ],
    overrides: [],
  });
  const slots = generateSlots({ policy: passSlotPolicy(pass, avail, nowMs, 14), hours: avail, nowMs, busy: [] });
  assert(slots.length > 0, "expected slots");
  assert(new Set(slots.map((slot) => slot.start_at)).size === slots.length, "duplicate slots");
  const minutes = [...new Set(slots.map((s) => localMinutes(s.start_at)))].sort((a, b) => a - b);
  // 13:15, 14:35, 15:55 (ends 17:05); 17:15 would end 18:25.
  assert(JSON.stringify(minutes) === JSON.stringify([13 * 60 + 15, 14 * 60 + 35, 15 * 60 + 55]), `grid ${minutes}`);
});

Deno.test("the slot right after a booking survives with exactly one buffer between them (Sandra's case)", () => {
  const nowMs = Date.UTC(2026, 6, 1, 12);
  const avail = parseAvailability({ ...AVAIL_PAYLOAD, overrides: [] });
  const policy = passSlotPolicy(pass, avail, nowMs, 14);
  const open = generateSlots({ policy, hours: avail, nowMs, busy: [] });
  const first = open.find((s) => localMinutes(s.start_at) === 14 * 60 && new Date(s.start_at).getUTCDay() === 1)!;
  const busy = [{ start: Date.parse(first.start_at), end: Date.parse(first.end_at) }];
  const after = generateSlots({ policy, hours: avail, nowMs, busy });
  const sameDay = after.filter((s) => localDate(s.start_at) === localDate(first.start_at)).map((s) => localMinutes(s.start_at));
  assert(sameDay.includes(15 * 60 + 20), `15:20 should be offered after a 14:00-15:10 booking, got ${sameDay}`);
  assert(!sameDay.includes(14 * 60), "the booked slot must be gone");
});

Deno.test("a date override replaces the weekly hours for that date", () => {
  const nowMs = Date.UTC(2026, 6, 1, 12);
  const avail = parseAvailability({ ...AVAIL_PAYLOAD, window_days: 21 }); // wide enough to reach Jul 11
  const slots = generateSlots({ policy: passSlotPolicy(pass, avail, nowMs, 14), hours: avail, nowMs, busy: [] });
  const jul11 = slots.filter((s) => localDate(s.start_at) === "2026-07-11").map((s) => localMinutes(s.start_at));
  assert(JSON.stringify(jul11) === JSON.stringify([20 * 60]), `override day ${jul11}`);
  const jul4 = slots.filter((s) => localDate(s.start_at) === "2026-07-04").map((s) => localMinutes(s.start_at));
  assert(JSON.stringify(jul4) === JSON.stringify([14 * 60, 15 * 60 + 20]), `weekly saturday ${jul4}`);
});

Deno.test("the window is today plus window_days in host dates, through the end of that day, and the pass expiry caps it", () => {
  const nowMs = Date.UTC(2026, 6, 1, 12); // Wed Jul 1, 08:00 ET
  const avail = parseAvailability({ ...AVAIL_PAYLOAD, overrides: [] });
  const wide = generateSlots({ policy: passSlotPolicy(pass, avail, nowMs, 90), hours: avail, nowMs, busy: [] });
  const dates = wide.map((s) => localDate(s.start_at)).sort();
  // Jul 1 + 8 = Thu Jul 9, which has no seeded hours; Tue Jul 7 is the last seeded day inside the window, Sat Jul 11 is outside.
  assert(dates.at(-1) === "2026-07-07", `last date should be Jul 7, got ${dates.at(-1)}`);
  const lastDay = wide.filter((s) => localDate(s.start_at) === "2026-07-07").map((s) => localMinutes(s.start_at));
  assert(lastDay.includes(18 * 60 + 20), `evening slot on the last day must survive, got ${lastDay}`);
  const expiring = { ...pass, expires_at: new Date(nowMs + 3 * 86_400_000).toISOString() };
  const short = generateSlots({ policy: passSlotPolicy(expiring, avail, nowMs), hours: avail, nowMs, busy: [] });
  assert(Math.max(...short.map((s) => Date.parse(s.end_at))) <= nowMs + 3 * 86_400_000, "expiry ceiling");
});

Deno.test("single session slots use the event's pitch, buffers and calendar-day window", () => {
  const nowMs = Date.UTC(2026, 6, 1, 12); // Wed
  const avail = parseAvailability({ ...AVAIL_PAYLOAD, overrides: [] });
  const event = { ...SINGLE_SESSION_EVENT, slotIntervalMinutes: 80, bufferBeforeMinutes: 10, bufferAfterMinutes: 10, windowCalendarDays: 8 };
  const slots = generateSingleSessionSlots({ nowMs, hostTz: TZ, rangesByDow: avail.rangesByDow, overridesByDate: avail.overridesByDate, busy: [], event });
  const monday = [...new Set(slots.filter((s) => new Date(s.start_at).getUTCDay() === 1).map((s) => localMinutes(s.start_at)))];
  assert(JSON.stringify(monday) === JSON.stringify([14 * 60, 15 * 60 + 20, 16 * 60 + 40, 18 * 60]), `monday ${monday}`);
  const last = singleSessionWindowEndDate(nowMs, TZ, event);
  assert(last.month === 6 && last.day === 9, `8 days from Jul 1 is Jul 9, got ${last.month + 1}/${last.day}`);
  const maxDate = slots.map((s) => localDate(s.start_at)).sort().at(-1)!;
  assert(maxDate <= "2026-07-09", `window end ${maxDate}`);
});

Deno.test("single session business-day window still counts today when it is a weekday", () => {
  const nowMs = Date.UTC(2026, 6, 6, 12); // Mon Jul 6
  const last = singleSessionWindowEndDate(nowMs, TZ, { ...SINGLE_SESSION_EVENT, windowBusinessDays: 5, windowCalendarDays: null });
  assert(last.month === 6 && last.day === 10, `Mon + 5 business days ends Fri Jul 10, got ${last.month + 1}/${last.day}`);
});

Deno.test("consultation keeps its own shape: 30-minute pitch with 30-minute buffers", () => {
  const nowMs = Date.UTC(2026, 6, 1, 12);
  const avail = parseAvailability({ ...AVAIL_PAYLOAD, overrides: [] });
  const consult = { ...SINGLE_SESSION_EVENT, slug: "consultation", lengthMinutes: 30, slotIntervalMinutes: null, bufferBeforeMinutes: 30, bufferAfterMinutes: 30, windowBusinessDays: 5, windowCalendarDays: null };
  const monday = Date.UTC(2026, 6, 6, 19); // Mon Jul 6 15:00 ET
  const busy = [{ start: monday, end: monday + 60 * 60_000 }]; // 15:00-16:00
  const slots = generateSingleSessionSlots({ nowMs, hostTz: TZ, rangesByDow: avail.rangesByDow, busy, event: consult });
  const mon = slots.filter((s) => localDate(s.start_at) === "2026-07-06").map((s) => localMinutes(s.start_at));
  // 14:00 ends 14:30, needs clear until 15:00: allowed. 14:30 ends 15:00 + 30 buffer: blocked. 16:00 needs 30 before: blocked. 16:30 ok.
  assert(mon.includes(14 * 60) && !mon.includes(14 * 60 + 30) && !mon.includes(16 * 60) && mon.includes(16 * 60 + 30), `consultation ${mon}`);
});

Deno.test("one-row PostgREST responses unwrap to the booking record", () => {
  const booking = { id: "booking-123", gcal_event_id: "event-123" };
  assert(unwrapRpcRow([booking]) === booking, "array response must unwrap");
  assert(unwrapRpcRow(booking) === booking, "object response must pass through");
  assert(unwrapRpcRow([]) === null, "empty response must be null");
});

Deno.test("a consultation does not conflict with its own stamped tentative event", () => {
  const events = [{
    id: "google-normalized-id",
    status: "tentative",
    start: { dateTime: "2026-09-24T21:40:00Z" },
    end: { dateTime: "2026-09-24T22:10:00Z" },
    extendedProperties: { private: { lsatu_single_session_booking_id: "booking-123" } },
  }];

  assert(!hasConflictingCalendarEvent(
    events,
    "2026-09-24T21:40:00Z",
    "2026-09-24T22:10:00Z",
    "stored-id",
    "booking-123",
  ), "own stamped hold must be ignored");
  assert(hasConflictingCalendarEvent(
    events,
    "2026-09-24T21:40:00Z",
    "2026-09-24T22:10:00Z",
    "stored-id",
    "different-booking",
  ), "another booking's hold must still conflict");
});
