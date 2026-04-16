

## Verification Conclusion

The diagnosis is **confirmed correct**. The failure point is:

`lovable.auth.signInWithOAuth("google", ...)` is only called when the user clicks the button (pre-redirect). On the fresh page load after Google returns to `/auth`, nobody calls it again, so `supabase.auth.setSession(result.tokens)` on line 31 of `lovable/index.ts` is never reached. The AuthContext waits 8 seconds then gives up.

## Execution Plan

**One change in `src/pages/Auth.tsx`** — add a `useEffect` that runs on mount:

```
useEffect:
  if sessionStorage.getItem('oauth_pending') !== '1' → return
  call lovable.auth.signInWithOAuth("google", { redirect_uri: origin + "/auth" })
  if result.error → clear flag, show toast
  if result.redirected → unexpected, clear flag (shouldn't happen on return leg)
  otherwise → session is set automatically by lovable module, AuthContext picks it up
```

No other files need changes. The existing AuthContext `oauth_pending` detection and 8-second timeout are already correct — they just need the session to actually arrive, which this useEffect provides.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Add mount-time `useEffect` to complete OAuth on return |

