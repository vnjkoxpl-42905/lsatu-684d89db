-- Run only after the migration, in a privileged SQL session. Always rolls back.
BEGIN;
DO $$
DECLARE
  actor uuid;
  p uuid := gen_random_uuid();
  r uuid := gen_random_uuid();
  result jsonb;
  real_balance jsonb;
BEGIN
  SELECT user_id INTO actor FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  IF actor IS NULL THEN RAISE EXCEPTION 'fixture_requires_existing_admin'; END IF;
  PERFORM set_config('request.jwt.claim.sub', actor::text, true);
  SELECT jsonb_build_array(total_credits,used_credits) INTO real_balance
    FROM public.booking_passes WHERE id='7eeda40d-852a-43b6-8fe1-7ae44ddb88cc';
  IF real_balance IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.booking_pass_redemptions
      WHERE id='80e3ed7e-1abc-4730-b064-1b7a9ef318d6' AND credit_refunded)
      THEN RAISE EXCEPTION 'manual_replacement_reconciliation_missing'; END IF;
    result := public.admin_return_teacher_missed_credit('80e3ed7e-1abc-4730-b064-1b7a9ef318d6');
    IF NOT (result->>'already_returned')::boolean OR real_balance IS DISTINCT FROM (
      SELECT jsonb_build_array(total_credits,used_credits) FROM public.booking_passes
        WHERE id='7eeda40d-852a-43b6-8fe1-7ae44ddb88cc')
      THEN RAISE EXCEPTION 'manual_replacement_balance_changed'; END IF;
  END IF;
  INSERT INTO public.booking_passes(id,token_hash,total_credits,used_credits,status,created_by)
    VALUES(p, gen_random_uuid()::text, 1, 1, 'exhausted', actor);
  INSERT INTO public.booking_pass_redemptions(id,booking_pass_id,start_at,end_at,status,idempotency_key,google_event_id)
    VALUES(r,p,now()-interval '2 days',now()-interval '2 days'+interval '70 minutes','booked',gen_random_uuid()::text,'unchanged-smoke-calendar');
  result := public.admin_return_teacher_missed_credit(r);
  IF (result->>'already_returned')::boolean OR NOT EXISTS (
    SELECT 1 FROM public.booking_passes WHERE id=p AND used_credits=0 AND total_credits=1 AND status='active'
  ) THEN RAISE EXCEPTION 'first_return_failed'; END IF;
  result := public.admin_return_teacher_missed_credit(r);
  IF NOT (result->>'already_returned')::boolean OR NOT EXISTS (
    SELECT 1 FROM public.booking_pass_redemptions WHERE id=r AND credit_refunded
      AND status='booked' AND google_event_id='unchanged-smoke-calendar' AND teacher_missed_by=actor
  ) THEN RAISE EXCEPTION 'duplicate_or_history_guard_failed'; END IF;

  -- Manual replacement receipt records compensation without changing balances.
  UPDATE public.booking_passes SET used_credits=1,total_credits=2,
    notes='Replacement for redemption '||r::text||'. Already compensated; do not also refund this redemption.' WHERE id=p;
  UPDATE public.booking_pass_redemptions SET credit_refunded=false WHERE id=r;
  result := public.admin_return_teacher_missed_credit(r);
  IF NOT (result->>'already_returned')::boolean OR NOT EXISTS (
    SELECT 1 FROM public.booking_passes WHERE id=p AND used_credits=1 AND total_credits=2
  ) THEN RAISE EXCEPTION 'manual_compensation_guard_failed'; END IF;

  UPDATE public.booking_passes SET notes=NULL,status='expired',expires_at=now()-interval '1 day' WHERE id=p;
  UPDATE public.booking_pass_redemptions SET credit_refunded=false WHERE id=r;
  PERFORM public.admin_return_teacher_missed_credit(r);
  IF NOT EXISTS (SELECT 1 FROM public.booking_passes WHERE id=p AND status='expired' AND used_credits=0)
    THEN RAISE EXCEPTION 'expired_pass_reactivated'; END IF;

  UPDATE public.booking_pass_redemptions SET credit_refunded=false,
    start_at=now()+interval '1 day', end_at=now()+interval '1 day 70 minutes' WHERE id=r;
  BEGIN
    PERFORM public.admin_return_teacher_missed_credit(r);
    RAISE EXCEPTION 'future_session_accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'past_booked_session_required' THEN RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  BEGIN
    PERFORM public.admin_return_teacher_missed_credit(r);
    RAISE EXCEPTION 'non_admin_accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'forbidden' THEN RAISE; END IF;
  END;
END $$;
ROLLBACK;
