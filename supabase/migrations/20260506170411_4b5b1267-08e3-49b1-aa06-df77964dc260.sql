DROP POLICY IF EXISTS classroom_items_student_select ON public.classroom_items;
CREATE POLICY classroom_items_student_select
  ON public.classroom_items
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    AND visible_to_student = true
    AND (
      type = 'bootcamp_module'
      OR unlock_at IS NULL
      OR unlock_at <= now()
    )
  );