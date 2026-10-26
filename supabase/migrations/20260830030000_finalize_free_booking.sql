-- Booking something that costs nothing.
--
-- Every path to a confirmed booking runs through the Stripe webhook today, so a
-- free event has no way to finish: it holds the slot, puts a tentative event on
-- the calendar, and waits forever for a payment that will never arrive. This is
-- the missing door -- the same promotion finalize_single_session_payment does,
-- with the payment facts removed and nothing else changed.
--
-- The one rule that matters: this refuses outright on any event whose type says
-- requires_payment. A free confirmation is not a shortcut that a paid session
-- can be talked into taking, whatever the caller sends.
CREATE OR REPLACE FUNCTION public.finalize_single_session_free(
  _booking_id uuid,
  _expected_version integer,
  _live_calendar_clear boolean,
  _cancel_token_hash text,
  _cancel_payload_ciphertext text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  _booking public.single_session_bookings%ROWTYPE;
  _requires_payment boolean;
  _can_book boolean := false;
  _new_version integer;
  _slot_start timestamptz;
BEGIN
  SELECT start_at INTO _slot_start FROM public.single_session_bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0404'; END IF;
  PERFORM pg_advisory_xact_lock(public.single_session_slot_lock_key(_slot_start));
  SELECT * INTO _booking FROM public.single_session_bookings WHERE id = _booking_id FOR UPDATE;

  SELECT requires_payment INTO _requires_payment
  FROM public.booking_event_types WHERE slug = _booking.event_slug;
  IF _requires_payment IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'payment_required' USING ERRCODE = 'P0400';
  END IF;

  -- Already finished. Say so rather than doing it twice: the browser retries
  -- this call, and a retry must not enqueue a second confirmation email.
  IF _booking.status = 'booked' THEN
    RETURN jsonb_build_object('booking_id', _booking.id, 'status', _booking.status,
      'lifecycle_version', _booking.lifecycle_version, 'was_existing', true);
  END IF;

  IF _booking.status <> 'draft' OR _booking.lifecycle_version <> _expected_version THEN
    RAISE EXCEPTION 'stale_booking' USING ERRCODE = 'P0409';
  END IF;

  IF NULLIF(_cancel_token_hash, '') IS NULL OR NULLIF(_cancel_payload_ciphertext, '') IS NULL THEN
    RAISE EXCEPTION 'cancel_capability_required' USING ERRCODE = 'P0400';
  END IF;

  -- The same last look the paid path takes: the calendar was clear a moment ago
  -- and nothing else in this database holds the time.
  _can_book := _live_calendar_clear
    AND NOT EXISTS (
      SELECT 1 FROM public.single_session_bookings b
      WHERE b.id <> _booking.id AND b.status IN ('draft', 'checkout_open', 'booked')
        AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange(_booking.start_at, _booking.end_at, '[)')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.booking_pass_redemptions r
      WHERE r.status = 'booked'
        AND tstzrange(r.start_at - interval '15 minutes', r.end_at + interval '15 minutes', '[)')
            && tstzrange(_booking.start_at, _booking.end_at, '[)')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.schedule_events se
      WHERE se.deleted_at IS NULL AND se.status <> 'cancelled'
        AND (_booking.gcal_event_id IS NULL OR se.google_event_id IS DISTINCT FROM _booking.gcal_event_id)
        AND se.start_at < _booking.end_at AND se.end_at > _booking.start_at
    );

  IF NOT _can_book THEN
    -- Nothing was charged, so there is nothing to refund: the hold simply dies
    -- and the tentative calendar event is swept.
    UPDATE public.single_session_bookings b SET
      status = 'expired', lifecycle_version = b.lifecycle_version + 1,
      terminal_reason = 'slot_taken_before_confirm'
    WHERE b.id = _booking_id RETURNING * INTO _booking;
    IF _booking.gcal_event_id IS NOT NULL THEN
      PERFORM public.enqueue_single_session_outbox(_booking.id, 'gcal_delete', 'system', 'pending',
        'expired', _booking.lifecycle_version, NULL);
    END IF;
    RETURN jsonb_build_object('booking_id', _booking.id, 'status', _booking.status,
      'lifecycle_version', _booking.lifecycle_version, 'was_existing', false);
  END IF;

  UPDATE public.single_session_bookings b SET
    status = 'booked', lifecycle_version = b.lifecycle_version + 1,
    amount_cents = 0, currency = 'usd',
    cancel_token_hash = _cancel_token_hash, cancel_token_expires_at = b.start_at,
    terminal_reason = NULL
  WHERE b.id = _booking_id RETURNING * INTO _booking;
  _new_version := _booking.lifecycle_version;

  PERFORM public.enqueue_single_session_outbox(_booking.id, 'gcal_promote', 'system', 'pending',
    'booked', _new_version, NULL);
  PERFORM public.enqueue_single_session_outbox(_booking.id, 'email_booking_confirmation', 'booker', 'blocked',
    'booked', _new_version, _cancel_payload_ciphertext);
  PERFORM public.enqueue_single_session_outbox(_booking.id, 'email_admin_notification', 'admin', 'blocked',
    'booked', _new_version, NULL);

  RETURN jsonb_build_object('booking_id', _booking.id, 'status', _booking.status,
    'lifecycle_version', _new_version, 'was_existing', false);
END;
$fn$;

REVOKE ALL ON FUNCTION public.finalize_single_session_free(uuid, integer, boolean, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_single_session_free(uuid, integer, boolean, text, text) TO service_role;
