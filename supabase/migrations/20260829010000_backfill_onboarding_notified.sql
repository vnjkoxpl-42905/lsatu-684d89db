-- Everyone who onboarded before the notification existed is marked as already
-- notified, so the sweep starts from an empty queue.
--
-- Without this, the first sweep would mail Joshua one message for every student
-- who has ever finished the intake — thirty-odd emails about students he
-- onboarded months ago. The notification is for new intakes only.
UPDATE public.profiles
SET onboarding_notified_at = now()
WHERE onboarding_completed_at IS NOT NULL
  AND onboarding_notified_at IS NULL;
