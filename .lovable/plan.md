

## Plan: Feature Gating & Admin Dashboard

### Overview
Lock Bootcamps, Classroom, Analytics, and Schedule behind per-user permission flags. Build a secure Admin Dashboard at `/admin` for managing access. The account `contact@aspiringattorneys.com` (UID `5ff160ef-016e-4ab5-aab1-55c7a2ad888f`) will be seeded as the master admin.

---

### 1. Database Migration

**A. Create `user_roles` table + `has_role()` function**
- Enum `app_role` with values `admin`, `user`
- Table with `user_id` (FK to auth.users) + `role` columns, unique constraint
- RLS: users read own roles; admins manage all (via `has_role()` security-definer function)

**B. Add access flags to `profiles`**
```sql
ALTER TABLE public.profiles
  ADD COLUMN has_bootcamp_access boolean NOT NULL DEFAULT false,
  ADD COLUMN has_classroom_access boolean NOT NULL DEFAULT false,
  ADD COLUMN has_analytics_access boolean NOT NULL DEFAULT false,
  ADD COLUMN has_schedule_access boolean NOT NULL DEFAULT false;
```

**C. Add RLS policy for admin reads on profiles**
- Admins can SELECT all profiles (needed for the dashboard user list)

**D. Seed admin role**
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('5ff160ef-016e-4ab5-aab1-55c7a2ad888f', 'admin');
```

---

### 2. Edge Function: `admin-manage-users`

Single function handling two operations:
- **GET** — returns all users (email from auth.users joined with profiles access flags)
- **POST** — toggles a user's access flag or admin role

Security: validates caller is admin via `has_role()` check using the service-role key. Returns 403 otherwise.

---

### 3. Frontend: New Files

| File | Purpose |
|------|---------|
| `src/hooks/useUserPermissions.ts` | Fetches current user's 4 access flags + admin status from profiles + user_roles |
| `src/components/LockedModule.tsx` | Full-page "Premium Content Locked" — zinc-900 bg, Lock icon, contact message |
| `src/components/ProtectedRoute.tsx` | Wrapper: checks permission flag → renders children or LockedModule |
| `src/pages/AdminDashboard.tsx` | Stripe-style table of all users with toggle switches for each access flag |

---

### 4. Frontend: Modified Files

**`src/App.tsx`**
- Wrap `/bootcamps` in `<ProtectedRoute flag="has_bootcamp_access">`
- Wrap `/classroom` in `<ProtectedRoute flag="has_classroom_access">`
- Wrap `/analytics` in `<ProtectedRoute flag="has_analytics_access">`
- Wrap `/schedule` in `<ProtectedRoute flag="has_schedule_access">`
- Add `/admin` route guarded by admin check → `AdminDashboard`

**`src/components/foyer/OrbitalHub.tsx`**
- Accept permissions prop; show a small lock icon overlay on nodes the user cannot access
- Clicking a locked node still navigates (ProtectedRoute handles the block)

---

### 5. Admin Dashboard Design

- Clean monochromatic table (zinc/neutral palette)
- Columns: Email, Display Name, Bootcamps, Classroom, Analytics, Schedule
- Each access column renders a toggle Switch
- Toggles call the edge function immediately (optimistic update)
- Search bar at top to filter users
- "ADMIN" link added to foyer header (visible only to admins)

---

### Security Summary

- Admin role stored in separate `user_roles` table (not on profiles) — prevents privilege escalation
- `has_role()` is security-definer — no RLS recursion
- Edge function validates admin status server-side with service-role key
- Standard users cannot see or modify other users' data

