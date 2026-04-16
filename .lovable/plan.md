

## Plan: Unlock Access Flags for All Users

### What's wrong
Your profile row in the database has `has_bootcamp_access`, `has_classroom_access`, `has_analytics_access`, and `has_schedule_access` all set to `false` (the default). The `ProtectedRoute` component blocks you from seeing those pages.

### Fix
Run a single SQL migration to:
1. Set all four flags to `true` for all existing users
2. Change the column defaults to `true` so future signups are unlocked automatically

```sql
UPDATE public.profiles
SET has_bootcamp_access = true,
    has_classroom_access = true,
    has_analytics_access = true,
    has_schedule_access = true;

ALTER TABLE public.profiles
  ALTER COLUMN has_bootcamp_access SET DEFAULT true,
  ALTER COLUMN has_classroom_access SET DEFAULT true,
  ALTER COLUMN has_analytics_access SET DEFAULT true,
  ALTER COLUMN has_schedule_access SET DEFAULT true;
```

### Files Modified
| File | Change |
|------|--------|
| SQL Migration | Update existing profiles + change defaults to `true` |

No code changes needed. After this migration, you'll see all your pages normally again.

