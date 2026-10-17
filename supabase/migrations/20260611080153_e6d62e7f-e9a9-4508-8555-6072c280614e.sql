
CREATE TABLE public.intro_lr_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drill_id text NOT NULL,
  question_id text NOT NULL,
  mode text NOT NULL,
  selected_answer text,
  correct boolean NOT NULL,
  time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX intro_lr_attempts_user_idx ON public.intro_lr_attempts(user_id, created_at DESC);
CREATE INDEX intro_lr_attempts_drill_idx ON public.intro_lr_attempts(drill_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intro_lr_attempts TO authenticated;
GRANT ALL ON public.intro_lr_attempts TO service_role;

ALTER TABLE public.intro_lr_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own intro_lr attempts"
  ON public.intro_lr_attempts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all intro_lr attempts"
  ON public.intro_lr_attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
