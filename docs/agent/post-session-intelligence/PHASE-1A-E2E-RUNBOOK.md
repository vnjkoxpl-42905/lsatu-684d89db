# Phase 1A E2E Runbook — Real Gemini Notes Doc

Use this after Lovable has redeployed the frontend and `ingest-session-note` from
current `main`.

Do not run this against live until the redeploy is confirmed. Do not publish anything
student-facing. Do not start Phase 2.

## Preconditions

- Lovable confirms frontend redeployed from current `main`.
- Lovable confirms `ingest-session-note` redeployed from current `main`.
- You are signed in as admin.
- You have one real Gemini Notes Google Doc from a real tutoring session.
- You know the correct enrolled student for that session.

## Candidate already found

Use this only if it is still the intended test case:

- Gmail subject: `Notes: “Lydia” Jun 19, 2026`
- Gmail message id: `19ee293b9d5d35f1`
- Google Doc URL:
  `https://docs.google.com/document/d/1jBODqlPYc5f9u_ayRybrT16OQA5gkJ8C2Hd5dWboUyI/edit?usp=meet_tnfm_email`
- Student signal: `Lydia Lee`

Do not paste transcript text into chat unless it is needed to debug a failure.

## Happy Path

1. Open `/teacher/session-ingest`.
2. Confirm the page shows the ingest form, not `Premium Content Locked`.
3. Paste the Gemini Notes Google Doc URL.
4. Select the correct student.
5. Paste the Gmail message id if available.
6. Click **Ingest transcript**.
7. Screenshot the result panel.

Expected result:

- success result panel appears;
- `already_ingested` is false on the first run;
- result includes an ingestion id;
- result includes a transcript context id;
- result includes a session id;
- result includes transcript size metadata;
- no student-facing item, homework, notification, chat message, or publish action is created.

## Idempotency Check

1. Run the same Doc URL and student again.
2. Screenshot the result panel.

Expected result:

- no duplicate transcript context row;
- no duplicate student session row;
- no duplicate ledger row;
- the UI reports already ingested / no duplicate behavior.

## Bad Input Check

Run at least one fail-closed path:

- malformed Doc id or URL; or
- non-Google-Doc Drive file id; or
- blocked/invalid student selection if available.

Expected result:

- visible error;
- no transcript context row;
- no student session row;
- no student-facing output.

## What To Report Back

Use this template:

```md
## Phase 1A E2E Result

Date:
Live URL:
Lovable redeploy confirmed: yes/no

Test Doc:
- Gmail subject:
- Gmail message id:
- Google Doc id:
- Student selected:

Happy path:
- Success: yes/no
- Ingestion id:
- Transcript context id:
- Session id:
- Already ingested on first run: yes/no
- Transcript size:
- Screenshot/result panel:

Idempotency:
- Re-run result:
- Duplicate transcript context rows: yes/no/unknown
- Duplicate session rows: yes/no/unknown
- Duplicate ledger rows: yes/no/unknown

Bad input:
- Case tested:
- Result:
- Confirmed no write: yes/no/unknown

Student-facing safety:
- Classroom item created: yes/no/unknown
- Homework created: yes/no/unknown
- Notification/chat created: yes/no/unknown

Real Gemini Notes format observations:
- Email sender:
- Subject shape:
- Doc link shape:
- Student email present in Doc: yes/no
- Student name present in Doc: yes/no
- Session date/time present: yes/no
- Calendar agreement apparent: yes/no/unknown

Decision:
- Safe to proceed to Phase 1B deploy test: yes/no
- Enough evidence for confident auto-attach design: yes/no
```

## Next Build Decision

If the real email/Doc reliably provides student email + student name + session time, and
calendar agreement is present, the next repo build target is confident auto-attach in
`scan-session-notes`.

If any signal is missing or inconsistent, keep Phase 1B conservative: scan to queue,
manual resolve only.
