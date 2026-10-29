-- Booking-time student uploads + comment.
-- Students can attach work (any file, up to 5) and a comment on the /book/<slug>
-- confirm form. Files reuse the EXISTING external_work_uploads table + the
-- external-work-uploads storage bucket (see 20260506000200 / 20260506000700).
-- The comment lives on the redemption because a student may leave a note with
-- zero files.
--
-- Anonymous public booking has no auth.uid(): the booking-upload edge function
-- writes with the service role (RLS bypassed), so student_id / uploaded_by can
-- be NULL for name/email-only passes. The table was empty at migration time
-- (verified from the 2026-07-19 pg_dump), so relaxing NOT NULL is data-safe.

-- 1) Relax identity columns — anonymous submissions have no user id.
ALTER TABLE public.external_work_uploads ALTER COLUMN student_id  DROP NOT NULL;
ALTER TABLE public.external_work_uploads ALTER COLUMN uploaded_by DROP NOT NULL;

-- 2) Link uploads to the booking.
--    booking_idempotency_key ties files staged BEFORE the redemption exists;
--    redemption_id is backfilled by bookSession once the booking is created.
ALTER TABLE public.external_work_uploads
  ADD COLUMN IF NOT EXISTS booking_pass_id         uuid REFERENCES public.booking_passes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS redemption_id           uuid REFERENCES public.booking_pass_redemptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_idempotency_key text;

CREATE INDEX IF NOT EXISTS external_work_uploads_booking_stage
  ON public.external_work_uploads(booking_pass_id, booking_idempotency_key);
CREATE INDEX IF NOT EXISTS external_work_uploads_redemption
  ON public.external_work_uploads(redemption_id);

-- 3) The student's comment/updates for that booking.
ALTER TABLE public.booking_pass_redemptions
  ADD COLUMN IF NOT EXISTS student_note text;
