-- Booking remediation Phase 3: calendar reconciliation, leases, mismatches,
-- transparency, and live cron hooks.

ALTER TABLE public.schedule_events
  ADD COLUMN IF NOT EXISTS transparency text NOT NULL DEFAULT 'opaque';

ALTER TABLE public.gcal_sync_state
  ADD COLUMN IF NOT EXISTS busy_calendar_ids text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sync_token_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.schedule_events'::regclass
      AND conname = 'schedule_events_transparency_ck'
  ) THEN
    ALTER TABLE public.schedule_events
      ADD CONSTRAINT schedule_events_transparency_ck
      CHECK (transparency IN ('opaque', 'transparent'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.booking_calendar_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id uuid NOT NULL REFERENCES public.booking_pass_redemptions(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('deleted', 'move_conflict', 'duplicate_event', 'terminal_failure', 'persistence_failure')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS booking_calendar_alerts_one_open
  ON public.booking_calendar_alerts (redemption_id, alert_type)
  WHERE status = 'open';

ALTER TABLE public.booking_calendar_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage booking calendar alerts" ON public.booking_calendar_alerts;
CREATE POLICY "Admins manage booking calendar alerts"
  ON public.booking_calendar_alerts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_calendar_alerts TO authenticated;
GRANT ALL ON public.booking_calendar_alerts TO service_role;

CREATE OR REPLACE FUNCTION public.claim_booking_calendar_actions(
  _limit int DEFAULT 25,
  _lease_seconds int DEFAULT 120
) RETURNS SETOF public.booking_pass_redemptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.booking_pass_redemptions
    WHERE calendar_action <> 'none'
      AND calendar_status IN ('pending', 'processing')
      AND (calendar_lease_until IS NULL OR calendar_lease_until < now())
    ORDER BY updated_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(_limit, 1), 100)
  )
  UPDATE public.booking_pass_redemptions r
  SET calendar_status = 'processing',
      calendar_attempts = calendar_attempts + 1,
      calendar_lease_until = now() + make_interval(secs => LEAST(GREATEST(_lease_seconds, 30), 600))
  FROM candidates c
  WHERE r.id = c.id
  RETURNING r.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_booking_calendar_actions(int, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_calendar_actions(int, int) TO service_role;

CREATE OR REPLACE FUNCTION public.reconcile_booking_calendar_event(
  _redemption_id uuid,
  _google_event_id text,
  _start_at timestamptz,
  _end_at timestamptz,
  _deleted boolean DEFAULT false,
  _meet_url text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _red public.booking_pass_redemptions%ROWTYPE;
  _conflict uuid;
BEGIN
  SELECT * INTO _red FROM public.booking_pass_redemptions
  WHERE id = _redemption_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'redemption_not_found' USING ERRCODE = 'P0404';
  END IF;

  IF _deleted THEN
    INSERT INTO public.booking_calendar_alerts (redemption_id, alert_type, details)
    VALUES (_redemption_id, 'deleted', jsonb_build_object('google_event_id', _google_event_id))
    ON CONFLICT (redemption_id, alert_type) WHERE status = 'open'
    DO UPDATE SET details = EXCLUDED.details;

    UPDATE public.booking_pass_redemptions
    SET calendar_action = 'none', calendar_status = 'failed',
        calendar_error = 'google_event_deleted_requires_adjudication',
        calendar_lease_until = NULL,
        gcal_state = 'failed', gcal_error = 'google_event_deleted_requires_adjudication',
        needs_gcal_sync = false
    WHERE id = _redemption_id RETURNING * INTO _red;
    RETURN jsonb_build_object('outcome', 'deleted_alert', 'redemption', to_jsonb(_red));
  END IF;

  SELECT id INTO _conflict
  FROM public.booking_pass_redemptions
  WHERE id <> _redemption_id AND status = 'booked'
    AND start_at < _end_at AND end_at > _start_at
  LIMIT 1;

  IF _conflict IS NOT NULL THEN
    INSERT INTO public.booking_calendar_alerts (redemption_id, alert_type, details)
    VALUES (_redemption_id, 'move_conflict', jsonb_build_object(
      'google_event_id', _google_event_id,
      'conflicting_redemption_id', _conflict,
      'requested_start_at', _start_at,
      'requested_end_at', _end_at
    ))
    ON CONFLICT (redemption_id, alert_type) WHERE status = 'open'
    DO UPDATE SET details = EXCLUDED.details;
    RETURN jsonb_build_object('outcome', 'move_conflict', 'conflicting_redemption_id', _conflict);
  END IF;

  UPDATE public.booking_pass_redemptions
  SET start_at = _start_at, end_at = _end_at,
      google_event_id = COALESCE(_google_event_id, google_event_id),
      meet_url = COALESCE(_meet_url, meet_url),
      calendar_action = 'none', calendar_status = 'synced',
      calendar_error = NULL, calendar_lease_until = NULL,
      calendar_last_synced_at = now(), needs_gcal_sync = false,
      gcal_state = 'synced', gcal_error = NULL
  WHERE id = _redemption_id RETURNING * INTO _red;

  RETURN jsonb_build_object('outcome', 'updated', 'redemption', to_jsonb(_red));
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_booking_calendar_event(uuid, text, timestamptz, timestamptz, boolean, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_booking_calendar_event(uuid, text, timestamptz, timestamptz, boolean, text) TO service_role;

-- The two cron jobs are installed during the Lovable production apply because
-- their Authorization header comes from Lovable's project-scoped service key.
-- Expected names/schedules:
--   booking-gcal-reconcile  * * * * *
--   booking-gcal-sync-pull  */5 * * * *
