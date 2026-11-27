# Release the LSAT U teaching tools on the existing connector

The MCP URL stays `https://atrcqxpmqrynmtvvyjju.supabase.co/functions/v1/mcp`. Keep the existing OAuth issuer, client registration and `authenticated` audience. The Lovable build bundles `src/lib/mcp/index.ts` into the Edge Function via `scripts/mcp-vite.ts`, which resolves Windows paths and application aliases. The SDK manifest CLI exports the same registry for Lovable.

## Verify the checkout before approving a release

Run these from the LSAT U checkout.

```powershell
npm ci
node scripts/build-mcp-section-catalog.mjs --check
npm exec --offline -- lovable-mcp-extract-manifest
npm run typecheck
npm run test -- src/lib/mcp src/lib/assignWork.test.ts src/components/teacher/library/AssignWorkSheet.test.tsx src/pages/AssignedRcSectionDirections.test.tsx src/lib/drillRunSpec.test.ts
npm run build
deno test --no-lock --allow-env --allow-read --config supabase/functions/mcp/deno.json supabase/functions/_shared/mcpTeachingProtocol.test.ts
deno test --no-lock supabase/functions/inbox-alert-delivery/index_test.ts
git diff --check
```

Run the SQL fixtures separately as a database owner in empty local PostgreSQL databases. They build synthetic identities and a reduced schema. Use the project-role grants and RLS policies on a staging Supabase project for the release test.

```powershell
psql -X -v ON_ERROR_STOP=1 -d lsatu_assignment_fixture -f scripts/verification/mcp-teaching-assignments.sql
psql -X -v ON_ERROR_STOP=1 -d lsatu_inbox_fixture -f supabase/tests/mcp-inbox/acceptance.sql
```

The canonical catalog generator emits both the connector metadata and the private PostgreSQL LR identity snapshot. For future bank changes, deliver the refreshed database snapshot in a new forward migration and keep already applied migrations immutable. If an RC section preview is blocked, check that the active protected RC manifest matches the catalog's complete ordered IDs.

The catalog includes 233 full sections. PT119.S1, PT136.S3 and PT138.S4 are excluded because their source rosters have unresolved missing positions. Explicitly marked removed questions stay out of the queue without renumbering the remaining questions.

## Deploy the backend before refreshing the workspace tools

1. Approve the release branch and confirm the Lovable Cloud deployment route. Use the existing LSAT U project linked to Supabase project `atrcqxpmqrynmtvvyjju`. Obtain separate approval before any Lovable credit spend.
2. In staging, apply `20261127205500_mcp_lr_section_catalog.sql`, `20261127210000_mcp_teaching_assignments.sql`, `20261127211000_mcp_inbox.sql`, and `20261127212000_inbox_alert_outbox.sql` in that order after the repository's earlier migrations. Deploy the `mcp` Edge Function via Lovable Cloud. Verify the prior tool list plus the new actions and the OAuth challenge. The MCP function's gateway JWT setting stays off so its SDK can perform OAuth discovery and validation.
3. Use a synthetic student with Classroom and Drill access and no saved PT150 set in the isolated staging fixture. Search for PT150 LR, preview with `any_section: true`, and confirm that the result resolves to PT150.S2 with 25 questions and a 35-minute clock. Use the exact `execution` values from the preview and a stable `idempotency_key` to assign. Repeat with the same key and compare the assignment, set and Classroom IDs. Preview again to see the duplicate. As the test student, verify the Classroom entry launches the full-section runner with original order and a countdown. Check `notify: false` first, then use a separate test assignment to verify bell, Inbox and email results. Also test one protected RC section, a guided drill, a bootcamp target and an activity against staging data.
4. In a fixture thread, list unread counts, read the exact incoming message and verify the count remains unchanged. Confirm the connected teacher is denied access to a thread belonging to another teacher. Approve one explicit reply in the fixture thread, retry with the same key and verify one stored reply.
5. After staging passes and the production release is approved, apply the same ordered migrations and deploy the same `mcp` function to the production URL via Lovable Cloud. Verify the protected resource metadata and authenticate to check `initialize` and `tools/list` against the committed manifest. Run production write checks only with a designated synthetic student.
6. A ChatGPT Business workspace admin or owner opens the existing LSAT U connection in workspace app settings and refreshes its tool list. Review the read/write descriptions and publish the updated snapshot. For a legacy app, start in Admin Console → Plugins → Manage Legacy Apps. Verify the existing connection in a new ChatGPT Work chat and in Codex. Joshua can then repeat the synthetic-student smoke test from the Dot. [OpenAI's custom MCP server instructions](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)

Use this input for `preview_teaching_assignment` after choosing the synthetic student by exact ID. Pass the returned `execution` object to `assign_teaching_work` with a stable key such as `mcp-pt150-staging-001` after approval.

```json
{
  "student_id": "00000000-0000-4000-8000-000000000002",
  "item": { "kind": "prep_test_section", "prep_test": 150, "section_type": "LR", "any_section": true },
  "settings": { "notify": false }
}
```

## Review and opt in to Inbox email separately

ChatGPT Work and dots support native MCP event subscriptions. LSAT U's current Lovable MCP transport exposes tool calls and the web app consumes Supabase Realtime internally. It has no MCP event discovery, subscription or delivery implementation. [OpenAI's MCP Events documentation](https://developers.openai.com/plugins/build/mcp-events)

The fallback queues new student messages to the opted-in teacher's own threads and sends only `thread_id` and `message_id` to `contact@aspiringattorneys.com`. Default installation leaves the owner, schedule and worker disabled.

1. Review the queue and signed delivery worker. Once authorized to stage delivery, deploy `inbox-alert-delivery` via Lovable Cloud. Confirm `pg_cron`, `pg_net`, Supabase Vault, and `extensions.hmac(text,text,text)` availability. Use a random secret of at least 32 characters as both the Vault secret `lsatu_inbox_alert_signing_secret` and the Edge secret `INBOX_ALERT_SIGNING_SECRET`. Set `INBOX_ALERT_PROJECT_REF` to the staging ref and configure the verified `FROM_EMAIL` and `RESEND_API_KEY` there.
2. After approval to send the synthetic Gmail test, set `INBOX_ALERT_DELIVERY_ENABLED=true` in staging. The database owner schedules `select cron.schedule('lsatu-inbox-alerts-v1', '* * * * *', 'select lsatu_inbox_alerts.dispatch()');`. Set `owner_id` to Joshua's verified LSAT U admin ID, then set `project_ref` and `enabled_at = clock_timestamp()` on the private settings singleton. The delivery address is fixed independently of the LSAT U sign-in email.
3. Send one synthetic student Inbox message. Check that the queue is accepted and Gmail receives exactly one notice with only the opaque IDs. Exercise retry and confirm that admin replies, unrelated threads and old messages produce no alert. Use `read_inbox_thread` with both IDs from the alert under the opted-in OAuth account. A provider acceptance is distinct from mailbox delivery.
4. Configure an appropriate Gmail trigger in ChatGPT as a separate action. Verify the trigger invokes the connected Dot and can fetch the correct thread. Keep production flags unset until the full review and test pass. Pause delivery by clearing `enabled_at` and setting `INBOX_ALERT_DELIVERY_ENABLED=false`. The worker stops retrying after 22 hours to stay within the provider's 24-hour deduplication window. [Resend idempotency](https://resend.com/blog/engineering-idempotency-keys)

## Teacher Workspace actions still outside the connector

| Surface | Remaining workflows |
| --- | --- |
| Student dossier and review | Per-student Classroom inventory and detailed guided drill, activity and bootcamp progress. Score trends, section and question analytics, error logs, grading, feedback, notes edits, private dossier notes and uploads. |
| Teaching library and assignments | Author or edit sets, drills, bootcamps and activities. Assign a whole PrepTest, build bundles, pin an offline guided-drill PDF, reissue or withdraw work, change published settings, grade structured work or grant Reading Center access. |
| Planning and sessions | Edit schedules and weekly plans, triage Teacher Today, ingest transcripts and review or publish session bundles. |
| Inbox | Start a new conversation, mark read, archive, and send or download attachments. The Gmail tab of the Teacher Workspace remains a separate surface. |
| Administration | Billing, account deletion and permission changes remain outside this release. |
