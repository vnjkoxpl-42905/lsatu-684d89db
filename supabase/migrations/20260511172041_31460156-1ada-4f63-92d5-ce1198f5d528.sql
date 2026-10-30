-- Attach the existing guard function as a trigger so student updates cannot
-- mutate admin-controlled snapshot columns on homework_assignments.
DROP TRIGGER IF EXISTS guard_homework_assignment_immutables_trg ON public.homework_assignments;
CREATE TRIGGER guard_homework_assignment_immutables_trg
BEFORE UPDATE ON public.homework_assignments
FOR EACH ROW
EXECUTE FUNCTION public.guard_homework_assignment_immutables();