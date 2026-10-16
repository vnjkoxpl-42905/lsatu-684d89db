-- Persist the facts shown after checkout and remove the legacy $45-only
-- assumption from paid booking finalization.

ALTER TABLE public.single_session_bookings
  ADD COLUMN IF NOT EXISTS booker_timezone text,
  ADD COLUMN IF NOT EXISTS quoted_amount_cents integer,
  ADD COLUMN IF NOT EXISTS quoted_currency text;

UPDATE public.single_session_bookings
SET booker_timezone = COALESCE(booker_timezone, 'America/Toronto')
WHERE booker_timezone IS NULL;

-- Keep this column nullable with no default. The internal claim inserts first,
-- then the public wrapper fills the validated timezone in the same transaction.
-- COALESCE below consequently preserves the original value on every replay.

ALTER TABLE public.single_session_bookings
  DROP CONSTRAINT IF EXISTS single_session_quoted_amount_nonnegative_chk,
  ADD CONSTRAINT single_session_quoted_amount_nonnegative_chk
    CHECK (quoted_amount_cents IS NULL OR quoted_amount_cents >= 0);

-- Keep the proven slot-claim transaction intact behind a private compatibility
-- function, then atomically attach the validated display timezone and immutable
-- checkout quote to the returned booking.
ALTER FUNCTION public.claim_single_session_slot(
  timestamptz, text, text, text, jsonb, text, text, text, uuid, text
) RENAME TO claim_single_session_slot_without_confirmation_details;

REVOKE ALL ON FUNCTION public.claim_single_session_slot_without_confirmation_details(
  timestamptz, text, text, text, jsonb, text, text, text, uuid, text
) FROM public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_single_session_slot(
  _start_at timestamptz,
  _name text,
  _email text,
  _notes text,
  _guests jsonb,
  _client_idempotency_key text,
  _booking_token_hash text,
  _ip_hash text,
  _user_id uuid DEFAULT NULL,
  _event_slug text DEFAULT 'single-session',
  _booker_timezone text DEFAULT 'America/Toronto'
) RETURNS public.single_session_bookings
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking public.single_session_bookings%ROWTYPE;
  _timezone text := NULLIF(trim(_booker_timezone), '');
  _amount integer;
  _currency text;
BEGIN
  IF _timezone IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = _timezone
  ) THEN
    RAISE EXCEPTION 'invalid_timezone' USING ERRCODE = 'P0400';
  END IF;

  _booking := public.claim_single_session_slot_without_confirmation_details(
    _start_at, _name, _email, _notes, _guests, _client_idempotency_key,
    _booking_token_hash, _ip_hash, _user_id, _event_slug
  );

  _amount := public.booking_price_cents(_booking.event_slug, _booking.email);
  SELECT lower(currency) INTO _currency
  FROM public.booking_event_types WHERE slug = _booking.event_slug;
  IF _amount IS NULL OR _currency IS NULL THEN
    RAISE EXCEPTION 'invalid_event_price' USING ERRCODE = 'P0400';
  END IF;

  UPDATE public.single_session_bookings b
  SET booker_timezone = COALESCE(b.booker_timezone, _timezone),
      quoted_amount_cents = COALESCE(b.quoted_amount_cents, _amount),
      quoted_currency = COALESCE(b.quoted_currency, _currency)
  WHERE b.id = _booking.id
  RETURNING * INTO _booking;

  RETURN _booking;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_single_session_slot(
  timestamptz, text, text, text, jsonb, text, text, text, uuid, text, text
) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_single_session_slot(
  timestamptz, text, text, text, jsonb, text, text, text, uuid, text, text
) TO service_role;

-- One capability-protected status contract for paid checkout redirects and
-- free bookings, which have no Stripe checkout session.
DROP FUNCTION IF EXISTS public.get_single_session_status(text, text);

CREATE OR REPLACE FUNCTION public.get_single_session_status(
  _stripe_checkout_session_id text DEFAULT NULL,
  _booking_token_hash text DEFAULT NULL,
  _booking_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking public.single_session_bookings%ROWTYPE;
  _event public.booking_event_types%ROWTYPE;
  _calendar_url text;
  _calendar_ready boolean;
BEGIN
  IF NULLIF(_booking_token_hash, '') IS NULL
     OR (NULLIF(_stripe_checkout_session_id, '') IS NULL AND _booking_id IS NULL) THEN
    RAISE EXCEPTION 'invalid_booking_token' USING ERRCODE = 'P0403';
  END IF;

  SELECT * INTO _booking
  FROM public.single_session_bookings b
  WHERE b.booking_token_hash = _booking_token_hash
    AND (
      (_booking_id IS NOT NULL AND b.id = _booking_id)
      OR (NULLIF(_stripe_checkout_session_id, '') IS NOT NULL
          AND b.stripe_checkout_session_id = _stripe_checkout_session_id)
    );
  IF NOT FOUND OR _booking.booking_token_expires_at <= now() THEN
    RAISE EXCEPTION 'invalid_booking_token' USING ERRCODE = 'P0403';
  END IF;

  SELECT * INTO _event FROM public.booking_event_types WHERE slug = _booking.event_slug;
  SELECT se.html_link INTO _calendar_url
  FROM public.schedule_events se
  WHERE se.google_event_id = _booking.gcal_event_id
    AND se.deleted_at IS NULL
  LIMIT 1;

  _calendar_ready := _booking.status = 'booked'
    AND NULLIF(_booking.meet_url, '') IS NOT NULL
    AND NULLIF(_calendar_url, '') IS NOT NULL;

  RETURN jsonb_strip_nulls(jsonb_build_object(
    'id', _booking.id,
    'booking_id', _booking.id,
    'status', _booking.status,
    'start_at', _booking.start_at,
    'end_at', _booking.end_at,
    'attendee_name', _booking.name,
    'event_label', COALESCE(_event.label, 'LSAT Session'),
    'duration_minutes', round(extract(epoch FROM (_booking.end_at - _booking.start_at)) / 60)::integer,
    'timezone', COALESCE(_booking.booker_timezone, 'America/Toronto'),
    'meet_url', CASE WHEN _booking.status = 'booked' THEN _booking.meet_url ELSE NULL END,
    'calendar_url', CASE WHEN _booking.status = 'booked' THEN _calendar_url ELSE NULL END,
    'calendar_ready', _calendar_ready,
    'calendar_pending', (_booking.status = 'booked' AND NOT _calendar_ready)
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.get_single_session_status(text, text, uuid)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_single_session_status(text, text, uuid)
  TO service_role;

-- Validate the paid event against the amount quoted when the hold was claimed.
-- Existing in-flight rows fall back to the current event/override resolver.
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
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking public.single_session_bookings%ROWTYPE;
  _event public.booking_event_types%ROWTYPE;
  _claimed_booking_id uuid;
  _can_book boolean := false;
  _new_version integer;
  _slot_start timestamptz;
  _expected_amount integer;
  _expected_currency text;
BEGIN
  IF NULLIF(_provider_event_id, '') IS NULL
     OR NULLIF(_stripe_checkout_session_id, '') IS NULL
     OR NULLIF(_stripe_payment_intent_id, '') IS NULL
     OR _amount_cents IS NULL OR _amount_cents < 0
     OR NULLIF(lower(COALESCE(_currency, '')), '') IS NULL
     OR _livemode IS NULL THEN
    RAISE EXCEPTION 'invalid_payment_facts' USING ERRCODE = 'P0400';
  END IF;

  SELECT start_at INTO _slot_start FROM public.single_session_bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0404'; END IF;
  PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_slot_start));
  SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _booking_id FOR UPDATE;
  SELECT * INTO _event FROM public.booking_event_types WHERE slug = _booking.event_slug;
  IF NOT FOUND OR _event.requires_payment IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'payment_not_required' USING ERRCODE = 'P0400';
  END IF;

  _expected_amount := COALESCE(
    _booking.quoted_amount_cents,
    public.booking_price_cents(_booking.event_slug, _booking.email)
  );
  _expected_currency := lower(COALESCE(_booking.quoted_currency, _event.currency));
  IF _amount_cents IS DISTINCT FROM _expected_amount
     OR lower(_currency) IS DISTINCT FROM _expected_currency THEN
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
      'stripe', _provider_event_id, 'single_session_paid', _booking.event_slug,
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
    'stripe', _provider_event_id, 'single_session_paid', _booking.event_slug,
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
$$;

REVOKE ALL ON FUNCTION public.finalize_single_session_payment(
  uuid, text, text, text, integer, text, boolean, boolean, text, text
) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_single_session_payment(
  uuid, text, text, text, integer, text, boolean, boolean, text, text
) TO service_role;
