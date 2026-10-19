-- Activity Centre: let Activities surface in the student Classroom feed.
--
-- classroom_items.type was created with a CHECK that predates the Activity
-- Centre, so inserting an 'activity' row fails. The route resolver and the
-- ClassroomItemType union already know about 'activity'; this aligns the DB.
-- We drop the auto-named original CHECK and recreate it with the full set
-- (the ClassroomItemType union in src/hooks/useClassroomItems.ts), adding
-- 'activity'. No existing rows use a value outside this set, so nothing is
-- invalidated.

ALTER TABLE public.classroom_items
  DROP CONSTRAINT IF EXISTS classroom_items_type_check;

ALTER TABLE public.classroom_items
  ADD CONSTRAINT classroom_items_type_check CHECK (type IN (
    'drill',
    'homework',
    'activity',
    'bootcamp_module',
    'note',
    'session_recap',
    'announcement',
    'upload_summary',
    'weekly_plan_task',
    'smartboard_recap'
  ));
