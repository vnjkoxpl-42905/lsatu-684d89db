# Plan Review Log: Native Single Session booking page

Act 1 (grill-with-docs) complete — plan locked, CONTEXT.md (Booking) created, ADR 0005 recorded, CONTEXT-MAP updated. MAX_ROUNDS=5.

## Round 1 — Codex (gpt-5.6-sol, read-only)

VERDICT: REVISE. 17 findings; full text preserved below.

1. CRITICAL — Cal.com stays live and cannot see a database Hold; Cal can book the held slot; finalization then fails the FreeBusy check. Fix: retire the Cal link at launch or create a tentative Google event per Hold.
2. CRITICAL — the promised cross-table exclusion constraint cannot exist in Postgres (single-table only; no now() in predicates). Fix: one occupancy table or one slot-claim RPC + expiry sweeper.
3. CRITICAL — the synthetic 1-credit Booking Pass violates the domain (root glossary: single session "needs no booking pass") and the schema (one_resumable_pass_per_student unique index; token_hash/created_by required). Fix: first-class standalone booking record.
4. CRITICAL — 2:10/3:20 starts violate the redemption slot policy (:00/:30) and the ±15-min padded exclusion range makes adjacent 70-min slots conflict. Fix: offer-aware SQL policy.
5. CRITICAL — plan both pre-creates a redemption and calls bookSession (which creates its own); with Holds as busy, bookSession would reject its own Hold. Fix: dedicated atomic finalize RPC.
6. HIGH — Hold + Stripe Checkout creation is not atomic; needs a saga with idempotency keys, CAS transitions, recovery sweeps.
7. HIGH — expiry alignment does not remove the late-payment race (paid at T-ε, webhook after expiry). Needs arbitration + auto-refund path for paid-but-unconvertible.
8. HIGH — cancel_url is browser navigation; the Checkout stays payable. Release only after the backend expires the Stripe session.
9. HIGH — webhook not hardened for a money boundary (2xx before durable commit, unbounded body, single-sig parse, no payment_status/amount/currency/mode/livemode validation).
10. HIGH — retries can permanently skip calendar/email side effects; needs per-step state + reconciler coverage.
11. HIGH — unverified email match must not attach a public purchase to an account (paid data injection). Keep guest-owned unless authenticated.
12. HIGH — existing cancellation RPC restores credit/reactivates passes; single sessions need a non-credit cancellation path with cutoff semantics.
13. HIGH — booking_offers.provider CHECK only allows stripe|calcom; add a native provider honestly, keep legacy Cal mapping.
14. MEDIUM — abuse/PII underspecified: hold caps, guest caps, RLS, retention.
15. MEDIUM — no real state machine for confirmation/observability; define checkout_open → paid_finalizing → booked | expired | manual_attention with alerts and truthful UI.
16. MEDIUM — reuse existing scheduler primitives (CalendlyBookingCard) instead of a second calendar implementation; proof list missing double-submit/reload/stale-slot/back-from-checkout/a11y/viewports.
17. MEDIUM — domain-language conflicts with the root glossary ("one-off" is an avoided term; Booking Pass ≠ wallet; $45/hour vs $45/70min).

### Claude's response (Round 1)

Accepted 1 (tentative GCal event per Hold — also closes cross-engine blocking through the channel every engine already reads), 2 (single claim RPC + advisory lock + sweeper; in-table exclusion for holds), 3+4+5+12 (model pivot: `single_session_bookings` is a first-class record that is BOTH Hold and booking via a status lifecycle; no pass, no redemption; its own SQL policy; its own non-credit cancellation), 6 (explicit saga), 7 (completion-wins arbitration + automatic refund for paid-but-unconvertible — the one place refund automation now exists), 8 (backend-expire before release), 9 (full webhook hardening list), 10 (per-side-effect state + reconciler), 13 (provider 'native' migration, legacy row retained), 15 (state machine + health), 16 (extract/parameterize existing primitives; expanded proof list), 17 (glossary reconciled to root; "$45 flat for the 70-minute session" per live Cal config — the root glossary's "per hour" framing flagged to Joshua rather than silently rewritten).

Partially accepted 11: bookings are guest-owned; attachment to a student account happens only via an authenticated session at booking time (JWT), never by unverified email match. Teacher surfaces list single sessions by email (service-role only) — that is operator visibility, not account data injection.

Partially accepted 14: hold caps (per-IP, per-email, global), guest cap + normalization, service-role RLS, 30-day PII purge on terminal non-booked rows — all in. CAPTCHA/bot-suite declined for v1: the $45 payment wall is the effective rate limiter, and the caps bound the damage of a hold-exhaustion attempt; revisit if abuse is observed.

## Round 2 — Codex (same session)

VERDICT: REVISE. Resolved: first-class record, SQL-authoritative policy, authenticated-only attachment, non-credit cancellation, Stripe-expire-before-release, payment validation, RLS, PII cleanup, scheduler reuse, truthful confirmation states. Remaining/new:

1. CRITICAL — advisory lock asymmetric: package redeem RPC never takes it nor checks the new table.
2. CRITICAL — `draft` doesn't occupy the slot; exclusion predicate omits it.
3. CRITICAL — `expired → paid_finalizing` arbitration self-detonates on the exclusion constraint when the slot was retaken.
4. CRITICAL — money strands between the webhook's two DB calls; needs one atomic RPC or a leased resumer.
5. CRITICAL — refunds have no durable lifecycle (state, refund id, attempts, retry worker).
6. HIGH — Stripe-create crash leaves an unidentifiable session; sweeper must replay create with the same idempotency key.
7. HIGH — exact now+30min expires_at can dip under Stripe's floor; request 31+ and store Stripe's returned value.
8. HIGH — public token model undefined beyond cancel; needs purpose-bound hashed expiring tokens + exact routes/DTOs.
9. HIGH — hold DoS still free; first-x-forwarded-for is spoofable; needs platform IP source, atomic caps in the RPC, Turnstile.
10. HIGH — claim RPC checks mirrors, not live FreeBusy; tentative-event insert doesn't detect overlap; fail closed.
11. HIGH — student/Classroom/Schedule surfaces read only redemptions; needs a source-discriminated unified booking DTO.
12. HIGH — fixed email/gcal state columns can't represent multiple notifications; needs an outbox.
13. HIGH — offer id cutover: legacy row owns pk `single-session` + historical FKs; needs stable ids and a safe cutover.
14. MEDIUM — sweeper/reconciler have no deployment contract (cron install, heartbeats, alerts).
15. MEDIUM — root brain glossary still says "Stripe-linked Cal.com link" and "$45 per hour".

### Claude's response (Round 2)

Accepted 1 (one shared advisory-lock key — normalized slot-window bucket — taken by the native claim RPC, `redeem_booking_pass_v2`, and the arbitration RPC; each checks both occupancy tables in-transaction), 2 (lifecycle simplified; `draft` occupies: exclusion covers draft/checkout_open/booked, and the claim RPC sweeps stale rows for the window inside its own transaction first), 3+4 (states collapse: the webhook calls ONE atomic `finalize_single_session_payment` RPC that locks the slot key, persists payment facts, and chooses `booked` or non-occupying `refund_pending` — `paid_finalizing` is gone; 2xx only after commit; Stripe redelivery is the resumer), 5 (refund lifecycle `refund_pending → refunded | refund_failed` with stripe_refund_id, attempts, idempotency key, worker retry, alert on failure; apology email only after refund succeeds), 6 (sweeper replays checkout create with the row-id idempotency key to recover, attach, then expire), 7 (request 35 min, store Stripe's returned expires_at as authoritative; Hold expiry = that value), 8 (purpose-bound hashed tokens: booking token for status/abandon minted at claim, cancel token minted at booked, both expiring; routes + redacted DTOs specified; Meet link only on booked status with valid token), 9 (platform-authenticated IP, hashed storage, caps enforced atomically inside the claim RPC, Cloudflare Turnstile before any occupying Hold — accepted as v1 scope, invisible mode), 10 (fresh FreeBusy immediately before claim; tentative-event create failure fails closed — claim released, no checkout), 11 (source-discriminated unified booking DTO; Schedule, Classroom home, recent activity, teacher dossier updated — explicit workstream), 12 (outbox keyed booking/action/recipient with leases, attempts, idempotency keys; calendar promote/delete are outbox actions too), 13 (new `single-session-native` offer id; legacy `single-session` row kept for history + webhook mapping, deactivated in UI via explicit flag; BookingOfferHub updated; no FK rewrite), 14 (cron install + auth in a migration, heartbeat table, stale-worker alert in health, deployment verification in proof), 15 (root glossary amended NOW in the brain — Single session entry no longer names Cal.com, price stated as $45 per session (70 minutes); noted to Joshua).

Nothing rejected this round.

## Round 3 — Codex (same session)

VERDICT: REVISE. 18 findings: (1) webhook replay after `booked` could route to refund; (2) event dedup not atomic with finalization; (3) refund job absent from schema; (4) occupying `draft` had no expiry clock; (5) Stripe replay not byte-equivalent (recomputed expires_at breaks idempotency); (6) outbox lacks causal order — promote could resurrect a cancelled booking; (7) confirmation email could precede Meet creation; (8) tentative-event timeout/orphan recovery undefined; (9) finalize could conflict with its own tentative event / miss a Cal booking not yet mirrored; (10) status-token transport & lifetime contradictory; (11) plaintext cancel-token delivery unspecified; (12) DTO migration missed BookingView.tsx + CalendlyBookingCard.tsx; (13) offer cutover strands student_booking_offers overrides; (14) package webhook branch not hardened; (15) refund creation ≠ completion; (16) worker secret not deployable as stated; (17) retention missed auxiliary PII stores; (18) two inaccurate claims (glossary; `active` column already exists).

### Claude's response (Round 3)

All 18 accepted; nothing rejected. Structural changes: finalize RPC claims the webhook event and finalizes in one transaction, business-object-idempotent, with `booked → refund_pending` prohibited (1,2); `stripe_refund` becomes an outbox action with lease/attempts/provider-status and `refunded` only on provider `succeeded` via refund webhooks + polling backstop (3,15); `draft_expires_at` at claim, superseded by Stripe's returned value (4); `checkout_request_fingerprint` persisted before the first Stripe call so sweeper replays are byte-equivalent (5); outbox rows carry status/lifecycle_version preconditions, incompatible pending work is superseded atomically, and `gcal_promote` chains the confirmation emails after persisting meet_url (6,7); deterministic-id adoption on timeout/409 + derive-or-search deletion for every terminal draft (8); finalization runs an event-aware live-calendar check excluding the booking's own tentative event, with a forced-sliver race test (9); booking token travels in the success_url/cancel_url we compose, valid 24 h, abandon authority bounded by `checkout_open` status (10); plaintext cancel token exists only in the protected outbox payload, purged on delivery (11); BookingView.tsx + CalendlyBookingCard.tsx + tests named in the DTO workstream, unified DTO becomes the sole info contract (12); legacy overrides migrated/aliased to `single-session-native` in the same migration with arrangement tests (13); immutable-payment validation + fail-closed persistence extended to the package branch (14); dedicated least-privilege worker secret from function secrets, rotation + fail-closed + post-deploy cron assertion (16); retention extended to outbox payloads, redacted commerce-event projections, token hashes, rotating-key ip HMAC, PII-free logs (17); corrected the log's overstated glossary claim (the glossary rightly says Cal is today's link) and the migration now uses the existing `active` column (18).

## Round 4 — Codex (same session)

VERDICT: REVISE. 9 findings: (1) finalization could conflict with its own mirrored tentative event in the SQL check; (2) the Google check cannot be transactional with Postgres — the "closed race" claim was overstated; (3) the plaintext cancel token had no durable home until gcal_promote succeeded; (4) version preconditions don't fence an already-in-flight side effect; (5) the checkout fingerprint stores the plaintext booking token, contradicting hash-only retention; (6) two saga recovery branches undefined (no-fingerprint drafts; expiry winning mid-Stripe-create); (7) a static migration can't read function secrets — cron deploy is two-stage; (8) guest-to-dossier association ambiguous; (9) legacy override migration lacked field-level semantics (external url_override).

### Claude's response (Round 4)

All 9 accepted; nothing rejected. (1) every occupancy check — SQL mirror and live Calendar — excludes the booking's own gcal_event_id; tentative events stamped with the booking id. (2) live Google checks are now explicitly pre-RPC observations; the milliseconds residual race is accepted and monitored (reconciler double-booking detection + alert to Joshua) while Cal stays live, and retiring Cal ends it. (3) finalization enqueues blocked confirmation rows carrying the encrypted token; promote activates them; bounded promote failure activates them anyway with truthful "Meet link to follow" copy. (4) per-booking advisory lock around each side-effect call + post-call lifecycle_version re-check with immediate compensation. (5) fingerprint stored envelope-encrypted, purged on attachment/terminal. (6) no-fingerprint drafts expire directly (no Stripe call can predate the fingerprint); failed attachment CAS immediately expires the Stripe session; terminal-with-fingerprint-no-session rows swept by replay-then-expire. (7) two-stage deployment contract spelled out (migration, then Vault/Management-API secret provisioning + cron install, then heartbeat assertion), matching the repo's existing email-cron pattern. (8) dossier precedence: verified user_id only; labeled operator-only unverified email suggestions; unmatched stay on the global admin list. (9) field-level override migration: enabled-state verbatim, native-relative URLs carry, external URLs stay on the legacy row and are emitted for manual review.

## Round 5 — Codex (same session, FINAL — MAX_ROUNDS reached)

VERDICT: REVISE, reduced to 2 findings: (1) fingerprint purge-on-terminal contradicts the sweeper's terminal replay-and-expire recovery; (2) refund_failed had no transition to refunded when late authoritative Stripe success arrives, and unknown outcomes were conflated with confirmed failures.

### Claude's response (Round 5) — resolution at cap

Both accepted and folded in: the fingerprint is purged only on durable Stripe attachment or durably recorded expiry/confirmed absence (never on terminal status alone); refund_failed is reserved for confirmed provider failure, unknown outcomes stay refund_pending with manual-attention alerts, and verified Stripe success moves any refund-branch state to refunded.

## Resolution

MAX_ROUNDS=5 reached without a formal APPROVED. Honest state: no open disagreement remains between the models — Round 5's two findings were accepted and incorporated; they simply have not been re-verified by Codex. Trajectory: 17 findings → 15 → 18 → 9 → 2, with the plan restructured twice (record model, payment lifecycle) and hardened throughout. Handed to Joshua for sign-off with that caveat stated plainly.
