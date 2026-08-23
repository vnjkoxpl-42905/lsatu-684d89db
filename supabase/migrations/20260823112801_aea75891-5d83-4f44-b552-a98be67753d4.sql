-- The second credited answer stops being called "Also accepted".
--
-- The reveal renders credited_answers[1..] under one generic label. That label
-- is true for an Activity whose extra answers are alternative phrasings of the
-- same sentence, and false here: in Conditional Rephrase the second answer is
-- the CONTRAPOSITIVE, the other half of what the task asked the student for.
-- On item 62 it currently reads
--
--   Also accepted: Chained the other way: if the stratum was not sealed, ...
--
-- which tells the student the thing they were asked to produce is optional
-- extra credit.
--
-- The label is authored per Activity, so nothing outside Conditional Rephrase
-- moves: every other Activity has no credited_secondary_label and keeps today's
-- wording. This only adds a key -- it rewrites no prompt, answer or explanation.

update public.activities
set instructions = jsonb_set(
      coalesce(instructions, '{}'::jsonb),
      '{credited_secondary_label}',
      '"Contrapositive"'::jsonb,
      true
    )
where slug = 'conditional-rephrase'
  and coalesce(instructions -> 'credited_secondary_label', 'null'::jsonb) is distinct from '"Contrapositive"'::jsonb;

-- Assignments carry their own snapshot of instructions, so a student whose
-- assignment predates this would still read the old label. Runs already in
-- flight are left exactly as they are, matching the ladder migration: a student
-- mid-drill does not get the wording changed underneath them.
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