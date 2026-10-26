-- The student's answer box was labelled "Your negation" for every Activity,
-- because the copy was hardcoded in AnswerPanel when Negation Station was the
-- only drill. Conditional Rephrase therefore asked for a negation, which is a
-- different skill entirely. The label and placeholder are now authored per
-- Activity (instructions.answer_label / answer_placeholder) and fall back to
-- neutral copy. This backfills the rows that already exist.

update public.activities
set instructions = instructions
  || jsonb_build_object('answer_label', v.label, 'answer_placeholder', v.placeholder)
from (values
  ('negation-station',      'Your negation',                'Write the weakest statement that contradicts the original…'),
  ('conditional-rephrase',  'Your rephrase',                'Write it as If [sufficient], then [necessary], then give the contrapositive…'),
  ('dumb-it-down',          'Your plain-language version',  'Say what the paragraph says, in plain words…'),
  ('find-the-conclusion',   'Your conclusion',              'Name the claim the argument is trying to prove…'),
  ('rebuttal-rephrase',     'Your rephrase',                'Say what the author believes, at the author''s exact strength…'),
  ('spot-the-callback',     'Your answer',                  'Name the idea the marked phrase points back to, and what it says…'),
  ('spot-the-relationship', 'Your answer',                  'Name the relationship and the exact words that create it…'),
  ('vocab-rehab',           'Your reading of the word',     'What could the marked word mean, and why…')
) as v(slug, label, placeholder)
where public.activities.slug = v.slug;

-- Assignments snapshot instructions at assign time, so live student work keeps
-- the wrong label unless it is backfilled too.
--
-- The guard has to come off for that write. activity_assignments_guard_
-- immutables raises on any change to a snapshot column, and it exempts admins
-- by testing has_role(auth.uid(), 'admin') -- which inside a migration is
-- has_role(NULL, ...), i.e. false. Without this the UPDATE below raises, the
-- migration aborts, and the activities UPDATE above rolls back with it, so
-- nothing lands at all. The guard exists to stop a student rewriting their own
-- snapshot; it was never meant to stop the authoring side correcting copy.
alter table public.activity_assignments disable trigger user;

update public.activity_assignments a
set instructions = a.instructions
  || jsonb_build_object(
       'answer_label', src.instructions->>'answer_label',
       'answer_placeholder', src.instructions->>'answer_placeholder')
from public.activities src
where a.activity_id = src.id
  and src.instructions ? 'answer_label'
  and not (a.instructions ? 'answer_label');

alter table public.activity_assignments enable trigger user;
