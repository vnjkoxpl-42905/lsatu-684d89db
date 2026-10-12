-- "Start my setup again" clears three columns: onboarding, onboarding_completed_at
-- and onboarding_notified_at. The first two were granted when the intake shipped;
-- the notified stamp was added later and never was, so every student reset failed
-- with a column-permission error ("Could not reset your setup").
--
-- Clearing the stamp is what makes the finished re-intake mail Joshua the new
-- answers instead of being swallowed as a duplicate. RLS still confines the write
-- to the student's own row.
GRANT UPDATE (onboarding_notified_at) ON public.profiles TO authenticated;
