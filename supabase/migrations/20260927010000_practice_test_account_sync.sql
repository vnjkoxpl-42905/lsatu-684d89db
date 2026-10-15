-- Account-backed practice tests retain the timing chosen at creation and
-- identify the browser currently allowed to advance the run.
alter table public.practice_test_runs
  add column if not exists section_seconds integer,
  add column if not exists active_device_id text;

alter table public.practice_test_runs
  drop constraint if exists practice_test_runs_section_seconds_check;
alter table public.practice_test_runs
  add constraint practice_test_runs_section_seconds_check
  check (section_seconds is null or section_seconds > 0);

create index if not exists practice_test_runs_user_created
  on public.practice_test_runs (user_id, created_at desc);
