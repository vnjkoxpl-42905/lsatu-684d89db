-- Keep the stored Conditional Rephrase copy aligned with the paper-diagram UI.
-- Existing assignments snapshot these fields, so refresh every assignment that
-- a student can still open.

update public.activities
set subtitle = 'Diagram it on paper, then choose the matching answer',
    instructions = jsonb_set(
      jsonb_set(
        jsonb_set(
          instructions,
          '{task}',
          to_jsonb('Diagram the statement on paper first. Then choose the diagram that matches what you wrote. The original conditional and its contrapositive are both correct because they mean the same thing.'::text)
        ),
        '{answer_placeholder}',
        to_jsonb('Choose the diagram that matches what you wrote'::text)
      ),
      '{coach,drill}',
      to_jsonb('a paper-first conditional-diagram drill with five deterministic diagram choices'::text)
    )
where slug = 'conditional-rephrase';

alter table public.activity_assignments disable trigger activity_assignments_guard_immutables;

update public.activity_assignments assignment
set subtitle = activity.subtitle,
    item_format = activity.item_format,
    instructions = activity.instructions
from public.activities activity
where assignment.activity_id = activity.id
  and activity.slug = 'conditional-rephrase'
  and assignment.status in ('assigned', 'in_progress');

alter table public.activity_assignments enable trigger activity_assignments_guard_immutables;
