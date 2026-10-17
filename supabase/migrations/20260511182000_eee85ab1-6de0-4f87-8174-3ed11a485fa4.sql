
CREATE OR REPLACE FUNCTION public.guard_guided_drill_assignment_immutables()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.guided_drill_id    IS DISTINCT FROM OLD.guided_drill_id    OR
     NEW.student_id         IS DISTINCT FROM OLD.student_id         OR
     NEW.class_id           IS DISTINCT FROM OLD.class_id           OR
     NEW.assigned_by        IS DISTINCT FROM OLD.assigned_by        OR
     NEW.assigned_at        IS DISTINCT FROM OLD.assigned_at        OR
     NEW.scheduled_for      IS DISTINCT FROM OLD.scheduled_for      OR
     NEW.unlock_at          IS DISTINCT FROM OLD.unlock_at          OR
     NEW.attempt_session_id IS DISTINCT FROM OLD.attempt_session_id OR
     NEW.created_at         IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'guided_drill_assignments: only progress fields (status, started_at, completed_at, read_card_at) are mutable for students';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_guided_drill_assignment_immutables() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guided_drill_assignments_guard_immutables ON public.guided_drill_assignments;
CREATE TRIGGER guided_drill_assignments_guard_immutables
BEFORE UPDATE ON public.guided_drill_assignments
FOR EACH ROW EXECUTE FUNCTION public.guard_guided_drill_assignment_immutables();
