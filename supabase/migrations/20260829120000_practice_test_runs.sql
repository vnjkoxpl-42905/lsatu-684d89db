-- Practice-test runs live in the database, and legs are tagged rather than guessed.
--
-- Until now a sitting existed only in one browser's localStorage. Clearing site
-- data lost it, a second device could not see it, and the scorer found a leg by
-- matching "this user, this section, finished after the leg began", which is a
-- guess that gets less true the more a student drills.
--
-- This migration is the schema half of that change. It is written to converge
-- from any starting point: every statement is guarded, so a clean replay and a
-- re-run against the live database both end at the same schema.
--
-- ORDER IS LOAD-BEARING in 1a. `alter table ... add column ... default` fills
-- every existing row with the default, so adding the default before the backfill
-- would overwrite real `section_mode` values and real completion times. Add the
-- columns bare, backfill from the truth already in the row, and only then attach
-- the defaults for future inserts.

-- ---------------------------------------------------------------------------
-- 1a. Normalize section_history
-- ---------------------------------------------------------------------------

alter table public.section_history
  add column if not exists mode text,
  add column if not exists completed_at timestamptz,
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

update public.section_history
   set mode = coalesce(mode, section_mode, 'full-section')
 where mode is null;

update public.section_history
   set completed_at = created_at
 where completed_at is null;

alter table public.section_history alter column mode set default 'full-section';
alter table public.section_history alter column completed_at set default now();
alter table public.section_history alter column section_mode drop not null;

-- The INSERT policy has to be REPLACED, not supplemented. PostgreSQL ORs
-- permissive policies together, so leaving the old class-only rule in place
-- would keep a live bypass around the new ownership test, and the composite FK
-- further down would be decorative. The legacy policies are dropped by role
-- rather than by name because their names differ across environments; this
-- drops exactly the INSERT policies ('a' = ALTER/append = INSERT in pg_policy)
-- and leaves SELECT/UPDATE/DELETE untouched.
do $$
declare
  pol record;
begin
  for pol in
    select polname
      from pg_policy
     where polrelid = 'public.section_history'::regclass
       and polcmd = 'a'
  loop
    execute format(
      'drop policy if exists %I on public.section_history', pol.polname
    );
  end loop;
end $$;

create policy "section_history_owner_insert" on public.section_history
  for insert with check (
    user_id = auth.uid()
    and class_id = public.get_user_class_id(auth.uid())
  );

-- If this returns anything other than one row, an insert path was reintroduced
-- somewhere and the ownership guarantee is gone:
--   select polname from pg_policy
--    where polrelid = 'public.section_history'::regclass and polcmd = 'a';

-- ---------------------------------------------------------------------------
-- 1b. The runs table
-- ---------------------------------------------------------------------------

-- id is text, not uuid: newRunId()'s fallback path does not produce a uuid.
create table if not exists public.practice_test_runs (
  id               text primary key,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pt               int not null,
  pace             text not null,
  legs             jsonb not null,
  current_leg      int not null default 0,
  break_after_leg  int not null,
  break_taken      boolean not null default false,
  break_started_at timestamptz,
  status           text not null check (status in ('in-progress', 'complete', 'abandoned')),
  revision         int not null default 0,
  completed_at     timestamptz,
  raw_correct      int,
  raw_total        int,
  scaled_score     int,
  score_source     text check (score_source in ('official-table', 'estimate')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Exists solely as the target of the composite FKs below. It is what makes
  -- cross-user leg attribution impossible at the schema level rather than by
  -- convention.
  unique (id, user_id)
);

create index if not exists practice_test_runs_user_status
  on public.practice_test_runs (user_id, status);

alter table public.practice_test_runs enable row level security;

-- No set_updated_at / handle_updated_at function exists in this project's
-- migrations, so it is created here rather than reused.
create or replace function public.touch_practice_test_runs()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists practice_test_runs_touch on public.practice_test_runs;
create trigger practice_test_runs_touch
  before update on public.practice_test_runs
  for each row execute function public.touch_practice_test_runs();

drop policy if exists "pt_runs_owner_select" on public.practice_test_runs;
create policy "pt_runs_owner_select" on public.practice_test_runs
  for select using (user_id = auth.uid());

drop policy if exists "pt_runs_owner_insert" on public.practice_test_runs;
create policy "pt_runs_owner_insert" on public.practice_test_runs
  for insert with check (user_id = auth.uid());

drop policy if exists "pt_runs_owner_update" on public.practice_test_runs;
create policy "pt_runs_owner_update" on public.practice_test_runs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "pt_runs_admin_select" on public.practice_test_runs;
create policy "pt_runs_admin_select" on public.practice_test_runs
  for select using (public.has_role(auth.uid(), 'admin'));

-- Deliberately NO delete policy, for anyone. A sitting is a record of work.
-- Terminal-state protection beyond RLS is enforced client-side by
-- status-filtered conditional updates; a hostile owner editing their own row
-- can corrupt only their own history, which is acceptable here.

-- ---------------------------------------------------------------------------
-- 1c. Leg attribution
-- ---------------------------------------------------------------------------

alter table public.section_history
  add column if not exists practice_test_run_id text,
  add column if not exists practice_test_leg int;

alter table public.rc_drill_sessions
  add column if not exists practice_test_run_id text,
  add column if not exists practice_test_leg int;

-- `add constraint` has no IF NOT EXISTS, so each is guarded by catalog lookup.
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'section_history_pt_leg_chk'
                    and conrelid = 'public.section_history'::regclass) then
    alter table public.section_history
      add constraint section_history_pt_leg_chk check (practice_test_leg >= 0);
  end if;

  -- Closes the run-id-without-leg hole in both directions.
  if not exists (select 1 from pg_constraint
                  where conname = 'section_history_pt_pair_chk'
                    and conrelid = 'public.section_history'::regclass) then
    alter table public.section_history
      add constraint section_history_pt_pair_chk
      check ((practice_test_run_id is null) = (practice_test_leg is null));
  end if;

  -- section_history.user_id is nullable, and PostgreSQL's default MATCH SIMPLE
  -- skips composite-FK validation when ANY referencing column is null. Without
  -- this an attributed row with a null user_id sails past the FK below and
  -- consumes a run-leg slot it does not own.
  if not exists (select 1 from pg_constraint
                  where conname = 'section_history_attr_owner_chk'
                    and conrelid = 'public.section_history'::regclass) then
    alter table public.section_history
      add constraint section_history_attr_owner_chk
      check (practice_test_run_id is null or user_id is not null);
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'section_history_pt_run_fk'
                    and conrelid = 'public.section_history'::regclass) then
    alter table public.section_history
      add constraint section_history_pt_run_fk
      foreign key (practice_test_run_id, user_id)
      references public.practice_test_runs (id, user_id);
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'rc_sessions_pt_leg_chk'
                    and conrelid = 'public.rc_drill_sessions'::regclass) then
    alter table public.rc_drill_sessions
      add constraint rc_sessions_pt_leg_chk check (practice_test_leg >= 0);
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'rc_sessions_pt_pair_chk'
                    and conrelid = 'public.rc_drill_sessions'::regclass) then
    alter table public.rc_drill_sessions
      add constraint rc_sessions_pt_pair_chk
      check ((practice_test_run_id is null) = (practice_test_leg is null));
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'rc_sessions_pt_run_fk'
                    and conrelid = 'public.rc_drill_sessions'::regclass) then
    alter table public.rc_drill_sessions
      add constraint rc_sessions_pt_run_fk
      foreign key (practice_test_run_id, user_id)
      references public.practice_test_runs (id, user_id);
  end if;

  -- rc_attempts references a session by session_id alone, while its RLS checks
  -- only the attempt's own user_id, so attempts can be attached to another
  -- user's session. The composite FK below closes that, and needs this target.
  if not exists (select 1 from pg_constraint
                  where conname = 'rc_drill_sessions_id_user_key'
                    and conrelid = 'public.rc_drill_sessions'::regclass) then
    alter table public.rc_drill_sessions
      add constraint rc_drill_sessions_id_user_key unique (id, user_id);
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'rc_attempts_session_owner_fk'
                    and conrelid = 'public.rc_attempts'::regclass) then
    alter table public.rc_attempts
      add constraint rc_attempts_session_owner_fk
      foreign key (session_id, user_id)
      references public.rc_drill_sessions (id, user_id);
  end if;
end $$;

-- One row per leg, forever. This is what makes a retried closeout safe: a
-- duplicate insert fails with 23505 instead of scoring the leg twice.
create unique index if not exists section_history_pt_leg_once
  on public.section_history (practice_test_run_id, practice_test_leg)
  where practice_test_run_id is not null;

create unique index if not exists rc_sessions_pt_leg_once
  on public.rc_drill_sessions (practice_test_run_id, practice_test_leg)
  where practice_test_run_id is not null;

-- ---------------------------------------------------------------------------
-- 1d. RC first-attempt integrity
-- ---------------------------------------------------------------------------

-- recordAttempt is read-then-insert with no constraint, so racing writes can
-- already have double-counted. The unique index below will not build over those
-- duplicates, so they are resolved first.
--
-- DEMOTE, do not delete. A duplicate is a real attempt the student made; only
-- its is_first_attempt flag is wrong, and the review surfaces legitimately show
-- it as a later attempt. Ranking is by (created_at, id) and never by ctid, which
-- is physical row location rather than chronology and would retain an arbitrary
-- row as "first".
with ranked as (
  select id,
         row_number() over (
           partition by session_id, question_id
           order by created_at asc, id asc
         ) as rn
    from public.rc_attempts
   where is_first_attempt
)
update public.rc_attempts a
   set is_first_attempt = false
  from ranked r
 where a.id = r.id
   and r.rn > 1;

create unique index if not exists rc_attempts_first_once
  on public.rc_attempts (session_id, question_id)
  where is_first_attempt;

-- ---------------------------------------------------------------------------
-- 1e. Stale-run cleanup (used by change 5, shipped here so one migration
--     carries all the DDL)
-- ---------------------------------------------------------------------------

-- exclude_ids exists for change 5. A run whose dirty retry failed still LOOKS
-- stale, because its offline progress never landed to refresh updated_at.
-- Abandoning it server-side would let the terminal-wins reconcile then destroy
-- that progress, so change 5 passes those ids here. The default keeps a
-- no-argument call valid.
create or replace function public.abandon_stale_practice_tests(
  exclude_ids text[] default '{}'
)
returns setof text
language sql
security invoker
set search_path = public
as $$
  update public.practice_test_runs
     set status = 'abandoned',
         revision = revision + 1
   where user_id = auth.uid()
     and status = 'in-progress'
     and updated_at < now() - interval '14 days'
     and not (id = any (coalesce(exclude_ids, '{}')))
  returning id;
$$;
