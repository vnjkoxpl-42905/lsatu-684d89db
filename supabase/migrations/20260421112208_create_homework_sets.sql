-- Homework Phase A: reusable question-set templates owned by admins.
-- One row per template. Students never read this table; assignments snapshot
-- the qids at assign time into homework_assignments.

CREATE TABLE IF NOT EXISTS public.homework_sets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  description     text,
  question_qids   text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id        uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.homework_sets ENABLE ROW LEVEL SECURITY;

-- Admin CRUD on own rows only. Students have zero access.
CREATE POLICY "Admins read their homework sets"
  ON public.homework_sets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins insert their homework sets"
  ON public.homework_sets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins update their homework sets"
  ON public.homework_sets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins delete their homework sets"
  ON public.homework_sets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

-- Auto-bump updated_at on any UPDATE.
CREATE OR REPLACE FUNCTION public.bump_homework_sets_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS homework_sets_updated_at ON public.homework_sets;
CREATE TRIGGER homework_sets_updated_at
  BEFORE UPDATE ON public.homework_sets
  FOR EACH ROW EXECUTE FUNCTION public.bump_homework_sets_updated_at();

CREATE INDEX IF NOT EXISTS homework_sets_created_by_idx
  ON public.homework_sets (created_by, created_at DESC);
