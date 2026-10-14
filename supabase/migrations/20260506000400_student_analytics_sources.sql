-- student_analytics_sources: external analytics destinations per student
-- (7Sage URL, etc.) plus optional last imported summary. Admin-only.

create table if not exists public.student_analytics_sources (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid,
  source_name text not null check (source_name in ('7sage','lawhub','other')),
  source_url text,
  embed_status text not null default 'unknown' check (embed_status in (
    'unknown','allowed','blocked','external_only'
  )),
  last_imported_at timestamptz,
  last_parsed_summary_json jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_analytics_sources_student_idx
  on public.student_analytics_sources (student_id, source_name);

create or replace function public.touch_student_analytics_sources_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists student_analytics_sources_touch on public.student_analytics_sources;
create trigger student_analytics_sources_touch before update on public.student_analytics_sources
  for each row execute function public.touch_student_analytics_sources_updated_at();

alter table public.student_analytics_sources enable row level security;

create policy student_analytics_sources_admin_all on public.student_analytics_sources
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
