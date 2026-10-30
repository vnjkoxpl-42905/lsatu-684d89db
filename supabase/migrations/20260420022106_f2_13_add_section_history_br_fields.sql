-- F2.13 — Add BR/section analytics fields to section_history.
-- Client (LRSectionResults.tsx) has been writing these 7 fields; table did not declare them.
-- Idempotent, nullable, no defaults. Safe against existing rows. No RLS changes.

ALTER TABLE public.section_history ADD COLUMN IF NOT EXISTS br_total integer;
ALTER TABLE public.section_history ADD COLUMN IF NOT EXISTS br_delta integer;
ALTER TABLE public.section_history ADD COLUMN IF NOT EXISTS avg_time_ms integer;
ALTER TABLE public.section_history ADD COLUMN IF NOT EXISTS unanswered_count integer;
ALTER TABLE public.section_history ADD COLUMN IF NOT EXISTS by_qtype_json jsonb;
ALTER TABLE public.section_history ADD COLUMN IF NOT EXISTS by_difficulty_json jsonb;
ALTER TABLE public.section_history ADD COLUMN IF NOT EXISTS br_used boolean;
