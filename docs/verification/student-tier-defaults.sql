-- Run AFTER the forward migration. Exercises only a temporary table, then rolls back.
BEGIN;
CREATE TEMP TABLE tier_policy_probe AS SELECT * FROM public.profiles WITH NO DATA;
CREATE TRIGGER tier_policy_probe_drift BEFORE UPDATE ON tier_policy_probe
FOR EACH ROW EXECUTE FUNCTION public.profiles_access_tier_drift();

INSERT INTO tier_policy_probe (
  class_id, access_tier, has_drill_access, has_practice_access, has_classroom_access,
  has_chat_access, has_schedule_access, has_journal_access, has_flagged_access,
  has_analytics_access, has_activity_access, has_bootcamp_access, has_ta_access,
  has_export_access, has_waj_access
) VALUES ('00000000-0000-0000-0000-000000000001', NULL,
  false, false, false, false, false, false, false, false, false, false, false, false, false);

DO $test$
DECLARE r record;
BEGIN
  -- Old Tier 2 endpoint changes only the label; the trigger supplies the preset.
  UPDATE tier_policy_probe SET access_tier = 'tier_2' RETURNING * INTO r;
  IF NOT (r.has_classroom_access AND r.has_chat_access AND r.has_schedule_access) OR
     r.has_drill_access OR r.has_practice_access OR r.has_analytics_access THEN
    RAISE EXCEPTION 'Tier 2 preset failed';
  END IF;
  UPDATE tier_policy_probe SET access_tier = 'tier_1' RETURNING * INTO r;
  IF NOT (r.has_drill_access AND r.has_practice_access AND r.has_classroom_access AND
    r.has_chat_access AND r.has_schedule_access AND r.has_journal_access AND
    r.has_flagged_access AND r.has_analytics_access) OR r.has_activity_access OR r.has_bootcamp_access THEN
    RAISE EXCEPTION 'Tier 1 preset failed';
  END IF;
  UPDATE tier_policy_probe SET has_drill_access = false RETURNING * INTO r;
  IF r.access_tier <> 'tier_2' OR NOT r.has_journal_access OR NOT r.has_analytics_access THEN
    RAISE EXCEPTION 'Tier 1 deviation or OR dependency failed';
  END IF;
  UPDATE tier_policy_probe SET has_practice_access = false RETURNING * INTO r;
  IF r.has_journal_access OR r.has_flagged_access OR r.has_analytics_access THEN
    RAISE EXCEPTION 'Review was not disabled with both practice doors off';
  END IF;
  UPDATE tier_policy_probe SET access_tier = 'tier_3' RETURNING * INTO r;
  IF r.has_classroom_access OR r.has_drill_access OR r.has_practice_access OR
     NOT r.has_chat_access OR NOT r.has_schedule_access THEN
    RAISE EXCEPTION 'Tier 3 preset failed';
  END IF;
  UPDATE tier_policy_probe SET has_classroom_access = true RETURNING * INTO r;
  IF r.access_tier <> 'tier_2' OR r.has_drill_access THEN
    RAISE EXCEPTION 'Tier 3 deviation failed';
  END IF;
  UPDATE tier_policy_probe SET has_activity_access = true, has_bootcamp_access = true RETURNING * INTO r;
  IF r.has_activity_access OR r.has_bootcamp_access THEN
    RAISE EXCEPTION 'Retired category grants survived';
  END IF;
  UPDATE tier_policy_probe SET archived_at = now(), has_chat_access = false,
    has_schedule_access = false, has_classroom_access = false RETURNING * INTO r;
  UPDATE tier_policy_probe SET archived_at = NULL RETURNING * INTO r;
  IF r.has_chat_access OR r.has_schedule_access OR r.has_classroom_access OR r.access_tier <> 'tier_2' THEN
    RAISE EXCEPTION 'Unarchive reopened access or forgot tier';
  END IF;
END;
$test$;
ROLLBACK;
