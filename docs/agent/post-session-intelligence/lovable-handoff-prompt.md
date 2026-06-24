# Lovable Handoff Prompt — Post-Session Intelligence Pipeline

**Use only when actually needed.** Most of this pipeline is buildable directly by
Claude in the repo (orchestrator edge functions, UI, hooks, migration file). Lovable
is needed only for the narrow items below. Do not run a Lovable pass for general schema
or app work — preserve credits.

## When to send this

Send this only after the spec is approved AND Phase 1 is about to be built, to confirm
the connector/secret prerequisites and (later) the cron trigger. If a quick check
confirms the scopes/secrets already exist, **no Lovable pass is required at all.**

## The narrow asks

1. **Confirm Google connector scopes (read-only check first).**
   - Gmail: can the existing connector read message bodies + extract the Google Doc
     link from Gemini Notes emails (subject pattern `Notes: "<name>" <date>`)?
   - Drive: can it export the linked Google Doc's full body (summary, next steps,
     invited student email, timestamped transcript)?
   - Calendar: can it read events for time/attendee corroboration?
   If all three already work via the current Connector Gateway setup, report that and stop.

2. **Confirm secrets exist** in the Lovable project (not in git):
   `LOVABLE_API_KEY`, and the Google connector keys used by `gmail` / `gdrive` /
   `gcal-*` functions. No new secrets should be needed for V1.

3. **Later only — cron trigger.** When Phase 3 enables automatic scanning, schedule the
   `scan-session-notes` function (e.g. hourly) using the same service-role pattern as
   `gcal-sync-pull`. Do not enable this until matching is proven in Phases 1–2. Note:
   the cron/service-role path forces the explicit-`created_by` attribution story in
   build-spec §9a.

4. **Only if attendee-email calendar corroboration is required** (build-spec §3d):
   `schedule_events` stores no attendees. Confirm the Calendar connector scope permits a
   direct event fetch returning `attendees[].email` (for a new `gcal-event-get` call), or
   plan to extend `gcal-sync-pull` + `schedule_events` to persist attendees. V1 does not
   need this — it corroborates by time+title window. Do not add unless Joshua requires it.

## Explicitly NOT part of any Lovable pass

- No schema changes through Lovable — the `session_ingestions` migration is authored in
  the repo and applied via the normal Supabase migration flow with Joshua's approval.
- No edge-function rewrites — new functions follow existing repo patterns.
- No model/provider change — V1 uses the existing Gateway (Gemini).
- No student-facing changes.
