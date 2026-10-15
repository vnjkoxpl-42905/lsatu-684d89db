# PLAN — Copy-link: personalized public booking links (Calendly-style)

Date: 2026-07-18. **Rev 3** (closes Codex R2 findings — concrete contracts for the 6 items Rev 2 left as open flags). Source of decisions: `~/ai-os/brainstorms/2026-07-18-copy-scheduling-link-button.md`. Extends the shipped booking system (`PLAN.md` Rev 3).

## STATUS: APPROVED TO BUILD (2026-07-18)
Joshua approved implementation after 3 Codex rounds (architecture validated). All 5 R3 fixes below are folded into the code as written. Human gate: Joshua reviews the diff + live-drive at the end.

## Codex R3 residual findings (verified real; fold into implementation — see "R3 fixes" below)
Hit MAX_ROUNDS=3. R3 findings are all **narrow, verified SQL/concurrency bugs**, not architectural. Fold each into code:
1. **Timezone:** do NOT hardcode `America/New_York`. Read the IANA tz from `booking_availability_config.timezone` (defaults `America/Toronto`, mutable via `set_booking_availability`). `redeem_booking_pass_v2` + `generateSlots` both read it. Reject nonexistent (spring-forward) + ambiguous (fall-back) local instants explicitly, or convert canonically from local-date/time and compare in UTC.
2. **Buffer concurrency:** the 15-min buffer must be in the **EXCLUDE constraint**, not just a pre-insert query. Replace/augment `no_overlapping_bookings` with an exclusion over `tstzrange(start_at - '15 min', end_at + '15 min')`; and make booking + `schedule_events` creation take a **shared advisory lock** before check+insert so cross-table buffered overlaps can't race.
3. **Reconciler state columns:** `booking_pass_redemptions` has `created_at` only — **add `updated_at` (+ trigger), `gcal_attempts int`, `gcal_error text`, and a terminal flag** (e.g. `gcal_state text CHECK IN ('pending','synced','failed')`) so terminal rows are distinguishable from retryable and the reconciler query is implementable.
4. **Reconciler idempotency under concurrency:** "search-then-create" can double-create with two workers. Add a **DB claim/lease** per redemption (`gcal_lease_until timestamptz` set via a conditional UPDATE) so only the worker that wins the lease creates/adopts; others skip.
5. **Idempotency-key no-op:** unique index is `(booking_pass_id, idempotency_key)`, not `idempotency_key` alone. In `redeem_booking_pass_v2`, **after** acquiring the pass lock, re-SELECT by `(booking_pass_id, idempotency_key)` and return the existing row; also catch `23505` and return the existing row (belt-and-suspenders) so a retry is always a no-op, never a 500.

## Rev 3 disposition (what changed since Rev 2)
Codex R2 confirmed the two structural fixes are genuinely closed: **#1** (separate anon function, no dual-auth) and **#2** (service-only resolver → redacted DTO). It approved **#3** (bookingCore as real extraction) and **#10** (RPC hygiene). The remaining 6 blocking items were all "requirement stated, contract left open." Rev 3 makes each an implementable contract, and folds in two product decisions from Joshua:
- **Legacy `/schedule/pass/:token`: RETIRE ENTIRELY** (remove route + delete token path; kills the pre-existing PII leak).
- **60→70: UPDATE ALL ACTIVE PASSES to 70** (`WHERE status='active'`); booked redemption durations always preserved. No custom-length passes exist, so no marker column.

## Goal (one line)
Give Joshua a per-student "Copy link" button that copies a stable, personalized, unguessable public URL (`/book/<firstname>-<code>`); a student opens it **without logging in** and books a 1:1 **70-min** session Calendly-style, spending their own credits; the same Calendly-style UI also replaces the existing in-app `/booking` page.

## Locked decisions (from grill — all confirmed)
1. Per-student link, carrying that student's pass/credits. 2. No login (token = credential). 3. Token carries identity (no form). 4. One stable link; admin can Regenerate + Revoke; no time-expiry. 5. URL `lsatprep.study/book/<firstname>-<code>`. 6. Calendly-clone UI for BOTH the public page AND the in-app `/booking`. 7. Same booking engine (confirm dialog → Google event + Meet + credit −1 + both emails + confirmation screen; zero credits → "contact Joshua"). 8. Student added as attendee (native calendar invite). 9. Backend-enforced concurrency. 10. Multiple bookings up to credits; cancel/reschedule admin-only.

## Locked config
Session **70 min** · buffer **15 min** · spacing **30 min** · min notice **24 h (1440 min)** · availability = seeded Weekly Hours minus Google conflicts, next-24h, buffers.

---

## Corrected ground truth (Codex R1 — verified against code, replaces Rev-1 false claims)
- **`_shared/bookingCore.ts` does NOT exist** (only `googleCalendar.ts`, `platformResourceResolver.ts`, `sessionIngestCore.ts`, `transactional-email-templates`). Slot-gen + book logic is **duplicated** in `student-booking/index.ts:132-395` and `booking-pass/index.ts:90-323`. Extraction is real work, not an assumed boundary (R1 #3).
- **`booking-pass/index.ts` `publicPass()` leaks PII:** returns `student_name` AND `student_email` to the browser (lines ~36-48). `/schedule/pass/:token` is public in `App.tsx:154` (R1 #8).
- **Legacy token route is independent:** `booking-pass/index.ts:65-69` resolves by `token_hash` directly; rotating a slug would NOT kill an old `/schedule/pass/:token` URL (R1 #4).
- **Both booking paths accept arbitrary `start_at`** after only lead-time + expiry checks (`student-booking/index.ts:209-215`, `booking-pass/index.ts:154-160`) — no server-side availability/spacing/buffer enforcement at booking time (R1 #5).
- **Google event is created BEFORE `redeem_booking_pass`** in both paths (`booking-pass/index.ts:197-210`, `student-booking/index.ts:260-273`); `freeBusy` failure is ignored → orphaned-event risk on crash (R1 #9).
- **RPC hygiene proven only for `grant_booking_access` + `get_student_booking`** (`20260718181203...:71-115, 126-190` — `SET search_path=public`, service-role only). The existing "regenerate" is a bare edge-fn `token_hash` update (`booking-pass-admin/index.ts:152-163`) — NOT an atomic RPC (R1 #10).
- **60 is hardcoded in 5 places:** table default (`20260708111013...:11`), grant RPC fallback (`20260718181203...:106`), admin fn default (`booking-pass-admin/index.ts:70`), teacher UI (`StudentBookingPanel.tsx:18`), standalone UI (`BookingPasses.tsx:49,200`) (R1 #11).
- **No booking-specific tests exist** in the repo (R1 #13).
- **Timezone drift:** `student-booking` uses host-local availability (`:156-195`); legacy token path uses a client offset + hardcoded 9–20h (`:123-143`) (R1 #12).

---

## Design (Rev 2)

### A. Architecture decision — SEPARATE public function, no dual-auth (closes R1 #1, #2)
Do **not** add a JWT-or-slug resolver to `student-booking` — Supabase's browser client can auto-attach a logged-in user's JWT, so a public-link request could render one student's slug but book against the JWT user's pass (R1 #1). Instead:
- **New edge function `public-booking/index.ts`** — anonymous, slug-only. Never reads `Authorization`. Uses the service key internally (like `booking-pass` today). Actions `info` / `slots` / `book`, body `{slug, action, start_at?}` only.
- `student-booking` (authed, in-app) stays exactly as-is for logged-in students. Both call the **shared core** (D).
- **Two-layer resolver (R1 #2):** a **service-only** `resolve_booking_link_full(_slug)` RPC returns the **full pass row + identity** to the edge function ONLY (never the browser). The edge function then builds a **redacted public DTO** (credits, session length, status; NO email, NO full name, NO token_hash, NO slug, NO pass_id) for the client. The full row authorizes the booking core; the DTO is all the browser ever sees.

### B. Database — one migration `<ts>_public_booking_link.sql` (idempotent)
1. **`booking_slug text` column + partial `UNIQUE INDEX ... WHERE booking_slug IS NOT NULL AND status='active'`.** Slug = `<firstname>-<code>`; `<code>` = **≥128-bit CSPRNG**, base32/base58 (no ambiguous chars) → ~26+ char tail (R1 #7). The example is `josh-<~26 random chars>`, NOT `josh-8f3k`. The slug's tail is the bearer secret; store it, index it, **treat it exactly as sensitively as `token_hash`** — never in a student-readable view, never logged.
2. **`resolve_booking_link_full(_slug text)` RPC** — SECURITY DEFINER, `SET search_path=public`, fully-qualified objects, `REVOKE ALL FROM public, anon, authenticated`, `GRANT EXECUTE TO service_role` only. Matches only `status='active'`. Returns the full pass row (incl. `id`, `student_id`, `student_email`, `student_name`, credits, length). Constant-time-ish: single indexed equality lookup; returns null (not error) on miss so revoked/rotated/expired slugs read as "no longer active."
3. **`regenerate_booking_link(_student_id uuid, _new_slug text, _created_by uuid)` RPC** — SECURITY DEFINER, service-role only, per-student `pg_advisory_xact_lock`. In ONE transaction: rotate `booking_slug` to `_new_slug` **AND rotate `token_hash` to a fresh value** for that student's active pass, so the legacy `/schedule/pass/:token` URL dies at the same instant (closes R1 #4). Returns `no_active_pass` if none.
4. **Retire the legacy public leak — DECIDED: retire entirely (Codex R2 #1, R1 #8).** In this migration's companion code changes: **remove the `/schedule/pass/:token` `<Route>` from `App.tsx:154`, delete `src/pages/BookingPass.tsx`, and delete the anonymous token-resolution path in `booking-pass/index.ts` (the `rawToken`→`token_hash`→`publicPass` flow, incl. the `student_name`/`student_email` leak at `:36-48`).** `booking-pass` retains only any admin/authed actions it has that are NOT token-based; if the function is purely token-public, decommission it and remove its `config.toml` entry. `token_hash` stays a column (still rotated by regenerate as defense-in-depth) but is no longer a resolvable public credential. **No `/schedule/pass/:token` links are outstanding (Joshua confirmed)** so no redirect shim is needed; add a catch to return 410 Gone if one is hit.
5. **Server-side slot policy — concrete contract (Codex R2 #3, R1 #5).** Replace the current `redeem_booking_pass(_pass_id, _idempotency_key, _start_at, _end_at, _schedule_event_id, _google_event_id, _student_name, _student_email)` (which trusts caller `_end_at` and only conflict-checks `schedule_events`, `20260718234415...:1-73`) with a hardened RPC that **derives `_end_at` server-side** and **validates the slot in-transaction**. New signature:
   ```
   redeem_booking_pass_v2(_pass_id uuid, _idempotency_key text, _start_at timestamptz,
                          _schedule_event_id uuid, _google_event_id text,
                          _student_name text, _student_email text) RETURNS <existing shape>
   ```
   Inside, under the pass row lock (`SELECT ... FOR UPDATE`), in order, each RAISE with a stable SQLSTATE mapped to HTTP:
   - `_len := _pass.session_length_minutes; _end_at := _start_at + (_len || ' minutes')::interval;` — **end derived, never trusted**.
   - **Lead:** `_start_at >= now() + interval '1440 minutes'` else `slot_too_soon` (`P0425`).
   - **Boundary:** `_start_at` aligns to :00/:30 **in the host timezone** — compute `(extract(minute from _start_at AT TIME ZONE _host_tz))::int IN (0,30) AND extract(second ...)=0`. Host tz = `'America/New_York'` as a named constant (single source; matches the seeded Eastern hours).
   - **Availability:** `_start_at`..`_end_at` (converted to host-tz wall time) lies fully inside that weekday's seeded availability window from `booking_availability` (the table the Weekly Hours editor writes). DST-correct because the comparison is done in `_host_tz` wall-clock, not UTC offsets.
   - **Buffer + conflict:** the range `[_start_at - 15min, _end_at + 15min)` must not overlap any other `status='booked'` redemption OR any `schedule_events` row (`deleted_at IS NULL, status<>'cancelled'`). Overlap → `slot_conflict` (`P0409`). This subsumes the old `schedule_events`-only check and adds the 15-min buffer + the redemptions table.
   - Then the existing credit-decrement + insert. The `no_overlapping_bookings` EXCLUDE constraint stays as the final backstop.
   Slots endpoint stays advisory; **this RPC is the sole authority.** SECURITY DEFINER, `SET search_path=public`, REVOKE public/anon/authenticated, GRANT service_role.
6. **60→70 migration — DECIDED: update all active passes (Codex R2 #2, R1 #11).**
   - (a) Change the **default 60→70** in all 5 sites: table default (`20260708111013...:11`), `grant_booking_access` fallback (`20260718181203...:106`), `booking-pass-admin/index.ts:70`, `StudentBookingPanel.tsx:18`, `BookingPasses.tsx:49,200`.
   - (b) **Preserve booked durations:** the migration touches only `booking_passes`, never `booking_pass_redemptions`, so every booked session's `end_at - start_at` is untouched. Explicit and verified in tests.
   - (c) Bulk update: `UPDATE public.booking_passes SET session_length_minutes = 70 WHERE status = 'active' AND session_length_minutes = 60;` — idempotent (re-run is a no-op once all active rows are 70) and non-destructive (only active rows; exhausted/revoked/expired untouched). Joshua confirmed no intentional custom-length passes exist, so no marker column.

### C. Backend — `public-booking/index.ts` (new, anonymous) — concrete abuse controls (Codex R2 #6, R1 #6/#7)
- **`config.toml`:** add `[functions.public-booking]` with `verify_jwt = false` (matches the `booking-pass` pattern at `config.toml:36-37`). The function reads no `Authorization` header at all.
- **Rate limiting — concrete:** a `booking_link_hits(ip_hash text, slug text, action text, window_start timestamptz, count int, PRIMARY KEY(ip_hash, slug, action, window_start))` table with a service-only `bump_booking_hit(_ip_hash, _slug, _action)` RPC doing an atomic `INSERT ... ON CONFLICT ... DO UPDATE SET count = count + 1 RETURNING count` against a **1-minute tumbling window** (`window_start = date_trunc('minute', now())`). Limits: **`info`/`slots` = 20/min per (ip,slug); `book` = 5/min per (ip,slug) and 10/min per ip across all slugs.** Over limit → `429` uniform body. `ip_hash` = sha256 of the **first hop of `x-forwarded-for` as set by the Supabase edge** (documented untrusted-but-best-available; not used for auth, only throttling). A daily cron prunes rows older than 1 day (retention).
- **Invalid-slug lockout:** track invalid-slug attempts per `ip_hash` in the same table (`slug='__invalid__'`); after 10 misses/min return `429` for that ip for the rest of the window (blunts enumeration despite the 128-bit space).
- **Uniform miss response:** any non-resolving slug (revoked, rotated, expired, typo) → identical `{error:"invalid_link"}` + `404`. No signal distinguishing them.
- **Headers:** JSON responses carry `Cache-Control: no-store`. **`Referrer-Policy: no-referrer` is set on the SPA document response for `/book/*`** (Codex R2 #6 — a header on the JSON API doesn't govern document navigation), configured at the hosting/`index.html` meta level: add `<meta name="referrer" content="no-referrer">` so the public page never leaks the slug via `Referer`. Body-size cap: reject `Content-Length > 2KB`.
- **No third-party resources** on the `/book/*` page (no external fonts/analytics/CDNs) so the slug can't leak via cross-origin requests.
- **Actions:** `info` → `resolve_booking_link_full` (service-only, B2) → redacted DTO (credits/length/status only). `slots` → shared `generateSlots` from the resolved pass. `book` → shared pipeline calling `redeem_booking_pass_v2` (B5) which enforces the slot in-txn; identity comes ONLY from the resolved pass row (never body); email = the pass's `student_email` (or profile email looked up server-side by `student_id`).

### D. Shared core extraction + durable reservation state machine (Codex R2 #4, R1 #3/#9)
- Create `_shared/bookingCore.ts` by extracting the duplicated logic into: (i) pure `generateSlots({availability, existing, nowUtc, hostTz, cfg})` with cfg `{sessionMin:70, bufferMin:15, stepMin:30, leadMin:1440}`; (ii) `bookSession({pass, identity, startAt})` taking an **already-authorized** `{pass, identity}`, never deriving identity. `student-booking` (JWT identity) and `public-booking` (slug identity) both call it. Parity: port `booking-pass`'s behavior and `student-booking`'s behavior into ONE implementation and diff outputs against both in tests before deleting the originals.
- **Reservation state machine (resolves the Rev-2 contradiction — reserve-first, DB is source of truth):**
  1. **RESERVE (in-txn):** `redeem_booking_pass_v2` (B5) validates the slot, decrements credit, and inserts the redemption with `status='booked'`, `google_event_id=NULL`, `needs_gcal_sync=true`, and a stamped `idempotency_key` (client-supplied UUID; the row's unique `idempotency_key` makes a retried `book` a no-op that returns the existing row). Commit. **Credit is now spent and the slot is held by the EXCLUDE constraint.**
  2. **GOOGLE:** create the event + Meet with `extendedProperties.private = {redemption_id, idempotency_key}` (the stamp that lets the reconciler find/dedupe it) and the student as attendee + `sendUpdates:"all"`.
  3. **PERSIST:** `UPDATE redemption SET google_event_id=..., meet_url=..., needs_gcal_sync=false WHERE id=... AND google_event_id IS NULL` (guard so a reconciler that already filled it isn't clobbered).
  - **Crash/failure matrix (no contradiction):**
    - Crash **after step 1, before step 2:** row is `booked, needs_gcal_sync=true, google_event_id=NULL`. Reconciler creates the event (idempotent: first searches Google by `extendedProperties.private.idempotency_key` to avoid a duplicate) then does step 3. **Credit stays spent; the booking is honored.** (We do NOT roll back — the student's slot is real; we owe them the Google event.)
    - Google **hard-fails at step 2** (e.g. 4xx that won't succeed on retry): reconciler retries with backoff up to N=5; on terminal failure it **flags the row for admin** (`needs_gcal_sync=true` + a `gcal_error` note) and alerts — it does NOT auto-cancel a paid booking silently. Admin resolves. (Chosen over auto-refund because a silent credit-restore on a slot the student thinks they hold is worse than an admin ping.)
    - Crash **after step 2, before step 3:** event exists but `google_event_id` unpersisted → row still `needs_gcal_sync=true`. Reconciler finds the event by the stamped `idempotency_key`, adopts it (no duplicate created), completes step 3.
  - **Reconciler:** extend `gcal-sync-pull` (or new `gcal-reconcile`, cron) — sweeps `booking_pass_redemptions WHERE status='booked' AND needs_gcal_sync=true AND updated_at < now()-2min`; for each, search Google by `extendedProperties.private.idempotency_key`; adopt-or-create; complete step 3; on ≥N failures flag for admin. Idempotent by the stamp. There is **no "orphaned event after rollback" case** because step 1 never rolls back post-commit — the reserve-first design removes that branch entirely.

### E. Backend — `booking-pass-admin` + atomic slug-at-grant (Codex R2 #5)
- **Slug generation is folded INTO the grant RPC — no window where a pass exists without a link.** Extend `grant_booking_access` to take `_booking_slug text` (caller-generated: `<sanitized-firstname>-<128bit-code>`), so the revoke-prior + insert-new + slug-set all happen in the one existing advisory-locked transaction. New signature adds `_booking_slug` as the final param; the INSERT sets `booking_slug=_booking_slug`. **Collision handling:** the edge fn generates the code from a CSPRNG (≥128 bits → collision probability negligible); if the unique index nonetheless raises `23505` on `booking_slug`, the edge fn regenerates and retries (max 3) — the RPC itself just surfaces the error, no partial state (single txn). This removes Rev-2's "admin fn stores slug separately" failure window entirely.
- `get_for_student { student_id }` → `{...redacted summary, booking_url: "https://lsatprep.study/book/<slug>"}` — admin-only fn, returning the URL here is fine.
- `regenerate_link { student_id }` → calls `regenerate_booking_link` (rotates `booking_slug` AND `token_hash` atomically under the per-student advisory lock, B3), returns new `booking_url`. Edge fn generates the new slug/code + retries on collision, same as grant.
- Revoke unchanged (status flip kills `resolve_booking_link_full` since it matches `status='active'` only; verified in tests).

### F. Frontend
- `src/components/booking/CalendlyBookingCard.tsx` — shared two-column Calendly UI (left static host card "Joshua / 1:1 LSAT Session / 1 hr 10 min / Google Meet link provided on confirmation"; right month picker + 30-min slots + student-local timezone). Confirm dialog → confirmation screen. Zero credits → "no sessions available, contact Joshua." **Renders NO student PII** (host is always "Joshua"; the page never shows the student's own name/email — it's their link, they know who they are).
- Public route `/book/:slug` → `src/pages/PublicBooking.tsx`, **not** `ProtectedRoute`, no app chrome; calls `public-booking`. Invalid slug → "This booking link is no longer active."
- In-app `/booking` (`Booking.tsx`, authed) re-rendered with the SAME `CalendlyBookingCard`, fed by `student-booking`.
- Teacher `StudentBookingPanel.tsx`: add **Copy link** (copies `booking_url`, toast) + **Regenerate link** (tucked, confirm "invalidates the old link") grouped with Reset/Revoke; UI copy notes Revoke also disables the link.
- Register `/book/:slug` as a public route in `App.tsx` (peer of the retired `/schedule/pass/:token`).

## G. Tests — operational strategy (Codex R2 #7, R1 #12/#13)
**Runner + fixtures:** Vitest (already wired, `npm run test`). Two layers:
- **SQL/RPC layer:** a `supabase/tests/booking/*.test.ts` suite that runs against a **local `supabase db` instance** (or a disposable branch) seeded by a fixtures SQL file (a test student `auth.users` row, a `booking_availability` row set, a granted pass). RPCs (`redeem_booking_pass_v2`, `grant_booking_access`, `resolve_booking_link_full`, `regenerate_booking_link`, `bump_booking_hit`) are called via a service-role supabase-js client and asserted on returned rows + raised SQLSTATEs. Concurrency tests fire two `Promise.all` calls at the same slot/grant and assert exactly one wins.
- **Edge-fn layer:** import the `public-booking`/`bookingCore` handlers with a **`GoogleCalendar` mock contract** — an injected interface `{insertEvent, patchEvent, getEvent, deleteEvent, freeBusy, searchByPrivateProp}` (extract this seam during D so tests don't hit Google). Mock returns deterministic event ids + can be told to throw at step 2 / step 3 to exercise the crash matrix.

**Cases:** resolver active-only match; redacted DTO never leaks email/name/token_hash/slug; non-enumerable (uniform miss); **public fn ignores Authorization even when a valid JWT is present** (R1 #1); grant is atomic incl. slug (no window); regenerate rotates slug AND token_hash, old slug + old `/schedule/pass/:token` both 404/410; revoke disables link; slug ≥128-bit + collision-retry path; **`redeem_booking_pass_v2` rejects** off-:00/:30, outside availability, <1440min lead, buffer-violating, caller-supplied end ignored (derived in SQL) (R1 #5); reservation state machine — crash after reserve→reconciler adopts/creates by stamp, no duplicate; Google terminal-fail→flagged for admin, credit stays spent; idempotency_key retry is a no-op (R1 #9); rate-limit 20/5/10 thresholds + invalid-slug lockout + `no-store` + body cap (R1 #6/#7); `UPDATE ... WHERE status='active' AND session_length_minutes=60` sets 70, leaves exhausted/revoked + booked redemption durations untouched, re-run no-op (R1 #11); DST-boundary slot gen in `America/New_York`, student-local display tz, expiry-at-window-end, confirmation-email tz (R1 #12); both confirmation emails fire + attendee/`sendUpdates` present; zero-credit book rejected.

## Verification (hard gate)
`npm run typecheck` + `lint` + `test`. Live drive (integrated browser): admin grants test student → **Copy link** → open `/book/<slug>` **logged out** → Calendly UI, 70-min slots only inside seeded windows, ≥24h out, 30-min spaced, no conflicts, no student PII on page → confirm dialog → book → Google event + Meet + student attendee/invite + both emails → credits −1 → reload shows one fewer → **Regenerate** → old `/book/<slug>` AND old `/schedule/pass/:token` both dead → Revoke disables link → in-app `/booking` shows identical UI. Deploy `public-booking` + `student-booking` + `booking-pass-admin` + migration on Lovable first.

## Out of scope
Student self-cancel/reschedule (admin-only). Host-card photo/custom copy. Multiple durations. Time-based expiry. Auto-sending links.

## Open flags for Joshua (post-review)
- None blocking. Both prior flags (legacy route, 60→70 cohort) are now DECIDED and specified above.

## Review targets for Codex (Rev 3 — closes R2 #1-7)
1. R2#1: legacy `/schedule/pass/:token` fully retired (route + page + token path + PII leak deleted); 410 on stray hits. Nothing public returns name/email.
2. R2#2: `UPDATE ... WHERE status='active' AND session_length_minutes=60 SET 70` — non-destructive, idempotent, booked durations preserved (redemptions table untouched)?
3. R2#3: `redeem_booking_pass_v2` signature drops caller `_end_at`, derives end in SQL, enforces lead/boundary/availability/buffer in host tz under the row lock. Arbitrary `start_at` truly impossible? DST predicate sound?
4. R2#4: reserve-first state machine + `extendedProperties` stamp + reconciler adopt-or-create; the crash matrix has no contradiction and no orphan/duplicate branch. Terminal-fail flags admin rather than silent refund — acceptable?
5. R2#5: slug folded into `grant_booking_access` (atomic, no linkless window) + collision-retry. Sound?
6. R2#6: concrete rate limits (20/5/10 + invalid lockout), atomic `bump_booking_hit`, `no-store` on API + `no-referrer` meta on the `/book/*` document, body cap, `verify_jwt=false` in config.toml. Sufficient?
7. R2#7: test strategy is now operational (local db + service client for RPCs, injected GoogleCalendar mock seam for the crash matrix). Adequate to gate shipping?
