CREATE OR REPLACE FUNCTION public.purge_single_session_pii(_now timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _rows integer; _tokens integer; _outbox integer; _commerce integer;
BEGIN
  UPDATE public.single_session_bookings SET
    name = NULL, email = NULL, notes = NULL, guests = '[]'::jsonb,
    stripe_checkout_url = NULL, ip_hash = NULL,
    booking_token_hash = 'purged:' || id::text,
    booking_token_expires_at = least(booking_token_expires_at, _now)
  WHERE status IN ('expired', 'abandoned')
    AND status_changed_at <= _now - interval '30 days'
    AND (name IS NOT NULL OR email IS NOT NULL OR notes IS NOT NULL OR ip_hash IS NOT NULL);
  GET DIAGNOSTICS _rows = ROW_COUNT;

  UPDATE public.single_session_bookings SET
    ip_hash = NULL,
    booking_token_hash = CASE WHEN status IN ('cancelled', 'refunded', 'refund_failed')
      THEN 'purged:' || id::text ELSE booking_token_hash END,
    cancel_token_hash = CASE WHEN status IN ('cancelled', 'refunded', 'refund_failed')
      THEN NULL ELSE cancel_token_hash END,
    cancel_token_expires_at = CASE WHEN status IN ('cancelled', 'refunded', 'refund_failed')
      THEN NULL ELSE cancel_token_expires_at END
  WHERE status_changed_at <= _now - interval '30 days'
    AND (ip_hash IS NOT NULL OR (status IN ('cancelled', 'refunded', 'refund_failed')
      AND (cancel_token_hash IS NOT NULL OR booking_token_hash NOT LIKE 'purged:%')));
  GET DIAGNOSTICS _tokens = ROW_COUNT;

  UPDATE public.single_session_outbox SET
    payload_ciphertext = NULL,
    sensitive_payload_purged_at = COALESCE(sensitive_payload_purged_at, _now),
    updated_at = now()
  WHERE created_at <= _now - interval '30 days' AND payload_ciphertext IS NOT NULL;
  GET DIAGNOSTICS _outbox = ROW_COUNT;

  UPDATE public.booking_commerce_events SET payload = '{}'::jsonb
  WHERE single_session_booking_id IS NOT NULL
    AND created_at <= _now - interval '30 days'
    AND payload <> '{}'::jsonb;
  GET DIAGNOSTICS _commerce = ROW_COUNT;
  RETURN jsonb_build_object(
    'booking_pii_rows', _rows,
    'token_rows', _tokens,
    'outbox_payloads', _outbox,
    'commerce_payloads', _commerce
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_single_session_pii(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_single_session_pii(timestamptz) TO service_role;