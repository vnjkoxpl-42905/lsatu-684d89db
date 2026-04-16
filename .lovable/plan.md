

## Google OAuth: Root Cause Analysis

### The Flow (what happens step by step)

1. User clicks "Continue with Google" → `handleGoogleSignIn` calls `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
2. Browser redirects to Google via Lovable's OAuth proxy (`/~oauth/initiate`)
3. User completes Google sign-in
4. Lovable proxy handles the callback at `/~oauth/callback`, exchanges tokens
5. Proxy redirects back to `redirect_uri` = `window.location.origin` = **`/`** (root)

### The Failure Point

6. App loads at `/`. The route definition for `/` is:
   ```tsx
   <Route path="/" element={<Navigate to="/foyer" replace />} />
   ```
   This fires **immediately during render**, navigating to `/foyer` and potentially stripping any hash fragment tokens before Supabase's async session detection can process them.

7. `/foyer` renders `AcademyFoyer`, which has this auth guard (line 57-59):
   ```tsx
   if (!authReady) return;      // waits...
   if (!user) { navigate("/auth"); return; }  // ← FIRES if session not yet established
   ```

8. There's a **race condition**: if `authReady` resolves to `true` (via `getSession()` returning `null`) before `onAuthStateChange` fires with the new session, the foyer guard sees `user = null` and boots the user back to `/auth`.

9. In `AuthContext`, the `isOAuthCallbackUrl()` helper checks for `~oauth` in pathname, `access_token` in hash, or `code=` in search. But by the time the app loads at `/` after the proxy redirect, the URL is clean — **none of these indicators are present**. So `isOAuthRef.current = false`, meaning the auth context doesn't wait for the OAuth session and immediately marks `authReady = true` with `user = null`.

### Why It Fails

The Lovable OAuth proxy completes the token exchange server-side and redirects to a clean URL (`/`). The `isOAuthCallbackUrl()` detection doesn't recognize this as an OAuth return, so auth resolves immediately as "no session." The `<Navigate to="/foyer">` + foyer auth guard then sends the user to `/auth`.

### The Fix (2 changes)

**1. Change `redirect_uri` to `/auth` instead of origin root**

In `Auth.tsx` line 232, change:
```tsx
redirect_uri: window.location.origin,
```
to:
```tsx
redirect_uri: window.location.origin + "/auth",
```

This sends the user back to `/auth` after Google OAuth. The Auth page already has a `useEffect` (line 148-165) that watches for `user` and redirects to `/foyer` or `/onboarding` once the session is established — no race condition.

**2. Improve `isOAuthCallbackUrl()` detection in `AuthContext.tsx`**

The current detection misses Lovable-managed OAuth returns. Add a sessionStorage flag set before redirect and checked on return:

- Before the OAuth redirect in `handleGoogleSignIn`, set `sessionStorage.setItem('oauth_pending', '1')`
- In `isOAuthCallbackUrl()`, also check for this flag
- Clear it once auth resolves

This ensures the auth context **waits** for the session to arrive via `onAuthStateChange` instead of immediately resolving as unauthenticated.

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Change `redirect_uri` to `window.location.origin + "/auth"`, set `oauth_pending` flag before redirect |
| `src/contexts/AuthContext.tsx` | Add `sessionStorage.getItem('oauth_pending')` check to `isOAuthCallbackUrl()`, clear flag on auth resolution |

### Technical Details
- No database changes needed
- No new dependencies
- The `sessionStorage` flag is cleared on session close, so it won't persist incorrectly
- The `/auth` redirect is safe: if user IS authenticated, the existing useEffect navigates them forward immediately

