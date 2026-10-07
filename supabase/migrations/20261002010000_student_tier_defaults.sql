-- New defaults apply only on a deliberate tier selection or access write.
-- No UPDATE of existing student rows: their independent access is preserved.
-- Tier 2 has fixed defaults and continues to hold persistent custom overrides.
-- New undecided accounts start with Messages and Schedule only.
ALTER TABLE public.profiles ALTER COLUMN has_classroom_access SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.profiles_access_tier_drift()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  practice boolean;
BEGIN
  -- Archive/unarchive remembers the tier without reopening any access.
  IF NEW.archived_at IS NOT NULL OR NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    RETURN NEW;
  END IF;

  IF NEW.access_tier IS DISTINCT FROM OLD.access_tier AND NEW.access_tier IS NOT NULL THEN
    NEW.has_drill_access := NEW.access_tier = 'tier_1';
    NEW.has_practice_access := NEW.access_tier = 'tier_1';
    NEW.has_classroom_access := NEW.access_tier IN ('tier_1', 'tier_2');
    NEW.has_chat_access := true;
    NEW.has_schedule_access := true;
  ELSIF NOT (
    NEW.has_drill_access IS DISTINCT FROM OLD.has_drill_access OR
    NEW.has_practice_access IS DISTINCT FROM OLD.has_practice_access OR
    NEW.has_classroom_access IS DISTINCT FROM OLD.has_classroom_access OR
    NEW.has_chat_access IS DISTINCT FROM OLD.has_chat_access OR
    NEW.has_schedule_access IS DISTINCT FROM OLD.has_schedule_access OR
    NEW.has_journal_access IS DISTINCT FROM OLD.has_journal_access OR
    NEW.has_flagged_access IS DISTINCT FROM OLD.has_flagged_access OR
    NEW.has_analytics_access IS DISTINCT FROM OLD.has_analytics_access OR
    NEW.has_activity_access IS DISTINCT FROM OLD.has_activity_access OR
    NEW.has_bootcamp_access IS DISTINCT FROM OLD.has_bootcamp_access OR
    NEW.has_ta_access IS DISTINCT FROM OLD.has_ta_access OR
    NEW.has_export_access IS DISTINCT FROM OLD.has_export_access OR
    NEW.has_waj_access IS DISTINCT FROM OLD.has_waj_access
  ) THEN
    -- Presence and other profile edits must not change access.
    RETURN NEW;
  END IF;

  practice := COALESCE(NEW.has_drill_access, false) OR COALESCE(NEW.has_practice_access, false);
  NEW.has_journal_access := practice;
  NEW.has_flagged_access := practice;
  NEW.has_analytics_access := practice;
  NEW.has_waj_access := false;
  NEW.has_activity_access := false;
  NEW.has_bootcamp_access := false;
  NEW.has_ta_access := false;
  NEW.has_export_access := false;
  IF NEW.access_tier = 'tier_1' AND NOT (
    NEW.has_drill_access AND NEW.has_practice_access AND NEW.has_classroom_access AND
    NEW.has_chat_access AND NEW.has_schedule_access
  ) THEN
    NEW.access_tier := 'tier_2';
  ELSIF NEW.access_tier = 'tier_3' AND (
    NEW.has_drill_access OR NEW.has_practice_access OR NEW.has_classroom_access OR
    NOT NEW.has_chat_access OR NOT NEW.has_schedule_access
  ) THEN
    NEW.access_tier := 'tier_2';
  END IF;
  RETURN NEW;
END;
$function$;

COMMENT ON COLUMN public.profiles.access_tier IS
  'Access preset or custom Tier 2 switches. Tier 1: all five controls. Tier 2 defaults: Classroom, Messages, Schedule. Tier 3: Messages, Schedule. Review follows Drill or Practice tests; activities and bootcamps are assigned per item.';
