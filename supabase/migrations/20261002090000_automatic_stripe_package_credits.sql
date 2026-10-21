-- New validated Checkout package payments credit passes automatically.
-- No data backfill: dismissed/granted/history rows remain untouched.
ALTER TABLE public.stripe_payments ADD COLUMN auto_grant_eligible boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.grant_stripe_package_locked(_payment_id uuid, _actor uuid)
RETURNS public.stripe_payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row public.stripe_payments%ROWTYPE;
  _offer public.booking_offers%ROWTYPE;
  _pass public.booking_passes%ROWTYPE;
  _creator uuid;
BEGIN
  SELECT * INTO _row FROM public.stripe_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_payment'; END IF;
  IF _row.grant_state <> 'awaiting' THEN RETURN _row; END IF;
  IF _row.student_id IS NULL THEN RAISE EXCEPTION 'link_a_student_first'; END IF;
  IF _row.status <> 'succeeded' OR _row.amount_refunded_cents <> 0 THEN RAISE EXCEPTION 'payment_not_settled'; END IF;
  SELECT * INTO _offer FROM public.booking_offers WHERE id = _row.offer_id AND provider = 'stripe';
  IF NOT FOUND OR _offer.credits <= 0 THEN RAISE EXCEPTION 'not_a_package_offer'; END IF;

  -- Different payments for a student also serialize, including their first pass.
  PERFORM pg_advisory_xact_lock(hashtextextended(_row.student_id::text, 0));
  SELECT * INTO _pass FROM public.booking_passes WHERE student_id = _row.student_id ORDER BY created_at DESC, id DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    UPDATE public.booking_passes SET total_credits = total_credits + _offer.credits, status = 'active', expires_at = NULL WHERE id = _pass.id;
  ELSE
    SELECT user_id INTO _creator FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1;
    _creator := COALESCE(_actor, _creator);
    IF _creator IS NULL THEN RAISE EXCEPTION 'pass_creator_missing'; END IF;
    INSERT INTO public.booking_passes (student_id, student_email, student_name, total_credits, used_credits, session_length_minutes, status, token_hash, created_by)
      VALUES (_row.student_id, _row.email, COALESCE(_row.payer_name, _row.email, 'Student'), _offer.credits, 0, 70, 'active',
        encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex'), _creator);
  END IF;
  INSERT INTO public.booking_commerce_events (student_id, offer_id, provider, provider_event_id, event_type, email, amount_cents, currency)
    VALUES (_row.student_id, _row.offer_id, 'stripe', 'charge:' || _row.stripe_charge_id, 'paid', _row.email, _row.amount_cents, _row.currency)
    ON CONFLICT (provider, provider_event_id, event_type) DO NOTHING;
  UPDATE public.stripe_payments SET grant_state = 'granted', granted_credits = _offer.credits, granted_at = now(), granted_by = _actor, updated_at = now()
    WHERE id = _payment_id RETURNING * INTO _row;
  RETURN _row;
END;
$$;
REVOKE ALL ON FUNCTION public.grant_stripe_package_locked(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_grant_stripe_payment(_payment_id uuid)
RETURNS public.stripe_payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.grant_stripe_package_locked(_payment_id, auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.admin_grant_stripe_payment(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_grant_stripe_payment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.auto_grant_stripe_payment(_charge_id text, _checkout_session_id text, _student_id uuid, _offer_id text)
RETURNS public.stripe_payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.stripe_payments%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _row FROM public.stripe_payments WHERE stripe_charge_id = _charge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_payment'; END IF;
  IF _row.grant_state <> 'awaiting' THEN RETURN _row; END IF;
  IF NOT _row.auto_grant_eligible OR _row.source <> 'webhook' OR _row.match_state <> 'matched'
     OR _row.checkout_session_id IS DISTINCT FROM _checkout_session_id
     OR _row.student_id IS DISTINCT FROM _student_id OR _row.offer_id IS DISTINCT FROM _offer_id
     OR NOT EXISTS (SELECT 1 FROM public.booking_offers WHERE id = _offer_id AND active AND provider = 'stripe')
  THEN RETURN _row; END IF;
  RETURN public.grant_stripe_package_locked(_row.id, NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.auto_grant_stripe_payment(text, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_grant_stripe_payment(text, text, uuid, text) TO service_role;
