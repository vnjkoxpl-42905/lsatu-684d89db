---
name: Feature gating system
description: 10 boolean flags on profiles control per-user access to all major modules. Admin role bypasses all gates. Edge function supports bulk actions and role management.
type: feature
---

## Feature Flags (profiles table)
All boolean, default `true`:
- `has_practice_access` — Practice / Home
- `has_drill_access` — Drill
- `has_bootcamp_access` — Bootcamps + individual bootcamp routes
- `has_classroom_access` — Classroom
- `has_analytics_access` — Analytics
- `has_schedule_access` — Schedule
- `has_waj_access` — Wrong Answer Journal
- `has_flagged_access` — Flagged Questions
- `has_chat_access` — Chat / Tutor features
- `has_export_access` — PDF / Export features
- `last_seen_at` — timestamptz, updated on each app load

## Admin Role
- Stored in `user_roles` table (separate from profiles)
- `contact@aspiringattorneys.com` is the primary admin — seed on first login
- Admins bypass all ProtectedRoute gates
- Admin dashboard at `/admin` with analytics, user management, bulk actions, role management

## Enforcement
- `useUserPermissions` hook fetches all 10 flags + admin role
- `ProtectedRoute` component wraps routes in App.tsx
- Foyer `OrbitalHub` dims locked nodes based on permission flags
- Edge function `admin-manage-users` handles: list users, toggle flags, bulk grant/revoke, promote/demote roles, analytics

## Edge Function Actions (POST body)
- `{ class_id, field, value }` — toggle single flag
- `{ action: "bulk_user", class_id, value }` — grant/revoke all flags for user
- `{ action: "set_role", user_id, role }` — set user role to admin or user
