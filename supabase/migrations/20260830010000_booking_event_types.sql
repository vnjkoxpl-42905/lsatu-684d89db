-- What a bookable event IS, as data instead of as constants.
--
-- The single session's shape -- 70 minutes, 24 hours' notice, no buffers, a six
-- business day window, $45 -- is currently written into the edge function AND
-- into three SQL functions that enforce the slot policy inside the booking
-- transaction. That is why there can only ever be one kind of session: a
-- consultation is 30 minutes with 30-minute buffers and a five day window, and
-- there is nowhere to say so.
--
-- This migration only creates the vocabulary and seeds it with the values that
-- are live today. Nothing reads it yet, so this changes no behavior. The SQL
-- policy functions are switched over to it next, one at a time.
--
-- Every number here was read from Joshua's Cal.com account on 2026-08-30, which
-- stays the reference for what these events are supposed to be.

CREATE TABLE IF NOT EXISTS public.booking_event_types (
  slug text PRIMARY KEY,
  label text NOT NULL,
  length_minutes int NOT NULL CHECK (length_minutes > 0),
  -- Null means "start a slot every length_minutes", which is what Cal.com does
  -- when no explicit interval is set. The single session's back-to-back 70
  -- minute chain (1:00, 2:10, 3:20) is this rule, not a quirk.
  slot_interval_minutes int CHECK (slot_interval_minutes IS NULL OR slot_interval_minutes > 0),
  minimum_notice_minutes int NOT NULL DEFAULT 1440 CHECK (minimum_notice_minutes >= 0),
  buffer_before_minutes int NOT NULL DEFAULT 0 CHECK (buffer_before_minutes >= 0),
  buffer_after_minutes int NOT NULL DEFAULT 0 CHECK (buffer_after_minutes >= 0),
  -- Business days size the window; days inside it are offered whenever the
  -- weekly hours cover them, Saturday included.
  window_business_days int NOT NULL DEFAULT 6 CHECK (window_business_days > 0),
  price_cents int NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  requires_payment boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.booking_event_types (
  slug, label, length_minutes, slot_interval_minutes, minimum_notice_minutes,
  buffer_before_minutes, buffer_after_minutes, window_business_days,
  price_cents, currency, requires_payment
) VALUES
  ('single-session', 'LSAT Session', 70, NULL, 1440, 0,  0,  6, 4500, 'usd', true),
  ('consultation',   'Consultation', 30, NULL, 1440, 30, 30, 5,    0, 'usd', false)
ON CONFLICT (slug) DO NOTHING;

-- One student, one price. Joshua already runs this by hand on Cal.com -- there
-- are twelve event types on that account and most of them exist only because a
-- particular person pays a particular rate. Keyed by email because the booker
-- is not necessarily signed in when they book.
CREATE TABLE IF NOT EXISTS public.booking_price_overrides (
  email text NOT NULL,
  event_slug text NOT NULL REFERENCES public.booking_event_types(slug) ON DELETE CASCADE,
  price_cents int NOT NULL CHECK (price_cents >= 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email, event_slug)
);

ALTER TABLE public.booking_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_price_overrides ENABLE ROW LEVEL SECURITY;

-- Students never read these directly: the booking page gets everything it needs
-- from the edge function, which runs as service_role.
CREATE POLICY "Admins manage booking event types"
  ON public.booking_event_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage booking price overrides"
  ON public.booking_price_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_event_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_price_overrides TO authenticated;
GRANT ALL ON public.booking_event_types TO service_role;
GRANT ALL ON public.booking_price_overrides TO service_role;

-- The price a given booker pays for a given event: their override, else the
-- event's own price. One definition, so the checkout and the payment
-- verification can never disagree about what was owed.
CREATE OR REPLACE FUNCTION public.booking_price_cents(_event_slug text, _email text)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT o.price_cents FROM public.booking_price_overrides o
      WHERE o.event_slug = _event_slug AND lower(o.email) = lower(COALESCE(_email, ''))),
    (SELECT t.price_cents FROM public.booking_event_types t WHERE t.slug = _event_slug)
  );
$$;

REVOKE ALL ON FUNCTION public.booking_price_cents(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.booking_price_cents(text, text) TO service_role;
