-- Access tiers, stage 3: give every existing account a tier, and start new
-- signups at the floor.
--
-- Runs after stage 1, so the twelve switches already mean what they say.
-- Admins are not students, but they are all-on, so they land on Tier 1; the
-- label does nothing for an admin, who bypasses every gate.

-- Everyone with all twelve on.
UPDATE public.profiles SET access_tier = 'tier_1'
WHERE access_tier IS NULL AND archived_at IS NULL
  AND has_drill_access AND has_practice_access AND has_activity_access AND
      has_bootcamp_access AND has_journal_access AND has_flagged_access AND
      has_analytics_access AND has_export_access AND has_classroom_access AND
      has_chat_access AND has_schedule_access AND has_ta_access;

-- Classroom and nothing else: the revoked group. They become Tier 3, and Tier 3
-- includes Messages and Schedule, so this is the one deliberate widening in the
-- whole change (decision 17 of the 2026-09-22 plan): they can reach Joshua and
-- book again. TA worksheets follow Classroom after stage 1, so they are cleared
-- here with the rest of the non-floor switches.
UPDATE public.profiles SET
  access_tier = 'tier_3',
  has_chat_access = true,
  has_schedule_access = true,
  has_ta_access = false
WHERE access_tier IS NULL AND archived_at IS NULL
  AND has_classroom_access
  AND NOT (has_drill_access OR has_practice_access OR has_activity_access OR
           has_bootcamp_access OR has_journal_access OR has_flagged_access OR
           has_analytics_access OR has_export_access);

-- Everyone else keeps exactly the switches they have, labelled Tier 2.
UPDATE public.profiles SET access_tier = 'tier_2'
WHERE access_tier IS NULL AND archived_at IS NULL;

-- New signups: the floor, undecided. has_chat_access and has_schedule_access
-- already default to true and every other switch to false; Classroom joins the
-- floor so a new student has somewhere to stand while they wait in the queue.
ALTER TABLE public.profiles
  ALTER COLUMN has_classroom_access SET DEFAULT true,
  ALTER COLUMN access_tier          SET DEFAULT NULL;
