-- Preserve idempotent completed progress reads after attempt finalization.
-- Additive repair: no table, policy, grant expansion, or existing-data changes.
begin;
create or replace function public.save_rc_recall_passage_progress(p_attempt_id uuid,p_passage_id integer,p_passage_position integer,p_active_ms bigint,p_completed boolean)
returns public.rc_recall_passage_progress language plpgsql security invoker set search_path=public as $$
declare attempt public.rc_recall_attempts; prior public.rc_recall_passage_progress; saved public.rc_recall_passage_progress;
begin
 if auth.uid() is null or not public.has_reading_center_access() then raise exception 'Reading Center access is required.' using errcode='42501'; end if;
 if p_active_ms is null or p_active_ms<0 or p_active_ms>9007199254740991 or p_completed is null or p_passage_id is null or p_passage_id<1 or p_passage_position is null or p_passage_position not between 1 and 4 then raise exception 'Invalid passage progress.'; end if;
 -- Ordinary owner SELECT remains available after finalization. Return immutable
 -- completed progress before requesting a row lock, whose UPDATE RLS policy
 -- intentionally excludes finished attempts.
 select * into attempt from public.rc_recall_attempts a where a.id=p_attempt_id and a.student_id=auth.uid();
 if not found or attempt.passage_ids[p_passage_position] is distinct from p_passage_id then raise exception 'The selected passage does not belong to this attempt.' using errcode='42501'; end if;
 select * into prior from public.rc_recall_passage_progress p where p.attempt_id=p_attempt_id and p.passage_position=p_passage_position and p.student_id=auth.uid() and p.passage_id=p_passage_id;
 if found and prior.completed then return prior; end if;
 if attempt.finished_at is not null then
  if prior.attempt_id is not null and not p_completed and p_active_ms<=prior.active_ms then return prior; end if;
  raise exception 'A finished attempt cannot gain passage progress.';
 end if;
 -- Only a request that may write needs the lock. Re-read after locking so a
 -- concurrent finalization cannot commit between this check and the write.
 select * into attempt from public.rc_recall_attempts a where a.id=p_attempt_id and a.student_id=auth.uid() for share;
 if not found or attempt.passage_ids[p_passage_position] is distinct from p_passage_id then raise exception 'The selected passage does not belong to this attempt.' using errcode='42501'; end if;
 -- Serializes retries and simultaneous tabs for this same attempt/position.
 perform pg_advisory_xact_lock(hashtextextended('rc-passage:'||p_attempt_id::text||':'||p_passage_position::text,0));
 select * into prior from public.rc_recall_passage_progress p where p.attempt_id=p_attempt_id and p.passage_position=p_passage_position and p.student_id=auth.uid();
 if found and prior.completed then return prior; end if;
 if attempt.finished_at is not null then
  if prior.attempt_id is not null and not p_completed and p_active_ms<=prior.active_ms then return prior; end if;
  raise exception 'A finished attempt cannot gain passage progress.';
 end if;
 insert into public.rc_recall_passage_progress(attempt_id,passage_position,student_id,passage_id,active_ms,completed)
 values(p_attempt_id,p_passage_position,auth.uid(),p_passage_id,greatest(coalesce(prior.active_ms,0),p_active_ms),p_completed)
 on conflict(attempt_id,passage_position) do update set active_ms=greatest(rc_recall_passage_progress.active_ms,excluded.active_ms),completed=rc_recall_passage_progress.completed or excluded.completed
 returning * into saved;
 return saved;
end $$;
revoke all on function public.save_rc_recall_passage_progress(uuid,integer,integer,bigint,boolean) from public,anon;
grant execute on function public.save_rc_recall_passage_progress(uuid,integer,integer,bigint,boolean) to authenticated;

commit;
