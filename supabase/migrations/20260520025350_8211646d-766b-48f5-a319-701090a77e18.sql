CREATE OR REPLACE FUNCTION public.guard_profile_admin_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Service role (no auth.uid) bypasses guard; admins also bypass.
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
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
$function$;