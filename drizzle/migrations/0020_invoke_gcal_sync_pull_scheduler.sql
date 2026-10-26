CREATE OR REPLACE FUNCTION public.invoke_gcal_sync_pull()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token uuid;
  _url text := 'https://atrcqxpmqrynmtvvyjju.supabase.co/functions/v1/gcal-sync-pull';
BEGIN
  INSERT INTO public.booking_worker_tickets (worker)
  VALUES ('gcal-sync-pull')
  RETURNING token INTO _token;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-ticket', _token::text),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  RETURN 'invoked';
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_gcal_sync_pull() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_gcal_sync_pull() TO service_role;