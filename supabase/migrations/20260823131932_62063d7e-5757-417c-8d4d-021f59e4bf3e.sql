-- The instruction stops contradicting the grader.
--
-- Two authored fields disagreed about what the student was being asked for:
--
--   instructions.task            "Rephrase the statement as If [sufficient],
--                                 then [necessary]. Then give me the
--                                 contrapositive."      -- both required
--
--   instructions.coach.rubric[0] "Either direction is credited. The if-then
--                                 form and its contrapositive are the same
--                                 statement..."          -- either one is enough
--
-- The rubric is the one that has actually been grading students, and it is the
-- reading under which items 46, 47 and 48 cohere: those author BOTH logical
-- directions as credited answers, so a task demanding one specific direction
-- would mark the other one wrong. The rubric stands and the task is corrected.
--
-- The task now also says "in your own words", which the rubric already assumed
-- ("Wording is free. Judge the logical structure, not the phrasing") but the
-- instruction never told the student. The bracket notation reads as a template,
-- and a student could reasonably have thought a fixed form was required.
--
-- The placeholder carried the same demand and is corrected with it.
--
-- Item content is untouched: no prompt, credited answer, explanation, Question
-- Type or ladder position moves here.

update public.activities
set instructions = instructions
      || jsonb_build_object(
           'task',
           'Rephrase the statement as If [sufficient], then [necessary], in your own words. The contrapositive counts too, since it says the same thing.',
           'answer_placeholder',
           'Write it as If [sufficient], then [necessary]…'
         )
where slug = 'conditional-rephrase';

-- Assignments carry their own snapshot of instructions. Runs already in flight
-- keep the wording they started under, matching every other content migration
-- in this Activity: a student mid-drill does not get the task changed underneath
-- them.
--
-- The immutability guard exempts admins via has_role(auth.uid(), 'admin'), and
-- auth.uid() is NULL inside a migration, so the guard would raise and take the
-- whole migration down with it.
alter table public.activity_assignments disable trigger user;

update public.activity_assignments a
set instructions = src.instructions
from public.activities src
where a.activity_id = src.id
  and src.slug = 'conditional-rephrase'
  and a.status = 'assigned'
  and a.instructions is distinct from src.instructions;

alter table public.activity_assignments enable trigger user;