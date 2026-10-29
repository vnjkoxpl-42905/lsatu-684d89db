-- Invite-only booking commerce hub. Provider event ids are the idempotency
-- boundary: a webhook retry must never add package sessions twice.

CREATE TABLE IF NOT EXISTS public.booking_offers (
  id text PRIMARY KEY,
  label text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('stripe', 'calcom')),
  provider_ref text NOT NULL UNIQUE,
  url text NOT NULL,
  credits integer NOT NULL DEFAULT 0 CHECK (credits >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.booking_offers (id, label, provider, provider_ref, url, credits)
VALUES
  ('single-session', 'Single session', 'calcom', 'session-link', 'https://cal.com/joshua-jtx5ud/session-link', 0),
  ('package-5', '5-hour package', 'stripe', 'plink_1STvqYIULVCj6rqqJb70Prhb', 'https://buy.stripe.com/4gMaEY05F3dc9x13NqdZ61x', 5),
  ('package-10', '10-hour package', 'stripe', 'plink_1TvTs5IULVCj6rqqZo7FG76I', 'https://buy.stripe.com/3cI6oI2dN5lk4cHcjWdZ61O', 10)
ON CONFLICT (id) DO UPDATE SET label = excluded.label, provider = excluded.provider,
  provider_ref = excluded.provider_ref, url = excluded.url, credits = excluded.credits;

CREATE TABLE IF NOT EXISTS public.student_booking_offers (
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id text NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  url_override text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, offer_id)
);

CREATE TABLE IF NOT EXISTS public.booking_commerce_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  offer_id text REFERENCES public.booking_offers(id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('stripe', 'calcom', 'lsatu')),
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  email text,
  amount_cents integer,
  currency text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id, event_type)
);

CREATE TABLE IF NOT EXISTS public.external_booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  offer_id text REFERENCES public.booking_offers(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'calcom',
  provider_booking_id text NOT NULL UNIQUE,
  email text,
  attendee_name text,
  start_at timestamptz,
  end_at timestamptz,
  status text NOT NULL DEFAULT 'booked',
  source_url text,
  google_event_id text,
  schedule_event_id uuid REFERENCES public.schedule_events(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_booking_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_commerce_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_booking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_active_booking_offers" ON public.booking_offers
  FOR SELECT TO authenticated USING (active);
CREATE POLICY "students_read_own_booking_offers" ON public.student_booking_offers
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "students_read_own_booking_commerce" ON public.booking_commerce_events
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "students_read_own_external_bookings" ON public.external_booking_events
  FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE OR REPLACE FUNCTION public.apply_booking_package_payment(
  _student_id uuid,
  _offer_id text,
  _provider_event_id text,
  _email text DEFAULT NULL
) RETURNS public.booking_passes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _offer public.booking_offers%ROWTYPE;
  _pass public.booking_passes%ROWTYPE;
BEGIN
  SELECT * INTO _offer FROM public.booking_offers WHERE id = _offer_id AND provider = 'stripe' AND active;
  IF NOT FOUND OR _offer.credits <= 0 THEN RAISE EXCEPTION 'not_a_package_offer'; END IF;

  -- Idempotent at the provider event boundary.
  IF EXISTS (SELECT 1 FROM public.booking_commerce_events WHERE provider = 'stripe' AND provider_event_id = _provider_event_id AND event_type = 'paid') THEN
    SELECT * INTO _pass FROM public.booking_passes WHERE student_id = _student_id ORDER BY created_at DESC LIMIT 1;
    RETURN _pass;
  END IF;

  SELECT * INTO _pass FROM public.booking_passes WHERE student_id = _student_id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    UPDATE public.booking_passes
      SET total_credits = total_credits + _offer.credits,
          status = 'active', expires_at = NULL
      WHERE id = _pass.id RETURNING * INTO _pass;
  ELSE
    INSERT INTO public.booking_passes (student_id, student_email, student_name, total_credits, used_credits, session_length_minutes, status)
      VALUES (_student_id, _email, COALESCE(_email, 'Student'), _offer.credits, 0, 70, 'active')
      RETURNING * INTO _pass;
  END IF;

  INSERT INTO public.booking_commerce_events (student_id, offer_id, provider, provider_event_id, event_type, email)
    VALUES (_student_id, _offer_id, 'stripe', _provider_event_id, 'paid', _email);
  RETURN _pass;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_booking_package_payment(uuid, text, text, text) TO service_role;
