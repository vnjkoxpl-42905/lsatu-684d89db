-- Retire the day-zero welcome seed.
--
-- The trigger dropped a "Welcome to your classroom" note into classroom_items
-- the moment an admin granted Classroom access. Nothing ever rendered it: the
-- UI filters it straight back out of the notes list, so it was invisible
-- content generated behind the student's back. The classroom now opens with
-- the orientation card instead, which the student has to click through, so the
-- seed has no job left.
--
-- The rows already seeded are deliberately left in place; classroomData.ts
-- still filters them, so removing them is a separate, reversible decision.

drop trigger if exists profiles_seed_classroom_day_zero_welcome
  on public.profiles;

drop function if exists public.seed_classroom_day_zero_welcome();

-- The partial unique index stays: it is what keeps the surviving seeded rows
-- one-per-student, and it costs nothing.
