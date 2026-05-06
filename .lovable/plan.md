## Goal
When a new user signs up, every admin gets an in-app notification (bell + dropdown). Students do **not** receive this — admin-only.

## How it works today
- `notifications` table already exists with RLS allowing users to read their own rows. Admins can insert anything.
- `useNotifications` + `NotificationBell` already render unread counts and realtime updates for the logged-in user.
- A profile row is created right after signup (via the existing onboarding flow / profile insert policy).

## Implementation

### 1. Database trigger (migration)
Add a trigger on `public.profiles` that fires `AFTER INSERT` and, for each admin in `user_roles` where `role = 'admin'`, inserts a `notifications` row:

- `user_id` = admin's auth uid
- `type` = `'signup'`
- `title` = `'New signup'`
- `body` = display_name (or "A new student joined") + the new user's email/name
- `link` = `/admin` (or `/admin/students`)

Function is `SECURITY DEFINER` with `SET search_path = public` so it can write notifications regardless of caller RLS. It silently no-ops if there are no admins.

### 2. Type widening
Extend `NotificationType` in `src/hooks/useNotifications.ts` to include `'signup'`, and add an icon case (`UserPlus` from lucide) in `NotificationBell.tsx`.

### 3. No frontend logic change required
The bell already subscribes to realtime inserts filtered by `user_id`, so the admin will see the new notification appear instantly without a refresh.

## Files touched
- New migration: `supabase/migrations/<ts>_signup_notifications.sql` (function + trigger)
- `src/hooks/useNotifications.ts` — add `'signup'` to union
- `src/components/notifications/NotificationBell.tsx` — add icon case

## Out of scope
- Email notifications (in-app only, per request)
- Notifying non-admin users
- Backfilling notifications for users who already signed up
