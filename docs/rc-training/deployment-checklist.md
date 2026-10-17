# RC Training persistence: deployment checklist

Status: **not deployed.** Nothing in this change applies a migration, creates a table,
creates a bucket or writes to any remote database. This list is for the person who is
authorised to deploy.

## Why this exists

The preceding audit (2026-10-16) found that the connected API answered
`PGRST205: Could not find the table 'public.rc_recall_attempts' in the schema cache`.
Starting a real section and loading history both fail until the persistence objects
exist and the API schema cache knows about them. A migration file on disk is not proof
of deployment.

What the app does about it now:

- On entry it checks both attempts and recaps tables (`select id ... limit 1` for the signed-in
  student). A missing table (`PGRST205`, `42P01`) or a refusal shows an actionable message
  and keeps **Start section** off. A dropped connection shows "we could not check" and
  also keeps it off. It also lists the signed-in student's private recording folder to detect an absent or denied bucket. It never substitutes another table or fakes a save.
- These checks prove only that read requests answered. An empty RLS-filtered read cannot establish INSERT/UPDATE rights, and a bucket listing cannot prove upload permission. The first actual create proves attempt insertion; recap creation, finalization and audio upload require their separate signed-in acceptance checks below.
- History shows a calm "will appear once saving is available" message in that state.
- Reading Progress and the Dashboard show the same message instead of a zero.

## Objects the existing migration creates

Source: `supabase/migrations/20261016120000_rc_recall_attempts.sql` (unchanged by this work).

| Object | Notes |
|---|---|
| `public.rc_recall_attempts` | One row per attempt. RLS on. Insert needs `has_reading_center_access()` and an unfinished row. A finished row is frozen by trigger `rc_recall_attempt_guard`. |
| `public.rc_recall_recaps` | One row per recall, with its own `recording_state`. Trigger `rc_recall_recap_guard` fixes the path once set and checks the storage object exists before `saved`. |
| Storage bucket `rc-recall-recordings` | Private, 50 MB limit, audio MIME types only. Insert-only for the owner, read-only for the owner. No update, no delete, no admin audio read. |
| Policies | `rc recall attempts read own / admin read / insert own / finalize own`; `rc recall recaps read own / admin read / insert own / update own`; `rc recall recordings insert own / read own`. |

The migration depends on `public.has_role(uuid, text)` and
`public.has_reading_center_access()`. Confirm both exist in the target project first.

## Before applying (read-only checks)

1. Target is the intended project. The audit's evidence came from the project behind the
   local preview, not from a production audit.
2. `select to_regclass('public.rc_recall_attempts'), to_regclass('public.rc_recall_recaps');`
   returns nulls (nothing half-applied).
3. `select proname from pg_proc where proname in ('has_role','has_reading_center_access');`
   returns both.
4. `select id from storage.buckets where id = 'rc-recall-recordings';` is empty, or the
   bucket is private.

## Applying

Deployment routing and any Lovable credit spending need their own explicit authorisation.
Apply the migration through the project's normal path. Do not edit it in place; if it has
to change, add a new migration.

After it applies, make sure the API exposes the new tables. If `PGRST205` persists, reload
the PostgREST schema cache (`notify pgrst, 'reload schema';`) and re-check.

## Verifying it (signed-in, with a test account that has Reading Center access)

Run these with real requests, not mocks. Record the results in the acceptance notes.

1. **Create.** Start a section. Expect one `rc_recall_attempts` row for the account.
2. **Same-id retry.** Repeat the same insert id; expect `23505` and the app reading the row
   back rather than creating a second attempt.
3. **Paragraph cycle.** Finish two paragraphs silently. Expect `rc_recall_recaps` rows with
   `voice = 'silent'`, `recording_state = 'not_recorded'`.
4. **Spoken passage recall.** Record, stop, upload. Expect the row `saved`, an object under
   `<student_id>/<attempt_id>/<recap_key>-<uuid>.<ext>`, and playback through a signed URL
   from History.
5. **Finish.** Expect `finished_at`, `elapsed_seconds`, `completed` set; a second Finish or
   End reports the stored result and changes nothing.
6. **Read back.** History shows the attempt as Completed with its duration and recalls.
7. **Isolation.** A second account cannot read the first account's attempts, recaps or
   audio. An admin can read metadata but not audio.
8. **Pagination.** With more than 25 attempts, "Show earlier attempts" pages without
   skipping or repeating.
9. **Failure paths** (against a non-production copy): offline during Finish, a lost response
   after commit, denied upload, quota failure.

Until steps 1 to 6 pass against the real backend, do not describe persistence as working.
Mocked tests in the repository exercise the app's behaviour against explicit fakes; they
are not a backend pass.

## What is deliberately not in the schema

- **No server-side checkpoint.** The attempts table has no step, paragraph or time-away
  fields. Resume therefore uses a same-device record in the browser's local storage, scoped
  to the signed-in account and attempt. The interface says "your place is kept on this
  device only" and never offers cross-device resume. If cross-device resume is wanted, it
  needs a new, separately reviewed migration (for example a `rc_recall_checkpoints` table
  with owner-only RLS). Nothing in the app would change shape: `lib/checkpoint.ts` is the
  single place to add a server store.
- **No stored procedure version.** Attempts record `mode` only. History labels `rc_recall`
  neutrally as "RC paragraph recall", a procedure family shared by earlier RC Flow and
  current RC Training. The data cannot establish which presentation or voice default an
  old attempt used. No release-date cutoff is inferred. Individual recap rows retain
  their recorded silent/spoken choice. `cumulative_recall` remains "Earlier cumulative
  recall". A future version marker requires a separately reviewed migration.

## Rollback and safety

Do not drop, truncate or delete rows or storage objects as a cleanup step. The design is
append-only. If the deployment must be backed out, disable the Reading Center route for
RC Training instead and keep the data.
