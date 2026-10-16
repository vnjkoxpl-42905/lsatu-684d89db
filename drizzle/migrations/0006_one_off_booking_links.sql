-- One-off booking links: a single-use, single-price bookable session.
ALTER TABLE public.booking_event_types
  ADD COLUMN IF NOT EXISTS single_use boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS note text;

COMMENT ON COLUMN public.booking_event_types.single_use IS
  'A one-off link: once a booking against this slug is held or paid, the slug is spent and no further booking may be claimed.';
COMMENT ON COLUMN public.booking_event_types.pinned_start_at IS
  'One exact start time this link sells. When set, the link offers only this time and the notice, window and weekly-hours rules do not apply -- Joshua already decided this time is fine. Double-booking is still refused by the claim transaction.';
COMMENT ON COLUMN public.booking_event_types.note IS
  'Admin-only reminder of who a one-off link was made for. Never sent to the browser.';

ALTER TABLE public.booking_event_types
  DROP CONSTRAINT IF EXISTS booking_event_types_pinned_is_single_use_chk;
ALTER TABLE public.booking_event_types
  ADD CONSTRAINT booking_event_types_pinned_is_single_use_chk
  CHECK (pinned_start_at IS NULL OR single_use);

ALTER TABLE public.single_session_bookings
  DROP CONSTRAINT IF EXISTS single_session_duration_chk,
  DROP CONSTRAINT IF EXISTS single_session_amount_chk;

ALTER TABLE public.single_session_bookings
  DROP CONSTRAINT IF EXISTS single_session_amount_nonnegative_chk;
ALTER TABLE public.single_session_bookings
  ADD CONSTRAINT single_session_amount_nonnegative_chk
  CHECK (amount_cents IS NULL OR amount_cents >= 0);

CREATE OR REPLACE FUNCTION public.enforce_booking_event_shape()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event record;
  _spent integer;
BEGIN
  SELECT * INTO _event
  FROM public.booking_event_types
  WHERE slug = NEW.event_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown_event' USING ERRCODE = 'P0400';
  END IF;

  IF NEW.end_at <> NEW.start_at + make_interval(mins => _event.length_minutes) THEN
    RAISE EXCEPTION 'duration_mismatch' USING ERRCODE = 'P0400';
  END IF;

  IF _event.single_use THEN
    PERFORM pg_advisory_xact_lock(hashtext('one-off-booking-link:' || NEW.event_slug));

    SELECT count(*) INTO _spent
    FROM public.single_session_bookings b
    WHERE b.event_slug = NEW.event_slug
      AND b.status NOT IN ('expired', 'abandoned')
      AND b.client_idempotency_key <> NEW.client_idempotency_key;

    IF _spent > 0 THEN
      RAISE EXCEPTION 'link_already_used' USING ERRCODE = 'P0410';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_booking_event_shape ON public.single_session_bookings;
CREATE TRIGGER enforce_booking_event_shape
  BEFORE INSERT ON public.single_session_bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_event_shape();

REVOKE ALL ON FUNCTION public.enforce_booking_event_shape() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.booking_event_is_spent(_event_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.booking_event_types t
    JOIN public.single_session_bookings b ON b.event_slug = t.slug
    WHERE t.slug = _event_slug
      AND t.single_use
      AND b.status NOT IN ('expired', 'abandoned')
  );
$$;

REVOKE ALL ON FUNCTION public.booking_event_is_spent(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.booking_event_is_spent(text) TO service_role;

CREATE OR REPLACE FUNCTION public.is_single_session_slot_bookable(
  _start_at timestamptz,
  _now timestamptz DEFAULT now(),
  _event_slug text DEFAULT 'single-session'
) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path = public AS $$
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
    FROM public.booking_availability a
    WHERE a.day_of_week = extract(dow FROM _local_date)::integer
      AND _local_time >= a.start_time
      AND _local_time + make_interval(mins => _length) <= a.end_time
      AND mod(
        floor(extract(epoch FROM (_local_time - a.start_time)) / 60)::integer,
        _pitch
      ) = 0
  );
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.is_single_session_slot_bookable(timestamptz, timestamptz, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_single_session_slot_bookable(timestamptz, timestamptz, text) TO service_role;