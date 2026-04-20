-- F2.14 — Add BR write-path fields to blind_review_sessions + attempts.
-- Client (saveBRResults in Drill.tsx) has been writing these 16 fields; tables did not declare them.
-- Idempotent, nullable, no defaults. Safe against existing rows. No RLS changes.

-- blind_review_sessions: 7 BR summary fields
ALTER TABLE public.blind_review_sessions ADD COLUMN IF NOT EXISTS session_id uuid;
ALTER TABLE public.blind_review_sessions ADD COLUMN IF NOT EXISTS br_items_count integer;
ALTER TABLE public.blind_review_sessions ADD COLUMN IF NOT EXISTS br_corrected_count integer;
ALTER TABLE public.blind_review_sessions ADD COLUMN IF NOT EXISTS br_stuck_count integer;
ALTER TABLE public.blind_review_sessions ADD COLUMN IF NOT EXISTS br_regret_count integer;
ALTER TABLE public.blind_review_sessions ADD COLUMN IF NOT EXISTS br_confirmed_count integer;
ALTER TABLE public.blind_review_sessions ADD COLUMN IF NOT EXISTS br_median_time_ms integer;

-- attempts: 9 per-question BR fields
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS br_marked boolean;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS pre_answer text;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS br_selected boolean;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS br_answer text;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS br_rationale text;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS br_time_ms integer;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS br_changed boolean;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS br_outcome text;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS br_delta text;
