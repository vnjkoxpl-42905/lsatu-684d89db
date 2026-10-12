-- 20260823140000_activity_item_responses_one_row_per_attempt.sql
-- One row per attempt, enforced.

with ranked as (
  select id,
         row_number() over (
           partition by assignment_id, student_id, item_order, attempt_no
           order by created_at, id
         ) as n
  from public.activity_item_responses
)
delete from public.activity_item_responses r
using ranked
where r.id = ranked.id
  and ranked.n > 1;

create unique index if not exists activity_item_responses_one_per_attempt
  on public.activity_item_responses (assignment_id, student_id, item_order, attempt_no);

comment on index public.activity_item_responses_one_per_attempt is
  'One row per (assignment, student, item, attempt). The resume replay counts rows per item, so a duplicated attempt silently inflates the attempt count and can strand a student on a question they never actually exhausted. Clients treat 23505 here as success.';

-- 20260823150000_activity_assignments_item_count.sql
-- The Activities list stops shipping every question to print a number.

alter table public.activity_assignments
  add column if not exists item_count integer
  generated always as (jsonb_array_length(coalesce(items, '[]'::jsonb))) stored;

comment on column public.activity_assignments.item_count is
  'How many items the run holds, generated from items. Exists so the Activities list can render a count without transferring the entire per-student question snapshot on every row.';