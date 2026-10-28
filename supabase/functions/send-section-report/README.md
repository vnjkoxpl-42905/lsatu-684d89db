# send-section-report

Emails the teacher a finished section: the complete per-question record, then
the diagnosis built from it (`docs/section-analysis-engine.md`).

Called by the student's browser immediately after `persistSectionResults`
writes the `section_history` row — the first moment both halves exist.

## Behaviour

- The caller's JWT identifies the student; the row is read with the service
  role; the two must match. A caller can only send their own sitting.
- Nothing is decided here. `analysis_json` was written once at completion and
  this function formats it. A second place deciding what a section meant is a
  second place that can disagree with what the student was already shown.
- Sends the `section-report` template, which carries its own fixed recipient,
  so there is no code path that can be talked into another address.
- Idempotent per sitting: `report_emailed_at` short-circuits a repeat, and the
  send itself carries `section-report:<id>` as its idempotency key.
- On failure the error string is written to `report_email_error` on the row. An
  email that never arrives and never explains itself is exactly the failure this
  feature exists to avoid.

## Environment

| Name | Required | Purpose |
| --- | --- | --- |
| `LOVABLE_API_KEY` | yes | Managed email API, via `_shared/sendAppEmail.ts`. |
| `APP_BASE_URL` | recommended | Base URL for the link back to the student's record. |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | yes (auto) | Provided by the runtime. |

## Deploy

```
supabase functions deploy send-section-report
```

Requires migration `20260829230000_section_analysis_report.sql`, which adds
`analysis_json`, `report_emailed_at` and `report_email_error` to
`section_history`. Without it every send fails on the update and says so.
