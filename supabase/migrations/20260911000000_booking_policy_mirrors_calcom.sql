-- Booking policy mirrors Cal.com, and every check reads the same numbers.
--
-- Why. On 2026-09-10 a student (Sandra) tried five times to book from her pass
-- link and was told "That time was just taken" each time. Nothing was taken.
-- The slot list, the edge-function guard and the database RPC each decided
-- "is this slot free?" with their own arithmetic: the list and guard required a
-- 15-minute gap next to an existing booking, but redeem_booking_pass_v2 and the
-- no_overlapping_bookings constraint buffered BOTH rows, so a pass booking needed
-- 30 minutes of clearance from another pass booking. Fifteen of the 109 slots
-- she could see were offered and then refused.
--
-- What changes.
--   * One Buffer (10 min, Joshua's number, 2026-09-10) in
--     booking_availability_config, read by every SQL check through
--     booking_buffer_minutes(). Counted ONCE between any two events.
--   * One overlap predicate, booking_slot_is_clear(), used by the pass RPC and
--     all three single-session RPCs instead of four hand-copied clauses. It also
--     ignores calendar events marked free (transparent), which the slot list
--     already did and the RPC did not.
--   * The exclusion constraint buffers each row by half the Buffer, so two pass
--     bookings need exactly one Buffer between them, not two. GiST needs an
--     IMMUTABLE expression, so the half-buffer is a literal: change the Buffer
--     and this constraint must be rebuilt (see the note at the bottom).
--   * Date overrides (booking_availability_overrides), Cal.com's "date override":
--     rows for a date replace the weekly hours on that date; a row with null
--     times closes the day. Seeded with the one override Cal.com carries today.
--   * Slot pitch = session length + Buffer (80 min for the 70-min session),
--     window 8 calendar days rolling (Joshua's number; Cal.com runs 45)
--     event. is_slot_bookable() enforces the same grid the list draws.
--   * booking_event_types gains window_calendar_days; when set it wins over
--     window_business_days. The single session moves to 8 calendar days,
--     10/10 buffers and an 80-minute pitch. The consultation keeps its own
--     Cal.com-mirrored settings (30 min, 30/30, 5 business days).

-- ---------------------------------------------------------------- 1. config
INSERT INTO public.booking_availability_config (id, timezone)
VALUES (1, 'America/Toronto')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.booking_availability_config
  ADD COLUMN IF NOT EXISTS buffer_minutes integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS minimum_notice_minutes integer NOT NULL DEFAULT 1440,
  ADD COLUMN IF NOT EXISTS window_days integer NOT NULL DEFAULT 8;

ALTER TABLE public.booking_availability_config
  DROP CONSTRAINT IF EXISTS booking_availability_config_buffer_even;
ALTER TABLE public.booking_availability_config
  ADD CONSTRAINT booking_availability_config_buffer_even
  CHECK (buffer_minutes >= 0 AND buffer_minutes % 2 = 0 AND minimum_notice_minutes >= 0 AND window_days BETWEEN 1 AND 365);

UPDATE public.booking_availability_config
SET buffer_minutes = 10, minimum_notice_minutes = 1440, window_days = 8, updated_at = now()
WHERE id = 1;

CREATE OR REPLACE FUNCTION public.booking_buffer_minutes()
RETURNS integer
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT buffer_minutes FROM public.booking_availability_config WHERE id = 1), 10);
$$;

-- ---------------------------------------------------------------- 2. overrides
CREATE TABLE IF NOT EXISTS public.booking_availability_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  start_time time,
  end_time time,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_availability_overrides_times CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS booking_availability_overrides_date_start
  ON public.booking_availability_overrides (date, COALESCE(start_time, '00:00'::time));

ALTER TABLE public.booking_availability_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage availability overrides" ON public.booking_availability_overrides;
CREATE POLICY "Admins manage availability overrides" ON public.booking_availability_overrides
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- The override Cal.com carries today (Working Hours schedule 681247).
INSERT INTO public.booking_availability_overrides (date, start_time, end_time, note)
VALUES ('2026-09-19', '20:00', '21:10', 'Mirrors the Cal.com date override for Fernande')
ON CONFLICT DO NOTHING;

-- Effective hours for one host-local date: overrides replace the weekly rows.
CREATE OR REPLACE FUNCTION public.booking_ranges_for_date(_date date)
RETURNS TABLE(start_time time, end_time time)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  WITH o AS (
    SELECT start_time, end_time FROM public.booking_availability_overrides WHERE date = _date
  )
  SELECT start_time, end_time FROM o WHERE start_time IS NOT NULL
  UNION ALL
  SELECT a.start_time, a.end_time FROM public.booking_availability a
  WHERE NOT EXISTS (SELECT 1 FROM o)
    AND a.day_of_week = extract(dow FROM _date)::integer;
$$;

CREATE OR REPLACE FUNCTION public.get_booking_availability()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _cfg public.booking_availability_config%ROWTYPE;
  _result jsonb;
BEGIN
  SELECT * INTO _cfg FROM public.booking_availability_config WHERE id = 1;
  _result := jsonb_build_object(
    'timezone', COALESCE(_cfg.timezone, 'America/Toronto'),
    'buffer_minutes', COALESCE(_cfg.buffer_minutes, 10),
    'minimum_notice_minutes', COALESCE(_cfg.minimum_notice_minutes, 1440),
    'window_days', COALESCE(_cfg.window_days, 8),
    'ranges', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.day_of_week, r.start_time)
      FROM (
        SELECT day_of_week,
               to_char(start_time, 'HH24:MI') AS start_time,
               to_char(end_time,   'HH24:MI') AS end_time
        FROM public.booking_availability
      ) r
    ), '[]'::jsonb),
    'overrides', COALESCE((
      SELECT jsonb_agg(to_jsonb(o) ORDER BY o.date, o.start_time)
      FROM (
        SELECT to_char(date, 'YYYY-MM-DD') AS date,
               to_char(start_time, 'HH24:MI') AS start_time,
               to_char(end_time,   'HH24:MI') AS end_time
        FROM public.booking_availability_overrides
        WHERE date >= (now() AT TIME ZONE COALESCE(_cfg.timezone, 'America/Toronto'))::date - 1
      ) o
    ), '[]'::jsonb)
  );
  RETURN _result;
END;
$function$;

-- Admin write path for overrides, shaped like set_booking_availability.
-- _overrides: [{date, start_time, end_time}] with null times closing the day.
-- Replaces every override on or after today; past dates are left alone.
CREATE OR REPLACE FUNCTION public.set_booking_availability_overrides(_overrides jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _tz text := COALESCE((SELECT timezone FROM public.booking_availability_config WHERE id = 1), 'America/Toronto');
  _today date := (now() AT TIME ZONE _tz)::date;
BEGIN
  IF jsonb_typeof(COALESCE(_overrides, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'invalid_overrides' USING ERRCODE = 'P0400';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(_overrides, '[]'::jsonb)) e
    WHERE (e->>'date') IS NULL
       OR ((e->>'start_time') IS NULL) <> ((e->>'end_time') IS NULL)
       OR ((e->>'start_time') IS NOT NULL AND (e->>'end_time')::time <= (e->>'start_time')::time)
  ) THEN
    RAISE EXCEPTION 'invalid_override_range' USING ERRCODE = 'P0400';
  END IF;
  DELETE FROM public.booking_availability_overrides WHERE date >= _today;
  INSERT INTO public.booking_availability_overrides (date, start_time, end_time, note)
  SELECT (e->>'date')::date, (e->>'start_time')::time, (e->>'end_time')::time, e->>'note'
  FROM jsonb_array_elements(COALESCE(_overrides, '[]'::jsonb)) e
  WHERE (e->>'date')::date >= _today;
  RETURN public.get_booking_availability();
END;
$function$;

-- ---------------------------------------------------------------- 3. one overlap predicate
-- True when nothing in this database occupies [_start_at, _end_at) once the
-- buffers are applied to the probe. Busy rows are NOT buffered themselves, so
-- the gap between two events is exactly one buffer, never two.
CREATE OR REPLACE FUNCTION public.booking_slot_is_clear(
  _start_at timestamptz,
  _end_at timestamptz,
  _buffer_before_minutes integer,
  _buffer_after_minutes integer,
  _ignore_single_session_id uuid DEFAULT NULL,
  _ignore_google_event_id text DEFAULT NULL,
  _ignore_schedule_event_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH probe AS (
    SELECT tstzrange(
      _start_at - make_interval(mins => GREATEST(_buffer_before_minutes, 0)),
      _end_at   + make_interval(mins => GREATEST(_buffer_after_minutes, 0)),
      '[)'
    ) AS r
  )
  SELECT NOT EXISTS (
    SELECT 1 FROM public.single_session_bookings b, probe
    WHERE b.status IN ('draft', 'checkout_open', 'booked')
      AND (_ignore_single_session_id IS NULL OR b.id <> _ignore_single_session_id)
      AND tstzrange(b.start_at, b.end_at, '[)') && probe.r
  ) AND NOT EXISTS (
    SELECT 1 FROM public.booking_pass_redemptions x, probe
    WHERE x.status = 'booked'
      AND tstzrange(x.start_at, x.end_at, '[)') && probe.r
  ) AND NOT EXISTS (
    SELECT 1 FROM public.schedule_events se, probe
    WHERE se.deleted_at IS NULL
      AND se.status <> 'cancelled'
      AND COALESCE(se.transparency, 'opaque') <> 'transparent'
      AND (_ignore_google_event_id IS NULL OR se.google_event_id IS DISTINCT FROM _ignore_google_event_id)
      AND (_ignore_schedule_event_id IS NULL OR se.id <> _ignore_schedule_event_id)
      AND tstzrange(se.start_at, se.end_at, '[)') && probe.r
  );
$$;

-- ---------------------------------------------------------------- 4. exclusion constraint: half a buffer each side
CREATE OR REPLACE FUNCTION public.booking_buffered_range(_s timestamptz, _e timestamptz)
RETURNS tstzrange
LANGUAGE sql IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  -- Half of booking_buffer_minutes() (10). Literal because GiST demands
  -- IMMUTABLE; rebuild this constraint if the Buffer ever changes.
  SELECT tstzrange(_s - interval '5 minutes', _e + interval '5 minutes', '[)');
$$;

ALTER TABLE public.booking_pass_redemptions DROP CONSTRAINT IF EXISTS no_overlapping_bookings;
ALTER TABLE public.booking_pass_redemptions ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (public.booking_buffered_range(start_at, end_at) WITH &&)
  WHERE (status = 'booked');

-- ---------------------------------------------------------------- 5. pass-link slot policy
-- Mirrors the edge generateSlots exactly: notice, window, effective hours for
-- the date (overrides first), whole session inside the hours, and the pitch
-- grid (session length + Buffer) counted from the start of each range.
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
  _end_at     timestamptz;
  _local      timestamp;
  _local_date date;
  _local_time time;
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
  IF _start_at > now() + make_interval(days => COALESCE(_cfg.window_days, 45)) THEN
    RETURN false;
  END IF;

  _end_at     := _start_at + make_interval(mins => _len);
  _local      := _start_at AT TIME ZONE _tz;
  _local_date := _local::date;
  _local_time := _local::time;

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

CREATE OR REPLACE FUNCTION public.redeem_booking_pass_v2(
  _pass_id uuid, _idempotency_key text, _start_at timestamptz,
  _schedule_event_id uuid, _student_name text, _student_email text
)
RETURNS TABLE(redemption_id uuid, start_at timestamptz, end_at timestamptz, used_credits integer, total_credits integer, status text, was_existing boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _pass public.booking_passes%ROWTYPE;
  _existing public.booking_pass_redemptions%ROWTYPE;
  _end_at timestamptz;
  _new_id uuid;
  _buffer integer := public.booking_buffer_minutes();
BEGIN
  SELECT * INTO _existing FROM public.booking_pass_redemptions
    WHERE booking_pass_id = _pass_id AND idempotency_key = _idempotency_key;
  IF FOUND THEN
    PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_existing.start_at));
    SELECT * INTO _pass FROM public.booking_passes WHERE id = _pass_id;
    redemption_id := _existing.id; start_at := _existing.start_at; end_at := _existing.end_at;
    used_credits := _pass.used_credits; total_credits := _pass.total_credits;
    status := _pass.status; was_existing := true; RETURN NEXT; RETURN;
  END IF;

  SELECT * INTO _pass FROM public.booking_passes WHERE id = _pass_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'pass_not_found'; END IF;
  SELECT * INTO _existing FROM public.booking_pass_redemptions
    WHERE booking_pass_id = _pass_id AND idempotency_key = _idempotency_key;
  IF FOUND THEN
    PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_existing.start_at));
    redemption_id := _existing.id; start_at := _existing.start_at; end_at := _existing.end_at;
    used_credits := _pass.used_credits; total_credits := _pass.total_credits;
    status := _pass.status; was_existing := true; RETURN NEXT; RETURN;
  END IF;
  IF _pass.status <> 'active' THEN RAISE EXCEPTION 'pass_not_active:%', _pass.status; END IF;
  IF _pass.expires_at IS NOT NULL AND _pass.expires_at < now() THEN
    UPDATE public.booking_passes SET status = 'expired' WHERE id = _pass_id;
    RAISE EXCEPTION 'pass_expired';
  END IF;
  IF _pass.used_credits >= _pass.total_credits THEN
    UPDATE public.booking_passes SET status = 'exhausted' WHERE id = _pass_id;
    RAISE EXCEPTION 'pass_exhausted';
  END IF;
  _end_at := _start_at + make_interval(mins => _pass.session_length_minutes);
  IF NOT public.is_slot_bookable(_start_at, _pass.session_length_minutes) THEN
    RAISE EXCEPTION 'slot_unavailable' USING ERRCODE = 'P0425';
  END IF;

  PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_start_at));
  IF NOT public.booking_slot_is_clear(_start_at, _end_at, _buffer, _buffer, NULL, NULL, _schedule_event_id) THEN
    RAISE EXCEPTION 'slot_conflict' USING ERRCODE = 'P0409';
  END IF;

  BEGIN
    INSERT INTO public.booking_pass_redemptions (
      booking_pass_id, schedule_event_id, google_event_id, start_at, end_at,
      status, idempotency_key, student_name_snapshot, student_email_snapshot,
      gcal_state, needs_gcal_sync
    ) VALUES (
      _pass_id, _schedule_event_id, NULL, _start_at, _end_at, 'booked',
      _idempotency_key, _student_name, _student_email, 'pending', true
    ) RETURNING id INTO _new_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO _existing FROM public.booking_pass_redemptions
      WHERE booking_pass_id = _pass_id AND idempotency_key = _idempotency_key;
    redemption_id := _existing.id; start_at := _existing.start_at; end_at := _existing.end_at;
    used_credits := _pass.used_credits; total_credits := _pass.total_credits;
    status := _pass.status; was_existing := true; RETURN NEXT; RETURN;
  END;
  UPDATE public.booking_passes bp SET
    used_credits = bp.used_credits + 1,
    status = CASE WHEN bp.used_credits + 1 >= bp.total_credits THEN 'exhausted' ELSE 'active' END
  WHERE bp.id = _pass_id RETURNING * INTO _pass;
  redemption_id := _new_id; start_at := _start_at; end_at := _end_at;
  used_credits := _pass.used_credits; total_credits := _pass.total_credits;
  status := _pass.status; was_existing := false; RETURN NEXT;
END;
$function$;

-- ---------------------------------------------------------------- 6. single-session policy
ALTER TABLE public.booking_event_types
  ADD COLUMN IF NOT EXISTS window_calendar_days integer;

UPDATE public.booking_event_types
SET buffer_before_minutes = 10, buffer_after_minutes = 10,
    slot_interval_minutes = 80, window_calendar_days = 8, updated_at = now()
WHERE slug = 'single-session';
UPDATE public.booking_event_types
SET window_calendar_days = 8, updated_at = now()
WHERE slug = 'consultation';

-- Window end for an event: calendar days when set (Cal.com "calendarDays",
-- rolling), else the business-day count it always had.
CREATE OR REPLACE FUNCTION public.single_session_booking_window_end(_now timestamptz DEFAULT now(), _event_slug text DEFAULT 'single-session'::text)
RETURNS date
LANGUAGE plpgsql STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  _tz text := COALESCE(
    (SELECT timezone FROM public.booking_availability_config WHERE id = 1),
    'America/Toronto'
  );
  _day date := (_now AT TIME ZONE _tz)::date;
  _event public.booking_event_types%ROWTYPE;
  _target integer;
  _business_days integer := 0;
BEGIN
  SELECT * INTO _event FROM public.booking_event_types WHERE slug = _event_slug;
  IF FOUND AND _event.window_calendar_days IS NOT NULL THEN
    RETURN _day + _event.window_calendar_days;
  END IF;
  _target := COALESCE(_event.window_business_days, 6);
  WHILE _business_days < _target LOOP
    IF extract(isodow FROM _day) BETWEEN 1 AND 5 THEN
      _business_days := _business_days + 1;
    END IF;
    IF _business_days < _target THEN _day := _day + 1; END IF;
  END LOOP;
  RETURN _day;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_single_session_slot_bookable(_start_at timestamptz, _now timestamptz DEFAULT now(), _event_slug text DEFAULT 'single-session'::text)
RETURNS boolean
LANGUAGE plpgsql STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  _tz text := COALESCE(
    (SELECT timezone FROM public.booking_availability_config WHERE id = 1),
    'America/Toronto'
  );
  _event public.booking_event_types%ROWTYPE;
  _length integer;
  _pitch integer;
  _local_start timestamp;
  _local_date date;
  _local_time time;
BEGIN
  SELECT * INTO _event FROM public.booking_event_types WHERE slug = _event_slug AND active;
  IF NOT FOUND THEN RETURN false; END IF;
  IF _start_at IS NULL THEN RETURN false; END IF;

  IF _event.pinned_start_at IS NOT NULL THEN
    RETURN _start_at = _event.pinned_start_at AND _start_at > _now;
  END IF;

  _length := _event.length_minutes;
  _pitch := COALESCE(_event.slot_interval_minutes, _event.length_minutes);

  IF _start_at < _now + make_interval(mins => _event.minimum_notice_minutes) THEN
    RETURN false;
  END IF;

  _local_start := _start_at AT TIME ZONE _tz;
  _local_date := _local_start::date;
  _local_time := _local_start::time;

  IF _local_date < (_now AT TIME ZONE _tz)::date
     OR _local_date > public.single_session_booking_window_end(_now, _event_slug) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.booking_ranges_for_date(_local_date) a
    WHERE _local_time >= a.start_time
      AND _local_time + make_interval(mins => _length) <= a.end_time
      AND mod(
        floor(extract(epoch FROM (_local_time - a.start_time)) / 60)::integer,
        _pitch
      ) = 0
  );
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_single_session_slot(_start_at timestamptz, _name text, _email text, _notes text, _guests jsonb, _client_idempotency_key text, _booking_token_hash text, _ip_hash text, _user_id uuid DEFAULT NULL::uuid, _event_slug text DEFAULT 'single-session'::text)
RETURNS single_session_bookings
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _booking public.single_session_bookings%ROWTYPE;
  _event public.booking_event_types%ROWTYPE;
  _length integer;
  _end_at timestamptz;
  _email_normalized text := lower(trim(_email));
  _guests_normalized jsonb;
  _expired record;
BEGIN
  SELECT * INTO _event FROM public.booking_event_types WHERE slug = _event_slug;
  _length := COALESCE(_event.length_minutes, 70);
  _end_at := _start_at + make_interval(mins => _length);

  SELECT * INTO _booking FROM public.single_session_bookings
  WHERE client_idempotency_key = _client_idempotency_key;
  IF FOUND THEN
    PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_booking.start_at));
    SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _booking.id FOR UPDATE;
    RETURN _booking;
  END IF;

  IF _start_at IS NULL OR NOT public.is_single_session_slot_bookable(_start_at, now(), _event_slug) THEN
    RAISE EXCEPTION 'slot_unavailable' USING ERRCODE = 'P0425';
  END IF;
  IF NULLIF(trim(_name), '') IS NULL OR length(trim(_name)) > 200 THEN
    RAISE EXCEPTION 'invalid_name' USING ERRCODE = 'P0400';
  END IF;
  IF _email_normalized !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
     OR length(_email_normalized) > 320 THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = 'P0400';
  END IF;
  IF length(COALESCE(_notes, '')) > 4000 THEN
    RAISE EXCEPTION 'notes_too_long' USING ERRCODE = 'P0400';
  END IF;
  IF length(COALESCE(_client_idempotency_key, '')) NOT BETWEEN 8 AND 200
     OR length(COALESCE(_booking_token_hash, '')) NOT BETWEEN 16 AND 256
     OR length(COALESCE(_ip_hash, '')) NOT BETWEEN 16 AND 256 THEN
    RAISE EXCEPTION 'invalid_capability' USING ERRCODE = 'P0400';
  END IF;
  IF jsonb_typeof(COALESCE(_guests, '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(COALESCE(_guests, '[]'::jsonb)) > 10 THEN
    RAISE EXCEPTION 'invalid_guests' USING ERRCODE = 'P0400';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(g.email) ORDER BY g.email), '[]'::jsonb)
  INTO _guests_normalized
  FROM (
    SELECT DISTINCT lower(trim(value #>> '{}')) AS email
    FROM jsonb_array_elements(COALESCE(_guests, '[]'::jsonb))
    WHERE jsonb_typeof(value) = 'string'
      AND lower(trim(value #>> '{}')) <> _email_normalized
      AND lower(trim(value #>> '{}')) ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
  ) g;
  IF jsonb_array_length(_guests_normalized) <> jsonb_array_length(COALESCE(_guests, '[]'::jsonb)) THEN
    RAISE EXCEPTION 'invalid_or_duplicate_guests' USING ERRCODE = 'P0400';
  END IF;

  PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_start_at));

  FOR _expired IN
    UPDATE public.single_session_bookings b
      SET status = 'expired', lifecycle_version = b.lifecycle_version + 1,
          terminal_reason = 'authoritative_expiry'
    WHERE b.status IN ('draft', 'checkout_open')
      AND COALESCE(b.stripe_expires_at, b.draft_expires_at) <= now()
      AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange(_start_at, _end_at, '[)')
    RETURNING b.id, b.lifecycle_version, b.gcal_event_id
  LOOP
    IF _expired.gcal_event_id IS NOT NULL THEN
      PERFORM public.enqueue_single_session_outbox(
        _expired.id, 'gcal_delete', 'system', 'pending', 'expired',
        _expired.lifecycle_version, NULL
      );
    END IF;
  END LOOP;

  IF (SELECT count(*) FROM public.single_session_bookings b
      WHERE b.status IN ('draft', 'checkout_open')
        AND COALESCE(b.stripe_expires_at, b.draft_expires_at) > now()
        AND b.ip_hash = _ip_hash) >= 3 THEN
    RAISE EXCEPTION 'hold_cap_ip' USING ERRCODE = 'P0429';
  END IF;
  IF (SELECT count(*) FROM public.single_session_bookings b
      WHERE b.status IN ('draft', 'checkout_open')
        AND COALESCE(b.stripe_expires_at, b.draft_expires_at) > now()
        AND lower(b.email) = _email_normalized) >= 3 THEN
    RAISE EXCEPTION 'hold_cap_email' USING ERRCODE = 'P0429';
  END IF;
  IF (SELECT count(*) FROM public.single_session_bookings b
      WHERE b.status IN ('draft', 'checkout_open')
        AND COALESCE(b.stripe_expires_at, b.draft_expires_at) > now()) >= 250 THEN
    RAISE EXCEPTION 'hold_cap_global' USING ERRCODE = 'P0429';
  END IF;

  IF NOT public.booking_slot_is_clear(
    _start_at, _end_at,
    COALESCE(_event.buffer_before_minutes, 0), COALESCE(_event.buffer_after_minutes, 0)
  ) THEN
    RAISE EXCEPTION 'slot_conflict' USING ERRCODE = 'P0409';
  END IF;

  INSERT INTO public.single_session_bookings (
    start_at, end_at, name, email, notes, guests, client_idempotency_key,
    draft_expires_at, user_id, booking_token_hash, booking_token_expires_at, ip_hash,
    event_slug
  ) VALUES (
    _start_at, _end_at, trim(_name), _email_normalized, NULLIF(trim(_notes), ''),
    _guests_normalized, _client_idempotency_key, now() + interval '5 minutes',
    _user_id, _booking_token_hash, now() + interval '24 hours', _ip_hash,
    _event_slug
  ) RETURNING * INTO _booking;

  RETURN _booking;
EXCEPTION WHEN exclusion_violation OR unique_violation THEN
  SELECT * INTO _booking FROM public.single_session_bookings
  WHERE client_idempotency_key = _client_idempotency_key;
  IF FOUND THEN RETURN _booking; END IF;
  RAISE EXCEPTION 'slot_conflict' USING ERRCODE = 'P0409';
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_single_session_free(_booking_id uuid, _expected_version integer, _live_calendar_clear boolean, _cancel_token_hash text, _cancel_payload_ciphertext text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _booking public.single_session_bookings%ROWTYPE;
  _event public.booking_event_types%ROWTYPE;
  _can_book boolean := false;
  _new_version integer;
  _slot_start timestamptz;
BEGIN
  SELECT start_at INTO _slot_start FROM public.single_session_bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0404'; END IF;
  PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_slot_start));
  SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _booking_id FOR UPDATE;

  SELECT * INTO _event FROM public.booking_event_types WHERE slug = _booking.event_slug;
  IF _event.requires_payment IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'payment_required' USING ERRCODE = 'P0400';
  END IF;

  IF _booking.status = 'booked' THEN
    RETURN jsonb_build_object('booking_id', _booking.id, 'status', _booking.status,
      'lifecycle_version', _booking.lifecycle_version, 'was_existing', true);
  END IF;

  IF _booking.status <> 'draft' OR _booking.lifecycle_version <> _expected_version THEN
    RAISE EXCEPTION 'stale_booking' USING ERRCODE = 'P0409';
  END IF;

  IF NULLIF(_cancel_token_hash, '') IS NULL OR NULLIF(_cancel_payload_ciphertext, '') IS NULL THEN
    RAISE EXCEPTION 'cancel_capability_required' USING ERRCODE = 'P0400';
  END IF;

  _can_book := _live_calendar_clear AND public.booking_slot_is_clear(
    _booking.start_at, _booking.end_at,
    COALESCE(_event.buffer_before_minutes, 0), COALESCE(_event.buffer_after_minutes, 0),
    _booking.id, _booking.gcal_event_id, NULL
  );

  IF NOT _can_book THEN
    UPDATE public.single_session_bookings b SET
      status = 'expired', lifecycle_version = b.lifecycle_version + 1,
      terminal_reason = 'slot_taken_before_confirm'
    WHERE b.id = _booking_id RETURNING * INTO _booking;
    IF _booking.gcal_event_id IS NOT NULL THEN
      PERFORM public.enqueue_single_session_outbox(_booking.id, 'gcal_delete', 'system', 'pending',
        'expired', _booking.lifecycle_version, NULL);
    END IF;
    RETURN jsonb_build_object('booking_id', _booking.id, 'status', _booking.status,
      'lifecycle_version', _booking.lifecycle_version, 'was_existing', false);
  END IF;

  UPDATE public.single_session_bookings b SET
    status = 'booked', lifecycle_version = b.lifecycle_version + 1,
    amount_cents = 0, currency = 'usd',
    cancel_token_hash = _cancel_token_hash, cancel_token_expires_at = b.start_at,
    terminal_reason = NULL
  WHERE b.id = _booking_id RETURNING * INTO _booking;
  _new_version := _booking.lifecycle_version;

  PERFORM public.enqueue_single_session_outbox(_booking.id, 'gcal_promote', 'system', 'pending',
    'booked', _new_version, NULL);
  PERFORM public.enqueue_single_session_outbox(_booking.id, 'email_booking_confirmation', 'booker', 'blocked',
    'booked', _new_version, _cancel_payload_ciphertext);
  PERFORM public.enqueue_single_session_outbox(_booking.id, 'email_admin_notification', 'admin', 'blocked',
    'booked', _new_version, NULL);

  RETURN jsonb_build_object('booking_id', _booking.id, 'status', _booking.status,
    'lifecycle_version', _new_version, 'was_existing', false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_single_session_payment(_booking_id uuid, _provider_event_id text, _stripe_checkout_session_id text, _stripe_payment_intent_id text, _amount_cents integer, _currency text, _livemode boolean, _live_calendar_clear boolean, _cancel_token_hash text, _cancel_payload_ciphertext text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _booking public.single_session_bookings%ROWTYPE;
  _event public.booking_event_types%ROWTYPE;
  _claimed_booking_id uuid;
  _can_book boolean := false;
  _new_version integer;
  _slot_start timestamptz;
BEGIN
  IF NULLIF(_provider_event_id, '') IS NULL
     OR NULLIF(_stripe_checkout_session_id, '') IS NULL
     OR NULLIF(_stripe_payment_intent_id, '') IS NULL
     OR _amount_cents <> 4500 OR lower(COALESCE(_currency, '')) <> 'usd'
     OR _livemode IS NULL THEN
    RAISE EXCEPTION 'invalid_payment_facts' USING ERRCODE = 'P0400';
  END IF;

  SELECT start_at INTO _slot_start FROM public.single_session_bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0404'; END IF;
  PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_slot_start));
  SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _booking_id FOR UPDATE;
  SELECT * INTO _event FROM public.booking_event_types WHERE slug = _booking.event_slug;

  SELECT single_session_booking_id INTO _claimed_booking_id
  FROM public.booking_commerce_events
  WHERE provider = 'stripe' AND provider_event_id = _provider_event_id
    AND event_type = 'single_session_paid';
  IF FOUND AND _claimed_booking_id IS DISTINCT FROM _booking_id THEN
    RAISE EXCEPTION 'provider_event_already_claimed' USING ERRCODE = 'P0409';
  END IF;

  IF _booking.stripe_checkout_session_id IS DISTINCT FROM _stripe_checkout_session_id THEN
    RAISE EXCEPTION 'checkout_mismatch' USING ERRCODE = 'P0409';
  END IF;

  IF _booking.status IN ('booked', 'cancelled', 'refund_pending', 'refunded', 'refund_failed') THEN
    IF _booking.stripe_payment_intent_id IS DISTINCT FROM _stripe_payment_intent_id
       OR _booking.amount_cents IS DISTINCT FROM _amount_cents
       OR lower(_booking.currency) IS DISTINCT FROM lower(_currency)
       OR _booking.livemode IS DISTINCT FROM _livemode THEN
      RAISE EXCEPTION 'payment_facts_mismatch' USING ERRCODE = 'P0409';
    END IF;
    INSERT INTO public.booking_commerce_events (
      provider, provider_event_id, event_type, offer_id, amount_cents, currency,
      payload, single_session_booking_id
    ) VALUES (
      'stripe', _provider_event_id, 'single_session_paid', 'single-session-native',
      _amount_cents, lower(_currency),
      jsonb_build_object('livemode', _livemode, 'checkout_session_id', _stripe_checkout_session_id),
      _booking_id
    ) ON CONFLICT (provider, provider_event_id, event_type) DO NOTHING;
    RETURN jsonb_build_object('booking_id', _booking.id, 'status', _booking.status,
      'lifecycle_version', _booking.lifecycle_version, 'was_existing', true);
  END IF;

  IF _booking.status NOT IN ('checkout_open', 'expired', 'abandoned') THEN
    RAISE EXCEPTION 'payment_not_finalizable' USING ERRCODE = 'P0409';
  END IF;

  INSERT INTO public.booking_commerce_events (
    provider, provider_event_id, event_type, offer_id, amount_cents, currency,
    payload, single_session_booking_id
  ) VALUES (
    'stripe', _provider_event_id, 'single_session_paid', 'single-session-native',
    _amount_cents, lower(_currency),
    jsonb_build_object('livemode', _livemode, 'checkout_session_id', _stripe_checkout_session_id),
    _booking_id
  ) ON CONFLICT (provider, provider_event_id, event_type) DO NOTHING;

  _can_book := _live_calendar_clear
    AND (_booking.status = 'checkout_open'
      OR (_booking.status = 'expired' AND _booking.status_changed_at >= now() - interval '10 minutes'))
    AND public.booking_slot_is_clear(
      _booking.start_at, _booking.end_at,
      COALESCE(_event.buffer_before_minutes, 0), COALESCE(_event.buffer_after_minutes, 0),
      _booking.id, _booking.gcal_event_id, NULL
    );

  IF _can_book THEN
    IF NULLIF(_cancel_token_hash, '') IS NULL OR NULLIF(_cancel_payload_ciphertext, '') IS NULL THEN
      RAISE EXCEPTION 'cancel_capability_required' USING ERRCODE = 'P0400';
    END IF;
    UPDATE public.single_session_bookings b SET
      status = 'booked', lifecycle_version = b.lifecycle_version + 1,
      stripe_payment_intent_id = _stripe_payment_intent_id,
      amount_cents = _amount_cents, currency = lower(_currency), livemode = _livemode,
      cancel_token_hash = _cancel_token_hash, cancel_token_expires_at = b.start_at,
      terminal_reason = NULL
    WHERE b.id = _booking_id RETURNING * INTO _booking;
    _new_version := _booking.lifecycle_version;

    PERFORM public.enqueue_single_session_outbox(_booking.id, 'gcal_promote', 'system', 'pending',
      'booked', _new_version, NULL);
    PERFORM public.enqueue_single_session_outbox(_booking.id, 'email_booking_confirmation', 'booker', 'blocked',
      'booked', _new_version, _cancel_payload_ciphertext);
    PERFORM public.enqueue_single_session_outbox(_booking.id, 'email_admin_notification', 'admin', 'blocked',
      'booked', _new_version, NULL);
  ELSE
    UPDATE public.single_session_bookings b SET
      status = 'refund_pending', lifecycle_version = b.lifecycle_version + 1,
      stripe_payment_intent_id = _stripe_payment_intent_id,
      amount_cents = _amount_cents, currency = lower(_currency), livemode = _livemode,
      terminal_reason = 'paid_slot_unavailable'
    WHERE b.id = _booking_id RETURNING * INTO _booking;
    _new_version := _booking.lifecycle_version;
    UPDATE public.single_session_outbox SET state = 'superseded', updated_at = now()
      WHERE booking_id = _booking.id AND state IN ('blocked', 'pending', 'failed')
        AND action IN ('gcal_promote', 'email_booking_confirmation', 'email_admin_notification');
    PERFORM public.enqueue_single_session_outbox(_booking.id, 'gcal_delete', 'system', 'pending',
      'refund_pending', _new_version, NULL);
    PERFORM public.enqueue_single_session_outbox(_booking.id, 'stripe_refund', 'system', 'pending',
      'refund_pending', _new_version, NULL);
  END IF;

  RETURN jsonb_build_object('booking_id', _booking.id, 'status', _booking.status,
    'lifecycle_version', _booking.lifecycle_version, 'was_existing', false);
END;
$function$;

-- ---------------------------------------------------------------- 7. the phantom rows that blocked Saturdays
-- Two "Andrew" occurrences mirrored on 2026-06-22 from a recurring Google event
-- that has since been removed from the calendar. The pull sync never tombstoned
-- them (fixed in gcal-sync-pull alongside this migration); they hid every
-- Saturday slot on 09-12 and 09-19 from students while Cal.com offered them.
UPDATE public.schedule_events
SET deleted_at = now(), status = 'cancelled'
WHERE deleted_at IS NULL
  AND source = 'google'
  AND google_event_id IN ('4gehvktovf170bsvkju1d2utuq_20260912T184500Z', '4gehvktovf170bsvkju1d2utuq_20260919T184500Z');

-- NOTE on changing the Buffer later: update booking_availability_config.buffer_minutes,
-- then re-create booking_buffered_range with half the new value and rebuild
-- no_overlapping_bookings (steps 4 above). Everything else reads the config row.
