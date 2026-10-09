-- The slot policy stops being about one 70-minute session.
--
-- These three functions are what actually decide whether a time can be sold --
-- they run inside the booking transaction, which is what keeps two people from
-- taking the same slot. Every number in them was a literal: 70 minutes in three
-- places, six business days, 24 hours' notice. booking_event_types now holds
-- those numbers, and these read them.
--
-- Behavior for the single session is unchanged by construction: the seeded row
-- carries exactly the values that were hardcoded here (70 / null interval / 1440
-- / 6). The event defaults to 'single-session' everywhere, so every existing
-- caller keeps working untouched.
--
-- These are DROPped rather than REPLACEd because a new argument with a default
-- would make the old one-argument calls ambiguous rather than overriding them.

-- Which event a booking is for. Existing rows are all single sessions.
ALTER TABLE public.single_session_bookings
  ADD COLUMN IF NOT EXISTS event_slug text NOT NULL DEFAULT 'single-session'
    REFERENCES public.booking_event_types(slug);

COMMENT ON COLUMN public.single_session_bookings.event_slug IS
  'Which booking_event_types row this booking follows: its length, notice, window and price.';

-- --------------------------------------------------------------------------
-- Window: business days size the span. Days inside it are offered whenever the
-- weekly hours cover them, Saturday included.
-- --------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.single_session_booking_window_end(timestamptz);

CREATE FUNCTION public.single_session_booking_window_end(
  _now timestamptz DEFAULT now(),
  _event_slug text DEFAULT 'single-session'
) RETURNS date
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  _tz text := COALESCE(
    (SELECT timezone FROM public.booking_availability_config WHERE id = 1),
    'America/Toronto'
  );
  _day date := (_now AT TIME ZONE _tz)::date;
  _target integer := COALESCE(
    (SELECT window_business_days FROM public.booking_event_types WHERE slug = _event_slug), 6
  );
  _business_days integer := 0;
BEGIN
  WHILE _business_days < _target LOOP
    IF extract(isodow FROM _day) BETWEEN 1 AND 5 THEN
      _business_days := _business_days + 1;
    END IF;
    IF _business_days < _target THEN _day := _day + 1; END IF;
  END LOOP;
  RETURN _day;
END;
$$;

-- --------------------------------------------------------------------------
-- Is this start time sellable: far enough out, inside the window, inside the
-- weekly hours, and landing on the event's own slot grid.
-- --------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.is_single_session_slot_bookable(timestamptz, timestamptz);

CREATE FUNCTION public.is_single_session_slot_bookable(
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

  _length := _event.length_minutes;
  -- No explicit interval means slots start every length_minutes, which is what
  -- Cal.com does and what produces the session's 1:00 / 2:10 / 3:20 chain.
  _pitch := COALESCE(_event.slot_interval_minutes, _event.length_minutes);

  IF _start_at IS NULL
     OR _start_at < _now + make_interval(mins => _event.minimum_notice_minutes) THEN
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
  -- Invalid timezone/configuration is not permission to sell a slot.
  RETURN false;
END;
$$;

-- --------------------------------------------------------------------------
-- The claim. End time now comes from the event's length instead of a literal
-- 70 minutes, and the booking records which event it is.
-- --------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.claim_single_session_slot(
  timestamptz, text, text, text, jsonb, text, text, text, uuid);

CREATE FUNCTION public.claim_single_session_slot(
  _start_at timestamptz,
  _name text,
  _email text,
  _notes text,
  _guests jsonb,
  _client_idempotency_key text,
  _booking_token_hash text,
  _ip_hash text,
  _user_id uuid DEFAULT NULL,
  _event_slug text DEFAULT 'single-session'
) RETURNS public.single_session_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking public.single_session_bookings%ROWTYPE;
  _length integer := COALESCE(
    (SELECT length_minutes FROM public.booking_event_types WHERE slug = _event_slug), 70);
  _end_at timestamptz := _start_at + make_interval(mins => _length);
  _email_normalized text := lower(trim(_email));
  _guests_normalized jsonb;
  _expired record;
BEGIN
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

  IF EXISTS (
    SELECT 1 FROM public.single_session_bookings b
    WHERE b.status IN ('draft', 'checkout_open', 'booked')
      AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange(_start_at, _end_at, '[)')
  ) OR EXISTS (
    SELECT 1 FROM public.booking_pass_redemptions r
    WHERE r.status = 'booked'
      AND tstzrange(r.start_at - interval '15 minutes', r.end_at + interval '15 minutes', '[)')
          && tstzrange(_start_at, _end_at, '[)')
  ) OR EXISTS (
    SELECT 1 FROM public.schedule_events se
    WHERE se.deleted_at IS NULL AND se.status <> 'cancelled'
      AND se.start_at < _end_at AND se.end_at > _start_at
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
$$;

-- Same grants the dropped versions carried: service_role only, never the client.
REVOKE ALL ON FUNCTION public.single_session_booking_window_end(timestamptz, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_single_session_slot_bookable(timestamptz, timestamptz, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_single_session_slot(timestamptz, text, text, text, jsonb, text, text, text, uuid, text) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.single_session_booking_window_end(timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_single_session_slot_bookable(timestamptz, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_single_session_slot(timestamptz, text, text, text, jsonb, text, text, text, uuid, text) TO service_role;
