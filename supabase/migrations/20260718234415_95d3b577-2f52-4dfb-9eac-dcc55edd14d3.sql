CREATE OR REPLACE FUNCTION public.redeem_booking_pass(_pass_id uuid, _idempotency_key text, _start_at timestamp with time zone, _end_at timestamp with time zone, _schedule_event_id uuid, _google_event_id text, _student_name text, _student_email text)
 RETURNS TABLE(redemption_id uuid, used_credits integer, total_credits integer, status text, was_existing boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _pass public.booking_passes%ROWTYPE;
  _existing public.booking_pass_redemptions%ROWTYPE;
  _new_id uuid;
  _conflict_count int;
BEGIN
  SELECT * INTO _existing FROM public.booking_pass_redemptions bpr
   WHERE bpr.booking_pass_id = _pass_id AND bpr.idempotency_key = _idempotency_key;
  IF FOUND THEN
    SELECT * INTO _pass FROM public.booking_passes bp WHERE bp.id = _pass_id;
    redeem_booking_pass.redemption_id := _existing.id;
    redeem_booking_pass.used_credits := _pass.used_credits;
    redeem_booking_pass.total_credits := _pass.total_credits;
    redeem_booking_pass.status := _pass.status;
    redeem_booking_pass.was_existing := true;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO _pass FROM public.booking_passes bp WHERE bp.id = _pass_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pass_not_found';
  END IF;
  IF _pass.status <> 'active' THEN
    RAISE EXCEPTION 'pass_not_active:%', _pass.status;
  END IF;
  IF _pass.expires_at IS NOT NULL AND _pass.expires_at < now() THEN
    UPDATE public.booking_passes bp SET status = 'expired' WHERE bp.id = _pass_id;
    RAISE EXCEPTION 'pass_expired';
  END IF;
  IF _pass.used_credits >= _pass.total_credits THEN
    UPDATE public.booking_passes bp SET status = 'exhausted' WHERE bp.id = _pass_id;
    RAISE EXCEPTION 'pass_exhausted';
  END IF;

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

  UPDATE public.booking_passes bp
     SET used_credits = bp.used_credits + 1,
         status = CASE WHEN bp.used_credits + 1 >= bp.total_credits THEN 'exhausted' ELSE 'active' END
   WHERE bp.id = _pass_id
   RETURNING bp.* INTO _pass;

  redeem_booking_pass.redemption_id := _new_id;
  redeem_booking_pass.used_credits := _pass.used_credits;
  redeem_booking_pass.total_credits := _pass.total_credits;
  redeem_booking_pass.status := _pass.status;
  redeem_booking_pass.was_existing := false;
  RETURN NEXT;
END;
$function$;