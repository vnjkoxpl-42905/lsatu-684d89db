import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("booking confirmation backend contracts", () => {
  const migrationPath = "supabase/migrations/20260915170000_booking_confirmation_details.sql";

  it("protects enriched status with the booking capability and supports free bookings", () => {
    const sql = read(migrationPath);
    expect(sql).toContain("b.booking_token_hash = _booking_token_hash");
    expect(sql).toContain("_booking_id IS NOT NULL AND b.id = _booking_id");
    expect(sql).toContain("'attendee_name'");
    expect(sql).toContain("'calendar_url'");
    expect(sql).toContain("'calendar_ready'");
    expect(sql).toContain("'calendar_pending'");
  });

  it("persists the timezone and immutable event-specific quote at claim time", () => {
    const sql = read(migrationPath);
    const endpoint = read("supabase/functions/single-session/index.ts");
    expect(sql).toContain("booker_timezone");
    expect(sql).toContain("quoted_amount_cents");
    expect(sql).toContain("public.booking_price_cents(_booking.event_slug, _booking.email)");
    expect(sql).toContain("booker_timezone = COALESCE(b.booker_timezone, _timezone)");
    expect(sql).not.toMatch(/ALTER COLUMN booker_timezone SET DEFAULT/i);
    expect(endpoint).toMatch(/_booker_timezone:\s*String\(body\.timezone/);
    expect(endpoint).toContain("amountCents");
  });

  it("validates Stripe against the immutable quote with a legacy event fallback", () => {
    const webhook = read("supabase/functions/booking-commerce-webhook/index.ts");
    expect(webhook).toMatch(/email,quoted_amount_cents,quoted_currency/);
    expect(webhook).toMatch(/Number\.isInteger\(booking\.quoted_amount_cents\)/);
    expect(webhook).toMatch(/rpc\(\s*["']booking_price_cents["']/);
    expect(webhook).toMatch(/booking\.quoted_currency\s*\|\|\s*bookingEvent\.currency/);
    expect(webhook).toMatch(/validateSingleSessionCheckout\([\s\S]*expectedAmount,[\s\S]*expectedCurrency/);
  });

  it("keeps single-session payments out of the unrelated package-offer foreign key", () => {
    const sql = read("supabase/migrations/20260915191000_fix_single_session_commerce_offer_reference.sql");
    expect(sql.match(/'single_session_paid', NULL/g)).toHaveLength(2);
    expect(sql).not.toMatch(/'single_session_paid', _booking\.event_slug/);
    expect(sql).toContain("single_session_booking_id");
  });

  it("requires both Google destinations and immediately drains unblocked email work", () => {
    const worker = read("supabase/functions/single-session-outbox/index.ts");
    expect(worker).toMatch(/if\s*\(\s*!meetUrl\s*\|\|\s*!event\.htmlLink\s*\)/);
    expect(worker).toMatch(/throw new Error\(\s*["']calendar_url_pending["']\s*\)/);
    expect(worker).toMatch(/for\s*\(\s*let pass = 0;\s*pass < 2;\s*pass\+\+\s*\)/);
    expect(worker).toMatch(/amount:\s*Number\(booking\.amount_cents\)/);
  });

  it("immediately drains cancellation side effects instead of waiting for the scheduler", () => {
    const endpoint = read("supabase/functions/single-session/index.ts");
    const cancelBranch = endpoint.match(
      /if \(action === "cancel"\) \{([\s\S]*?)return json\(toPublicBooking\(data\)\);\s*\}/,
    )?.[1];

    expect(cancelBranch).toBeDefined();
    expect(cancelBranch).toContain("await kickOutboxWorker();");
    expect(cancelBranch).toMatch(/slotsCache\.delete\([\s\S]*event_slug/);
  });
});
