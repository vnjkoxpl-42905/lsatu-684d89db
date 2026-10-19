-- lovable-cron-fallback-reviewed: 1440 runs/day; expired booking holds must release slots within ~1 minute, matching the existing outbox worker cadence; invoker exits early when no holds are pending.
CREATE TABLE IF NOT EXISTS public.booking_worker_secrets (
  worker text PRIMARY KEY,
  secret text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.booking_worker_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.booking_worker_secrets TO service_role;
ALTER TABLE public.booking_worker_secrets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.invoke_single_session_sweeper()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _secret text;
  _due boolean;
  _stale boolean;
  _url text := 'https://atrcqxpmqrynmtvvyjju.supabase.co/functions/v1/single-session-sweeper';
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.single_session_bookings b
    WHERE b.status IN ('draft', 'checkout_open')
      AND (b.sweep_lease_until IS NULL OR b.sweep_lease_until <= now())
  ) INTO _due;

  SELECT COALESCE(max(last_success_at), 'epoch'::timestamptz) < now() - interval '1 hour'
    FROM public.booking_worker_heartbeats WHERE worker_name = 'single-session-sweeper'
  INTO _stale;

  IF NOT _due AND NOT COALESCE(_stale, true) THEN
    RETURN 'idle';
  END IF;

  SELECT secret INTO _secret FROM public.booking_worker_secrets WHERE worker = 'booking';
  IF _secret IS NULL THEN
    RETURN 'secret_missing';
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', _secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  RETURN 'invoked';
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_single_session_sweeper() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_single_session_sweeper() TO service_role;

SELECT cron.schedule('single-session-sweeper-every-minute', '* * * * *', 'SELECT public.invoke_single_session_sweeper();');