-- Booking system v2, Phase 1: Google Meet URL storage, sync-retry flag,
-- and DB-level double-booking guard.

-- Meet URL on both the mirror and the redemption.
ALTER TABLE public.schedule_events
  ADD COLUMN IF NOT EXISTS meet_url text;

ALTER TABLE public.booking_pass_redemptions
  ADD COLUMN IF NOT EXISTS meet_url text,
  ADD COLUMN IF NOT EXISTS needs_gcal_sync boolean NOT NULL DEFAULT false;

-- Double-booking is enforced at the database, not by freeBusy or app-level checks.
-- redeem_booking_pass locks the *pass*, not the *slot*, so two different grants
-- racing the same time never contend; this exclusion constraint makes overlapping
-- booked redemptions impossible regardless of interleaving.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.booking_pass_redemptions
  DROP CONSTRAINT IF EXISTS no_overlapping_bookings;

ALTER TABLE public.booking_pass_redemptions
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (tstzrange(start_at, end_at) WITH &&)
  WHERE (status = 'booked');
