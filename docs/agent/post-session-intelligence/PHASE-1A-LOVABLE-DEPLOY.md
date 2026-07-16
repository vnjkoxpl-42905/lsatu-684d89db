# Phase 1A Lovable Deploy Prompt — Historical Only

Do **not** paste this file into Lovable now.

Phase 1A was already deployed via Lovable on 2026-06-24. Lovable applied the canonical
`session_ingestions` migration as:

`supabase/migrations/20260624204004_2f2c47bc-32b9-4cf0-bb39-43b29e9fd7c4.sql`

Since the initial deploy, commit `159bdd6609332101e82d4544608b0ea644fc6507`
(`fix(session-intelligence): harden auth and ingest integrity`) landed on `main`.
That hardening is not live until Lovable redeploys:

- the frontend, for the admin-route `/auth?returnTo=...` redirect behavior;
- `ingest-session-note`, for late-failure cleanup and duplicate/race handling.

The current Lovable prompt is:

**`docs/agent/post-session-intelligence/LOVABLE-CLOUD-SYNC-PROMPT.md` — section A.**

(This file previously pointed at `~/Downloads/PHASE-1B-LOVABLE-PROMPT.md`, which does
not exist. The consolidated in-repo prompt superseded it on 2026-06-25 and is the only
one to use.)

That prompt covers every required deploy action in one pass:

1. Redeploy Phase 1A hardening from current `main`.
2. Deploy Phase 1B `scan-session-notes` and `_shared/sessionIngestCore.ts`.
3. Deploy Phase 2 `synthesize-session-bundle`.

Current constraints remain:

- do not apply migrations;
- do not alter schema or RLS;
- do not add cron;
- do not rewrite edge functions;
- do not add student-facing output.
