# Lovable Handoff Prompt — Post-Session Intelligence Pipeline

**Use only when actually needed.** Most of this pipeline is buildable directly in the
repo (orchestrator edge functions, UI, hooks, migration file). Lovable is needed for
the narrow deploy/connector items below. Do not run a Lovable pass for general schema
or app work — preserve credits.

## When to send this

Current state: Phase 1A was deployed, Phase 1B is code complete on `main`, and the
latest hardening commit is not live until Lovable redeploys. Use this only for the
narrow redeploy/deploy gates below, not for implementation.

## The narrow asks

1. **Redeploy Phase 1A hardening from current `main`.**
   - Redeploy the frontend so anonymous admin-route users hit `/auth?returnTo=...`
     instead of the generic locked module.
   - Redeploy `ingest-session-note` so late ledger failures clean up transcript
     storage/context/session artifacts and duplicate races return `already_ingested`.
   - Do not apply migrations; the Phase 1A `session_ingestions` migration already exists.

2. **Deploy Phase 1B only when Joshua requests it.**
   - Deploy `scan-session-notes` from `supabase/functions/scan-session-notes/index.ts`.
   - Deploy its shared helper at `supabase/functions/_shared/sessionIngestCore.ts`.
   - Do not add cron and do not alter schema/RLS.

3. **Confirm Google connector scopes (read-only check if anything fails).**
   - Gmail: can the existing connector read message bodies + extract the Google Doc
     link from Gemini Notes emails (subject pattern `Notes: "<name>" <date>`)?
   - Drive: can it export the linked Google Doc's full body (summary, next steps,
     invited student email, timestamped transcript)?
   - Calendar: can it read events for time/attendee corroboration?
   If all three already work via the current Connector Gateway setup, report that and stop.

4. **Confirm secrets exist** in the Lovable project (not in git):
   `LOVABLE_API_KEY`, and the Google connector keys used by `gmail` / `gdrive` /
   `gcal-*` functions. No new secrets should be needed for V1.

5. **Later only — cron trigger.** When Phase 3 enables automatic scanning, schedule the
   `scan-session-notes` function (e.g. hourly) using the same service-role pattern as
   `gcal-sync-pull`. Do not enable this until matching is proven in Phases 1–2. Note:
   the cron/service-role path forces the explicit-`created_by` attribution story in
   build-spec §9a.

6. **Only if attendee-email calendar corroboration is required** (build-spec §3d):
   `schedule_events` stores no attendees. Confirm the Calendar connector scope permits a
   direct event fetch returning `attendees[].email` (for a new `gcal-event-get` call), or
   plan to extend `gcal-sync-pull` + `schedule_events` to persist attendees. V1 does not
   need this — it corroborates by time+title window. Do not add unless Joshua requires it.

## Explicitly NOT part of any Lovable pass

- No schema changes through Lovable — the `session_ingestions` migration is already
  applied for Phase 1A.
- No edge-function rewrites — deploy the repo sources as-is.
- No model/provider change — V1 uses the existing Gateway (Gemini).
- No student-facing changes.
