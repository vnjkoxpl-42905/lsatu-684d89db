-- "Revoke All Access" has to land while the student is still signed in.
-- useUserPermissions caches the flags client-side; it now subscribes to the
-- student's own profiles row and refetches on UPDATE, which needs the table in
-- the realtime publication. RLS still applies to the stream, so a student only
-- ever sees changes to their own row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- has_activity_access was added after guard_profile_admin_fields() was written,
-- so it was the one flag a student could flip on their own row through the
-- "Students can update own profile" policy. Close it.
CREATE OR REPLACE FUNCTION public.guard_profile_admin_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.has_bootcamp_access  IS DISTINCT FROM OLD.has_bootcamp_access  OR
     NEW.has_classroom_access IS DISTINCT FROM OLD.has_classroom_access OR
     NEW.has_analytics_access IS DISTINCT FROM OLD.has_analytics_access OR
     NEW.has_schedule_access  IS DISTINCT FROM OLD.has_schedule_access  OR
     NEW.has_practice_access  IS DISTINCT FROM OLD.has_practice_access  OR
     NEW.has_drill_access     IS DISTINCT FROM OLD.has_drill_access     OR
     NEW.has_waj_access       IS DISTINCT FROM OLD.has_waj_access       OR
     NEW.has_journal_access   IS DISTINCT FROM OLD.has_journal_access   OR
     NEW.has_flagged_access   IS DISTINCT FROM OLD.has_flagged_access   OR
     NEW.has_chat_access      IS DISTINCT FROM OLD.has_chat_access      OR
     NEW.has_export_access    IS DISTINCT FROM OLD.has_export_access    OR
     NEW.has_ta_access        IS DISTINCT FROM OLD.has_ta_access        OR
     NEW.has_activity_access  IS DISTINCT FROM OLD.has_activity_access  OR
     NEW.proficiency_level    IS DISTINCT FROM OLD.proficiency_level    OR
     NEW.class_id             IS DISTINCT FROM OLD.class_id             THEN
    RAISE EXCEPTION 'profiles: access flags, proficiency_level and class_id are admin-controlled';
  END IF;

  RETURN NEW;
END;
$function$;
