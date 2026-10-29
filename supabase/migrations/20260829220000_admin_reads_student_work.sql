-- Teacher/admin read access to student work.
--
-- Every table below is student-owned and, until now, student-only: the SELECT
-- policies all resolve to "the row is mine". That is correct for students and
-- it is why the teacher workspace could not show a student's sittings — the
-- admin account's queries came back empty rather than denied, which reads as
-- "this student has done nothing" and is the worst possible failure mode.
--
-- This adds ONE more way to read each table: being an admin. Nothing else
-- changes. In particular:
--   * No INSERT, UPDATE or DELETE policy is touched. An admin can read a
--     student's work and cannot write, edit, or delete it — a teacher's view
--     of a sitting must not be able to alter the sitting.
--   * Admin is `public.has_role(auth.uid(), 'admin')`, the security-definer
--     function already used for role checks, not a profile column a student
--     could ever hold.
--   * Students gain nothing. Their own policies are untouched and still the
--     only way a non-admin reads anything.
--
-- Tables are guarded with to_regclass so this migration is safe against an
-- environment that does not have all of them.

do $$
declare
  t text;
  tables text[] := array[
    'section_history',        -- every section sat, with its per-question record
    'attempts',               -- every question answered, anywhere on the platform
    'wrong_answer_journal',   -- every miss, with the choice made
    'rc_attempts',            -- reading comprehension, same shape
    'rc_drill_sessions',
    'daily_stats',            -- usage: questions and time spent, per day
    'question_usage',
    'question_views',
    'practice_test_runs',     -- full practice tests and their legs
    'bootcamp_kv'             -- bootcamp progress, guided drills, resume rows
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      raise notice 'skipping %, not present in this database', t;
      continue;
    end if;

    execute format(
      'drop policy if exists %I on public.%I',
      'admins_read_' || t, t
    );
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_role(auth.uid(), ''admin''))',
      'admins_read_' || t, t
    );
  end loop;
end $$;

-- Verification. Each of these should return the admin policy alongside
-- whatever student policy the table already had:
--   select polname, polcmd from pg_policy
--    where polrelid = 'public.section_history'::regclass;
--
-- And this must return nothing — no admin write path was opened:
--   select polname from pg_policy
--    where polname like 'admins_read_%' and polcmd <> 'r';
