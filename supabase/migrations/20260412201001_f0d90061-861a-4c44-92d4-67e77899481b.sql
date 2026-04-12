-- Add selected_answer column to attempts
ALTER TABLE public.attempts ADD COLUMN selected_answer text;

-- Create question_views table
CREATE TABLE public.question_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  qid text NOT NULL,
  mode text,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  answered boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.question_views ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Students can view own question views"
ON public.question_views FOR SELECT
TO authenticated
USING (class_id = auth.uid()::text);

CREATE POLICY "Students can insert own question views"
ON public.question_views FOR INSERT
TO authenticated
WITH CHECK (class_id = auth.uid()::text);

CREATE POLICY "Students can update own question views"
ON public.question_views FOR UPDATE
TO authenticated
USING (class_id = auth.uid()::text)
WITH CHECK (class_id = auth.uid()::text);

-- Index for fast lookups
CREATE INDEX idx_question_views_class_qid ON public.question_views (class_id, qid);
CREATE INDEX idx_question_views_class_mode ON public.question_views (class_id, mode);