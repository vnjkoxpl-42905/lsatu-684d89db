-- Activity Centre Phase 1: per-student snapshotted assignments.
-- Created at assign time by admins with title/subtitle/instructions/items
-- snapshotted from the parent activities row. Later edits to the activity do
-- not mutate already-issued assignments. If the activity is deleted, the
-- assignment keeps its snapshot (activity_id goes NULL) so the student can
-- still work it. Mirrors homework_assignments exactly.

CREATE TABLE IF NOT EXISTS public.activity_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id   uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  student_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL,
  subtitle      text,
  instructions  jsonb NOT NULL DEFAULT '{}'::jsonb,
  item_format   text NOT NULL DEFAULT 'free-text',
  items         jsonb NOT NULL DEFAULT '[]'::jsonb,
  status        text NOT NULL DEFAULT 'assigned'
                CHECK (status IN ('assigned', 'in_progress', 'completed')),
  score         numeric CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  started_at    timestamptz,
  completed_at  timestamptz,
  assigned_by   uuid NOT NULL REFERENCES auth.users(id),
  class_id      uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_assignments ENABLE ROW LEVEL SECURITY;

-- Students: read + update own rows. Snapshot immutability enforced by trigger.
CREATE POLICY "Students read own activity assignments"
  ON public.activity_assignments FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students update own activity assignments"
  ON public.activity_assignments FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Admin full CRUD.
CREATE POLICY "Admins read all activity assignments"
  ON public.activity_assignments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert activity assignments"
  ON public.activity_assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND assigned_by = auth.uid());

CREATE POLICY "Admins update activity assignments"
  ON public.activity_assignments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete activity assignments"
  ON public.activity_assignments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Immutability guard: students cannot mutate snapshot or attribution columns.
-- Allowed student writes: status, score, started_at, completed_at.
CREATE OR REPLACE FUNCTION public.guard_activity_assignment_immutables()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.activity_id   IS DISTINCT FROM OLD.activity_id   OR
     NEW.student_id    IS DISTINCT FROM OLD.student_id    OR
     NEW.title         IS DISTINCT FROM OLD.title         OR
     NEW.subtitle      IS DISTINCT FROM OLD.subtitle      OR
     NEW.instructions  IS DISTINCT FROM OLD.instructions  OR
     NEW.item_format   IS DISTINCT FROM OLD.item_format   OR
     NEW.items         IS DISTINCT FROM OLD.items         OR
     NEW.assigned_by   IS DISTINCT FROM OLD.assigned_by   OR
     NEW.class_id      IS DISTINCT FROM OLD.class_id      OR
     NEW.created_at    IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'activity_assignments: snapshot columns are immutable for non-admin users';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activity_assignments_guard_immutables ON public.activity_assignments;
CREATE TRIGGER activity_assignments_guard_immutables
  BEFORE UPDATE ON public.activity_assignments
  FOR EACH ROW EXECUTE FUNCTION public.guard_activity_assignment_immutables();

-- Index for student Classroom queries: scan by student, filter by status.
CREATE INDEX IF NOT EXISTS activity_assignments_student_status_idx
  ON public.activity_assignments (student_id, status, created_at DESC);

-- At most one active assignment per (student, activity). A completed assignment
-- does not block re-issuing the same activity.
CREATE UNIQUE INDEX IF NOT EXISTS activity_assignments_active_unique
  ON public.activity_assignments (student_id, activity_id)
  WHERE status <> 'completed' AND activity_id IS NOT NULL;
