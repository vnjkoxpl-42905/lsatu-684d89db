-- lovable-cron-fallback-reviewed: 1440 runs/day; paid bookings must have their calendar promotion and confirmation emails retried within a minute, and the check is a single indexed EXISTS that makes no HTTP call when idle.
-- Scheduled retry/recovery invocation for the single-session outbox worker.
-- No shared credential is stored in SQL, cron metadata, or the repository.
-- Instead the scheduler mints a single-use, short-lived ticket that only a
-- service-role caller can read, and the worker consumes it to authenticate.

CREATE TABLE IF NOT EXISTS public.booking_worker_tickets (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '2 minutes',
  consumed_at timestamptz
);

GRANT ALL ON public.booking_worker_tickets TO service_role;
ALTER TABLE public.booking_worker_tickets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS booking_worker_tickets_expiry_idx
  ON public.booking_worker_tickets (expires_at);

CREATE OR REPLACE FUNCTION public.consume_booking_worker_ticket(_token uuid, _worker text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _ok boolean := false;
BEGIN
  UPDATE public.booking_worker_tickets
     SET consumed_at = now()
   WHERE token = _token
     AND worker = _worker
     AND consumed_at IS NULL
     AND expires_at > now()
  RETURNING true INTO _ok;

  DELETE FROM public.booking_worker_tickets WHERE expires_at < now() - interval '1 hour';
  RETURN COALESCE(_ok, false);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.invoke_single_session_outbox()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _token uuid;
  _url text := 'https://atrcqxpmqrynmtvvyjju.supabase.co/functions/v1/single-session-outbox';
BEGIN
  -- Cheap when idle: no HTTP call unless the worker has claimable work, using
  -- the same candidate predicate as claim_single_session_outbox().
  IF NOT EXISTS (
    SELECT 1 FROM public.single_session_outbox o
    WHERE (o.state = 'pending' OR (o.state = 'leased' AND o.lease_until <= now()))
      AND o.next_retry_at <= now()
      AND o.attempts < o.max_attempts
  ) THEN
    RETURN 'idle';
  END IF;

  INSERT INTO public.booking_worker_tickets (worker)
  VALUES ('single-session-outbox')
  RETURNING token INTO _token;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-ticket', _token::text),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  RETURN 'invoked';
END;
$fn$;

REVOKE ALL ON FUNCTION public.consume_booking_worker_ticket(uuid, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.invoke_single_session_outbox() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_booking_worker_ticket(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.invoke_single_session_outbox() TO service_role;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'single-session-outbox-every-minute') THEN
    PERFORM cron.unschedule('single-session-outbox-every-minute');
  END IF;
  PERFORM cron.schedule(
    'single-session-outbox-every-minute',
    '* * * * *',
    'SELECT public.invoke_single_session_outbox();'
  );
END
$do$;