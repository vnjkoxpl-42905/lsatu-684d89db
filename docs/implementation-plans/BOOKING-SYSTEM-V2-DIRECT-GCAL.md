# LSAT U Booking System v2 — Direct Google Calendar, Calendly-grade

## Context

The existing booking-pass system (prepaid session credits on private links) is ~70% built and solid: `booking_passes` + `booking_pass_redemptions` tables, an atomic `redeem_booking_pass()` RPC, and `booking-pass` / `booking-pass-admin` edge functions. But every Google Calendar call today routes through the **Lovable connector gateway** (`connector-gateway.lovable.dev`), which the prior audit named as the top risk: it likely strips the query params and body fields required for Google Meet auto-creation, attendee invitations, and `sendUpdates`. The gateway also gives us no control over `freeBusy`.

This build does two things at once:
1. **Cut all Google Calendar access over to direct Google OAuth** (no Lovable gateway, no Gemini or any AI API), giving us full control of Meet links, attendees, invite emails, updates, cancellations, and live availability.
2. **Finish the booking product to Calendly/Cal.com quality** and **resolve every finding** from `docs/implementation-plans/booking-system-plan-AUDIT.md`.

Decisions locked with Joshua: migrate **all four** calendar functions to direct OAuth in this build; calendar is a **Google Workspace** account, so use an **OAuth refresh token** (works for Meet + invites, proven in-repo by `ta-agent`). Keep prepaid credits, availability rules, booking permissions, and student access inside LSAT U. Terminology: never "pass"/"package" in the UI — "prepaid sessions", "X sessions remaining", "let this student schedule N sessions".

The full existing plan is `docs/implementation-plans/booking-system-plan.md`; this supersedes its section 5.3 (gateway) and folds in the audit. On execution, update that file to point here.

---

Post-review refinements folded in (from Joshua's technical review): DB-level slot exclusion constraint, multi-calendar busy checks, multi-window overrides, student RPC instead of view, single-logistics-email rule, best-effort Meet, private event metadata, scheduled sync in core, token health alert, idempotent cancel. Rejected as overengineering for a one-tutor system: app-level slot holds, booking state-machine framework, transactional outbox, Connect/Reconnect OAuth UI as a v1 gate.

---

## Prerequisite — COMPLETE (2026-07-12)

OAuth setup is done. Supabase secrets stored: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_CALENDAR_REFRESH_TOKEN`.

> [!warning] Phase 0 must still confirm the OAuth app status is **Internal (Workspace)** or published "In production". A "Testing"-status app issues refresh tokens that expire in **7 days**, which would silently kill booking weekly. If the token dies during Phase 0-1 testing, this is the first suspect.

**Token health alert (core, not optional):** a small pg_cron job (mirror the `process-email-queue` cron pattern in `supabase/migrations/20260506124847_email_infra.sql`) hits a lightweight edge action that exchanges the refresh token; on failure it emails Joshua via `send-transactional-email`. Silent token death is the main long-term risk of the manual-token approach; this kills it. A full Connect/Reconnect OAuth UI is deferred to Phase 6.

Mirror of the existing pattern in `supabase/functions/ta-agent/index.ts` (Gmail refresh-token exchange) — same shape, Calendar scope.

---

## Architecture: direct Google helper (replaces the gateway)

New shared module **`supabase/functions/_shared/googleCalendar.ts`**:
- `getAccessToken()` — POST `https://oauth2.googleapis.com/token` with the three secrets, `grant_type=refresh_token`; cache the access token in module scope for the invocation. Copy the exchange from `ta-agent/index.ts:361-374`.
- Thin wrappers over `https://www.googleapis.com/calendar/v3` (real host, not the gateway):
  - `insertEvent(calendarId, body, { conferenceDataVersion:1, sendUpdates })`
  - `patchEvent(calendarId, eventId, body, { conferenceDataVersion:1, sendUpdates })`
  - `deleteEvent(calendarId, eventId, { sendUpdates })`
  - `listEvents(calendarId, params)` (for sync-pull, keeps `syncToken`/`pageToken`)
  - `freeBusy(calendarIds, timeMin, timeMax)` → POST `/freeBusy`
  - `listCalendars()` → GET `/users/me/calendarList`

Then rewrite the four functions to call this helper instead of the gateway, dropping `LOVABLE_API_KEY` + `X-Connection-Api-Key` from the calendar path:
- `supabase/functions/gcal-event-write/index.ts`
- `supabase/functions/gcal-list-calendars/index.ts`
- `supabase/functions/gcal-sync-pull/index.ts` (preserve its incremental `syncToken`/410-retry logic; only the fetch/auth layer changes)
- `supabase/functions/booking-pass/index.ts`

Google Meet: on insert/patch, `conferenceData: { createRequest: { requestId: <idempotency_key>, conferenceSolutionKey: { type: "hangoutsMeet" } } }` with `?conferenceDataVersion=1`. Read the Meet URL from `entryPoints[]` (type `video`); if `conferenceData.status` is `pending`, one short `events.get` retry before returning (audit-consistent).

---

## Data model (one migration)

New tables:
- **`booking_availability`** (singleton `id=1`, `CHECK (id=1)` like `gcal_sync_state`): `timezone` IANA default `America/New_York` (confirmed as the primary calendar tz in Phase 0), `min_notice_minutes` default 720, `buffer_before_minutes`, `buffer_after_minutes`, `slot_increment_minutes` default 30, `daily_cap` nullable, `future_days` default 21, **`busy_calendar_ids` text[] default `'{}'`** (extra conflict-check calendars; UI for it is Phase 6, column exists from day one because retrofitting is painful and `freeBusy.query` takes multiple ids natively — the write calendar stays `gcal_sync_state.calendar_id`).
- **`booking_availability_rules`**: `weekday` 0-6, `start_minute`, `end_minute` (minutes from local midnight); multiple rows/day.
- **`booking_availability_overrides`**: `date`, `is_closed` bool, `start_minute`/`end_minute` — **multiple rows per date allowed**, same shape as weekly rules, so "Jul 27: open 9-11 and 2-5" works. `is_closed=true` row closes the whole date.

**Double-booking is solved at the database, not by freeBusy:** enable `btree_gist` and add an exclusion constraint on redemptions:
```sql
ALTER TABLE booking_pass_redemptions ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (tstzrange(start_at, end_at) WITH &&) WHERE (status = 'booked');
```
The existing `redeem_booking_pass` locks the *pass*, not the *slot*, so two different grants racing the same time never contend; this constraint makes that race impossible regardless of interleaving. freeBusy remains a freshness signal for display, never the correctness mechanism. Constraint violation in the RPC maps to the existing `slot_conflict` error.

Alters:
- **`booking_passes`** add: `session_label` nullable, `allow_self_reschedule` bool default false, `allow_self_cancel` bool default false, `cancel_cutoff_minutes` int default 720, `granted_minutes` int, `used_minutes` int default 0, `mode` text default `'sessions'`. Backfill `granted_minutes = total_credits * session_length_minutes`, `used_minutes = used_credits * session_length_minutes`.
- **`booking_pass_redemptions`** add: `meet_url` text, `cancelled_at` timestamptz, `cancel_reason` text, `rescheduled_from_id` uuid self-ref, `credit_refunded` bool default false.

RLS:
- Availability tables: admin-only write; edge functions read via service role (no student-facing read needed — slots are computed server-side).
- **Student self-read (audit A1):** a SECURITY DEFINER RPC **`get_my_booking_grants()`** returning an explicit typed rowset (grants + their redemptions) filtered `student_id = auth.uid()`, which structurally **never selects `token_hash`**. RPC over a view: no `SELECT *` leak path, easier to audit.

New/updated RPCs (mirror the `FOR UPDATE` lock pattern of `redeem_booking_pass`):
- **Update `redeem_booking_pass`**: also `used_minutes = used_minutes + session_length` (audit A6); map the exclusion-constraint violation to `slot_conflict`.
- **`cancel_booking_pass_redemption(_redemption_id, _admin_override bool)`**: DB-first (audit A3). Lock grant, mark redemption `cancelled` + `cancelled_at`; if outside `cancel_cutoff_minutes` OR `_admin_override`, refund `used_credits-1` / `used_minutes-duration`, set `credit_refunded=true`, reactivate `exhausted→active`. If grant is `expired`, refund the counters but keep status `expired` (audit B4). Late cancel inside cutoff: mark cancelled, no refund (forfeit). **Idempotent: if the redemption is already `cancelled`, return success without touching counters** (a double-click must never double-refund).
- **`reschedule_booking_pass_redemption(_redemption_id, _new_start, _new_end, _admin_override)`** (audit A2): atomically re-check conflict (the exclusion constraint enforces it anyway) and update the redemption's times only — **no credit churn, no re-redeem**. Google side is an `events.patch` that preserves the existing Meet link. Ordering: **patch Google first, then the RPC; if the RPC fails, compensate by re-patching Google back to the old times** (old times are in memory), so the original booking is never lost.

---

## Backend edge actions

`supabase/functions/booking-pass/index.ts` (public, token-gated; **also accept a student JWT** whose `auth.uid()` matches `student_id`, for the `/schedule` path — audit A1):
- **Rewrite `slots`** (audit A7): compute each day's windows in the **tutor's IANA tz** (override rows if present for that date, else weekly rules), subtract **live `freeBusy`** intervals queried in **one call covering the whole range** across `[calendar_id, ...busy_calendar_ids]` (half-open `[start,end)`), apply buffers, honor min-notice, step by `slot_increment_minutes`, enforce `daily_cap`, stop at `future_days`/expiry. Return a **flat ISO slot list**; the client groups by date in the **viewer's** tz. Keep `schedule_events` as a defensive cache but prefer `freeBusy` for freshness (display only; correctness is the exclusion constraint).
- **Harden `book`**: run live `freeBusy` conflict check before writing (audit A5). Ordering to avoid invite spam (audit A4): **insert the Google event WITHOUT attendees → run `redeem_booking_pass` → on success `events.patch` to add attendee + `conferenceData` with `sendUpdates=all`.** On redeem failure, delete the (attendee-less, un-emailed) event. Meet `requestId = idempotency_key` (audit B2). Store `meet_url`. Set **`extendedProperties.private = { lsatu_redemption_id, lsatu_pass_id }`** on every booked event so sync-pull can classify bookings vs manual events without a DB round-trip.
- **Meet is best-effort, never blocking:** the booking is confirmed the moment the credit redeems. If `conferenceData.status` is `pending` after 1-2 short `events.get` retries, confirm anyway with "your Meet link is in the calendar invite" and backfill `meet_url` on the next sync. A pending conference must never fail a paid booking.
- **Google failure handling (no outbox):** 2-3 inline retries on transient 5xx; for the one post-commit obligation (cancel's Google delete), on persistent failure set a `needs_gcal_sync` flag on the redemption for the scheduled sync to reconcile. Book-path failures are synchronous and surface to the user directly.
- **Add `cancel`** and **`reschedule`** actions: enforce the grant's `allow_self_cancel`/`allow_self_reschedule` flags + cutoff **server-side** (never trust the UI); call the new RPCs + Google patch/delete with `sendUpdates=all`.
- **Rate limit** (audit B3): cheap per-IP/token throttle on `book`/`slots` to protect Google quota.

`supabase/functions/booking-pass-admin/index.ts` (admin JWT):
- **`add_credits`** (top-up: `total_credits += n`, `granted_minutes += n*len`, reactivate `exhausted→active`).
- **`update`** (edit self-manage flags / length / expiry / label).
- **On-behalf `cancel` / `reschedule`** (always `_admin_override=true`).
- **Availability CRUD** — `availability_get` / `availability_set` (rules + overrides + defaults) in **this** function, no new function (audit B1).
- Confirm one-time token display carries into the new hub; `rotate` re-mints when a link is lost (audit B6).

**Email rule — exactly one logistics email per event:** Google owns the logistics (invite with time + Meet link on book, cancellation notice on cancel, update on reschedule) via `sendUpdates=all`. The branded LSAT U email via `send-transactional-email` is **additive and distinct in purpose** — a warm "you're booked with Joshua, here's how to prep" that does not restate time/link — never a parallel copy of the Google invite. The optional 24h reminder (Phase 6) is also branded. This prevents the two-emails-per-action confusion.

---

## Frontend (Calendly-grade)

Match `src/pages/Schedule.tsx` (the repo's best calendar surface: `react-day-picker`, semantic tokens, `ViewToggle`, day `Sheet`) — **not** the current hardcoded zinc/amber `BookingPass`. Add `date-fns-tz` (repo has `date-fns@3`, no tz lib) for DST-safe IANA math. Reuse the `supabase.functions.invoke` `call()` wrapper pattern already in both pages.

**Student — `src/pages/BookingPass.tsx` rebuild** (route `/schedule/pass/:token`):
- Header: "You have **4 of 5** sessions remaining", name, session length.
- **Calendar month/week view** (`react-day-picker`) → pick day → real open slots in a clean list, in the **viewer's detected IANA tz** with a **visible, changeable tz label** (`Intl.DateTimeFormat().resolvedOptions().timeZone`) — this is net-new and directly fixes the audit's #1 Calendly support issue.
- Confirm → spinner → **dedicated success screen**: date/time, "Added to your Google Calendar," **Join with Google Meet** button; invite email noted.
- **Upcoming sessions** list with Reschedule / Cancel shown **only when the grant's flags allow**, each showing the cutoff ("free until 12h before").
- Warm empty state at 0 remaining / expired / revoked, no booking UI.
- Semantic tokens (light/dark), `framer-motion` polish, mobile pass.

**Signed-in students — `src/pages/Schedule.tsx`:** add a "Your sessions" section that calls `get_my_booking_grants()` and renders the same booking component without needing the raw link (audit A1).

**Admin — unify into `/teacher/schedule`** (`src/pages/teacher/TeacherSchedule.tsx`), the route `/teacher/weekly-plans` already redirects here (audit B1). Tabs:
1. **Availability**: weekly grid (Mon-Sun ranges) + date overrides + defaults (min-notice, buffers, increment, tz, `daily_cap` = max booked sessions per tutor-tz day across all grants, audit B5) + **live "what students see" preview**.
2. **Prepaid sessions**: "Let a student schedule N sessions" — student, count, length (default 60), optional expiry, optional allow-cancel/reschedule → private link + **copy button**; per-grant **add sessions** / pause / revoke / rotate / usage.
3. **Bookings**: all upcoming + past across students; on-behalf cancel/reschedule; open Google event / Meet link.

**Terminology sweep:** rename all UI copy to "prepaid sessions" / "sessions remaining"; remove "pass"/"credits"/"ticket" from student- and admin-facing strings (keep table/column names as-is to avoid a churn migration).

---

## Audit findings → resolution (all resolved)

| Finding | Resolved by |
|---|---|
| A1 signed-in student access | `get_my_booking_grants()` RPC (no token_hash) + JWT branch in `booking-pass` + `/schedule` "Your sessions" |
| A2 reschedule can't be one txn | `events.patch` + `reschedule_booking_pass_redemption` RPC, preserves Meet, no credit churn |
| A3 cancel ordering | DB-first refund RPC, then Google delete, flag on failure for `gcal-sync-pull` reconcile |
| A4 invite spam on failed book | insert w/o attendees → redeem → patch attendees+conference w/ `sendUpdates=all` |
| A5 book conflict only sees mirror | live `freeBusy` check at `book` |
| A6 `used_minutes` from day 1 | `redeem` + cancel RPCs maintain minutes |
| A7 slot tz mis-bucket | flat ISO slots server-side, group in viewer tz client-side |
| B1 unresolved "or"s | `/teacher/schedule`; singleton availability; CRUD in `booking-pass-admin` |
| B2 Meet requestId | reuse `idempotency_key` |
| B3 rate limiting | per-IP/token throttle on public fn |
| B4 refund vs expiry | refund counters, keep status `expired` |
| B5 daily_cap semantics | max booked sessions per tutor-tz day, all grants |
| B6 token display/rotate | carried into hub; rotate re-mints |
| B7 corsHeaders import | moot on gateway removal; verify import still resolves post-rewrite |
| C error-path verification | expanded checklist below |
| D solid foundations | preserved (locking, idempotency, rollback) |

---

## Build sequence (each phase shippable)

- **Phase 0 — Smoke-test direct OAuth (secrets already stored):** build `_shared/googleCalendar.ts`, then drive the full round trip through it:
  1. Exchange the refresh token for an access token (proves the three secrets).
  2. `GET /users/me/calendarList` directly against `www.googleapis.com` (proves scope + identifies the write calendar).
  3. Insert one **temporary** event with `conferenceDataVersion=1`, a Meet `createRequest`, and a test attendee, `sendUpdates=all` (proves Meet + invite email end to end).
  4. `events.patch` it (new time) — proves the reschedule primitive and that the Meet link survives a patch.
  5. `events.delete` it with `sendUpdates=all` (proves cancel + notification; leaves the calendar clean).
  6. Confirm **zero requests touch `connector-gateway.lovable.dev`** in this path (the helper only knows `oauth2.googleapis.com` + `www.googleapis.com`).
  Also verify the OAuth app status is Internal/Production, not Testing (7-day token expiry otherwise).
  *Gate: temporary event observed with a working Meet link, invite email received by the test attendee, patch kept the same Meet link, delete sent the cancellation, calendar back to clean.*
- **Phase 1 — Cut over + Meet on book:** rewrite all four functions to the direct helper; add Meet/attendee/`sendUpdates` with the A4 ordering + A5 live freeBusy + `extendedProperties` metadata; store `meet_url` (best-effort rule); success screen Join button + branded prep email (one-logistics-email rule); **schedule `gcal-sync-pull` + the token-health check on pg_cron** (both mirror the email cron; sync is currently manual-only, and Joshua editing Google directly is a likely event, so this is core, not deferred).
- **Phase 2 — Real availability:** migration for availability tables; rewrite `slots` (A7); admin Availability editor + live preview.
- **Phase 3 — Cancel / reschedule / refund:** schema fields + `cancel_`/`reschedule_` RPCs (A2/A3/A6/B4) + `cancel`/`reschedule` actions + student Upcoming list gated by flags + admin on-behalf.
- **Phase 4 — Admin hub + top-up + terminology + student /schedule:** unify `/teacher/schedule` tabs; `add_credits`; rename copy; `my_booking_grants` + `/schedule` surface (A1).
- **Phase 5 — Premium polish:** student page rebuild (calendar + slots + tz selector + success + motion), mobile, empty states. Match design system; touch nothing outside this feature.
- **Phase 6 (optional):** Mode B time-bank toggle; 24h reminder cron; UI for extra busy-check calendars (column ships in Phase 2); Connect/Reconnect Google Calendar OAuth UI (replaces the manual token).

---

## Verification (drive the real flow end to end; error paths mandatory)

Happy path: create "5 sessions" link → open as student in a private window → book a slot → real event on the Workspace calendar **with a Google Meet link** + student **receives the invite email** → shows 4 remaining → cancel outside cutoff → event deleted + credit back to 5 → reschedule → **same Meet link**, new time, unchanged credit → exhaust → booking UI stops. Confirm availability reflects a real busy block and the configured weekly schedule. Desktop + mobile.

Error paths (audit C):
- Late cancel (inside cutoff): forfeits the credit and says so.
- Cancel/reschedule with the toggle **off**: rejected **server-side**, not just hidden.
- Two browsers race the **same slot from two different grants**: exclusion constraint rejects one, mapped to `slot_conflict`, **no orphan Google event** (this is the race pass-level locking cannot catch).
- Double-click cancel: second call is a no-op, credit refunded exactly once.
- Reschedule where the DB update fails after the Google patch: event is re-patched back to the original time, booking intact.
- Google/OAuth 500 mid-book: clean error, no credit burned, no orphan event, **no invite email sent** (A4 ordering).
- Expired + revoked links: warm empty state; `book` returns 4xx.
- `transparency: free` Google event does **not** block slots.
- DST boundary week (next US/Canada fall-back Nov 1 2026): same wall-clock windows, no shift/double-book.
- Manual delete of a booked event in Google: `gcal-sync-pull` reconcile flags the redemption.
- Signed-in student with a grant sees it on `/schedule` and can book without the raw link; a student without a grant sees nothing (RPC returns zero rows).
- Post-cutover sweep: `grep -r "connector-gateway" supabase/functions/{gcal-*,booking-pass*}` returns nothing — no calendar path touches the Lovable gateway (the Drive/Gmail gateways in `gdrive`, `gmail`, `teacher-operator-chat`, `sessionIngestCore` are out of scope and stay).

UI-change gate (CLAUDE.md): every `src/pages`/`src/components` change viewed running in the app with a screenshot/DOM check before "done".

---

## Critical files
- New: `supabase/functions/_shared/googleCalendar.ts`; one migration under `supabase/migrations/`.
- Rewrite: `supabase/functions/{gcal-event-write,gcal-list-calendars,gcal-sync-pull,booking-pass,booking-pass-admin}/index.ts`.
- Frontend: `src/pages/BookingPass.tsx` (rebuild), `src/pages/teacher/TeacherSchedule.tsx` (hub), `src/pages/Schedule.tsx` (student "Your sessions"), `src/pages/teacher/BookingPasses.tsx` (fold into hub or retire).
- Reference (do not rebuild): `src/pages/Schedule.tsx` calendar patterns, `src/components/ui/calendar.tsx`, `ta-agent/index.ts` OAuth exchange.
- Add dep: `date-fns-tz`.
