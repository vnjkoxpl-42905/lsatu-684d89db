-- Step two is the Retelling, and she is told to "Tell it back".
--
-- ADR 0031 renamed it and the repo followed: `content/` says "Tell it back"
-- everywhere, and the bundle shipped with it. A student still read "Say it
-- back", because the surfaces do not read the bundle. `ActivityRunner` passes
-- `assignment.instructions`, and `start_section_attempt` copies
-- `activities.instructions` onto each run, so the label a student sees comes
-- from these two tables and nowhere else. The bundled JSON is only the
-- fallback the door falls back to when there is no assignment at all.
--
-- Verified against production on 2026-09-04: all fourteen `read-recall-colour%`
-- rows carried the old label, exactly once each, in the step's `label`. That is
-- why this is a replacement rather than a re-seed. The rows are otherwise
-- identical to the authored copy, and rewriting the whole blob would revert
-- anything corrected in place since the last seed.
update public.activities
set instructions = replace(instructions::text, 'Say it back', 'Tell it back')::jsonb
where slug like 'read-recall-colour%'
  and instructions::text like '%Say it back%';

-- Assignments already handed out carry their own snapshot of the copy, so the
-- activity row alone does not reach a student who has one open.
--
-- Completed runs are deliberately left alone. Her report card is a record of
-- the drill she was actually given, and editing the wording after the fact
-- would quietly rewrite what she was told at the time.
--
-- The guard trigger exempts admins by `auth.uid()`, which is null on a
-- migration connection, so it has to come off around the write. Same shape as
-- `20260903202000_the_briefing_describes_the_drill_that_exists.sql`.
alter table public.activity_assignments disable trigger activity_assignments_guard_immutables;

update public.activity_assignments aa
set instructions = replace(aa.instructions::text, 'Say it back', 'Tell it back')::jsonb
from public.activities a
where a.id = aa.activity_id
  and a.slug like 'read-recall-colour%'
  and aa.status <> 'completed'
  and aa.instructions::text like '%Say it back%';

alter table public.activity_assignments enable trigger activity_assignments_guard_immutables;

-- The base Activity goes.
--
-- `read-recall-colour` was one stimulus worked from memory, and it stopped
-- being a thing anyone could do when the drill became a whole section (ADR
-- 0009). Since then it has been seeded, listed in the library order, and
-- reachable by nobody: `isRunnable` refuses to assign it, and `ActivityRunner`
-- dead-ends anyone who arrives at one with "This one runs as a whole section
-- now." It has never been assigned to a student, so nothing is lost with it.
--
-- ADR 0009 argues against deleting rows to fix a listing, and that still holds
-- for the *section* rows: those carry attempts, and an attempt outlives the
-- listing decision that produced it. This row carries nothing.
--
-- The `not exists` is the safety, not the comment: if an assignment ever did
-- appear, this deletes nothing rather than taking her work with it.
delete from public.activities a
where a.slug = 'read-recall-colour'
  and not exists (
    select 1 from public.activity_assignments aa where aa.activity_id = a.id
  );
