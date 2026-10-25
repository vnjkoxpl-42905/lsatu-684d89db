-- A free booking has no checkout phase. Its only valid confirmation path is
-- draft -> booked after the edge function has rechecked the live calendar.
-- Keep the exception narrow: the event type must explicitly be free and the
-- row being confirmed must carry a zero amount. Paid events still have to pass
-- through checkout_open before they can become booked.
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
    (
      OLD.status = 'draft'
      AND NEW.status = 'booked'
      AND NEW.amount_cents = 0
      AND EXISTS (
        SELECT 1
        FROM public.booking_event_types event_type
        WHERE event_type.slug = OLD.event_slug
          AND event_type.active
          AND event_type.requires_payment = false
          AND event_type.price_cents = 0
      )
    ) OR
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
