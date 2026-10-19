-- Two production repairs on the booking surface.
--
-- 1. The native-offer cutover and get_effective_booking_offers from
--    20260816030000 never reached production, so student-booking resolved no
--    offers at all and students saw an empty purchase list. The offer registry
--    and resolver are re-stated here idempotently. The worker/outbox half of
--    that migration was already applied and is deliberately not repeated.
--
-- 2. resolve_booking_link_full RETURNS booking_passes, so a non-resolving slug
--    returns an all-NULL composite rather than an empty result. Over PostgREST
--    that is a truthy object, so public-booking treated it as a real pass and
--    filtered redemptions on uuid = 'null', turning every non-resolving link
--    into an HTTP 500. The callers now check pass.id (see the edge functions),
--    and an 'exhausted' pass resolves so a spent link renders its own page
--    instead of reading as invalid.

ALTER TABLE public.booking_offers DROP CONSTRAINT IF EXISTS booking_offers_provider_check;
ALTER TABLE public.booking_offers
  ADD CONSTRAINT booking_offers_provider_check
  CHECK (provider IN ('stripe', 'calcom', 'native'));

INSERT INTO public.booking_offers (id, label, provider, provider_ref, url, credits, active)
VALUES ('single-session-native', 'Single session', 'native', 'single-session-native', '/book/session', 0, true)
ON CONFLICT (id) DO UPDATE SET
  label = excluded.label,
  provider = excluded.provider,
  provider_ref = excluded.provider_ref,
  url = excluded.url,
  credits = excluded.credits,
  active = excluded.active;

UPDATE public.booking_offers SET active = false WHERE id = 'single-session';

-- Carry enabled state and native-relative/empty URL semantics to the native row.
INSERT INTO public.student_booking_offers (
  student_id, offer_id, enabled, url_override, created_at, updated_at
)
SELECT student_id, 'single-session-native', enabled,
  CASE WHEN NULLIF(trim(url_override), '') IS NULL THEN NULL ELSE url_override END,
  created_at, now()
FROM public.student_booking_offers
WHERE offer_id = 'single-session'
  AND (NULLIF(trim(url_override), '') IS NULL OR trim(url_override) LIKE '/%')
ON CONFLICT (student_id, offer_id) DO UPDATE SET
  enabled = excluded.enabled,
  url_override = excluded.url_override,
  updated_at = now();

DELETE FROM public.student_booking_offers
WHERE offer_id = 'single-session'
  AND (NULLIF(trim(url_override), '') IS NULL OR trim(url_override) LIKE '/%');

CREATE OR REPLACE FUNCTION public.get_effective_booking_offers(_student_id uuid)
RETURNS TABLE (
  id text,
  label text,
  provider text,
  provider_ref text,
  url text,
  credits integer,
  enabled boolean,
  is_legacy_external_override boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH arrangement AS (
    SELECT EXISTS (
      SELECT 1 FROM public.student_booking_offers WHERE student_id = _student_id
    ) AS has_rows
  ), default_offers AS (
    SELECT o.id, o.label, o.provider, o.provider_ref,
      o.url, o.credits, true AS enabled,
      false AS is_legacy_external_override
    FROM public.booking_offers o
    CROSS JOIN arrangement a
    WHERE NOT a.has_rows AND o.active
  ), arranged_offers AS (
    SELECT o.id, o.label, o.provider, o.provider_ref,
      COALESCE(NULLIF(trim(s.url_override), ''), o.url) AS url,
      o.credits, true AS enabled,
      (o.id = 'single-session' AND NULLIF(trim(s.url_override), '') IS NOT NULL
        AND trim(s.url_override) NOT LIKE '/%') AS is_legacy_external_override
    FROM public.student_booking_offers s
    JOIN public.booking_offers o ON o.id = s.offer_id
    WHERE s.student_id = _student_id AND s.enabled
      AND (o.active OR (o.id = 'single-session'
        AND NULLIF(trim(s.url_override), '') IS NOT NULL
        AND trim(s.url_override) NOT LIKE '/%'))
  )
  SELECT * FROM default_offers
  UNION ALL
  SELECT * FROM arranged_offers;
$$;

CREATE OR REPLACE FUNCTION public.resolve_booking_link_full(_slug text)
 RETURNS booking_passes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _pass public.booking_passes%ROWTYPE;
BEGIN
  IF _slug IS NULL OR length(_slug) < 3 OR length(_slug) > 128 THEN RETURN NULL; END IF;
  -- 'exhausted' resolves so a spent pass renders its own page (0 remaining, no
  -- slots) instead of reading as an invalid link. Booking is still refused
  -- downstream: slots returns [] for any non-active status and book returns
  -- 409 no_sessions_remaining on zero credits. 'revoked' stays unresolvable.
  SELECT * INTO _pass FROM public.booking_passes
   WHERE booking_slug = _slug AND status IN ('active', 'paused', 'exhausted');
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF _pass.expires_at IS NOT NULL AND _pass.expires_at <= now() THEN
    UPDATE public.booking_passes SET status = 'expired' WHERE id = _pass.id;
    RETURN NULL;
  END IF;
  RETURN _pass;
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_booking_link_full(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_booking_link_full(text) TO service_role;
