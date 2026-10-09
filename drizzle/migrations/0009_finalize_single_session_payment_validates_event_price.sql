-- Checkout prices are now dynamic, sourced from booking_event_types.price_cents
-- for the booking's event_slug (with any per-email override), so finalization
-- must validate against that authoritative event type instead of the hard-coded
-- 4500/usd from 20260816020000_single_session_lifecycle.sql. Forward-only
-- replacement: locking, idempotency, calendar-conflict, refund, outbox and
-- security behaviour are unchanged.

CREATE OR REPLACE FUNCTION public.finalize_single_session_payment(
  _booking_id uuid,
  _provider_event_id text,
  _stripe_checkout_session_id text,
  _stripe_payment_intent_id text,
  _amount_cents integer,
  _currency text,
  _livemode boolean,
  _live_calendar_clear boolean,
  _cancel_token_hash text,
  _cancel_payload_ciphertext text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _booking public.single_session_bookings%ROWTYPE;
  _event public.booking_event_types%ROWTYPE;
  _claimed_booking_id uuid;
  _can_book boolean := false;
  _new_version integer;
  _slot_start timestamptz;
  _expected_cents integer;
  _expected_currency text;
BEGIN
  IF NULLIF(_provider_event_id, '') IS NULL
     OR NULLIF(_stripe_checkout_session_id, '') IS NULL
     OR NULLIF(_stripe_payment_intent_id, '') IS NULL
     OR _amount_cents IS NULL
     OR NULLIF(_currency, '') IS NULL
     OR _livemode IS NULL THEN
    RAISE EXCEPTION 'invalid_payment_facts' USING ERRCODE = 'P0400';
  END IF;

  SELECT start_at INTO _slot_start FROM public.single_session_bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0404'; END IF;
  PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_slot_start));
  SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _booking_id FOR UPDATE;
  SELECT * INTO _event FROM public.booking_event_types WHERE slug = _booking.event_slug;

  -- The event type is the price authority. A missing or inactive event type
  -- means there is nothing legitimate this payment could correspond to.
  IF _event.slug IS NULL OR COALESCE(_event.active, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'event_type_unavailable' USING ERRCODE = 'P0409';
  END IF;

  _expected_cents := COALESCE(
    public.booking_price_cents(_booking.event_slug, _booking.email),
    _event.price_cents
  );
  _expected_currency := lower(COALESCE(_event.currency, 'usd'));

  IF _expected_cents IS NULL
     OR _amount_cents <> _expected_cents
     OR lower(_currency) <> _expected_currency THEN
    RAISE EXCEPTION 'invalid_payment_facts' USING ERRCODE = 'P0400';
  END IF;

  SELECT single_session_booking_id INTO _claimed_booking_id
  FROM public.booking_commerce_events
  WHERE provider = 'stripe' AND provider_event_id = _provider_event_id
    AND event_type = 'single_session_paid';
  IF FOUND AND _claimed_booking_id IS DISTINCT FROM _booking_id THEN
    RAISE EXCEPTION 'provider_event_already_claimed' USING ERRCODE = 'P0409';
  END IF;

  IF _booking.stripe_checkout_session_id IS DISTINCT FROM _stripe_checkout_session_id THEN
    RAISE EXCEPTION 'checkout_mismatch' USING ERRCODE = 'P0409';
  END IF;

  IF _booking.status IN ('booked', 'cancelled', 'refund_pending', 'refunded', 'refund_failed') THEN
    IF _booking.stripe_payment_intent_id IS DISTINCT FROM _stripe_payment_intent_id
       OR _booking.amount_cents IS DISTINCT FROM _amount_cents
       OR lower(_booking.currency) IS DISTINCT FROM lower(_currency)
       OR _booking.livemode IS DISTINCT FROM _livemode THEN
      RAISE EXCEPTION 'payment_facts_mismatch' USING ERRCODE = 'P0409';
    END IF;
    INSERT INTO public.booking_commerce_events (
      provider, provider_event_id, event_type, offer_id, amount_cents, currency,
      payload, single_session_booking_id
    ) VALUES (
      'stripe', _provider_event_id, 'single_session_paid', 'single-session-native',
      _amount_cents, lower(_currency),
      jsonb_build_object('livemode', _livemode, 'checkout_session_id', _stripe_checkout_session_id),
      _booking_id
    ) ON CONFLICT (provider, provider_event_id, event_type) DO NOTHING;
    RETURN jsonb_build_object('booking_id', _booking.id, 'status', _booking.status,
      'lifecycle_version', _booking.lifecycle_version, 'was_existing', true);
  END IF;

  IF _booking.status NOT IN ('checkout_open', 'expired', 'abandoned') THEN
    RAISE EXCEPTION 'payment_not_finalizable' USING ERRCODE = 'P0409';
  END IF;

  INSERT INTO public.booking_commerce_events (
    provider, provider_event_id, event_type, offer_id, amount_cents, currency,
    payload, single_session_booking_id
  ) VALUES (
    'stripe', _provider_event_id, 'single_session_paid', 'single-session-native',
    _amount_cents, lower(_currency),
    jsonb_build_object('livemode', _livemode, 'checkout_session_id', _stripe_checkout_session_id),
    _booking_id
  ) ON CONFLICT (provider, provider_event_id, event_type) DO NOTHING;

  _can_book := _live_calendar_clear
    AND (_booking.status = 'checkout_open'
      OR (_booking.status = 'expired' AND _booking.status_changed_at >= now() - interval '10 minutes'))
    AND public.booking_slot_is_clear(
      _booking.start_at, _booking.end_at,
      COALESCE(_event.buffer_before_minutes, 0), COALESCE(_event.buffer_after_minutes, 0),
      _booking.id, _booking.gcal_event_id, NULL
    );

  IF _can_book THEN
    IF NULLIF(_cancel_token_hash, '') IS NULL OR NULLIF(_cancel_payload_ciphertext, '') IS NULL THEN
      RAISE EXCEPTION 'cancel_capability_required' USING ERRCODE = 'P0400';
    END IF;
    UPDATE public.single_session_bookings b SET
      status = 'booked', lifecycle_version = b.lifecycle_version + 1,
      stripe_payment_intent_id = _stripe_payment_intent_id,
      amount_cents = _amount_cents, currency = lower(_currency), livemode = _livemode,
      cancel_token_hash = _cancel_token_hash, cancel_token_expires_at = b.start_at,
      terminal_reason = NULL
    WHERE b.id = _booking_id RETURNING * INTO _booking;
    _new_version := _booking.lifecycle_version;

    PERFORM public.enqueue_single_session_outbox(_booking.id, 'gcal_promote', 'system', 'pending',
      'booked', _new_version, NULL);
    PERFORM public.enqueue_single_session_outbox(_booking.id, 'email_booking_confirmation', 'booker', 'blocked',
      'booked', _new_version, _cancel_payload_ciphertext);
    PERFORM public.enqueue_single_session_outbox(_booking.id, 'email_admin_notification', 'admin', 'blocked',
      'booked', _new_version, NULL);
  ELSE
    UPDATE public.single_session_bookings b SET
      status = 'refund_pending', lifecycle_version = b.lifecycle_version + 1,
      stripe_payment_intent_id = _stripe_payment_intent_id,
      amount_cents = _amount_cents, currency = lower(_currency), livemode = _livemode,
      terminal_reason = 'paid_slot_unavailable'
    WHERE b.id = _booking_id RETURNING * INTO _booking;
    _new_version := _booking.lifecycle_version;
    UPDATE public.single_session_outbox SET state = 'superseded', updated_at = now()
      WHERE booking_id = _booking.id AND state IN ('blocked', 'pending', 'failed')
        AND action IN ('gcal_promote', 'email_booking_confirmation', 'email_admin_notification');
    PERFORM public.enqueue_single_session_outbox(_booking.id, 'gcal_delete', 'system', 'pending',
      'refund_pending', _new_version, NULL);
    PERFORM public.enqueue_single_session_outbox(_booking.id, 'stripe_refund', 'system', 'pending',
      'refund_pending', _new_version, NULL);
  END IF;

  RETURN jsonb_build_object('booking_id', _booking.id, 'status', _booking.status,
    'lifecycle_version', _booking.lifecycle_version, 'was_existing', false);
END;
$function$;