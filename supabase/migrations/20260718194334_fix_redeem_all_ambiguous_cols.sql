-- Definitive fix for redeem_booking_pass ambiguity. The function's RETURNS TABLE
-- declares OUT columns (used_credits, total_credits, status, redemption_id) whose
-- names collide with real table columns inside the body -> Postgres raises
-- "column reference \"...\" is ambiguous" and every booking fails.
--
-- Rather than patch one column at a time, this rewrites the body so the final
-- credit-debit UPDATE references ONLY local variables (_new_used, _new_status)
-- on its SET-source side, and the conflict SELECT is fully table-qualified.
-- The signature and returned column names are unchanged, so the edge function
-- keeps working exactly as before. Idempotent (CREATE OR REPLACE).

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
  _new_used int;
  _new_status text;
BEGIN
  SELECT * INTO _existing FROM public.booking_pass_redemptions
   WHERE booking_pass_id = _pass_id AND idempotency_key = _idempotency_key;
  IF FOUND THEN
    SELECT * INTO _pass FROM public.booking_passes WHERE id = _pass_id;
    redemption_id := _existing.id;
    used_credits  := _pass.used_credits;
    total_credits := _pass.total_credits;
    status        := _pass.status;
    was_existing  := true;
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

  -- Slot conflict check, fully table-qualified.
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

  -- Debit a credit. Compute the new values into locals FIRST (from the already
  -- locked _pass row) so the UPDATE references no name that could collide with an
  -- OUT parameter (used_credits / total_credits / status).
  _new_used := _pass.used_credits + 1;
  _new_status := CASE WHEN _new_used >= _pass.total_credits THEN 'exhausted' ELSE 'active' END;

  UPDATE public.booking_passes
     SET used_credits = _new_used,
         status = _new_status
   WHERE id = _pass_id
   RETURNING * INTO _pass;

  redemption_id := _new_id;
  used_credits  := _pass.used_credits;
  total_credits := _pass.total_credits;
  status        := _pass.status;
  was_existing  := false;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_booking_pass(uuid, text, timestamptz, timestamptz, uuid, text, text, text) FROM public, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_booking_pass(uuid, text, timestamptz, timestamptz, uuid, text, text, text) TO service_role;
