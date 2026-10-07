export type SingleSessionCalendarCancellation = {
  bookingId: string;
  googleEventId: string;
};

type SingleSessionCalendarBooking = {
  id?: unknown;
  gcal_event_id?: unknown;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// A cancelled Google event is authoritative for native single-session
// occupancy only when it carries the private booking stamp written by LSAT U.
// Unstamped calendar events and package-session stamps follow their own paths.
export function singleSessionCalendarCancellation(
  event: Record<string, any>,
): SingleSessionCalendarCancellation | null {
  if (event?.status !== "cancelled" || typeof event?.id !== "string" || !event.id) return null;
  const bookingId = event?.extendedProperties?.private?.lsatu_single_session_booking_id;
  if (typeof bookingId !== "string" || !UUID_PATTERN.test(bookingId)) return null;
  return { bookingId, googleEventId: event.id };
}

// A full-window Google Calendar list omits deleted events instead of returning
// them with status=cancelled. Compare booked native sessions inside that same
// window with the complete set of event ids Google did return so those omitted
// deletions still release their booking rows.
export function missingSingleSessionCalendarCancellations(
  bookings: SingleSessionCalendarBooking[],
  seenEventIds: ReadonlySet<string>,
): SingleSessionCalendarCancellation[] {
  const cancellations: SingleSessionCalendarCancellation[] = [];
  for (const booking of bookings) {
    const bookingId = booking.id;
    const googleEventId = booking.gcal_event_id;
    if (
      typeof bookingId !== "string" || !UUID_PATTERN.test(bookingId) ||
      typeof googleEventId !== "string" || !googleEventId ||
      seenEventIds.has(googleEventId)
    ) continue;
    cancellations.push({ bookingId, googleEventId });
  }
  return cancellations;
}
