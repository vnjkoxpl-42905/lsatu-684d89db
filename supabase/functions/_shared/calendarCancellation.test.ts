import {
  missingSingleSessionCalendarCancellations,
  singleSessionCalendarCancellation,
} from "./calendarCancellation.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("recognizes an LSAT U single-session event deleted in Google Calendar", () => {
  const result = singleSessionCalendarCancellation({
    id: "ssf886257c0a034f5599ce2fa316eba4ae",
    status: "cancelled",
    extendedProperties: {
      private: { lsatu_single_session_booking_id: "f886257c-0a03-4f55-99ce-2fa316eba4ae" },
    },
  });
  assert(result?.bookingId === "f886257c-0a03-4f55-99ce-2fa316eba4ae", "booking stamp missing");
  assert(result.googleEventId === "ssf886257c0a034f5599ce2fa316eba4ae", "event id missing");
});

Deno.test("ignores active, unstamped, and malformed calendar events", () => {
  assert(singleSessionCalendarCancellation({ id: "active", status: "confirmed" }) === null, "active event matched");
  assert(singleSessionCalendarCancellation({ id: "deleted", status: "cancelled" }) === null, "unstamped event matched");
  assert(singleSessionCalendarCancellation({
    id: "deleted",
    status: "cancelled",
    extendedProperties: { private: { lsatu_single_session_booking_id: "not-a-uuid" } },
  }) === null, "malformed stamp matched");
});

Deno.test("finds booked single sessions omitted from a full-window calendar response", () => {
  const missing = missingSingleSessionCalendarCancellations([
    { id: "aa64c0ec-203a-4a29-abf1-10a5713657b1", gcal_event_id: "missing-event" },
    { id: "f886257c-0a03-4f55-99ce-2fa316eba4ae", gcal_event_id: "present-event" },
    { id: "not-a-uuid", gcal_event_id: "malformed" },
  ], new Set(["present-event"]));

  assert(missing.length === 1, "expected exactly one omitted booking event");
  assert(missing[0].bookingId === "aa64c0ec-203a-4a29-abf1-10a5713657b1", "wrong booking reconciled");
  assert(missing[0].googleEventId === "missing-event", "wrong calendar event reconciled");
});
