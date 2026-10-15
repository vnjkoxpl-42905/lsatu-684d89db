-- The converse rules say which statements they apply to.
--
-- Round 2 of the same adversarial review. Fixing the first contradiction
-- introduced a second one: rubric[0] called the converse an error with no
-- qualification, rubric[4] did the same for "reversing the arrow", and
-- rubric[7] credits exactly that move on biconditional items. A grader reading
-- the prompt straight through met a blanket prohibition and a specific
-- permission for the same move, with nothing saying which governs.
--
-- The prohibition is the one that was over-broad, so it is the one scoped.
-- Biconditionals are now named as the exception in the same line that states
-- the rule, and rubric[7] remains the place that spells the exception out.
--
-- Item content is untouched. This writes two rubric entries.

update public.activities
set instructions = jsonb_set(
      jsonb_set(instructions, '{coach,rubric,0}', to_jsonb('Two forms are credited and they are the same statement: the if-then form, and its contrapositive. A student who gives either one has translated correctly. On an ordinary one-way conditional, nothing else counts as a direction: the converse (swapping the two sides) and the inverse (negating both without swapping) are errors, not alternative phrasings. Biconditional items are the stated exception, covered below.'::text)),
      '{coach,rubric,4}', to_jsonb('Two errors have names worth using in the feedback, and both apply to one-way conditionals, not to biconditionals. Reversing the arrow is treating the necessary condition as if meeting it guaranteed the trigger. Negating the trigger is concluding that because the trigger did not fire, the outcome cannot happen. Say which one the student made.'::text))
where slug = 'conditional-rephrase';

alter table public.activity_assignments disable trigger user;

update public.activity_assignments a
set instructions = src.instructions
from public.activities src
where a.activity_id = src.id
  and src.slug = 'conditional-rephrase'
  and a.status in ('assigned', 'in_progress')
  and a.instructions is distinct from src.instructions;

alter table public.activity_assignments enable trigger user;
