-- Phase B storage: per-student context files (PDFs, screenshots, transcripts).
-- Admin-only at the storage layer; mirrors the teaching-assets bucket.
-- Path convention: {student_id}/{context_id}/{filename}.

INSERT INTO storage.buckets (id, name, public)
VALUES ('student-context', 'student-context', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read student context files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-context'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins upload student context files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-context'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins update student context files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'student-context'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins delete student context files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-context'
    AND public.has_role(auth.uid(), 'admin')
  );
