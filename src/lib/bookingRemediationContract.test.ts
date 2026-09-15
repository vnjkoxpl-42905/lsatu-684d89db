import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("booking remediation contracts", () => {
  it("Phase 2 cancellation is atomic and always queues calendar deletion", () => {
    const sql = read("supabase/migrations/20260720160000_booking_phase2_atomic_admin.sql");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.cancel_booking_redemption");
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("credit_refunded = credit_refunded OR _did_refund");
    expect(sql).toContain("calendar_action = 'delete'");
    expect(sql).toContain("google_event_id = _redemption.google_event_id");
  });

  it("Phase 3 uses leases, deterministic event IDs, and never creates after a swallowed search error", () => {
    const sql = read("supabase/migrations/20260720170000_booking_phase3_calendar_recovery.sql");
    const reconcile = read("supabase/functions/gcal-reconcile/index.ts");
    const core = read("supabase/functions/_shared/bookingCore.ts");
    expect(sql).toContain("FOR UPDATE SKIP LOCKED");
    expect(sql).toContain("google_event_deleted_requires_adjudication");
    expect(reconcile).toContain("privateExtendedProperty: `lsatu_redemption_id=${row.id}`");
    expect(reconcile).toContain("id: deterministicGoogleEventId(row.id)");
    expect(reconcile).not.toContain("catch (_) { /* fall through to create */ }");
    expect(core).toContain("loadBusyIntervals");
    expect(core).toContain("availability_check_failed");
  });

  it("Phase 4 gives each staged upload a stable identity and cleanup path", () => {
    const sql = read("supabase/migrations/20260720180000_booking_phase4_upload_idempotency.sql");
    const edge = read("supabase/functions/booking-upload/index.ts");
    expect(sql).toContain("client_upload_id text");
    expect(sql).toContain("external_work_uploads_booking_client_id");
    expect(sql).toContain("enforce_booking_upload_limit");
    expect(edge).toContain("client_upload_ids");
    expect(edge).toContain("file_type_not_allowed");
    expect(edge).toContain("cleanup_claimed_at: null");
    expect(edge).toContain("action === \"discard\"");
  });

  it("Phase 5 keeps history independent and suppresses public overlays", () => {
    const sql = read("supabase/migrations/20260720190000_booking_phase5_student_state.sql");
    const app = read("src/App.tsx");
    const card = read("src/components/booking/CalendlyBookingCard.tsx");
    expect(sql).toContain("WHEN 'paused' THEN 1 WHEN 'exhausted' THEN 2");
    expect(sql).toContain("overlapping_availability_ranges");
    // The public booking route must stay free of the global floating overlays.
    // They are suppressed by prefix list rather than a single inline check, so
    // assert the list exists and still carries "/book/".
    expect(app).toContain("OVERLAY_FREE_PREFIXES");
    expect(app).toMatch(/OVERLAY_FREE_PREFIXES[^\n]*=[^\n]*"\/book\/"/);
    expect(app).toMatch(/OVERLAY_FREE_PREFIXES\.some\(/);
    expect(card).toContain("aria-label={d.toLocaleDateString");
    expect(card).toContain("UpcomingSessions bookings");
  });

  it("keeps the booking calendar responsive to its container, not the viewport", () => {
    const card = read("src/components/booking/CalendlyBookingCard.tsx");
    expect(card).toContain("@container");
    expect(card).toContain("@[54rem]:grid-cols-[280px_minmax(0,1fr)]");
    expect(card).toContain("@2xl:grid-cols-[minmax(0,1fr)_240px]");
    expect(card).toContain("min-w-0");
    expect(card).not.toContain("sm:grid-cols-[1fr_240px]");
  });

  it("Phase 6 exposes an identifier-only health summary", () => {
    const sql = read("supabase/migrations/20260720200000_booking_phase6_health.sql");
    const admin = read("supabase/functions/booking-pass-admin/index.ts");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.get_booking_health");
    expect(sql).toContain("pending_calendar_actions");
    expect(sql).not.toContain("booking_slug");
    expect(sql).not.toContain("student_note");
    expect(admin).toContain('action === "get_booking_health"');
  });

  it("native Single Session retries bypass only their own occupancy and recover the original token", () => {
    const endpoint = read("supabase/functions/single-session/index.ts");
    expect(endpoint).toContain("if (!existingReplay)");
    expect(endpoint).toContain("bookingTokenFromUrl(replayFingerprint.success_url)");
    expect(endpoint.indexOf("if (!existingReplay)")).toBeLessThan(endpoint.indexOf('supabase.rpc("claim_single_session_slot"'));
  });

  it("evicts cached availability whenever a live Single Session hold finds a conflict", () => {
    const endpoint = read("supabase/functions/single-session/index.ts");
    expect(endpoint).toContain("function slotUnavailable(eventSlug: string)");
    expect(endpoint).toContain("slotsCache.delete(eventSlug)");
    expect(endpoint).toContain("return slotUnavailable(event.slug)");
  });
});
