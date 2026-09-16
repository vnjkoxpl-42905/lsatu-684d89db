import { singleSessionCalendarCancellation } from "./calendarCancellation.ts";

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
