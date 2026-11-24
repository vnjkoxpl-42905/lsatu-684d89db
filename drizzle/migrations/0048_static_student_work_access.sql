CREATE OR REPLACE FUNCTION public.get_student_work_access()
 RETURNS TABLE(source_table text, source_id uuid, issuance integer, available boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record; s jsonb; uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Sign in to read assigned work' using errcode='42501'; end if;
 for r in
   select 'homework_assignments'::text t, id from public.homework_assignments where student_id=uid
   union all select 'ta_assignments', id from public.ta_assignments where student_id=uid
   union all select 'guided_drill_assignments', id from public.guided_drill_assignments where student_id=uid
   union all select 'activity_assignments', id from public.activity_assignments where student_id=uid
   union all select 'practice_test_assignments', id from public.practice_test_assignments where student_id=uid
   union all select 'classroom_items', id from public.classroom_items where student_id=uid
 loop
   s:=public.student_work_state(r.t,r.id,uid);
   if s is not null then
     source_table:=s->>'source_table';source_id:=(s->>'source_id')::uuid;issuance:=(s->>'issuance')::integer;available:=(s->>'available')::boolean;return next;
   end if;
 end loop;
end $function$;
REVOKE EXECUTE ON FUNCTION public.get_student_work_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_work_access() TO authenticated;