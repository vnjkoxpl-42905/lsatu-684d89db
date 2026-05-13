# Plan: Google Calendar two-way sync (admin account)

## Scope
Connect **your** Google account once via the Lovable Google Calendar connector. Read your events into `/schedule` for everyone to see, and push/update events created in LSAT U back to Google. Per-user calendars are out of scope.

## What you'll do once
1. Approve the connector linking prompt and pick the Google account whose calendar should power the Schedule page.
2. Confirm a single "source" calendar to sync (defaults to `primary`, can pick another from your calendar list).

## What gets built

### 1. Connector + secrets
- Link `google_calendar` connector (workspace-level OAuth). No code-side secrets needed; gateway provides `GOOGLE_CALENDAR_API_KEY` + `LOVABLE_API_KEY` to edge functions.

### 2. Database (`schedule_events` table)
Stores the synced canonical copy so the Schedule page renders fast and supports two-way sync.
- Fields: `google_event_id` (unique), `calendar_id`, `title`, `description`, `location`, `start_at`, `end_at`, `all_day`, `status`, `html_link`, `source` (`google` | `lsatu`), `created_by`, `etag`, `last_synced_at`, `deleted_at`.
- RLS: read = authenticated users (it's a shared admin calendar). Write = `is_admin` only.

### 3. Edge functions (Deno, in `supabase/functions/`)
- `gcal-sync-pull` — calls `GET /calendars/{id}/events` (incremental via `syncToken`, falls back to time-window). Upserts into `schedule_events`. Marks deletions.
- `gcal-event-write` — admin-only. Handles create / update / delete in LSAT U → calls `POST/PATCH/DELETE` on Google Calendar, then upserts the response row.
- `gcal-webhook` *(optional, recommended)* — receives Google push notifications (watch channel) and triggers `gcal-sync-pull`. If we skip webhooks, we rely on cron + on-demand pull.

### 4. Scheduled pull
- `pg_cron` job runs `gcal-sync-pull` every 5 minutes so Google → LSAT U changes appear without user action.

### 5. Schedule page (`src/pages/Schedule.tsx`)
- Replace placeholder data with `schedule_events` query (TanStack Query, realtime subscription).
- Calendar/list view of upcoming events with title, time, location, link to Google.
- Admin-only "New event" / edit / delete UI that calls `gcal-event-write`.
- "Sync now" button (admin) → invokes `gcal-sync-pull`.

### 6. Settings surface
- Small admin panel section: "Google Calendar — Connected as <email>", calendar picker, Disconnect.

## Out of scope
- Per-student Google sign-in / personal calendars (would need custom Google Cloud OAuth project).
- Importing past events older than 60 days (configurable later).
- Sending invites to attendees from LSAT U (can add after v1).

## Open question I'll default unless you say otherwise
- **Sync window:** next 90 days, rolling. Adjust later via env.
- **Conflict policy:** Google wins on conflict (Google `etag` is source of truth).

Ready to implement on approval.