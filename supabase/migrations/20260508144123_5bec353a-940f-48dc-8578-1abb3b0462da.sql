
-- smartboard_sessions
CREATE TABLE IF NOT EXISTS public.smartboard_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL DEFAULT 'Smartboard session',
  excalidraw_scene_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  preview_image_path text,
  export_pdf_path text,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  posted_to_classroom boolean NOT NULL DEFAULT false,
  linked_recap_item_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.smartboard_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage smartboard sessions"
  ON public.smartboard_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Students view own smartboard sessions"
  ON public.smartboard_sessions FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE TRIGGER trg_smartboard_updated_at
  BEFORE UPDATE ON public.smartboard_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- weekly_plans
CREATE TABLE IF NOT EXISTS public.weekly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  ai_generated boolean NOT NULL DEFAULT false,
  rationale text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage weekly plans"
  ON public.weekly_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Students view own published weekly plans"
  ON public.weekly_plans FOR SELECT TO authenticated
  USING (student_id = auth.uid() AND status = 'published');
CREATE TRIGGER trg_weekly_plans_updated_at
  BEFORE UPDATE ON public.weekly_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- weekly_plan_items
CREATE TABLE IF NOT EXISTS public.weekly_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_plan_id uuid NOT NULL REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  classroom_item_id uuid,
  day_date date NOT NULL,
  title text NOT NULL,
  instructions text,
  estimated_minutes integer,
  unlock_at timestamptz,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'assigned',
  sort_order integer NOT NULL DEFAULT 0,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.weekly_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage weekly plan items"
  ON public.weekly_plan_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Students view items in own published plans"
  ON public.weekly_plan_items FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.weekly_plans p
      WHERE p.id = weekly_plan_items.weekly_plan_id AND p.status = 'published'
    )
  );

-- RPC: assignment counts per student
CREATE OR REPLACE FUNCTION public.get_assignment_counts_per_student()
RETURNS TABLE(student_id uuid, assigned int, viewed int, completed int, total int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    a.student_id,
    COUNT(*) FILTER (WHERE a.status = 'assigned')::int  AS assigned,
    COUNT(*) FILTER (WHERE a.status = 'viewed')::int    AS viewed,
    COUNT(*) FILTER (WHERE a.status = 'completed')::int AS completed,
    COUNT(*)::int                                       AS total
  FROM public.homework_assignments a
  WHERE public.has_role(auth.uid(),'admin')
  GROUP BY a.student_id;
$$;

-- RPC: student email lookup (admin only)
CREATE OR REPLACE FUNCTION public.get_student_email(_student_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.email::text
  FROM auth.users u
  WHERE u.id = _student_id
    AND public.has_role(auth.uid(),'admin');
$$;
