
-- homework_sets new columns
ALTER TABLE public.homework_sets
  ADD COLUMN IF NOT EXISTS is_guided_set boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guided_set_type text,
  ADD COLUMN IF NOT EXISTS estimated_minutes integer;

-- student_analytics_sources
CREATE TABLE IF NOT EXISTS public.student_analytics_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  source_name text NOT NULL,
  source_url text,
  embed_status text NOT NULL DEFAULT 'unknown',
  last_imported_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, source_name)
);
ALTER TABLE public.student_analytics_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage analytics sources"
  ON public.student_analytics_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view own analytics sources"
  ON public.student_analytics_sources
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE TRIGGER trg_sas_updated_at
  BEFORE UPDATE ON public.student_analytics_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- external_work_uploads
CREATE TABLE IF NOT EXISTS public.external_work_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  file_type text,
  storage_path text NOT NULL,
  source_platform text,
  upload_type text NOT NULL DEFAULT 'other',
  processing_status text NOT NULL DEFAULT 'uploaded',
  applied_to_analytics boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.external_work_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert own uploads"
  ON public.external_work_uploads
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND uploaded_by = auth.uid());

CREATE POLICY "Students view own uploads"
  ON public.external_work_uploads
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Admins manage all uploads"
  ON public.external_work_uploads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
