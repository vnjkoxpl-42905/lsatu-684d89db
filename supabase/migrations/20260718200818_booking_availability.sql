-- Weekly booking availability for the host (Joshua). Multiple ranges per day.
-- The student-booking `slots` action reads these windows instead of a hardcoded
-- 9am-8pm, and still excludes anything already on the host's Google Calendar.
--
-- Times are stored as local wall-clock `time` values interpreted in the host's
-- timezone (booking_availability_tz). Day of week: 0=Sunday .. 6=Saturday.

CREATE TABLE IF NOT EXISTS public.booking_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS booking_availability_dow ON public.booking_availability(day_of_week);

-- Host timezone (single-row config). Used to interpret the wall-clock times above.
CREATE TABLE IF NOT EXISTS public.booking_availability_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  timezone text NOT NULL DEFAULT 'America/Toronto',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.booking_availability_config (id, timezone)
  VALUES (1, 'America/Toronto')
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.booking_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_availability_config ENABLE ROW LEVEL SECURITY;

-- Admins manage; students never read these directly (slots come via the edge fn).
CREATE POLICY "Admins manage availability"
  ON public.booking_availability FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage availability config"
  ON public.booking_availability_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_availability TO authenticated;
GRANT ALL ON public.booking_availability TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_availability_config TO authenticated;
GRANT ALL ON public.booking_availability_config TO service_role;

-- Seed the default weekly hours (from Joshua's screenshot). Sunday = unavailable
-- (no row). Only seeds if the table is currently empty, so re-running is safe and
-- won't clobber edits.
INSERT INTO public.booking_availability (day_of_week, start_time, end_time)
SELECT * FROM (VALUES
  (1, TIME '14:00', TIME '20:00'),  -- Monday    2:00pm - 8:00pm
  (2, TIME '13:00', TIME '19:30'),  -- Tuesday   1:00pm - 7:30pm
  (3, TIME '13:00', TIME '19:00'),  -- Wednesday 1:00pm - 7:00pm
  (4, TIME '13:00', TIME '19:30'),  -- Thursday  1:00pm - 7:30pm
  (5, TIME '13:00', TIME '18:30'),  -- Friday    1:00pm - 6:30pm
  (6, TIME '14:00', TIME '17:00')   -- Saturday  2:00pm - 5:00pm
) AS v(day_of_week, start_time, end_time)
WHERE NOT EXISTS (SELECT 1 FROM public.booking_availability);

-- ---------------------------------------------------------------------------
-- get_booking_availability(): returns { timezone, ranges: [{day_of_week,start,end}] }
-- Service-role only (called by the student-booking + admin edge fns).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_booking_availability()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tz text;
  _result jsonb;
BEGIN
  SELECT timezone INTO _tz FROM public.booking_availability_config WHERE id = 1;
  _result := jsonb_build_object(
    'timezone', COALESCE(_tz, 'America/Toronto'),
    'ranges', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.day_of_week, r.start_time)
      FROM (
        SELECT day_of_week,
               to_char(start_time, 'HH24:MI') AS start_time,
               to_char(end_time,   'HH24:MI') AS end_time
        FROM public.booking_availability
      ) r
    ), '[]'::jsonb)
  );
  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_booking_availability() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_availability() TO service_role;

-- ---------------------------------------------------------------------------
-- set_booking_availability(_timezone text, _ranges jsonb):
-- Replaces ALL ranges atomically with the provided set. _ranges is an array of
-- {day_of_week:int, start_time:'HH:MM', end_time:'HH:MM'}. Service-role only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_booking_availability(_timezone text, _ranges jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _timezone IS NOT NULL AND length(_timezone) > 0 THEN
    UPDATE public.booking_availability_config
       SET timezone = _timezone, updated_at = now()
     WHERE id = 1;
  END IF;

  DELETE FROM public.booking_availability;

  INSERT INTO public.booking_availability (day_of_week, start_time, end_time)
  SELECT (e->>'day_of_week')::int,
         (e->>'start_time')::time,
         (e->>'end_time')::time
  FROM jsonb_array_elements(COALESCE(_ranges, '[]'::jsonb)) AS e
  WHERE (e->>'end_time')::time > (e->>'start_time')::time;

  RETURN public.get_booking_availability();
END;
$$;

REVOKE ALL ON FUNCTION public.set_booking_availability(text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_booking_availability(text, jsonb) TO service_role;
