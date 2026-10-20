
-- Add new feature flag columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_practice_access boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_drill_access boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_waj_access boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_flagged_access boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_chat_access boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_export_access boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();
