-- Stripe payments ledger: one row per Stripe charge, the teacher's view of
-- every transaction. Rows are written by the booking-commerce-webhook (live)
-- and the stripe-sync function (backfill + manual refresh), both service role.
--
-- A payment never grants anything by itself (decisions/log.md, 2026-09-27):
--   * a recognized package payment waits in grant_state 'awaiting' until the
--     teacher confirms, then admin_grant_stripe_payment tops up the pass;
--   * a payer we cannot match sits with match_state 'unmatched' until the
--     teacher links a student.

CREATE TABLE IF NOT EXISTS public.stripe_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_charge_id text NOT NULL UNIQUE,
  payment_intent_id text,
  checkout_session_id text,
  payment_link_id text,
  customer_id text,
  email text,
  payer_name text,
  description text,
  product text,
  amount_cents integer NOT NULL,
  amount_refunded_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL,
  status text NOT NULL CHECK (status IN ('succeeded','pending','failed','refunded','partially_refunded','disputed')),
  paid_at timestamptz NOT NULL,
  livemode boolean NOT NULL,
  student_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  match_state text NOT NULL DEFAULT 'unmatched' CHECK (match_state IN ('matched','unmatched','linked','ignored')),
  offer_id text REFERENCES public.booking_offers(id) ON DELETE SET NULL,
  grant_state text NOT NULL DEFAULT 'none' CHECK (grant_state IN ('none','awaiting','granted','dismissed')),
  granted_credits integer,
  granted_at timestamptz,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'webhook' CHECK (source IN ('webhook','backfill')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_payments_paid_at_idx ON public.stripe_payments (paid_at DESC);
CREATE INDEX IF NOT EXISTS stripe_payments_student_idx ON public.stripe_payments (student_id);
CREATE INDEX IF NOT EXISTS stripe_payments_email_idx ON public.stripe_payments (lower(email));

ALTER TABLE public.stripe_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_stripe_payments" ON public.stripe_payments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Last successful sync, so the teacher can see the ledger is current.
CREATE TABLE IF NOT EXISTS public.stripe_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  since timestamptz NOT NULL,
  charges_seen integer NOT NULL DEFAULT 0,
  rows_written integer NOT NULL DEFAULT 0,
  error text
);
ALTER TABLE public.stripe_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_read_stripe_sync_runs" ON public.stripe_sync_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Teacher links an unmatched (or wrongly matched) payment to a student.
CREATE OR REPLACE FUNCTION public.admin_link_stripe_payment(_payment_id uuid, _student_id uuid)
RETURNS public.stripe_payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.stripe_payments%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.stripe_payments
    SET student_id = _student_id,
        match_state = CASE WHEN _student_id IS NULL THEN 'ignored' ELSE 'linked' END,
        grant_state = CASE
          WHEN grant_state = 'none' AND offer_id IS NOT NULL AND _student_id IS NOT NULL AND status = 'succeeded' THEN 'awaiting'
          ELSE grant_state END,
        updated_at = now()
    WHERE id = _payment_id RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_payment'; END IF;
  RETURN _row;
END;
$$;

-- Teacher confirms a package payment: add its credits to the student's pass.
-- Idempotent: a payment already granted returns unchanged.
CREATE OR REPLACE FUNCTION public.admin_grant_stripe_payment(_payment_id uuid)
RETURNS public.stripe_payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row public.stripe_payments%ROWTYPE;
  _offer public.booking_offers%ROWTYPE;
  _pass public.booking_passes%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _row FROM public.stripe_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_payment'; END IF;
  IF _row.grant_state = 'granted' THEN RETURN _row; END IF;
  IF _row.student_id IS NULL THEN RAISE EXCEPTION 'link_a_student_first'; END IF;
  IF _row.status <> 'succeeded' THEN RAISE EXCEPTION 'payment_not_settled'; END IF;
  SELECT * INTO _offer FROM public.booking_offers WHERE id = _row.offer_id AND provider = 'stripe';
  IF NOT FOUND OR _offer.credits <= 0 THEN RAISE EXCEPTION 'not_a_package_offer'; END IF;

  SELECT * INTO _pass FROM public.booking_passes WHERE student_id = _row.student_id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    UPDATE public.booking_passes
      SET total_credits = total_credits + _offer.credits, status = 'active', expires_at = NULL
      WHERE id = _pass.id;
  ELSE
    INSERT INTO public.booking_passes (student_id, student_email, student_name, total_credits, used_credits, session_length_minutes, status)
      VALUES (_row.student_id, _row.email, COALESCE(_row.payer_name, _row.email, 'Student'), _offer.credits, 0, 70, 'active');
  END IF;

  INSERT INTO public.booking_commerce_events (student_id, offer_id, provider, provider_event_id, event_type, email, amount_cents, currency)
    VALUES (_row.student_id, _row.offer_id, 'stripe', 'charge:' || _row.stripe_charge_id, 'paid', _row.email, _row.amount_cents, _row.currency)
    ON CONFLICT (provider, provider_event_id, event_type) DO NOTHING;

  UPDATE public.stripe_payments
    SET grant_state = 'granted', granted_credits = _offer.credits, granted_at = now(), granted_by = auth.uid(), updated_at = now()
    WHERE id = _payment_id RETURNING * INTO _row;
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_dismiss_stripe_payment(_payment_id uuid)
RETURNS public.stripe_payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.stripe_payments%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.stripe_payments
    SET grant_state = CASE WHEN grant_state = 'awaiting' THEN 'dismissed' ELSE grant_state END,
        match_state = CASE WHEN match_state = 'unmatched' THEN 'ignored' ELSE match_state END,
        updated_at = now()
    WHERE id = _payment_id RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_payment'; END IF;
  RETURN _row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_link_stripe_payment(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_grant_stripe_payment(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_dismiss_stripe_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_link_stripe_payment(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_stripe_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dismiss_stripe_payment(uuid) TO authenticated;
