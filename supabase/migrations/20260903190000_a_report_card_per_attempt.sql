-- A Report Card per Attempt, not per assignment.
--
-- `activity_section_grades` was keyed on `assignment_id` alone, so a second
-- Attempt against the same assignment overwrote the first Report Card on the
-- upsert. The module's own glossary says the opposite: Attempt 1, 2 and 3 each
-- keep their own date and their own Report Card, "because the point of running
-- a section twice is seeing what changed."
--
-- The rows this grades already carry the Attempt. `activity_item_responses` has
-- `attempt_no` and a unique index over
-- (assignment_id, student_id, item_order, attempt_no), and the runner reads the
-- highest one on record and takes the next. The grade was the only part of the
-- chain that could not tell two sittings apart -- so a run that was recorded,
-- uploaded, transcribed and judged correctly destroyed the evidence of the one
-- before it, and the destroyed one was always the earlier, better-remembered
-- run she wanted to compare against.
--
-- Additive and non-destructive. Every existing grade is Attempt 1, which is
-- what it was: the overwrite meant only one ever survived per assignment.

alter table public.activity_section_grades
  add column if not exists attempt_no smallint not null default 1;

-- The key. Dropped and rebuilt rather than added alongside, because a primary
-- key on `assignment_id` alone is exactly the constraint that has to go: with
-- it in place a second Attempt still cannot be inserted.
alter table public.activity_section_grades
  drop constraint if exists activity_section_grades_pkey;

alter table public.activity_section_grades
  add constraint activity_section_grades_pkey
  primary key (assignment_id, attempt_no);

-- "Her latest Report Card for this assignment" is the read the app makes on
-- every finished run and every reopen, and it is a descending scan of one
-- assignment's attempts.
create index if not exists activity_section_grades_latest_idx
  on public.activity_section_grades (assignment_id, attempt_no desc);

comment on column public.activity_section_grades.attempt_no is
  'Which sitting this grade is of. Matches activity_item_responses.attempt_no; the audio path carries it too, so a second run cannot overwrite the first recording either.';

-- The grants and policies are unchanged and deliberately not restated: she
-- holds SELECT on her own rows and nothing else, and the only writer is the
-- service role inside the grader (ADR 0019).
