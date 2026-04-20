# Scan 1 — Auth, Session, and Permissions

**Scope.** `src/contexts/AuthContext.tsx`, `src/hooks/useUserPermissions.ts`, `src/components/ProtectedRoute.tsx`, `src/pages/Auth.tsx`, `src/pages/ResetPassword.tsx`, `src/pages/Onboarding.tsx`, `src/integrations/supabase/client.ts`, `src/integrations/lovable/index.ts`, `src/main.tsx`, and auth-touching supabase migrations.

## Executive Summary

Auth is functionally wired but architecturally fragile in three specific places. The hard parts (OAuth return-leg 10s/15s split, layered session-death classifier, Lovable Cloud Auth ↔ Supabase session bridge, admin-displays-as-Joshua rule) are thoughtful and correct. The weak spots are (a) permissions fetched redundantly per-component on every route, (b) client-side row provisioning with zero Postgres-trigger backup, and (c) the `class_id::uuid = auth.uid()` convention being load-bearing but undocumented.

## Deep Findings

### F1.1 — `useUserPermissions` is called redundantly on nearly every route
**Evidence.** `src/hooks/useUserPermissions.ts:54-138`. Consumers: `ProtectedRoute`, `AcademyFoyer`, `Home`, `Inbox`, `AdminDashboard`, `FloatingMessenger`, `MessageComposer`.
**Behavior.** Hook fires two Supabase queries (`profiles` select + `user_roles` select) plus a fire-and-forget `last_seen_at` update on every mount. On `/inbox`: 4 simultaneous independent copies of the same state. Each copy has its own `loading` state and its own `bounceExpired` path.
**Severity: 6/10.** Wasteful, race-prone bounce-to-/auth logic.
**Fix.** Hoist into `<PermissionsContext>` provider above the router. Single fetch on auth state change. All current consumers import `usePermissions()` from the context.

### F1.2 — Zero `on_auth_user_created` trigger exists
**Evidence.** `grep -l "handle_new_user\|on_auth_user_created" supabase/migrations/*.sql` returns nothing. Client-side provisioning in `src/contexts/AuthContext.tsx:55-70` (`provisionStudentRecord`). Onboarding upsert in `src/pages/Onboarding.tsx:69-72`.
**Behavior.** Users with silent client-side insert failures end up in `auth.users` with no `students` row and no `profiles` row. The `get_user_class_id(uid)` function has a fallback to `uid::text` (`supabase/migrations/20260329000000_fix_class_id_fallback.sql`) that papers over the gap for `class_id` resolution, but `profiles` has no similar fallback. A user without a profiles row fails every profile-dependent query.
**Severity: 8/10.** The real risk bomb in the auth layer.
**Fix.** Add `handle_new_user()` PL/pgSQL function + `AFTER INSERT ON auth.users` trigger that inserts `profiles` (with `class_id = NEW.id::text`) and `students` rows atomically. Remove `provisionStudentRecord` from AuthContext.

### F1.3 — `token_hash: userId` placeholder smell
**Evidence.** `src/contexts/AuthContext.tsx:68`: `insert({ user_id: userId, class_id: userId, token_hash: userId, })`. Schema comment on `students.token_hash` is "passwordless classroom link + optional PIN" and the column is `NOT NULL`.
**Behavior.** Live legacy from the original classroom-link auth model. Not breaking anything today. Confuses future readers about how tokens flow.
**Severity: 3/10.**
**Fix.** Either (a) make `token_hash` nullable + add a column comment explaining it is legacy, or (b) migrate it out of the schema entirely.

### F1.4 — OAuth return-leg split is correct
**Evidence.** Visible 10s timeout in `src/pages/Auth.tsx:205-270` with `settled` latch preventing double-fire. Silent 15s safety-net in `src/contexts/AuthContext.tsx:120-130` (no toast, just unfreeze UI). Lovable-to-Supabase bridge in `src/integrations/lovable/index.ts`.
**Behavior.** Correct layered pattern. The two-timer split resolves the earlier "OAuth 15s silent fallback vs 10s visible timer" confusion in the old playbook.
**Severity: 0 (not a finding, positive confirmation).**

### F1.5 — `isSessionDeadError` is layered correctly
**Evidence.** `src/hooks/useUserPermissions.ts:42-51`. Checks `err.status === 401` first, then falls back to substring matches on `jwt` / `token is expired` / `invalid_token`.
**Behavior.** Correctly excludes RLS 403s (a 403 means permission-denied, not session-dead — bouncing to /auth on 403 would be a regression).
**Severity: 0 (positive confirmation).**

### F1.6 — Service Worker unregister on preview/iframe is blunt but necessary
**Evidence.** `src/main.tsx:14-18`. Unregisters all SW registrations when `isPreviewHost || isInIframe`.
**Behavior.** Published-URL users and preview users get materially different runtime behavior. Pragmatic fix for Lovable preview corrupting cached app shells.
**Severity: 0 — document, don't refactor.**

### F1.7 — `ProtectedRoute` gives admins a universal bypass
**Evidence.** `src/components/ProtectedRoute.tsx:22`: `if (permissions.is_admin || permissions[flag]) return <>{children}</>;`.
**Behavior.** Intentional per the admin-bypass convention. Noted for completeness.
**Severity: 0.**

### F1.8 — `class_id` is TEXT, cast everywhere via `::uuid`
**Evidence.** `students.class_id TEXT`, `profiles.class_id TEXT`. `public.get_conversation_participant_names` and RLS policies use `p.class_id::uuid = auth.uid()`.
**Behavior.** Works because the `get_user_class_id` fallback makes `class_id = auth.uid()::text` always. Any future schema evolution tightening `class_id` to `uuid` will require touching every RPC and policy.
**Severity: 3/10.** Latent tech debt.
**Fix.** Document the convention in CLAUDE.md. Revisit once gamification/classroom are resolved.

### F1.9 — RLS on core tables was tightened in Oct 2025
**Evidence.** `supabase/migrations/20251022025825_...sql` replaces `USING (true)` with `class_id = get_user_class_id(auth.uid())` on `attempts`, `profiles`, `drill_templates`, `flagged_questions`, `wrong_answer_journal`, `voice_coaching_sessions`.
**Behavior.** Correct. Partial concern: see F5.8 (April 6 baseline migrations may regress this).
**Severity: 0 for the Oct tightening itself. The regression is tracked under F5.8.**

## Scores (Scan 1 slice)

| Axis | Score |
|---|---|
| Architecture quality | 68 / 100 |
| Maintainability | 72 / 100 |
| UI/design consistency | n/a |
| Product vision alignment | 82 / 100 |
| Bug/risk level | 62 / 100 |

## Next Actions (ranked)

1. Add `on_auth_user_created` trigger — closes F1.2 and F1.3 together.
2. Hoist `useUserPermissions` into `<PermissionsContext>` — closes F1.1, feeds into F3.4/F3.8 cleanup.
3. Document the `class_id::uuid = auth.uid()` convention in CLAUDE.md.
4. Decide fate of `students.token_hash` column.
