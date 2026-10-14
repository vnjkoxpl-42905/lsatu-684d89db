-- The day-zero welcome is identified by a stable source pair. Restrict the
-- uniqueness rule to that marker so unrelated source integrations keep their
-- existing behavior.
create unique index if not exists classroom_items_day_zero_welcome_unique
  on public.classroom_items (student_id, source_table, source_id)
  where source_table = 'profiles' and source_id = 'day-0-welcome';

