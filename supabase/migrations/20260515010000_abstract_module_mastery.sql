-- Add mastery level to abstract_module_progress.
-- Values: 'none' | 'practicing' | 'solid' | 'mastered'.
-- Computed client-side; stored for analytics and teacher dashboard rollups.

alter table public.abstract_module_progress
  add column if not exists mastery_level text not null default 'none';

create index if not exists abstract_module_progress_mastery_idx
  on public.abstract_module_progress (user_id, mastery_level);
