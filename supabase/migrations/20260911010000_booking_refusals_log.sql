-- Record every refused booking attempt with the slot and the reason.
--
-- On 2026-09-10 a student's five refused attempts left no trace of which
-- times she picked; the rate-limit table counts attempts per minute and
-- nothing else. This table answers "what did she try?" the next time.
CREATE TABLE IF NOT EXISTS public.booking_refusals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_pass_id uuid,
  surface text NOT NULL,          -- 'public-booking' | 'student-booking'
  start_at timestamptz,
  reason text NOT NULL,           -- slot_conflict, slot_unavailable, ...
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS booking_refusals_pass_created
  ON public.booking_refusals (booking_pass_id, created_at DESC);
ALTER TABLE public.booking_refusals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read booking refusals" ON public.booking_refusals;
CREATE POLICY "Admins read booking refusals" ON public.booking_refusals
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
