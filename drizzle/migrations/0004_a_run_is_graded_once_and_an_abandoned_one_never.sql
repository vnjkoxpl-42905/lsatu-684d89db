-- A run is graded once, and an abandoned one never.
--
-- Two things the 2026-09-03 student-run audit found on the ordinary path.
--
-- 1. The grader ran twice on every run. The Report Card asks again twenty
--    seconds after the runner's own ask, the first grading takes a minute or
--    more, and nothing on record said one was in flight -- so both transcribed,
--    both judged, and the card she read was overwritten by a second verdict on
--    the same audio. The grader now claims an Attempt here before it starts and
--    releases it when it ends. A claim that was never released expires, so a
--    grader that died mid-run cannot hold its Attempt hostage.
--
-- 2. Starting a section again from the library marked the abandoned run as
--    completed, and a completed run with rows is exactly what the grader and
--    the sweeper grade. A run abandoned at stimulus 3 came back as a Report
--    Card reading "0%, 2 stimuli, inside the time". ADR 0023 says an abandoned
--    run is never graded; it now has a status that says so.

-- ---------------------------------------------------------------------------
-- 1. The claim.
-- ---------------------------------------------------------------------------

create table if not exists public.activity_section_grading_claims (
  assignment_id uuid not null references public.activity_assignments(id) on delete cascade,
  attempt_no smallint not null,
  claimed_at timestamptz not null default now(),
  primary key (assignment_id, attempt_no)
);

comment on table public.activity_section_grading_claims is
  'One row per Attempt whose grading is in flight. Written by the grader before it transcribes, removed when it finishes, and ignored once stale. Service role only.';

alter table public.activity_section_grading_claims enable row level security;
-- No policies: nothing but the service role reads or writes this.

-- Take the claim, or report that someone else holds it.
--
-- One statement, so two graders arriving together cannot both succeed: the
-- insert either lands or conflicts, and on conflict the row is only taken over
-- if its holder has been silent for longer than any grading takes.
create or replace function public.claim_section_grading(
  p_assignment_id uuid,
  p_attempt_no integer,
  p_stale_seconds integer default 600
)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_taken boolean := false;
begin
  insert into public.activity_section_grading_claims (assignment_id, attempt_no, claimed_at)
  values (p_assignment_id, p_attempt_no, now())
  on conflict (assignment_id, attempt_no) do update
    set claimed_at = now()
    where public.activity_section_grading_claims.claimed_at < now() - make_interval(secs => p_stale_seconds)
  returning true into v_taken;
  return coalesce(v_taken, false);
end;
$fn$;

create or replace function public.release_section_grading(
  p_assignment_id uuid,
  p_attempt_no integer
)
returns void
language sql
security definer
set search_path = public
as $fn$
  delete from public.activity_section_grading_claims
   where assignment_id = p_assignment_id and attempt_no = p_attempt_no;
$fn$;

revoke all on function public.claim_section_grading(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.release_section_grading(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_section_grading(uuid, integer, integer) to service_role;
grant execute on function public.release_section_grading(uuid, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 2. The abandoned run.
-- ---------------------------------------------------------------------------

alter table public.activity_assignments drop constraint if exists activity_assignments_status_check;
alter table public.activity_assignments add constraint activity_assignments_status_check
  check (status in ('assigned', 'in_progress', 'completed', 'abandoned'));

comment on column public.activity_assignments.status is
  'assigned, in_progress, completed, or abandoned. Advisory (ADR 0019). abandoned is a section run she started again from the library without finishing: its rows are kept, and it is never graded.';

-- The partial unique index that allows one live run per (student, activity)
-- excludes completed rows only. An abandoned row is not live either.
drop index if exists public.activity_assignments_active_unique;
create unique index if not exists activity_assignments_active_unique
  on public.activity_assignments (student_id, activity_id)
  where status in ('assigned', 'in_progress') and activity_id is not null;

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
     items, status, started_at, assigned_by, mode, time_goal_minutes, source_section)
  values
    (v_activity.id, v_student, v_activity.class_id, v_activity.title, v_activity.subtitle,
     v_activity.instructions, v_activity.item_format, v_activity.items, 'in_progress', now(),
     v_activity.created_by, v_activity.mode, v_activity.time_goal_minutes, v_activity.source_section)
  returning id into v_id;

  return v_id;
end;
$fn$;