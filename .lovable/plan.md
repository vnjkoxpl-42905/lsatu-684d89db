
## Plan: Fix Google sign-in redirecting back to the login page

### What I found
The backend login itself is succeeding. Your auth logs show repeated successful Google logins and successful token exchange (`/token` returns 200), so this is not a Google provider failure.

The problem appears to be in the frontend auth timing:

- `AuthContext.tsx` tries to protect the app during OAuth callback by detecting `~oauth`, `access_token`, or `code=`
- But inside `onAuthStateChange`, it always does:
  - `setSession(session)`
  - `setUser(session?.user ?? null)`
  - `setLoading(false)`

That means if the first auth event during callback is `INITIAL_SESSION` or another event with `session = null`, the app marks auth as “done” too early.
Once that happens:
- `AcademyFoyer.tsx` sees `authLoading === false` and `user === null`
- it immediately runs `navigate("/auth")`
- user gets kicked back to the login page before the OAuth session fully settles

So this is a race condition in auth readiness, not a broken Google sign-in.

### Strategy
Make auth initialization truly “ready” only after the OAuth callback has finished resolving, and prevent route guards from redirecting during that brief callback window.

### Implementation steps

1. **Tighten `AuthContext` readiness logic**
   - Update `src/contexts/AuthContext.tsx`
   - In `onAuthStateChange`, do not blindly call `setLoading(false)` for every event while an OAuth callback is in progress
   - Only end loading when:
     - a real session exists, or
     - OAuth callback is not in progress, or
     - we get a terminal auth state that proves callback is finished
   - Keep `getSession()` as the primary readiness checkpoint

2. **Track auth-ready separately from raw user state**
   - Add a clearer concept of “auth initialized / auth ready” in the auth context
   - This avoids components treating `user === null` as final before initialization is complete

3. **Harden page guards**
   - Update `src/pages/AcademyFoyer.tsx`
   - Ensure it does not redirect to `/auth` until auth is fully ready
   - Optionally apply the same protection pattern to other guarded pages like `Home.tsx` and `Onboarding.tsx` so the behavior is consistent everywhere

4. **Preserve onboarding logic**
   - Keep the current intended flow:
     - returning Google user with profile → `/foyer`
     - new Google user without profile → `/onboarding`
   - Only change the timing/guard behavior, not the destination rules

5. **Verify the OAuth redirect path**
   - Review whether the app ever lands on `/~oauth` during hosted auth callback and ensure the callback route is allowed to finish before route guards run
   - If needed, broaden callback detection slightly so the app recognizes all Google return states reliably

### Expected result
After this fix:
- user clicks Google sign-in
- Google account chooser opens
- user returns to the app
- session is restored automatically
- returning users stay signed in and land in the app
- new users go to onboarding instead of bouncing back to login

### Files to update
- `src/contexts/AuthContext.tsx`
- `src/pages/AcademyFoyer.tsx`
- likely also:
  - `src/pages/Home.tsx`
  - `src/pages/Onboarding.tsx`

### Technical note
The key bug is this line of behavior in the current auth listener:
```ts
setLoading(false)
```
It runs too early during OAuth callback handling. The fix is to gate that state transition so route guards wait for real auth readiness before redirecting.
