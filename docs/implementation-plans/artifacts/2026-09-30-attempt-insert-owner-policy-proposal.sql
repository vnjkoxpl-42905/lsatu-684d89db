-- REVIEWED PROPOSAL ONLY. Not deployed during preparation.
-- Tightens new ordinary INSERT attribution; no historical row rewrite.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '45s';
DO $guard$
DECLARE existing text; auth_role oid; before_rows text; before_other_policies text; after_rows text; after_other_policies text;
BEGIN
  -- Serialize competing attempt writes for the short policy/preservation transaction.
  LOCK TABLE public.attempts IN SHARE ROW EXCLUSIVE MODE;
  SELECT md5(coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id)::text,'[]')) INTO before_rows FROM public.attempts a;
  SELECT md5(coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,
    'roles',p.polroles,'using',pg_get_expr(p.polqual,p.polrelid),
    'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname)::text,'[]')) INTO before_other_policies
    FROM pg_policy p WHERE p.polrelid='public.attempts'::regclass AND p.polname<>'Students can insert own attempts';
  SELECT oid INTO auth_role FROM pg_roles WHERE rolname='authenticated';
  SELECT pg_get_expr(p.polwithcheck,p.polrelid) INTO existing
    FROM pg_policy p WHERE p.polrelid='public.attempts'::regclass
      AND p.polname='Students can insert own attempts' AND p.polcmd='a'
      AND p.polpermissive AND p.polroles=ARRAY[auth_role]::oid[];
  IF existing IS DISTINCT FROM '(class_id = (auth.uid())::text)' THEN
    RAISE EXCEPTION 'Current attempts INSERT policy differs from the reviewed baseline';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_policy p WHERE p.polrelid='public.attempts'::regclass
    AND p.polcmd IN ('a','*') AND p.polpermissive
    AND p.polname<>'Students can insert own attempts'
    AND (0=ANY(p.polroles) OR auth_role=ANY(p.polroles))) THEN
    RAISE EXCEPTION 'Another ordinary permissive INSERT policy requires review';
  END IF;
  ALTER POLICY "Students can insert own attempts" ON public.attempts
    WITH CHECK (class_id=auth.uid()::text AND (user_id IS NULL OR user_id=auth.uid()));
  SELECT md5(coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id)::text,'[]')) INTO after_rows FROM public.attempts a;
  SELECT md5(coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,
    'roles',p.polroles,'using',pg_get_expr(p.polqual,p.polrelid),
    'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname)::text,'[]')) INTO after_other_policies
    FROM pg_policy p WHERE p.polrelid='public.attempts'::regclass AND p.polname<>'Students can insert own attempts';
  IF before_rows IS DISTINCT FROM after_rows OR before_other_policies IS DISTINCT FROM after_other_policies THEN
    RAISE EXCEPTION 'Attempt rows or unrelated policies changed; refusing deployment';
  END IF;
END
$guard$;
SELECT jsonb_build_object(
  'originalRowsPreserved', true,
  'unrelatedPoliciesPreserved', true,
  'attemptRows', (SELECT count(*) FROM public.attempts),
  'attemptDigest', (SELECT md5(coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id)::text,'[]')) FROM public.attempts a),
  'insertPolicy', (SELECT pg_get_expr(polwithcheck,polrelid) FROM pg_policy
    WHERE polrelid='public.attempts'::regclass AND polname='Students can insert own attempts')
) AS preservation;
COMMIT;
