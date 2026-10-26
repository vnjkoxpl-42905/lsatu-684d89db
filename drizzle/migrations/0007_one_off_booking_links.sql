-- One-off booking links: a single-use, single-price bookable session.
--
-- Joshua sends someone a URL, they book one session at a price set for them,
-- and the link stops working. This needs no new booking machinery: an event type
-- already carries length, notice, buffers, window and price, and every layer
-- (page, edge function, slot policy, claim transaction) is already keyed by
-- event slug. A one-off link IS a booking_event_types row with a random slug and
-- single_use set.
--
-- Two things stood in the way and are fixed here.
--
-- 1. `single_session_bookings` still carried CHECK constraints from the day
--    there was exactly one sellable thing: `end_at = start_at + 70 minutes` and
--    `amount_cents = 4500`. Those made a custom-length or custom-price event
--    impossible to insert. They also mean the already-seeded 30-minute free
--    `consultation` event cannot currently be booked at all -- its insert
--    violates the 70-minute check. Replacing them with a trigger that reads the
--    event's own length fixes both.
--
-- 2. Nothing enforced single use. The same trigger does it, under a per-slug
--    advisory lock so two people clicking the same link at the same moment
--    cannot both get through.

-- --------------------------------------------------------------------------
-- The link itself
-- --------------------------------------------------------------------------
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

-- A pinned time is a one-off idea: it names a single instant, so it can only be
-- sold once.
ALTER TABLE public.booking_event_types
  DROP CONSTRAINT IF EXISTS booking_event_types_pinned_is_single_use_chk;
ALTER TABLE public.booking_event_types
  ADD CONSTRAINT booking_event_types_pinned_is_single_use_chk
  CHECK (pinned_start_at IS NULL OR single_use);

-- --------------------------------------------------------------------------
-- Duration and price stop being constants
-- --------------------------------------------------------------------------
ALTER TABLE public.single_session_bookings
  DROP CONSTRAINT IF EXISTS single_session_duration_chk,
  DROP CONSTRAINT IF EXISTS single_session_amount_chk;

ALTER TABLE public.single_session_bookings
  DROP CONSTRAINT IF EXISTS single_session_amount_nonnegative_chk;
ALTER TABLE public.single_session_bookings
  ADD CONSTRAINT single_session_amount_nonnegative_chk
  CHECK (amount_cents IS NULL OR amount_cents >= 0);

-- --------------------------------------------------------------------------
-- What the dropped CHECKs used to say, said against the event instead
-- --------------------------------------------------------------------------
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

  -- The length is the event's, not the caller's. This is the old 70-minute
  -- CHECK, generalised: a consultation is 30 minutes and a one-off link is
  -- whatever it was minted as.
  IF NEW.end_at <> NEW.start_at + make_interval(mins => _event.length_minutes) THEN
    RAISE EXCEPTION 'duration_mismatch' USING ERRCODE = 'P0400';
  END IF;

  IF _event.single_use THEN
    -- Serialise every claim against this one link, so a simultaneous pair of
    -- clicks cannot both read "unspent" and both insert. Taken before the read,
    -- released at transaction end.
    PERFORM pg_advisory_xact_lock(hashtext('one-off-booking-link:' || NEW.event_slug));

    -- Spent means a booking exists that is live or was paid. A hold holds the
    -- link (so nobody else can start one while a checkout is open); expiring or
    -- abandoning that hold releases it again. A cancelled or refunded booking
    -- stays spent -- the session was sold once, and a replacement gets a
    -- replacement link.
    SELECT count(*) INTO _spent
    FROM public.single_session_bookings b
    WHERE b.event_slug = NEW.event_slug
      AND b.status NOT IN ('expired', 'abandoned')
      -- A retry of the same request is the same booking, not a second one.
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

-- --------------------------------------------------------------------------
-- Is a one-off link still open? Read by the booking page before it offers times.
-- --------------------------------------------------------------------------
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

-- --------------------------------------------------------------------------
-- A pinned link sells one instant, and only that instant
--
-- Everything this function normally asks -- is it far enough out, is it inside
-- the rolling window, does it fall inside the weekly hours and on the slot grid
-- -- exists to decide whether a time is one Joshua would agree to. A pinned
-- link is that agreement, made in advance and by hand: he picked the time and
-- sent it to one person. So the questions are answered, and the only thing left
-- to check is that the caller is asking for the time on the link.
--
-- This does NOT relax the double-booking check. That lives in
-- claim_single_session_slot, runs inside the booking transaction, and still
-- refuses a slot that overlaps another booking or a calendar event.
--
-- Links without a pinned time keep the ordinary policy, reading their own
-- minimum_notice_minutes and window_business_days -- which is how a short-notice
-- link is made: mint it with a notice of zero.
-- --------------------------------------------------------------------------
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

  -- The pinned instant, and nothing else. Still refuse to sell one in the past.
  IF _event.pinned_start_at IS NOT NULL THEN
    RETURN _start_at = _event.pinned_start_at AND _start_at > _now;
  END IF;

  _length := _event.length_minutes;
  -- No explicit interval means slots start every length_minutes, which is what
  -- Cal.com does and what produces the session's 1:00 / 2:10 / 3:20 chain.
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
  -- Invalid timezone/configuration is not permission to sell a slot.
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.is_single_session_slot_bookable(timestamptz, timestamptz, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_single_session_slot_bookable(timestamptz, timestamptz, text) TO service_role;