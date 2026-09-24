-- Access tiers, stage 3: give every existing account a tier, and start new
-- signups at the floor.
--
-- Runs after stage 1, so the twelve switches already mean what they say.
-- Joshua's instruction (2026-09-24): nobody's current access changes, with one
-- exception, Sandra, who goes to Tier 1. So existing accounts are labelled by
-- the switches they already have, and no switch moves except Sandra's.
-- Admins are all-on and land on Tier 1; the label does nothing for an admin.

-- Sandra: Tier 1 by Joshua's decision.
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

-- Everyone with all twelve on.
UPDATE public.profiles SET access_tier = 'tier_1'
WHERE access_tier IS NULL AND archived_at IS NULL
  AND has_drill_access AND has_practice_access AND has_activity_access AND
      has_bootcamp_access AND has_journal_access AND has_flagged_access AND
      has_analytics_access AND has_export_access AND has_classroom_access AND
      has_chat_access AND has_schedule_access AND has_ta_access;

-- Everyone else keeps exactly the switches they have, labelled Tier 2. This
-- includes the classroom-only group: Tier 3 would add Messages and Schedule,
-- which is a change Joshua has not made. He can move them to Tier 3 himself.
UPDATE public.profiles SET access_tier = 'tier_2'
WHERE access_tier IS NULL AND archived_at IS NULL;

-- New signups: the floor, undecided. has_chat_access and has_schedule_access
-- already default to true and every other switch to false; Classroom joins the
-- floor so a new student has somewhere to stand while they wait in the queue.
ALTER TABLE public.profiles
  ALTER COLUMN has_classroom_access SET DEFAULT true,
  ALTER COLUMN access_tier          SET DEFAULT NULL;
