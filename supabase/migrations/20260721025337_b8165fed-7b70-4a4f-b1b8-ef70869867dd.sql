
ALTER TABLE public.external_work_uploads
  ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'external-work-uploads';

-- Storage RLS for the new inbox-uploads bucket
DROP POLICY IF EXISTS "inbox_uploads_student_read_own" ON storage.objects;
CREATE POLICY "inbox_uploads_student_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'inbox-uploads'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR split_part(name, '/', 1) = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "inbox_uploads_student_write_own" ON storage.objects;
CREATE POLICY "inbox_uploads_student_write_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'inbox-uploads'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR split_part(name, '/', 1) = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "inbox_uploads_admin_manage" ON storage.objects;
CREATE POLICY "inbox_uploads_admin_manage" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'inbox-uploads' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'inbox-uploads' AND public.has_role(auth.uid(), 'admin'));
