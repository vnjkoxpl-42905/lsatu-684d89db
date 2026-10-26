-- One email per finished intake, ever.
--
-- The send is stamped on the profile rather than inferred from the mail log, so
-- a student who finishes onboarding is notified exactly once even if the tab is
-- closed mid-send and the nightly sweep picks them up later.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_notified_at timestamptz;

COMMENT ON COLUMN public.profiles.onboarding_notified_at IS
  'When the onboarding intake email was sent to Joshua. Null means it is still owed.';
