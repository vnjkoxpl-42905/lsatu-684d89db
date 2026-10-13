-- Classroom access is no longer a per-student permission managed from the
-- People page. Every student needs to reach /classroom to see the bootcamps
-- assigned to them; bootcamp visibility itself is controlled by classroom_items
-- assignments and enforced by BootcampGate, not by a global flag.
--
-- The column default is already true (see 20260416015637), so new students are
-- covered. This backfills any existing student whose classroom access was
-- revoked under the old broad-permission model.
UPDATE public.profiles
SET has_classroom_access = true
WHERE has_classroom_access = false;
