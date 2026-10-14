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