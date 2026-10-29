-- Conditional Rephrase is judged by the browser's structural parser. This
-- migration only repairs the lesson copy stored in Postgres: "otherwise" is
-- an if-not construction, not a biconditional. Active assignment snapshots
-- receive the same repair so a student never sees the stale contradiction.

update public.activities
set instructions = jsonb_set(
      jsonb_set(
        instructions,
        '{coach,rubric,7}',
        to_jsonb('If and only if and then and only then are biconditionals, where the arrow genuinely runs both ways and the converse is therefore credited. Only on these items. A student may write both conditionals, or a single two-way statement, or say that the two sides stand or fall together. Do not credit an exclusive either-or, which says something different. Otherwise is not a biconditional; it means if the first alternative does not happen, the stated consequence follows.'::text)
      ),
      '{rules,9}',
      to_jsonb('If and only if and then and only then make the arrow run both ways. Otherwise means if not; it does not make the converse valid.'::text)
    )
where slug = 'conditional-rephrase';

alter table public.activity_assignments disable trigger activity_assignments_guard_immutables;

update public.activity_assignments assignment
set instructions = activity.instructions
from public.activities activity
where assignment.activity_id = activity.id
  and activity.slug = 'conditional-rephrase'
  and assignment.status in ('assigned', 'in_progress')
  and assignment.instructions is distinct from activity.instructions;

alter table public.activity_assignments enable trigger activity_assignments_guard_immutables;
