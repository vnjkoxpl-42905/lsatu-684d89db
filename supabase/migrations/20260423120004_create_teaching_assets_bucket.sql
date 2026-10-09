-- AI Teaching Assistant Phase 1 (E): Supabase Storage bucket for uploaded
-- teaching-library files (PDFs, docs). Admin-only read/write at the storage
-- layer. Path convention: {asset_id}/{filename}.

INSERT INTO storage.buckets (id, name, public)
VALUES ('teaching-assets', 'teaching-assets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read teaching asset files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'teaching-assets'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins upload teaching asset files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'teaching-assets'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins update teaching asset files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'teaching-assets'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins delete teaching asset files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'teaching-assets'
    AND public.has_role(auth.uid(), 'admin')
  );
