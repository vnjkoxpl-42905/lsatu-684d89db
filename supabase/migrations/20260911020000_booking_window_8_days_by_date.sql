-- The Booking Window is 8 days on every link, counted in host-local calendar
-- dates: today plus 8, through the end of that day. Joshua set the number on
-- 2026-09-11 (Cal.com's session-link runs 45; he wants students booking close
-- in). The pass RPC used to count 8 x 24 hours from "now", which dropped the
-- last day's evening slots that the single-session page still offered.
UPDATE public.booking_availability_config SET window_days = 8, updated_at = now() WHERE id = 1;
UPDATE public.booking_event_types SET window_calendar_days = 8, updated_at = now()
WHERE slug IN ('single-session', 'consultation');

CREATE OR REPLACE FUNCTION public.is_slot_bookable(_start_at timestamptz, _len integer)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _cfg        public.booking_availability_config%ROWTYPE;
  _tz         text;
  _buffer     integer;
  _pitch      integer;
  _local      timestamp;
  _local_date date;
  _local_time time;
  _today      date;
  _r          record;
BEGIN
  SELECT * INTO _cfg FROM public.booking_availability_config WHERE id = 1;
  _tz     := COALESCE(_cfg.timezone, 'America/Toronto');
  _buffer := COALESCE(_cfg.buffer_minutes, 10);
  _pitch  := _len + _buffer;

  IF _start_at IS NULL OR _len IS NULL OR _len <= 0 THEN RETURN false; END IF;
  IF EXTRACT(SECOND FROM _start_at)::int <> 0 THEN RETURN false; END IF;
  IF _start_at < now() + make_interval(mins => COALESCE(_cfg.minimum_notice_minutes, 1440)) THEN
    RETURN false;
  END IF;

  _local      := _start_at AT TIME ZONE _tz;
  _local_date := _local::date;
  _local_time := _local::time;
  _today      := (now() AT TIME ZONE _tz)::date;

  -- Window in calendar dates, the same count the single-session page and
  -- Cal.com use: today + window_days is the last bookable date.
  IF _local_date > _today + COALESCE(_cfg.window_days, 8) THEN
    RETURN false;
  END IF;

  FOR _r IN SELECT * FROM public.booking_ranges_for_date(_local_date) LOOP
    IF _local_time >= _r.start_time
       AND _local_time + make_interval(mins => _len) <= _r.end_time
       AND mod(floor(extract(epoch FROM (_local_time - _r.start_time)) / 60)::integer, _pitch) = 0
    THEN
      RETURN true;
    END IF;
  END LOOP;
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$function$;
