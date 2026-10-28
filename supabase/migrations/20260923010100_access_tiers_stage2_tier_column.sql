-- Access tiers, stage 2: the tier label.
--
-- A tier is a template. It sets the twelve switches; the switches stay what the
-- app checks. access_tier only names which template the switches currently
-- match, so the People page can say "Tier 1" without re-deriving it.
--
--   NULL    undecided: sits in the signup queue, floor access only
--   tier_1  all twelve switches on
--   tier_2  hand-picked switches
--   tier_3  the floor (Classroom, Messages, Schedule) plus assigned work

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_tier text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_access_tier_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_access_tier_check
  CHECK (access_tier IS NULL OR access_tier IN ('tier_1', 'tier_2', 'tier_3'));

COMMENT ON COLUMN public.profiles.access_tier IS
  'Access template the switches match. NULL = undecided (signup queue). Label only: the has_*_access switches are what the app enforces.';

-- The tier is an admin act, like the switches it names.
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
     NEW.access_tier          IS DISTINCT FROM OLD.access_tier          OR
     NEW.archived_at          IS DISTINCT FROM OLD.archived_at          OR
     NEW.archived_reason      IS DISTINCT FROM OLD.archived_reason      OR
     NEW.proficiency_level    IS DISTINCT FROM OLD.proficiency_level    OR
     NEW.class_id             IS DISTINCT FROM OLD.class_id             THEN
    RAISE EXCEPTION 'profiles: access flags, access tier, archive state, proficiency_level and class_id are admin-controlled';
  END IF;

  RETURN NEW;
END;
$function$;

-- Drift: a Tier 1 or Tier 3 label only holds while the switches match it.
-- Flip one switch away from the template and the label becomes Tier 2. Label
-- only, never access: the switch that was flipped is the change, this just
-- stops the page lying about it. Lives in the database so every write path,
-- including a bulk update, keeps the label honest.
--
-- A write that sets access_tier itself (set_tier, archive, reset) is trusted
-- and left alone, which is what lets set_tier move a row between templates.
CREATE OR REPLACE FUNCTION public.profiles_access_tier_drift()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  all_on boolean;
  floor_only boolean;
BEGIN
  IF NEW.access_tier IS NULL OR NEW.access_tier = 'tier_2' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.access_tier IS DISTINCT FROM OLD.access_tier THEN
    RETURN NEW;
  END IF;

  all_on :=
    NEW.has_drill_access AND NEW.has_practice_access AND NEW.has_activity_access AND
    NEW.has_bootcamp_access AND NEW.has_journal_access AND NEW.has_flagged_access AND
    NEW.has_analytics_access AND NEW.has_export_access AND NEW.has_classroom_access AND
    NEW.has_chat_access AND NEW.has_schedule_access AND NEW.has_ta_access;

  floor_only :=
    NEW.has_classroom_access AND NEW.has_chat_access AND NEW.has_schedule_access AND NOT (
      NEW.has_drill_access OR NEW.has_practice_access OR NEW.has_activity_access OR
      NEW.has_bootcamp_access OR NEW.has_journal_access OR NEW.has_flagged_access OR
      NEW.has_analytics_access OR NEW.has_export_access OR NEW.has_ta_access
    );

  IF NEW.access_tier = 'tier_1' AND NOT all_on THEN
    NEW.access_tier := 'tier_2';
  ELSIF NEW.access_tier = 'tier_3' AND NOT floor_only THEN
    NEW.access_tier := 'tier_2';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_access_tier_drift_trg ON public.profiles;
CREATE TRIGGER profiles_access_tier_drift_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_access_tier_drift();
