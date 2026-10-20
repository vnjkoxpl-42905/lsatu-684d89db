-- Editing the note on a flagged question.
--
-- The policy set created in 20260406153113 covers SELECT, INSERT and DELETE on
-- flagged_questions but not UPDATE, because nothing in the product wrote to an
-- existing flag row. The Classroom's Flagged surface now lets a student fill in
-- why they flagged something after the fact, so the row needs to be updatable
-- by the student who owns it.
--
-- Scoped exactly like its siblings: class_id = auth.uid()::text, both for the
-- rows the student may touch and for the rows they may leave behind.

DROP POLICY IF EXISTS "Students can update own flags" ON public.flagged_questions;
CREATE POLICY "Students can update own flags" ON public.flagged_questions
  FOR UPDATE TO authenticated
  USING (class_id = auth.uid()::text)
  WITH CHECK (class_id = auth.uid()::text);
