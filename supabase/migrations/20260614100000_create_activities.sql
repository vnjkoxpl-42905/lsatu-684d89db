-- Activity Centre Phase 1: the activity definition library (admin-owned).
-- One row per Activity (a self-contained, coach-led skill exercise, distinct
-- from the MCQ Drill engine). Each Activity is fully independent; future
-- activities are additive rows and never mutate existing ones. Students never
-- read this table directly; assignments snapshot the items at assign time into
-- activity_assignments. Mirrors the homework_sets definition-library pattern.

CREATE TABLE IF NOT EXISTS public.activities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  title         text NOT NULL,
  subtitle      text,
  instructions  jsonb NOT NULL DEFAULT '{}'::jsonb,   -- rules + worked example
  item_format   text NOT NULL DEFAULT 'free-text'
                CHECK (item_format IN ('free-text', 'mcq', 'variation')),
  items         jsonb NOT NULL DEFAULT '[]'::jsonb,    -- ordered item array
  created_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id      uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Admin CRUD on own rows only. Students have zero direct access; they read the
-- snapshot in activity_assignments instead.
CREATE POLICY "Admins read their activities"
  ON public.activities FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins insert their activities"
  ON public.activities FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins update their activities"
  ON public.activities FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins delete their activities"
  ON public.activities FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

-- Auto-bump updated_at on any UPDATE.
CREATE OR REPLACE FUNCTION public.bump_activities_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activities_updated_at ON public.activities;
CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.bump_activities_updated_at();

CREATE INDEX IF NOT EXISTS activities_created_by_idx
  ON public.activities (created_by, created_at DESC);
