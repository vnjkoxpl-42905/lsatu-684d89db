-- REVIEW DRAFT ONLY. Not deployed. Same statements as portable migration; transaction wrappers omitted for the managed SQL runner.
-- Active practice time and completion per selected passage. No auth-schema FK:
-- Lovable Cloud owns authentication; auth.uid() and RLS enforce the owner.
create table if not exists public.rc_recall_passage_progress (
 attempt_id uuid not null references public.rc_recall_attempts(id) on delete restrict,
 passage_position integer not null check(passage_position between 1 and 4),
 student_id uuid not null,
 passage_id integer not null check(passage_id > 0),
 active_ms bigint not null default 0 check(active_ms between 0 and 9007199254740991),
 completed boolean not null default false,
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(attempt_id,passage_position),
 check((completed and completed_at is not null) or (not completed and completed_at is null))
);
alter table public.rc_recall_passage_progress enable row level security;
revoke all on public.rc_recall_passage_progress from anon,authenticated;
-- Direct owner writes are intentional. RLS and the table trigger enforce identity,
-- monotonic timing and frozen completion. This is self-reported practice history,
-- not an anti-cheating record; the invoker RPC adds serialized retry ergonomics.
grant select,insert,update on public.rc_recall_passage_progress to authenticated;
grant all on public.rc_recall_passage_progress to service_role;
create policy "rc passage progress owner read" on public.rc_recall_passage_progress for select to authenticated using(student_id=auth.uid());
create policy "rc passage progress admin read" on public.rc_recall_passage_progress for select to authenticated using(public.has_role(auth.uid(),'admin'));
create policy "rc passage progress owner insert" on public.rc_recall_passage_progress for insert to authenticated with check(student_id=auth.uid() and public.has_reading_center_access() and exists(select 1 from public.rc_recall_attempts a where a.id=attempt_id and a.student_id=auth.uid() and a.finished_at is null));
create policy "rc passage progress owner update" on public.rc_recall_passage_progress for update to authenticated using(student_id=auth.uid() and public.has_reading_center_access() and exists(select 1 from public.rc_recall_attempts a where a.id=attempt_id and a.student_id=auth.uid() and a.finished_at is null)) with check(student_id=auth.uid());

create or replace function public.rc_recall_passage_progress_guard() returns trigger language plpgsql set search_path=public as $$
declare selected_ids integer[];
begin
 select a.passage_ids into selected_ids from public.rc_recall_attempts a where a.id=new.attempt_id and a.student_id=new.student_id;
 if selected_ids is null or selected_ids[new.passage_position] is distinct from new.passage_id then raise exception 'Passage progress must match its owned attempt and selected passage.'; end if;
 if tg_op='UPDATE' then
  if new.attempt_id is distinct from old.attempt_id or new.passage_position is distinct from old.passage_position or new.student_id is distinct from old.student_id or new.passage_id is distinct from old.passage_id or new.created_at is distinct from old.created_at then raise exception 'Passage progress identity cannot change.'; end if;
  if old.completed then
   if new.active_ms is distinct from old.active_ms or new.completed is distinct from old.completed or new.completed_at is distinct from old.completed_at then raise exception 'Completed passage progress cannot change.'; end if;
   return old;
  end if;
  if new.active_ms < old.active_ms then raise exception 'Active passage time cannot decrease.'; end if;
 end if;
 new.completed_at:=case when new.completed then now() else null end;
 new.updated_at:=now(); return new;
end $$;
create trigger rc_recall_passage_progress_guard before insert or update on public.rc_recall_passage_progress for each row execute function public.rc_recall_passage_progress_guard();

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
create index if not exists rc_recall_passage_progress_student_idx on public.rc_recall_passage_progress(student_id,completed_at desc);
