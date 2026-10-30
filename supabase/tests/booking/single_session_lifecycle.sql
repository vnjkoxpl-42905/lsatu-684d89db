-- Observable SQL contract for the native Single Session booking module.

DO $$
BEGIN
  IF NOT public.is_single_session_slot_bookable(
    '2026-08-18 13:00 America/Toronto'::timestamptz,
    '2026-08-16 10:00 America/Toronto'::timestamptz
  ) THEN RAISE EXCEPTION 'anchored Tuesday slot should be bookable'; END IF;

  IF public.is_single_session_slot_bookable(
    '2026-08-18 13:30 America/Toronto'::timestamptz,
    '2026-08-16 10:00 America/Toronto'::timestamptz
  ) THEN RAISE EXCEPTION 'off-pitch slot should not be bookable'; END IF;

  IF public.is_single_session_slot_bookable(
    '2026-08-18 13:00 America/Toronto'::timestamptz,
    '2026-08-17 14:00 America/Toronto'::timestamptz
  ) THEN RAISE EXCEPTION 'slot inside 24-hour notice should not be bookable'; END IF;

  IF public.is_single_session_slot_bookable(
    '2026-08-25 13:00 America/Toronto'::timestamptz,
    '2026-08-16 10:00 America/Toronto'::timestamptz
  ) THEN RAISE EXCEPTION 'slot beyond six-business-day boundary should not be bookable'; END IF;

  IF NOT public.is_single_session_slot_bookable(
    '2026-11-02 14:00 America/Toronto'::timestamptz,
    '2026-10-30 10:00 America/Toronto'::timestamptz
  ) THEN RAISE EXCEPTION 'DST boundary changed a valid host-local anchor'; END IF;
END;
$$;

CREATE TABLE public.single_session_test_runtime AS
WITH config AS (
  SELECT timezone, (now() AT TIME ZONE timezone)::date AS local_today
  FROM public.booking_availability_config WHERE id = 1
), candidates AS (
  SELECT ((d.day::date + a.start_time) AT TIME ZONE c.timezone) AS start_at,
    row_number() OVER (ORDER BY d.day, a.start_time) AS n
  FROM config c
  CROSS JOIN LATERAL generate_series(
    c.local_today::timestamp,
    public.single_session_booking_window_end(now())::timestamp,
    interval '1 day'
  ) d(day)
  JOIN public.booking_availability a
    ON a.day_of_week = extract(dow FROM d.day)::integer
  WHERE a.end_time - a.start_time >= interval '5 hours 50 minutes'
    AND ((d.day::date + a.start_time) AT TIME ZONE c.timezone) >= now() + interval '24 hours'
)
SELECT start_at AS base_start,
  (SELECT start_at FROM candidates WHERE n = 2) AS race_start,
  (SELECT start_at FROM candidates WHERE n = 3) AS cross_race_start,
  NULL::uuid AS cross_race_pass_id
FROM candidates WHERE n = 1;

DO $$
DECLARE
  _base timestamptz := (SELECT base_start FROM public.single_session_test_runtime);
  _booking public.single_session_bookings%ROWTYPE;
  _same public.single_session_bookings%ROWTYPE;
  _stale_id uuid;
  _replacement public.single_session_bookings%ROWTYPE;
  _package_pass uuid;
  _job public.single_session_outbox%ROWTYPE;
  _sweep public.single_session_bookings%ROWTYPE;
  _result jsonb;
  _caught boolean;
BEGIN
  IF _base IS NULL THEN RAISE EXCEPTION 'test fixture could not find a wide availability range'; END IF;

  _booking := public.claim_single_session_slot(
    _base, 'Booker One', 'BOOKER@example.com', 'Prepare conditional logic',
    '["guest@example.com"]'::jsonb, 'idem-primary-0001', repeat('a', 32), repeat('i', 32), NULL
  );
  IF _booking.status <> 'draft'
     OR _booking.draft_expires_at < now() + interval '4 minutes 50 seconds'
     OR _booking.booking_token_expires_at < now() + interval '23 hours 59 minutes'
     OR _booking.email <> 'booker@example.com' THEN
    RAISE EXCEPTION 'claim did not atomically create normalized occupying draft';
  END IF;

  _same := public.claim_single_session_slot(
    _base, 'Booker One', 'booker@example.com', 'Prepare conditional logic',
    '["guest@example.com"]'::jsonb, 'idem-primary-0001', repeat('a', 32), repeat('i', 32), NULL
  );
  IF _same.id <> _booking.id THEN RAISE EXCEPTION 'double submit was not idempotent'; END IF;

  _caught := false;
  BEGIN
    PERFORM public.claim_single_session_slot(
      _base, 'Racer', 'racer@example.com', NULL, '[]'::jsonb,
      'idem-conflict-0002', repeat('b', 32), repeat('j', 32), NULL
    );
  EXCEPTION WHEN SQLSTATE 'P0409' THEN _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'occupying draft did not block a second claim'; END IF;

  -- A stale overlapping draft is expired under the same slot lock before replacement.
  INSERT INTO public.single_session_bookings (
    start_at, end_at, name, email, client_idempotency_key, draft_expires_at,
    booking_token_hash, booking_token_expires_at, ip_hash
  ) VALUES (
    _base + interval '70 minutes', _base + interval '140 minutes', 'Stale', 'stale@example.com',
    'idem-stale-0003', now() - interval '1 minute', repeat('c', 32),
    now() + interval '23 hours', repeat('k', 32)
  ) RETURNING id INTO _stale_id;
  _replacement := public.claim_single_session_slot(
    _base + interval '70 minutes', 'Replacement', 'replacement@example.com', NULL, '[]'::jsonb,
    'idem-replacement-0004', repeat('d', 32), repeat('l', 32), NULL
  );
  IF (SELECT status FROM public.single_session_bookings WHERE id = _stale_id) <> 'expired'
     OR _replacement.status <> 'draft' THEN
    RAISE EXCEPTION 'stale draft hygiene failed';
  END IF;

  -- Existing package occupancy blocks native claims (package range is padded).
  INSERT INTO public.booking_pass_redemptions (
    booking_pass_id, start_at, end_at, status, idempotency_key
  ) VALUES (
    '10000000-0000-0000-0000-000000000001',
    _base + interval '140 minutes', _base + interval '210 minutes', 'booked', 'cross-package-native'
  );
  _caught := false;
  BEGIN
    PERFORM public.claim_single_session_slot(
      _base + interval '140 minutes', 'Blocked Native', 'blocked-native@example.com', NULL, '[]'::jsonb,
      'idem-cross-0005', repeat('e', 32), repeat('m', 32), NULL
    );
  EXCEPTION WHEN SQLSTATE 'P0409' THEN _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'package booking did not block native claim'; END IF;

  -- Native occupancy blocks package redemption under the same advisory-lock discipline.
  INSERT INTO public.single_session_bookings (
    start_at, end_at, name, email, client_idempotency_key, draft_expires_at,
    booking_token_hash, booking_token_expires_at, ip_hash
  ) VALUES (
    _base + interval '280 minutes', _base + interval '350 minutes', 'Native Hold', 'native-hold@example.com',
    'idem-native-package-0006', now() + interval '5 minutes', repeat('f', 32),
    now() + interval '24 hours', repeat('n', 32)
  );
  INSERT INTO public.booking_passes (
    token_hash, student_id, student_email, student_name, total_credits, used_credits,
    session_length_minutes, status, created_by
  ) VALUES (
    'cross-engine-pass', '00000000-0000-0000-0000-000000000003', 'cross@example.com',
    'Cross Engine', 1, 0, 70, 'active', '00000000-0000-0000-0000-000000000001'
  ) RETURNING id INTO _package_pass;
  UPDATE public.single_session_test_runtime SET cross_race_pass_id = _package_pass;
  _caught := false;
  BEGIN
    PERFORM public.redeem_booking_pass_v2(
      _package_pass, 'cross-native-package', _base + interval '280 minutes',
      NULL, 'Cross Engine', 'cross@example.com'
    );
  EXCEPTION WHEN SQLSTATE 'P0409' THEN _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'native hold did not block package redemption'; END IF;

  -- Tentative mirror is excluded from finalization; checkout data attaches by CAS.
  _booking := public.set_single_session_tentative_event(_booking.id, 0, 'tentative-primary');
  INSERT INTO public.schedule_events(google_event_id, start_at, end_at, status)
  VALUES ('tentative-primary', _booking.start_at, _booking.end_at, 'tentative');
  _booking := public.persist_single_session_checkout_fingerprint(_booking.id, 0, 'encrypted-fingerprint');
  _booking := public.attach_single_session_checkout(
    _booking.id, 0, 'cs_test_primary', 'https://checkout.stripe.test/primary', now() + interval '35 minutes'
  );
  IF _booking.status <> 'checkout_open' OR _booking.lifecycle_version <> 1
     OR _booking.checkout_request_fingerprint IS NOT NULL
     OR _booking.checkout_fingerprint_disposition <> 'attached' THEN
    RAISE EXCEPTION 'checkout attachment CAS/fingerprint purge failed';
  END IF;

  _result := public.finalize_single_session_payment(
    _booking.id, 'evt_primary', 'cs_test_primary', 'pi_primary', 4500, 'usd', false,
    true, repeat('z', 32), 'encrypted-cancel-token'
  );
  IF _result->>'status' <> 'booked'
     OR (SELECT status FROM public.single_session_bookings WHERE id = _booking.id) <> 'booked'
     OR (SELECT count(*) FROM public.booking_commerce_events
         WHERE single_session_booking_id = _booking.id AND provider_event_id = 'evt_primary') <> 1 THEN
    RAISE EXCEPTION 'atomic event claim/finalize failed';
  END IF;
  IF (SELECT count(*) FROM public.single_session_outbox WHERE booking_id = _booking.id AND state = 'blocked') <> 2
     OR (SELECT count(*) FROM public.single_session_outbox WHERE booking_id = _booking.id AND action = 'gcal_promote' AND state = 'pending') <> 1 THEN
    RAISE EXCEPTION 'finalization did not create durable chained outbox start';
  END IF;

  _result := public.finalize_single_session_payment(
    _booking.id, 'evt_primary', 'cs_test_primary', 'pi_primary', 4500, 'usd', false,
    true, repeat('z', 32), 'encrypted-cancel-token'
  );
  IF _result->>'status' <> 'booked' OR (_result->>'was_existing')::boolean IS NOT true THEN
    RAISE EXCEPTION 'webhook replay after booked was not business-object-idempotent';
  END IF;

  SELECT * INTO _job FROM public.claim_single_session_outbox(
    'single-session-outbox', ARRAY['gcal_promote'], 1, 120
  );
  _result := public.complete_single_session_outbox(
    _job.id, _job.lease_token, 'confirmed', '{"event_id":"tentative-primary"}'::jsonb,
    'https://meet.google.com/test-primary'
  );
  IF NOT (_result->>'applied')::boolean
     OR (SELECT count(*) FROM public.single_session_outbox WHERE booking_id = _booking.id AND state = 'pending'
         AND action IN ('email_booking_confirmation', 'email_admin_notification')) <> 2 THEN
    RAISE EXCEPTION 'promote success did not activate confirmation chain';
  END IF;

  _booking := public.cancel_single_session_booking(repeat('z', 32));
  _same := public.cancel_single_session_booking(repeat('z', 32));
  IF _booking.status <> 'cancelled' OR _same.lifecycle_version <> _booking.lifecycle_version
     OR (SELECT count(*) FROM public.single_session_outbox WHERE booking_id = _booking.id
         AND action IN ('email_booking_confirmation', 'email_admin_notification') AND state = 'superseded') <> 2
     OR (SELECT count(*) FROM public.single_session_outbox WHERE booking_id = _booking.id
         AND action = 'gcal_delete' AND state = 'pending') <> 1 THEN
    RAISE EXCEPTION 'cancellation idempotence/job supersession failed';
  END IF;
  _caught := false;
  BEGIN
    PERFORM public.abandon_single_session_booking(_booking.id, repeat('a', 32));
  EXCEPTION WHEN SQLSTATE 'P0409' THEN _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'abandon authority survived checkout_open'; END IF;

  -- Delete-before-promote: cancellation supersedes a not-yet-leased promotion.
  _replacement := public.expire_single_session_draft(_replacement.id, 0, 'test_reuse');
  INSERT INTO public.single_session_bookings (
    start_at, end_at, name, email, client_idempotency_key, draft_expires_at,
    booking_token_hash, booking_token_expires_at, cancel_token_hash, cancel_token_expires_at,
    gcal_event_id, status, ip_hash
  ) VALUES (
    _base + interval '70 minutes', _base + interval '140 minutes', 'Cancel Race', 'cancel-race@example.com',
    'idem-cancel-race-0007', now() + interval '5 minutes', repeat('g', 32), now() + interval '24 hours',
    repeat('y', 32), _base + interval '70 minutes', 'tentative-cancel-race', 'booked', repeat('o', 32)
  ) RETURNING * INTO _replacement;
  PERFORM public.enqueue_single_session_outbox(_replacement.id, 'gcal_promote', 'system', 'pending',
    'booked', 0, NULL);
  _replacement := public.cancel_single_session_booking(repeat('y', 32));
  IF (SELECT state FROM public.single_session_outbox WHERE booking_id = _replacement.id AND action = 'gcal_promote') <> 'superseded'
     OR NOT EXISTS (SELECT 1 FROM public.single_session_outbox WHERE booking_id = _replacement.id AND action = 'gcal_delete') THEN
    RAISE EXCEPTION 'delete-before-promote precondition fence failed';
  END IF;

  -- A late payment after expiry loses arbitration when another booking owns the slot.
  INSERT INTO public.single_session_bookings (
    start_at, end_at, name, email, client_idempotency_key, draft_expires_at,
    stripe_checkout_session_id, stripe_checkout_url, stripe_expires_at,
    booking_token_hash, booking_token_expires_at, status, status_changed_at, ip_hash
  ) VALUES (
    _base + interval '70 minutes', _base + interval '140 minutes', 'Late Payer', 'late@example.com',
    'idem-late-0008', now() - interval '10 minutes', 'cs_test_late', 'https://checkout.stripe.test/late',
    now() - interval '1 minute', repeat('h', 32), now() + interval '24 hours', 'expired', now(), repeat('p', 32)
  ) RETURNING * INTO _replacement;
  INSERT INTO public.single_session_bookings (
    start_at, end_at, name, email, client_idempotency_key, draft_expires_at,
    booking_token_hash, booking_token_expires_at, cancel_token_hash, cancel_token_expires_at,
    status, ip_hash
  ) VALUES (
    _base + interval '70 minutes', _base + interval '140 minutes', 'Slot Winner', 'winner@example.com',
    'idem-winner-0009', now() + interval '5 minutes', repeat('q', 32), now() + interval '24 hours',
    repeat('x', 32), _base + interval '70 minutes', 'booked', repeat('r', 32)
  );
  _result := public.finalize_single_session_payment(
    _replacement.id, 'evt_late', 'cs_test_late', 'pi_late', 4500, 'usd', false,
    true, repeat('w', 32), 'unused-cancel-payload'
  );
  IF _result->>'status' <> 'refund_pending'
     OR NOT EXISTS (SELECT 1 FROM public.single_session_outbox
       WHERE booking_id = _replacement.id AND action = 'stripe_refund' AND state = 'pending') THEN
    RAISE EXCEPTION 'slot-retaken arbitration did not enter durable refund branch';
  END IF;
  _replacement := public.record_single_session_refund_status(_replacement.id, 're_late', 'pending');
  IF _replacement.status <> 'refund_pending' THEN RAISE EXCEPTION 'refund creation was treated as success'; END IF;
  _replacement := public.record_single_session_refund_status(_replacement.id, 're_late', 'failed');
  IF _replacement.status <> 'refund_failed' THEN RAISE EXCEPTION 'confirmed refund failure not recorded'; END IF;
  _replacement := public.record_single_session_refund_status(_replacement.id, 're_late', 'succeeded');
  IF _replacement.status <> 'refunded'
     OR NOT EXISTS (SELECT 1 FROM public.single_session_outbox
       WHERE booking_id = _replacement.id AND action = 'email_refund_apology') THEN
    RAISE EXCEPTION 'late authoritative refund success did not repair failure';
  END IF;

  -- Purpose/lifetime scope: booking-token status access and cancel capability die on their clocks.
  _caught := false;
  BEGIN
    PERFORM public.get_single_session_status('cs_test_primary', repeat('v', 32));
  EXCEPTION WHEN SQLSTATE 'P0403' THEN _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'wrong status token was accepted'; END IF;

  INSERT INTO public.single_session_bookings (
    start_at, end_at, name, email, client_idempotency_key, draft_expires_at,
    stripe_checkout_session_id, stripe_checkout_url, stripe_expires_at,
    booking_token_hash, booking_token_expires_at, cancel_token_hash, cancel_token_expires_at,
    status, ip_hash
  ) VALUES (
    now() - interval '2 hours', now() - interval '50 minutes', 'Past', 'past@example.com',
    'idem-past-0010', now() - interval '3 hours', 'cs_test_past', 'https://checkout.stripe.test/past',
    now() - interval '2 hours', repeat('s', 32), now() - interval '1 hour',
    repeat('t', 32), now() - interval '2 hours', 'booked', repeat('u', 32)
  );
  _caught := false;
  BEGIN
    PERFORM public.cancel_single_session_booking(repeat('t', 32));
  EXCEPTION WHEN SQLSTATE 'P0403' THEN _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'post-start cancel token remained valid'; END IF;
  _caught := false;
  BEGIN
    PERFORM public.get_single_session_status('cs_test_past', repeat('s', 32));
  EXCEPTION WHEN SQLSTATE 'P0403' THEN _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION '24-hour booking token remained valid after expiry'; END IF;

  -- Sweeper recovery distinguishes no-call drafts from persisted Stripe requests.
  INSERT INTO public.single_session_bookings (
    start_at, end_at, name, email, client_idempotency_key, draft_expires_at,
    booking_token_hash, booking_token_expires_at, ip_hash
  ) VALUES (
    now() + interval '100 days', now() + interval '100 days 70 minutes', 'Stranded Draft',
    'stranded@example.com', 'idem-sweep-empty-0011', now() - interval '1 minute',
    repeat('0', 32), now() + interval '1 hour', repeat('7', 32)
  );
  INSERT INTO public.single_session_bookings (
    start_at, end_at, name, email, client_idempotency_key, draft_expires_at,
    checkout_request_fingerprint, checkout_fingerprint_disposition,
    booking_token_hash, booking_token_expires_at, status, ip_hash
  ) VALUES (
    now() + interval '101 days', now() + interval '101 days 70 minutes', 'Replay Draft',
    'replay@example.com', 'idem-sweep-replay-0012', now() - interval '1 day',
    'encrypted-replay-fingerprint', 'persisted', repeat('8', 32), now() - interval '1 hour',
    'expired', repeat('9', 32)
  );
  PERFORM * FROM public.claim_single_session_sweeps('single-session-sweeper:test', 100, 120);
  SELECT * INTO _sweep FROM public.single_session_bookings WHERE client_idempotency_key = 'idem-sweep-empty-0011';
  _sweep := public.resolve_single_session_sweep(_sweep.id, _sweep.sweep_lease_token, 'expired_no_checkout', NULL, NULL);
  IF _sweep.status <> 'expired' THEN RAISE EXCEPTION 'stranded no-fingerprint draft was not expired'; END IF;
  SELECT * INTO _sweep FROM public.single_session_bookings WHERE client_idempotency_key = 'idem-sweep-replay-0012';
  _sweep := public.resolve_single_session_sweep(_sweep.id, _sweep.sweep_lease_token, 'stripe_absent', NULL, NULL);
  IF _sweep.checkout_request_fingerprint IS NOT NULL
     OR _sweep.checkout_fingerprint_disposition <> 'stripe_absent' THEN
    RAISE EXCEPTION 'provider-confirmed absence did not authorize fingerprint purge';
  END IF;

  -- Thirty-day retention covers row PII, outbox ciphertext, and commerce projections.
  INSERT INTO public.single_session_bookings (
    start_at, end_at, name, email, notes, client_idempotency_key, draft_expires_at,
    booking_token_hash, booking_token_expires_at, status, status_changed_at, ip_hash
  ) VALUES (
    now() + interval '102 days', now() + interval '102 days 70 minutes', 'Old PII',
    'old-pii@example.com', 'sensitive', 'idem-retention-0013', now() - interval '40 days',
    repeat('k', 32), now() - interval '39 days', 'expired', now() - interval '31 days', repeat('w', 32)
  ) RETURNING * INTO _sweep;
  INSERT INTO public.single_session_outbox (
    booking_id, action, recipient, state, idempotency_key,
    precondition_status, precondition_lifecycle_version, payload_ciphertext, created_at
  ) VALUES (
    _sweep.id, 'gcal_delete', 'retention', 'superseded', 'retention-outbox',
    'expired', 0, 'encrypted-sensitive-payload', now() - interval '31 days'
  );
  INSERT INTO public.booking_commerce_events (
    provider, provider_event_id, event_type, offer_id, amount_cents, currency,
    payload, single_session_booking_id, created_at
  ) VALUES (
    'stripe', 'evt_retention', 'single_session_paid', 'single-session-native', 4500, 'usd',
    '{"checkout_session_id":"sensitive"}'::jsonb, _sweep.id, now() - interval '31 days'
  );
  PERFORM public.purge_single_session_pii(now());
  IF EXISTS (SELECT 1 FROM public.single_session_bookings WHERE id = _sweep.id
      AND (name IS NOT NULL OR email IS NOT NULL OR notes IS NOT NULL OR ip_hash IS NOT NULL))
     OR (SELECT payload_ciphertext FROM public.single_session_outbox WHERE idempotency_key = 'retention-outbox') IS NOT NULL
     OR (SELECT payload FROM public.booking_commerce_events WHERE provider_event_id = 'evt_retention') <> '{}'::jsonb THEN
    RAISE EXCEPTION 'thirty-day PII retention purge was incomplete';
  END IF;

  -- Directly guard the transition that webhook replay must never perform.
  _caught := false;
  BEGIN
    UPDATE public.single_session_bookings SET status = 'refund_pending', lifecycle_version = lifecycle_version + 1
    WHERE client_idempotency_key = 'idem-winner-0009';
  EXCEPTION WHEN SQLSTATE 'P0409' THEN _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'booked to refund_pending was not prohibited'; END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.student_booking_offers
    WHERE student_id = '00000000-0000-0000-0000-000000000003'
      AND offer_id = 'single-session-native' AND enabled AND url_override IS NULL
  ) THEN RAISE EXCEPTION 'enabled empty override was not migrated'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.student_booking_offers
    WHERE student_id = '00000000-0000-0000-0000-000000000004'
      AND offer_id = 'single-session-native' AND NOT enabled AND url_override = '/book/session'
  ) THEN RAISE EXCEPTION 'disabled native-relative override was not migrated verbatim'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.student_booking_offers
    WHERE student_id = '00000000-0000-0000-0000-000000000005'
      AND offer_id = 'single-session' AND url_override = 'https://cal.com/custom/student'
  ) THEN RAISE EXCEPTION 'external authored override was silently rewritten'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.get_effective_booking_offers('00000000-0000-0000-0000-000000000003')
    WHERE id IN ('package-5', 'package-10')
  ) THEN RAISE EXCEPTION 'arrangement resolver exposed unrelated default packages'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.get_effective_booking_offers('00000000-0000-0000-0000-000000000004')
  ) THEN RAISE EXCEPTION 'disabled arrangement offer remained student-visible'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.get_effective_booking_offers('00000000-0000-0000-0000-000000000005')
    WHERE id = 'single-session-native'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.get_effective_booking_offers('00000000-0000-0000-0000-000000000005')
    WHERE id = 'single-session' AND url = 'https://cal.com/custom/student'
      AND is_legacy_external_override
  ) THEN RAISE EXCEPTION 'effective-offer resolver stranded external override'; END IF;

  IF NOT (public.get_booking_health() ? 'failed_calendar_actions')
     OR NOT (public.get_booking_health() ? 'calendar_sync')
     OR NOT (public.get_booking_health() ? 'single_session')
     OR NOT (public.get_booking_health() ? 'workers') THEN
    RAISE EXCEPTION 'health extension dropped legacy or native contract fields';
  END IF;
END;
$$;
