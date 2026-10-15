-- Native Single Session booking: worker leases, refund reconciliation, retention,
-- health reporting, and the native-offer registry cutover.

ALTER TABLE public.booking_offers DROP CONSTRAINT IF EXISTS booking_offers_provider_check;
ALTER TABLE public.booking_offers
  ADD CONSTRAINT booking_offers_provider_check
  CHECK (provider IN ('stripe', 'calcom', 'native'));

INSERT INTO public.booking_offers (id, label, provider, provider_ref, url, credits, active)
VALUES ('single-session-native', 'Single session', 'native', 'single-session-native', '/book/session', 0, true)
ON CONFLICT (id) DO UPDATE SET
  label = excluded.label,
  provider = excluded.provider,
  provider_ref = excluded.provider_ref,
  url = excluded.url,
  credits = excluded.credits,
  active = excluded.active;

UPDATE public.booking_offers SET active = false WHERE id = 'single-session';

-- Carry enabled state and native-relative/empty URL semantics to the native row.
INSERT INTO public.student_booking_offers (
  student_id, offer_id, enabled, url_override, created_at, updated_at
)
SELECT student_id, 'single-session-native', enabled,
  CASE WHEN NULLIF(trim(url_override), '') IS NULL THEN NULL ELSE url_override END,
  created_at, now()
FROM public.student_booking_offers
WHERE offer_id = 'single-session'
  AND (NULLIF(trim(url_override), '') IS NULL OR trim(url_override) LIKE '/%')
ON CONFLICT (student_id, offer_id) DO UPDATE SET
  enabled = excluded.enabled,
  url_override = excluded.url_override,
  updated_at = now();

DELETE FROM public.student_booking_offers
WHERE offer_id = 'single-session'
  AND (NULLIF(trim(url_override), '') IS NULL OR trim(url_override) LIKE '/%');

DO $$
DECLARE _override record;
BEGIN
  FOR _override IN
    SELECT student_id, url_override
    FROM public.student_booking_offers
    WHERE offer_id = 'single-session'
      AND NULLIF(trim(url_override), '') IS NOT NULL
      AND trim(url_override) NOT LIKE '/%'
    ORDER BY student_id
  LOOP
    RAISE NOTICE 'single-session external override retained for manual review: student_id=%, url=%',
      _override.student_id, _override.url_override;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_effective_booking_offers(_student_id uuid)
RETURNS TABLE (
  id text,
  label text,
  provider text,
  provider_ref text,
  url text,
  credits integer,
  enabled boolean,
  is_legacy_external_override boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH arrangement AS (
    SELECT EXISTS (
      SELECT 1 FROM public.student_booking_offers WHERE student_id = _student_id
    ) AS has_rows
  ), default_offers AS (
    SELECT o.id, o.label, o.provider, o.provider_ref,
      o.url, o.credits, true AS enabled,
      false AS is_legacy_external_override
    FROM public.booking_offers o
    CROSS JOIN arrangement a
    WHERE NOT a.has_rows AND o.active
  ), arranged_offers AS (
    SELECT o.id, o.label, o.provider, o.provider_ref,
      COALESCE(NULLIF(trim(s.url_override), ''), o.url) AS url,
      o.credits, true AS enabled,
      (o.id = 'single-session' AND NULLIF(trim(s.url_override), '') IS NOT NULL
        AND trim(s.url_override) NOT LIKE '/%') AS is_legacy_external_override
    FROM public.student_booking_offers s
    JOIN public.booking_offers o ON o.id = s.offer_id
    WHERE s.student_id = _student_id AND s.enabled
      AND (o.active OR (o.id = 'single-session'
        AND NULLIF(trim(s.url_override), '') IS NOT NULL
        AND trim(s.url_override) NOT LIKE '/%'))
  )
  SELECT * FROM default_offers
  UNION ALL
  SELECT * FROM arranged_offers;
$$;

ALTER TABLE public.booking_passes
  ADD CONSTRAINT booking_passes_reserved_session_slug_chk
  CHECK (booking_slug IS NULL OR lower(booking_slug) <> 'session') NOT VALID;
ALTER TABLE public.booking_passes VALIDATE CONSTRAINT booking_passes_reserved_session_slug_chk;

CREATE OR REPLACE FUNCTION public.claim_single_session_outbox(
  _worker_id text,
  _actions text[] DEFAULT NULL,
  _limit integer DEFAULT 20,
  _lease_seconds integer DEFAULT 120
) RETURNS SETOF public.single_session_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.complete_single_session_outbox(
  _job_id uuid,
  _lease_token uuid,
  _provider_status text DEFAULT NULL,
  _result jsonb DEFAULT '{}'::jsonb,
  _meet_url text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.fail_single_session_outbox(
  _job_id uuid,
  _lease_token uuid,
  _error text,
  _provider_status text DEFAULT NULL,
  _confirmed_failure boolean DEFAULT false
) RETURNS public.single_session_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    -- Retries ended without a definitive provider answer. Money stays pending;
    -- persist an operator-visible alert instead of declaring a false failure.
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
$$;

CREATE OR REPLACE FUNCTION public.record_single_session_refund_status(
  _booking_id uuid,
  _stripe_refund_id text,
  _provider_status text
) RETURNS public.single_session_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.claim_single_session_sweeps(
  _worker_id text,
  _limit integer DEFAULT 20,
  _lease_seconds integer DEFAULT 120
) RETURNS SETOF public.single_session_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.resolve_single_session_sweep(
  _booking_id uuid,
  _sweep_lease_token uuid,
  _resolution text,
  _stripe_session_id text DEFAULT NULL,
  _stripe_expires_at timestamptz DEFAULT NULL
) RETURNS public.single_session_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.record_booking_worker_heartbeat(
  _worker_name text,
  _phase text,
  _error text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.booking_worker_heartbeats
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.purge_single_session_pii(_now timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _rows integer; _tokens integer; _outbox integer; _commerce integer;
BEGIN
  UPDATE public.single_session_bookings SET
    name = NULL, email = NULL, notes = NULL, guests = '[]'::jsonb,
    stripe_checkout_url = NULL, ip_hash = NULL,
    booking_token_hash = 'purged:' || id::text,
    booking_token_expires_at = least(booking_token_expires_at, _now)
  WHERE status IN ('expired', 'abandoned')
    AND status_changed_at <= _now - interval '30 days'
    AND (name IS NOT NULL OR email IS NOT NULL OR notes IS NOT NULL OR ip_hash IS NOT NULL);
  GET DIAGNOSTICS _rows = ROW_COUNT;

  UPDATE public.single_session_bookings SET
    ip_hash = NULL,
    booking_token_hash = CASE WHEN status IN ('cancelled', 'refunded', 'refund_failed')
      THEN 'purged:' || id::text ELSE booking_token_hash END,
    cancel_token_hash = CASE WHEN status IN ('cancelled', 'refunded', 'refund_failed')
      THEN NULL ELSE cancel_token_hash END,
    cancel_token_expires_at = CASE WHEN status IN ('cancelled', 'refunded', 'refund_failed')
      THEN NULL ELSE cancel_token_expires_at END
  WHERE status_changed_at <= _now - interval '30 days'
    AND (ip_hash IS NOT NULL OR (status IN ('cancelled', 'refunded', 'refund_failed')
      AND (cancel_token_hash IS NOT NULL OR booking_token_hash NOT LIKE 'purged:%')));
  GET DIAGNOSTICS _tokens = ROW_COUNT;

  UPDATE public.single_session_outbox SET
    payload_ciphertext = NULL,
    sensitive_payload_purged_at = COALESCE(sensitive_payload_purged_at, _now),
    updated_at = now()
  WHERE created_at <= _now - interval '30 days' AND payload_ciphertext IS NOT NULL;
  GET DIAGNOSTICS _outbox = ROW_COUNT;

  UPDATE public.booking_commerce_events SET payload = '{}'::jsonb
  WHERE single_session_booking_id IS NOT NULL
    AND created_at <= _now - interval '30 days'
    AND payload <> '{}'::jsonb;
  GET DIAGNOSTICS _commerce = ROW_COUNT;
  RETURN jsonb_build_object(
    'booking_pii_rows', _rows,
    'token_rows', _tokens,
    'outbox_payloads', _outbox,
    'commerce_payloads', _commerce
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_booking_health()
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH pending AS (
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE updated_at < now() - interval '5 minutes')::int AS over_5m,
      count(*) FILTER (WHERE updated_at < now() - interval '15 minutes')::int AS over_15m,
      min(updated_at) AS oldest_at
    FROM public.booking_pass_redemptions
    WHERE calendar_action <> 'none' AND calendar_status IN ('pending', 'processing')
  ), failed AS (
    SELECT
      (SELECT count(*)::int FROM public.booking_pass_redemptions WHERE calendar_status = 'failed') AS total,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'redemption_id', f.id, 'calendar_action', f.calendar_action,
        'attempts', f.calendar_attempts, 'error', f.calendar_error
      ) ORDER BY f.updated_at) FROM (
        SELECT * FROM public.booking_pass_redemptions
        WHERE calendar_status = 'failed' ORDER BY updated_at LIMIT 25
      ) f), '[]'::jsonb) AS items
  ), alerts AS (
    SELECT count(*) FILTER (WHERE status = 'open')::int AS open_total,
      count(*) FILTER (WHERE status = 'open' AND alert_type = 'duplicate_event')::int AS duplicate_events,
      count(*) FILTER (WHERE status = 'open' AND alert_type = 'double_booking')::int AS native_double_bookings,
      count(*) FILTER (WHERE status = 'open' AND alert_type = 'refund_attention')::int AS refund_attention,
      count(*) FILTER (WHERE status = 'open' AND alert_type IN ('deleted', 'move_conflict'))::int AS mismatches,
      count(*) FILTER (WHERE status = 'open' AND alert_type = 'persistence_failure')::int AS repair_items
    FROM public.booking_calendar_alerts
  ), uploads AS (
    SELECT count(*)::int AS staged_over_1h
    FROM public.external_work_uploads
    WHERE redemption_id IS NULL AND booking_pass_id IS NOT NULL
      AND created_at < now() - interval '1 hour'
  ), sync AS (
    SELECT last_synced_at, last_attempt_at, sync_token_updated_at,
      extract(epoch FROM now() - last_synced_at)::int AS last_success_age_seconds,
      extract(epoch FROM now() - sync_token_updated_at)::int AS token_age_seconds
    FROM public.gcal_sync_state WHERE id = 1
  ), counts AS (
    SELECT
      count(*) FILTER (WHERE status = 'booked' AND google_event_id IS NULL)::int AS missing_google_event_ids,
      count(*) FILTER (WHERE status = 'booked' AND calendar_status = 'synced' AND meet_url IS NULL)::int AS synced_missing_meet_urls,
      count(*) FILTER (WHERE submission_status = 'failed')::int AS failed_submissions
    FROM public.booking_pass_redemptions
  ), single_counts AS (
    SELECT
      count(*) FILTER (WHERE status = 'refund_pending')::int AS refund_pending,
      count(*) FILTER (WHERE status = 'refund_failed')::int AS refund_failed,
      count(*) FILTER (WHERE status = 'checkout_open' AND stripe_expires_at < now())::int AS checkout_past_expiry,
      count(*) FILTER (WHERE status IN ('expired', 'abandoned', 'refund_pending', 'refunded', 'refund_failed', 'cancelled')
        AND gcal_event_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.single_session_outbox o
          WHERE o.booking_id = single_session_bookings.id AND o.action = 'gcal_delete'
            AND o.state IN ('pending', 'leased', 'succeeded')))::int AS orphan_tentative_events
    FROM public.single_session_bookings
  ), outbox AS (
    SELECT count(*) FILTER (WHERE state = 'failed')::int AS failed,
      count(*) FILTER (WHERE state = 'superseded')::int AS superseded,
      count(*) FILTER (WHERE state = 'leased' AND lease_until < now())::int AS stale_leases
    FROM public.single_session_outbox
  ), workers AS (
    SELECT count(*) FILTER (WHERE h.last_success_at IS NULL OR h.last_success_at < now() - interval '15 minutes')::int AS stale
    FROM (VALUES ('single-session-sweeper'), ('single-session-outbox'), ('gcal-reconciler')) expected(worker_name)
    LEFT JOIN public.booking_worker_heartbeats h USING (worker_name)
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'overall_status', CASE
      WHEN single_counts.refund_failed > 0 OR outbox.failed > 0 OR workers.stale > 0
        OR failed.total > 0 OR pending.over_15m > 0 OR alerts.mismatches > 0
        OR alerts.native_double_bookings > 0 OR alerts.refund_attention > 0 THEN 'red'
      WHEN single_counts.refund_pending > 0 OR single_counts.checkout_past_expiry > 0
        OR single_counts.orphan_tentative_events > 0 OR pending.total > 0
        OR uploads.staged_over_1h > 0 OR counts.synced_missing_meet_urls > 0
        OR alerts.repair_items > 0 THEN 'amber'
      ELSE 'green' END,
    'pending_calendar_actions', to_jsonb(pending),
    'failed_calendar_actions', jsonb_build_object('total', failed.total, 'items', failed.items),
    'missing_google_event_ids', counts.missing_google_event_ids,
    'synced_missing_meet_urls', counts.synced_missing_meet_urls,
    'failed_submissions', counts.failed_submissions,
    'staged_uploads_over_1h', uploads.staged_over_1h,
    'calendar_sync', to_jsonb(sync),
    'alerts', to_jsonb(alerts),
    'single_session', to_jsonb(single_counts),
    'single_session_outbox', to_jsonb(outbox),
    'workers', to_jsonb(workers)
  ) FROM pending, failed, alerts, uploads, sync, counts, single_counts, outbox, workers;
$$;

REVOKE ALL ON FUNCTION public.claim_single_session_outbox(text, text[], integer, integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_single_session_outbox(uuid, uuid, text, jsonb, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_single_session_outbox(uuid, uuid, text, text, boolean) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_single_session_refund_status(uuid, text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_single_session_sweeps(text, integer, integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_single_session_sweep(uuid, uuid, text, text, timestamptz) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_booking_worker_heartbeat(text, text, text, jsonb) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_single_session_pii(timestamptz) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_booking_health() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_effective_booking_offers(uuid) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_single_session_outbox(text, text[], integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_single_session_outbox(uuid, uuid, text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_single_session_outbox(uuid, uuid, text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_single_session_refund_status(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_single_session_sweeps(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_single_session_sweep(uuid, uuid, text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_booking_worker_heartbeat(text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_single_session_pii(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_booking_health() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_effective_booking_offers(uuid) TO service_role;

COMMENT ON TABLE public.booking_worker_heartbeats IS
  'Stage 1 worker contract. Stage 2 deploy provisioning installs authenticated crons using a dedicated rotating worker secret; no secret is stored in SQL or cron metadata.';
