-- ===========================================================================
-- Fix: redeem_booking_pass_v2 credit-decrement UPDATE referenced used_credits/
-- total_credits unqualified; PL/pgSQL resolved them ambiguously against the
-- RETURNS TABLE out-params and every fresh booking failed with
-- 'column reference "used_credits" is ambiguous'. Qualify with a table alias.
-- Function body otherwise identical to 20260719010000.
-- ===========================================================================
-- 6. redeem_booking_pass_v2 — derives end, enforces slot policy in-txn, post-lock
--    idempotency recheck + 23505 handling. Inserts as gcal_state='pending'
--    (reserve-first state machine; the edge fn does Google after commit).
--    Codex R3 #1/#2/#5, R2 #3, R1 #5/#9.
-- ---------------------------------------------------------------------------
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
  -- Fast idempotency path (pre-lock): return the existing row unchanged.
  SELECT * INTO _existing FROM public.booking_pass_redemptions
   WHERE booking_pass_id = _pass_id AND idempotency_key = _idempotency_key;
  IF FOUND THEN
    SELECT * INTO _pass FROM public.booking_passes WHERE id = _pass_id;
    redemption_id := _existing.id; start_at := _existing.start_at; end_at := _existing.end_at;
    used_credits := _pass.used_credits; total_credits := _pass.total_credits;
    status := _pass.status; was_existing := true;
    RETURN NEXT; RETURN;
  END IF;

  -- Lock the pass to serialize concurrent redemptions of the last credit.
  SELECT * INTO _pass FROM public.booking_passes WHERE id = _pass_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'pass_not_found'; END IF;

  -- Post-lock idempotency recheck (Codex R3 #5): a concurrent request may have
  -- inserted the same (pass, key) between our pre-lock check and acquiring the
  -- lock. Re-read and return the existing row rather than racing to insert.
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

  -- End derived server-side from the pass length; caller cannot supply it.
  _end_at := _start_at + make_interval(mins => _pass.session_length_minutes);

  -- Server-side slot policy (lead / boundary / availability, host-tz, DST-safe).
  IF NOT public.is_slot_bookable(_start_at, _pass.session_length_minutes) THEN
    RAISE EXCEPTION 'slot_unavailable' USING ERRCODE = 'P0425';
  END IF;

  -- Buffered conflict vs other booked redemptions (the EXCLUDE constraint is the
  -- hard backstop; this gives a clean error before hitting it) ...
  SELECT COUNT(*) INTO _conflict
    FROM public.booking_pass_redemptions r
   WHERE r.status = 'booked'
     AND tstzrange(r.start_at - interval '15 minutes', r.end_at + interval '15 minutes')
         && tstzrange(_start_at - interval '15 minutes', _end_at + interval '15 minutes');
  IF _conflict > 0 THEN RAISE EXCEPTION 'slot_conflict' USING ERRCODE = 'P0409'; END IF;

  -- ... and vs the host's own calendar events (buffered).
  SELECT COUNT(*) INTO _conflict
    FROM public.schedule_events se
   WHERE se.deleted_at IS NULL AND se.status <> 'cancelled'
     AND (_schedule_event_id IS NULL OR se.id <> _schedule_event_id)
     AND se.start_at < _end_at   + interval '15 minutes'
     AND se.end_at   > _start_at - interval '15 minutes';
  IF _conflict > 0 THEN RAISE EXCEPTION 'slot_conflict' USING ERRCODE = 'P0409'; END IF;

  -- Reserve first: insert as pending (Google write happens after commit).
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
    -- Concurrent insert of the same idempotency key won the race: return it.
    SELECT * INTO _existing FROM public.booking_pass_redemptions
     WHERE booking_pass_id = _pass_id AND idempotency_key = _idempotency_key;
    redemption_id := _existing.id; start_at := _existing.start_at; end_at := _existing.end_at;
    used_credits := _pass.used_credits; total_credits := _pass.total_credits;
    status := _pass.status; was_existing := true;
    RETURN NEXT; RETURN;
  END;

  UPDATE public.booking_passes bp
     SET used_credits = bp.used_credits + 1,
         status = CASE WHEN bp.used_credits + 1 >= bp.total_credits THEN 'exhausted' ELSE 'active' END
   WHERE bp.id = _pass_id
   RETURNING * INTO _pass;

  redemption_id := _new_id; start_at := _start_at; end_at := _end_at;
  used_credits := _pass.used_credits; total_credits := _pass.total_credits;
  status := _pass.status; was_existing := false;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_booking_pass_v2(uuid, text, timestamptz, uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_booking_pass_v2(uuid, text, timestamptz, uuid, text, text) TO service_role;

