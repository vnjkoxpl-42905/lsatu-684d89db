-- Clear the two conflicting test bookings so the buffered constraint can build.
UPDATE public.booking_pass_redemptions
   SET status = 'cancelled'
 WHERE id IN (
   'defa5af3-b837-4d6c-9d70-1aeca2f62ad7',
   '82d2e5ec-8696-4928-bd85-4fa6c7deaecd'
 );

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.booking_passes
  ADD COLUMN IF NOT EXISTS booking_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS booking_passes_active_slug
  ON public.booking_passes (booking_slug)
  WHERE booking_slug IS NOT NULL AND status = 'active';

ALTER TABLE public.booking_pass_redemptions
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS gcal_state       text NOT NULL DEFAULT 'synced',
  ADD COLUMN IF NOT EXISTS gcal_attempts    int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gcal_error       text,
  ADD COLUMN IF NOT EXISTS gcal_lease_until timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_pass_redemptions_gcal_state_chk'
  ) THEN
    ALTER TABLE public.booking_pass_redemptions
      ADD CONSTRAINT booking_pass_redemptions_gcal_state_chk
      CHECK (gcal_state IN ('pending','synced','failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS booking_pass_redemptions_gcal_pending
  ON public.booking_pass_redemptions (updated_at)
  WHERE gcal_state = 'pending';

DROP TRIGGER IF EXISTS booking_pass_redemptions_updated_at ON public.booking_pass_redemptions;
CREATE TRIGGER booking_pass_redemptions_updated_at
BEFORE UPDATE ON public.booking_pass_redemptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.booking_buffered_range(_s timestamptz, _e timestamptz)
RETURNS tstzrange
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT tstzrange(_s - interval '15 minutes', _e + interval '15 minutes')
$$;

ALTER TABLE public.booking_pass_redemptions
  DROP CONSTRAINT IF EXISTS no_overlapping_bookings;

ALTER TABLE public.booking_pass_redemptions
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    public.booking_buffered_range(start_at, end_at) WITH &&
  )
  WHERE (status = 'booked');

ALTER TABLE public.booking_passes
  ALTER COLUMN session_length_minutes SET DEFAULT 70;

UPDATE public.booking_passes
   SET session_length_minutes = 70
 WHERE status = 'active' AND session_length_minutes = 60;

CREATE OR REPLACE FUNCTION public.is_slot_bookable(_start_at timestamptz, _len int)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tz        text;
  _end_at    timestamptz;
  _local     timestamp;
  _local_end timestamp;
  _dow       int;
  _mins      int;
  _ok        boolean := false;
  _r         record;
  _win_start timestamptz;
  _win_end   timestamptz;
BEGIN
  SELECT COALESCE(timezone, 'America/Toronto') INTO _tz
    FROM public.booking_availability_config WHERE id = 1;
  IF _tz IS NULL THEN _tz := 'America/Toronto'; END IF;

  _end_at    := _start_at + make_interval(mins => _len);
  _local     := _start_at AT TIME ZONE _tz;
  _local_end := _end_at   AT TIME ZONE _tz;

  IF _start_at < now() + interval '1440 minutes' THEN
    RETURN false;
  END IF;

  _mins := EXTRACT(MINUTE FROM _local)::int;
  IF _mins NOT IN (0, 30) OR EXTRACT(SECOND FROM _local)::int <> 0 THEN
    RETURN false;
  END IF;

  _dow := EXTRACT(DOW FROM _local)::int;
  FOR _r IN
    SELECT start_time, end_time FROM public.booking_availability WHERE day_of_week = _dow
  LOOP
    _win_start := make_timestamptz(
      EXTRACT(YEAR FROM _local)::int, EXTRACT(MONTH FROM _local)::int, EXTRACT(DAY FROM _local)::int,
      EXTRACT(HOUR FROM _r.start_time)::int, EXTRACT(MINUTE FROM _r.start_time)::int, 0, _tz);
    _win_end := make_timestamptz(
      EXTRACT(YEAR FROM _local)::int, EXTRACT(MONTH FROM _local)::int, EXTRACT(DAY FROM _local)::int,
      EXTRACT(HOUR FROM _r.end_time)::int, EXTRACT(MINUTE FROM _r.end_time)::int, 0, _tz);
    IF _start_at >= _win_start AND _end_at <= _win_end THEN
      _ok := true;
      EXIT;
    END IF;
  END LOOP;

  RETURN _ok;
END;
$$;

REVOKE ALL ON FUNCTION public.is_slot_bookable(timestamptz, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_slot_bookable(timestamptz, int) TO service_role;

CREATE OR REPLACE FUNCTION public.redeem_booking_pass_v2(
  _pass_id uuid,
  _idempotency_key text,
  _start_at timestamptz,
  _schedule_event_id uuid,
  _student_name text,
  _student_email text
) RETURNS TABLE (
  redemption_id uuid,
  start_at timestamptz,
  end_at timestamptz,
  used_credits int,
  total_credits int,
  status text,
  was_existing boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pass      public.booking_passes%ROWTYPE;
  _existing  public.booking_pass_redemptions%ROWTYPE;
  _end_at    timestamptz;
  _new_id    uuid;
  _conflict  int;
BEGIN
  SELECT * INTO _existing FROM public.booking_pass_redemptions
   WHERE booking_pass_id = _pass_id AND idempotency_key = _idempotency_key;
  IF FOUND THEN
    SELECT * INTO _pass FROM public.booking_passes WHERE id = _pass_id;
    redemption_id := _existing.id; start_at := _existing.start_at; end_at := _existing.end_at;
    used_credits := _pass.used_credits; total_credits := _pass.total_credits;
    status := _pass.status; was_existing := true;
    RETURN NEXT; RETURN;
  END IF;

  SELECT * INTO _pass FROM public.booking_passes WHERE id = _pass_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'pass_not_found'; END IF;

  SELECT * INTO _existing FROM public.booking_pass_redemptions
   WHERE booking_pass_id = _pass_id AND idempotency_key = _idempotency_key;
  IF FOUND THEN
    redemption_id := _existing.id; start_at := _existing.start_at; end_at := _existing.end_at;
    used_credits := _pass.used_credits; total_credits := _pass.total_credits;
    status := _pass.status; was_existing := true;
    RETURN NEXT; RETURN;
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

  SELECT COUNT(*) INTO _conflict
    FROM public.booking_pass_redemptions r
   WHERE r.status = 'booked'
     AND tstzrange(r.start_at - interval '15 minutes', r.end_at + interval '15 minutes')
         && tstzrange(_start_at - interval '15 minutes', _end_at + interval '15 minutes');
  IF _conflict > 0 THEN RAISE EXCEPTION 'slot_conflict' USING ERRCODE = 'P0409'; END IF;

  SELECT COUNT(*) INTO _conflict
    FROM public.schedule_events se
   WHERE se.deleted_at IS NULL AND se.status <> 'cancelled'
     AND (_schedule_event_id IS NULL OR se.id <> _schedule_event_id)
     AND se.start_at < _end_at   + interval '15 minutes'
     AND se.end_at   > _start_at - interval '15 minutes';
  IF _conflict > 0 THEN RAISE EXCEPTION 'slot_conflict' USING ERRCODE = 'P0409'; END IF;

  BEGIN
    INSERT INTO public.booking_pass_redemptions
      (booking_pass_id, schedule_event_id, google_event_id, start_at, end_at,
       status, idempotency_key, student_name_snapshot, student_email_snapshot,
       gcal_state, needs_gcal_sync)
    VALUES (_pass_id, _schedule_event_id, NULL, _start_at, _end_at,
            'booked', _idempotency_key, _student_name, _student_email,
            'pending', true)
    RETURNING id INTO _new_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO _existing FROM public.booking_pass_redemptions
     WHERE booking_pass_id = _pass_id AND idempotency_key = _idempotency_key;
    redemption_id := _existing.id; start_at := _existing.start_at; end_at := _existing.end_at;
    used_credits := _pass.used_credits; total_credits := _pass.total_credits;
    status := _pass.status; was_existing := true;
    RETURN NEXT; RETURN;
  END;

  UPDATE public.booking_passes
     SET used_credits = used_credits + 1,
         status = CASE WHEN used_credits + 1 >= total_credits THEN 'exhausted' ELSE 'active' END
   WHERE id = _pass_id
   RETURNING * INTO _pass;

  redemption_id := _new_id; start_at := _start_at; end_at := _end_at;
  used_credits := _pass.used_credits; total_credits := _pass.total_credits;
  status := _pass.status; was_existing := false;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_booking_pass_v2(uuid, text, timestamptz, uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_booking_pass_v2(uuid, text, timestamptz, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_booking_link_full(_slug text)
RETURNS public.booking_passes
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pass public.booking_passes%ROWTYPE;
BEGIN
  IF _slug IS NULL OR length(_slug) < 8 THEN RETURN NULL; END IF;
  SELECT * INTO _pass FROM public.booking_passes
   WHERE booking_slug = _slug AND status = 'active';
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF _pass.expires_at IS NOT NULL AND _pass.expires_at < now() THEN
    UPDATE public.booking_passes SET status = 'expired' WHERE id = _pass.id;
    RETURN NULL;
  END IF;
  RETURN _pass;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_booking_link_full(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_booking_link_full(text) TO service_role;

CREATE OR REPLACE FUNCTION public.regenerate_booking_link(
  _student_id uuid, _new_slug text, _new_token_hash text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(_student_id::text, 0));
  SELECT id INTO _id FROM public.booking_passes
   WHERE student_id = _student_id AND status = 'active'
   ORDER BY created_at DESC LIMIT 1
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no_active_pass'; END IF;
  UPDATE public.booking_passes
     SET booking_slug = _new_slug, token_hash = _new_token_hash
   WHERE id = _id;
  RETURN _new_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.regenerate_booking_link(uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_booking_link(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.grant_booking_access(
  _student_id    uuid,
  _student_name  text,
  _student_email text,
  _total_credits int,
  _session_length_minutes int,
  _expires_at    timestamptz,
  _created_by    uuid,
  _token_hash    text,
  _booking_slug  text
) RETURNS public.booking_passes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pass public.booking_passes%ROWTYPE;
BEGIN
  IF _student_id IS NULL THEN
    RAISE EXCEPTION 'student_id_required' USING ERRCODE = 'P0400';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_student_id::text, 0));
  UPDATE public.booking_passes SET status = 'revoked'
   WHERE student_id = _student_id AND status = 'active';
  INSERT INTO public.booking_passes
    (token_hash, booking_slug, student_id, student_name, student_email,
     total_credits, session_length_minutes, expires_at, created_by)
  VALUES
    (_token_hash, _booking_slug, _student_id, _student_name, _student_email,
     GREATEST(1, LEAST(50, _total_credits)),
     GREATEST(15, LEAST(480, COALESCE(_session_length_minutes, 70))),
     _expires_at, _created_by)
  RETURNING * INTO _pass;
  RETURN _pass;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_booking_access(uuid, text, text, int, int, timestamptz, uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_booking_access(uuid, text, text, int, int, timestamptz, uuid, text, text) TO service_role;

CREATE TABLE IF NOT EXISTS public.booking_link_hits (
  ip_hash      text NOT NULL,
  slug         text NOT NULL,
  action       text NOT NULL,
  window_start timestamptz NOT NULL,
  count        int NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, slug, action, window_start)
);

GRANT ALL ON public.booking_link_hits TO service_role;
ALTER TABLE public.booking_link_hits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bump_booking_hit(_ip_hash text, _slug text, _action text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window timestamptz := date_trunc('minute', now());
  _count  int;
BEGIN
  INSERT INTO public.booking_link_hits (ip_hash, slug, action, window_start, count)
  VALUES (_ip_hash, _slug, _action, _window, 1)
  ON CONFLICT (ip_hash, slug, action, window_start)
  DO UPDATE SET count = public.booking_link_hits.count + 1
  RETURNING count INTO _count;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_booking_hit(text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_booking_hit(text, text, text) TO service_role;
