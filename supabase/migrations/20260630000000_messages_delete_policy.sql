-- Allow a message sender to delete their own message, and admins to delete any
-- message. message_attachments has ON DELETE CASCADE on message_id, so
-- attachments are removed automatically.
CREATE POLICY "Senders and admins can delete messages"
ON public.messages FOR DELETE TO authenticated
USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
