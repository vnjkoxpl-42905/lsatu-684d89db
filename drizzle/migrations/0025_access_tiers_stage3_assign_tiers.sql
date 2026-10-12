UPDATE public.profiles SET
  access_tier          = 'tier_1',
  has_drill_access     = true,
  has_practice_access  = true,
  has_activity_access  = true,
  has_bootcamp_access  = true,
  has_journal_access   = true,
  has_flagged_access   = true,
  has_analytics_access = true,
  has_export_access    = true,
  has_classroom_access = true,
  has_chat_access      = true,
  has_schedule_access  = true,
  has_ta_access        = true
WHERE class_id = 'b0d1ec29-5946-4a1b-a649-60038683df32';

UPDATE public.profiles SET access_tier = 'tier_1'
WHERE access_tier IS NULL AND archived_at IS NULL
  AND has_drill_access AND has_practice_access AND has_activity_access AND
      has_bootcamp_access AND has_journal_access AND has_flagged_access AND
      has_analytics_access AND has_export_access AND has_classroom_access AND
      has_chat_access AND has_schedule_access AND has_ta_access;

UPDATE public.profiles SET access_tier = 'tier_2'
WHERE access_tier IS NULL AND archived_at IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN has_classroom_access SET DEFAULT true,
  ALTER COLUMN access_tier          SET DEFAULT NULL;