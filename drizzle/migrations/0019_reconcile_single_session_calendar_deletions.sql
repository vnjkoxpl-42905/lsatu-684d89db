-- A native single-session event deleted from the host's Google Calendar must
-- stop occupying its time in LSAT U. The pull worker calls this only for a
-- cancelled event carrying LSAT U's private booking stamp.
CREATE OR REPLACE FUNCTION public.reconcile_single_session_calendar_deletion(
  _booking_id uuid,
  _google_event_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking public.single_session_bookings%ROWTYPE;
BEGIN
  SELECT * INTO _booking
  FROM public.single_session_bookings
  WHERE id = _booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;
  IF _booking.gcal_event_id IS DISTINCT FROM _google_event_id THEN
    RETURN jsonb_build_object('outcome', 'event_mismatch');
  END IF;
  IF _booking.status = 'cancelled' THEN
    RETURN jsonb_build_object('outcome', 'already_cancelled');
  END IF;
  IF _booking.status <> 'booked' THEN
    RETURN jsonb_build_object('outcome', 'ignored', 'status', _booking.status);
  END IF;

  UPDATE public.single_session_bookings b
  SET status = 'cancelled',
      lifecycle_version = b.lifecycle_version + 1,
      terminal_reason = 'google_calendar_deleted'
  WHERE b.id = _booking.id
  RETURNING * INTO _booking;

  UPDATE public.single_session_outbox
  SET state = 'superseded', updated_at = now()
  WHERE booking_id = _booking.id
    AND state IN ('blocked', 'pending', 'failed')
    AND action IN ('gcal_promote', 'email_booking_confirmation', 'email_admin_notification');

  RETURN jsonb_build_object(
    'outcome', 'cancelled',
    'booking_id', _booking.id,
    'lifecycle_version', _booking.lifecycle_version
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_single_session_calendar_deletion(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_single_session_calendar_deletion(uuid, text)
  TO service_role;