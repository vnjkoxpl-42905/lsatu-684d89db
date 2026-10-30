-- Fix: redeem_booking_pass declares an OUT column named `status` (in RETURNS
-- TABLE), and the slot-conflict SELECT against public.schedule_events referenced
-- an unqualified `status` -> Postgres raised "column reference \"status\" is
-- ambiguous", so EVERY booking failed with redeem_failed / non-2xx.
--
-- This re-defines the function identically except the conflict-check columns are
-- fully qualified to public.schedule_events.*. Idempotent (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.redeem_booking_pass(
  _pass_id uuid,
  _idempotency_key text,
  _start_at timestamptz,
  _end_at timestamptz,
  _schedule_event_id uuid,
  _google_event_id text,
  _student_name text,
  _student_email text
) RETURNS TABLE (
  redemption_id uuid,
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
  _pass public.booking_passes%ROWTYPE;
  _existing public.booking_pass_redemptions%ROWTYPE;
  _new_id uuid;
  _conflict_count int;
BEGIN
  SELECT * INTO _existing FROM public.booking_pass_redemptions
   WHERE booking_pass_id = _pass_id AND idempotency_key = _idempotency_key;
  IF FOUND THEN
    SELECT * INTO _pass FROM public.booking_passes WHERE id = _pass_id;
    redemption_id := _existing.id;
    used_credits := _pass.used_credits;
    total_credits := _pass.total_credits;
    status := _pass.status;
    was_existing := true;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO _pass FROM public.booking_passes WHERE id = _pass_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pass_not_found';
  END IF;
  IF _pass.status <> 'active' THEN
    RAISE EXCEPTION 'pass_not_active:%', _pass.status;
  END IF;
  IF _pass.expires_at IS NOT NULL AND _pass.expires_at < now() THEN
    UPDATE public.booking_passes SET status = 'expired' WHERE id = _pass_id;
    RAISE EXCEPTION 'pass_expired';
  END IF;
  IF _pass.used_credits >= _pass.total_credits THEN
    UPDATE public.booking_passes SET status = 'exhausted' WHERE id = _pass_id;
    RAISE EXCEPTION 'pass_exhausted';
  END IF;

  -- Re-check slot availability. Columns are qualified to avoid clashing with the
  -- OUT parameter `status` (the original bug).
  SELECT COUNT(*) INTO _conflict_count
    FROM public.schedule_events se
   WHERE se.deleted_at IS NULL
     AND se.status <> 'cancelled'
     AND (_schedule_event_id IS NULL OR se.id <> _schedule_event_id)
     AND se.start_at < _end_at
     AND se.end_at > _start_at;
  IF _conflict_count > 0 THEN
    RAISE EXCEPTION 'slot_conflict';
  END IF;

  INSERT INTO public.booking_pass_redemptions
    (booking_pass_id, schedule_event_id, google_event_id, start_at, end_at,
     status, idempotency_key, student_name_snapshot, student_email_snapshot)
  VALUES (_pass_id, _schedule_event_id, _google_event_id, _start_at, _end_at,
          'booked', _idempotency_key, _student_name, _student_email)
  RETURNING id INTO _new_id;

  UPDATE public.booking_passes
     SET used_credits = used_credits + 1,
         status = CASE WHEN used_credits + 1 >= total_credits THEN 'exhausted' ELSE 'active' END
   WHERE id = _pass_id
   RETURNING * INTO _pass;

  redemption_id := _new_id;
  used_credits := _pass.used_credits;
  total_credits := _pass.total_credits;
  status := _pass.status;
  was_existing := false;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_booking_pass(uuid, text, timestamptz, timestamptz, uuid, text, text, text) FROM public, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_booking_pass(uuid, text, timestamptz, timestamptz, uuid, text, text, text) TO service_role;
