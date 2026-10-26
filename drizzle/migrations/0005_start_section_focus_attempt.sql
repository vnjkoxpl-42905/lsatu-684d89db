-- A finished Read, Recall, Colour run can hand back a short focus set: only the
-- stimuli the grader marked weakest, run again as their own Attempt.
--
-- The student chooses to take it; nothing is forced. The slugs come from her own
-- graded run and are intersected against the source assignment's own snapshot,
-- so nothing outside what she already holds can be pulled in.

create or replace function public.start_section_focus_attempt(
  p_assignment_id uuid,
  p_slugs text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
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
     items, status, started_at, assigned_by, mode, time_goal_minutes, source_section)
  values
    (v_src.activity_id, v_student, v_src.class_id, v_src.title,
     'Focus set - ' || v_count || ' to run again',
     coalesce(v_src.instructions, '{}'::jsonb)
       || jsonb_build_object('focus_set', jsonb_build_object(
            'from_assignment', p_assignment_id,
            'stimulus_count', v_count)),
     v_src.item_format, v_items, 'in_progress', now(), v_src.assigned_by,
     v_src.mode, v_src.time_goal_minutes, v_src.source_section)
  returning id into v_id;

  return v_id;
end;
$fn$;

revoke all on function public.start_section_focus_attempt(uuid, text[]) from public, anon;
grant execute on function public.start_section_focus_attempt(uuid, text[]) to authenticated;
grant execute on function public.start_section_focus_attempt(uuid, text[]) to service_role;