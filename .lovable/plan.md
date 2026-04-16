

# Google OAuth Fix — Revised Diagnosis & Plan

## The Two Competing Google Sign-In Flows

There are **two separate Google OAuth implementations** that conflict:

1. **`Auth.tsx` line 242** — `lovable.auth.signInWithOAuth("google", { redirect_uri: origin + "/auth" })`
   This is the **correct** Lovable Cloud managed flow. It goes through the `/~oauth` broker which handles token exchange.

2. **`AuthContext.tsx` line 176** — `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: origin + "/" })`
   This is a **stale, wrong** flow that bypasses the Lovable broker entirely and uses raw Supabase OAuth. It will not work because the Supabase project doesn't have its own Google OAuth credentials configured — Lovable Cloud manages those through the broker.

**However**, `Auth.tsx` calls its own `handleGoogleSignIn` (the correct one), not `signInWithGoogle` from AuthContext. So the stale flow isn't actively invoked from UI — but it's dead code that creates confusion and could be called accidentally.

## The Actual Failure Point

When the user returns to `/auth` after completing Google sign-in via the Lovable broker:

1. The app remounts fresh at `/auth`
2. `AuthContext` initializes, calls `getSession()` and sets up `onAuthStateChange`
3. The Lovable broker should have established the session via `supabase.auth.setSession(result.tokens)` — but that call happened in `src/integrations/lovable/index.ts` on the **previous page load** (before redirect). On the return leg, nobody calls `setSession` again.
4. For the session to materialize, the broker must deliver tokens via URL hash (`access_token`) or query params (`code=`) that the Supabase JS client auto-detects on init.

**The key question**: Is the broker actually putting tokens in the return URL? The `isOAuthCallbackUrl()` check in AuthContext looks for `access_token` in hash, `code=` in search, or `oauth_pending` in sessionStorage. If only `oauth_pending` matches (which it will), the app waits up to 8 seconds for a session that may never arrive because no tokens are in the URL for Supabase to consume.

## What the Previous Fix Missed

The previous fix added waiting logic (`oauth_pending`, 8s timeout) — correct defensively, but it assumed tokens would eventually arrive. It never addressed **how** the session gets established on the return leg. The `lovable.auth.signInWithOAuth` function in `src/integrations/lovable/index.ts` calls `supabase.auth.setSession(result.tokens)` only when `result.redirected` is false (i.e., when tokens come back directly without a page redirect). During a full redirect flow, that code never runs on the return.

## Fix

### 1. Remove the stale `signInWithGoogle` from AuthContext
Delete the `supabase.auth.signInWithOAuth` Google flow entirely from `AuthContext.tsx`. It's dead code that bypasses the managed broker. Remove it from the context value too.

### 2. Re-invoke the Lovable broker on the return leg
When Auth.tsx mounts and detects it's an OAuth return (`oauth_pending` is set in sessionStorage, or URL contains OAuth markers), it should call `lovable.auth.signInWithOAuth("google", { redirect_uri: ... })` again. On this second call, the broker won't redirect — it will return `{ redirected: false, tokens: {...} }`, and the `setSession` call in `src/integrations/lovable/index.ts` will fire, establishing the session.

Add to Auth.tsx's mount effect:
```typescript
React.useEffect(() => {
  if (sessionStorage.getItem('oauth_pending') === '1') {
    lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    }).then((result) => {
      if (result.error) {
        sessionStorage.removeItem('oauth_pending');
        console.error('[Auth] OAuth return-leg failed', result.error);
      }
      // If tokens were returned, setSession was already called inside lovable module
      // AuthContext's onAuthStateChange will pick up the new session
    });
  }
}, []);
```

### 3. Tighten the AuthContext OAuth detection
Remove the `oauth_pending` check from `isOAuthCallbackUrl()` in AuthContext — that flag is Auth.tsx's concern now. Keep only the URL-based checks (`access_token`, `code=`, `~oauth`).

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Add return-leg broker re-invocation on mount |
| `src/contexts/AuthContext.tsx` | Remove stale `signInWithGoogle`, clean up `isOAuthCallbackUrl` |

## Verification Steps
1. Test on preview: click Google sign-in, complete at Google, verify return to `/auth` → session established → redirect to `/foyer` or `/onboarding`
2. Test on published URL as secondary confirmation
3. Verify email/password login still works unchanged

