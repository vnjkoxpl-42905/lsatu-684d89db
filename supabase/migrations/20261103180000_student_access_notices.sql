CREATE TABLE public.student_access_notices (
  student_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pause_at timestamptz,
  show_at timestamptz NOT NULL,
  message text NOT NULL CHECK (length(message) <= 2000),
  kind text NOT NULL CHECK (kind IN ('expiration', 'restored', 'announcement')),
  revision uuid NOT NULL DEFAULT gen_random_uuid(),
  acknowledged_at timestamptz,
  CHECK ((kind = 'expiration') = (pause_at IS NOT NULL))
);

ALTER TABLE public.student_access_notices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_access_notices FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.student_access_notices TO authenticated;
CREATE POLICY student_access_notices_read ON public.student_access_notices
FOR SELECT TO authenticated USING (
  (student_id = auth.uid() AND show_at <= now())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE FUNCTION public.set_student_access_notice(
  student uuid, notice_kind text, pause_time timestamptz DEFAULT NULL,
  show_time timestamptz DEFAULT NULL, notice_message text DEFAULT '', start_one_day_notice boolean DEFAULT false
) RETURNS public.student_access_notices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  saved public.student_access_notices;
  notice_time timestamptz;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.profiles WHERE class_id = student::text AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = student AND role = 'admin') THEN
    RAISE EXCEPTION 'ineligible student';
  END IF;
  IF start_one_day_notice AND notice_kind = 'expiration' THEN
    pause_time := now() + interval '24 hours';
    show_time := now();
  END IF;
  IF notice_kind = 'expiration' THEN
    IF pause_time IS NULL OR pause_time <= now() THEN
      RAISE EXCEPTION 'pause time must be in the future';
    END IF;
    notice_time := least(coalesce(show_time, pause_time - interval '24 hours'), pause_time - interval '24 hours');
  ELSE
    notice_time := coalesce(show_time, now());
  END IF;
  IF notice_kind = 'announcement' AND EXISTS (
    SELECT 1 FROM public.student_access_notices WHERE student_id = student AND pause_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'edit the existing expiration notice';
  END IF;
  INSERT INTO public.student_access_notices (student_id, pause_at, show_at, message, kind)
  VALUES (student, pause_time, notice_time, coalesce(notice_message, ''), notice_kind)
  ON CONFLICT (student_id) DO UPDATE SET
    pause_at = excluded.pause_at,
    show_at = excluded.show_at,
    message = excluded.message,
    kind = excluded.kind,
    revision = excluded.revision,
    acknowledged_at = NULL
  RETURNING * INTO saved;
  RETURN saved;
END;
$fn$;

CREATE FUNCTION public.acknowledge_student_access_notice(notice_revision uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  UPDATE public.student_access_notices SET acknowledged_at = coalesce(acknowledged_at, now())
  WHERE student_id = auth.uid() AND revision = notice_revision AND show_at <= now();
  RETURN FOUND;
END;
$fn$;

REVOKE ALL ON FUNCTION public.set_student_access_notice(uuid, text, timestamptz, timestamptz, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.acknowledge_student_access_notice(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_student_access_notice(uuid, text, timestamptz, timestamptz, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_student_access_notice(uuid) TO authenticated;

CREATE FUNCTION public.student_access_is_paused()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.student_access_notices
    WHERE student_id = auth.uid() AND pause_at <= now()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  );
$fn$;

REVOKE ALL ON FUNCTION public.student_access_is_paused() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_access_is_paused() TO authenticated;

-- Restrictive policies are combined with the existing ownership and entitlement rules.
DO $migration$
DECLARE
  resource text;
BEGIN
  FOREACH resource IN ARRAY ARRAY[
    'classroom_items', 'activity_assignments', 'activity_item_responses',
    'practice_test_runs', 'lr_questions', 'rc_passages'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY student_access_pause ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
       USING (NOT (SELECT public.student_access_is_paused()))
       WITH CHECK (NOT (SELECT public.student_access_is_paused()))',
      resource
    );
  END LOOP;
END;
$migration$;

CREATE FUNCTION public.get_student_access_notice()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT jsonb_build_object(
    'paused', public.student_access_is_paused(),
    'server_time', now(),
    'notice', (
      SELECT to_jsonb(n) - 'student_id'
      FROM public.student_access_notices n
      WHERE n.student_id = auth.uid() AND n.show_at <= now()
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
        )
    )
  );
$fn$;

REVOKE ALL ON FUNCTION public.get_student_access_notice() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_access_notice() TO authenticated;
