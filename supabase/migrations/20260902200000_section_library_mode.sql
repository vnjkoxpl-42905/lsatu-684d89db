-- Read, Recall, Colour becomes one thing you assign, with the sections inside it.
--
-- Until now every section was its own Activity and an assignment WAS one
-- section, so the section was Joshua's choice at assign time. The drill wants
-- the opposite: he assigns the drill, she picks which section to run, and she
-- runs several a night.
--
-- That needs a row that is the drill rather than a section of it. It cannot be
-- mode 'section', because `activities_section_is_complete` requires a
-- time_goal_minutes and a source_section and a door names neither. So there is
-- a third mode: 'section-library', an Activity whose content is the list of
-- sections a student may choose from.
--
-- The per-section Activities are not deleted and not changed. They stop being
-- the thing you assign and become the thing she picks.

alter table public.activities drop constraint if exists activities_mode_check;
alter table public.activities add constraint activities_mode_check
  check (mode is null or mode in ('stimulus', 'section', 'section-library'));

alter table public.activity_assignments drop constraint if exists activity_assignments_mode_check;
alter table public.activity_assignments add constraint activity_assignments_mode_check
  check (mode is null or mode in ('stimulus', 'section', 'section-library'));

-- `*_section_is_complete` is deliberately untouched: it fires only on
-- mode = 'section', so a section-library row is exempt without weakening the
-- rule that a real section run must always carry its clock and its identity.

-- The door inherits its owner, class and instructions from the sections it
-- lists, so it belongs to whoever they belong to rather than to whoever ran
-- this migration.
insert into public.activities
  (slug, title, subtitle, item_format, items, instructions, mode, created_by, class_id)
select
  'read-recall-colour-sections',
  'Read, Recall, Colour',
  'A whole section, out loud, against the clock',
  'spoken-recall',
  '[]'::jsonb,
  a.instructions,
  'section-library',
  a.created_by,
  a.class_id
from public.activities a
where a.mode = 'section'
order by a.source_section
limit 1
on conflict (slug) do nothing;

-- Starting an Attempt: server-side, because the snapshot must not be hers.
--
-- She picks a section, so something has to create the assignment that holds her
-- run. It cannot be the client. `activity_assignments.items` carries the
-- Details her Coverage is scored against, and a student who can insert that row
-- can write her own Details. RLS cannot help: a policy can say WHO may insert,
-- never that the content must equal the Activity's.
--
-- So the copy happens here, under definer rights, and the client passes only
-- which section it wants. Everything scored is read from the Activity row.
create or replace function public.start_section_attempt(p_activity_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
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

  -- An abandoned run is discarded rather than resumed. The drill is one
  -- unbroken recording, so a half-run has no valid audio and nothing gradeable,
  -- and leaving it in the way would lock her out of the section she chose.
  -- Only a run that wrote nothing is removed; one that has responses is a
  -- finished run whose close-out failed, and it is closed rather than deleted.
  update public.activity_assignments a
     set status = 'completed', completed_at = coalesce(a.completed_at, now())
   where a.student_id = v_student and a.activity_id = p_activity_id
     and a.status <> 'completed'
     and exists (select 1 from public.activity_item_responses r where r.assignment_id = a.id);

  delete from public.activity_assignments a
   where a.student_id = v_student and a.activity_id = p_activity_id
     and a.status <> 'completed'
     and not exists (select 1 from public.activity_item_responses r where r.assignment_id = a.id);

  insert into public.activity_assignments
    (activity_id, student_id, class_id, title, subtitle, instructions, item_format,
     items, status, started_at, assigned_by, mode, time_goal_minutes, source_section)
  values
    (v_activity.id, v_student, v_activity.class_id, v_activity.title, v_activity.subtitle,
     v_activity.instructions, v_activity.item_format, v_activity.items, 'in_progress', now(),
     v_activity.created_by, v_activity.mode, v_activity.time_goal_minutes, v_activity.source_section)
  returning id into v_id;

  return v_id;
end;
$fn$;

revoke all on function public.start_section_attempt(uuid) from public, anon;
grant execute on function public.start_section_attempt(uuid) to authenticated;

-- The section list, without the content.
--
-- Only admins may read `activities`, so a student cannot see the sections she
-- is meant to choose between. A read policy would fix that and cost too much:
-- `items` holds the Details her Coverage is scored against and the captured
-- answer key, and a policy cannot return some columns and withhold others.
--
-- This returns the four things a list needs and nothing that could be studied.
create or replace function public.list_section_activities()
returns table (
  id uuid,
  title text,
  source_section text,
  stimulus_count integer,
  goal_minutes jsonb
)
language sql
security definer
set search_path = public
as $fn$
  select a.id, a.title, a.source_section,
         jsonb_array_length(a.items)::integer, a.time_goal_minutes
  from public.activities a
  where a.mode = 'section' and a.item_format = 'spoken-recall'
  order by a.source_section
$fn$;

revoke all on function public.list_section_activities() from public, anon;
grant execute on function public.list_section_activities() to authenticated;
