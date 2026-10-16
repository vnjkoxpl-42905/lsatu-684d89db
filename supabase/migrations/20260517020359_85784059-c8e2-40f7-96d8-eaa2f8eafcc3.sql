-- Add missing time_ms column to abstract_drill_attempts
ALTER TABLE public.abstract_drill_attempts
  ADD COLUMN IF NOT EXISTS time_ms integer;

-- Create missing abstract_translator_attempts table
CREATE TABLE IF NOT EXISTS public.abstract_translator_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stem_number integer NOT NULL,
  keywords_picked text[] NOT NULL DEFAULT '{}'::text[],
  translation_text text NOT NULL DEFAULT ''::text,
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.abstract_translator_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own translator attempts insert"
  ON public.abstract_translator_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own translator attempts select"
  ON public.abstract_translator_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admin read translator attempts"
  ON public.abstract_translator_attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_translator_attempts_user
  ON public.abstract_translator_attempts(user_id, completed_at DESC);