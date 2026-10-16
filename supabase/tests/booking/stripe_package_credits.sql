-- Run as database owner after migration. Entire fixture transaction rolls back.
-- Synthetic user/offer/charges only; no real student or payment is updated.
BEGIN;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
DO $$
DECLARE
  student uuid := gen_random_uuid();
  offer text := 'credit-smoke-' || gen_random_uuid()::text;
  charge text := 'ch_smoke_' || gen_random_uuid()::text;
  payment_id uuid;
  result public.stripe_payments;
  balance integer;
  state text;
BEGIN
  IF has_function_privilege('authenticated', 'public.auto_grant_stripe_payment(text,text,uuid,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.auto_grant_stripe_payment(text,text,uuid,text)', 'EXECUTE')
     OR has_function_privilege('service_role', 'public.grant_stripe_package_locked(uuid,uuid)', 'EXECUTE')
  THEN RAISE EXCEPTION 'unsafe_function_permissions'; END IF;
  INSERT INTO auth.users (id, email) VALUES (student, student::text || '@example.invalid');
  INSERT INTO public.booking_offers (id, label, provider, provider_ref, url, credits)
    VALUES (offer, 'Rollback smoke test', 'stripe', 'plink_' || offer, 'https://example.invalid', 5);
  INSERT INTO public.stripe_payments (stripe_charge_id, checkout_session_id, amount_cents, currency, status, paid_at, livemode, student_id, match_state, offer_id, grant_state, source, auto_grant_eligible)
    VALUES (charge, 'cs_smoke', 20000, 'usd', 'succeeded', now(), true, student, 'matched', offer, 'awaiting', 'webhook', true) RETURNING id INTO payment_id;

  -- Caller/identity failures do not mutate balances.
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  BEGIN
    PERFORM public.auto_grant_stripe_payment(charge, 'cs_smoke', student, offer);
    RAISE EXCEPTION 'non_service_caller_accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'forbidden' THEN RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  result := public.auto_grant_stripe_payment(charge, 'wrong_session', student, offer);
  IF result.grant_state <> 'awaiting' THEN RAISE EXCEPTION 'mismatch_credited'; END IF;
  result := public.auto_grant_stripe_payment(charge, 'cs_smoke', student, offer);
  IF result.grant_state <> 'granted' OR result.granted_credits <> 5 OR result.granted_by IS NOT NULL THEN RAISE EXCEPTION 'grant_failed'; END IF;
  PERFORM public.auto_grant_stripe_payment(charge, 'cs_smoke', student, offer);
  SELECT total_credits INTO balance FROM public.booking_passes WHERE student_id = student;
  IF balance <> 5 OR (SELECT count(*) FROM public.booking_passes WHERE student_id = student) <> 1 THEN RAISE EXCEPTION 'duplicate_or_first_pass_failed'; END IF;

  FOR state IN SELECT unnest(ARRAY['dismissed','none']) LOOP
    UPDATE public.stripe_payments SET grant_state = state WHERE id = payment_id;
    result := public.auto_grant_stripe_payment(charge, 'cs_smoke', student, offer);
    IF result.grant_state <> state THEN RAISE EXCEPTION 'protected_state_changed:%', state; END IF;
  END LOOP;
  UPDATE public.stripe_payments SET grant_state = 'awaiting', auto_grant_eligible = false WHERE id = payment_id;
  result := public.auto_grant_stripe_payment(charge, 'cs_smoke', student, offer);
  IF result.grant_state <> 'awaiting' THEN RAISE EXCEPTION 'pre_rollout_payment_credited'; END IF;
  UPDATE public.stripe_payments SET auto_grant_eligible = true WHERE id = payment_id;
  UPDATE public.stripe_payments SET grant_state = 'awaiting', match_state = 'unmatched' WHERE id = payment_id;
  result := public.auto_grant_stripe_payment(charge, 'cs_smoke', student, offer);
  IF result.grant_state <> 'awaiting' THEN RAISE EXCEPTION 'unmatched_credited'; END IF;
  UPDATE public.stripe_payments SET match_state = 'matched', source = 'backfill' WHERE id = payment_id;
  result := public.auto_grant_stripe_payment(charge, 'cs_smoke', student, offer);
  IF result.grant_state <> 'awaiting' THEN RAISE EXCEPTION 'history_credited'; END IF;
  UPDATE public.stripe_payments SET source = 'webhook', status = 'refunded' WHERE id = payment_id;
  BEGIN
    PERFORM public.auto_grant_stripe_payment(charge, 'cs_smoke', student, offer);
    RAISE EXCEPTION 'refund_credited';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'payment_not_settled' THEN RAISE; END IF;
  END;
  SELECT total_credits INTO balance FROM public.booking_passes WHERE student_id = student;
  IF balance <> 5 THEN RAISE EXCEPTION 'protected_payment_added_credits'; END IF;
  RAISE NOTICE 'stripe_package_credits: all checks passed; rollback follows';
END;
$$;
ROLLBACK;
