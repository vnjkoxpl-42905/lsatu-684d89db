-- Activity Centre Phase 1: granular feature flag for Activity Centre access.
-- Defaults false. Activities are assignment-gated; this flag is the additive
-- per-feature gate (mirrors has_ta_access / has_drill_access). See
-- useUserPermissions.ts and ProtectedRoute.tsx.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_activity_access boolean NOT NULL DEFAULT false;
