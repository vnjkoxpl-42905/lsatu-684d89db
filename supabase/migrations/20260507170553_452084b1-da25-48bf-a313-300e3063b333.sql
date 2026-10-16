
-- Catalog
CREATE TABLE public.guided_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  week integer NOT NULL,
  order_in_week integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  category text,
  estimated_minutes integer,
  question_count integer,
  difficulty_min integer,
  difficulty_max integer,
  question_types text[] NOT NULL DEFAULT '{}',
  question_features text[] NOT NULL DEFAULT '{}',
  reasoning_types text[] NOT NULL DEFAULT '{}',
  start_button_label text DEFAULT 'Start',
  instruction_card jsonb NOT NULL DEFAULT '{}'::jsonb,
  bank_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_file text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guided_drills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage guided drills"
ON public.guided_drills FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_guided_drills_week ON public.guided_drills(week, order_in_week);

CREATE TRIGGER trg_guided_drills_updated
BEFORE UPDATE ON public.guided_drills
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Assignments
CREATE TABLE public.guided_drill_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guided_drill_id uuid NOT NULL REFERENCES public.guided_drills(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  class_id text NOT NULL,
  assigned_by uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for date,
  unlock_at timestamptz,
  status text NOT NULL DEFAULT 'assigned',
  read_card_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  attempt_session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guided_drill_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all assignments"
ON public.guided_drill_assignments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students read own assignments"
ON public.guided_drill_assignments FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Students update own assignments"
ON public.guided_drill_assignments FOR UPDATE TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE INDEX idx_gda_student ON public.guided_drill_assignments(student_id, scheduled_for);
CREATE INDEX idx_gda_drill ON public.guided_drill_assignments(guided_drill_id);

CREATE TRIGGER trg_gda_updated
BEFORE UPDATE ON public.guided_drill_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
