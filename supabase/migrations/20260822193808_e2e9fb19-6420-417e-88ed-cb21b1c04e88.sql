create table if not exists public.cs_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  module_id text not null,
  question_id text not null,
  selected_answer text,
  correct boolean,
  time_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists cs_attempts_user_created_idx
  on public.cs_attempts (user_id, created_at desc);

grant select, insert, delete on public.cs_attempts to authenticated;
grant all on public.cs_attempts to service_role;

alter table public.cs_attempts enable row level security;

create policy "students read own cs attempts"
  on public.cs_attempts for select to authenticated
  using (auth.uid() = user_id);

create policy "students record own cs attempts"
  on public.cs_attempts for insert to authenticated
  with check (auth.uid() = user_id);

create policy "admins read all cs attempts"
  on public.cs_attempts for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "admins delete cs attempts"
  on public.cs_attempts for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace view public.drill_history
with (security_invoker = on) as
select
  coalesce(
    a.user_id,
    case
      when a.class_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then a.class_id::uuid
    end
  ) as user_id,
  'lr'::text as source,
  a.qid as question_key,
  ('PT' || a.pt || ' · S' || a.section || ' · Q' || a.qnum)::text as question_ref,
  a.qtype as detail,
  a.correct,
  a.time_ms,
  a.selected_answer,
  a.mode,
  a.timestamp_iso as attempted_at
from public.attempts a
union all
select
  i.user_id,
  'intro-lr'::text,
  (i.drill_id || '::' || i.question_id)::text,
  i.question_id,
  i.drill_id,
  i.correct,
  i.time_ms,
  i.selected_answer,
  i.mode,
  i.created_at
from public.intro_lr_attempts i
union all
select
  r.user_id,
  'rc'::text,
  ('rc::' || r.question_id)::text,
  ('Passage ' || r.passage_id || ' · Q' || r.question_id)::text,
  null::text,
  r.is_correct,
  r.time_ms,
  r.selected,
  case when r.is_first_attempt then 'first' else 'review' end,
  r.created_at
from public.rc_attempts r
union all
select
  d.user_id,
  'abstract'::text,
  (d.drill_id || '::' || coalesce(d.trap_tag, d.drill_type, ''))::text,
  d.drill_id,
  d.drill_type,
  d.correct,
  d.time_ms,
  d.selected_index::text,
  null::text,
  d.completed_at
from public.abstract_drill_attempts d
union all
select
  c.user_id,
  'causation'::text,
  ('cs::' || c.module_id || '::' || c.question_id)::text,
  c.question_id,
  c.module_id,
  c.correct,
  c.time_ms,
  c.selected_answer,
  null::text,
  c.created_at
from public.cs_attempts c;

grant select on public.drill_history to authenticated;
grant select on public.drill_history to service_role;

notify pgrst, 'reload schema';