
DROP POLICY IF EXISTS "Authenticated can read sync state" ON public.gcal_sync_state;
DROP POLICY IF EXISTS "Admins can read sync state" ON public.gcal_sync_state;
CREATE POLICY "Admins can read sync state"
  ON public.gcal_sync_state FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Authenticated can read schedule events" ON public.schedule_events;
DROP POLICY IF EXISTS "Admins can read schedule events" ON public.schedule_events;
CREATE POLICY "Admins can read schedule events"
  ON public.schedule_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_booking_pass(uuid, text, timestamptz, timestamptz, uuid, text, text, text) FROM anon, PUBLIC;
