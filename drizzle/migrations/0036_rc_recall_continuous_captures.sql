create table if not exists public.rc_recall_captures (
 id uuid primary key, attempt_id uuid not null references public.rc_recall_attempts(id) on delete restrict,
 student_id uuid not null, recording_state text not null default 'pending' check(recording_state in ('pending','saved','failed')),
 object_path text unique, mime_type text, duration_ms integer check(duration_ms > 0 and duration_ms <= 7200000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(recording_state <> 'saved' or (object_path is not null and duration_ms is not null))
);
grant select, insert, update on public.rc_recall_captures to authenticated;
grant all on public.rc_recall_captures to service_role;
alter table public.rc_recall_captures enable row level security;
create policy "rc capture owner read" on public.rc_recall_captures for select to authenticated using(student_id=auth.uid());
create policy "rc capture owner insert" on public.rc_recall_captures for insert to authenticated with check(student_id=auth.uid() and public.has_reading_center_access() and recording_state='pending' and object_path is null and exists(select 1 from public.rc_recall_attempts a where a.id=attempt_id and a.student_id=auth.uid() and a.finished_at is null));
create policy "rc capture owner update" on public.rc_recall_captures for update to authenticated using(student_id=auth.uid() and public.has_reading_center_access()) with check(student_id=auth.uid());

alter table public.rc_recall_recaps add column if not exists capture_id uuid references public.rc_recall_captures(id) on delete restrict;
alter table public.rc_recall_recaps add column if not exists recall_start_ms integer;
alter table public.rc_recall_recaps add column if not exists recall_end_ms integer;
alter table public.rc_recall_recaps add constraint rc_recall_capture_window check(
 (capture_id is null and recall_start_ms is null and recall_end_ms is null)
 or (capture_id is not null and voice='spoken' and object_path is null and recall_start_ms is not null and recall_end_ms is not null and recall_start_ms >= 0 and recall_end_ms > recall_start_ms and recall_end_ms <= 7200000)
);
alter table public.rc_recall_recaps drop constraint if exists rc_recall_saved_has_object;
alter table public.rc_recall_recaps add constraint rc_recall_saved_has_object check(recording_state <> 'saved' or object_path is not null or capture_id is not null);

create or replace function public.rc_recall_capture_guard() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' then
  if new.id is distinct from old.id or new.student_id is distinct from old.student_id or new.attempt_id is distinct from old.attempt_id or new.created_at is distinct from old.created_at then raise exception 'Capture identity cannot change.'; end if;
  if old.recording_state='saved' and (new.recording_state is distinct from old.recording_state or new.object_path is distinct from old.object_path or new.duration_ms is distinct from old.duration_ms or new.mime_type is distinct from old.mime_type) then raise exception 'Saved capture cannot change.'; end if;
 end if;
 if new.object_path is not null and left(new.object_path,length(new.student_id::text||'/'||new.attempt_id::text||'/capture-'||new.id::text||'-')) <> (new.student_id::text||'/'||new.attempt_id::text||'/capture-'||new.id::text||'-') then raise exception 'Capture path does not match its identity.'; end if;
 if new.recording_state='saved' then
  if not exists(select 1 from storage.objects o where o.bucket_id='rc-recall-recordings' and o.name=new.object_path) then raise exception 'Saved capture object must exist.'; end if;
  if exists(select 1 from public.rc_recall_recaps r where r.capture_id=new.id and r.recall_end_ms>new.duration_ms) then raise exception 'Recall window extends beyond its capture.'; end if;
 end if;
 new.updated_at:=now(); return new;
end $$;
create trigger rc_recall_capture_guard before insert or update on public.rc_recall_captures for each row execute function public.rc_recall_capture_guard();

create or replace function public.rc_recall_recap_guard() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='INSERT' and new.object_path is not null then raise exception 'Upload audio before setting its path.'; end if;
 if tg_op='UPDATE' then
  if new.id is distinct from old.id or new.attempt_id is distinct from old.attempt_id or new.student_id is distinct from old.student_id or new.recap_key is distinct from old.recap_key or new.passage_position is distinct from old.passage_position or new.kind is distinct from old.kind or new.capture_id is distinct from old.capture_id or new.recall_start_ms is distinct from old.recall_start_ms or new.recall_end_ms is distinct from old.recall_end_ms or new.created_at is distinct from old.created_at or (new.voice is distinct from old.voice and not(old.recording_state='failed' and old.object_path is null and old.capture_id is null)) then raise exception 'Recap identity and recall window cannot change.'; end if;
  if old.recording_state='saved' and (new.recording_state<>'saved' or new.object_path is distinct from old.object_path) then raise exception 'Saved recording cannot be replaced.'; end if;
  if old.object_path is not null and new.object_path is distinct from old.object_path then raise exception 'Recording path is fixed.'; end if;
 end if;
 if new.capture_id is not null then
  if not exists(select 1 from public.rc_recall_captures c where c.id=new.capture_id and c.student_id=new.student_id and c.attempt_id=new.attempt_id and (new.recording_state<>'saved' or (c.recording_state='saved' and new.recall_end_ms<=c.duration_ms))) then raise exception 'Capture ownership, state or recall window is invalid.'; end if;
 elsif new.object_path is not null then
  if left(new.object_path,length(new.student_id::text||'/'||new.attempt_id::text||'/'||new.recap_key||'-')) <> (new.student_id::text||'/'||new.attempt_id::text||'/'||new.recap_key||'-') then raise exception 'Recording path must belong to its recap.'; end if;
  if new.recording_state='saved' and not exists(select 1 from storage.objects o where o.bucket_id='rc-recall-recordings' and o.name=new.object_path) then raise exception 'Saved recording object must exist.'; end if;
 end if;
 new.updated_at:=now(); return new;
end $$;
create or replace function public.rc_recall_capture_propagate() returns trigger language plpgsql set search_path=public as $$
begin
 if new.recording_state='saved' then update public.rc_recall_recaps set recording_state='saved' where capture_id=new.id and recording_state<>'saved';
 elsif new.recording_state='failed' then update public.rc_recall_recaps set recording_state='failed' where capture_id=new.id and recording_state='pending'; end if;
 return new;
end $$;
create trigger rc_recall_capture_propagate after update on public.rc_recall_captures for each row execute function public.rc_recall_capture_propagate();

create table if not exists public.rc_recall_capture_transcripts (
 capture_id uuid primary key references public.rc_recall_captures(id) on delete restrict,
 attempt_id uuid not null references public.rc_recall_attempts(id) on delete restrict, student_id uuid not null,
 status text not null check(status in ('processing','ready','failed')), claim_token uuid, lease_until timestamptz,
 tries integer not null default 1 check(tries between 1 and 3), audio_hash text, asr_engine text,
 transcript text, asr_words jsonb, audio_seconds numeric, asr_calls integer not null default 0,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
revoke all on public.rc_recall_capture_transcripts from anon,authenticated;
grant all on public.rc_recall_capture_transcripts to service_role;
alter table public.rc_recall_capture_transcripts enable row level security;
alter table public.rc_recall_grades add column if not exists capture_id uuid references public.rc_recall_captures(id) on delete restrict;
alter table public.rc_recall_grades add column if not exists recall_start_ms integer;
alter table public.rc_recall_grades add column if not exists recall_end_ms integer;
alter table public.rc_recall_grades add column if not exists asr_calls integer not null default 0;
alter table public.rc_recall_grades add column if not exists judge_calls integer not null default 0;
alter table public.rc_recall_grades add column if not exists audio_seconds numeric;
alter table public.rc_recall_grades add column if not exists provider_usage jsonb;
-- A shared-ASR busy response releases the paragraph claim without consuming a try.
alter table public.rc_recall_grades drop constraint if exists rc_recall_grades_tries_check;
alter table public.rc_recall_grades add constraint rc_recall_grades_tries_check check(tries between 0 and 3);