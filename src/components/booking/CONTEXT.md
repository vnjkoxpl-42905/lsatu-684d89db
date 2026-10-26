# Booking — Context

The language of paying for and scheduling tutoring time. Covers the student booking surface (`/schedule`, `/booking`), the public booking microsite (`/book/:slug`), and the Single Session page.

## Terms

### Single Session
One tutoring session paid for individually ($45 for the 70-minute session) rather than out of a Package, booked from a public shareable link by anyone — prospect or current student — without logging in. Needs no Booking Pass. Replaces the Cal.com "LSAT Session" (`session-link`) event, which stays live in parallel until Joshua retires it. _Avoid (per the root glossary): one-off, ad hoc session, hourly._

### Package
Five or ten hours of tutoring bought upfront through Stripe, consumed by booking sessions out of a Booking Pass.

### Booking Pass
The prepaid entitlement a student holds when sessions are **owed** to them, carrying the count owed and the count used, reachable at its own private high-entropy booking link. Granted by Joshua or by a matched package payment. A Single Session never creates or consumes one. _Avoid: booking link (that is the pass's URL, not the thing), wallet, credits-as-product._

### Booker
The person on the public page picking a slot. Not necessarily an authenticated user or an existing student; identified by the name and email they enter.

### Slot
A concrete start time offered on the calendar. Slots step from the start of each day's hours at a fixed pitch: session length plus the Buffer (80 minutes for the 70-minute session, so 13:00, 14:20, 15:40), within the Booking Window, respecting Minimum Notice, Date Overrides and calendar conflicts. The consultation keeps Cal.com's 30-minute pitch. Every page that offers a Slot and every check that accepts one uses the same arithmetic; a Slot a student can see is a Slot they can book.

### Hold
A short-lived claim on a Slot created when a Booker submits their details and is sent to payment. While live it blocks the Slot for everyone else; it converts to a booking when payment succeeds and evaporates if payment doesn't arrive in time.

### Booking Window
How far into the future slots are offered. The Single Session mirrors Cal.com: 6 business days out, non-rolling.

### Minimum Notice
How close to now a Slot may start. The Single Session requires 24 hours.
