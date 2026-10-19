create table if not exists public.rc_recall_grades (
 id uuid primary key default gen_random_uuid(),
 recap_id uuid not null references public.rc_recall_recaps(id) on delete restrict,
 attempt_id uuid not null references public.rc_recall_attempts(id) on delete restrict,
 student_id uuid not null,
 grader_version integer not null,
 status text not null check(status in ('processing','ready','failed','ungradable')),
 claim_token uuid,
 lease_until timestamptz,
 tries integer not null default 1 check(tries between 1 and 3),
 reason text,
 source_text text, source_hash text, audio_hash text, object_path text,
 passage_id integer, paragraph_index integer,
 transcript text, asr_words jsonb, asr_engine text, model text,
 assessment jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(recap_id, grader_version),
 check(status <> 'ready' or (source_text is not null and source_hash is not null and audio_hash is not null and transcript is not null and assessment is not null))
);
alter table public.rc_recall_grades enable row level security;
revoke all on public.rc_recall_grades from anon, authenticated;
grant select on public.rc_recall_grades to authenticated;
grant all on public.rc_recall_grades to service_role;
create policy "rc grades owner read" on public.rc_recall_grades for select to authenticated using(student_id=auth.uid());
create policy "rc grades admin read" on public.rc_recall_grades for select to authenticated using(public.has_role(auth.uid(),'admin'));
create index if not exists rc_recall_grades_attempt_idx on public.rc_recall_grades(attempt_id);