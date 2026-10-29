
-- Abstract bootcamp progress tables
CREATE TABLE public.abstract_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
ALTER TABLE public.abstract_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lesson progress select" ON public.abstract_lesson_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own lesson progress insert" ON public.abstract_lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own lesson progress update" ON public.abstract_lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "admin read lesson progress" ON public.abstract_lesson_progress
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.abstract_drill_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  drill_id text NOT NULL,
  drill_type text NOT NULL,
  selected_index integer NOT NULL,
  correct boolean NOT NULL,
  confidence text NOT NULL,
  trap_tag text,
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX abstract_drill_attempts_user_idx ON public.abstract_drill_attempts(user_id, completed_at DESC);
ALTER TABLE public.abstract_drill_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own drill attempts select" ON public.abstract_drill_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own drill attempts insert" ON public.abstract_drill_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read drill attempts" ON public.abstract_drill_attempts
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.abstract_gauntlet_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  choice_id integer NOT NULL,
  keywords_picked text[] NOT NULL DEFAULT '{}',
  translation_text text NOT NULL DEFAULT '',
  requirements_checked integer[] NOT NULL DEFAULT '{}',
  correct_count integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX abstract_gauntlet_attempts_user_idx ON public.abstract_gauntlet_attempts(user_id, completed_at DESC);
ALTER TABLE public.abstract_gauntlet_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own gauntlet attempts select" ON public.abstract_gauntlet_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own gauntlet attempts insert" ON public.abstract_gauntlet_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read gauntlet attempts" ON public.abstract_gauntlet_attempts
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.abstract_final_set (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  score integer NOT NULL,
  total integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX abstract_final_set_user_idx ON public.abstract_final_set(user_id, completed_at DESC);
ALTER TABLE public.abstract_final_set ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own final set select" ON public.abstract_final_set
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own final set insert" ON public.abstract_final_set
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read final set" ON public.abstract_final_set
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
