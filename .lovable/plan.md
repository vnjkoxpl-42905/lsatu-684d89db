

## What I found — Google sign-in flow analysis

### The two code paths involved

**Path A — outbound click (`Auth.tsx` lines 328-346)**
1. `handleGoogleSignIn` sets `sessionStorage.oauth_pending = '1'`
2. Calls `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" })`
3. The Lovable broker redirects the browser to `/~oauth/initiate` → Google → back to `/auth`

**Path B — return-leg (`Auth.tsx` lines 209-266)**
1. On mount, if `oauth_pending === '1'`, re-invoke `lovable.auth.signInWithOAuth('google', ...)` so the broker delivers tokens (this time without redirecting)
2. `lovableAuth` internally calls `supabase.auth.setSession(result.tokens)` (`src/integrations/lovable/index.ts` lines 28-32) — this is a `POST` to `/auth/v1/token`
3. `AuthContext.onAuthStateChange` fires → `markReady(session)` → `Auth.tsx` user-watcher navigates to `/foyer` or `/onboarding`
4. Hard 10s timeout shows "Google sign-in didn't finish" toast

### The actual problem

**This is the documented Lovable preview iframe limitation**, not a bug in your code:

> The Lovable Preview environment uses a fetch proxy that interferes with Supabase authentication POST requests, specifically to `/auth/v1/token`. This results in a "Failed to fetch" error with status 0, even though GET requests function correctly.

What the user experiences in the preview iframe (`id-preview--…lovable.app`):
1. Click "Continue with Google" → modal disables, redirect to Google works
2. Pick Google account → redirected back to `/auth` with `oauth_pending = '1'`
3. Return-leg effect re-invokes the broker → broker hands back tokens
4. `supabase.auth.setSession(tokens)` POSTs `/auth/v1/token` → **fetch proxy blocks it → "Failed to fetch"**
5. `lovableAuth.signInWithOAuth` returns `{ error }` → `Auth.tsx` shows toast: **"Google sign-in failed: Failed to fetch"** (or, if it just hangs, the 10s safety timeout fires "Google sign-in didn't finish")
6. `oauth_pending` is cleared, modal reopens, user is back at the email/password form — never authenticated

### Why I'm confident this is the preview-iframe issue specifically

- `vite.config.ts` line 35 already has `navigateFallbackDenylist: [/^\/~oauth/]` → the SW is correctly bypassing the OAuth path, so it isn't a cached-redirect problem
- `src/integrations/lovable/index.ts` is the Lovable-managed auto-generated file → not user-editable, and is the canonical correct pattern
- `Auth.tsx` correctly:
  - sets `oauth_pending` before redirect
  - re-invokes the broker on return
  - sets `redirect_uri: window.location.origin + '/auth'` (works on custom domains too)
  - has a 10s visible timeout + 15s silent safety net in `AuthContext` so the UI cannot hang permanently
- The only failure surface left is the network call itself, and the documented fact is that `/auth/v1/token` POSTs fail in the preview iframe's fetch proxy

### What's NOT the problem (rule-outs)

- Not a missing/wrong Google OAuth credential — the broker uses Lovable-managed creds by default
- Not a missing `/reset-password`-style return route — `/auth` is the return target and is registered in `App.tsx`
- Not a PWA service-worker cache hit on `/~oauth`
- Not a CORS issue (per the lovable-stack-overflow note, do not add CORS headers — they don't fix this)
- Not a `redirect_uri` mismatch — Lovable auto-allowlists project origins
- Not the email/password flow — that uses a different supabase call path

### Verification recommendation (before any code change)

Test Google sign-in on the **published URL** (not the preview iframe):
- `https://lsatu.lovable.app`
- `https://www.lsatprep.study`
- `https://lsatprep.study`

If Google sign-in **works** on the published URL but **fails** on the `id-preview--…lovable.app` iframe, the diagnosis is confirmed: nothing in the code needs to change. The preview iframe simply cannot complete the OAuth POST due to its fetch proxy.

### What we should consider doing (optional UX changes only)

The code is correct. The only constructive change would be to **make the failure mode less confusing** when a user tests Google sign-in inside the preview iframe:

**Option 1 — Detect preview iframe + show a clearer message.** When the URL host contains `id-preview--` AND `oauth_pending` is set AND the broker returns an error, show a one-time toast like: "Google sign-in is not supported in the Lovable preview. Open the published URL to test it."

**Option 2 — Hide the "Continue with Google" button entirely when running inside `id-preview--…lovable.app`**, replacing it with an inline note pointing to the published URL.

**Option 3 — Do nothing in code.** Just verify on the published URL and confirm to yourself that prod works. Most appropriate if you're only testing in preview as a dev convenience.

### Files (no code change recommended yet, listed for reference)

- `src/pages/Auth.tsx` — outbound + return-leg handlers (lines 209-266, 328-346)
- `src/contexts/AuthContext.tsx` — `onAuthStateChange` + 15s safety net (lines 98-135)
- `src/integrations/lovable/index.ts` — Lovable-managed broker wrapper (do not edit)
- `vite.config.ts` line 35 — PWA denylist for `/~oauth` (already correct)

### Recommended next step

Test the published URL first. Tell me which of these is true and we'll proceed:
- (a) Works on published URL, fails only in preview iframe → confirmed platform issue, optionally implement Option 1 or 2 above for clearer UX
- (b) Fails on published URL too → real bug; I'll re-investigate with browser tools and edge-function logs to find the actual failure point
- (c) Works in both → was a transient broker hiccup; nothing to do

