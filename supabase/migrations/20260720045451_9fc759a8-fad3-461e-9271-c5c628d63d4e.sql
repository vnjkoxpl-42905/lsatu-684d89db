DROP INDEX IF EXISTS public.booking_passes_active_slug;
CREATE UNIQUE INDEX booking_passes_slug_unique
  ON public.booking_passes (booking_slug)
  WHERE booking_slug IS NOT NULL;

DROP INDEX IF EXISTS public.one_active_pass_per_student;
CREATE UNIQUE INDEX one_resumable_pass_per_student
  ON public.booking_passes (student_id)
  WHERE student_id IS NOT NULL AND status IN ('active', 'paused');

CREATE OR REPLACE FUNCTION public.is_strong_booking_slug(_slug text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT _slug IS NOT NULL
     AND length(_slug) BETWEEN 28 AND 47
     AND _slug ~ '^[a-z0-9]{1,20}-[a-z2-9]{26}$';
$$;

REVOKE ALL ON FUNCTION public.is_strong_booking_slug(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_strong_booking_slug(text) TO service_role;

CREATE OR REPLACE FUNCTION public.generate_strong_booking_slug(_name text, _email text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  _base text;
  _email_base text;
  _bytes bytea;
  _code text := '';
  _i int;
BEGIN
  _base := lower(regexp_replace(COALESCE(split_part(trim(_name), ' ', 1), ''), '[^a-zA-Z0-9]', '', 'g'));
  _email_base := lower(regexp_replace(COALESCE(split_part(_email, '@', 1), ''), '[^a-zA-Z0-9]', '', 'g'));
  _base := left(COALESCE(NULLIF(_base, ''), NULLIF(_email_base, ''), 'student'), 20);
  _bytes := gen_random_bytes(26);
  FOR _i IN 0..25 LOOP
    _code := _code || substr(_alphabet, (get_byte(_bytes, _i) % length(_alphabet)) + 1, 1);
  END LOOP;
  RETURN _base || '-' || _code;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_strong_booking_slug(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_strong_booking_slug(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_booking_link_full(_slug text)
RETURNS public.booking_passes
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pass public.booking_passes%ROWTYPE;
BEGIN
  IF _slug IS NULL OR length(_slug) < 3 OR length(_slug) > 128 THEN RETURN NULL; END IF;
  SELECT * INTO _pass FROM public.booking_passes
   WHERE booking_slug = _slug AND status IN ('active', 'paused');
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF _pass.expires_at IS NOT NULL AND _pass.expires_at <= now() THEN
    UPDATE public.booking_passes SET status = 'expired' WHERE id = _pass.id;
    RETURN NULL;
  END IF;
  RETURN _pass;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_booking_link_full(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_booking_link_full(text) TO service_role;

CREATE OR REPLACE FUNCTION public.grant_booking_access(
  _student_id uuid,
  _student_name text,
  _student_email text,
  _total_credits int,
  _session_length_minutes int,
  _expires_at timestamptz,
  _created_by uuid,
  _token_hash text,
  _booking_slug text
) RETURNS public.booking_passes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pass public.booking_passes%ROWTYPE;
BEGIN
  IF _student_id IS NULL THEN RAISE EXCEPTION 'student_id_required' USING ERRCODE = 'P0400'; END IF;
  IF _total_credits IS NULL OR _total_credits NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'invalid_credits' USING ERRCODE = 'P0400';
  END IF;
  IF _session_length_minutes IS NULL OR _session_length_minutes NOT BETWEEN 15 AND 480 THEN
    RAISE EXCEPTION 'invalid_session_length' USING ERRCODE = 'P0400';
  END IF;
  IF _expires_at IS NOT NULL AND _expires_at <= now() THEN
    RAISE EXCEPTION 'invalid_expiry' USING ERRCODE = 'P0400';
  END IF;
  IF NOT public.is_strong_booking_slug(_booking_slug) THEN
    RAISE EXCEPTION 'invalid_booking_slug' USING ERRCODE = 'P0400';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_student_id::text, 0));
  UPDATE public.booking_passes SET status = 'revoked'
   WHERE student_id = _student_id AND status IN ('active', 'paused');
  INSERT INTO public.booking_passes
    (token_hash, booking_slug, student_id, student_name, student_email,
     total_credits, session_length_minutes, expires_at, created_by)
  VALUES
    (_token_hash, _booking_slug, _student_id, _student_name, _student_email,
     _total_credits, _session_length_minutes, _expires_at, _created_by)
  RETURNING * INTO _pass;
  RETURN _pass;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_booking_access(uuid, text, text, int, int, timestamptz, uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_booking_access(uuid, text, text, int, int, timestamptz, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.create_manual_booking_pass(
  _student_name text,
  _student_email text,
  _total_credits int,
  _session_length_minutes int,
  _expires_at timestamptz,
  _notes text,
  _created_by uuid,
  _token_hash text,
  _booking_slug text
) RETURNS public.booking_passes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pass public.booking_passes%ROWTYPE;
BEGIN
  IF NULLIF(trim(_student_name), '') IS NULL AND NULLIF(trim(_student_email), '') IS NULL THEN
    RAISE EXCEPTION 'student_identity_required' USING ERRCODE = 'P0400';
  END IF;
  IF _total_credits IS NULL OR _total_credits NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'invalid_credits' USING ERRCODE = 'P0400';
  END IF;
  IF _session_length_minutes IS NULL OR _session_length_minutes NOT BETWEEN 15 AND 480 THEN
    RAISE EXCEPTION 'invalid_session_length' USING ERRCODE = 'P0400';
  END IF;
  IF _expires_at IS NOT NULL AND _expires_at <= now() THEN
    RAISE EXCEPTION 'invalid_expiry' USING ERRCODE = 'P0400';
  END IF;
  IF NOT public.is_strong_booking_slug(_booking_slug) THEN
    RAISE EXCEPTION 'invalid_booking_slug' USING ERRCODE = 'P0400';
  END IF;

  INSERT INTO public.booking_passes
    (token_hash, booking_slug, student_id, student_name, student_email,
     total_credits, session_length_minutes, expires_at, notes, created_by)
  VALUES
    (_token_hash, _booking_slug, NULL, NULLIF(trim(_student_name), ''), NULLIF(trim(_student_email), ''),
     _total_credits, _session_length_minutes, _expires_at, _notes, _created_by)
  RETURNING * INTO _pass;
  RETURN _pass;
END;
$$;

REVOKE ALL ON FUNCTION public.create_manual_booking_pass(text, text, int, int, timestamptz, text, uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_manual_booking_pass(text, text, int, int, timestamptz, text, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.regenerate_booking_link(
  _student_id uuid, _new_slug text, _new_token_hash text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT public.is_strong_booking_slug(_new_slug) THEN
    RAISE EXCEPTION 'invalid_booking_slug' USING ERRCODE = 'P0400';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_student_id::text, 0));
  SELECT id INTO _id FROM public.booking_passes
   WHERE student_id = _student_id AND status IN ('active', 'paused')
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no_resumable_pass'; END IF;
  UPDATE public.booking_passes
     SET booking_slug = _new_slug, token_hash = _new_token_hash
   WHERE id = _id;
  RETURN _new_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.regenerate_booking_link(uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_booking_link(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.regenerate_manual_booking_link(
  _pass_id uuid, _new_slug text, _new_token_hash text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_strong_booking_slug(_new_slug) THEN
    RAISE EXCEPTION 'invalid_booking_slug' USING ERRCODE = 'P0400';
  END IF;
  UPDATE public.booking_passes
     SET booking_slug = _new_slug, token_hash = _new_token_hash
   WHERE id = _pass_id AND student_id IS NULL AND status IN ('active', 'paused');
  IF NOT FOUND THEN RAISE EXCEPTION 'no_resumable_pass'; END IF;
  RETURN _new_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.regenerate_manual_booking_link(uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_manual_booking_link(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.rotate_weak_booking_slugs(_apply boolean DEFAULT false)
RETURNS TABLE (
  pass_id uuid,
  student_id uuid,
  student_name text,
  student_email text,
  old_slug text,
  new_slug text,
  applied boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.booking_passes%ROWTYPE;
  _new_slug text;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0403';
  END IF;

  FOR _row IN
    SELECT * FROM public.booking_passes
     WHERE status IN ('active', 'paused') AND NOT public.is_strong_booking_slug(booking_slug)
     ORDER BY created_at, id
     FOR UPDATE
  LOOP
    LOOP
      _new_slug := public.generate_strong_booking_slug(_row.student_name, _row.student_email);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.booking_passes bp WHERE bp.booking_slug = _new_slug);
    END LOOP;
    IF _apply THEN
      UPDATE public.booking_passes SET booking_slug = _new_slug WHERE id = _row.id;
    END IF;
    pass_id := _row.id;
    student_id := _row.student_id;
    student_name := _row.student_name;
    student_email := _row.student_email;
    old_slug := _row.booking_slug;
    new_slug := _new_slug;
    applied := _apply;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_weak_booking_slugs(boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_weak_booking_slugs(boolean) TO service_role;