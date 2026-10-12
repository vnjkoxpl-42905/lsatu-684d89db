-- Linear module bootcamp progress table.
-- One row per (user_id, module_id). Tracks Note, Quiz, Drill completion
-- plus quiz score, streak high, and the "Aced It" perfect-module badge.

create table if not exists public.abstract_module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  note_complete boolean not null default false,
  quiz_score int not null default 0,
  quiz_total int not null default 0,
  quiz_streak_high int not null default 0,
  drill_complete boolean not null default false,
  aced boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, module_id)
);

alter table public.abstract_module_progress enable row level security;

create policy "owner select abstract_module_progress"
  on public.abstract_module_progress
  for select
  using (auth.uid() = user_id or public.is_admin());

create policy "owner upsert abstract_module_progress"
  on public.abstract_module_progress
  for insert
  with check (auth.uid() = user_id);

create policy "owner update abstract_module_progress"
  on public.abstract_module_progress
  for update
  using (auth.uid() = user_id);

create index if not exists abstract_module_progress_user_idx
  on public.abstract_module_progress (user_id, module_id);
