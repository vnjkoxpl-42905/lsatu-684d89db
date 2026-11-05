CREATE OR REPLACE FUNCTION public.reconcile_booking_calendar_event(_redemption_id uuid, _google_event_id text, _start_at timestamp with time zone, _end_at timestamp with time zone, _deleted boolean DEFAULT false, _meet_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _red public.booking_pass_redemptions%ROWTYPE; _conflict uuid;
BEGIN
  SELECT * INTO _red FROM public.booking_pass_redemptions WHERE id = _redemption_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'redemption_not_found' USING ERRCODE = 'P0404'; END IF;
  IF _deleted THEN
    INSERT INTO public.booking_calendar_alerts (redemption_id, alert_type, details)
    VALUES (_redemption_id, 'deleted', jsonb_build_object('google_event_id', _google_event_id))
    ON CONFLICT (redemption_id, alert_type) WHERE status = 'open' DO UPDATE SET details = EXCLUDED.details;
    UPDATE public.booking_pass_redemptions
    SET calendar_action = 'none', calendar_status = 'failed',
        calendar_error = 'google_event_deleted_requires_adjudication', calendar_lease_until = NULL,
        gcal_state = 'failed', gcal_error = 'google_event_deleted_requires_adjudication', needs_gcal_sync = false
    WHERE id = _redemption_id RETURNING * INTO _red;
    RETURN jsonb_build_object('outcome', 'deleted_alert', 'redemption', to_jsonb(_red));
  END IF;
  -- Match the buffered no_overlapping_bookings constraint so near-miss moves become alerts.
  SELECT id INTO _conflict FROM public.booking_pass_redemptions
  WHERE id <> _redemption_id AND status = 'booked'
    AND public.booking_buffered_range(start_at, end_at) && public.booking_buffered_range(_start_at, _end_at)
  LIMIT 1;
  IF _conflict IS NULL THEN
    BEGIN
      UPDATE public.booking_pass_redemptions
      SET start_at = _start_at, end_at = _end_at, google_event_id = COALESCE(_google_event_id, google_event_id),
          meet_url = COALESCE(_meet_url, meet_url), calendar_action = 'none', calendar_status = 'synced',
          calendar_error = NULL, calendar_lease_until = NULL, calendar_last_synced_at = now(),
          needs_gcal_sync = false, gcal_state = 'synced', gcal_error = NULL
      WHERE id = _redemption_id RETURNING * INTO _red;
      RETURN jsonb_build_object('outcome', 'updated', 'redemption', to_jsonb(_red));
    EXCEPTION WHEN exclusion_violation THEN
      _conflict := NULL;
    END;
  END IF;
  INSERT INTO public.booking_calendar_alerts (redemption_id, alert_type, details)
  VALUES (_redemption_id, 'move_conflict', jsonb_build_object('google_event_id', _google_event_id, 'conflicting_redemption_id', _conflict, 'requested_start_at', _start_at, 'requested_end_at', _end_at))
  ON CONFLICT (redemption_id, alert_type) WHERE status = 'open' DO UPDATE SET details = EXCLUDED.details;
  RETURN jsonb_build_object('outcome', 'move_conflict', 'conflicting_redemption_id', _conflict);
END; $function$;