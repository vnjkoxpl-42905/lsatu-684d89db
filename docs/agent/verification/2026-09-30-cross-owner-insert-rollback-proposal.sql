-- PROPOSAL ONLY. Never executed during preparation.
-- SQL-role/RLS proof, not an authenticated HTTP/JWT test.
-- Each successful candidate insertion is rolled back inside its subtransaction.
-- The final deliberate exception aborts the outer transaction even if the caller
-- stops before the explicit ROLLBACK. Do not remove the exception/rollback guards.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
DO $audit$
DECLARE
  teacher constant uuid := '5ff160ef-016e-4ab5-aab1-55c7a2ad888f';
  tester constant uuid := 'd763bfe6-d710-4c4b-90ff-4b3a20929211';
  spec record; candidate jsonb; columns_sql text; values_sql text; statement_sql text;
  pk text; next_attempt integer; positive_valid boolean; positive_error text;
  outcome text; error_class text; state text; message text; report jsonb := '[]';
BEGIN
  IF current_user = 'authenticated' OR public.has_role(tester,'admin') THEN
    RAISE EXCEPTION 'Requires reviewed migration session and a non-admin tester';
  END IF;
  IF (SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname='authenticated') IS NOT FALSE
    OR pg_has_role('authenticated','timed_pt_executor','member') THEN
    RAISE EXCEPTION 'Authenticated role is not an ordinary RLS-constrained actor';
  END IF;
  FOR spec IN SELECT * FROM (VALUES
      ('attempts','t.user_id=teacher AND t.timed_pt_run_id IS NULL','foreign-owner'),
      ('attempts','t.user_id=teacher AND t.timed_pt_run_id IS NULL','mixed-attribution'),
      ('rc_drill_sessions','t.user_id=teacher AND t.practice_test_run_id IS NULL','foreign-owner'),
      ('rc_attempts','t.user_id=teacher AND EXISTS(SELECT 1 FROM public.rc_drill_sessions s WHERE s.id=t.session_id AND s.user_id=t.user_id AND s.practice_test_run_id IS NULL)','foreign-owner'),
      ('bootcamp_kv','t.user_id=teacher AND t.table_name=''module_progress''','foreign-owner'),
      ('guided_drill_assignments','t.student_id=teacher','foreign-owner'),
      ('activity_assignments','t.student_id=teacher AND t.revoked_at IS NULL AND (t.status IN (''completed'',''abandoned'') OR t.activity_id IS NULL)','foreign-owner'),
      ('activity_item_responses','t.student_id=teacher AND t.attempt_no<2147483647 AND EXISTS(SELECT 1 FROM public.activity_assignments a WHERE a.id=t.assignment_id AND a.student_id=t.student_id AND a.revoked_at IS NULL)','foreign-owner'),
      ('homework_assignments','t.student_id=teacher AND t.status=''completed''','foreign-owner'),
      ('practice_test_runs','t.user_id=teacher AND t.timed_contract_version IS NULL','foreign-owner'),
      ('classroom_items','t.student_id=teacher AND t.type<>''activity'' AND t.source_table IS DISTINCT FROM ''activity_assignments'' AND NOT(coalesce(t.source_table=''profiles'' AND t.source_id=''day-0-welcome'',false))','foreign-owner'),
      ('section_history','t.user_id=teacher AND t.practice_test_run_id IS NULL','foreign-owner')
    ) AS sources(table_name,predicate,variant)
  LOOP
    pk := CASE WHEN spec.table_name='bootcamp_kv' THEN 'record_id' ELSE 'id' END;
    -- This read is privileged, and only selects the named existing teacher fixture.
    EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE %s ORDER BY t.%I LIMIT 1',
      spec.table_name,replace(spec.predicate,'teacher',quote_literal(teacher)::text),pk) INTO candidate;
    IF candidate IS NULL THEN
      report := report || jsonb_build_array(jsonb_build_object('table',spec.table_name,
        'variant',spec.variant,'foreignFixtureExists',false,'outcome','unverified-no-fixture'));
      CONTINUE;
    END IF;
    candidate := candidate || jsonb_build_object(pk,gen_random_uuid()::text);
    IF spec.table_name='rc_attempts' THEN
      -- Existing first-attempt uniqueness would otherwise mask RLS with 23505.
      candidate := candidate || '{"is_first_attempt":false}'::jsonb;
    ELSIF spec.table_name='activity_item_responses' THEN
      SELECT max(attempt_no)+1 INTO next_attempt FROM public.activity_item_responses
        WHERE assignment_id=(candidate->>'assignment_id')::uuid
          AND student_id=(candidate->>'student_id')::uuid
          AND item_order=(candidate->>'item_order')::integer AND attempt_no<2147483647;
      candidate := candidate || jsonb_build_object('attempt_no',next_attempt);
    ELSIF spec.table_name='attempts' AND spec.variant='mixed-attribution' THEN
      -- Probe the actual asymmetric policy: own class_id but foreign user_id.
      candidate := candidate || jsonb_build_object('class_id',tester::text);
    END IF;
    SELECT string_agg(format('%I',column_name),',' ORDER BY ordinal_position),
      string_agg(format('r.%I',column_name),',' ORDER BY ordinal_position)
      INTO columns_sql,values_sql FROM information_schema.columns
      WHERE table_schema='public' AND table_name=spec.table_name
        AND is_generated='NEVER' AND is_identity='NO';
    statement_sql := format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) r',
      spec.table_name,columns_sql,values_sql,spec.table_name);
    positive_valid := false; positive_error := null;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub',teacher::text,true);
      PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',teacher,'role','authenticated')::text,true);
      -- Positive schema/trigger control only; this privileged check is NOT RLS proof.
      EXECUTE statement_sql USING candidate;
      RAISE EXCEPTION 'positive candidate rolled back' USING ERRCODE='ZQ001';
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS state=RETURNED_SQLSTATE;
      positive_valid := state='ZQ001';
      IF NOT positive_valid THEN positive_error := state; END IF;
    END;
    IF NOT positive_valid THEN
      report := report || jsonb_build_array(jsonb_build_object('table',spec.table_name,
        'variant',spec.variant,'foreignFixtureExists',true,'positiveCandidateValid',false,
        'outcome','unverified-positive-control','errorClass',positive_error));
      CONTINUE;
    END IF;
    outcome := 'unverified'; error_class := null;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub',tester::text,true);
      PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',tester,'role','authenticated')::text,true);
      EXECUTE 'SET LOCAL ROLE authenticated';
      IF current_user<>'authenticated' OR auth.uid() IS DISTINCT FROM tester OR public.has_role(auth.uid(),'admin') THEN
        RAISE EXCEPTION 'Ordinary actor validation failed' USING ERRCODE='ZQ003';
      END IF;
      EXECUTE statement_sql USING candidate;
      -- Even an unexpectedly permitted INSERT cannot survive this inner rollback.
      RAISE EXCEPTION 'foreign insertion permitted, rolled back' USING ERRCODE='ZQ002';
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS state=RETURNED_SQLSTATE,message=MESSAGE_TEXT;
      error_class := state;
      outcome := CASE
        WHEN state='ZQ002' THEN 'FAIL-insert-permitted-rolled-back'
        WHEN state='42501' AND message ILIKE '%row-level security%' THEN 'PASS-RLS-denied'
        WHEN state='42501' THEN 'denied-other-permission-or-trigger'
        WHEN state LIKE '23%' THEN 'unverified-constraint'
        ELSE 'unverified-other-error' END;
    END;
    report := report || jsonb_build_array(jsonb_build_object('table',spec.table_name,
      'variant',spec.variant,'foreignFixtureExists',true,'positiveCandidateValid',true,
      'outcome',outcome,'errorClass',error_class));
  END LOOP;
  -- Expected failure response carries only source-level results, never records.
  RAISE EXCEPTION 'ROLLBACK_ONLY_INSERT_REPORT %',report USING ERRCODE='ZQ999';
END
$audit$;
ROLLBACK;
