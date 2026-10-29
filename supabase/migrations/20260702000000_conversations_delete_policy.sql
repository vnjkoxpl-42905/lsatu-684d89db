-- Allow admins to delete an entire conversation. conversation_participants and
-- messages both reference conversations(id) with ON DELETE CASCADE, and
-- message_attachments cascades off messages, so deleting the conversation row
-- tears down the whole thread automatically.
CREATE POLICY "Admins can delete conversations"
ON public.conversations FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
