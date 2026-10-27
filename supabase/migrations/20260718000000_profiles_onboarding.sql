-- New-signup onboarding intake. Stores the placement answers on the profile
-- (score/target bands, schools, free-text experience, life stage, weekly study
-- time) plus a one-time completion gate. See ONBOARDING-SPEC.md.
--
-- onboarding: single jsonb blob, matches the existing layout_prefs/by_qtype_json
--   pattern. Shape:
--     {
--       last_score_band, experience_text, schools: [],
--       target_score_band, life_stage, study_time: { sun..sat }
--     }
-- onboarding_completed_at: the gate. Set ONCE (explicit Skip or Finish); a null
--   value routes the user to /onboarding. Closing the tab never sets it.
alter table public.profiles
  add column if not exists onboarding jsonb,
  add column if not exists onboarding_completed_at timestamptz;

-- Backfill: every existing student counts as already-onboarded so only fresh
-- signups ever see the flow. Runs in the same migration that adds the column so
-- no active student is briefly gated into onboarding.
update public.profiles
  set onboarding_completed_at = now()
  where onboarding_completed_at is null;
