-- Booking remediation Phase 5: student history independent of current pass and
-- overlap-safe availability persistence.

CREATE OR REPLACE FUNCTION public.get_student_booking(_auth_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pass public.booking_passes%ROWTYPE;
BEGIN
  UPDATE public.booking_passes
  SET status = 'expired'
  WHERE student_id = _auth_user_id AND status = 'active'
    AND expires_at IS NOT NULL AND expires_at <= now();

  UPDATE public.booking_passes
  SET status = 'exhausted'
  WHERE student_id = _auth_user_id AND status = 'active'
    AND used_credits >= total_credits;

  SELECT * INTO _pass
  FROM public.booking_passes
  WHERE student_id = _auth_user_id
  ORDER BY
    CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 WHEN 'exhausted' THEN 2
      WHEN 'expired' THEN 3 ELSE 4 END,
    created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'pass', CASE WHEN _pass.id IS NULL THEN NULL ELSE jsonb_build_object(
      'status', _pass.status,
      'total_credits', _pass.total_credits,
      'used_credits', _pass.used_credits,
      'credits_remaining', GREATEST(0, _pass.total_credits - _pass.used_credits),
      'session_length_minutes', _pass.session_length_minutes,
      'expires_at', _pass.expires_at
    ) END,
    'redemptions', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.start_at)
      FROM (
        SELECT red.id, red.start_at, red.end_at, red.status, red.meet_url,
          red.reschedule_count, red.google_event_id,
          red.calendar_status, red.submission_status,
          (red.status = 'booked' AND red.start_at > now() AND red.reschedule_count < 1) AS can_reschedule
        FROM public.booking_pass_redemptions red
        JOIN public.booking_passes bp ON bp.id = red.booking_pass_id
        WHERE bp.student_id = _auth_user_id
      ) r
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_booking(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_booking(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.set_booking_availability(_timezone text, _ranges jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _overlap boolean;
BEGIN
  IF _timezone IS NOT NULL AND length(_timezone) > 0 THEN
    PERFORM now() AT TIME ZONE _timezone;
  END IF;

  WITH parsed AS (
    SELECT (e->>'day_of_week')::int AS dow,
      (e->>'start_time')::time AS start_time,
      (e->>'end_time')::time AS end_time
    FROM jsonb_array_elements(COALESCE(_ranges, '[]'::jsonb)) e
  )
  SELECT EXISTS (
    SELECT 1 FROM parsed a JOIN parsed b
      ON a.dow = b.dow
      AND (a.start_time, a.end_time) <> (b.start_time, b.end_time)
      AND a.start_time < b.end_time AND a.end_time > b.start_time
  ) INTO _overlap;
  IF _overlap THEN
    RAISE EXCEPTION 'overlapping_availability_ranges' USING ERRCODE = 'P0400';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(_ranges, '[]'::jsonb)) e
    WHERE (e->>'day_of_week')::int NOT BETWEEN 0 AND 6
      OR (e->>'end_time')::time <= (e->>'start_time')::time
  ) THEN
    RAISE EXCEPTION 'invalid_availability_range' USING ERRCODE = 'P0400';
  END IF;

  IF _timezone IS NOT NULL AND length(_timezone) > 0 THEN
    UPDATE public.booking_availability_config
    SET timezone = _timezone, updated_at = now() WHERE id = 1;
  END IF;

  DELETE FROM public.booking_availability;
  INSERT INTO public.booking_availability(day_of_week, start_time, end_time)
  SELECT (e->>'day_of_week')::int, (e->>'start_time')::time, (e->>'end_time')::time
  FROM jsonb_array_elements(COALESCE(_ranges, '[]'::jsonb)) e;

  RETURN public.get_booking_availability();
END;
$$;

REVOKE ALL ON FUNCTION public.set_booking_availability(text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_booking_availability(text, jsonb) TO service_role;
