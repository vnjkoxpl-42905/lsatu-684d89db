-- Teaching assets
CREATE TABLE IF NOT EXISTS public.teaching_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  asset_type text NOT NULL CHECK (asset_type IN ('pdf','document','question_set','drill','curriculum','notes')),
  content_text text,
  file_path text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teaching_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read teaching assets" ON public.teaching_assets;
CREATE POLICY "Admins read teaching assets" ON public.teaching_assets FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins insert teaching assets" ON public.teaching_assets;
CREATE POLICY "Admins insert teaching assets" ON public.teaching_assets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND created_by=auth.uid());
DROP POLICY IF EXISTS "Admins update teaching assets" ON public.teaching_assets;
CREATE POLICY "Admins update teaching assets" ON public.teaching_assets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins delete teaching assets" ON public.teaching_assets;
CREATE POLICY "Admins delete teaching assets" ON public.teaching_assets FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.bump_teaching_assets_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at:=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS teaching_assets_updated_at ON public.teaching_assets;
CREATE TRIGGER teaching_assets_updated_at BEFORE UPDATE ON public.teaching_assets FOR EACH ROW EXECUTE FUNCTION public.bump_teaching_assets_updated_at();
CREATE INDEX IF NOT EXISTS teaching_assets_asset_type_idx ON public.teaching_assets (asset_type, created_at DESC);
CREATE INDEX IF NOT EXISTS teaching_assets_search_idx ON public.teaching_assets USING GIN (to_tsvector('english', coalesce(title,'')||' '||coalesce(description,'')||' '||coalesce(content_text,'')));

CREATE OR REPLACE FUNCTION public.search_teaching_assets(q text, max_rows int DEFAULT 5)
RETURNS TABLE (id uuid, title text, description text, asset_type text, excerpt text, rank real)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.title, a.description, a.asset_type,
    substring(coalesce(a.content_text,''),1,2000) AS excerpt,
    ts_rank(to_tsvector('english', coalesce(a.title,'')||' '||coalesce(a.description,'')||' '||coalesce(a.content_text,'')), websearch_to_tsquery('english', q)) AS rank
  FROM public.teaching_assets a
  WHERE q IS NOT NULL AND length(btrim(q))>0
    AND to_tsvector('english', coalesce(a.title,'')||' '||coalesce(a.description,'')||' '||coalesce(a.content_text,'')) @@ websearch_to_tsquery('english', q)
  ORDER BY rank DESC LIMIT greatest(1, least(max_rows,20));
$$;
REVOKE ALL ON FUNCTION public.search_teaching_assets(text,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_teaching_assets(text,int) TO authenticated, service_role;

-- TA interactions
CREATE TABLE IF NOT EXISTS public.ta_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','assistant')),
  message text NOT NULL,
  draft_content jsonb,
  draft_status text CHECK (draft_status IS NULL OR draft_status IN ('pending','approved','rejected')),
  asset_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ta_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read TA interactions" ON public.ta_interactions;
CREATE POLICY "Admins read TA interactions" ON public.ta_interactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins insert TA interactions" ON public.ta_interactions;
CREATE POLICY "Admins insert TA interactions" ON public.ta_interactions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins update TA interactions" ON public.ta_interactions;
CREATE POLICY "Admins update TA interactions" ON public.ta_interactions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins delete TA interactions" ON public.ta_interactions;
CREATE POLICY "Admins delete TA interactions" ON public.ta_interactions FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS ta_interactions_student_created_idx ON public.ta_interactions (student_id, created_at DESC);
ALTER TABLE public.ta_interactions REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='ta_interactions') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ta_interactions';
  END IF;
END $$;

-- TA assignments
CREATE TABLE IF NOT EXISTS public.ta_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_id uuid REFERENCES public.ta_interactions(id) ON DELETE SET NULL,
  title text NOT NULL,
  content_html text NOT NULL,
  asset_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  pdf_url text,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','viewed','completed')),
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ta_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students read own TA assignments" ON public.ta_assignments;
CREATE POLICY "Students read own TA assignments" ON public.ta_assignments FOR SELECT TO authenticated USING (student_id=auth.uid());
DROP POLICY IF EXISTS "Students update own TA assignments" ON public.ta_assignments;
CREATE POLICY "Students update own TA assignments" ON public.ta_assignments FOR UPDATE TO authenticated USING (student_id=auth.uid()) WITH CHECK (student_id=auth.uid());
DROP POLICY IF EXISTS "Admins read all TA assignments" ON public.ta_assignments;
CREATE POLICY "Admins read all TA assignments" ON public.ta_assignments FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins insert TA assignments" ON public.ta_assignments;
CREATE POLICY "Admins insert TA assignments" ON public.ta_assignments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND assigned_by=auth.uid());
DROP POLICY IF EXISTS "Admins update TA assignments" ON public.ta_assignments;
CREATE POLICY "Admins update TA assignments" ON public.ta_assignments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins delete TA assignments" ON public.ta_assignments;
CREATE POLICY "Admins delete TA assignments" ON public.ta_assignments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.guard_ta_assignment_immutables() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  IF NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.interaction_id IS DISTINCT FROM OLD.interaction_id
     OR NEW.title IS DISTINCT FROM OLD.title OR NEW.content_html IS DISTINCT FROM OLD.content_html
     OR NEW.asset_ids IS DISTINCT FROM OLD.asset_ids OR NEW.pdf_url IS DISTINCT FROM OLD.pdf_url
     OR NEW.assigned_by IS DISTINCT FROM OLD.assigned_by OR NEW.assigned_at IS DISTINCT FROM OLD.assigned_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'ta_assignments: snapshot columns are immutable for non-admin users';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS ta_assignments_guard_immutables ON public.ta_assignments;
CREATE TRIGGER ta_assignments_guard_immutables BEFORE UPDATE ON public.ta_assignments FOR EACH ROW EXECUTE FUNCTION public.guard_ta_assignment_immutables();
CREATE INDEX IF NOT EXISTS ta_assignments_student_status_idx ON public.ta_assignments (student_id, status, assigned_at DESC);

-- student_context
CREATE TABLE IF NOT EXISTS public.student_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type text NOT NULL CHECK (context_type IN ('file','screenshot','transcript','note','external_score')),
  title text NOT NULL,
  content_text text,
  file_path text,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_context ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read student context" ON public.student_context;
CREATE POLICY "Admins read student context" ON public.student_context FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins insert student context" ON public.student_context;
CREATE POLICY "Admins insert student context" ON public.student_context FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND created_by=auth.uid());
DROP POLICY IF EXISTS "Admins update student context" ON public.student_context;
CREATE POLICY "Admins update student context" ON public.student_context FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins delete student context" ON public.student_context;
CREATE POLICY "Admins delete student context" ON public.student_context FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS student_context_student_idx ON public.student_context (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS student_context_type_idx ON public.student_context (student_id, context_type, created_at DESC);

-- student_sessions
CREATE TABLE IF NOT EXISTS public.student_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  duration_minutes int,
  transcript_id uuid REFERENCES public.student_context(id) ON DELETE SET NULL,
  notes text,
  source text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read student sessions" ON public.student_sessions;
CREATE POLICY "Admins read student sessions" ON public.student_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins insert student sessions" ON public.student_sessions;
CREATE POLICY "Admins insert student sessions" ON public.student_sessions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND created_by=auth.uid());
DROP POLICY IF EXISTS "Admins update student sessions" ON public.student_sessions;
CREATE POLICY "Admins update student sessions" ON public.student_sessions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins delete student sessions" ON public.student_sessions;
CREATE POLICY "Admins delete student sessions" ON public.student_sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.bump_student_sessions_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at:=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS student_sessions_updated_at ON public.student_sessions;
CREATE TRIGGER student_sessions_updated_at BEFORE UPDATE ON public.student_sessions FOR EACH ROW EXECUTE FUNCTION public.bump_student_sessions_updated_at();
CREATE INDEX IF NOT EXISTS student_sessions_student_idx ON public.student_sessions (student_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS student_sessions_upcoming_idx ON public.student_sessions (student_id, scheduled_at) WHERE status='scheduled';

-- ai_ta_drafts
CREATE TABLE IF NOT EXISTS public.ai_ta_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid,
  created_by uuid NOT NULL,
  draft_type text NOT NULL CHECK (draft_type IN ('weekly_plan','next_assignment','session_recap','next_session_plan','classroom_update_bundle','message')),
  prompt text,
  input_snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft_json jsonb,
  draft_markdown text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','rejected','posted')),
  approved_by uuid,
  approved_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_ta_drafts_student_idx ON public.ai_ta_drafts (student_id, status, created_at DESC);
CREATE OR REPLACE FUNCTION public.touch_ai_ta_drafts_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at:=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS ai_ta_drafts_touch ON public.ai_ta_drafts;
CREATE TRIGGER ai_ta_drafts_touch BEFORE UPDATE ON public.ai_ta_drafts FOR EACH ROW EXECUTE FUNCTION public.touch_ai_ta_drafts_updated_at();
ALTER TABLE public.ai_ta_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_ta_drafts_admin_all ON public.ai_ta_drafts;
CREATE POLICY ai_ta_drafts_admin_all ON public.ai_ta_drafts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('teaching-assets','teaching-assets',false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('student-context','student-context',false) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins read teaching asset files" ON storage.objects;
CREATE POLICY "Admins read teaching asset files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='teaching-assets' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins upload teaching asset files" ON storage.objects;
CREATE POLICY "Admins upload teaching asset files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='teaching-assets' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins update teaching asset files" ON storage.objects;
CREATE POLICY "Admins update teaching asset files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='teaching-assets' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins delete teaching asset files" ON storage.objects;
CREATE POLICY "Admins delete teaching asset files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='teaching-assets' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins read student context files" ON storage.objects;
CREATE POLICY "Admins read student context files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='student-context' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins upload student context files" ON storage.objects;
CREATE POLICY "Admins upload student context files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='student-context' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins update student context files" ON storage.objects;
CREATE POLICY "Admins update student context files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='student-context' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins delete student context files" ON storage.objects;
CREATE POLICY "Admins delete student context files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='student-context' AND public.has_role(auth.uid(),'admin'));

-- Shorten admin display_name to first token
UPDATE public.profiles
SET display_name = SPLIT_PART(display_name, ' ', 1)
WHERE class_id IN (SELECT user_id::text FROM public.user_roles WHERE role='admin')
  AND display_name IS NOT NULL AND display_name LIKE '% %';