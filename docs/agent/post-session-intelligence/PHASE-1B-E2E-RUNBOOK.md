# Phase 1B E2E Runbook — Scan + Resolution Queue

Use this only after Lovable has deployed `scan-session-notes` and
`supabase/functions/_shared/sessionIngestCore.ts` from current `main`.

Do not run this before the Phase 1A hardening redeploy is live. Do not apply migrations.
Do not add cron. Do not publish anything student-facing. Do not start Phase 2.

## Preconditions

- Lovable confirms frontend redeployed from current `main`.
- Lovable confirms `ingest-session-note` redeployed from current `main`.
- Lovable confirms `scan-session-notes` deployed from current `main`.
- Lovable confirms `_shared/sessionIngestCore.ts` was deployed with it.
- You are signed in as admin.
- Phase 1A real-doc E2E has passed, or you intentionally accept that Phase 1B remains
  conservative and queues everything.

## Expected V1 Behavior

Phase 1B is conservative:

- scan detects recent Gemini Notes emails with Google Doc links;
- detected notes enter the resolution queue;
- the scan does not auto-attach transcripts to students;
- resolving a queued row with a selected student stores the transcript admin-side only;
- discarding a row removes it from the active queue;
- re-scan does not create duplicates for the same Gmail message id / Google Doc id.

## Scan Check

1. Open `/teacher/session-ingest`.
2. Confirm the page shows the ingest form and scan/resolution queue UI.
3. Click **Scan for new session notes**.
4. Screenshot the scan result / queue state.

Expected result:

- scan completes without auth/permission errors;
- real Gemini Notes candidates appear as queued rows when found;
- rows include enough source metadata to choose a student safely;
- no transcript is attached to a student before manual resolve;
- no student-facing item, homework, notification, chat message, or publish action is created.

## Resolve Check

1. Pick one queued real tutoring-session row.
2. Select the correct enrolled student.
3. Click **Resolve**.
4. Screenshot the result / updated queue.

Expected result:

- row leaves the active needs-match queue;
- transcript storage/context/session rows are created admin-side;
- ledger row records resolved student and resolver metadata;
- no student-facing output is created.

## Re-Scan Idempotency Check

1. Click **Scan for new session notes** again.
2. Compare the queue and prior resolved row.

Expected result:

- no duplicate queue row for the same Gmail message id;
- no duplicate queue row for the same Google Doc id;
- no duplicate transcript context/session row for the resolved item.

## Discard Check

1. Pick a queued row that is not a tutoring session, or use a safe test row if one exists.
2. Click **Discard**.
3. Screenshot the updated queue.

Expected result:

- row leaves the active queue;
- ledger records discarded state / reason if exposed;
- re-scan does not re-add the discarded row as active work;
- no transcript/session/student-facing output is created.

## What To Report Back

Use this template:

```md
## Phase 1B E2E Result

Date:
Live URL:
Lovable deploy confirmed: yes/no

Scan:
- Scan completed: yes/no
- Number of candidates found:
- Number queued:
- Any auth/permission errors:
- Screenshot/result:

Queued row inspected:
- Gmail subject:
- Gmail message id:
- Google Doc id:
- Parsed student name:
- Parsed student email present: yes/no/unknown
- Calendar hint present: yes/no/unknown
- Confidence shown:

Resolve:
- Row resolved: yes/no
- Student selected:
- Ingestion id:
- Transcript context id:
- Session id:
- Row left queue: yes/no

Re-scan:
- Duplicate Gmail row created: yes/no/unknown
- Duplicate Doc row created: yes/no/unknown
- Duplicate transcript/session created: yes/no/unknown

Discard:
- Row discarded: yes/no/not tested
- Re-scan re-added discarded active row: yes/no/unknown

Student-facing safety:
- Classroom item created: yes/no/unknown
- Homework created: yes/no/unknown
- Notification/chat created: yes/no/unknown

Decision:
- Phase 1B deploy behavior acceptable: yes/no
- Enough evidence for confident auto-attach design: yes/no
- Parser/calendar gaps observed:
```

## Next Build Decision

If Phase 1A and Phase 1B E2E results show reliable student email + student name +
calendar agreement, the next repo build target is confident auto-attach in
`scan-session-notes`.

If any signal is missing or inconsistent, keep Phase 1B conservative and continue using
manual resolution.
