

## Plan: Fix Password Recovery Flow

### Problem
There's a race condition: when the user clicks the reset link, Supabase establishes a session (making `user` non-null), and the redirect-to-foyer effect in `Auth.tsx` fires before the recovery detection logic can set `isRecovery = true`. The user gets sent to `/foyer` instead of seeing the password reset form.

### Solution
Create a dedicated `/reset-password` route and page, and handle the `PASSWORD_RECOVERY` event in `AuthContext` to redirect there.

### Changes

#### 1. Create `src/pages/ResetPassword.tsx`
- Standalone page with "New Password" and "Confirm Password" fields
- Reuses the project's glass aesthetic (dark bg, glass panel)
- On mount, verifies a valid session exists (from the recovery link); if not, shows "invalid/expired" state with option to request a new link
- On submit, calls `supabase.auth.updateUser({ password })`, then redirects to `/foyer`

#### 2. Update `src/contexts/AuthContext.tsx`
- In the `onAuthStateChange` listener, when `event === 'PASSWORD_RECOVERY'`, set a flag and store `window.__pendingRecovery = true` (or use a ref) so the app can redirect
- Export the recovery state or handle redirect internally

#### 3. Update `src/App.tsx`
- Add `/reset-password` route (outside `QuestionBankProvider`, like `/auth`)
- Import `ResetPassword` page
- Add a wrapper component or effect at the router level that listens for `PASSWORD_RECOVERY` and calls `navigate('/reset-password')`

#### 4. Update `src/contexts/AuthContext.tsx` — `resetPassword` redirect URL
- Change `redirectTo` from `window.location.origin + '/auth'` to `window.location.origin + '/reset-password'` so the email link lands directly on the new page

#### 5. Clean up `Auth.tsx`
- Remove the recovery-specific state and UI (the `isRecovery`, `handlePasswordResetSubmit`, recovery form rendering) since it's now handled by the dedicated page
- Remove the `type=recovery` guard in the redirect effect

### Files
- **Create**: `src/pages/ResetPassword.tsx`
- **Modify**: `src/App.tsx` (add route)
- **Modify**: `src/contexts/AuthContext.tsx` (change redirect URL, add PASSWORD_RECOVERY navigation)
- **Modify**: `src/pages/Auth.tsx` (remove recovery UI code)

