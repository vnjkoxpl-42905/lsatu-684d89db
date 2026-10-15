-- Negation Station's subtitle said "Statement Negation Drill".
--
-- Two things wrong with it, both on the card a student picks from. "Drill" is
-- reserved in this feature for the question-bank MCQ engine, and an Activity is
-- explicitly not one (src/features/activity-centre/CONTEXT.md names "drill" as
-- a word to avoid for exactly this reason). And it was the only subtitle that
-- read as a label: every other Activity makes a promise in plain words, "Work
-- out the word from the sentence around it", "Compress the paragraph to its big
-- ideas, in plain words". Negation Station is the first Activity a student
-- meets and it was the one sounding like filing.
--
-- Its new subtitle is the sentence the Activity already uses to say what it
-- wants, the same line as its answer placeholder.

update public.activities
set subtitle = 'Write the weakest statement that contradicts the original'
where slug = 'negation-station'
  and subtitle is distinct from 'Write the weakest statement that contradicts the original';

-- Assignments snapshot the copy at assign time, so a student already holding
-- Negation Station keeps the old subtitle unless it is backfilled too. The
-- immutability guard has to come off for that write: it exempts admins via
-- has_role(auth.uid(), 'admin'), and auth.uid() is NULL inside a migration, so
-- the guard would raise and take this whole migration down with it.
alter table public.activity_assignments disable trigger user;

update public.activity_assignments a
set subtitle = src.subtitle
from public.activities src
where a.activity_id = src.id
  and src.slug = 'negation-station'
  and a.subtitle is distinct from src.subtitle;

alter table public.activity_assignments enable trigger user;
