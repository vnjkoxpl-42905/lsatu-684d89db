# Full-scale audit: scheduling on lsatprep.study

Date: 2026-08-13
Scope: everything a student or Joshua touches that means "when is this happening" — session
booking, calendar display, Google Calendar integration, Cal.com integration, availability
configuration, and the weekly study plan.

Method: read of the shipped code (`src/`, `supabase/functions/`, `supabase/migrations/`), plus
live reads of Stripe and the Cal.com bookings API.

**Verification gaps, stated up front.** Two things I could not check and did not guess at:
- **Live database state.** No service-role key is available locally, and the `lsat-u` MCP is not
  authorized in this session. Every claim about the DB below is from migrations and function code,
  not from rows.
- **Cal.com availability configuration.** The `CALCOM_API_KEY` in `.env` authorizes `/v2/bookings`
  but returns `UnauthorizedException` on `/v2/schedules` and `/v2/event-types`. So Cal.com's
  working hours, buffers, and conflict-calendar settings are unread. Where that matters below, it
  is marked **[unverified]**.

---

## 1. There are five things called "scheduling"

This is the finding everything else hangs off. A student can encounter five separate systems, and
nothing on the site tells them which one they are in.

| # | System | Entry point | Backed by | Credits? |
|---|---|---|---|---|
| 1 | **Pass booking (in-app)** | `/booking` | `student-booking` → `redeem_booking_pass_v2` | Debits |
| 2 | **Pass booking (public link)** | `/book/:slug` | `public-booking`, same core | Debits |
| 3 | **Cal.com booking** | Link in the offer hub | Cal.com, mirrored in by webhook | No |
| 4 | **Calendar display** | `/schedule` | `classroom_items` + redemptions + todos | n/a |
| 5 | **Weekly study plan** | Classroom home | `schedule_templates` | n/a |

Systems 1 and 2 are the same engine with two front doors, which is good design. Systems 3, 4, and
5 are genuinely separate, and 3 and 4 do not talk to each other at all.

---

## 2. What is actually good

Worth stating plainly, because the fix is not a rewrite.

- **The booking engine is well built.** `bookingCore.ts` uses a reserve-first state machine: the DB
  row commits with `gcal_state='pending'` via `redeem_booking_pass_v2`, which derives the end time
  and enforces the whole slot policy *inside the transaction*, then the Google event is created and
  persisted back. A crash between the two leaves a row the reconciler adopts. The booking is never
  silently lost.
- **Races are handled at the right layer.** A Postgres exclusion constraint is the hard guard, with
  a freshness re-check immediately before reservation. Not advisory locks, not optimistic retries.
- **Idempotency is real.** Provider event ids are the boundary for commerce; `idempotency_key` is
  the boundary for booking. A replayed request returns the existing row rather than double-booking.
- **Timezone handling is correct.** `hostLocalToUtc` double-settles the DST offset instead of the
  usual naive single pass. Availability is stored as host wall-clock plus an IANA zone, which is
  the right model.
- **Calendar recovery exists.** `gcal-reconcile` (1 min) claims a lease, searches Google by a
  stamped private property to adopt an orphan event, creates if absent, and marks `failed` after 5
  attempts rather than dropping a paid booking. `gcal-sync-pull` (5 min) pulls Google back in
  incrementally with a sync token.
- **Conflict detection is broad.** `loadBusyIntervals` unions the mirrored `schedule_events` table
  with a live Google `freeBusy` across the write calendar *and* configured `busy_calendar_ids`, so
  Joshua's personal commitments block student slots.
- **The public link leaks nothing.** `/book/:slug` never uses a JWT even if one is present, and the
  card renders no student PII — the host is always "Joshua".
- **Booking health telemetry is genuinely thorough** on the calendar dimension: pending and failed
  calendar actions bucketed by age, missing event ids, missing Meet links, duplicate events,
  mismatches.

The engine is not the problem. **The problem is that most students never reach it.**

---

## 3. Findings

### CRITICAL

**C1. A pass exists only if Joshua creates one by hand.**
`booking-pass-admin`'s `create` action is the only writer of `booking_passes` other than the Stripe
package webhook. There is no automatic path from "person exists" to "person can book." Every
student who has never been hand-issued a pass sees `/booking` in its no-access state.
*Consequence:* the good engine is off by default for everyone.

**C2. Cal.com bookings are invisible to every student surface.**
The webhook writes `external_booking_events` and mirrors to Google Calendar, but stops there.
Every student-facing surface reads only `booking_pass_redemptions`:
- `useClassroomHome.ts:314` — "next session"
- `useBookingScheduleItems.ts:57` — the `/schedule` calendar
- `CalendlyBookingCard` `UpcomingSessions` and `BookSessionPanel` — "your upcoming sessions"

*Consequence:* a student books a single session on Cal.com, it succeeds, and the platform tells
them **"Nothing booked."** This is the reported complaint, exactly.
*Status: partially fixed in the working tree — see §5.*

**C3. Cal.com single-session payments can never reach LSAT U.**
Verified live against Stripe. Cal.com charges through **its own** Stripe integration: the payment
intents carry `metadata.identifier = "cal.com"` and a `bookingId`, and produce **no checkout
session at all**. But `booking-commerce-webhook`'s Stripe branch only handles
`checkout.session.completed` matched against a `booking_offers.provider_ref` payment link
([index.ts:82-87](../supabase/functions/booking-commerce-webhook/index.ts:82)).
*Consequence:* single-session revenue is structurally invisible to the platform. Not a
misconfiguration — it cannot fire. Single-session payment recognition has to come through the
**Cal.com** webhook branch, not the Stripe one.

**C4. Package payments fail silently when the email does not match.**
`matchStudent` requires **exactly one** `profiles` row matching the checkout email (or display
name). Zero matches or two matches → the webhook writes an `unmatched_paid` row and returns.
`unmatched_paid` is written in one place and **read nowhere in the repo**. No teacher UI, no alert,
no queue.
*Consequence:* a student pays for a package with a different email than their account, gets no
credits, and nobody is told. The only recovery is Joshua noticing in Stripe.

### HIGH

**H1. Two independent availability calendars that cannot agree.**
LSAT U stores its own weekly hours in `booking_availability` (seeded Mon 2-8, Tue 1-7:30, Wed 1-7,
Thu 1-7:30, Fri 1-6:30, Sat 2-5, Sun closed) with its own timezone row, edited in the Weekly Hours
editor. Cal.com has a completely separate schedule **[unverified]**. Changing one does not change
the other.
*Consequence:* Joshua blocks off a Friday in LSAT U and Cal.com keeps selling it. Two sources of
truth for one fact.

**H2. Booking policy constants are duplicated, not shared.**
`BOOKING_CFG` sets a 70-minute session, 15-minute buffer, 30-minute grid, **24-hour** minimum lead
time, and 21-day lookahead. Cal.com has its own equivalents **[unverified]**. They currently agree
on 70 minutes by coincidence of configuration, not by construction.
*Consequence:* a student can book same-day on Cal.com but not in-app, and neither the student nor
Joshua is told why the two calendars show different openings.

**H3. Students cannot cancel or reschedule anything, and the UI says they can.**
`student-booking` and `public-booking` expose only `info | slots | book` (+ `offer_click`). There
is no cancel and no reschedule action on either. Yet:
- `ClassroomHomeView.tsx:300` renders a **"Reschedule"** pill that routes to `/booking`, where no
  such control exists. A dead button, against the project's own "no actions users cannot perform"
  rule.
- `StudentRedemption` carries `can_reschedule` and `reschedule_count` fields that nothing consumes.
*Consequence:* every change request becomes a message to Joshua. This is the single biggest source
of manual scheduling load.

**H4. Nothing surfaces or debits Cal.com bookings against credits.**
A student holding package credits can click the Cal.com link and take a session that never debits
a credit. Per the 2026-08-13 decision the single-session button stays visible (demoted) when
credits > 0, so this path stays reachable by design.
*Consequence:* accepted leak, but it should at least be **visible** to Joshua. Today it is not
counted anywhere.

### MEDIUM

**M1. `student_booking_offers` is read-only in practice.**
The table is selected in `student-booking/index.ts:35` and written **nowhere** — no admin UI, no
edge function action. Per-student offer configuration is unreachable without hand-editing SQL.
Worse, the read logic treats *any* row for a student as "this student has an arrangement" and then
filters every offer to only the enabled ones — so a single stray row silently hides all offers
from that student.

**M2. `apply_booking_package_payment` revives dead passes.**
Migration `:101-106` selects the newest pass by `created_at` **regardless of status**, then forces
`status='active'` and `expires_at=NULL`.
*Consequence:* buying a package resurrects a previously revoked or expired pass instead of opening
a clean one, carrying its history with it.

**M3. Booking health is blind to money and to Cal.com.**
`get_booking_health` reports eight calendar and upload metrics and zero commerce metrics. Unmatched
payments, Cal.com bookings with no matching student, and offer-click-to-purchase drop-off are all
invisible.

**M4. New passes default to a 70-minute session length in the payment path.**
`apply_booking_package_payment` hardcodes `session_length_minutes = 70` when creating a pass, while
the admin Settings screen lets Joshua pick a per-pass default that is stored **in browser
localStorage** (`SettingsSection.tsx`, "Saved on this device"). Two different defaults, one of them
device-local.

**M5. The student's calendar and the student's study plan are separate surfaces.**
`/schedule` composes classroom items + booked sessions + personal todos. The weekly study plan
(`schedule_templates`) renders on Classroom home instead. A student asking "what am I doing this
week" has to look in two places.

### LOW

**L1. Offer definitions are duplicated in code and in SQL.** `DEFAULT_BOOKING_OFFERS` in
`BookingOfferHub.tsx:13-35` hardcodes the same three offers the migration seeds, as a fallback.
Two places to change a price or a link.

**L2. The Cal.com single-session offer carries `credits: 0`,** so it can never produce bookable
credit even if the webhook did fire. Correct under the current design, but it means the offer row
exists purely as a URL holder.

**L3. Availability seeding is one-shot.** The migration only seeds if the table is empty, which is
right, but there is no way to reset to defaults from the UI.

---

## 4. Path-by-path: what a student actually experiences

**Student with credits (package holder).** Opens `/booking`, sees the offer hub *first* and their
actual calendar second, picks a day and time from real availability, confirms, gets a Google
Calendar invite with a Meet link, and sees the session on Schedule, Today, and Classroom home.
**This path works well.** Its only flaws are the offer hub sitting above the thing they came for,
and no way to change the booking afterward.

**Student without credits (most students).** Opens `/booking`, sees three buttons, and a "Schedule
with your pass" card telling them they have no access. Clicks "Book one session," leaves the
platform for Cal.com, books, pays — and the platform never learns any of it. Returns to
lsatprep.study and is told **"Nothing booked."**

**Student on a public link.** Same good engine, no login, no chrome. Only three students have a
slug.

**Joshua.** Issues passes by hand, sets LSAT U weekly hours in one editor and Cal.com hours
somewhere else, watches calendar health in a dashboard that cannot see payments, and personally
handles every cancel and reschedule request.

---

## 5. Changes already in the working tree

Two edits made before the audit was scoped, both against C2. Uncommitted:
- `supabase/functions/student-booking/index.ts` — the `external_booking_events` select now joins
  `schedule_events(meet_url)`, so a Cal.com booking carries a joinable Meet link.
- Same file — the joined row is flattened to a flat `meet_url` so the client sees one shape.

These are additive and safe, but incomplete: the client still drops `external_bookings` on the
floor (`useStudentBooking.ts` types only `{pass, redemptions}`). Finishing C2 means merging both
sources into one session list at the hook layer, which is where I would resume.

---

## 5b. Page-level audit: what the booking page actually looks like

Observed live on 2026-08-13 in the student tester account (`josh`, Student role) against the local
dev server, in the **has-credits** state (pass showing **5 sessions**). Desktop and 375px mobile.

### The single worst thing: the student is sold to before they are served

A student holding 5 paid sessions opens `/booking` and the **first and largest element on the page
is a three-up sales panel** — "Choose how you want to book," with **Buy 5-hour package** and **Buy
10-hour package** as the only two filled, high-contrast buttons on the screen. Their actual
calendar is below it under a heading that reads "Schedule with your pass."

Measured on mobile (375×812): the day-picker grid's top sits at **y ≈ 1227px** on an 1833px page.
**The thing they came for starts more than a full screen and a half down**, behind three purchase
CTAs. On desktop it is below the fold at the standard window height.

This inverts on every axis that matters. The two loudest controls on a page for a paying customer
are both "give us more money," and one of them ("Book one session") sends them **off the platform
to Cal.com to pay again for something they already have credit for**.

### Three visual languages in three adjacent surfaces

Same student, same session, three consecutive rail clicks:

| Surface | Palette | Type | Feel |
|---|---|---|---|
| Classroom home | warm cream, orange accent | serif display ("Good evening, josh") | editorial, branded |
| **Booking** | **dark maroon / burgundy** | sans throughout | transactional |
| Schedule | pure monochrome black/white/grey | sans | utilitarian, unstyled |

Booking pulls its own `booking-theme.css`. Nothing about the maroon appears anywhere else in the
student experience. The rail's own active state is charcoal, so even the nav and the page it opens
disagree. A student cannot tell these three screens belong to the same product.

### The credits pill is the least prominent element on the card

"**5** sessions" renders as small text in a low-contrast grey bar, tucked under the session
metadata. It is the single most important fact on the page — it determines which of the two paths
is even relevant to this student — and it is visually subordinate to "1 hr 10 min" and "Google
Meet link provided on confirmation."

### The Schedule page is empty and offers no way to fill it

`/schedule` renders a full month grid with **nothing in it**, then "Nothing scheduled," then
"Nothing has been intentionally scheduled yet." — despite this student having two assigned items
visible on Classroom home. There is **no "Book a session" control anywhere on the Schedule page**.
A student looking at an empty calendar has no in-place way to make it non-empty; they have to know
that a separate rail entry called "Booking" exists.

This is the strongest argument for the merge: the empty state of Schedule *is* the entry point to
Booking, and today they are two unconnected screens.

### The rail confirms the split

Under **SUPPORT**, the rail lists **Messages / Schedule / Booking** as three sibling entries.
Schedule and Booking are adjacent, cover the same concept, and open unrelated-looking pages.

### Availability reads as much thinner than it is

On the has-credits calendar, the first bookable day is **Monday Aug 17** — today is Thursday Aug
13. Fri 14 and Sat 15 are greyed. Friday is correctly excluded (its window closes at 6:30pm, and
the 24-hour lead pushes past it). **Saturday is greyed on every single week** (15, 22, 29), even
though `booking_availability` seeds Saturday 2:00pm-5:00pm, which fits four 70-minute slots.
Either Saturday hours were removed from the live table or the window is being dropped — worth
confirming in Weekly Hours. **[unverified — no live DB read]**

The first available day then offers only **three** slots (4:00, 4:30, 5:00 PM) against a seeded
Monday window of 2:00pm-8:00pm. The rest is presumably blocked by Joshua's Google Calendar, which
is the system working correctly, but the student sees a nearly-empty month and three times.

### Smaller page-level notes

- **"Schedule with your pass"** is internal vocabulary. Students bought a *package*; nothing in
  the purchase flow ever uses the word "pass."
- **The page has no app chrome** — a back arrow and a floating hamburger, no persistent rail. It
  reads as a standalone microsite bolted onto the product.
- **"Booking" + a generic "L" tile** is the page's entire identity. No student name, no context.
- **The floating help bubble overlaps the "Buy 10-hour package" button** on mobile.
- **Both offer-hub CTAs open off-site** with an external-link icon, with no warning that the
  student is leaving lsatprep.study or what returning looks like.

### What this means for the merge

The Phase 2 design already agreed (one rail tab, `Schedule | Book a session` on the stage) fixes
the navigation half. The page itself needs three more things to be genuinely seamless:

1. **Lead with state, not commerce.** Credits headline at the top; the calendar immediately
   under it; the offer panel demoted to a quiet "Need more sessions?" strip at the bottom, per the
   2026-08-13 demote-not-hide decision.
2. **One visual language.** Retire `booking-theme.css`; adopt the Classroom's warm palette and
   type so the three surfaces read as one product.
3. **Make the empty Schedule actionable.** Its empty state should be the Book entry point, not a
   dead end.

## 6. Recommended order

1. **C3 + C4 — make money visible.** Recognize Cal.com payments through the Cal.com webhook branch;
   surface and alert on `unmatched_paid`. Nothing else matters if revenue is invisible.
2. **C2 — make bookings visible.** Merge `external_booking_events` into the student session list so
   every booked session shows regardless of route. Backfill.
3. **H1 + H2 — one availability source.** Either drive Cal.com's schedule from
   `booking_availability` via its API, or accept Cal.com as authoritative and have LSAT U read it.
   Two hand-maintained calendars will drift again the week after they are aligned.
4. **H3 — self-serve cancel and reschedule**, or remove the Reschedule pill. Do not ship a control
   that does nothing.
5. **C1 — a default path to bookability**, so the engine is on for everyone rather than on request.
6. M1-M5, then L1-L3.
