-- Return a consumed credit without cancelling a historical calendar invitation.
ALTER TABLE public.booking_pass_redemptions
  ADD COLUMN teacher_missed_at timestamptz,
  ADD COLUMN teacher_missed_by uuid REFERENCES auth.users(id);

-- This session was already compensated by an authorized +1 total-credit update.
-- Only reconcile its marker when the exact durable receipt is present.
UPDATE public.booking_pass_redemptions r
SET credit_refunded = true,
    teacher_missed_at = now()
FROM public.booking_passes p
WHERE r.id = '80e3ed7e-1abc-4730-b064-1b7a9ef318d6'
  AND r.booking_pass_id = '7eeda40d-852a-43b6-8fe1-7ae44ddb88cc'
  AND p.id = r.booking_pass_id
  AND p.notes LIKE '%redemption 80e3ed7e-1abc-4730-b064-1b7a9ef318d6%'
  AND p.notes LIKE '%Already compensated; do not also refund this redemption.%'
  AND NOT r.credit_refunded;

CREATE OR REPLACE FUNCTION public.admin_return_teacher_missed_credit(_redemption_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r public.booking_pass_redemptions%ROWTYPE;
  _p public.booking_passes%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _r FROM public.booking_pass_redemptions WHERE id = _redemption_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'redemption_not_found'; END IF;
  SELECT * INTO _p FROM public.booking_passes WHERE id = _r.booking_pass_id FOR UPDATE;
  IF _r.credit_refunded THEN
    RETURN jsonb_build_object('already_returned', true);
  END IF;
  -- Protect manually compensated sessions even if reconciliation was deferred.
  IF EXISTS (SELECT 1 FROM unnest(string_to_array(COALESCE(_p.notes, ''), E'\n')) AS receipt(line)
    WHERE line LIKE ('%redemption ' || _r.id::text || '%')
      AND line LIKE '%Already compensated; do not also refund this redemption.%')
  THEN
    UPDATE public.booking_pass_redemptions SET credit_refunded = true,
      teacher_missed_at = now(), teacher_missed_by = auth.uid() WHERE id = _r.id;
    RETURN jsonb_build_object('already_returned', true);
  END IF;
  IF _r.status NOT IN ('booked', 'no_show') OR _r.start_at > now() THEN
    RAISE EXCEPTION 'past_booked_session_required';
  END IF;
  IF _p.used_credits <= 0 THEN RAISE EXCEPTION 'no_consumed_credit'; END IF;
  UPDATE public.booking_passes SET used_credits = used_credits - 1,
    status = CASE WHEN status = 'exhausted' AND (expires_at IS NULL OR expires_at > now())
      THEN 'active' ELSE status END WHERE id = _p.id;
  UPDATE public.booking_pass_redemptions SET credit_refunded = true,
    teacher_missed_at = now(), teacher_missed_by = auth.uid() WHERE id = _r.id;
  RETURN jsonb_build_object('already_returned', false);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_return_teacher_missed_credit(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_return_teacher_missed_credit(uuid) TO authenticated;
