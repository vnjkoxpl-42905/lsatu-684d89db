-- Home-only transactional access decisions and retry-safe additive credit receipts.
CREATE OR REPLACE FUNCTION public.teacher_home_set_access(_actor uuid,_student uuid,_expected_tier text,_expected_flags jsonb,_tier text,_flags jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.profiles%rowtype; k text; wanted jsonb; actual jsonb; practice boolean;
BEGIN
 LOCK TABLE public.user_roles IN SHARE MODE;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_actor AND role='admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO p FROM public.profiles WHERE class_id=_student::text FOR UPDATE;
 IF NOT FOUND OR p.archived_at IS NOT NULL OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_student AND role='admin') THEN RAISE EXCEPTION 'ineligible_student'; END IF;
 actual=to_jsonb(p);
 IF p.access_tier IS DISTINCT FROM _expected_tier THEN RAISE EXCEPTION 'access_conflict_refresh'; END IF;
 IF _expected_flags IS NULL OR jsonb_typeof(_expected_flags)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(_expected_flags))<>13 THEN RAISE EXCEPTION 'invalid_preview'; END IF;
 FOREACH k IN ARRAY ARRAY['has_drill_access','has_practice_access','has_classroom_access','has_chat_access','has_schedule_access','has_journal_access','has_flagged_access','has_analytics_access','has_waj_access','has_activity_access','has_bootcamp_access','has_ta_access','has_export_access'] LOOP
  IF jsonb_typeof(_expected_flags->k) IS DISTINCT FROM 'boolean' OR actual->k IS DISTINCT FROM _expected_flags->k THEN RAISE EXCEPTION 'access_conflict_refresh'; END IF;
 END LOOP;
 IF _tier IS NULL OR _tier NOT IN ('tier_1','tier_2','tier_3') THEN RAISE EXCEPTION 'invalid_tier'; END IF;
 IF _tier='tier_2' THEN
  IF _flags IS NULL OR jsonb_typeof(_flags)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(_flags))<>5 THEN RAISE EXCEPTION 'invalid_flags'; END IF;
  FOREACH k IN ARRAY ARRAY['has_drill_access','has_practice_access','has_classroom_access','has_chat_access','has_schedule_access'] LOOP
   IF jsonb_typeof(_flags->k) IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'invalid_flags'; END IF;
  END LOOP;
  wanted=_flags;
 ELSE
  wanted=jsonb_build_object('has_drill_access',_tier='tier_1','has_practice_access',_tier='tier_1','has_classroom_access',_tier='tier_1','has_chat_access',true,'has_schedule_access',true);
 END IF;
 -- Tier drift trigger establishes defaults on a changed tier. Apply custom switches
 -- in a second statement under the same row lock/transaction, never a partial save.
 UPDATE public.profiles SET access_tier=_tier WHERE class_id=_student::text;
 UPDATE public.profiles SET has_drill_access=(wanted->>'has_drill_access')::boolean,has_practice_access=(wanted->>'has_practice_access')::boolean,has_classroom_access=(wanted->>'has_classroom_access')::boolean,has_chat_access=(wanted->>'has_chat_access')::boolean,has_schedule_access=(wanted->>'has_schedule_access')::boolean WHERE class_id=_student::text RETURNING * INTO p;
 actual=to_jsonb(p);
 IF actual->>'access_tier' IS DISTINCT FROM _tier THEN RAISE EXCEPTION 'access_verification_failed'; END IF;
 FOREACH k IN ARRAY ARRAY['has_drill_access','has_practice_access','has_classroom_access','has_chat_access','has_schedule_access'] LOOP
  IF actual->k IS DISTINCT FROM wanted->k THEN RAISE EXCEPTION 'access_verification_failed'; END IF;
 END LOOP;
 RETURN actual;
END $$;
REVOKE ALL ON FUNCTION public.teacher_home_set_access(uuid,uuid,text,jsonb,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_home_set_access(uuid,uuid,text,jsonb,text,jsonb) TO service_role;

CREATE TABLE public.teacher_home_credit_adds(
 owner_id uuid NOT NULL REFERENCES auth.users(id), pass_id uuid NOT NULL REFERENCES public.booking_passes(id),
 operation_key uuid NOT NULL, student_id uuid NOT NULL REFERENCES auth.users(id), delta integer NOT NULL CHECK(delta BETWEEN 1 AND 50),
 payload_hash text NOT NULL, receipt jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,pass_id,operation_key), UNIQUE(owner_id,operation_key)
);
ALTER TABLE public.teacher_home_credit_adds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teacher_home_credit_adds FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.teacher_home_credit_adds FROM service_role;
GRANT SELECT,INSERT ON public.teacher_home_credit_adds TO service_role;
CREATE OR REPLACE FUNCTION public.teacher_home_add_credits(_actor uuid,_student uuid,_pass uuid,_operation uuid,_delta integer,_apply boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.booking_passes%rowtype; prior public.teacher_home_credit_adds%rowtype; h text; r jsonb;
BEGIN
 LOCK TABLE public.user_roles IN SHARE MODE;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_actor AND role='admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF _apply IS NULL OR _operation IS NULL OR _delta IS NULL OR _delta NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'invalid_add'; END IF;
 -- Serializes the same operation even if an altered retry names another pass.
 PERFORM pg_advisory_xact_lock(hashtextextended(_actor::text||_operation::text,0));
 PERFORM 1 FROM public.profiles WHERE class_id=_student::text FOR UPDATE;
 SELECT * INTO p FROM public.booking_passes WHERE id=_pass FOR UPDATE;
 IF NOT FOUND OR p.student_id IS DISTINCT FROM _student THEN RAISE EXCEPTION 'pass_owner_mismatch'; END IF;

 h=md5(jsonb_build_array(_actor,_student,_pass,_delta)::text);
 SELECT * INTO prior FROM public.teacher_home_credit_adds WHERE owner_id=_actor AND operation_key=_operation;
 IF FOUND THEN
  IF prior.payload_hash<>h OR prior.pass_id<>_pass OR prior.student_id<>_student OR prior.delta<>_delta THEN RAISE EXCEPTION 'operation_payload_mismatch'; END IF;
  IF prior.receipt->>'cancelled'='true' THEN
   RETURN jsonb_build_object('receipt',null,'pass',to_jsonb(p),'not_applied',true,'cancelled',true,'operation_key',_operation,'owner_id',_actor,'student_id',_student,'pass_id',_pass,'delta',_delta);
  END IF;
  RETURN jsonb_build_object('receipt',prior.receipt,'pass',to_jsonb(p));
 END IF;
 IF NOT _apply THEN
  -- Resolving before a delayed original request must cancel that operation for
  -- good. The same advisory lock orders cancellation and application atomically.
  r=jsonb_build_object('cancelled',true,'operation_key',_operation,'owner_id',_actor,'student_id',_student,'pass_id',_pass,'delta',_delta);
  INSERT INTO public.teacher_home_credit_adds(owner_id,pass_id,operation_key,student_id,delta,payload_hash,receipt) VALUES(_actor,_pass,_operation,_student,_delta,h,r);
  RETURN r||jsonb_build_object('receipt',null,'pass',to_jsonb(p),'not_applied',true);
 END IF;
 PERFORM 1 FROM public.profiles WHERE class_id=_student::text AND archived_at IS NULL FOR UPDATE;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_student AND role='admin') THEN RAISE EXCEPTION 'ineligible_student'; END IF;
 IF p.status NOT IN ('active','paused','exhausted') OR (p.expires_at IS NOT NULL AND p.expires_at<=now()) THEN RAISE EXCEPTION 'pass_not_addable'; END IF;
 UPDATE public.booking_passes SET total_credits=total_credits+_delta,status=CASE WHEN status='exhausted' THEN 'active' ELSE status END WHERE id=_pass RETURNING * INTO p;
 r=jsonb_build_object('operation_key',_operation,'owner_id',_actor,'student_id',_student,'pass_id',_pass,'delta',_delta,'total_credits',p.total_credits,'used_credits',p.used_credits);
 INSERT INTO public.teacher_home_credit_adds(owner_id,pass_id,operation_key,student_id,delta,payload_hash,receipt) VALUES(_actor,_pass,_operation,_student,_delta,h,r);
 RETURN jsonb_build_object('receipt',r,'pass',to_jsonb(p));
END $$;
REVOKE ALL ON FUNCTION public.teacher_home_add_credits(uuid,uuid,uuid,uuid,integer,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_home_add_credits(uuid,uuid,uuid,uuid,integer,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.teacher_home_create_pass(_actor uuid,_student uuid,_credits integer,_slug text,_token_hash text,_session_minutes integer DEFAULT 70,_expires_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.booking_passes%rowtype; student public.profiles%rowtype;
BEGIN
 LOCK TABLE public.user_roles IN SHARE MODE;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_actor AND role='admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO student FROM public.profiles WHERE class_id=_student::text FOR UPDATE;
 IF NOT FOUND OR student.archived_at IS NOT NULL OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_student AND role='admin') THEN RAISE EXCEPTION 'ineligible_student'; END IF;
 IF _session_minutes IS NULL OR _session_minutes NOT BETWEEN 15 AND 480 OR (_expires_at IS NOT NULL AND _expires_at<=now()) THEN RAISE EXCEPTION 'invalid_pass_terms'; END IF;
 IF _credits IS NULL OR _credits NOT BETWEEN 1 AND 50 OR _slug IS NULL OR _token_hash IS NULL THEN RAISE EXCEPTION 'invalid_pass'; END IF;
 SELECT * INTO p FROM public.booking_passes WHERE student_id=_student AND status IN ('active','paused','exhausted','expired') ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF FOUND THEN RETURN jsonb_build_object('pass',to_jsonb(p),'created',false); END IF;
 INSERT INTO public.booking_passes(student_id,student_name,student_email,total_credits,session_length_minutes,created_by,token_hash,booking_slug,expires_at)
 SELECT _student,student.display_name,u.email,_credits,_session_minutes,_actor,_token_hash,_slug,_expires_at FROM auth.users u WHERE u.id=_student RETURNING * INTO p;
 IF NOT FOUND THEN RAISE EXCEPTION 'student_not_found'; END IF;
 RETURN jsonb_build_object('pass',to_jsonb(p),'created',true);
END $$;
REVOKE ALL ON FUNCTION public.teacher_home_create_pass(uuid,uuid,integer,text,text,integer,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_home_create_pass(uuid,uuid,integer,text,text,integer,timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.teacher_home_revoke_pass(_actor uuid,_student uuid,_pass uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.booking_passes%rowtype;
BEGIN
 LOCK TABLE public.user_roles IN SHARE MODE;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_actor AND role='admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 PERFORM 1 FROM public.profiles WHERE class_id=_student::text AND archived_at IS NULL FOR UPDATE;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_student AND role='admin') THEN RAISE EXCEPTION 'ineligible_student'; END IF;
 SELECT * INTO p FROM public.booking_passes WHERE id=_pass FOR UPDATE;
 IF NOT FOUND OR p.student_id IS DISTINCT FROM _student THEN RAISE EXCEPTION 'pass_owner_mismatch'; END IF;
 SELECT * INTO p FROM public.manage_booking_pass(_pass,'revoke');
 RETURN to_jsonb(p);
END $$;
REVOKE ALL ON FUNCTION public.teacher_home_revoke_pass(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_home_revoke_pass(uuid,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.teacher_home_reactivate_pass(_actor uuid,_student uuid,_pass uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.booking_passes%rowtype; old_total integer; old_used integer; old_slug text;
BEGIN
 LOCK TABLE public.user_roles IN SHARE MODE;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_actor AND role='admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 PERFORM 1 FROM public.profiles WHERE class_id=_student::text AND archived_at IS NULL FOR UPDATE;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_student AND role='admin') THEN RAISE EXCEPTION 'ineligible_student'; END IF;
 SELECT * INTO p FROM public.booking_passes WHERE id=_pass FOR UPDATE;
 IF NOT FOUND OR p.student_id IS DISTINCT FROM _student THEN RAISE EXCEPTION 'pass_owner_mismatch'; END IF;
 IF p.status NOT IN ('active','exhausted','expired') THEN RAISE EXCEPTION 'pass_not_reactivatable'; END IF;
 old_total=p.total_credits;old_used=p.used_credits;old_slug=p.booking_slug;
 SELECT * INTO p FROM public.manage_booking_pass(_pass,'update_terms',NULL,NULL,NULL,true);
 IF p.total_credits<>old_total OR p.used_credits<>old_used OR p.booking_slug IS DISTINCT FROM old_slug OR p.expires_at IS NOT NULL OR p.status NOT IN ('active','exhausted') THEN RAISE EXCEPTION 'reactivation_verification_failed'; END IF;
 RETURN to_jsonb(p);
END $$;
REVOKE ALL ON FUNCTION public.teacher_home_reactivate_pass(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_home_reactivate_pass(uuid,uuid,uuid) TO service_role;