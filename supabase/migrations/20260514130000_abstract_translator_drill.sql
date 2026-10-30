-- abstract_translator_attempts: per-stem submissions from the Abstract
-- bootcamp's 14-stem question-stem translation drill.
--
-- Mirrors the pattern used for abstract_drill_attempts: append-only log,
-- owner can read their rows + insert; admins can read all. Hydration in
-- AppContext orders by completed_at desc to derive Translator progress.

create table if not exists public.abstract_translator_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stem_number integer not null,
  keywords_picked text[] not null default '{}',
  translation_text text not null default '',
  completed_at timestamptz not null default now()
);

create index if not exists abstract_translator_attempts_user_id_idx
  on public.abstract_translator_attempts (user_id, completed_at desc);

alter table public.abstract_translator_attempts enable row level security;

create policy "abstract_translator_attempts: owner can select"
  on public.abstract_translator_attempts for select
  using (auth.uid() = user_id or public.is_admin());

create policy "abstract_translator_attempts: owner can insert"
  on public.abstract_translator_attempts for insert
  with check (auth.uid() = user_id);
