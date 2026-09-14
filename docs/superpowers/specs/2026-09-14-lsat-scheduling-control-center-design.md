# LSAT Prep scheduling control center

**Status:** Approved design, 2026-09-14  
**Scope:** LSAT Prep only. Cal.com is explicitly out of scope.

## Goal

Give Joshua complete, simple command-line control over LSAT Prep scheduling from
Windows and macOS. The tool must be useful before a change is made, make every
live change clear before it happens, and leave a recoverable record of ordinary
configuration changes.

The first delivery is an installable `lsat-schedule` command and a local MCP
server. A website-based control center is a later project. It must reuse this
same scheduling core rather than create a second scheduling system.

## Architecture

Create one shared TypeScript scheduling core in the LSAT Prep repository. It
owns reads, validation, previews, mutations, audit records, and undo operations
for LSAT Prep scheduling. It talks to the existing LSAT Prep backend and reuses
the existing booking, Stripe, Google Calendar, and booking-pass rules.

Two local adapters call that core:

- `lsat-schedule`, an installable cross-platform command for interactive and
  direct terminal use.
- A local stdio MCP server for approved tools on the same computer.

Both run locally and use the existing LSAT Prep admin credentials stored in the
device's local `.env`. There is no hosted scheduling API and no Cal.com client.

The public booking experience remains separate. Booking pages render times in
the visitor's local timezone. Operator input and CLI output use
`America/Toronto`.

## Everyday interface

Running `lsat-schedule` with no arguments opens a concise overview and a guided
menu. The overview shows:

- Every active standard and custom booking link, including URL, purpose,
  duration, paid or free state, price, and active state.
- Active booking passes and the sessions owed on each pass.
- Upcoming bookings.
- The current Google Calendar connection state and scheduling conflicts.

The same actions are available as direct, task-focused commands and with
`--json` for scripts. Help is grouped by the things Joshua manages: links,
event types, availability, date overrides, bookings, booking passes, payments,
history, and calendar status.

## Booking links and event types

The tool supports a stable standard paid single-session link, currently $45,
whose future-booking rules, duration, and price Joshua can edit without changing
its URL.

It also supports separate custom links. The guided flow asks whether a new link
is reusable, single-use, or pinned to one exact time, and whether it is paid or
free. It then asks only for applicable options: readable slug, label, duration,
price, notice, booking window, and availability rules. Links use simple,
readable URLs. A requested slug must be unique. A link can be deactivated but is
not permanently deleted through normal commands.

Custom links can represent a reduced rate, a free session, a special duration,
or any other explicitly configured offer. They are not created automatically
for every student.

## Booking passes

A booking pass remains the personal link for a student who has already paid for
a package and is owed sessions. It is distinct from a paid single-session link.
The control center can list, create, inspect, revoke, and change the sessions
owed on booking passes. It does not treat a hand-maintained balance as an
alternative source of truth.

## Bookings and payments

The control center can list and inspect booked sessions, then cancel or
reschedule them. It can adjust the price for future bookings and custom links.
It can refund an already-paid single session, but a refund is always a separate
action from cancellation.

Existing confirmed bookings retain the price and terms they had when booked.
Configuration edits apply only to future bookings. Free links skip payment but
still use the live availability and Google Calendar conflict checks. Paid
bookings retain the existing Stripe hold and expiry behavior.

## Availability and calendar

The tool manages recurring weekly availability and date-specific overrides,
including opening a special time window or closing a date. It keeps the current
Google Calendar configuration, reports its connection health, and respects its
free/busy conflicts. Calendar selection and OAuth reconfiguration are outside
this first delivery.

## Confirmation, messages, audit, and undo

Every CLI mutation first prints a plain-language summary and exact before/after
values, then asks `Continue? y/N`. A no answer or no answer defaults to no
change. MCP mutations follow a two-step flow: preview first, then a short-lived
confirmation token is required to apply that exact preview.

Cancelling or rescheduling asks whether to notify the student. The default is no
message. When requested, the tool creates a draft; it does not send on its own.
Link creation creates a draft only when Joshua explicitly asks for one.

Each completed mutation records the device, interface, action, timestamp, and
before/after values in an append-only scheduling audit log. `undo` restores the
prior state for configuration, links, availability, date overrides, and
booking-pass changes. It cannot reverse a payment, refund, completed booking,
or sent message.

## Verification

The shared core receives focused tests for:

- Standard price edits and custom paid or free links.
- Reusable, single-use, and pinned-time links.
- Booking-pass creation, adjustments, revocation, and undo.
- Weekly availability and date overrides.
- Existing booking cancellation, reschedule, and refund separation.
- Draft-only notification behavior.
- Audit records and undo boundaries.
- Google Calendar conflict handling.
- Operator Toronto-time input and visitor local-time display.

The CLI and local MCP each receive adapter-level tests against the shared core.
No implementation may bypass the existing booking conflict, payment-hold, or
booking-pass rules.
