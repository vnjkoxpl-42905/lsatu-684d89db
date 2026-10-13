# Booking unification — diagnosis and plan

Date: 2026-08-13
Trigger: Steven Morris cannot book. Booking on lsatprep.study is three systems wearing one coat.

## Root cause

Three booking paths exist side by side, and the good one is off by default.

**1. The in-app engine (`/booking`, `src/pages/Booking.tsx` → `student-booking`)**
This is genuinely good code. Reserve-first via `redeem_booking_pass_v2`, race-safe through a DB
exclusion constraint, idempotency-keyed, debits a credit, creates the Google Calendar event and
Meet link, sends a confirmation email, and lands on Schedule / Today / Classroom. It requires an
**active `booking_passes` row**, which only Joshua can create by hand in the teacher panel.

**2. The public link (`/book/:slug`, `public-booking`)**
Same engine, no login, identity from a per-student token. Also requires a pass. Only three
students have a slug today (sofia, vinay, yahunathan).

**3. Cal.com + Stripe payment links (`BookingOfferHub`)**
What everyone else actually gets. Cal.com bookings write to `external_booking_events` and mirror
to Google Calendar, but **never create a pass or a redemption**. Stripe payments add credits only
when the checkout email matches exactly one `profiles.email` row.

Net effect: pay and you *might* get credits. Book on Cal.com and nothing registers in the app.
Hold credits and the experience is good, but only if Joshua remembered to create the pass.

## Steven specifically

No booking pass (`students/steven-morris/live-status.generated.md`, read 2026-08-10). No `/book/`
slug (`students/roster.generated.md`). So `/booking` shows him the offer hub plus a "Schedule with
your pass" card in its no-access state. His only working path is the Cal.com link — the same link
behind the two sessions where he sat waiting alone (Gmail, 2026-07-27 and 2026-08-04).

## Verified defects

| # | Defect | Evidence |
|---|---|---|
| 1 | `cal.com/joshua-jtx5ud/session-link` is hardcoded as the primary "Book one session" CTA, with `credits: 0` so it can never produce bookable credit | `src/components/booking/BookingOfferHub.tsx:13-35`; `supabase/migrations/20260810000000_booking_commerce_hub.sql:17` |
| 2 | Cal.com bookings never become redemptions, and every student surface reads only redemptions, so a booked session displays as "Nothing booked" | `booking-commerce-webhook/index.ts:114`; `useClassroomHome.ts:314`; `useBookingScheduleItems.ts:57` |
| 3 | `unmatched_paid` is written and read by nothing. Money taken, no credits, no alert | `booking-commerce-webhook/index.ts:90` (only occurrence in the repo) |
| 4 | No student can cancel or reschedule. Endpoints expose only `info \| offer_click \| slots \| book` | `student-booking/index.ts:80-167`; `public-booking/index.ts:96-139` |
| 5 | A "Reschedule" pill navigates to a page with no reschedule control. Dead button, against the project's own rule | `ClassroomHomeView.tsx:300` |
| 6 | `student_booking_offers` has a read path and no write path anywhere. Per-student offer config is unreachable | only reference is `student-booking/index.ts:35` |
| 7 | `apply_booking_package_payment` tops up the newest pass regardless of status, forcing `status='active'` and `expires_at=NULL`, so a revoked or expired pass is silently revived | migration `:101-106` |
| 8 | A pass exists only when Joshua hand-creates one. There is no paid-to-pass path at all | `booking-pass-admin` `create` is the only writer |

## Plan

Principle: **one booking engine, the in-app one.** Cal.com stops being a booking surface for
anyone who has an account.

### Phase 0 — unblock Steven today (no deploy)
- Confirm from Stripe whether he has paid, and for how many sessions.
- Create his booking pass in the teacher panel with the credits he is owed.
- Generate his `/book/<slug>` link and send that, not the Cal.com link.
- Close the four related open loops in `students/steven-morris/open-loops.md`.

### Phase 1 — paying always produces credits
- Pass `client_reference_id` (the student's user id) on payment links launched from inside the
  app, so matching never depends on the email typed at checkout.
- On `checkout.session.completed` with no profile match, write a **pending credit** row keyed by
  email that redeems automatically at signup or first login.
- Surface unmatched payments in the teacher panel with one-click "attach to student."
- Alert Joshua on every unmatched payment. Silent is the current failure mode.

### Phase 2 — one front door

**Navigation (Joshua's call, 2026-08-13).** Today the side rail carries two separate entries,
`schedule` and `booking` (`src/lib/railCatalog.ts:62-63`), which is the navigational half of the
same fragmentation. Collapse them into **one rail tab** that opens a single main-stage surface
with **two tabs across the top of the stage**: `Schedule` and `Book a session`. One rail click to
get there, one tab click to move between seeing your calendar and adding to it.

- Rail: replace the `schedule` and `booking` entries with a single entry (keep the `schedule`
  id and `has_schedule_access` gating; drop `booking` from the catalog).
- Route: `/schedule` and `/booking` both resolve to the same shell, each selecting its tab, so
  every existing link and redirect keeps working. Tab state reflects in the URL.
- The top tab strip is fixed to the stage header, not the page body, so it stays put while the
  calendar scrolls.
- The `Reschedule` / `Book another` / `Book one` pills in Classroom home point at the Book tab.
- Verify across the full emulate matrix (narrow, mid, wide, sidecar-docked) before pushing, per
  the responsive gate in `CLAUDE.md`.

**The two routes are separate by design (Joshua's call, 2026-08-13).** This is the architecture,
not a compromise:

| Route | Where it lives | Credit system |
|---|---|---|
| **Package** (5-hour, 10-hour) | Strictly lsatprep.study, end to end. Stripe → credits → in-app calendar. Cal.com is not involved at any point. | Yes |
| **Single session** | Cal.com. This is the only place Cal.com is integrated. | No |

The Book tab renders **one route, not a menu**, chosen by the student's credit balance:

- **Credits > 0** → the tab opens straight onto the in-app calendar. Pick a day, pick a time,
  book. The single-session button stays **present but demoted**, since they have already paid and
  the calendar is their path.
- **Credits = 0** → the tab leads with a **"Single session"** button routing to the existing
  Cal.com link, alongside the 5-hour and 10-hour package buttons.
- One line of state at the top either way: "You have N sessions available" or "No sessions
  available yet."

**Cal.com bookings must register.** This is the heart of the complaint and the highest-value code
change, since Cal.com owns the single-session route. Today the webhook writes
`external_booking_events` and stops; every student surface reads only `booking_pass_redemptions`,
so a single session booked on Cal.com displays as "Nothing booked" and the student reasonably
concludes it did not work.

- Make single-session bookings visible on every student surface. Two implementations: promote each
  Cal.com booking into a redemption row, or teach the surfaces to read `external_booking_events`
  alongside redemptions. **Recommend the second here** — promoting into `booking_pass_redemptions`
  would put credit-system rows on the books for a route that has no credits, blurring exactly the
  separation this design depends on. Read both tables, display one merged list.
- **Never debit a credit for a Cal.com booking.** Single session and package are separate routes;
  the importer's job is visibility only.
- Backfill so past single sessions appear, including Steven's.
- A booked session then shows identically on Schedule, Today, Classroom home, and the Book tab,
  whichever route created it.

### Phase 3 — cancel and reschedule (deferred, by decision)
Joshua's call, 2026-08-13: policy is already handled by Cal.com's own flow and the credit system.
No in-app cancel or reschedule is being built. One cleanup still stands, because the UI currently
promises something that does not exist:

- The `Reschedule` pill in Classroom home (`ClassroomHomeView.tsx:300`) routes to a page with no
  reschedule control. Point it at the Cal.com reschedule link for Cal.com-sourced sessions, or
  remove it. A dead button breaks the project's own "no actions users cannot perform" rule.

### Phase 4 — no dead configuration
- Build the teacher UI for `student_booking_offers`, or drop the table.
- Fix `apply_booking_package_payment` to top up only an active pass and create a new one otherwise.

### Phase 5 — proof
- e2e: pay → credits appear → book in-app → shows on Schedule and Classroom.
- e2e: book via Cal.com → webhook fires → shows on Schedule and Classroom.
- Extend the booking health panel: unmatched payments, failed calendar syncs, orphan Cal.com
  bookings.

## Sequencing

Phase 0 today. Phases 1 and 2 ship as one deploy — they are the same problem from two ends, and
together they deliver the whole complaint: paying refills credits, booking registers, and there is
one place to see and do both. Phases 3 through 5 are cleanup and can trail.

## Decisions locked (2026-08-13)

1. **Two routes, separate by design.** Packages run strictly through lsatprep.study and the credit
   system. Cal.com is integrated at exactly one point: the single-session stage.
2. **Single session stays on Cal.com.** A button labeled "Single session" routes to the existing
   link. No Stripe single-session product.
3. **The single-session button is demoted, not hidden, when credits > 0.** The student has paid,
   so the calendar leads; the Cal.com button stays available but visually secondary.
4. **Cal.com bookings never debit credits.** The importer exists for visibility only.
5. **No in-app cancel/reschedule work.** Already handled by Cal.com and the credit system.
