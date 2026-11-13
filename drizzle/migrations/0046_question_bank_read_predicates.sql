-- Replace always-true read rules on shared question-bank content with a real
-- predicate: a signed-in user whose student access is not paused (admins are
-- never paused). Same audience as before for active students and staff.
DROP POLICY IF EXISTS "Authenticated can read lr_questions" ON public.lr_questions;
CREATE POLICY "Authenticated can read lr_questions" ON public.lr_questions
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT (SELECT public.student_access_is_paused()));

DROP POLICY IF EXISTS "Authenticated can read lr_preptests" ON public.lr_preptests;
CREATE POLICY "Authenticated can read lr_preptests" ON public.lr_preptests
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT (SELECT public.student_access_is_paused()));

DROP POLICY IF EXISTS "Authenticated can read lr_sections" ON public.lr_sections;
CREATE POLICY "Authenticated can read lr_sections" ON public.lr_sections
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT (SELECT public.student_access_is_paused()));

DROP POLICY IF EXISTS "Authenticated can read lr_answer_choices" ON public.lr_answer_choices;
CREATE POLICY "Authenticated can read lr_answer_choices" ON public.lr_answer_choices
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT (SELECT public.student_access_is_paused()));

DROP POLICY IF EXISTS "Authenticated can read lr_explanations" ON public.lr_explanations;
CREATE POLICY "Authenticated can read lr_explanations" ON public.lr_explanations
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT (SELECT public.student_access_is_paused()));

DROP POLICY IF EXISTS "Authenticated can read lr_explanation_steps" ON public.lr_explanation_steps;
CREATE POLICY "Authenticated can read lr_explanation_steps" ON public.lr_explanation_steps
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT (SELECT public.student_access_is_paused()));

DROP POLICY IF EXISTS "Authenticated can read lr_explanation_choice_notes" ON public.lr_explanation_choice_notes;
CREATE POLICY "Authenticated can read lr_explanation_choice_notes" ON public.lr_explanation_choice_notes
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT (SELECT public.student_access_is_paused()));

DROP POLICY IF EXISTS "Authenticated can read rc_answer_choices" ON public.rc_answer_choices;
CREATE POLICY "Authenticated can read rc_answer_choices" ON public.rc_answer_choices
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT (SELECT public.student_access_is_paused()));
