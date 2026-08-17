import { describe, expect, it } from "vitest";

import {
  buildCheckoutFingerprint,
  generateSingleSessionSlots,
  hasConflictingCalendarEvent,
  normalizeGuests,
  parseStripeSignature,
  toPublicBooking,
  validateSingleSessionCheckout,
} from "../../supabase/functions/_shared/singleSessionCore.ts";
import { verifyStripeWebhookSignature } from "../../supabase/functions/_shared/stripe.ts";

describe("single-session booking core", () => {
  it("normalizes and deduplicates guests while excluding the booker", () => {
    expect(normalizeGuests([
      " FRIEND@example.com ",
      "friend@example.com",
      "booker@example.com",
      "second@example.com",
    ], "BOOKER@example.com")).toEqual(["friend@example.com", "second@example.com"]);
  });

  it("rejects more than ten unique valid guests", () => {
    const guests = Array.from({ length: 11 }, (_, index) => `guest${index}@example.com`);
    expect(() => normalizeGuests(guests, "booker@example.com")).toThrow("too_many_guests");
  });

  it("anchors 70-minute slots at the availability-window start across DST", () => {
    const slots = generateSingleSessionSlots({
      nowMs: Date.parse("2026-03-06T15:00:00.000Z"),
      hostTz: "America/Toronto",
      rangesByDow: { 1: [{ startMin: 14 * 60, endMin: 20 * 60 }] },
      busy: [],
      businessDays: 6,
    });

    const monday = slots.filter((slot) => slot.start_at.startsWith("2026-03-09"));
    expect(monday.map((slot) => slot.start_at)).toEqual([
      "2026-03-09T18:00:00.000Z",
      "2026-03-09T19:10:00.000Z",
      "2026-03-09T20:20:00.000Z",
      "2026-03-09T21:30:00.000Z",
      "2026-03-09T22:40:00.000Z",
    ]);
  });

  it("excludes the booking's tentative event from finalization conflict checks", () => {
    const events = [
      { id: "own", status: "tentative", start: { dateTime: "2026-08-20T17:00:00Z" }, end: { dateTime: "2026-08-20T18:10:00Z" } },
    ];
    expect(hasConflictingCalendarEvent(events, "2026-08-20T17:00:00Z", "2026-08-20T18:10:00Z", "own")).toBe(false);
    expect(hasConflictingCalendarEvent([...events, {
      id: "calcom", status: "confirmed", start: { dateTime: "2026-08-20T17:30:00Z" }, end: { dateTime: "2026-08-20T18:00:00Z" },
    }], "2026-08-20T17:00:00Z", "2026-08-20T18:10:00Z", "own")).toBe(true);
  });

  it("keeps every Stripe v1 signature for official verification", () => {
    expect(parseStripeSignature("t=1720000000,v1=old,v0=legacy,v1=current")).toEqual({
      timestamp: 1720000000,
      signatures: ["old", "current"],
    });
  });

  it("accepts any matching v1 Stripe signature within five minutes", async () => {
    const raw = '{"id":"evt_test"}';
    const timestamp = 1_720_000_000;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode("whsec_test"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`)));
    const signature = [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    await expect(verifyStripeWebhookSignature(raw, `t=${timestamp},v1=wrong,v1=${signature}`, "whsec_test", timestamp * 1000)).resolves.toBe(true);
    await expect(verifyStripeWebhookSignature(raw, `t=${timestamp},v1=${signature}`, "whsec_test", (timestamp + 301) * 1000)).resolves.toBe(false);
  });

  it("builds a byte-stable Checkout fingerprint with a fixed expiry", () => {
    const input = {
      bookingId: "booking-id",
      description: "LSAT Session with Joshua — Thursday, August 20, 1:00 PM (America/Toronto)",
      email: "student@example.com",
      successUrl: "https://lsatprep.study/book/session?checkout=ok&token=secret",
      cancelUrl: "https://lsatprep.study/book/session?cancelled=1&token=secret",
      expiresAt: 1_775_000_000,
    };
    expect(JSON.stringify(buildCheckoutFingerprint(input))).toBe(JSON.stringify(buildCheckoutFingerprint(input)));
    expect(buildCheckoutFingerprint(input)).toMatchObject({
      mode: "payment",
      expires_at: 1_775_000_000,
      customer_email: "student@example.com",
      metadata: { booking_id: "booking-id", product: "single_session" },
    });
  });

  it("redacts PII and only reveals Meet on booked rows", () => {
    const base = {
      id: "booking-id", status: "checkout_open", start_at: "2026-08-20T17:00:00Z",
      end_at: "2026-08-20T18:10:00Z", meet_url: "https://meet.google.com/secret",
      email: "student@example.com", name: "Student", notes: "private", guests: ["guest@example.com"],
      stripe_checkout_session_id: "cs_test_1",
    };
    expect(toPublicBooking(base)).toEqual({
      id: "booking-id", status: "checkout_open", start_at: "2026-08-20T17:00:00Z",
      end_at: "2026-08-20T18:10:00Z", checkout_session_id: "cs_test_1", meet_url: null,
    });
    expect(toPublicBooking({ ...base, status: "booked" }).meet_url).toBe("https://meet.google.com/secret");
  });

  it("fails closed when immutable Single Session payment facts differ", () => {
    const paid = {
      mode: "payment", payment_status: "paid", amount_total: 4500, currency: "usd", livemode: false,
      metadata: { product: "single_session", booking_id: "booking-id" },
    };
    expect(validateSingleSessionCheckout(paid, false)).toEqual({ ok: true, bookingId: "booking-id" });
    expect(validateSingleSessionCheckout({ ...paid, amount_total: 4499 }, false)).toEqual({ ok: false, error: "amount_mismatch" });
    expect(validateSingleSessionCheckout({ ...paid, payment_status: "unpaid" }, false)).toEqual({ ok: false, error: "payment_not_complete" });
    expect(validateSingleSessionCheckout({ ...paid, livemode: true }, false)).toEqual({ ok: false, error: "livemode_mismatch" });
  });
});
