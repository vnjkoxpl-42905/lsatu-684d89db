-- Abstract Bootcamp v2.0 progress tables.
--
-- Four per-domain tables for the brutalist Abstract bootcamp:
--   abstract_lesson_progress     completion of the 8 lessons
--   abstract_drill_attempts      per-drill MC attempts with confidence + trap tag
--   abstract_gauntlet_attempts   per-item Decode Gauntlet snapshots
--   abstract_final_set           final timed PT-set score summary
--
-- Lesson + drill writes are mirrored by analytics events into chapter_progress
-- and attempt (existing tables) inside the app layer; this migration only
-- defines the per-domain canonical storage.

create table if not exists public.abstract_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists public.abstract_drill_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  drill_id text not null,
  drill_type text not null,
  selected_index int not null,
  correct boolean not null,
  confidence text not null check (confidence in ('Guessing','Unsure','Pretty sure','Confident')),
  trap_tag text,
  completed_at timestamptz not null default now()
);

create table if not exists public.abstract_gauntlet_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  choice_id int not null,
  keywords_picked text[] not null default array[]::text[],
  translation_text text not null default '',
  requirements_checked int[] not null default array[]::int[],
  correct_count int not null default 0,
  completed_at timestamptz not null default now()
);

create table if not exists public.abstract_final_set (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null,
  total int not null,
  completed_at timestamptz not null default now()
);

create index if not exists abstract_drill_attempts_user_id_idx
  on public.abstract_drill_attempts (user_id, completed_at desc);

create index if not exists abstract_gauntlet_attempts_user_id_idx
  on public.abstract_gauntlet_attempts (user_id, completed_at desc);

create index if not exists abstract_lesson_progress_user_id_idx
  on public.abstract_lesson_progress (user_id, completed_at desc);

-- RLS: students see and write their own rows. Admin override via existing
-- public.is_admin() helper.

alter table public.abstract_lesson_progress enable row level security;
alter table public.abstract_drill_attempts enable row level security;
alter table public.abstract_gauntlet_attempts enable row level security;
alter table public.abstract_final_set enable row level security;

create policy "abstract_lesson_progress: owner can select"
  on public.abstract_lesson_progress for select
  using (auth.uid() = user_id or public.is_admin());

create policy "abstract_lesson_progress: owner can insert"
  on public.abstract_lesson_progress for insert
  with check (auth.uid() = user_id);

create policy "abstract_lesson_progress: owner can update"
  on public.abstract_lesson_progress for update
  using (auth.uid() = user_id);

create policy "abstract_drill_attempts: owner can select"
  on public.abstract_drill_attempts for select
  using (auth.uid() = user_id or public.is_admin());

create policy "abstract_drill_attempts: owner can insert"
  on public.abstract_drill_attempts for insert
  with check (auth.uid() = user_id);

create policy "abstract_gauntlet_attempts: owner can select"
  on public.abstract_gauntlet_attempts for select
  using (auth.uid() = user_id or public.is_admin());

create policy "abstract_gauntlet_attempts: owner can insert"
  on public.abstract_gauntlet_attempts for insert
  with check (auth.uid() = user_id);

create policy "abstract_final_set: owner can select"
  on public.abstract_final_set for select
  using (auth.uid() = user_id or public.is_admin());

create policy "abstract_final_set: owner can insert"
  on public.abstract_final_set for insert
  with check (auth.uid() = user_id);

create policy "abstract_final_set: owner can update"
  on public.abstract_final_set for update
  using (auth.uid() = user_id);
