
-- Booking passes: manual limited-use scheduling links
CREATE TABLE public.booking_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  student_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  student_email text,
  student_name text,
  total_credits int NOT NULL CHECK (total_credits > 0),
  used_credits int NOT NULL DEFAULT 0 CHECK (used_credits >= 0 AND used_credits <= total_credits),
  session_length_minutes int NOT NULL DEFAULT 60 CHECK (session_length_minutes BETWEEN 15 AND 480),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','exhausted','expired','revoked')),
  expires_at timestamptz,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_passes TO authenticated;
GRANT ALL ON public.booking_passes TO service_role;

ALTER TABLE public.booking_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage booking passes"
  ON public.booking_passes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER booking_passes_updated_at
BEFORE UPDATE ON public.booking_passes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Booking pass redemptions (one row per confirmed / attempted booking)
CREATE TABLE public.booking_pass_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_pass_id uuid NOT NULL REFERENCES public.booking_passes(id) ON DELETE CASCADE,
  schedule_event_id uuid REFERENCES public.schedule_events(id) ON DELETE SET NULL,
  google_event_id text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('booked','cancelled','failed')),
  idempotency_key text NOT NULL,
  student_name_snapshot text,
  student_email_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX booking_pass_redemptions_idem
  ON public.booking_pass_redemptions(booking_pass_id, idempotency_key);
CREATE INDEX booking_pass_redemptions_pass ON public.booking_pass_redemptions(booking_pass_id);
CREATE INDEX booking_pass_redemptions_start ON public.booking_pass_redemptions(start_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_pass_redemptions TO authenticated;
GRANT ALL ON public.booking_pass_redemptions TO service_role;

ALTER TABLE public.booking_pass_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage redemptions"
  ON public.booking_pass_redemptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Atomic redemption RPC. Called by the booking-pass edge function via service role.
CREATE OR REPLACE FUNCTION public.redeem_booking_pass(
  _pass_id uuid,
  _idempotency_key text,
  _start_at timestamptz,
  _end_at timestamptz,
  _schedule_event_id uuid,
  _google_event_id text,
  _student_name text,
  _student_email text
) RETURNS TABLE (
  redemption_id uuid,
  used_credits int,
  total_credits int,
  status text,
  was_existing boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pass public.booking_passes%ROWTYPE;
  _existing public.booking_pass_redemptions%ROWTYPE;
  _new_id uuid;
  _conflict_count int;
BEGIN
  -- Idempotency: if we already recorded this key, return that row unchanged.
  SELECT * INTO _existing FROM public.booking_pass_redemptions
   WHERE booking_pass_id = _pass_id AND idempotency_key = _idempotency_key;
  IF FOUND THEN
    SELECT * INTO _pass FROM public.booking_passes WHERE id = _pass_id;
    redemption_id := _existing.id;
    used_credits := _pass.used_credits;
    total_credits := _pass.total_credits;
    status := _pass.status;
    was_existing := true;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Lock the pass to serialize concurrent redemptions of the last credit.
  SELECT * INTO _pass FROM public.booking_passes WHERE id = _pass_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pass_not_found';
  END IF;
  IF _pass.status <> 'active' THEN
    RAISE EXCEPTION 'pass_not_active:%', _pass.status;
  END IF;
  IF _pass.expires_at IS NOT NULL AND _pass.expires_at < now() THEN
    UPDATE public.booking_passes SET status = 'expired' WHERE id = _pass_id;
    RAISE EXCEPTION 'pass_expired';
  END IF;
  IF _pass.used_credits >= _pass.total_credits THEN
    UPDATE public.booking_passes SET status = 'exhausted' WHERE id = _pass_id;
    RAISE EXCEPTION 'pass_exhausted';
  END IF;

  -- Re-check slot availability against other (non-deleted, non-cancelled) events.
  SELECT COUNT(*) INTO _conflict_count
    FROM public.schedule_events
   WHERE deleted_at IS NULL
     AND status <> 'cancelled'
     AND (_schedule_event_id IS NULL OR id <> _schedule_event_id)
     AND start_at < _end_at
     AND end_at > _start_at;
  IF _conflict_count > 0 THEN
    RAISE EXCEPTION 'slot_conflict';
  END IF;

  INSERT INTO public.booking_pass_redemptions
    (booking_pass_id, schedule_event_id, google_event_id, start_at, end_at,
     status, idempotency_key, student_name_snapshot, student_email_snapshot)
  VALUES (_pass_id, _schedule_event_id, _google_event_id, _start_at, _end_at,
          'booked', _idempotency_key, _student_name, _student_email)
  RETURNING id INTO _new_id;

  UPDATE public.booking_passes
     SET used_credits = used_credits + 1,
         status = CASE WHEN used_credits + 1 >= total_credits THEN 'exhausted' ELSE 'active' END
   WHERE id = _pass_id
   RETURNING * INTO _pass;

  redemption_id := _new_id;
  used_credits := _pass.used_credits;
  total_credits := _pass.total_credits;
  status := _pass.status;
  was_existing := false;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_booking_pass(uuid, text, timestamptz, timestamptz, uuid, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_booking_pass(uuid, text, timestamptz, timestamptz, uuid, text, text, text) TO service_role;
