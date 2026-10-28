-- RC bootcamp lesson progress.
-- One row per (student, lesson). `data` is the same flat record the lesson
-- keeps in localStorage: position (__at), furthest reached (__furthest), the
-- student's written responses keyed by storage key, and their check-in picks.
-- `completed_at` mirrors __completedAt so completion can be queried without
-- unpacking the json.
CREATE TABLE public.rc_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX rc_lesson_progress_user_idx ON public.rc_lesson_progress(user_id, updated_at DESC);

ALTER TABLE public.rc_lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own rc lesson progress select" ON public.rc_lesson_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own rc lesson progress insert" ON public.rc_lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own rc lesson progress update" ON public.rc_lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "admin read rc lesson progress" ON public.rc_lesson_progress
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
