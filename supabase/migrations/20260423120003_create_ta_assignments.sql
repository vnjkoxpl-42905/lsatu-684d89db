-- AI Teaching Assistant Phase 3: approved assignments delivered to students.
-- Phase-5-ready: student row-read + limited update (status/viewed/completed)
-- are allowed now so the classroom page plugs in without touching RLS. Snapshot
-- fields (title, content_html, asset_ids, student_id, assigned_by) are
-- immutable for students via guard_ta_assignment_immutables().

CREATE TABLE IF NOT EXISTS public.ta_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_id  uuid REFERENCES public.ta_interactions(id) ON DELETE SET NULL,
  title           text NOT NULL,
  content_html    text NOT NULL,
  asset_ids       uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  pdf_url         text,
  status          text NOT NULL DEFAULT 'assigned'
                  CHECK (status IN ('assigned','viewed','completed')),
  assigned_by     uuid NOT NULL REFERENCES auth.users(id),
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  viewed_at       timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ta_assignments ENABLE ROW LEVEL SECURITY;

-- Students: read + limited update on own rows. Immutability of snapshot
-- columns enforced by trigger below.
CREATE POLICY "Students read own TA assignments"
  ON public.ta_assignments FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students update own TA assignments"
  ON public.ta_assignments FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Admin full CRUD.
CREATE POLICY "Admins read all TA assignments"
  ON public.ta_assignments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert TA assignments"
  ON public.ta_assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND assigned_by = auth.uid());

CREATE POLICY "Admins update TA assignments"
  ON public.ta_assignments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete TA assignments"
  ON public.ta_assignments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Immutability guard: students may only touch status, viewed_at, completed_at.
CREATE OR REPLACE FUNCTION public.guard_ta_assignment_immutables()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.student_id      IS DISTINCT FROM OLD.student_id      OR
     NEW.interaction_id  IS DISTINCT FROM OLD.interaction_id  OR
     NEW.title           IS DISTINCT FROM OLD.title           OR
     NEW.content_html    IS DISTINCT FROM OLD.content_html    OR
     NEW.asset_ids       IS DISTINCT FROM OLD.asset_ids       OR
     NEW.pdf_url         IS DISTINCT FROM OLD.pdf_url         OR
     NEW.assigned_by     IS DISTINCT FROM OLD.assigned_by     OR
     NEW.assigned_at     IS DISTINCT FROM OLD.assigned_at     OR
     NEW.created_at      IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'ta_assignments: snapshot columns are immutable for non-admin users';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ta_assignments_guard_immutables ON public.ta_assignments;
CREATE TRIGGER ta_assignments_guard_immutables
  BEFORE UPDATE ON public.ta_assignments
  FOR EACH ROW EXECUTE FUNCTION public.guard_ta_assignment_immutables();

-- Scan pattern: classroom loads one student's active assignments.
CREATE INDEX IF NOT EXISTS ta_assignments_student_status_idx
  ON public.ta_assignments (student_id, status, assigned_at DESC);
