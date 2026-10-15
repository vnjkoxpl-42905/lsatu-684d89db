-- Security finding 1 (audits/security-2026-10-14): set_booking_availability_overrides
-- is SECURITY DEFINER and had no REVOKE, so anon/authenticated could rewrite booking
-- overrides through PostgREST. Match set_booking_availability: service_role only.
-- No app code or edge function calls this RPC.
REVOKE ALL ON FUNCTION public.set_booking_availability_overrides(jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_booking_availability_overrides(jsonb) TO service_role;
