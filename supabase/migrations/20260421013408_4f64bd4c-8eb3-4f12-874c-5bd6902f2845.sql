ALTER TABLE public.message_attachments
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'storage',
  ADD COLUMN IF NOT EXISTS drive_file_id uuid REFERENCES public.drive_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS web_view_link text;

ALTER TABLE public.message_attachments
  ALTER COLUMN storage_path DROP NOT NULL;

ALTER TABLE public.message_attachments
  ADD CONSTRAINT message_attachments_kind_check CHECK (kind IN ('storage','drive')),
  ADD CONSTRAINT message_attachments_target_check CHECK (
    (kind = 'storage' AND storage_path IS NOT NULL)
    OR (kind = 'drive' AND web_view_link IS NOT NULL)
  );

DROP POLICY IF EXISTS "Senders can add attachments" ON public.message_attachments;

CREATE POLICY "Senders can add attachments"
ON public.message_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_attachments.message_id
      AND m.sender_id = auth.uid()
  )
  AND (
    (kind = 'storage' AND storage_path IS NOT NULL)
    OR (kind = 'drive' AND web_view_link IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role))
  )
);