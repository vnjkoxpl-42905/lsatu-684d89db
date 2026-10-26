-- Read-only identity lookup for the existing administrator dossier.
-- Students retains its existing owner-only RLS; no table policy is broadened.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
CREATE OR REPLACE FUNCTION public.get_student_progress_user_id(p_class_id text)
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(v_actor, 'admin'::public.app_role) THEN
    SELECT s.user_id INTO v_owner FROM public.students s
      WHERE s.class_id = p_class_id AND s.user_id = v_actor;
    IF v_owner IS NULL THEN
      RAISE EXCEPTION 'Student account access denied' USING ERRCODE = '42501';
    END IF;
    IF v_owner::text IS DISTINCT FROM p_class_id THEN
      RAISE EXCEPTION 'Student identity mapping conflicts with canonical account' USING ERRCODE = '42501';
    END IF;
    RETURN v_owner;
  END IF;
  SELECT s.user_id INTO STRICT v_owner FROM public.students s WHERE s.class_id = p_class_id;
  IF v_owner::text IS DISTINCT FROM p_class_id THEN
    RAISE EXCEPTION 'Student identity mapping conflicts with canonical account' USING ERRCODE = '42501';
  END IF;
  RETURN v_owner;
EXCEPTION WHEN NO_DATA_FOUND THEN
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_student_progress_user_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_progress_user_id(text) TO authenticated;
COMMIT;
