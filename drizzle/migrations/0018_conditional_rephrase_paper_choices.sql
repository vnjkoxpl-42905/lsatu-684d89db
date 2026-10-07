update public.activities
set subtitle = 'Diagram it on paper, then record the route',
    item_format = 'mcq',
    instructions = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            instructions,
            '{task}',
            to_jsonb('Diagram the statement on paper first. Then choose the route that matches what you wrote. The conditional and its contrapositive both count because they state the same rule.'::text)
          ),
          '{answer_label}',
          to_jsonb('Your paper diagram'::text)
        ),
        '{answer_placeholder}',
        to_jsonb('Choose the route that matches your paper diagram'::text)
      ),
      '{coach,drill}',
      to_jsonb('a paper-first conditional-diagram drill with five deterministic route choices'::text)
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