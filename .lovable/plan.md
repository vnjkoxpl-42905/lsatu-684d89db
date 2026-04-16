

# Admin Dashboard & Feature Flag System — Implementation Plan

## Current State (Audit)

**What exists:**
- `profiles` table has 4 boolean flags: `has_bootcamp_access`, `has_classroom_access`, `has_analytics_access`, `has_schedule_access` (all default `true`)
- `user_roles` table with `app_role` enum (`admin`, `moderator`, `user`)
- `useUserPermissions` hook reads flags + admin role
- `ProtectedRoute` component gates 4 routes (analytics, classroom, schedule, bootcamps)
- Basic `AdminDashboard` page with search + 4 toggle switches per user
- `admin-manage-users` edge function (GET users, POST toggle flag)
- Foyer `OrbitalHub` dims locked nodes
- `LockedModule` fallback page
- Practice, Drill, WAJ, Flagged, Profile pages have NO feature gates

**What is missing:**
- No flags for: Practice, Drill, WAJ, Flagged, Chat, PDF/Export
- No bulk actions (Grant All / Revoke All)
- No admin analytics (user activity, feature adoption, usage stats)
- No last-login / last-seen tracking
- No user role display in admin UI
- No way to promote/demote admins
- No access presets
- Primary admin account (`contact@aspiringattorneys.com`) not seeded
- Permission hook doesn't cover new flags
- Edge function only handles 4 fields

## Architecture

**Approach:** Extend the existing `profiles` boolean-flag pattern (simple, queryable, no JSON blobs). Add new columns for additional features. Keep `user_roles` separate for admin/moderator roles. Add `last_seen_at` to profiles for activity tracking.

**New profile flags:**
- `has_practice_access` (default true)
- `has_drill_access` (default true)  
- `has_waj_access` (default true)
- `has_flagged_access` (default true)
- `has_chat_access` (default true)
- `has_export_access` (default true)

**New profile column:**
- `last_seen_at` (timestamptz, updated on app load)

## Execution Steps

### 1. Database Migration
Add 7 new columns to `profiles`:
- `has_practice_access boolean DEFAULT true`
- `has_drill_access boolean DEFAULT true`
- `has_waj_access boolean DEFAULT true`
- `has_flagged_access boolean DEFAULT true`
- `has_chat_access boolean DEFAULT true`
- `has_export_access boolean DEFAULT true`
- `last_seen_at timestamptz DEFAULT now()`

Seed admin role for `contact@aspiringattorneys.com` (insert into `user_roles` if user exists, or document that it must be done after account creation).

### 2. Update `useUserPermissions` Hook
Add all new flags. Update the profiles query to select new columns. Touch `last_seen_at` on each load.

### 3. Update `ProtectedRoute` + Add Guards
- Extend `ProtectedRoute` to accept new flag names
- Wrap Practice (`/practice`), Drill (`/drill`), WAJ (`/waj`), Flagged (`/flagged`) routes with guards in `App.tsx`

### 4. Update Edge Function `admin-manage-users`
- Add new fields to the allowed list
- Add GET endpoint for admin analytics (user counts, feature distribution, activity stats)
- Add POST endpoint for bulk actions (grant-all, revoke-all per user)
- Add role management (promote to admin, demote)
- Return `last_seen_at` and role info in user list

### 5. Rebuild Admin Dashboard
Replace the current minimal table with a full admin panel:

**Sections:**
- **Overview cards**: Total users, active today, active this week, admin count
- **Feature adoption chart**: Bar chart showing how many users have each flag enabled
- **User table** (enhanced):
  - Email, display name, role badge (admin/user), last seen
  - All 10 feature toggles organized in collapsible groups
  - Row-level "Grant All" / "Revoke All" buttons
  - Role management (make admin / remove admin)
  - Search + filter by role or access level
- **Global bulk actions**: Grant/revoke a specific feature for all users

**Design:** Dark zinc theme matching existing admin page. Clean table layout. Toggle switches for each flag. Badge indicators for roles.

### 6. Update Foyer
- Pass new permission flags to `OrbitalHub` for locked node display
- Add practice node locking support

### 7. Update `last_seen_at`
In `AuthContext` or `useUserPermissions`, upsert `last_seen_at = now()` on session detection.

## Files Modified

| File | Change |
|------|--------|
| Migration SQL | Add 7 columns to `profiles` |
| `src/hooks/useUserPermissions.ts` | Add new flags, update `last_seen_at` |
| `src/components/ProtectedRoute.tsx` | Extend flag type union |
| `src/App.tsx` | Wrap Practice/Drill/WAJ/Flagged with ProtectedRoute |
| `supabase/functions/admin-manage-users/index.ts` | Expand allowed fields, add bulk actions, add analytics endpoint, add role management |
| `src/pages/AdminDashboard.tsx` | Full rebuild: analytics cards, enhanced user table, bulk actions, role management |
| `src/pages/AcademyFoyer.tsx` | Pass new flags for locked nodes |
| `src/components/foyer/OrbitalHub.tsx` | No changes needed (already accepts `lockedNodeIds`) |

## Constraints
- No changes to `client.ts` or `types.ts`
- All new columns default to `true` so existing users keep access
- Admin bypass stays in `ProtectedRoute` (admins see everything)
- `contact@aspiringattorneys.com` gets admin role seeded via edge function call or migration

