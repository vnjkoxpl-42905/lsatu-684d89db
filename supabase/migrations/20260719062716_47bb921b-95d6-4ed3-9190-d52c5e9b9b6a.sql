CREATE OR REPLACE FUNCTION public.resolve_booking_link_full(_slug text)
RETURNS public.booking_passes
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pass public.booking_passes%ROWTYPE;
BEGIN
  IF _slug IS NULL OR length(_slug) < 3 THEN RETURN NULL; END IF;
  SELECT * INTO _pass FROM public.booking_passes
   WHERE booking_slug = _slug AND status IN ('active','paused');
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF _pass.expires_at IS NOT NULL AND _pass.expires_at < now() THEN
    UPDATE public.booking_passes SET status = 'expired' WHERE id = _pass.id;
    RETURN NULL;
  END IF;
  RETURN _pass;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_booking_link_full(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_booking_link_full(text) TO service_role;