-- Preserve existing full-section attempts while allowing the same workout on one passage.
begin;
alter table public.rc_recall_attempts
  drop constraint if exists rc_recall_attempts_passage_ids_check;
alter table public.rc_recall_attempts
  add constraint rc_recall_attempts_passage_ids_check
  check (cardinality(passage_ids) in (1, 4));
-- Make the client operations explicit; row-level policies still restrict every row.
grant select, insert, update on table public.rc_recall_attempts, public.rc_recall_recaps to authenticated;
commit;
