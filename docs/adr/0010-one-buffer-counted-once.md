# 0010. One Buffer, counted once, read from one row

Date: 2026-09-11

## Status

Accepted

## Context

Four places decided whether a booking slot was free, each with its own arithmetic. The slot list and the edge-function guard required a 15-minute gap next to an existing event. `redeem_booking_pass_v2` and the `no_overlapping_bookings` exclusion constraint buffered *both* rows, so two pass bookings needed 30 minutes of clearance. The three single-session RPCs used yet another mix (no buffer against calendar events, 15 against pass bookings).

On 2026-09-10 a student tried five times to book from her pass link and was told "That time was just taken" every time. Nothing was taken: 15 of the 109 slots she could see were offered by the list and refused by the database. Cal.com, which the booking pages are meant to mirror, runs the session-link event with 0 buffer and a 70-minute pitch.

## Decision

- The Buffer is **10 minutes** (Joshua's number), stored once in `booking_availability_config.buffer_minutes` alongside the notice and the window. Every SQL check reads it through `booking_buffer_minutes()`; every edge function reads it through `get_booking_availability()`.
- The Buffer is counted **once** between any two events. Busy rows are never buffered themselves; only the probe is.
- One predicate, `booking_slot_is_clear()`, answers "is anything in this database in the way?" for the pass RPC and all three single-session RPCs. Single-session events pass their own per-event buffers (the consultation keeps 30/30 to mirror Cal.com).
- The exclusion constraint buffers each row by **half** the Buffer (a literal 5 minutes), so two pass bookings need exactly one Buffer between them. GiST requires an IMMUTABLE expression, so this is the one place the number is copied rather than read.
- Slot pitch is session length + Buffer (80 minutes), so consecutive grid slots are all bookable together instead of a booking wasting the slots on either side.

## Consequences

- A slot a student can see is a slot the database will accept. The Deno tests pin the generator, and the live database was checked against every generated slot on 2026-09-11 (134/134 pass link, 134/134 single session, 26/26 consultation).
- Changing the Buffer means updating the config row **and** re-creating `booking_buffered_range` with half the new value, then rebuilding `no_overlapping_bookings`. The migration that introduced this says so at the bottom.
- Cal.com's session-link event still runs at 0 buffer. Until it is set to 10 there, a booking made through Cal.com can sit closer to an LSAT U booking than LSAT U itself would allow.
