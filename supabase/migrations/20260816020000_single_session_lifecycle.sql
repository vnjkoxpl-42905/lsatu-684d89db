-- Native Single Session booking: authoritative slot policy and lifecycle RPCs.

CREATE OR REPLACE FUNCTION public.single_session_slot_lock_key(_start_at timestamptz)
RETURNS bigint
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT hashtextextended(
    'single-session-slot-day:' || ((_start_at AT TIME ZONE COALESCE(
      (SELECT timezone FROM public.booking_availability_config WHERE id = 1),
      'America/Toronto'
    ))::date)::text,
    0
  );
$$;

CREATE OR REPLACE FUNCTION public.single_session_booking_window_end(_now timestamptz DEFAULT now())
RETURNS date
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  _tz text := COALESCE(
    (SELECT timezone FROM public.booking_availability_config WHERE id = 1),
    'America/Toronto'
  );
  _day date := (_now AT TIME ZONE _tz)::date;
  _business_days integer := 0;
BEGIN
  WHILE _business_days < 6 LOOP
    IF extract(isodow FROM _day) BETWEEN 1 AND 5 THEN
      _business_days := _business_days + 1;
    END IF;
    IF _business_days < 6 THEN _day := _day + 1; END IF;
  END LOOP;
  RETURN _day;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_single_session_slot_bookable(
  _start_at timestamptz,
  _now timestamptz DEFAULT now()
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  _tz text := COALESCE(
    (SELECT timezone FROM public.booking_availability_config WHERE id = 1),
    'America/Toronto'
  );
  _local_start timestamp;
  _local_date date;
  _local_time time;
BEGIN
  IF _start_at IS NULL OR _start_at < _now + interval '24 hours' THEN RETURN false; END IF;

  _local_start := _start_at AT TIME ZONE _tz;
  _local_date := _local_start::date;
  _local_time := _local_start::time;

  IF _local_date < (_now AT TIME ZONE _tz)::date
     OR _local_date > public.single_session_booking_window_end(_now) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.booking_availability a
    WHERE a.day_of_week = extract(dow FROM _local_date)::integer
      AND _local_time >= a.start_time
      AND _local_time + interval '70 minutes' <= a.end_time
      AND mod(
        floor(extract(epoch FROM (_local_time - a.start_time)) / 60)::integer,
        70
      ) = 0
  );
EXCEPTION WHEN OTHERS THEN
  -- Invalid timezone/configuration is not permission to sell a slot.
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_single_session_outbox(
  _booking_id uuid,
  _action text,
  _recipient text,
  _state text,
  _precondition_status text,
  _precondition_lifecycle_version integer,
  _payload_ciphertext text DEFAULT NULL
) RETURNS public.single_session_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job public.single_session_outbox%ROWTYPE;
BEGIN
  INSERT INTO public.single_session_outbox (
    booking_id, action, recipient, state, idempotency_key,
    precondition_status, precondition_lifecycle_version, payload_ciphertext
  ) VALUES (
    _booking_id, _action, COALESCE(NULLIF(_recipient, ''), 'system'), _state,
    _booking_id::text || ':' || _action || ':' || COALESCE(NULLIF(_recipient, ''), 'system'),
    _precondition_status, _precondition_lifecycle_version, _payload_ciphertext
  )
  ON CONFLICT (booking_id, action, recipient) DO NOTHING
  RETURNING * INTO _job;

  IF NOT FOUND THEN
    SELECT * INTO _job FROM public.single_session_outbox
    WHERE booking_id = _booking_id AND action = _action
      AND recipient = COALESCE(NULLIF(_recipient, ''), 'system');
  END IF;
  RETURN _job;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_single_session_slot(
  _start_at timestamptz,
  _name text,
  _email text,
  _notes text,
  _guests jsonb,
  _client_idempotency_key text,
  _booking_token_hash text,
  _ip_hash text,
  _user_id uuid DEFAULT NULL
) RETURNS public.single_session_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking public.single_session_bookings%ROWTYPE;
  _end_at timestamptz := _start_at + interval '70 minutes';
  _email_normalized text := lower(trim(_email));
  _guests_normalized jsonb;
  _expired record;
BEGIN
  SELECT * INTO _booking FROM public.single_session_bookings
  WHERE client_idempotency_key = _client_idempotency_key;
  IF FOUND THEN
    PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_booking.start_at));
    SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _booking.id FOR UPDATE;
    RETURN _booking;
  END IF;

  IF _start_at IS NULL OR NOT public.is_single_session_slot_bookable(_start_at, now()) THEN
    RAISE EXCEPTION 'slot_unavailable' USING ERRCODE = 'P0425';
  END IF;
  IF NULLIF(trim(_name), '') IS NULL OR length(trim(_name)) > 200 THEN
    RAISE EXCEPTION 'invalid_name' USING ERRCODE = 'P0400';
  END IF;
  IF _email_normalized !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
     OR length(_email_normalized) > 320 THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = 'P0400';
  END IF;
  IF length(COALESCE(_notes, '')) > 4000 THEN
    RAISE EXCEPTION 'notes_too_long' USING ERRCODE = 'P0400';
  END IF;
  IF length(COALESCE(_client_idempotency_key, '')) NOT BETWEEN 8 AND 200
     OR length(COALESCE(_booking_token_hash, '')) NOT BETWEEN 16 AND 256
     OR length(COALESCE(_ip_hash, '')) NOT BETWEEN 16 AND 256 THEN
    RAISE EXCEPTION 'invalid_capability' USING ERRCODE = 'P0400';
  END IF;
  IF jsonb_typeof(COALESCE(_guests, '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(COALESCE(_guests, '[]'::jsonb)) > 10 THEN
    RAISE EXCEPTION 'invalid_guests' USING ERRCODE = 'P0400';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(g.email) ORDER BY g.email), '[]'::jsonb)
  INTO _guests_normalized
  FROM (
    SELECT DISTINCT lower(trim(value #>> '{}')) AS email
    FROM jsonb_array_elements(COALESCE(_guests, '[]'::jsonb))
    WHERE jsonb_typeof(value) = 'string'
      AND lower(trim(value #>> '{}')) <> _email_normalized
      AND lower(trim(value #>> '{}')) ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
  ) g;
  IF jsonb_array_length(_guests_normalized) <> jsonb_array_length(COALESCE(_guests, '[]'::jsonb)) THEN
    RAISE EXCEPTION 'invalid_or_duplicate_guests' USING ERRCODE = 'P0400';
  END IF;

  PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_start_at));

  FOR _expired IN
    UPDATE public.single_session_bookings b
      SET status = 'expired', lifecycle_version = b.lifecycle_version + 1,
          terminal_reason = 'authoritative_expiry'
    WHERE b.status IN ('draft', 'checkout_open')
      AND COALESCE(b.stripe_expires_at, b.draft_expires_at) <= now()
      AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange(_start_at, _end_at, '[)')
    RETURNING b.id, b.lifecycle_version, b.gcal_event_id
  LOOP
    IF _expired.gcal_event_id IS NOT NULL THEN
      PERFORM public.enqueue_single_session_outbox(
        _expired.id, 'gcal_delete', 'system', 'pending', 'expired',
        _expired.lifecycle_version, NULL
      );
    END IF;
  END LOOP;

  IF (SELECT count(*) FROM public.single_session_bookings b
      WHERE b.status IN ('draft', 'checkout_open')
        AND COALESCE(b.stripe_expires_at, b.draft_expires_at) > now()
        AND b.ip_hash = _ip_hash) >= 3 THEN
    RAISE EXCEPTION 'hold_cap_ip' USING ERRCODE = 'P0429';
  END IF;
  IF (SELECT count(*) FROM public.single_session_bookings b
      WHERE b.status IN ('draft', 'checkout_open')
        AND COALESCE(b.stripe_expires_at, b.draft_expires_at) > now()
        AND lower(b.email) = _email_normalized) >= 3 THEN
    RAISE EXCEPTION 'hold_cap_email' USING ERRCODE = 'P0429';
  END IF;
  IF (SELECT count(*) FROM public.single_session_bookings b
      WHERE b.status IN ('draft', 'checkout_open')
        AND COALESCE(b.stripe_expires_at, b.draft_expires_at) > now()) >= 250 THEN
    RAISE EXCEPTION 'hold_cap_global' USING ERRCODE = 'P0429';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.single_session_bookings b
    WHERE b.status IN ('draft', 'checkout_open', 'booked')
      AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange(_start_at, _end_at, '[)')
  ) OR EXISTS (
    SELECT 1 FROM public.booking_pass_redemptions r
    WHERE r.status = 'booked'
      AND tstzrange(r.start_at - interval '15 minutes', r.end_at + interval '15 minutes', '[)')
          && tstzrange(_start_at, _end_at, '[)')
  ) OR EXISTS (
    SELECT 1 FROM public.schedule_events se
    WHERE se.deleted_at IS NULL AND se.status <> 'cancelled'
      AND se.start_at < _end_at AND se.end_at > _start_at
  ) THEN
    RAISE EXCEPTION 'slot_conflict' USING ERRCODE = 'P0409';
  END IF;

  INSERT INTO public.single_session_bookings (
    start_at, end_at, name, email, notes, guests, client_idempotency_key,
    draft_expires_at, user_id, booking_token_hash, booking_token_expires_at, ip_hash
  ) VALUES (
    _start_at, _end_at, trim(_name), _email_normalized, NULLIF(trim(_notes), ''),
    _guests_normalized, _client_idempotency_key, now() + interval '5 minutes',
    _user_id, _booking_token_hash, now() + interval '24 hours', _ip_hash
  ) RETURNING * INTO _booking;

  RETURN _booking;
EXCEPTION WHEN exclusion_violation OR unique_violation THEN
  SELECT * INTO _booking FROM public.single_session_bookings
  WHERE client_idempotency_key = _client_idempotency_key;
  IF FOUND THEN RETURN _booking; END IF;
  RAISE EXCEPTION 'slot_conflict' USING ERRCODE = 'P0409';
END;
$$;

CREATE OR REPLACE FUNCTION public.set_single_session_tentative_event(
  _booking_id uuid,
  _expected_version integer,
  _gcal_event_id text
) RETURNS public.single_session_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _booking public.single_session_bookings%ROWTYPE;
BEGIN
  UPDATE public.single_session_bookings b
    SET gcal_event_id = _gcal_event_id
  WHERE b.id = _booking_id AND b.status = 'draft'
    AND b.lifecycle_version = _expected_version
    AND (b.gcal_event_id IS NULL OR b.gcal_event_id = _gcal_event_id)
  RETURNING * INTO _booking;
  IF NOT FOUND THEN RAISE EXCEPTION 'stale_booking' USING ERRCODE = 'P0409'; END IF;
  RETURN _booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.persist_single_session_checkout_fingerprint(
  _booking_id uuid,
  _expected_version integer,
  _fingerprint_ciphertext text
) RETURNS public.single_session_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _booking public.single_session_bookings%ROWTYPE;
BEGIN
  IF NULLIF(_fingerprint_ciphertext, '') IS NULL THEN
    RAISE EXCEPTION 'fingerprint_required' USING ERRCODE = 'P0400';
  END IF;
  UPDATE public.single_session_bookings b
    SET checkout_request_fingerprint = COALESCE(b.checkout_request_fingerprint, _fingerprint_ciphertext),
        checkout_fingerprint_disposition = 'persisted'
  WHERE b.id = _booking_id AND b.status = 'draft'
    AND b.lifecycle_version = _expected_version
    AND (b.checkout_request_fingerprint IS NULL OR b.checkout_request_fingerprint = _fingerprint_ciphertext)
  RETURNING * INTO _booking;
  IF NOT FOUND THEN RAISE EXCEPTION 'stale_booking' USING ERRCODE = 'P0409'; END IF;
  RETURN _booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_single_session_checkout(
  _booking_id uuid,
  _expected_version integer,
  _stripe_checkout_session_id text,
  _stripe_checkout_url text,
  _stripe_expires_at timestamptz
) RETURNS public.single_session_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _booking public.single_session_bookings%ROWTYPE;
BEGIN
  SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0404'; END IF;
  IF _booking.status = 'checkout_open' AND _booking.stripe_checkout_session_id = _stripe_checkout_session_id THEN
    RETURN _booking;
  END IF;
  IF _booking.status <> 'draft' OR _booking.lifecycle_version <> _expected_version
     OR _booking.checkout_request_fingerprint IS NULL THEN
    RAISE EXCEPTION 'stale_booking' USING ERRCODE = 'P0409';
  END IF;
  IF NULLIF(_stripe_checkout_session_id, '') IS NULL OR NULLIF(_stripe_checkout_url, '') IS NULL
     OR _stripe_expires_at <= now() THEN
    RAISE EXCEPTION 'invalid_checkout' USING ERRCODE = 'P0400';
  END IF;

  UPDATE public.single_session_bookings b SET
    status = 'checkout_open', lifecycle_version = b.lifecycle_version + 1,
    stripe_checkout_session_id = _stripe_checkout_session_id,
    stripe_checkout_url = _stripe_checkout_url,
    stripe_expires_at = _stripe_expires_at,
    checkout_request_fingerprint = NULL,
    checkout_fingerprint_disposition = 'attached'
  WHERE b.id = _booking_id
  RETURNING * INTO _booking;
  RETURN _booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_single_session_draft(
  _booking_id uuid,
  _expected_version integer,
  _reason text
) RETURNS public.single_session_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _booking public.single_session_bookings%ROWTYPE;
BEGIN
  UPDATE public.single_session_bookings b SET
    status = 'expired', lifecycle_version = b.lifecycle_version + 1,
    terminal_reason = COALESCE(NULLIF(_reason, ''), 'draft_failed')
  WHERE b.id = _booking_id AND b.status = 'draft' AND b.lifecycle_version = _expected_version
  RETURNING * INTO _booking;
  IF NOT FOUND THEN
    SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _booking_id;
    IF _booking.status = 'expired' THEN RETURN _booking; END IF;
    RAISE EXCEPTION 'stale_booking' USING ERRCODE = 'P0409';
  END IF;
  IF _booking.gcal_event_id IS NOT NULL THEN
    PERFORM public.enqueue_single_session_outbox(_booking.id, 'gcal_delete', 'system', 'pending',
      _booking.status, _booking.lifecycle_version, NULL);
  END IF;
  RETURN _booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_single_session_checkout(
  _booking_id uuid,
  _stripe_checkout_session_id text,
  _reason text
) RETURNS public.single_session_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _booking public.single_session_bookings%ROWTYPE;
BEGIN
  SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0404'; END IF;
  IF _booking.status = 'expired' THEN RETURN _booking; END IF;
  IF _booking.status <> 'checkout_open'
     OR _booking.stripe_checkout_session_id IS DISTINCT FROM _stripe_checkout_session_id THEN
    RAISE EXCEPTION 'stale_booking' USING ERRCODE = 'P0409';
  END IF;
  UPDATE public.single_session_bookings b SET
    status = 'expired', lifecycle_version = b.lifecycle_version + 1,
    terminal_reason = COALESCE(NULLIF(_reason, ''), 'checkout_expired')
  WHERE b.id = _booking_id RETURNING * INTO _booking;
  IF _booking.gcal_event_id IS NOT NULL THEN
    PERFORM public.enqueue_single_session_outbox(_booking.id, 'gcal_delete', 'system', 'pending',
      _booking.status, _booking.lifecycle_version, NULL);
  END IF;
  RETURN _booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.abandon_single_session_booking(
  _booking_id uuid,
  _booking_token_hash text
) RETURNS public.single_session_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _booking public.single_session_bookings%ROWTYPE;
BEGIN
  SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND OR _booking.booking_token_hash IS DISTINCT FROM _booking_token_hash
     OR _booking.booking_token_expires_at <= now() THEN
    RAISE EXCEPTION 'invalid_booking_token' USING ERRCODE = 'P0403';
  END IF;
  IF _booking.status = 'abandoned' THEN RETURN _booking; END IF;
  IF _booking.status <> 'checkout_open' THEN
    RAISE EXCEPTION 'abandon_not_allowed' USING ERRCODE = 'P0409';
  END IF;
  UPDATE public.single_session_bookings b SET
    status = 'abandoned', lifecycle_version = b.lifecycle_version + 1,
    terminal_reason = 'booker_abandoned'
  WHERE b.id = _booking_id RETURNING * INTO _booking;
  IF _booking.gcal_event_id IS NOT NULL THEN
    PERFORM public.enqueue_single_session_outbox(_booking.id, 'gcal_delete', 'system', 'pending',
      _booking.status, _booking.lifecycle_version, NULL);
  END IF;
  RETURN _booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_single_session_status(
  _stripe_checkout_session_id text,
  _booking_token_hash text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _booking public.single_session_bookings%ROWTYPE;
BEGIN
  SELECT * INTO _booking FROM public.single_session_bookings
  WHERE stripe_checkout_session_id = _stripe_checkout_session_id
    AND booking_token_hash = _booking_token_hash;
  IF NOT FOUND OR _booking.booking_token_expires_at <= now() THEN
    RAISE EXCEPTION 'invalid_booking_token' USING ERRCODE = 'P0403';
  END IF;
  RETURN jsonb_strip_nulls(jsonb_build_object(
    'id', _booking.id,
    'booking_id', _booking.id,
    'status', _booking.status,
    'start_at', _booking.start_at,
    'end_at', _booking.end_at,
    'meet_url', CASE WHEN _booking.status = 'booked' THEN _booking.meet_url ELSE NULL END,
    'calendar_pending', (_booking.status = 'booked' AND _booking.meet_url IS NULL)
  ));
END;
$$;

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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _booking public.single_session_bookings%ROWTYPE;
  _claimed_booking_id uuid;
  _can_book boolean := false;
  _new_version integer;
  _slot_start timestamptz;
BEGIN
  IF NULLIF(_provider_event_id, '') IS NULL
     OR NULLIF(_stripe_checkout_session_id, '') IS NULL
     OR NULLIF(_stripe_payment_intent_id, '') IS NULL
     OR _amount_cents <> 4500 OR lower(COALESCE(_currency, '')) <> 'usd'
     OR _livemode IS NULL THEN
    RAISE EXCEPTION 'invalid_payment_facts' USING ERRCODE = 'P0400';
  END IF;

  SELECT start_at INTO _slot_start FROM public.single_session_bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0404'; END IF;
  PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_slot_start));
  SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _booking_id FOR UPDATE;

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
    AND NOT EXISTS (
      SELECT 1 FROM public.single_session_bookings b
      WHERE b.id <> _booking.id AND b.status IN ('draft', 'checkout_open', 'booked')
        AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange(_booking.start_at, _booking.end_at, '[)')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.booking_pass_redemptions r
      WHERE r.status = 'booked'
        AND tstzrange(r.start_at - interval '15 minutes', r.end_at + interval '15 minutes', '[)')
            && tstzrange(_booking.start_at, _booking.end_at, '[)')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.schedule_events se
      WHERE se.deleted_at IS NULL AND se.status <> 'cancelled'
        AND (_booking.gcal_event_id IS NULL OR se.google_event_id IS DISTINCT FROM _booking.gcal_event_id)
        AND se.start_at < _booking.end_at AND se.end_at > _booking.start_at
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

CREATE OR REPLACE FUNCTION public.cancel_single_session_booking(_cancel_token_hash text)
RETURNS public.single_session_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _booking public.single_session_bookings%ROWTYPE;
BEGIN
  SELECT * INTO _booking FROM public.single_session_bookings
  WHERE cancel_token_hash = _cancel_token_hash FOR UPDATE;
  IF NOT FOUND OR _booking.cancel_token_expires_at <= now() THEN
    RAISE EXCEPTION 'invalid_cancel_token' USING ERRCODE = 'P0403';
  END IF;
  IF _booking.status = 'cancelled' THEN RETURN _booking; END IF;
  IF _booking.status <> 'booked' THEN
    RAISE EXCEPTION 'cancel_not_allowed' USING ERRCODE = 'P0409';
  END IF;
  UPDATE public.single_session_bookings b SET
    status = 'cancelled', lifecycle_version = b.lifecycle_version + 1,
    terminal_reason = 'booker_cancelled'
  WHERE b.id = _booking.id RETURNING * INTO _booking;

  UPDATE public.single_session_outbox SET state = 'superseded', updated_at = now()
  WHERE booking_id = _booking.id AND state IN ('blocked', 'pending', 'failed')
    AND action IN ('gcal_promote', 'email_booking_confirmation', 'email_admin_notification');
  PERFORM public.enqueue_single_session_outbox(_booking.id, 'gcal_delete', 'system', 'pending',
    'cancelled', _booking.lifecycle_version, NULL);
  PERFORM public.enqueue_single_session_outbox(_booking.id, 'email_cancellation', 'booker', 'pending',
    'cancelled', _booking.lifecycle_version, NULL);
  PERFORM public.enqueue_single_session_outbox(_booking.id, 'email_cancellation', 'admin', 'pending',
    'cancelled', _booking.lifecycle_version, NULL);
  RETURN _booking;
END;
$$;

-- Replace the package claim RPC so both engines serialize on the same host-day
-- advisory lock and inspect both occupancy tables while holding it.
CREATE OR REPLACE FUNCTION public.redeem_booking_pass_v2(
  _pass_id uuid,
  _idempotency_key text,
  _start_at timestamptz,
  _schedule_event_id uuid,
  _student_name text,
  _student_email text
) RETURNS TABLE (
  redemption_id uuid, start_at timestamptz, end_at timestamptz,
  used_credits int, total_credits int, status text, was_existing boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pass public.booking_passes%ROWTYPE;
  _existing public.booking_pass_redemptions%ROWTYPE;
  _end_at timestamptz;
  _new_id uuid;
BEGIN
  SELECT * INTO _existing FROM public.booking_pass_redemptions
    WHERE booking_pass_id = _pass_id AND idempotency_key = _idempotency_key;
  IF FOUND THEN
    PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_existing.start_at));
    SELECT * INTO _pass FROM public.booking_passes WHERE id = _pass_id;
    redemption_id := _existing.id; start_at := _existing.start_at; end_at := _existing.end_at;
    used_credits := _pass.used_credits; total_credits := _pass.total_credits;
    status := _pass.status; was_existing := true; RETURN NEXT; RETURN;
  END IF;

  SELECT * INTO _pass FROM public.booking_passes WHERE id = _pass_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'pass_not_found'; END IF;
  SELECT * INTO _existing FROM public.booking_pass_redemptions
    WHERE booking_pass_id = _pass_id AND idempotency_key = _idempotency_key;
  IF FOUND THEN
    PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_existing.start_at));
    redemption_id := _existing.id; start_at := _existing.start_at; end_at := _existing.end_at;
    used_credits := _pass.used_credits; total_credits := _pass.total_credits;
    status := _pass.status; was_existing := true; RETURN NEXT; RETURN;
  END IF;
  IF _pass.status <> 'active' THEN RAISE EXCEPTION 'pass_not_active:%', _pass.status; END IF;
  IF _pass.expires_at IS NOT NULL AND _pass.expires_at < now() THEN
    UPDATE public.booking_passes SET status = 'expired' WHERE id = _pass_id;
    RAISE EXCEPTION 'pass_expired';
  END IF;
  IF _pass.used_credits >= _pass.total_credits THEN
    UPDATE public.booking_passes SET status = 'exhausted' WHERE id = _pass_id;
    RAISE EXCEPTION 'pass_exhausted';
  END IF;
  _end_at := _start_at + make_interval(mins => _pass.session_length_minutes);
  IF NOT public.is_slot_bookable(_start_at, _pass.session_length_minutes) THEN
    RAISE EXCEPTION 'slot_unavailable' USING ERRCODE = 'P0425';
  END IF;

  PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_start_at));
  IF EXISTS (
    SELECT 1 FROM public.single_session_bookings b
    WHERE b.status IN ('draft', 'checkout_open', 'booked')
      AND tstzrange(b.start_at, b.end_at, '[)')
          && tstzrange(_start_at - interval '15 minutes', _end_at + interval '15 minutes', '[)')
  ) OR EXISTS (
    SELECT 1 FROM public.booking_pass_redemptions r
    WHERE r.status = 'booked'
      AND tstzrange(r.start_at - interval '15 minutes', r.end_at + interval '15 minutes', '[)')
          && tstzrange(_start_at - interval '15 minutes', _end_at + interval '15 minutes', '[)')
  ) OR EXISTS (
    SELECT 1 FROM public.schedule_events se
    WHERE se.deleted_at IS NULL AND se.status <> 'cancelled'
      AND (_schedule_event_id IS NULL OR se.id <> _schedule_event_id)
      AND se.start_at < _end_at + interval '15 minutes'
      AND se.end_at > _start_at - interval '15 minutes'
  ) THEN RAISE EXCEPTION 'slot_conflict' USING ERRCODE = 'P0409'; END IF;

  BEGIN
    INSERT INTO public.booking_pass_redemptions (
      booking_pass_id, schedule_event_id, google_event_id, start_at, end_at,
      status, idempotency_key, student_name_snapshot, student_email_snapshot,
      gcal_state, needs_gcal_sync
    ) VALUES (
      _pass_id, _schedule_event_id, NULL, _start_at, _end_at, 'booked',
      _idempotency_key, _student_name, _student_email, 'pending', true
    ) RETURNING id INTO _new_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO _existing FROM public.booking_pass_redemptions
      WHERE booking_pass_id = _pass_id AND idempotency_key = _idempotency_key;
    redemption_id := _existing.id; start_at := _existing.start_at; end_at := _existing.end_at;
    used_credits := _pass.used_credits; total_credits := _pass.total_credits;
    status := _pass.status; was_existing := true; RETURN NEXT; RETURN;
  END;
  UPDATE public.booking_passes bp SET
    used_credits = bp.used_credits + 1,
    status = CASE WHEN bp.used_credits + 1 >= bp.total_credits THEN 'exhausted' ELSE 'active' END
  WHERE bp.id = _pass_id RETURNING * INTO _pass;
  redemption_id := _new_id; start_at := _start_at; end_at := _end_at;
  used_credits := _pass.used_credits; total_credits := _pass.total_credits;
  status := _pass.status; was_existing := false; RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.single_session_slot_lock_key(timestamptz) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.single_session_booking_window_end(timestamptz) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_single_session_slot_bookable(timestamptz, timestamptz) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_single_session_outbox(uuid, text, text, text, text, integer, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_single_session_slot(timestamptz, text, text, text, jsonb, text, text, text, uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_single_session_tentative_event(uuid, integer, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.persist_single_session_checkout_fingerprint(uuid, integer, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_single_session_checkout(uuid, integer, text, text, timestamptz) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_single_session_draft(uuid, integer, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_single_session_checkout(uuid, text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.abandon_single_session_booking(uuid, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_single_session_status(text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_single_session_payment(uuid, text, text, text, integer, text, boolean, boolean, text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_single_session_booking(text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_booking_pass_v2(uuid, text, timestamptz, uuid, text, text) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.single_session_slot_lock_key(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.single_session_booking_window_end(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_single_session_slot_bookable(timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_single_session_outbox(uuid, text, text, text, text, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_single_session_slot(timestamptz, text, text, text, jsonb, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_single_session_tentative_event(uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.persist_single_session_checkout_fingerprint(uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_single_session_checkout(uuid, integer, text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_single_session_draft(uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_single_session_checkout(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.abandon_single_session_booking(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_single_session_status(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_single_session_payment(uuid, text, text, text, integer, text, boolean, boolean, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_single_session_booking(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_booking_pass_v2(uuid, text, timestamptz, uuid, text, text) TO service_role;
