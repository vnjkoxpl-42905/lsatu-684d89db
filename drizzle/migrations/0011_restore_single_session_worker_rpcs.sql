CREATE OR REPLACE FUNCTION public.claim_single_session_outbox(
  _worker_id text,
  _actions text[] DEFAULT NULL,
  _limit integer DEFAULT 20,
  _lease_seconds integer DEFAULT 120
) RETURNS SETOF public.single_session_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NULLIF(trim(_worker_id), '') IS NULL OR _limit NOT BETWEEN 1 AND 100
     OR _lease_seconds NOT BETWEEN 10 AND 900 THEN
    RAISE EXCEPTION 'invalid_lease_request' USING ERRCODE = 'P0400';
  END IF;

  UPDATE public.single_session_outbox o SET
    state = 'superseded', lease_worker_id = NULL, lease_token = NULL,
    lease_until = NULL, updated_at = now(),
    last_error = COALESCE(o.last_error, 'lifecycle precondition no longer holds')
  FROM public.single_session_bookings b
  WHERE b.id = o.booking_id
    AND o.state IN ('pending', 'failed', 'leased')
    AND (o.state <> 'leased' OR o.lease_until <= now())
    AND (b.status <> o.precondition_status
      OR b.lifecycle_version <> o.precondition_lifecycle_version);

  RETURN QUERY
  WITH candidates AS (
    SELECT o.id
    FROM public.single_session_outbox o
    WHERE (o.state = 'pending'
        OR (o.state = 'leased' AND o.lease_until <= now()))
      AND o.next_retry_at <= now()
      AND o.attempts < o.max_attempts
      AND (_actions IS NULL OR o.action = ANY(_actions))
    ORDER BY o.next_retry_at, o.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT _limit
  )
  UPDATE public.single_session_outbox o SET
    state = 'leased', attempts = o.attempts + 1,
    lease_worker_id = _worker_id, lease_token = gen_random_uuid(),
    lease_until = now() + make_interval(secs => _lease_seconds), updated_at = now()
  FROM candidates c WHERE o.id = c.id
  RETURNING o.*;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.complete_single_session_outbox(
  _job_id uuid,
  _lease_token uuid,
  _provider_status text DEFAULT NULL,
  _result jsonb DEFAULT '{}'::jsonb,
  _meet_url text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  _job public.single_session_outbox%ROWTYPE;
  _booking public.single_session_bookings%ROWTYPE;
  _compensate boolean := false;
  _refund_id text;
BEGIN
  SELECT * INTO _job FROM public.single_session_outbox WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'outbox_job_not_found' USING ERRCODE = 'P0404'; END IF;
  IF _job.state <> 'leased' OR _job.lease_token IS DISTINCT FROM _lease_token
     OR _job.lease_until <= now() THEN
    RAISE EXCEPTION 'outbox_lease_lost' USING ERRCODE = 'P0409';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('single-session-side-effect:' || _job.booking_id::text, 0));
  SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _job.booking_id FOR UPDATE;
  IF _booking.status <> _job.precondition_status
     OR _booking.lifecycle_version <> _job.precondition_lifecycle_version THEN
    _compensate := _job.action = 'gcal_promote';
    UPDATE public.single_session_outbox SET
      state = 'superseded', lease_worker_id = NULL, lease_token = NULL,
      lease_until = NULL, last_error = 'lifecycle changed during side effect', updated_at = now()
    WHERE id = _job_id;
    RETURN jsonb_build_object('applied', false, 'compensate', _compensate);
  END IF;

  IF _job.action = 'gcal_promote' THEN
    IF NULLIF(_meet_url, '') IS NULL THEN
      RAISE EXCEPTION 'meet_url_required' USING ERRCODE = 'P0400';
    END IF;
    UPDATE public.single_session_bookings SET meet_url = _meet_url WHERE id = _booking.id;
    UPDATE public.single_session_outbox SET state = 'pending', next_retry_at = now(), updated_at = now()
    WHERE booking_id = _booking.id AND state = 'blocked'
      AND action IN ('email_booking_confirmation', 'email_admin_notification')
      AND precondition_status = _booking.status
      AND precondition_lifecycle_version = _booking.lifecycle_version;
  ELSIF _job.action = 'stripe_refund' THEN
    _refund_id := NULLIF(_result->>'refund_id', '');
    IF _refund_id IS NOT NULL THEN
      UPDATE public.single_session_bookings SET
        stripe_refund_id = COALESCE(stripe_refund_id, _refund_id),
        stripe_refund_status = COALESCE(_provider_status, stripe_refund_status)
      WHERE id = _booking.id;
    END IF;
    IF lower(COALESCE(_provider_status, '')) = 'succeeded' THEN
      UPDATE public.single_session_bookings b SET
        status = 'refunded', lifecycle_version = b.lifecycle_version + 1,
        stripe_refund_status = 'succeeded'
      WHERE b.id = _booking.id RETURNING * INTO _booking;
      PERFORM public.enqueue_single_session_outbox(_booking.id, 'email_refund_apology', 'booker', 'pending',
        'refunded', _booking.lifecycle_version, NULL);
    END IF;
  END IF;

  UPDATE public.single_session_outbox SET
    state = 'succeeded', provider_status = _provider_status,
    result = COALESCE(_result, '{}'::jsonb), payload_ciphertext = NULL,
    sensitive_payload_purged_at = CASE WHEN payload_ciphertext IS NULL
      THEN sensitive_payload_purged_at ELSE now() END,
    lease_worker_id = NULL, lease_token = NULL, lease_until = NULL,
    completed_at = now(), updated_at = now()
  WHERE id = _job_id;
  RETURN jsonb_build_object('applied', true, 'compensate', false);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.fail_single_session_outbox(
  _job_id uuid,
  _lease_token uuid,
  _error text,
  _provider_status text DEFAULT NULL,
  _confirmed_failure boolean DEFAULT false
) RETURNS public.single_session_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  _job public.single_session_outbox%ROWTYPE;
  _booking public.single_session_bookings%ROWTYPE;
  _terminal boolean;
BEGIN
  SELECT * INTO _job FROM public.single_session_outbox WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'outbox_job_not_found' USING ERRCODE = 'P0404'; END IF;
  IF _job.state <> 'leased' OR _job.lease_token IS DISTINCT FROM _lease_token THEN
    RAISE EXCEPTION 'outbox_lease_lost' USING ERRCODE = 'P0409';
  END IF;
  SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _job.booking_id FOR UPDATE;

  IF _booking.status <> _job.precondition_status
     OR _booking.lifecycle_version <> _job.precondition_lifecycle_version THEN
    UPDATE public.single_session_outbox SET
      state = 'superseded', lease_worker_id = NULL, lease_token = NULL,
      lease_until = NULL, last_error = 'lifecycle changed during side effect', updated_at = now()
    WHERE id = _job_id RETURNING * INTO _job;
    RETURN _job;
  END IF;

  _terminal := _confirmed_failure OR _job.attempts >= _job.max_attempts;
  IF _job.action = 'stripe_refund' AND _confirmed_failure THEN
    UPDATE public.single_session_bookings b SET
      status = 'refund_failed', lifecycle_version = b.lifecycle_version + 1,
      stripe_refund_status = COALESCE(NULLIF(_provider_status, ''), 'failed')
    WHERE b.id = _booking.id AND b.status = 'refund_pending';
  ELSIF _job.action = 'stripe_refund' AND _terminal THEN
    INSERT INTO public.booking_calendar_alerts (
      redemption_id, single_session_booking_id, alert_type, status, details
    ) VALUES (
      NULL, _booking.id, 'refund_attention', 'open',
      jsonb_build_object('outbox_job_id', _job.id, 'attempts', _job.attempts,
        'last_error', left(COALESCE(_error, 'unknown outcome'), 1000))
    )
    ON CONFLICT (single_session_booking_id, alert_type)
      WHERE status = 'open' AND single_session_booking_id IS NOT NULL
    DO UPDATE SET details = excluded.details;
  END IF;

  UPDATE public.single_session_outbox SET
    state = CASE WHEN _terminal THEN 'failed' ELSE 'pending' END,
    provider_status = _provider_status, last_error = left(COALESCE(_error, 'unknown failure'), 4000),
    lease_worker_id = NULL, lease_token = NULL, lease_until = NULL,
    next_retry_at = CASE WHEN _terminal THEN next_retry_at ELSE
      now() + least(interval '1 hour', make_interval(secs => (15 * power(2, greatest(attempts - 1, 0)))::integer)) END,
    updated_at = now()
  WHERE id = _job_id RETURNING * INTO _job;

  IF _job.action = 'gcal_promote' AND _terminal THEN
    UPDATE public.single_session_outbox SET
      state = 'pending', next_retry_at = now(), provider_status = 'meet_link_pending', updated_at = now()
    WHERE booking_id = _booking.id AND state = 'blocked'
      AND action IN ('email_booking_confirmation', 'email_admin_notification')
      AND precondition_status = _booking.status
      AND precondition_lifecycle_version = _booking.lifecycle_version;
  END IF;
  RETURN _job;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.record_single_session_refund_status(
  _booking_id uuid,
  _stripe_refund_id text,
  _provider_status text
) RETURNS public.single_session_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE _booking public.single_session_bookings%ROWTYPE;
BEGIN
  SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND OR _booking.status NOT IN ('refund_pending', 'refund_failed', 'refunded') THEN
    RAISE EXCEPTION 'not_in_refund_branch' USING ERRCODE = 'P0409';
  END IF;
  IF _booking.stripe_refund_id IS NOT NULL
     AND _booking.stripe_refund_id IS DISTINCT FROM _stripe_refund_id THEN
    RAISE EXCEPTION 'refund_id_mismatch' USING ERRCODE = 'P0409';
  END IF;
  IF lower(_provider_status) = 'succeeded' AND _booking.status <> 'refunded' THEN
    UPDATE public.single_session_bookings b SET
      status = 'refunded', lifecycle_version = b.lifecycle_version + 1,
      stripe_refund_id = _stripe_refund_id, stripe_refund_status = 'succeeded'
    WHERE b.id = _booking_id RETURNING * INTO _booking;
    PERFORM public.enqueue_single_session_outbox(_booking.id, 'email_refund_apology', 'booker', 'pending',
      'refunded', _booking.lifecycle_version, NULL);
  ELSIF lower(_provider_status) IN ('failed', 'canceled') AND _booking.status = 'refund_pending' THEN
    UPDATE public.single_session_bookings b SET
      status = 'refund_failed', lifecycle_version = b.lifecycle_version + 1,
      stripe_refund_id = _stripe_refund_id, stripe_refund_status = lower(_provider_status)
    WHERE b.id = _booking_id RETURNING * INTO _booking;
  ELSE
    UPDATE public.single_session_bookings SET
      stripe_refund_id = COALESCE(stripe_refund_id, _stripe_refund_id),
      stripe_refund_status = lower(_provider_status)
    WHERE id = _booking_id RETURNING * INTO _booking;
  END IF;
  RETURN _booking;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.claim_single_session_sweeps(
  _worker_id text,
  _limit integer DEFAULT 20,
  _lease_seconds integer DEFAULT 120
) RETURNS SETOF public.single_session_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NULLIF(trim(_worker_id), '') IS NULL OR _limit NOT BETWEEN 1 AND 100
     OR _lease_seconds NOT BETWEEN 10 AND 900 THEN
    RAISE EXCEPTION 'invalid_lease_request' USING ERRCODE = 'P0400';
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT b.id FROM public.single_session_bookings b
    WHERE (b.sweep_lease_until IS NULL OR b.sweep_lease_until <= now())
      AND (
        (b.status = 'draft' AND b.draft_expires_at <= now()) OR
        (b.status = 'checkout_open' AND b.stripe_expires_at <= now() - interval '5 minutes') OR
        (b.checkout_request_fingerprint IS NOT NULL
          AND b.stripe_checkout_session_id IS NULL
          AND (b.status NOT IN ('draft', 'checkout_open') OR b.draft_expires_at <= now()))
      )
    ORDER BY COALESCE(b.stripe_expires_at, b.draft_expires_at), b.created_at
    FOR UPDATE SKIP LOCKED LIMIT _limit
  )
  UPDATE public.single_session_bookings b SET
    sweep_worker_id = _worker_id, sweep_lease_token = gen_random_uuid(),
    sweep_lease_until = now() + make_interval(secs => _lease_seconds),
    sweep_attempts = b.sweep_attempts + 1
  FROM candidates c WHERE b.id = c.id RETURNING b.*;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.resolve_single_session_sweep(
  _booking_id uuid,
  _sweep_lease_token uuid,
  _resolution text,
  _stripe_session_id text DEFAULT NULL,
  _stripe_expires_at timestamptz DEFAULT NULL
) RETURNS public.single_session_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE _booking public.single_session_bookings%ROWTYPE;
BEGIN
  SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND OR _booking.sweep_lease_token IS DISTINCT FROM _sweep_lease_token
     OR _booking.sweep_lease_until <= now() THEN
    RAISE EXCEPTION 'sweep_lease_lost' USING ERRCODE = 'P0409';
  END IF;
  IF _resolution NOT IN ('expired_no_checkout', 'stripe_expired', 'stripe_absent') THEN
    RAISE EXCEPTION 'invalid_sweep_resolution' USING ERRCODE = 'P0400';
  END IF;
  IF _stripe_session_id IS NOT NULL AND _stripe_expires_at IS NULL THEN
    RAISE EXCEPTION 'stripe_expiry_required' USING ERRCODE = 'P0400';
  END IF;

  UPDATE public.single_session_bookings b SET
    stripe_checkout_session_id = COALESCE(b.stripe_checkout_session_id, _stripe_session_id),
    stripe_expires_at = COALESCE(b.stripe_expires_at, _stripe_expires_at),
    checkout_request_fingerprint = CASE WHEN _resolution IN ('stripe_expired', 'stripe_absent')
      THEN NULL ELSE b.checkout_request_fingerprint END,
    checkout_fingerprint_disposition = CASE _resolution
      WHEN 'stripe_expired' THEN 'stripe_expired'
      WHEN 'stripe_absent' THEN 'stripe_absent'
      ELSE b.checkout_fingerprint_disposition END,
    status = CASE WHEN b.status IN ('draft', 'checkout_open') THEN 'expired' ELSE b.status END,
    lifecycle_version = CASE WHEN b.status IN ('draft', 'checkout_open')
      THEN b.lifecycle_version + 1 ELSE b.lifecycle_version END,
    terminal_reason = CASE WHEN b.status IN ('draft', 'checkout_open') THEN _resolution ELSE b.terminal_reason END,
    sweep_worker_id = NULL, sweep_lease_token = NULL, sweep_lease_until = NULL
  WHERE b.id = _booking_id RETURNING * INTO _booking;
  IF _booking.gcal_event_id IS NOT NULL THEN
    PERFORM public.enqueue_single_session_outbox(_booking.id, 'gcal_delete', 'system', 'pending',
      _booking.status, _booking.lifecycle_version, NULL);
  END IF;
  RETURN _booking;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.record_booking_worker_heartbeat(
  _worker_name text,
  _phase text,
  _error text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.booking_worker_heartbeats
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE _heartbeat public.booking_worker_heartbeats%ROWTYPE;
BEGIN
  IF _phase NOT IN ('start', 'success', 'error') THEN
    RAISE EXCEPTION 'invalid_heartbeat_phase' USING ERRCODE = 'P0400';
  END IF;
  INSERT INTO public.booking_worker_heartbeats (
    worker_name, last_start_at, last_success_at, last_error_at, last_error, metadata
  ) VALUES (
    _worker_name,
    CASE WHEN _phase = 'start' THEN now() END,
    CASE WHEN _phase = 'success' THEN now() END,
    CASE WHEN _phase = 'error' THEN now() END,
    CASE WHEN _phase = 'error' THEN left(_error, 4000) END,
    COALESCE(_metadata, '{}'::jsonb)
  ) ON CONFLICT (worker_name) DO UPDATE SET
    last_start_at = CASE WHEN _phase = 'start' THEN now() ELSE booking_worker_heartbeats.last_start_at END,
    last_success_at = CASE WHEN _phase = 'success' THEN now() ELSE booking_worker_heartbeats.last_success_at END,
    last_error_at = CASE WHEN _phase = 'error' THEN now() ELSE booking_worker_heartbeats.last_error_at END,
    last_error = CASE
      WHEN _phase = 'error' THEN left(_error, 4000)
      WHEN _phase = 'success' THEN NULL
      ELSE booking_worker_heartbeats.last_error END,
    metadata = COALESCE(_metadata, '{}'::jsonb), updated_at = now()
  RETURNING * INTO _heartbeat;
  RETURN _heartbeat;
END;
$fn$;

REVOKE ALL ON FUNCTION public.claim_single_session_outbox(text, text[], integer, integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_single_session_outbox(uuid, uuid, text, jsonb, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_single_session_outbox(uuid, uuid, text, text, boolean) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_single_session_refund_status(uuid, text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_single_session_sweeps(text, integer, integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_single_session_sweep(uuid, uuid, text, text, timestamptz) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_booking_worker_heartbeat(text, text, text, jsonb) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_single_session_outbox(text, text[], integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_single_session_outbox(uuid, uuid, text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_single_session_outbox(uuid, uuid, text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_single_session_refund_status(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_single_session_sweeps(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_single_session_sweep(uuid, uuid, text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_booking_worker_heartbeat(text, text, text, jsonb) TO service_role;