-- Reviewed execution must ALWAYS roll back. No persistent candidate rows.
-- SQL authenticated-role/claim compatibility proof, not an HTTP/JWT test.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='45s';
DO $audit$
DECLARE
  teacher constant uuid := '5ff160ef-016e-4ab5-aab1-55c7a2ad888f';
  tester constant uuid := 'd763bfe6-d710-4c4b-90ff-4b3a20929211';
  original jsonb; candidate jsonb; variant text; statement_sql text;
  columns_sql text; values_sql text; state text; inserted bigint;
  report jsonb := '[]';
BEGIN
  IF current_user='authenticated' OR public.has_role(tester,'admin') THEN
    RAISE EXCEPTION 'Requires reviewed migration session and non-admin tester';
  END IF;
  IF (SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname='authenticated') IS NOT FALSE
    OR pg_has_role('authenticated','timed_pt_executor','member') THEN
    RAISE EXCEPTION 'Authenticated role must be ordinary and RLS constrained';
  END IF;
  -- The existing foreign fixture supplies every mandatory valid column and FK.
  SELECT to_jsonb(a) INTO original FROM public.attempts a
    WHERE a.user_id=teacher AND a.timed_pt_run_id IS NULL ORDER BY a.id LIMIT 1;
  IF original IS NULL THEN
    RAISE EXCEPTION 'ROLLBACK_ONLY_OWN_INSERT_REPORT %',
      jsonb_build_array(jsonb_build_object('table','attempts','foreignFixtureExists',false,
        'outcome','unverified-no-fixture')) USING ERRCODE='ZQ999';
  END IF;
  SELECT string_agg(format('%I',column_name),',' ORDER BY ordinal_position),
    string_agg(format('r.%I',column_name),',' ORDER BY ordinal_position)
    INTO columns_sql,values_sql FROM information_schema.columns
    WHERE table_schema='public' AND table_name='attempts'
      AND is_generated='NEVER' AND is_identity='NO';
  statement_sql := format('INSERT INTO public.attempts (%s) SELECT %s FROM jsonb_populate_record(NULL::public.attempts,$1) r',columns_sql,values_sql);
  FOREACH variant IN ARRAY ARRAY['own-owner','own-null'] LOOP
    candidate := original || jsonb_build_object('id',gen_random_uuid()::text,
      'class_id',tester::text,'user_id',CASE WHEN variant='own-owner' THEN to_jsonb(tester::text) ELSE 'null'::jsonb END);
    BEGIN
      PERFORM set_config('request.jwt.claim.sub',tester::text,true);
      PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',tester,'role','authenticated')::text,true);
      EXECUTE 'SET LOCAL ROLE authenticated';
      IF current_user<>'authenticated' OR auth.uid() IS DISTINCT FROM tester
        OR public.has_role(auth.uid(),'admin') THEN
        RAISE EXCEPTION 'Ordinary actor validation failed' USING ERRCODE='ZQ003';
      END IF;
      EXECUTE statement_sql USING candidate;
      GET DIAGNOSTICS inserted=ROW_COUNT;
      IF inserted<>1 THEN RAISE EXCEPTION 'Expected one exact candidate' USING ERRCODE='ZQ004'; END IF;
      -- A successful ordinary insertion is intentionally undone immediately.
      RAISE EXCEPTION 'ordinary candidate permitted, rolled back' USING ERRCODE='ZQ001';
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS state=RETURNED_SQLSTATE;
      report := report || jsonb_build_array(jsonb_build_object('table','attempts',
        'variant',variant,'foreignFixtureExists',true,
        'outcome',CASE WHEN state='ZQ001' THEN 'PASS-insert-permitted-rolled-back' ELSE 'FAIL-or-unverified' END,
        'errorClass',state));
    END;
  END LOOP;
  -- Abort the outer transaction even if the managed caller stops at the error.
  RAISE EXCEPTION 'ROLLBACK_ONLY_OWN_INSERT_REPORT %',report USING ERRCODE='ZQ999';
END
$audit$;
ROLLBACK;
