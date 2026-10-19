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