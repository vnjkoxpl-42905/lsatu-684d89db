ALTER TABLE public.schedule_events
  ADD COLUMN IF NOT EXISTS meet_url text;

ALTER TABLE public.booking_pass_redemptions
  ADD COLUMN IF NOT EXISTS meet_url text,
  ADD COLUMN IF NOT EXISTS needs_gcal_sync boolean NOT NULL DEFAULT false;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.booking_pass_redemptions
  DROP CONSTRAINT IF EXISTS no_overlapping_bookings;

ALTER TABLE public.booking_pass_redemptions
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (tstzrange(start_at, end_at) WITH &&)
  WHERE (status = 'booked');