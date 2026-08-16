# Fix booking links that aren't tied to a student account

## What's actually wrong

Vinay's pass exists and is healthy — 10 sessions, 2 used, 8 left, status active, link `/book/vinay-...`. The problem is that his pass row has **no student account attached** (`student_id` is empty), even though he has an account under the same email.

That breaks scheduling everywhere except the raw public link:

- Signed in, the in-app Booking page looks up a pass by account id, finds nothing, and tells him he has no sessions to book.
- File uploads attached to a booking fail for him (same account-id lookup).
- Sessions he books through the public link aren't linked to his account, so they don't show in his app schedule/history.

This is not unique to him. Three active passes are in this state: **Vinay, Asia, Dakota** — all three have matching accounts by email but no link. Everyone else's pass is already linked correctly.

## The fix

1. **Backfill (one-time data fix).** For every pass with no `student_id` whose email matches exactly one account, attach that account. Also attach past redemptions from those passes so booked sessions appear in the student's schedule/history.

2. **Stop it recurring at creation.** When a booking pass is created from the Teacher Desk with a student email, resolve that email to an account and store `student_id` on the pass. If no account exists yet, leave it null (public link still works).

3. **Self-heal on use.** In the two booking front doors:
   - Signed-in path (`student-booking`): if no pass is found by account id, fall back to matching an active pass by the signed-in user's email, and permanently attach it on first hit.
   - Public link path (`public-booking`): when a pass has no `student_id` but its email matches an account, attach it before booking so the redemption, uploads, and emails all land on the real account.

4. **Verify.** Re-run the pass/account join and confirm zero active passes are unlinked, then check Vinay's in-app Booking page shows 8 sessions remaining with open slots.

## Technical notes

- Data fix: SQL migration updating `booking_passes.student_id` from `auth.users` by lower-cased email (only where exactly one match), plus `booking_pass_redemptions.student_id` for those passes.
- Code: `supabase/functions/student-booking/index.ts` (`activePassRow` email fallback + write-back), `supabase/functions/public-booking/index.ts` (link-on-book), and the admin create path in `booking-pass-admin` (resolve email → `student_id`).
- No change to slug format, availability, credits, or existing Google Calendar events.
