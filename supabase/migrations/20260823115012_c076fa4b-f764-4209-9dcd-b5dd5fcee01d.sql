DROP POLICY IF EXISTS "Students can view own achievements" ON public.achievements;
DROP POLICY IF EXISTS "Students can insert own achievements" ON public.achievements;
DROP POLICY IF EXISTS "Students can update own achievements" ON public.achievements;

ALTER TABLE public.achievements
  ALTER COLUMN class_id TYPE uuid USING class_id::uuid;

CREATE POLICY "Students can view own achievements" ON public.achievements
  FOR SELECT TO authenticated
  USING (class_id = auth.uid());

CREATE POLICY "Students can insert own achievements" ON public.achievements
  FOR INSERT TO authenticated
  WITH CHECK (class_id = auth.uid());

CREATE POLICY "Students can update own achievements" ON public.achievements
  FOR UPDATE TO authenticated
  USING (class_id = auth.uid())
  WITH CHECK (class_id = auth.uid());