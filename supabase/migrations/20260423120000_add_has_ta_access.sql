-- AI Teaching Assistant Phase 1 (F): granular feature flag for TA access.
-- Defaults false. Admins also hard-gate at the page level, so this flag on its
-- own does not grant access to TA surfaces — it is an additive gate for future
-- non-admin TA users. See useUserPermissions.ts and ProtectedRoute.tsx.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_ta_access boolean NOT NULL DEFAULT false;
