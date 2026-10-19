DROP POLICY IF EXISTS waj_select_own_class ON public.wrong_answer_journal;
DROP POLICY IF EXISTS waj_insert_own_class ON public.wrong_answer_journal;
DROP POLICY IF EXISTS waj_update_own_class ON public.wrong_answer_journal;

CREATE POLICY waj_select_own_class ON public.wrong_answer_journal
  FOR SELECT USING (class_id = (auth.uid())::text);

CREATE POLICY waj_insert_own_class ON public.wrong_answer_journal
  FOR INSERT WITH CHECK (class_id = (auth.uid())::text);

CREATE POLICY waj_update_own_class ON public.wrong_answer_journal
  FOR UPDATE USING (class_id = (auth.uid())::text) WITH CHECK (class_id = (auth.uid())::text);