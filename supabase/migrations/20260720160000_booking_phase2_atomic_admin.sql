-- Booking remediation Phase 2: atomic cancellation and pass administration.

ALTER TABLE public.booking_pass_redemptions
  ADD COLUMN IF NOT EXISTS calendar_action text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS calendar_status text NOT NULL DEFAULT 'synced',
  ADD COLUMN IF NOT EXISTS calendar_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calendar_error text,
  ADD COLUMN IF NOT EXISTS calendar_lease_until timestamptz,
  ADD COLUMN IF NOT EXISTS calendar_last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credit_refunded boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.booking_pass_redemptions'::regclass
      AND conname = 'booking_redemptions_calendar_action_ck'
  ) THEN
    ALTER TABLE public.booking_pass_redemptions
      ADD CONSTRAINT booking_redemptions_calendar_action_ck
      CHECK (calendar_action IN ('create', 'update', 'delete', 'none'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.booking_pass_redemptions'::regclass
      AND conname = 'booking_redemptions_calendar_status_ck'
  ) THEN
    ALTER TABLE public.booking_pass_redemptions
      ADD CONSTRAINT booking_redemptions_calendar_status_ck
      CHECK (calendar_status IN ('pending', 'processing', 'synced', 'failed'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.booking_pass_redemptions'::regclass
      AND conname = 'booking_redemptions_calendar_attempts_ck'
  ) THEN
    ALTER TABLE public.booking_pass_redemptions
      ADD CONSTRAINT booking_redemptions_calendar_attempts_ck
      CHECK (calendar_attempts >= 0);
  END IF;
END $$;

UPDATE public.booking_pass_redemptions
SET calendar_action = CASE
      WHEN status = 'booked' AND (gcal_state = 'pending' OR needs_gcal_sync) THEN 'create'
      ELSE 'none'
    END,
    calendar_status = CASE
      WHEN gcal_state = 'pending' OR needs_gcal_sync THEN 'pending'
      WHEN gcal_state = 'failed' THEN 'failed'
      ELSE 'synced'
    END,
    calendar_error = COALESCE(calendar_error, gcal_error),
    calendar_last_synced_at = CASE WHEN gcal_state = 'synced' THEN updated_at ELSE NULL END;

CREATE INDEX IF NOT EXISTS booking_redemptions_calendar_work
  ON public.booking_pass_redemptions (calendar_status, calendar_lease_until, updated_at)
  WHERE calendar_action <> 'none';

CREATE OR REPLACE FUNCTION public.cancel_booking_redemption(
  _redemption_id uuid,
  _refund boolean DEFAULT true,
  _actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _redemption public.booking_pass_redemptions%ROWTYPE;
  _pass public.booking_passes%ROWTYPE;
  _did_refund boolean := false;
BEGIN
  SELECT * INTO _redemption
  FROM public.booking_pass_redemptions
  WHERE id = _redemption_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'redemption_not_found' USING ERRCODE = 'P0404';
  END IF;

  SELECT * INTO _pass
  FROM public.booking_passes
  WHERE id = _redemption.booking_pass_id
  FOR UPDATE;

  IF _redemption.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'redemption', to_jsonb(_redemption),
      'pass', to_jsonb(_pass),
      'was_existing', true,
      'refunded', _redemption.credit_refunded
    );
  END IF;

  IF _redemption.status <> 'booked' THEN
    RAISE EXCEPTION 'redemption_not_booked:%', _redemption.status USING ERRCODE = 'P0400';
  END IF;

  IF COALESCE(_refund, true) AND NOT _redemption.credit_refunded AND _pass.used_credits > 0 THEN
    UPDATE public.booking_passes
    SET used_credits = used_credits - 1,
        status = CASE
          WHEN status = 'exhausted'
            AND (expires_at IS NULL OR expires_at > now()) THEN 'active'
          ELSE status
        END
    WHERE id = _pass.id
    RETURNING * INTO _pass;
    _did_refund := true;
  END IF;

  UPDATE public.booking_pass_redemptions
  SET status = 'cancelled',
      cancelled_at = COALESCE(cancelled_at, now()),
      cancelled_by = COALESCE(cancelled_by, _actor_id),
      credit_refunded = credit_refunded OR _did_refund,
      -- Even an ID-less row may have a committed Google event whose database
      -- persistence failed. The reconciler searches by redemption stamp before
      -- deciding there is nothing to delete.
      calendar_action = 'delete',
      calendar_status = 'pending',
      calendar_error = NULL,
      calendar_lease_until = NULL,
      needs_gcal_sync = true,
      gcal_state = 'pending',
      gcal_error = NULL
  WHERE id = _redemption.id
  RETURNING * INTO _redemption;

  UPDATE public.schedule_events
  SET status = 'cancelled', deleted_at = COALESCE(deleted_at, now())
  WHERE id = _redemption.schedule_event_id
     OR (_redemption.google_event_id IS NOT NULL AND google_event_id = _redemption.google_event_id);

  RETURN jsonb_build_object(
    'redemption', to_jsonb(_redemption),
    'pass', to_jsonb(_pass),
    'was_existing', false,
    'refunded', _did_refund
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_booking_redemption(uuid, boolean, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_redemption(uuid, boolean, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.manage_booking_pass(
  _pass_id uuid,
  _action text,
  _credits int DEFAULT NULL,
  _session_length_minutes int DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL,
  _clear_expiry boolean DEFAULT false
) RETURNS public.booking_passes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pass public.booking_passes%ROWTYPE;
BEGIN
  SELECT * INTO _pass FROM public.booking_passes WHERE id = _pass_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pass_not_found' USING ERRCODE = 'P0404';
  END IF;

  IF _action = 'add_credits' THEN
    IF _credits IS NULL OR _credits < 1 OR _credits > 50 THEN
      RAISE EXCEPTION 'invalid_credits' USING ERRCODE = 'P0400';
    END IF;
    UPDATE public.booking_passes
    SET total_credits = total_credits + _credits,
        status = CASE
          WHEN status = 'exhausted' AND (expires_at IS NULL OR expires_at > now()) THEN 'active'
          ELSE status
        END
    WHERE id = _pass_id RETURNING * INTO _pass;
  ELSIF _action IN ('set_remaining', 'set_terms_and_remaining') THEN
    IF _credits IS NULL OR _credits < 0 OR _credits > 50 THEN
      RAISE EXCEPTION 'invalid_credits' USING ERRCODE = 'P0400';
    END IF;
    IF _pass.used_credits = 0 AND _credits = 0 THEN
      RAISE EXCEPTION 'invalid_credits' USING ERRCODE = 'P0400';
    END IF;
    IF _action = 'set_terms_and_remaining'
      AND _session_length_minutes IS NOT NULL
      AND (_session_length_minutes < 15 OR _session_length_minutes > 480) THEN
      RAISE EXCEPTION 'invalid_session_length' USING ERRCODE = 'P0400';
    END IF;
    UPDATE public.booking_passes
    SET total_credits = used_credits + _credits,
        session_length_minutes = CASE
          WHEN _action = 'set_terms_and_remaining' THEN COALESCE(_session_length_minutes, session_length_minutes)
          ELSE session_length_minutes
        END,
        expires_at = CASE
          WHEN _action = 'set_terms_and_remaining' AND _clear_expiry THEN NULL
          WHEN _action = 'set_terms_and_remaining' THEN COALESCE(_expires_at, expires_at)
          ELSE expires_at
        END,
        status = CASE
          WHEN status IN ('revoked', 'paused') THEN status
          WHEN _action = 'set_terms_and_remaining' AND NOT _clear_expiry
            AND COALESCE(_expires_at, expires_at) IS NOT NULL
            AND COALESCE(_expires_at, expires_at) <= now() THEN 'expired'
          WHEN _action <> 'set_terms_and_remaining' AND expires_at IS NOT NULL AND expires_at <= now() THEN 'expired'
          WHEN _credits = 0 THEN 'exhausted'
          ELSE 'active'
        END
    WHERE id = _pass_id RETURNING * INTO _pass;
  ELSIF _action = 'pause' THEN
    IF _pass.status = 'revoked' THEN RAISE EXCEPTION 'pass_revoked' USING ERRCODE = 'P0400'; END IF;
    UPDATE public.booking_passes SET status = 'paused' WHERE id = _pass_id RETURNING * INTO _pass;
  ELSIF _action = 'resume' THEN
    IF _pass.status <> 'paused' THEN RAISE EXCEPTION 'pass_not_paused' USING ERRCODE = 'P0400'; END IF;
    UPDATE public.booking_passes
    SET status = CASE
      WHEN expires_at IS NOT NULL AND expires_at <= now() THEN 'expired'
      WHEN used_credits >= total_credits THEN 'exhausted'
      ELSE 'active'
    END
    WHERE id = _pass_id RETURNING * INTO _pass;
  ELSIF _action = 'update_terms' THEN
    IF _session_length_minutes IS NOT NULL
      AND (_session_length_minutes < 15 OR _session_length_minutes > 480) THEN
      RAISE EXCEPTION 'invalid_session_length' USING ERRCODE = 'P0400';
    END IF;
    UPDATE public.booking_passes
    SET session_length_minutes = COALESCE(_session_length_minutes, session_length_minutes),
        expires_at = CASE WHEN _clear_expiry THEN NULL ELSE COALESCE(_expires_at, expires_at) END,
        status = CASE
          WHEN status IN ('revoked', 'paused') THEN status
          WHEN NOT _clear_expiry AND COALESCE(_expires_at, expires_at) IS NOT NULL
            AND COALESCE(_expires_at, expires_at) <= now() THEN 'expired'
          WHEN used_credits >= total_credits THEN 'exhausted'
          ELSE 'active'
        END
    WHERE id = _pass_id RETURNING * INTO _pass;
  ELSIF _action = 'revoke' THEN
    UPDATE public.booking_passes SET status = 'revoked' WHERE id = _pass_id RETURNING * INTO _pass;
  ELSE
    RAISE EXCEPTION 'invalid_action' USING ERRCODE = 'P0400';
  END IF;

  RETURN _pass;
END;
$$;

REVOKE ALL ON FUNCTION public.manage_booking_pass(uuid, text, int, int, timestamptz, boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_booking_pass(uuid, text, int, int, timestamptz, boolean) TO service_role;
