import { generateSlots, type BookingHours, type SlotPolicy } from "./bookingCore.ts";

export const SINGLE_SESSION = {
  durationMinutes: 70,
  pitchMinutes: 70,
  leadMinutes: 1440,
  businessDays: 6,
  amountCents: 4500,
  currency: "usd",
  checkoutMinutes: 35,
  tokenLifetimeHours: 24,
  hostTimezone: "America/Toronto",
} as const;

export type SingleSessionSlot = { start_at: string; end_at: string };

/**
 * One row of booking_event_types, as the edge function sees it. The constants in
 * SINGLE_SESSION are now only the fallback for a caller that has not loaded one.
 */
export type BookingEventConfig = {
  slug: string;
  label: string;
  lengthMinutes: number;
  /** Null means slots start every lengthMinutes, which is what Cal.com does. */
  slotIntervalMinutes: number | null;
  minimumNoticeMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  windowBusinessDays: number;
  /** Cal.com "calendarDays" window. When set it wins over windowBusinessDays. */
  windowCalendarDays: number | null;
  priceCents: number;
  currency: string;
  requiresPayment: boolean;
  /** A one-off link: sellable exactly once, then spent. */
  singleUse: boolean;
  /**
   * The one instant this link sells, as an ISO string. When set, the link
   * offers only this time and the notice/window/weekly-hours rules do not
   * apply -- the time was chosen by hand. Null for an ordinary event.
   */
  pinnedStartAt: string | null;
};

export const SINGLE_SESSION_EVENT: BookingEventConfig = {
  slug: "single-session",
  label: "LSAT Session",
  lengthMinutes: SINGLE_SESSION.durationMinutes,
  slotIntervalMinutes: null,
  minimumNoticeMinutes: SINGLE_SESSION.leadMinutes,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  windowBusinessDays: SINGLE_SESSION.businessDays,
  windowCalendarDays: null,
  priceCents: SINGLE_SESSION.amountCents,
  currency: SINGLE_SESSION.currency,
  requiresPayment: true,
  singleUse: false,
  pinnedStartAt: null,
};

/** Maps a booking_event_types row onto the shape the slot generator wants. */
export function toEventConfig(row: Record<string, unknown>): BookingEventConfig {
  return {
    slug: String(row.slug),
    label: String(row.label ?? ""),
    lengthMinutes: Number(row.length_minutes),
    slotIntervalMinutes: row.slot_interval_minutes == null ? null : Number(row.slot_interval_minutes),
    minimumNoticeMinutes: Number(row.minimum_notice_minutes),
    bufferBeforeMinutes: Number(row.buffer_before_minutes ?? 0),
    bufferAfterMinutes: Number(row.buffer_after_minutes ?? 0),
    windowBusinessDays: Number(row.window_business_days),
    windowCalendarDays: row.window_calendar_days == null ? null : Number(row.window_calendar_days),
    priceCents: Number(row.price_cents ?? 0),
    currency: String(row.currency ?? "usd"),
    requiresPayment: row.requires_payment !== false,
    singleUse: row.single_use === true,
    pinnedStartAt: row.pinned_start_at ? new Date(String(row.pinned_start_at)).toISOString() : null,
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown): string {
  const email = String(value ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) throw new Error("invalid_email");
  return email;
}

export function normalizeGuests(values: unknown, bookerEmail: string): string[] {
  if (!Array.isArray(values)) return [];
  const booker = normalizeEmail(bookerEmail);
  const unique = new Set<string>();
  for (const value of values) {
    const email = normalizeEmail(value);
    if (email !== booker) unique.add(email);
  }
  if (unique.size > 10) throw new Error("too_many_guests");
  return [...unique];
}

function tzOffsetMinutesAt(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, number> = {};
  for (const part of dtf.formatToParts(at)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return Math.round((Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - at.getTime()) / 60_000);
}

export function hostLocalToUtc(timeZone: string, year: number, month: number, day: number, minutes: number): Date {
  const wallClockAsUtc = Date.UTC(year, month, day, Math.floor(minutes / 60), minutes % 60);
  let guess = new Date(wallClockAsUtc - tzOffsetMinutesAt(timeZone, new Date(wallClockAsUtc)) * 60_000);
  guess = new Date(wallClockAsUtc - tzOffsetMinutesAt(timeZone, guess) * 60_000);
  return guess;
}

function hostDateParts(timeZone: string, at: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts: Record<string, string> = {};
  for (const part of dtf.formatToParts(at)) parts[part.type] = part.value;
  const weekday: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { year: Number(parts.year), month: Number(parts.month) - 1, day: Number(parts.day), dow: weekday[parts.weekday] };
}

// Mirror of single_session_booking_window_end(): the last host-local date the
// window reaches. Calendar days when the event says so (Cal.com "calendarDays",
// rolling), else the business-day count, counting today when it is a weekday.
export function singleSessionWindowEndDate(nowMs: number, hostTz: string, event: BookingEventConfig, businessDays?: number) {
  const today = hostDateParts(hostTz, new Date(nowMs));
  if (event.windowCalendarDays != null) {
    const d = new Date(Date.UTC(today.year, today.month, today.day + event.windowCalendarDays));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() };
  }
  const target = businessDays ?? event.windowBusinessDays;
  let seen = 0;
  let offset = 0;
  for (;;) {
    const d = new Date(Date.UTC(today.year, today.month, today.day + offset));
    const dow = d.getUTCDay();
    if (dow >= 1 && dow <= 5) seen++;
    if (seen >= target) return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() };
    offset++;
  }
}

export function generateSingleSessionSlots(opts: {
  nowMs: number;
  hostTz: string;
  rangesByDow: Record<number, { startMin: number; endMin: number }[]>;
  overridesByDate?: Record<string, { startMin: number; endMin: number }[]>;
  busy: { start: number; end: number }[];
  businessDays?: number;
  /** Defaults to the single session, so existing callers are unaffected. */
  event?: BookingEventConfig;
}): SingleSessionSlot[] {
  const event = opts.event ?? SINGLE_SESSION_EVENT;
  const length = event.lengthMinutes;

  // A pinned link offers the one time it was minted with and nothing else. The
  // weekly hours, the rolling window and the notice all exist to decide whether
  // a time is one Joshua would agree to; pinning IS that decision, already made.
  // A clash with something already on the calendar still removes it -- that is
  // not a policy, it is a fact about the hour.
  if (event.pinnedStartAt) {
    const start = Date.parse(event.pinnedStartAt);
    if (!Number.isFinite(start) || start <= opts.nowMs) return [];
    const end = start + length * 60_000;
    const beforePinned = event.bufferBeforeMinutes * 60_000;
    const afterPinned = event.bufferAfterMinutes * 60_000;
    if (opts.busy.some((busy) => busy.start < end + afterPinned && busy.end > start - beforePinned)) return [];
    return [{ start_at: new Date(start).toISOString(), end_at: new Date(end).toISOString() }];
  }

  // The window reaches to the END of its last date, matching the SQL check
  // `_local_date > window_end`.
  const last = singleSessionWindowEndDate(opts.nowMs, opts.hostTz, event, opts.businessDays);
  const windowEndMs = hostLocalToUtc(opts.hostTz, last.year, last.month, last.day, 24 * 60).getTime();
  const policy: SlotPolicy = {
    lengthMin: length,
    // No explicit interval means slots start every length_minutes, which is
    // what Cal.com does and what produces the consultation's 1:30 / 2:00 chain.
    pitchMin: event.slotIntervalMinutes ?? length,
    bufferBeforeMin: event.bufferBeforeMinutes,
    bufferAfterMin: event.bufferAfterMinutes,
    leadMin: event.minimumNoticeMinutes,
    windowEndMs,
  };
  const hours: BookingHours = { hostTz: opts.hostTz, rangesByDow: opts.rangesByDow, overridesByDate: opts.overridesByDate ?? {} };
  return generateSlots({ policy, hours, nowMs: opts.nowMs, busy: opts.busy });
}

function eventBounds(event: any): { start: number; end: number } | null {
  const start = Date.parse(event?.start?.dateTime ?? event?.start?.date ?? "");
  const end = Date.parse(event?.end?.dateTime ?? event?.end?.date ?? "");
  return Number.isFinite(start) && Number.isFinite(end) ? { start, end } : null;
}

export function hasConflictingCalendarEvent(
  events: any[],
  startAt: string,
  endAt: string,
  ownEventId?: string | null,
  ownBookingId?: string | null,
): boolean {
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  return events.some((event) => {
    const eventBookingId = event?.extendedProperties?.private?.lsatu_single_session_booking_id;
    if (
      !event ||
      event.status === "cancelled" ||
      event.transparency === "transparent" ||
      event.id === ownEventId ||
      (ownBookingId && eventBookingId === ownBookingId)
    ) return false;
    const bounds = eventBounds(event);
    return !!bounds && bounds.start < end && bounds.end > start;
  });
}

/**
 * PostgREST serializes functions returning a named row type as a one-row array.
 * Keep callers from accidentally treating that array as the returned record.
 */
export function unwrapRpcRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function parseStripeSignature(header: string | null): { timestamp: number; signatures: string[] } | null {
  if (!header) return null;
  let timestamp = NaN;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const splitAt = part.indexOf("=");
    if (splitAt < 1) continue;
    const key = part.slice(0, splitAt).trim();
    const value = part.slice(splitAt + 1).trim();
    if (key === "t") timestamp = Number(value);
    if (key === "v1" && value) signatures.push(value);
  }
  return Number.isFinite(timestamp) && signatures.length ? { timestamp, signatures } : null;
}

export type CheckoutFingerprintInput = {
  bookingId: string;
  description: string;
  email: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  expiresAt: number;
};

export function buildCheckoutFingerprint(input: CheckoutFingerprintInput) {
  return {
    mode: "payment" as const,
    payment_method_types: ["card"],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: input.currency,
        unit_amount: input.amountCents,
        product_data: { name: input.description },
      },
    }],
    customer_email: normalizeEmail(input.email),
    metadata: { booking_id: input.bookingId, product: "single_session" },
    payment_intent_data: { metadata: { booking_id: input.bookingId, product: "single_session" } },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    expires_at: input.expiresAt,
  };
}

export function toPublicBooking(row: any) {
  return {
    id: String(row.id),
    status: String(row.status),
    start_at: row.start_at,
    end_at: row.end_at,
    checkout_session_id: row.stripe_checkout_session_id ?? null,
    meet_url: row.status === "booked" ? row.meet_url ?? null : null,
  };
}

export type CheckoutValidation =
  | { ok: true; bookingId: string }
  | { ok: false; error: string };

export function validateSingleSessionCheckout(
  session: any,
  expectedLivemode: boolean,
  expectedAmountCents: number = SINGLE_SESSION.amountCents,
  expectedCurrency: string = SINGLE_SESSION.currency,
): CheckoutValidation {
  if (session?.metadata?.product !== "single_session" || !session?.metadata?.booking_id) {
    return { ok: false, error: "invalid_product" };
  }
  if (session.mode !== "payment") return { ok: false, error: "invalid_mode" };
  if (session.payment_status !== "paid") return { ok: false, error: "payment_not_complete" };
  if (session.amount_total !== expectedAmountCents) return { ok: false, error: "amount_mismatch" };
  if (String(session.currency || "").toLowerCase() !== expectedCurrency.toLowerCase()) return { ok: false, error: "currency_mismatch" };
  if (Boolean(session.livemode) !== expectedLivemode) return { ok: false, error: "livemode_mismatch" };
  return { ok: true, bookingId: String(session.metadata.booking_id) };
}

export function deterministicSingleSessionEventId(bookingId: string): string {
  return `ss${bookingId.replace(/-/g, "").toLowerCase()}`;
}
