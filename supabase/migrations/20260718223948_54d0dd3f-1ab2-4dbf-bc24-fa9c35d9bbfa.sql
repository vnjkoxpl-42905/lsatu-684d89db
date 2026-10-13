-- Student self-serve booking, phase 1 (core loop: grant -> book -> see in calendar).
ALTER TABLE public.booking_pass_redemptions
  ADD COLUMN IF NOT EXISTS reschedule_count int NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.booking_pass_redemptions'::regclass
      AND conname  = 'booking_pass_redemptions_reschedule_count_ck'
  ) THEN
    ALTER TABLE public.booking_pass_redemptions
      ADD CONSTRAINT booking_pass_redemptions_reschedule_count_ck
      CHECK (reschedule_count >= 0 AND reschedule_count <= 1);
  END IF;
END$$;

UPDATE public.booking_passes
   SET status = 'expired'
 WHERE status = 'active'
   AND expires_at IS NOT NULL
   AND expires_at < now();

WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY student_id ORDER BY created_at DESC, id DESC) AS rn
    FROM public.booking_passes
   WHERE status = 'active' AND student_id IS NOT NULL
)
UPDATE public.booking_passes b
   SET status = 'revoked'
  FROM ranked r
 WHERE b.id = r.id
   AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS one_active_pass_per_student
  ON public.booking_passes (student_id)
  WHERE status = 'active' AND student_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.grant_booking_access(
  _student_id   uuid,
  _student_name text,
  _student_email text,
  _total_credits int,
  _session_length_minutes int,
  _expires_at   timestamptz,
  _created_by   uuid,
  _token_hash   text
) RETURNS public.booking_passes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new public.booking_passes;
BEGIN
  IF _student_id IS NULL THEN
    RAISE EXCEPTION 'student_id_required' USING ERRCODE = 'P0400';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_student_id::text, 0));

  UPDATE public.booking_passes
     SET status = 'revoked'
   WHERE student_id = _student_id
     AND status = 'active';

  INSERT INTO public.booking_passes
    (token_hash, student_id, student_name, student_email,
     total_credits, session_length_minutes, expires_at, created_by)
  VALUES
    (_token_hash, _student_id, _student_name, _student_email,
     GREATEST(1, LEAST(50, _total_credits)),
     GREATEST(15, LEAST(480, COALESCE(_session_length_minutes, 60))),
     _expires_at, _created_by)
  RETURNING * INTO _new;

  RETURN _new;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_booking_access(uuid, text, text, int, int, timestamptz, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_booking_access(uuid, text, text, int, int, timestamptz, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_student_booking(_auth_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
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
      SELECT jsonb_agg(r ORDER BY r.start_at)
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