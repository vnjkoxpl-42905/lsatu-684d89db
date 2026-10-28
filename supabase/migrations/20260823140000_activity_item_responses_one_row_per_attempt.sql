-- One row per attempt, enforced.
--
-- `activity_item_responses` is an append-only log with no natural key, so
-- nothing stopped the same attempt being written twice. That mattered more than
-- it looked: `reconstructProgress` replays the log by counting rows per item,
-- so a duplicate reads as an EXTRA attempt. Two writes of attempt 1 make an
-- item look like it hit the two-attempt cap, and the replay then serves the
-- student a question they never finished as though they had run out of tries.
--
-- Until now nothing retried, so nothing duplicated. This lands with the outbox,
-- which exists precisely to retry a failed write, and with it the client treats
-- a unique violation as success: the row it was trying to record is on record.
--
-- Any duplicates already in the table are collapsed first, keeping the earliest
-- row of each group. The earliest is the one the student actually made; a later
-- identical row is the artefact.

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
