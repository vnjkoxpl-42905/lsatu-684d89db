
-- 1. Revoke credential hash columns on students
REVOKE SELECT (pin_hash, token_hash) ON public.students FROM authenticated, anon;

-- 2. classroom_items: restrict student updates to status-related fields only
DROP POLICY IF EXISTS classroom_items_student_update ON public.classroom_items;
CREATE POLICY classroom_items_student_update_status ON public.classroom_items
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (
    student_id = auth.uid()
    AND visible_to_student = (SELECT ci.visible_to_student FROM public.classroom_items ci WHERE ci.id = classroom_items.id)
    AND unlock_at IS NOT DISTINCT FROM (SELECT ci.unlock_at FROM public.classroom_items ci WHERE ci.id = classroom_items.id)
    AND created_by = (SELECT ci.created_by FROM public.classroom_items ci WHERE ci.id = classroom_items.id)
    AND type = (SELECT ci.type FROM public.classroom_items ci WHERE ci.id = classroom_items.id)
    AND priority = (SELECT ci.priority FROM public.classroom_items ci WHERE ci.id = classroom_items.id)
    AND due_at IS NOT DISTINCT FROM (SELECT ci.due_at FROM public.classroom_items ci WHERE ci.id = classroom_items.id)
  );

-- 3. ta_interactions: students can read their own
CREATE POLICY "Students read own TA interactions" ON public.ta_interactions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- 4. guided_drills: students can read published drills
CREATE POLICY "Authenticated read published guided drills" ON public.guided_drills
  FOR SELECT TO authenticated
  USING (is_published = true);

-- 5. homework_sets: students can read sets they have been assigned
CREATE POLICY "Students read assigned homework sets" ON public.homework_sets
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.homework_assignments ha
    WHERE ha.set_id = homework_sets.id AND ha.student_id = auth.uid()
  ));

-- 6. Storage: allow senders/admins to delete their message attachment files
CREATE POLICY "Senders or admins delete attachment files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.message_attachments ma
        JOIN public.messages m ON m.id = ma.message_id
        WHERE ma.storage_path = storage.objects.name
          AND m.sender_id = auth.uid()
      )
    )
  );

-- 7. Lock down pgmq wrapper functions (called only from edge functions with service role)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- 8. Set fixed search_path on pgmq wrappers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
