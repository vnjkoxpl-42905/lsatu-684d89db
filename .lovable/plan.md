## Change

Switch the default post-login landing route from `/mainhub` to `/classroom`. The onboarding gate and `returnTo`/`next` handling stay the same — only the fallback destination changes.

## Files

1. **`src/lib/authRedirect.ts`**
   - Replace the final `navigate("/mainhub", ...)` with `navigate("/classroom", ...)`.
   - Update the surrounding comments so they reference `/classroom` instead of `/mainhub`.

2. **`src/pages/ResetPassword.tsx`** (line 178)
   - Replace `navigate('/mainhub', { replace: true })` with `navigate('/classroom', { replace: true })` so post–password-reset lands in the same place.

3. **`src/pages/Auth.tsx`** (line 233)
   - Comment-only update to reference `/classroom` (no behavior change; it already calls `redirectAfterAuth`).

## Notes

- `/classroom` is gated by `has_classroom_access` in `App.tsx`. Students without that flag will hit the ProtectedRoute's own fallback — that's existing behavior and out of scope for this change. Flag me if you want the redirect to be conditional on the flag instead.
- Users mid-onboarding still route to `/onboarding` first; `returnTo`/`next` query params still win over the default.
