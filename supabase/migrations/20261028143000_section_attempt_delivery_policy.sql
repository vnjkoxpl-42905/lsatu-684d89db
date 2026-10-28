-- Exact deployed section-run writers, with quiet student-initiated attempts.
begin;

CREATE OR REPLACE FUNCTION public.start_section_attempt(p_activity_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_student uuid := auth.uid();
  v_activity public.activities%rowtype;
  v_id uuid;
begin
  if v_student is null then
    raise exception 'not signed in';
  end if;

  select * into v_activity from public.activities where id = p_activity_id;
  if not found or v_activity.mode is distinct from 'section' then
    raise exception 'not a Read, Recall, Colour section';
  end if;

  -- An abandoned run is discarded rather than resumed (ADR 0023). The drill is
  -- one unbroken recording, so a half-run has no valid audio and nothing
  -- gradeable, and leaving it in the way would lock her out of the section she
  -- chose. A run that wrote rows is kept, as `abandoned`: the rows are what
  -- makes its recording recoverable, and the status is what keeps the grader
  -- and the sweeper off it. It used to be marked `completed` here, which is
  -- precisely the state both of them grade.
  update public.activity_assignments a
     set status = 'abandoned'
   where a.student_id = v_student and a.activity_id = p_activity_id
     and a.status in ('assigned', 'in_progress')
     and exists (select 1 from public.activity_item_responses r where r.assignment_id = a.id);

  delete from public.activity_assignments a
   where a.student_id = v_student and a.activity_id = p_activity_id
     and a.status in ('assigned', 'in_progress')
     and not exists (select 1 from public.activity_item_responses r where r.assignment_id = a.id);

  insert into public.activity_assignments
    (activity_id, student_id, class_id, title, subtitle, instructions, item_format,
     items, status, started_at, assigned_by, mode, time_goal_minutes, source_section, notification_policy)
  values
    (v_activity.id, v_student, v_activity.class_id, v_activity.title, v_activity.subtitle,
     v_activity.instructions, v_activity.item_format, v_activity.items, 'in_progress', now(),
     v_activity.created_by, v_activity.mode, v_activity.time_goal_minutes, v_activity.source_section, 'suppressed')
  returning id into v_id;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.start_section_focus_attempt(p_assignment_id uuid, p_slugs text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_student uuid := auth.uid();
  v_src public.activity_assignments%rowtype;
  v_items jsonb;
  v_count integer;
  v_id uuid;
begin
  if v_student is null then
    raise exception 'not signed in';
  end if;

  select * into v_src
    from public.activity_assignments
   where id = p_assignment_id and student_id = v_student;
  if not found then
    raise exception 'no such run';
  end if;
  if v_src.mode is distinct from 'section' then
    raise exception 'not a Read, Recall, Colour section';
  end if;

  select coalesce(jsonb_agg(item order by ord), '[]'::jsonb), count(*)
    into v_items, v_count
    from jsonb_array_elements(coalesce(v_src.items, '[]'::jsonb)) with ordinality as t(item, ord)
   where item->>'slug' = any (p_slugs);

  if v_count = 0 then
    raise exception 'no matching stimuli';
  end if;

  -- One live run per (student, activity). A half-finished run has no valid
  -- audio to resume into, so it is set aside exactly as starting a full section
  -- would set it aside; a run that never wrote a row is simply discarded.
  update public.activity_assignments a
     set status = 'abandoned'
   where a.student_id = v_student and a.activity_id = v_src.activity_id
     and a.status in ('assigned', 'in_progress')
     and exists (select 1 from public.activity_item_responses r where r.assignment_id = a.id);

  delete from public.activity_assignments a
   where a.student_id = v_student and a.activity_id = v_src.activity_id
     and a.status in ('assigned', 'in_progress')
     and not exists (select 1 from public.activity_item_responses r where r.assignment_id = a.id);

  insert into public.activity_assignments
    (activity_id, student_id, class_id, title, subtitle, instructions, item_format,
     items, status, started_at, assigned_by, mode, time_goal_minutes, source_section, notification_policy)
  values
    (v_src.activity_id, v_student, v_src.class_id, v_src.title,
     'Focus set - ' || v_count || ' to run again',
     coalesce(v_src.instructions, '{}'::jsonb)
       || jsonb_build_object('focus_set', jsonb_build_object(
            'from_assignment', p_assignment_id,
            'stimulus_count', v_count)),
     v_src.item_format, v_items, 'in_progress', now(), v_src.assigned_by,
     v_src.mode, v_src.time_goal_minutes, v_src.source_section, 'suppressed')
  returning id into v_id;

  return v_id;
end;
$function$
;

revoke all on function public.start_section_attempt(uuid),public.start_section_focus_attempt(uuid,text[]) from public,anon;
grant execute on function public.start_section_attempt(uuid),public.start_section_focus_attempt(uuid,text[]) to authenticated;
commit;