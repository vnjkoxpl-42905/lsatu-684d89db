-- Assignable practice tests (access tiers, stage 7).
--
-- A practice test here is the full sitting of one PrepTest. Assigning PT 140 to
-- a student opens that one sitting and nothing else: the Testing Centre lists
-- only their assigned PrepTests unless they have the Practice tests switch.

CREATE TABLE IF NOT EXISTS public.practice_test_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pt          integer NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unlock_at   timestamptz,
  status      text NOT NULL DEFAULT 'assigned'
              CHECK (status IN ('assigned', 'completed', 'archived')),
  UNIQUE (student_id, pt)
);

CREATE INDEX IF NOT EXISTS practice_test_assignments_student_idx
  ON public.practice_test_assignments (student_id);

ALTER TABLE public.practice_test_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage practice test assignments" ON public.practice_test_assignments;
CREATE POLICY "Admins manage practice test assignments"
  ON public.practice_test_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Students read own practice test assignments" ON public.practice_test_assignments;
CREATE POLICY "Students read own practice test assignments"
  ON public.practice_test_assignments FOR SELECT
  USING (
    student_id = auth.uid()
    AND status <> 'archived'
    AND (unlock_at IS NULL OR unlock_at <= now())
  );

-- True when this user may start a sitting of this PrepTest: the Practice tests
-- switch, an admin, or a live assignment for exactly this PT.
CREATE OR REPLACE FUNCTION public.can_sit_practice_test(_user uuid, _pt integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(_user, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE class_id = _user::text AND has_practice_access
    )
    OR EXISTS (
      SELECT 1 FROM public.practice_test_assignments
      WHERE student_id = _user AND pt = _pt AND status <> 'archived'
        AND (unlock_at IS NULL OR unlock_at <= now())
    );
$function$;

-- The API cannot be used to start a sitting the student was not given.
DROP POLICY IF EXISTS pt_runs_owner_insert ON public.practice_test_runs;
CREATE POLICY pt_runs_owner_insert
  ON public.practice_test_runs FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.can_sit_practice_test(auth.uid(), pt));

-- An assigned sitting shows on Assigned work like everything else.
ALTER TABLE public.classroom_items DROP CONSTRAINT IF EXISTS classroom_items_type_check;
ALTER TABLE public.classroom_items ADD CONSTRAINT classroom_items_type_check
  CHECK (type = ANY (ARRAY['drill', 'homework', 'bootcamp_module', 'note', 'session_recap',
    'announcement', 'upload_summary', 'weekly_plan_task', 'smartboard_recap', 'activity',
    'practice_test']));

-- Explicit, though the schema's default privileges already grant these. RLS
-- above decides which rows each role actually sees.
GRANT SELECT ON public.practice_test_assignments TO authenticated;
GRANT ALL ON public.practice_test_assignments TO service_role;
