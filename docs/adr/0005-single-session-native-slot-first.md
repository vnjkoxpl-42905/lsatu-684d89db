# 0005 — Single Session goes native, slot-first with a payment Hold

Date: 2026-08-16
Status: accepted

## Context

The booking-unification plan (2026-08-13) locked "single session stays on Cal.com; no Stripe single-session product." Since then: (a) the native booking core (availability, slot engine, Google Calendar + Meet creation, confirmation email) has proven itself for Packages; (b) the Cal.com account has zero webhooks configured, so Cal bookings never reach the app — they surface as "Nothing booked" on every student page; (c) Joshua wants one machine, not a mind split across two systems.

Two payment orderings were considered for a native Single Session:

1. **Pay-first (1-credit pass):** buy via Payment Link, webhook grants a pass, booker then books on their pass link. Least new code, but a Stripe Payment Link's success redirect is static, so the buyer must leave the flow and find an email to finish — worse than the Cal.com experience being replaced.
2. **Slot-first with a Hold:** pick a slot → enter details → a Hold blocks the slot → pay on Stripe's hosted page → payment confirmation finalizes the booking through the existing booking core.

## Decision

Option 2. The public Single Session page reproduces Cal.com's order of operations exactly: slot → details → pay → confirmed. New machinery is the Hold (creation, blocking, expiry) and the payment-confirmation path; downstream side effects (calendar event with Meet link, schedule mirror, transactional emails) reuse the package-booking core's helpers. The Single Session is recorded as its own first-class booking record — per the domain glossary it needs no Booking Pass, and the pass invariants (one resumable pass per student, credit-restoring cancellation) must not apply to it. _(Amended 2026-08-16 after cross-model review: an earlier draft modeled it as a synthetic 1-credit pass; that violated both glossary and schema and was dropped.)_

This explicitly supersedes decision #2 of `plans/booking-unification.md`. Cal.com's `session-link` stays live in parallel until Joshua retires it manually.

## Consequences

- A $45 booker never leaves the flow to check email; parity with Cal.com is preserved.
- Holds introduce state that can expire mid-payment; the edge cases (payment lands after expiry, slot re-taken) must be specified and tested.
- The known "Cal booking invisible in app" defect disappears for single sessions, because the booking is native from birth.
- The Cal.com webhook receiver branch in `booking-commerce-webhook` remains dead code until Cal is retired or a webhook is finally registered.
