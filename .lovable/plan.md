
## Diagnosis

The last edit failed because it implemented the wrong recovery model for managed Google OAuth.

### What the attempted edit changed
1. Kept the click handler using:
   - `sessionStorage.setItem('oauth_pending', '1')`
   - `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" })`
2. Updated `AuthContext` so `oauth_pending` makes auth wait up to 8 seconds.
3. Added a new mount-time effect in `Auth.tsx` that calls `lovable.auth.signInWithOAuth(...)` again after the browser returns to `/auth`.

### Why that caused the issue
Per the managed OAuth helper’s expected behavior, `lovable.auth.signInWithOAuth()` should be called once before redirect. After return, the session should be restored automatically on page load.

The new `Auth.tsx` effect calls it a second time on the fresh `/auth` load. That is the broken part.

In the current code, this second call can:
- start a fresh OAuth redirect again, or
- return an error / non-session result, and
- clear `oauth_pending` too early.

That breaks the waiting logic in `AuthContext`, so the app ends up with:
- `authReady = true`
- `user = null`

At that point the app simply stays on `/auth`, which matches the behavior you’re seeing.

## Actual failure point

The current remaining failure is not “we forgot to call the helper again.”
It is the opposite:

- we added a second post-return OAuth call that should not be there,
- and that extra call interferes with normal session restoration.

## Why the earlier reasoning was wrong

The previous fix assumed:
- `supabase.auth.setSession(...)` must be triggered by our app again after redirect.

But in this managed flow, that assumption is wrong. The helper is not designed as a two-step “call before redirect, then call again on return” API. The second call is not a valid finalization step.

So the implementation drifted away from the intended auth flow and introduced a self-inflicted failure.

## Correct fix direction

We should restore the flow to a single OAuth initiation call and let the auth provider restore the session naturally.

That means:
1. Remove the mount-time “finalize OAuth on return” effect from `Auth.tsx`.
2. Keep the auth waiting logic in `AuthContext`, but only as passive waiting for session restoration.
3. Re-verify whether `/auth` is the right return path or whether we should use the app origin and protect against premature routing another way.
4. Instrument the auth lifecycle so we can confirm:
   - whether `oauth_pending` survives the return,
   - whether `getSession()` is null or populated on load,
   - whether `onAuthStateChange` receives a real session,
   - whether routing happens before session restoration completes.

## Execution plan

### Step 1 — Remove the bad post-return behavior
- Delete the `React.useEffect` in `src/pages/Auth.tsx` that re-calls `lovable.auth.signInWithOAuth(...)` on mount.

### Step 2 — Keep only single-entry OAuth initiation
- Leave the button handler as the only place that starts Google OAuth.
- Preserve `oauth_pending` only as a waiting signal, not as a trigger to call OAuth again.

### Step 3 — Add targeted verification instrumentation
Temporarily log:
- on `/auth` mount:
  - current URL
  - `oauth_pending`
- in `AuthContext`:
  - initial `isOAuthRef.current`
  - `supabase.auth.getSession()` result
  - every `onAuthStateChange` event and whether `newSession` exists
  - when timeout fires
  - when `markReady(null)` vs `markReady(session)` runs

This will tell us whether the real remaining issue is:
- session never being restored at all, or
- session being restored but routing logic still beating it.

### Step 4 — Re-test the return path
After removing the second call, verify:
- user clicks Google
- browser returns
- `oauth_pending` still exists on first render
- `getSession()` or `onAuthStateChange` yields a session
- `user` becomes non-null
- `/auth` redirects onward to `/foyer` or `/onboarding`

### Step 5 — If session is still not restored
Then we investigate the next layer, in order:
1. whether the chosen `redirect_uri` path is compatible with the managed flow,
2. whether the backend auth settings allow the return domain/path,
3. whether the preview/published environment differs,
4. whether another route guard is clearing or racing before auth settles.

## Files to change in the next execution pass
- `src/pages/Auth.tsx` — remove the second OAuth call; add temporary debug instrumentation
- `src/contexts/AuthContext.tsx` — add temporary auth lifecycle logs only

## Technical note
There is also an older `signInWithGoogle` method still present in `AuthContext.tsx` that uses direct `supabase.auth.signInWithOAuth(...)`. It does not appear to be the active path for the current button, but it should be cleaned up afterward so there is only one Google OAuth implementation in the app.
