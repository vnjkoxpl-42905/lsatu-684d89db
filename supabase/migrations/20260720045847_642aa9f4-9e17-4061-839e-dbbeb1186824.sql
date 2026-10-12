ALTER FUNCTION public.generate_strong_booking_slug(text, text) SET search_path = public, extensions;

DROP FUNCTION IF EXISTS public.grant_booking_access(uuid, text, text, int, int, timestamptz, uuid, text);