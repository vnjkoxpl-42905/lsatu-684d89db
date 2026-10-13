CREATE OR REPLACE FUNCTION public.booking_buffered_range(_s timestamptz, _e timestamptz)
RETURNS tstzrange
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT tstzrange(_s - interval '15 minutes', _e + interval '15 minutes', '[)');
$$;

DROP POLICY IF EXISTS "Authenticated can read schedule events" ON public.schedule_events;

CREATE POLICY "Students can read their own schedule events"
ON public.schedule_events
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.booking_pass_redemptions r
      JOIN public.booking_passes p ON p.id = r.booking_pass_id
      WHERE r.schedule_event_id = schedule_events.id
        AND p.student_id = auth.uid()
    )
  )
);