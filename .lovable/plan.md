## Problem

The public link `https://lsatprep.study/book/lexi` returns `invalid_link` because the live database still runs the **old** version of `public.resolve_booking_link_full(text)`, which rejects any slug shorter than 8 characters:

```
IF _slug IS NULL OR length(_slug) < 8 THEN RETURN NULL; END IF;
```

The pass exists and is healthy:

- id `582dab44-…`, student `Lexi A`, slug `lexi`, status `active`, 5/5 credits, no expiry.

The repo already contains a migration that lowers the guard to 3 characters and allows friendly slugs like `lexi`:

- `supabase/migrations/20260719140000_friendly_booking_slugs.sql`

That migration was never applied in production, so the live function still enforces the 8-char minimum. The endpoint calls the RPC, gets `NULL`, and the edge function returns `{"error":"invalid_link"}` — which the UI renders as the "No sessions available / invalid_link" toast you screenshotted.

## Fix

Re-apply the committed migration `20260719140000_friendly_booking_slugs.sql` verbatim. It only redefines `resolve_booking_link_full` (STABLE SECURITY DEFINER, search_path=public, minimum length 3, status IN ('active','paused'), expiry auto-mark) and re-grants EXECUTE to `service_role` only. No schema change, no data change, no edge function change.

## Verification

1. `SELECT public.resolve_booking_link_full('lexi');` returns Lexi's pass row instead of NULL.
2. `curl` POST to `/functions/v1/public-booking` with `{"slug":"lexi","action":"info"}` returns a 200 with `pass.credits_remaining = 5`.
3. Open `https://lsatprep.study/book/lexi` — booking calendar renders, no `invalid_link` toast.

## Why this happened

The 8-char guard was the original security posture (high-entropy slug as bearer credential). The follow-up migration explicitly relaxed it to 3 for private-tutoring friendly links (rate-limited per IP for guessability). That migration is in git but was never run against prod, so the DB is one revision behind the code.
