-- Guard: prevent non-admin students from mutating admin-controlled access flags
-- on their own profile. Students may still update display_name, has_seen_tour,
-- daily_goal_questions, etc.
CREATE OR REPLACE FUNCTION public.guard_profile_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.has_bootcamp_access  IS DISTINCT FROM OLD.has_bootcamp_access  OR
     NEW.has_classroom_access IS DISTINCT FROM OLD.has_classroom_access OR
     NEW.has_analytics_access IS DISTINCT FROM OLD.has_analytics_access OR
     NEW.has_practice_access  IS DISTINCT FROM OLD.has_practice_access  OR
     NEW.has_drill_access     IS DISTINCT FROM OLD.has_drill_access     OR
     NEW.has_waj_access       IS DISTINCT FROM OLD.has_waj_access       OR
     NEW.has_flagged_access   IS DISTINCT FROM OLD.has_flagged_access   OR
     NEW.has_chat_access      IS DISTINCT FROM OLD.has_chat_access      OR
     NEW.has_export_access    IS DISTINCT FROM OLD.has_export_access    OR
     NEW.has_ta_access        IS DISTINCT FROM OLD.has_ta_access        OR
     NEW.class_id             IS DISTINCT FROM OLD.class_id             THEN
    RAISE EXCEPTION 'profiles: access flags and class_id are admin-controlled';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_admin_fields_trg ON public.profiles;
CREATE TRIGGER guard_profile_admin_fields_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_admin_fields();

REVOKE EXECUTE ON FUNCTION public.guard_profile_admin_fields() FROM PUBLIC, anon, authenticated;