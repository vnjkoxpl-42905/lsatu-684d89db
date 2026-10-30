CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE public.single_session_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  name text,
  email text,
  notes text,
  guests jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_idempotency_key text NOT NULL UNIQUE,
  draft_expires_at timestamptz NOT NULL,
  checkout_request_fingerprint text,
  checkout_fingerprint_disposition text NOT NULL DEFAULT 'none',
  stripe_checkout_session_id text UNIQUE,
  stripe_checkout_url text,
  stripe_expires_at timestamptz,
  stripe_payment_intent_id text,
  amount_cents integer,
  currency text,
  livemode boolean,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_token_hash text NOT NULL UNIQUE,
  booking_token_expires_at timestamptz NOT NULL,
  cancel_token_hash text UNIQUE,
  cancel_token_expires_at timestamptz,
  stripe_refund_id text UNIQUE,
  stripe_refund_status text,
  gcal_event_id text UNIQUE,
  meet_url text,
  lifecycle_version integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  terminal_reason text,
  ip_hash text,
  sweep_worker_id text,
  sweep_lease_token uuid,
  sweep_lease_until timestamptz,
  sweep_attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_session_duration_chk CHECK (end_at = start_at + interval '70 minutes'),
  CONSTRAINT single_session_guests_chk CHECK (jsonb_typeof(guests) = 'array' AND jsonb_array_length(guests) <= 10),
  CONSTRAINT single_session_lifecycle_version_chk CHECK (lifecycle_version >= 0),
  CONSTRAINT single_session_amount_chk CHECK (amount_cents IS NULL OR amount_cents = 4500),
  CONSTRAINT single_session_currency_chk CHECK (currency IS NULL OR lower(currency) = 'usd'),
  CONSTRAINT single_session_status_chk CHECK (status IN (
    'draft', 'checkout_open', 'booked', 'cancelled', 'expired', 'abandoned',
    'refund_pending', 'refunded', 'refund_failed'
  )),
  CONSTRAINT single_session_fingerprint_disposition_chk CHECK (checkout_fingerprint_disposition IN (
    'none', 'persisted', 'attached', 'stripe_expired', 'stripe_absent'
  )),
  CONSTRAINT single_session_checkout_expiry_chk CHECK (
    (stripe_checkout_session_id IS NULL AND stripe_expires_at IS NULL)
    OR (stripe_checkout_session_id IS NOT NULL AND stripe_expires_at IS NOT NULL)
  ),
  CONSTRAINT single_session_cancel_token_chk CHECK (
    (cancel_token_hash IS NULL AND cancel_token_expires_at IS NULL)
    OR (cancel_token_hash IS NOT NULL AND cancel_token_expires_at = start_at)
  )
);

ALTER TABLE public.single_session_bookings
  ADD CONSTRAINT single_session_no_occupying_overlap
  EXCLUDE USING gist (tstzrange(start_at, end_at, '[)') WITH &&)
  WHERE (status IN ('draft', 'checkout_open', 'booked'));

CREATE INDEX single_session_bookings_start_at_idx
  ON public.single_session_bookings (start_at);
CREATE INDEX single_session_bookings_status_expiry_idx
  ON public.single_session_bookings (status, stripe_expires_at, draft_expires_at);
CREATE INDEX single_session_bookings_email_idx
  ON public.single_session_bookings (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX single_session_bookings_user_idx
  ON public.single_session_bookings (user_id, start_at) WHERE user_id IS NOT NULL;
CREATE INDEX single_session_bookings_sweep_idx
  ON public.single_session_bookings (sweep_lease_until, status, updated_at);

CREATE TABLE public.single_session_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.single_session_bookings(id) ON DELETE CASCADE,
  action text NOT NULL,
  recipient text NOT NULL DEFAULT 'system',
  state text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 8,
  lease_worker_id text,
  lease_token uuid,
  lease_until timestamptz,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  provider_status text,
  last_error text,
  idempotency_key text NOT NULL UNIQUE,
  precondition_status text NOT NULL,
  precondition_lifecycle_version integer NOT NULL,
  payload_ciphertext text,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  sensitive_payload_purged_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_session_outbox_action_chk CHECK (action IN (
    'gcal_promote', 'gcal_delete', 'email_booking_confirmation',
    'email_admin_notification', 'email_cancellation',
    'email_refund_apology', 'stripe_refund'
  )),
  CONSTRAINT single_session_outbox_state_chk CHECK (state IN (
    'blocked', 'pending', 'leased', 'succeeded', 'failed', 'superseded'
  )),
  CONSTRAINT single_session_outbox_attempts_chk CHECK (
    attempts >= 0 AND max_attempts > 0 AND attempts <= max_attempts
  ),
  UNIQUE (booking_id, action, recipient)
);

CREATE INDEX single_session_outbox_claim_idx
  ON public.single_session_outbox (state, next_retry_at, lease_until, created_at);
CREATE INDEX single_session_outbox_booking_idx
  ON public.single_session_outbox (booking_id, state);

CREATE TABLE public.booking_worker_heartbeats (
  worker_name text PRIMARY KEY,
  last_start_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_worker_name_chk CHECK (worker_name IN (
    'single-session-sweeper', 'single-session-outbox', 'gcal-reconciler'
  ))
);

ALTER TABLE public.single_session_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.single_session_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_worker_heartbeats ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.single_session_bookings FROM public, anon, authenticated;
REVOKE ALL ON public.single_session_outbox FROM public, anon, authenticated;
REVOKE ALL ON public.booking_worker_heartbeats FROM public, anon, authenticated;
GRANT ALL ON public.single_session_bookings TO service_role;
GRANT ALL ON public.single_session_outbox TO service_role;
GRANT ALL ON public.booking_worker_heartbeats TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_single_session_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();

  IF NEW.status = OLD.status THEN
    IF NEW.lifecycle_version <> OLD.lifecycle_version THEN
      RAISE EXCEPTION 'lifecycle_version_without_transition' USING ERRCODE = 'P0409';
    END IF;
    NEW.status_changed_at := OLD.status_changed_at;
    RETURN NEW;
  END IF;

  IF NEW.lifecycle_version <> OLD.lifecycle_version + 1 THEN
    RAISE EXCEPTION 'invalid_lifecycle_version' USING ERRCODE = 'P0409';
  END IF;

  IF NOT (
    (OLD.status = 'draft' AND NEW.status IN ('checkout_open', 'expired')) OR
    (OLD.status = 'checkout_open' AND NEW.status IN ('booked', 'expired', 'abandoned', 'refund_pending')) OR
    (OLD.status = 'expired' AND NEW.status IN ('booked', 'refund_pending')) OR
    (OLD.status = 'abandoned' AND NEW.status = 'refund_pending') OR
    (OLD.status = 'booked' AND NEW.status = 'cancelled') OR
    (OLD.status = 'refund_pending' AND NEW.status IN ('refunded', 'refund_failed')) OR
    (OLD.status = 'refund_failed' AND NEW.status = 'refunded')
  ) THEN
    RAISE EXCEPTION 'invalid_single_session_transition:%->%', OLD.status, NEW.status
      USING ERRCODE = 'P0409';
  END IF;

  NEW.status_changed_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_single_session_lifecycle_trigger
BEFORE UPDATE ON public.single_session_bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_session_lifecycle();

ALTER TABLE public.booking_commerce_events
  ADD COLUMN IF NOT EXISTS single_session_booking_id uuid
  REFERENCES public.single_session_bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS booking_commerce_single_session_idx
  ON public.booking_commerce_events (single_session_booking_id, created_at)
  WHERE single_session_booking_id IS NOT NULL;

ALTER TABLE public.booking_calendar_alerts
  ALTER COLUMN redemption_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS single_session_booking_id uuid
    REFERENCES public.single_session_bookings(id) ON DELETE CASCADE;

ALTER TABLE public.booking_calendar_alerts
  DROP CONSTRAINT IF EXISTS booking_calendar_alerts_alert_type_check;
ALTER TABLE public.booking_calendar_alerts
  ADD CONSTRAINT booking_calendar_alerts_alert_type_check CHECK (alert_type IN (
    'deleted', 'move_conflict', 'duplicate_event', 'terminal_failure',
    'persistence_failure', 'double_booking', 'refund_attention'
  ));

ALTER TABLE public.booking_calendar_alerts
  ADD CONSTRAINT booking_calendar_alerts_exactly_one_owner_chk CHECK (
    (redemption_id IS NOT NULL)::integer + (single_session_booking_id IS NOT NULL)::integer = 1
  );

CREATE UNIQUE INDEX booking_calendar_alerts_one_open_single_session
  ON public.booking_calendar_alerts (single_session_booking_id, alert_type)
  WHERE status = 'open' AND single_session_booking_id IS NOT NULL;