# LSAT U Booking System Remediation Plan

Status: Phases 1 through 6 implemented. Phase 1 is live. Phases 2 through 6 are code-, migration-, build-, responsive-UI-, and targeted-test-verified locally as of 2026-07-20; production migration, cron installation, controlled weak-link rotation, and the final live matrix remain release gates.

Implementation commits:

- Phase 1: `e7666aad`, merged and published through `00b85185`.
- Phases 2 through 6: current implementation batch, pending production push and Lovable apply.

Targeted verification for Phases 2 through 6:

- `npm run test:booking`: 44 Vitest tests, 2 Deno core tests, and a real PostgreSQL 17 double-cancel concurrency test pass.
- `npm run typecheck`: passes.
- `npm run build`: passes.
- Public booking verified running locally at narrow, mid, and wide viewports with no authenticated overlays.

Date: 2026-07-20

Scope: Public booking links, authenticated student booking, pass administration, credits, availability, uploads, Google Calendar writes and synchronization, confirmation email, tests, deployment, and live verification.

This document supersedes the earlier booking v2 plan. It reflects the code that is currently in the repository and combines every confirmed finding from the 2026-07-20 end-to-end review.

## Outcome

The repaired system must guarantee all of the following:

1. Every URL issued by the admin opens a working booking page.
2. Public links are real bearer credentials with sufficient entropy.
3. Booking, cancellation, refund, and pass-state changes are atomic and idempotent.
4. Google Calendar and LSAT U converge after every create, move, or delete.
5. A recent Google event cannot be ignored merely because the local mirror is stale.
6. A student never loses access to an upcoming session or Meet link when the final credit is consumed.
7. File and note submission survives safe retries without duplication or orphaning.
8. Availability shown to a student is accepted by the booking RPC.
9. Every failure is observable, retryable where appropriate, and covered by an automated test.

## Release policy

Treat Phases 1 through 5 as one production-blocker program. Do not declare booking reliable after fixing only `/book/c`.

Each phase must satisfy its automated gate before the next phase begins. Database migrations are applied through Lovable Cloud and verified before dependent Edge Functions or frontend code are published.

No live test should use a real student. Use a dedicated test account, a test pass, and a test attendee email until the final smoke test.

## Confirmed findings inventory

| ID | Severity | Finding | Resolution phase |
|---|---|---|---|
| B01 | P1 | Generated one- or two-character slugs are rejected, including `/book/c` | 1 |
| B02 | P1 | Manual name/email passes create dead `/schedule/pass/:token` URLs | 1 |
| B03 | Security | First-name-only bearer links are guessable and permit booking and uploads | 1 |
| B04 | P1 | Paused and active passes can share a slug and resolve unpredictably | 1 |
| B05 | P1 | Expired public links execute an UPDATE inside a STABLE function and can return 500 | 1 |
| B06 | P2 | Invalid credits and session lengths are silently coerced instead of rejected | 1 |
| B07 | P1 | Admin cancellation does not cancel Google or the schedule mirror | 2 |
| B08 | P1 | Cancellation refund is a non-atomic read-modify-write operation | 2 |
| B09 | P2 | “Reset to 5 sessions” replaces the pass and invalidates its URL without clear warning | 2 |
| B10 | P2 | Teacher Schedule hides paused, exhausted, and expired passes | 2 |
| B11 | P1 | Slot display and redemption do not query live Google free/busy | 3 |
| B12 | P1 | Google deletes and moves do not reconcile booking redemptions | 3 |
| B13 | P1 | `gcal-reconcile` has no scheduled live cron | 3 |
| B14 | Security | `gcal-reconcile` does not enforce an internal or admin authorization gate | 3 |
| B15 | P1 | Retried Google insert POSTs can create duplicate events and invitations | 3 |
| B16 | P1 | A pending Meet URL can be stored as null permanently | 3 |
| B17 | P2 | Expired Google sync tokens do not perform the promised immediate full sync | 3 |
| B18 | P2 | Incremental Google pagination does not preserve the original query context | 3 |
| B19 | P1 | All-day events are mirrored at UTC midnight and transparent events are treated as busy | 3 |
| B20 | P1 | File uploads are not idempotent across booking retries | 4 |
| B21 | P1 | Partial upload failures leave duplicate or orphaned objects and rows | 4 |
| B22 | P1 | Note and upload-link database errors are ignored | 4 |
| B23 | P1 | Final-credit booking hides upcoming sessions and the Meet link | 5 |
| B24 | P2 | Paused and expired authenticated students receive a misleading no-access state | 5 |
| B25 | P1 | `:15` or `:45` availability starts generate slots the RPC always rejects | 5 |
| B26 | P2 | Overlapping availability windows generate duplicate slots | 5 |
| B27 | P2 | Date-only expiration input expires the pass the prior evening in Toronto | 5 |
| B28 | P2 | Current profile email lookup uses nonexistent profile columns | 5 |
| B29 | P2 | Confirmation times use the Edge runtime timezone | 5 |
| B30 | P2 | Google-success/database-failure paths report success and leave split state | 3 and 4 |
| B31 | P2 | Public booking mounts authenticated global overlays | 5 |
| B32 | Accessibility | Calendar buttons do not expose full dates to assistive technology | 5 |
| B33 | Coverage | Booking Edge Functions, RPC concurrency, calendar recovery, and UI state transitions have no automated tests | Every phase |

## Target architecture

### Public link identity

- Use `/book/:slug` as the only public route.
- Remove every client reference to `/schedule/pass/:token`.
- Generate every new slug as `<sanitized-first-name>-<26-character-random-code>`.
- The random code supplies at least 128 bits of entropy. The name is cosmetic only.
- Apply a normal unique index to every non-null `booking_slug`, regardless of pass status.
- Rotate existing first-name-only slugs during the production cutover. Export the affected student, old URL, and new URL before rotation so communication can be handled deliberately.
- Never log a full slug. Logs may include pass ID and the first four characters of a hash.

### Pass state

- Enforce at most one resumable pass per student across `active` and `paused` states.
- A new grant revokes any prior `active` or `paused` pass in the same transaction.
- Exhausted and expired passes remain queryable for history.
- Pausing preserves the current URL. Regenerating a link is the only normal operation that rotates it.
- Manual name/email passes receive the same strong slug and public URL as account-backed passes.

### Booking and calendar state

Use the redemption as the commercial source of truth and explicit calendar state as the integration state.

Replace the ambiguous `pending | synced | failed` model with:

- `calendar_action`: `create | update | delete | none`
- `calendar_status`: `pending | processing | synced | failed`
- `calendar_attempts`
- `calendar_error`
- `calendar_lease_until`
- `calendar_last_synced_at`

The state machine is:

1. Reserve or cancel atomically in PostgreSQL.
2. Record the required calendar action in the same transaction.
3. Attempt Google immediately.
4. Persist Google and mirror results with checked database writes.
5. Leave the action pending when Google or persistence fails.
6. Let the scheduled reconciler retry by lease.
7. Surface terminal failures in the admin Bookings screen.

### Conflict model

- The PostgreSQL buffered exclusion constraint remains the hard guard against two LSAT U bookings racing each other.
- Query Google free/busy when loading slots and again immediately before reservation.
- Query the write calendar plus any configured busy calendars in one request.
- Treat Google free/busy as a freshness guard, not a distributed transaction. An external event created after the last free/busy check can still race; reconciliation must detect and surface that exceptional conflict.
- Keep `schedule_events` as a mirror and reporting cache, not the sole booking guard.

### Google event idempotency

- Derive a deterministic Google event ID from the redemption UUID using only characters Google permits, for example the UUID hex without hyphens.
- Insert with that ID.
- On HTTP 409, fetch and adopt the existing event rather than inserting again.
- Do not blindly retry a POST that lacks a deterministic event ID.
- Preserve `extendedProperties.private` with the redemption ID, pass ID, and idempotency key.

### Student submission identity

- Give each selected file a stable client upload ID for the life of the booking attempt.
- Add a unique constraint on `(booking_pass_id, booking_idempotency_key, client_upload_id)`.
- Upload with a deterministic storage path or safe upsert behavior.
- A retry returns the existing row instead of storing another copy.
- A scheduled cleanup removes unlinked staged uploads older than 24 hours.

## Phase 1: Link and pass invariants

### Database migration

1. Add a full unique index for non-null `booking_slug` values.
2. Replace `one_active_pass_per_student` with a partial unique index covering statuses `active` and `paused`.
3. Update `grant_booking_access` to revoke both active and paused prior passes.
4. Update `resolve_booking_link_full` to be `VOLATILE`, or make it read-only and move expiry mutation elsewhere. Do not leave an UPDATE in a STABLE function.
5. Require a non-null strong slug for every newly created pass, including manual passes.
6. Add explicit checks for credit count, session length, expiry, and slug length. Reject invalid input rather than coercing it.
7. Add an admin-only batch RPC that rotates weak active slugs and returns an old-to-new mapping. Do not execute the batch until the communication list is reviewed.

### Edge and frontend

1. Make `genSlug` always append the 26-character random code.
2. Return `booking_url` for account-backed and manual passes.
3. Delete `tokenUrl` and both legacy fallback paths.
4. Keep the retired `booking-pass` endpoint at HTTP 410 for old links, but do not issue new token URLs.
5. Normalize unknown, expired, revoked, and malformed public links to the same non-sensitive response.
6. Add structured error codes for `invalid_credits`, `invalid_session_length`, `invalid_expiry`, and `slug_collision`.

### Tests

- One-, two-, and three-character first names.
- Manual pass creation returns a working `/book/` URL.
- Two students with the same first name receive different strong slugs.
- Pause, grant, unpause, regenerate, revoke, and rotate concurrency.
- Expired slug returns the intended 404 response, not 500.
- Invalid numeric input returns 400 and creates no row.

### Gate

- `/book/c` is replaced with a strong working URL and verified in a private browser.
- A manual pass books successfully through `/book/:slug`.
- No application code constructs `/schedule/pass/`.

## Phase 2: Atomic cancellation and pass administration

### Database migration

Create `cancel_booking_redemption(_redemption_id, _refund boolean, _actor_id uuid)`:

1. Lock the redemption and its pass.
2. Return the existing result if already cancelled.
3. Mark the redemption cancelled.
4. Refund at most one credit when requested.
5. Reactivate an exhausted pass only when it is otherwise valid.
6. Preserve paused, revoked, or expired status.
7. Set `calendar_action=delete` and `calendar_status=pending`.
8. Mark the linked schedule mirror cancelled in the same transaction.
9. Return the updated redemption and pass counters.

Create or update an atomic pass-management RPC for:

- Add credits without rotating the link.
- Set total remaining credits with explicit confirmation semantics.
- Pause and resume.
- Update session duration and expiry.
- Revoke.

### Edge and frontend

1. Replace the current cancellation handler with the RPC.
2. After the transaction commits, delete the Google event with `sendUpdates=all`.
3. Mark the calendar action synced only after checked persistence succeeds.
4. Leave `pending delete` for reconciliation after a Google failure.
5. Show pending and failed calendar cancellation states in the admin UI.
6. Replace “Reset to 5 sessions” with “Set remaining sessions to 5.” Require confirmation and keep the same URL.
7. Make Teacher Schedule display active, paused, exhausted, and expired passes accurately.

### Tests

- Two simultaneous cancel requests refund exactly once.
- Repeated cancellation is a successful no-op.
- Google delete failure leaves a pending delete and does not restore the booking.
- Reconciler completes the delete later.
- Revoked, paused, exhausted, and expired pass refund behavior.
- Setting remaining credits does not rotate the slug or fragment history.

### Gate

- Cancel from the admin UI, confirm the Google event disappears, the attendee receives cancellation, the mirror is cancelled, and the credit increments once.

## Phase 3: Calendar correctness and recovery

### Live free/busy

1. Add one shared `loadBusyIntervals` helper.
2. Use it in public slots, authenticated slots, and immediately before redemption.
3. Preserve the 15-minute buffer consistently in display and the RPC.
4. Exclude transparent events from busy intervals.
5. Use the configured calendar timezone for all-day event boundaries.

### Pull synchronization

1. Freeze full-sync `timeMin` and `timeMax` once per invocation.
2. Preserve the entire original query context on every paginated request.
3. On HTTP 410, clear the stored sync token and perform the full sync in the same invocation.
4. Persist `nextSyncToken` only after all pages succeed.
5. Parse all-day dates at midnight in the Google calendar timezone, not UTC.
6. Persist transparency and treat `transparent` as free.
7. When a stamped booking event moves, update the redemption time through an atomic reconciliation RPC.
8. When a stamped event is deleted, mark the redemption as a calendar mismatch requiring admin adjudication. Do not silently refund money based solely on an external delete.
9. If a moved event conflicts with another LSAT U booking, retain the prior redemption time and create a visible conflict alert.

### Reconciler

1. Add an internal secret check or admin authorization check before any service-role work.
2. Add a live cron invocation, recommended every minute.
3. Use atomic leasing and checked database results.
4. Search by redemption stamp. If search fails, retry later instead of assuming absence and creating another event.
5. Create events with deterministic IDs.
6. Continue polling events whose conference status is pending until the Meet URL arrives or a bounded terminal condition is reached.
7. Backfill Meet URLs during normal pull sync as another recovery path.
8. Add an admin queue for terminal failures and calendar mismatches.

### Checked persistence

Every Google success followed by a database write must inspect the Supabase `error` value. This applies to:

- `schedule_events` upserts.
- Redemption event ID and Meet URL writes.
- Cancellation mirror updates.
- Reconciler leases, outcomes, and error writes.
- Sync state token updates.

A failed persistence write must not be reported as fully synced.

### Tests

- Live free/busy excludes a recently created event absent from the mirror.
- Transparent event does not block.
- Toronto all-day event blocks the correct local date.
- Multi-page incremental sync preserves parameters.
- 410 performs a same-invocation full sync.
- Google move, delete, conflict, and Meet backfill.
- Transient insert response after a committed event does not create a duplicate.
- Search failure never falls through to create.
- Unauthorized reconciler invocation returns 401 or 403.
- Lease concurrency processes a row once.

### Gate

- A new Google event appears unavailable immediately without waiting for cron.
- Move and delete a stamped test booking in Google and verify the expected LSAT U reconciliation state.
- Force a transient Google failure and confirm the cron repairs the pending row.

## Phase 4: Idempotent notes and uploads

### Database migration

1. Add `client_upload_id` to `external_work_uploads`.
2. Add the unique booking-attempt constraint.
3. Add an index supporting cleanup of `redemption_id IS NULL` rows by age.
4. Add a cleanup function and daily cron for staged uploads older than 24 hours.

### Edge function

1. Validate `Content-Length` before parsing multipart data where available.
2. Enforce the total request limit while streaming or before allocating file buffers.
3. Validate allowed file types and reject executable or active-content formats unless explicitly required.
4. Upsert or adopt each stable client upload ID.
5. If storage succeeds but row insertion fails, delete the new object before returning.
6. Return which client upload IDs are already staged.
7. Check pass status and ensure the pass can still book before accepting uploads.
8. Apply the same rate limiting as public booking.

### Booking core and client

1. Check and surface errors from the note update and upload linkage.
2. Track successfully staged upload IDs in client state.
3. On booking retry, skip already staged files.
4. Keep the same booking idempotency key for a network retry of the same selected slot.
5. Generate a new key only when intentionally starting a new booking attempt.
6. On slot conflict, either relink the existing staged submission to the next attempt through an explicit action or clean it before retry. Do not duplicate it implicitly.
7. Show “booking confirmed, submission processing failed” only if the booking committed but submission linkage did not, and create an admin-visible repair item.

### Tests

- Lost booking response after successful commit.
- Retry with one, three, and five files.
- Partial storage failure.
- Row insert failure cleans storage.
- Same file name with distinct client IDs.
- Concurrent upload calls cannot exceed five files.
- Abandoned attempt is cleaned after 24 hours.
- Note persistence failure is visible and repairable.

### Gate

- Simulate a lost response, retry, and confirm one redemption and one copy of each attachment.

## Phase 5: Student and admin UI consistency

### Student booking state

1. Return the latest relevant pass regardless of active, paused, exhausted, or expired status.
2. Return upcoming redemptions independently of whether a current pass exists.
3. Render upcoming sessions and Meet links before the no-access or no-credits state.
4. Show accurate paused, exhausted, expired, and revoked messaging.
5. Continue displaying an upcoming session after the final credit is used.

### Availability

1. Keep the 30-minute booking grid aligned to wall-clock `:00` and `:30`, regardless of whether a range begins at `:15`.
2. Alternatively restrict range starts to `:00` and `:30`. The preferred implementation is grid alignment so `13:15 to 18:00` can still yield valid `13:30` onward slots.
3. Reject or merge overlapping ranges in the server-side availability RPC.
4. Deduplicate generated slots defensively by `start_at`.
5. Expand the busy-event query bounds by the buffer on both ends.
6. Add fall-back and spring-forward DST tests.

### Expiry

1. Define the UI field as an inclusive local date labeled “Valid through.”
2. Convert it to the next local midnight as an exclusive timestamp using the configured host timezone.
3. Display it using the same timezone and semantics.
4. Never construct expiration timestamps with `new Date('YYYY-MM-DD')`.

### Identity and email

1. Read the current account email through `auth.admin.getUserById`, not nonexistent profile columns.
2. Fall back to the pass snapshot only when the auth account has no email.
3. Format confirmation time with an explicit `America/Toronto` timezone and include the timezone label.
4. Check the transactional email response status and log or queue failure.
5. Keep Google Calendar as the logistics email and the branded email as a distinct preparation message.

### Public presentation and accessibility

1. Suppress messenger, admin chat, help widgets, and authenticated chrome on `/book/*`.
2. Make the admin preview explicitly anonymous or label it as an authenticated preview.
3. Give every calendar date button a full accessible name.
4. Use semantic weekday headings with unambiguous accessible labels.
5. Test keyboard navigation, focus order, confirmation dialog, upload removal, and status announcements.

### Tests

- Final-credit upcoming session remains visible.
- Paused and expired authenticated states.
- Toronto expiry date round trip.
- `13:15` availability produces valid `13:30` slots.
- Overlapping ranges do not duplicate slots.
- Buffer-boundary events are excluded.
- Public page mounts no authenticated overlays.
- Screen-reader names for dates and weekdays.

### Gate

- Verify public and authenticated booking at narrow, mid, and wide viewports.
- Verify the admin preview, final-credit state, paused state, expired state, and upcoming Meet link in the running app.

## Phase 6: Integrated test harness and observability

### Edge and RPC tests

Create a booking-specific test harness with mocked Google HTTP responses and a disposable PostgreSQL test environment or migration-level integration runner.

Required suites:

- `bookingCore`: reserve, replay, Google failure, persistence failure, Meet pending, submission linkage.
- `public-booking`: slug resolution, redaction, rate limits, status handling, body limits.
- `student-booking`: JWT identity, pass states, history independence.
- `booking-upload`: validation, retry, concurrency, cleanup.
- `booking-pass-admin`: grant, top-up, pause, rotate, revoke, cancel, no-show.
- `gcal-sync-pull`: paging, 410, all-day timezone, transparency, booking reconciliation.
- `gcal-reconcile`: leasing, deterministic creation, search failure, terminal failure, Meet backfill.
- PostgreSQL concurrency: last credit, same slot across passes, double cancellation, grant while paused.
- React components: upcoming history, final credit, availability boundaries, expiration semantics, public overlays, accessibility.

### Observability

Add an admin-visible health summary:

- Pending calendar actions by age.
- Failed calendar actions.
- Redemptions without Google event IDs.
- Synced redemptions without Meet URLs.
- Staged uploads older than one hour.
- Calendar sync last success and token age.
- Duplicate stamped Google events detected.

Log structured identifiers, actions, attempts, and error categories. Never log full slugs, access tokens, student notes, or file contents.

### Gate

- All booking-specific suites pass repeatedly.
- Existing unrelated failures remain documented and unchanged.
- Typecheck passes.
- Production health summary is green after live smoke testing.

## Deployment order

1. Create a clean branch from current `origin/main` after preserving unrelated worktree changes.
2. Implement Phase 1 migration and code.
3. Run typecheck and Phase 1 tests.
4. Push through `.claude/safe-push.sh`.
5. Apply the migration through Lovable Cloud.
6. Verify weak-slug rotation output without rotating production links yet.
7. Repeat the code, test, push, migrate, and live-gate cycle for Phases 2 through 5.
8. Deploy and schedule the reconciler before enabling the new calendar state machine.
9. Run the complete private-window test matrix.
10. Rotate weak production slugs in one controlled cutover.
11. Reissue affected links and verify each one.
12. Monitor calendar actions, email failures, and uploads for 24 hours.

## Rollback strategy

- Every migration must be additive until the new path is verified.
- Keep old columns during the transition and dual-read where required.
- Do not drop old constraints or state columns until production rows have migrated and health checks are green.
- A failed frontend deploy can roll back to the prior bundle because database changes remain backward-compatible.
- A failed Edge Function deploy can roll back only if the prior function understands the current schema. Maintain compatibility until the phase gate passes.
- Preserve an export of all active passes, slugs, counters, and upcoming redemptions before the production slug rotation.
- Never roll back by deleting booking or redemption records.

## Final live verification matrix

### Links and passes

- Account-backed pass.
- Manual name/email pass.
- One-character first name.
- Duplicate first names.
- Active, paused, exhausted, expired, and revoked states.
- Regenerated link kills only the old URL.

### Booking

- First credit and final credit.
- Two passes racing the same slot.
- Recently created Google busy event.
- Transparent event.
- All-day event.
- Buffer boundary.
- `:15` availability boundary.
- DST transition week.

### Calendar

- Successful create with one event and one invite.
- Transient insert response after commit.
- Meet initially pending, then backfilled.
- Admin cancellation with one refund and Google cancellation.
- Repeated cancellation.
- Manual Google move.
- Manual Google delete.
- Expired sync token.
- More than 250 changed events.

### Submission

- Note only.
- One file.
- Five files.
- Lost response and retry.
- Partial upload failure.
- Abandoned upload cleanup.

### Presentation

- Public private-window view.
- Authenticated student view.
- Admin live preview.
- Narrow, mid, and wide layouts.
- Keyboard-only and screen-reader date navigation.
- Confirmation email time and timezone.

## Definition of done

The remediation is complete only when:

1. Every B01 through B33 finding has a merged change or an explicitly documented non-code disposition.
2. All migrations are applied in production.
3. The scheduled reconciler is visible in live cron state and has completed a forced recovery.
4. The full live matrix passes with evidence.
5. No active pass uses a weak or invalid slug.
6. There are no pending or failed calendar actions older than the agreed retry window.
7. Booking-specific automated tests cover the happy path, error paths, and concurrency paths.
8. Typecheck passes and no unrelated test baseline worsens.
9. The task ledger and booking backend map are updated with the shipped architecture.
