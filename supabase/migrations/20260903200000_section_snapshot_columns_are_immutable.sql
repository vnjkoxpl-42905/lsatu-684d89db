-- The three snapshot columns section mode added, and never guarded.
--
-- `guard_activity_assignment_immutables` has protected the assignment's
-- snapshot since June: a student holds UPDATE on her own row so she can move
-- `status` and the timestamps, and everything that decides what the run IS is
-- refused. `items` is in that list, which is why the Details her Coverage is
-- scored against were never hers to write.
--
-- Section mode added three more columns of exactly that kind and did not add
-- them to the list.
--
--   mode              picks the player, and therefore which grader path runs
--   source_section    which section the run is of, carried onto the grade
--   time_goal_minutes the clock -- the grader reads it to decide `within_goal`
--
-- The last one is the sharp end. The accommodation was moved to an
-- admin-writable profile column two days ago precisely so a student could not
-- choose the goal she is measured against; leaving the goal itself writable on
-- her own row left the same door open one step further along. A passing time
-- she can set is not a passing time.
--
-- This is deliberately narrower than ADR 0019, which scoped `score`, `status`
-- and `completed_at` OUT of the guard on the reasoning that the student's
-- client legitimately writes them and nothing trustworthy is derived from them.
-- These three are the opposite case: no client path writes any of them, and the
-- grade genuinely is derived from them.

CREATE OR REPLACE FUNCTION public.guard_activity_assignment_immutables()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.activity_id       IS DISTINCT FROM OLD.activity_id       OR
     NEW.student_id        IS DISTINCT FROM OLD.student_id        OR
     NEW.title             IS DISTINCT FROM OLD.title             OR
     NEW.subtitle          IS DISTINCT FROM OLD.subtitle          OR
     NEW.instructions      IS DISTINCT FROM OLD.instructions      OR
     NEW.item_format       IS DISTINCT FROM OLD.item_format       OR
     NEW.items             IS DISTINCT FROM OLD.items             OR
     NEW.assigned_by       IS DISTINCT FROM OLD.assigned_by       OR
     NEW.class_id          IS DISTINCT FROM OLD.class_id          OR
     NEW.mode              IS DISTINCT FROM OLD.mode              OR
     NEW.source_section    IS DISTINCT FROM OLD.source_section    OR
     NEW.time_goal_minutes IS DISTINCT FROM OLD.time_goal_minutes OR
     NEW.created_at        IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'activity_assignments: snapshot columns are immutable for non-admin users';
  END IF;

  RETURN NEW;
END;
$$;

-- The trigger already points at this function by name and is not recreated.
