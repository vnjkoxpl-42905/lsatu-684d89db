-- Register every Stripe payment link used since 2026-01-30 as a package, so the
-- payments ledger recognizes it and offers "Grant passes" (1 credit per hour).
-- These are ledger-only: student_visible = false keeps them out of the default
-- purchase list that get_effective_booking_offers shows students.

ALTER TABLE public.booking_offers ADD COLUMN IF NOT EXISTS student_visible boolean NOT NULL DEFAULT true;

INSERT INTO public.booking_offers (id, label, provider, provider_ref, url, credits, active, student_visible) VALUES
  ('stripe-11h-500',        '11 Hour Package ($500)',                 'stripe', 'plink_1UJOQRIULVCj6rqqDN3lD7uS', 'https://buy.stripe.com/dRm3cwaKjcNMfVp4RudZ61R', 11, true, false),
  ('stripe-10h-500',        'LSAT 10 hours ($500)',                   'stripe', 'plink_1SgVvpIULVCj6rqqBHHc0pN4', 'https://buy.stripe.com/28EfZi7y71549x15VydZ61z', 10, true, false),
  ('stripe-5h-225',         '5 hours tutoring ($225)',                'stripe', 'plink_1TONzcIULVCj6rqqFTpeNIyE', 'https://buy.stripe.com/14AaEY19J3dc8sXgAcdZ61I', 5,  true, false),
  ('stripe-5h-reduced-200', '5 hour tutoring, reduced ($200)',        'stripe', 'plink_1TkAGKIULVCj6rqqV9vtZCux', 'https://buy.stripe.com/6oUaEY6u3bJI5gLcjWdZ61N', 5,  true, false),
  ('stripe-5h-200-b',       '5 hours ($200, second link)',            'stripe', 'plink_1Tg9LmIULVCj6rqq8sfrBPHb', 'https://buy.stripe.com/aFa5kE05F8xwgZt97KdZ61M', 5,  true, false),
  ('stripe-5h-275',         '5 hour ($275)',                          'stripe', 'plink_1ShEAKIULVCj6rqqqu44Crde', 'https://buy.stripe.com/14A6oIg4DeVU6kPgAcdZ61A', 5,  true, false),
  ('stripe-5h-200-c',       '5 hours tutoring ($200, older link)',    'stripe', 'plink_1RgZIpIULVCj6rqqY7j529rm', 'https://buy.stripe.com/28E8wQ3hReVU10vbfSdZ60V', 5,  true, false),
  ('stripe-4h-260',         'LSAT Tutoring Package, 4 hours ($260)',  'stripe', 'plink_1T8Kg5IULVCj6rqqiwKsbOVD', 'https://buy.stripe.com/dRm00k19J1548sXdo0dZ61G', 4,  true, false)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_effective_booking_offers(_student_id uuid)
RETURNS TABLE (
  id text, label text, provider text, provider_ref text, url text,
  credits integer, enabled boolean, is_legacy_external_override boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
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
    WHERE NOT a.has_rows AND o.active AND o.student_visible
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

-- Label historical ledger rows with their package (history never asks for a grant).
UPDATE public.stripe_payments p
  SET offer_id = o.id, product = COALESCE(p.product, 'package'), updated_at = now()
  FROM public.booking_offers o
  WHERE o.provider = 'stripe' AND o.provider_ref = p.payment_link_id AND p.offer_id IS NULL;
