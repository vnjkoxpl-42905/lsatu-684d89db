-- RC Recall: append-only attempt history and private per-recap recordings.
--
-- Authored locally only. Nothing here has been applied to any remote database.
--
-- Rules the policies enforce:
--  * An attempt belongs to the student who made it and needs current Reading
--    Center access to be created or finalized.
--  * Attempts are never deleted and never replaced; a finished attempt is frozen.
--  * Each recap has its own row and its own recording state, so one failed
--    upload cannot hide or falsify the rest.
--  * Recordings live in their own private bucket. Objects are insert-only (no
--    update, so no overwrite), readable only by the student they belong to.
--    Instructors can read attempt and recap metadata, never the audio.
begin;

create table if not exists public.rc_recall_attempts (
  id uuid primary key,
  student_id uuid not null references auth.users(id) on delete restrict,
  mode text not null check (mode in ('rc_recall', 'cumulative_recall')),
  preptest integer not null check (preptest > 0),
  section integer not null check (section > 0),
  passage_ids integer[] not null check (cardinality(passage_ids) = 4),
  -- Only RC Recall has a confirmation step; Cumulative Recall has none.
  confirmation_scope text check (confirmation_scope in ('all_read', 'current_sub_passage')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  elapsed_seconds integer check (elapsed_seconds is null or elapsed_seconds >= 0),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint rc_recall_scope_matches_mode check (
    (mode = 'rc_recall' and confirmation_scope is not null)
    or (mode = 'cumulative_recall' and confirmation_scope is null)
  ),
  constraint rc_recall_finish_consistent check (
    (finished_at is null and elapsed_seconds is null and completed = false)
    or (finished_at is not null and elapsed_seconds is not null)
  )
);

create index if not exists rc_recall_attempts_student_idx
  on public.rc_recall_attempts (student_id, started_at desc);

create table if not exists public.rc_recall_recaps (
  id uuid primary key,
  attempt_id uuid not null references public.rc_recall_attempts(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  recap_key text not null,
  passage_position integer not null check (passage_position between 1 and 4),
  kind text not null check (kind in ('recall', 'cumulative', 'passage_recap')),
  voice text not null check (voice in ('spoken', 'silent')),
  recording_state text not null check (recording_state in ('not_recorded', 'pending', 'saved', 'failed')),
  object_path text,
  mime_type text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, recap_key),
  unique (object_path),
  constraint rc_recall_voice_matches_state check (
    (voice = 'silent' and recording_state = 'not_recorded' and object_path is null)
    or (voice = 'spoken' and recording_state in ('pending', 'saved', 'failed'))
  ),
  constraint rc_recall_saved_has_object check (recording_state <> 'saved' or object_path is not null)
);

create index if not exists rc_recall_recaps_attempt_idx on public.rc_recall_recaps (attempt_id);

alter table public.rc_recall_attempts enable row level security;
alter table public.rc_recall_recaps enable row level security;

-- Attempts -------------------------------------------------------------------
drop policy if exists "rc recall attempts read own" on public.rc_recall_attempts;
create policy "rc recall attempts read own" on public.rc_recall_attempts
  for select to authenticated using (student_id = auth.uid());

-- Instructors read metadata only.
drop policy if exists "rc recall attempts admin read" on public.rc_recall_attempts;
create policy "rc recall attempts admin read" on public.rc_recall_attempts
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "rc recall attempts insert own" on public.rc_recall_attempts;
create policy "rc recall attempts insert own" on public.rc_recall_attempts
  for insert to authenticated
  with check (student_id = auth.uid() and public.has_reading_center_access() and finished_at is null and completed = false);

drop policy if exists "rc recall attempts finalize own" on public.rc_recall_attempts;
create policy "rc recall attempts finalize own" on public.rc_recall_attempts
  for update to authenticated
  using (student_id = auth.uid() and finished_at is null and public.has_reading_center_access())
  with check (student_id = auth.uid());
-- No delete policy: history is append-only.

create or replace function public.rc_recall_attempt_guard()
returns trigger language plpgsql set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.finished_at is not null then
      raise exception 'A finished RC Recall attempt cannot change.';
    end if;
    if new.id is distinct from old.id or new.student_id is distinct from old.student_id
      or new.mode is distinct from old.mode or new.preptest is distinct from old.preptest
      or new.section is distinct from old.section or new.passage_ids is distinct from old.passage_ids
      or new.confirmation_scope is distinct from old.confirmation_scope
      or new.started_at is distinct from old.started_at or new.created_at is distinct from old.created_at then
      raise exception 'Only the result of an RC Recall attempt can be finalized.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists rc_recall_attempt_guard on public.rc_recall_attempts;
create trigger rc_recall_attempt_guard before update on public.rc_recall_attempts
  for each row execute function public.rc_recall_attempt_guard();

-- Recaps ---------------------------------------------------------------------
drop policy if exists "rc recall recaps read own" on public.rc_recall_recaps;
create policy "rc recall recaps read own" on public.rc_recall_recaps
  for select to authenticated using (student_id = auth.uid());

drop policy if exists "rc recall recaps admin read" on public.rc_recall_recaps;
create policy "rc recall recaps admin read" on public.rc_recall_recaps
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "rc recall recaps insert own" on public.rc_recall_recaps;
create policy "rc recall recaps insert own" on public.rc_recall_recaps
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and public.has_reading_center_access()
    and recording_state in ('not_recorded', 'pending')
    and exists (select 1 from public.rc_recall_attempts a where a.id = attempt_id and a.student_id = auth.uid() and a.finished_at is null)
  );

drop policy if exists "rc recall recaps update own" on public.rc_recall_recaps;
create policy "rc recall recaps update own" on public.rc_recall_recaps
  for update to authenticated
  using (student_id = auth.uid() and public.has_reading_center_access())
  with check (student_id = auth.uid());

create or replace function public.rc_recall_recap_guard()
returns trigger language plpgsql set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.object_path is not null then
      raise exception 'A recording path can only be set after its object is uploaded.';
    end if;
  end if;
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.attempt_id is distinct from old.attempt_id
      or new.student_id is distinct from old.student_id or new.recap_key is distinct from old.recap_key
      or new.passage_position is distinct from old.passage_position or new.kind is distinct from old.kind
      or (new.voice is distinct from old.voice and not (old.recording_state = 'failed' and old.object_path is null))
      or new.created_at is distinct from old.created_at then
      raise exception 'Only the recording state of an RC Recall recap can change.';
    end if;
    -- A saved recording is final; it can never point at another object.
    if old.recording_state = 'saved' and (new.recording_state <> 'saved' or new.object_path is distinct from old.object_path) then
      raise exception 'A saved RC Recall recording cannot be replaced.';
    end if;
    -- A recording path is set once, under this attempt's own folder.
    if old.object_path is not null and new.object_path is distinct from old.object_path then
      raise exception 'The recording path of an RC Recall recap is fixed once set.';
    end if;
    if new.object_path is not null and left(new.object_path, length(new.student_id::text || '/' || new.attempt_id::text || '/' || new.recap_key || '-'))
      <> (new.student_id::text || '/' || new.attempt_id::text || '/' || new.recap_key || '-') then
      raise exception 'Recording path must belong to this recap under its attempt folder.';
    end if;
    if new.recording_state = 'saved' and not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'rc-recall-recordings' and o.name = new.object_path
    ) then
      raise exception 'Saved recording object must already exist.';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists rc_recall_recap_guard on public.rc_recall_recaps;
create trigger rc_recall_recap_guard before insert or update on public.rc_recall_recaps
  for each row execute function public.rc_recall_recap_guard();

-- Private recordings bucket, separate from `drill-recordings` -----------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rc-recall-recordings', 'rc-recall-recordings', false, 52428800,
  array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "rc recall recordings read own" on storage.objects;
drop policy if exists "rc recall recordings insert own" on storage.objects;

-- Path is `<student_id>/<attempt_id>/<file>`. The attempt must be the student's
-- own (it may be finished: recovered recordings upload later), and the student
-- must still hold Reading Center access.
create policy "rc recall recordings insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'rc-recall-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.has_reading_center_access()
    and exists (
      select 1 from public.rc_recall_attempts a
      where a.id::text = (storage.foldername(name))[2] and a.student_id = auth.uid()
    )
  );

-- Only the owner reads the audio. There is no admin policy, no update policy
-- (so nothing can be overwritten) and no delete policy.
create policy "rc recall recordings read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'rc-recall-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
