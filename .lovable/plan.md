## Booking Pass System — Plan

### 1. Findings (existing surfaces)

- `src/App.tsx` — route registration, will add public route `/schedule/pass/:token` and admin `/teacher/booking-passes` (or panel inside teacher desk).
- `src/pages/Schedule.tsx` + `src/components/schedule/GoogleCalendarPanel.tsx` — student schedule surface, untouched.
- `src/pages/teacher/desk/scheduleEvents.ts` — TanStack hooks over `schedule_events`.
- Supabase functions:
  - `gcal-sync-pull` — pulls busy events into `schedule_events` (admin/cron only).
  - `gcal-event-write` — admin-only create/update/delete on Google Calendar.
  - `gcal-list-calendars` — admin only.
- Tables: `schedule_events`, `gcal_sync_state` (calendar_id = 'primary' default).

### 2. Can we reuse gcal functions?

Partially. Both existing functions require an authenticated admin, so they cannot be called by a student holding only a pass token. We will:

- **Reuse `schedule_events`** as the source of Joshua's busy times (already synced from Google). No new availability lookup needed.
- **Add one new edge function** `booking-pass` (public, no JWT verification, token-gated in code) with actions: `info`, `slots`, `book`. It will use the service role to read the pass, read `schedule_events` for conflicts, call the Google Calendar Gateway to create the event, then insert into `schedule_events` + `booking_pass_redemptions` and atomically bump `used_credits`.

### 3. New tables (single migration)

```text
booking_passes
  id uuid pk
  token_hash text unique not null      -- sha256 of raw token; raw token only returned once on create
  student_id uuid null (auth.users)
  student_email text null
  student_name text null
  total_credits int not null check (>0)
  used_credits int not null default 0 check (used_credits <= total_credits)
  session_length_minutes int not null default 60
  status text not null default 'active'  -- active|exhausted|expired|revoked
  expires_at timestamptz null
  notes text null
  created_by uuid not null (auth.users)
  created_at / updated_at

booking_pass_redemptions
  id uuid pk
  booking_pass_id uuid fk -> booking_passes on delete cascade
  schedule_event_id uuid null fk -> schedule_events
  google_event_id text null
  start_at timestamptz not null
  end_at timestamptz not null
  status text not null           -- booked|cancelled|failed
  idempotency_key text not null
  student_name_snapshot text null
  student_email_snapshot text null
  created_at
  unique (booking_pass_id, idempotency_key)
```

Grants + RLS:
- `booking_passes`: authenticated admins full access via `has_role(auth.uid(),'admin')`; students/anon have NO direct table access — all pass reads go through the edge function using service role.
- `booking_pass_redemptions`: same; students see their bookings only through the edge function response.
- Service role full access on both.

Atomic decrement via a `SECURITY DEFINER` function `redeem_booking_pass(_pass_id, _idempotency_key, _start_at, _end_at, ...)` that:
1. Locks the pass row (`SELECT ... FOR UPDATE`).
2. Checks status active, not expired, `used_credits < total_credits`.
3. Inserts redemption (unique idempotency_key prevents duplicates — on conflict return existing row).
4. Increments `used_credits`; if it reaches `total_credits`, flips status to `exhausted`.
5. Returns redemption id + remaining credits.

Google event creation happens BEFORE the RPC on the "commit" path; if RPC fails because pass is exhausted, we roll back by deleting the just-created Google event. Idempotency key = client-generated uuid tied to the slot; if the client retries, the unique index makes it a no-op and we skip Google creation on second try.

### 4. Edge function `booking-pass` (public, `verify_jwt = false`)

Actions (POST JSON `{ action, token, ... }`):

- `info` → returns pass state (status, credits remaining, session length, student label, expires_at, booking history summary). Never returns token_hash or admin fields.
- `slots` → given a date range (next 21 days default), returns candidate slots. Generation:
  - Business hours window (default 09:00–20:00 local, configurable per-pass later — MVP hardcoded).
  - Step = `session_length_minutes`.
  - Filter out slots that overlap any `schedule_events` row (not deleted, not cancelled) in that window.
  - Filter out slots already claimed by prior `booking_pass_redemptions` with status `booked` (defensive; they should also be in schedule_events).
  - Skip slots in the past / after `expires_at`.
- `book` → `{ token, start_at, idempotency_key }`:
  - Load pass, guard status/expiry/credits/slot-availability re-check (defense against race).
  - Call Google Calendar Gateway to insert event on `gcal_sync_state.calendar_id` with summary "LSAT session — {student_name/email}".
  - Insert into `schedule_events` (source = 'booking_pass').
  - Call `redeem_booking_pass` RPC. On unique-violation for idempotency_key, return the prior redemption without double-charging.
  - On failure after Google create, delete the Google event and return error.

The function accepts the raw token, hashes it (sha256) and matches `token_hash`. Raw tokens are 32-byte urlsafe base64, generated at pass creation and returned exactly once.

### 5. Frontend

**Admin management** — `src/pages/teacher/BookingPasses.tsx` (linked from Teacher Desk sidebar):
- List of passes with student label, credits used/total, status, expires_at, created_at, copy-link button.
- "New pass" dialog: pick student (from `useHubStudents`) or free-text name+email, credits (1/5/10/custom), session length (default 60), optional expiration.
- On create: show the generated private URL once with a copy button and warning that it won't be shown again.
- Row actions: copy link (only if token cached in memory from creation; otherwise "regenerate" which rotates token_hash), revoke, view redemption history.
- Uses direct Supabase queries (admin RLS) for reads; writes via a small admin edge function `booking-pass-admin` OR direct RLS inserts (RLS + `created_by = auth.uid()` check). Token generation happens client-side (`crypto.getRandomValues`) then hashed via edge function on insert to avoid leaking raw token in DB. Simpler: dedicated `booking-pass-admin` action `create` returns `{ pass, raw_token }`.

**Student booking page** — `src/pages/BookingPass.tsx` at `/schedule/pass/:token` (public route, outside auth shell):
- Layout matches LSAT U premium styling (bronze accents, restrained). Minimal chrome — no student sidebar.
- States: loading, invalid, revoked, expired, exhausted, active.
- Active view: header with pass label + "X of Y sessions remaining", session length, then a date picker + list of available slots grouped by day, "Book session" primary CTA.
- On book: disable button, generate idempotency_key (uuid) once per slot selection, POST to `booking-pass` `book`; on success show confirmation with event time; refresh info + slots.
- Booking history section below (past + upcoming from this pass).
- No cancel button in MVP — history rows show "Booked" with a small `TODO: cancellation` note visible only in dev, no user-facing cancel action.

### 6. Preventing double booking / double redemption

- Unique `(booking_pass_id, idempotency_key)` index → repeated submits collapse to one row.
- `SELECT ... FOR UPDATE` on the pass row inside the RPC serializes concurrent redemptions of the last credit.
- Slot re-check inside the RPC against `schedule_events` overlapping `[start_at, end_at)` prevents two students (or same student twice) claiming the same slot even if the earlier `slots` response was stale.
- Google event creation is idempotent per idempotency_key: we store `google_event_id` after insert; on retry we detect the existing redemption row and skip.

### 7. Out of scope for this pass

- Stripe/payments.
- Cancellation flow with credit restoration (schema supports it; UI leaves TODO comment; no fake button).
- Per-pass business-hours customization (hardcoded 09:00–20:00 local).
- Timezone picker (uses browser tz for display; stored as UTC).

### 8. Deliverables

Migration:
- `supabase/migrations/<ts>_booking_passes.sql` — tables, grants, RLS, `redeem_booking_pass` RPC, updated_at triggers.

Edge functions:
- `supabase/functions/booking-pass/index.ts` (public, token-gated).
- `supabase/functions/booking-pass-admin/index.ts` (admin JWT, handles create/rotate/revoke and returns raw token exactly once).

Frontend:
- `src/pages/BookingPass.tsx` + small subcomponents (`BookingPassSlotList`, `BookingPassStatusCard`).
- `src/pages/teacher/BookingPasses.tsx` + `CreateBookingPassDialog`, `BookingPassRow`.
- Route registrations in `src/App.tsx`.
- Teacher Desk sidebar link.

No changes to existing `Schedule.tsx`, `GoogleCalendarPanel.tsx`, or `scheduleEvents.ts`.
