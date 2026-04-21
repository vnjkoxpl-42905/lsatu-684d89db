-- Homework Phase A: per-student snapshotted assignments.
-- Rows are created at assign time by admins with question_qids/title/description
-- snapshotted from the parent homework_sets row. Later edits to the set do not
-- mutate already-issued assignments. If the set is deleted, the assignment
-- keeps its snapshot (set_id goes NULL) so the student can still drill it.

CREATE TABLE IF NOT EXISTS public.homework_assignments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id            uuid REFERENCES public.homework_sets(id) ON DELETE SET NULL,
  student_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_qids     text[] NOT NULL,
  set_title         text NOT NULL,
  set_description   text,
  status            text NOT NULL DEFAULT 'assigned'
                    CHECK (status IN ('assigned', 'in_progress', 'completed')),
  started_at        timestamptz,
  completed_at      timestamptz,
  score             numeric CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  assigned_by       uuid NOT NULL REFERENCES auth.users(id),
  class_id          uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;

-- Students: read + update own rows. Immutability of snapshot fields enforced
-- by trigger (guard_homework_assignment_immutables) below.
CREATE POLICY "Students read own assignments"
  ON public.homework_assignments FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students update own assignments"
  ON public.homework_assignments FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Admin full CRUD (bypasses the immutability trigger via role check).
CREATE POLICY "Admins read all assignments"
  ON public.homework_assignments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert assignments"
  ON public.homework_assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND assigned_by = auth.uid());

CREATE POLICY "Admins update assignments"
  ON public.homework_assignments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete assignments"
  ON public.homework_assignments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Immutability guard: students cannot mutate snapshot or attribution columns.
-- Allowed student writes: status, started_at, completed_at, score.
CREATE OR REPLACE FUNCTION public.guard_homework_assignment_immutables()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.set_id           IS DISTINCT FROM OLD.set_id           OR
     NEW.student_id       IS DISTINCT FROM OLD.student_id       OR
     NEW.question_qids    IS DISTINCT FROM OLD.question_qids    OR
     NEW.set_title        IS DISTINCT FROM OLD.set_title        OR
     NEW.set_description  IS DISTINCT FROM OLD.set_description  OR
     NEW.assigned_by      IS DISTINCT FROM OLD.assigned_by      OR
     NEW.class_id         IS DISTINCT FROM OLD.class_id         OR
     NEW.created_at       IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'homework_assignments: snapshot columns are immutable for non-admin users';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS homework_assignments_guard_immutables ON public.homework_assignments;
CREATE TRIGGER homework_assignments_guard_immutables
  BEFORE UPDATE ON public.homework_assignments
  FOR EACH ROW EXECUTE FUNCTION public.guard_homework_assignment_immutables();

-- Index for student Classroom queries: scan by student, filter by status.
CREATE INDEX IF NOT EXISTS homework_assignments_student_status_idx
  ON public.homework_assignments (student_id, status, created_at DESC);

-- At most one active assignment per (student, set). A completed assignment
-- does not block re-issuing the same set.
CREATE UNIQUE INDEX IF NOT EXISTS homework_assignments_active_unique
  ON public.homework_assignments (student_id, set_id)
  WHERE status <> 'completed' AND set_id IS NOT NULL;
