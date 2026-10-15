CREATE OR REPLACE FUNCTION public.get_student_booking(_auth_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pass public.booking_passes%ROWTYPE;
  _result jsonb;
BEGIN
  UPDATE public.booking_passes
     SET status = 'expired'
   WHERE student_id = _auth_user_id AND status = 'active'
     AND expires_at IS NOT NULL AND expires_at < now();

  UPDATE public.booking_passes
     SET status = 'exhausted'
   WHERE student_id = _auth_user_id AND status = 'active'
     AND used_credits >= total_credits;

  SELECT * INTO _pass
    FROM public.booking_passes
   WHERE student_id = _auth_user_id AND status = 'active'
   ORDER BY created_at DESC
   LIMIT 1;

  _result := jsonb_build_object(
    'pass',
    CASE WHEN _pass.id IS NULL THEN NULL ELSE jsonb_build_object(
      'status', _pass.status,
      'total_credits', _pass.total_credits,
      'used_credits', _pass.used_credits,
      'credits_remaining', GREATEST(0, _pass.total_credits - _pass.used_credits),
      'session_length_minutes', _pass.session_length_minutes,
      'expires_at', _pass.expires_at
    ) END,
    'redemptions',
    COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.start_at)
      FROM (
        SELECT
          red.id,
          red.start_at,
          red.end_at,
          red.status,
          red.meet_url,
          red.reschedule_count,
          red.google_event_id,
          (red.status = 'booked'
            AND red.start_at > now()
            AND red.reschedule_count < 1) AS can_reschedule
        FROM public.booking_pass_redemptions red
        JOIN public.booking_passes bp ON bp.id = red.booking_pass_id
        WHERE bp.student_id = _auth_user_id
      ) r
    ), '[]'::jsonb)
  );

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_booking(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_booking(uuid) TO service_role;