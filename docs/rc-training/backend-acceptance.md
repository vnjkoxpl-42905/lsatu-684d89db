# RC Training backend deployment and acceptance

Status checked on 2026-10-18. No production writes or deployment were performed in this audit.

## Confirmed blockers

Read-only requests to the configured application Supabase REST endpoint returned `PGRST205` for both `public.rc_recall_attempts` and `public.rc_recall_recaps`. Neither table is exposed in the live schema cache. The application cannot create or finish these attempts until the backend migration is deployed.

A bucket lookup using the configured publishable key returned `404 NoSuchBucket` for `rc-recall-recordings`. Because private-bucket visibility depends on authorization, this alone does not prove absence. An authenticated admin must inspect the bucket and its policies. The missing tables independently establish that backend acceptance fails.

The audited migration is `supabase/migrations/20261016120000_rc_recall_attempts.sql`. It was absent from the audited `origin/main` snapshot `ca44df91`; its own header says it has not been applied remotely. Source presence is not deployment proof.

## Deployment route

1. Review the migration and resolve any frontend recovery findings before deployment.
2. Obtain Joshua's explicit confirmation immediately before any Lovable agent action that may spend credits. Confirm the Lovable backend deployment route. The project uses a Lovable Cloud-managed backend; do not apply this through the Supabase CLI.
3. Ask the Lovable agent for project `53b9a6f2-aba7-4ae4-8dd1-fa5b8aab4d76` to apply the exact reviewed SQL migration, including both tables, guards, RLS policies, and private bucket. Do not substitute a simplified schema or enable public audio access.
4. Record the deployment result and migration identifier. Re-run table availability checks and authenticated bucket inspection.
5. Merge/publish frontend only under the separately authorized branch/PR workflow. After an authorized merge to main, use the free frontend deployment and prove the changed live bundle. Backend deployment and frontend publication are separate results.

## Security review of the authored migration

- Attempts: authenticated students can select only their own rows; admins can read metadata. Inserts require matching `auth.uid()` and current Reading Center access. Updates require an unfinished owned attempt and current access. The trigger freezes attempt identity, mode, section, passages, confirmation scope and start time; any update to a finished attempt fails. No delete policy is created.
- Recaps: creation requires an owned unfinished attempt. Recap and student identity cannot change. A failed pathless recording may change voice so it can be retried silently. A saved recording cannot change its state or object path. A saved marker requires the storage object to exist. Updates after finalization are deliberately possible so backed-up recordings can recover later.
- Audio: the bucket is private, limited to 50 MiB and listed audio MIME types. Inserts require an owned attempt and current Reading Center access. Reads require the student's UUID as the first path component. The migration adds no admin audio, update or delete policy.
- Deployment prerequisite: `public.has_reading_center_access()` and `public.has_role(uuid, role)` must exist with matching signatures and appropriate execution permissions.
- Unverified grants: the migration does not explicitly grant table privileges. Inspect actual `authenticated` SELECT/INSERT/UPDATE grants after deployment; default privileges must not be assumed.
- Unverified policy composition: inspect all existing policies on `storage.objects`. PostgreSQL permissive policies combine with OR, so a separate broad policy could defeat the intended audio privacy. Test access using two real student identities plus an admin identity.
- Recovery limitation found during review: an inactive recording that never cleanly stopped can currently assemble its available chunks and upload them. With no recorded final chunk count, a missing trailing chunk cannot be detected. The UI must identify interrupted recordings as partial rather than claim complete recovery. Resolve this before claiming production readiness.

## Acceptance evidence required

Use authorized dedicated test accounts and retain created acceptance attempts as append-only history. Do not delete existing records or overwrite recordings.

- Signed-in entitled student: both tables read successfully; the private bucket is accessible only through authenticated owner requests. Starting practice creates exactly one owned attempt. Repeated start/retry after a lost response does not create duplicates.
- Silent workflow: complete a full four-passage section, confirm recap metadata persists, finalize, reload, and verify the same finished attempt and history on a second browser session. Confirm interrupted attempts resume at the saved step and completed attempts cannot resume as unfinished.
- Spoken workflow: explicitly grant microphone access, record, upload, read back metadata and object, play the private signed URL, and download the recording. Confirm the saved marker is written only after the object exists. Test unsupported/denied microphone access and silent fallback.
- Recovery: simulate an upload failure, preserve the device backup, reload/reconnect, retry, and verify one saved recap with one immutable path. Test lost upload/update responses, another active tab, a missing middle chunk, an unclean stop, and device storage failure. Report partial audio explicitly.
- Finalization: repeated Finish returns the stored result. An actual client request attempting to mutate a finalized attempt is rejected. A failed finalization remains visibly unfinished and retryable.
- Privacy: student B cannot select or alter student A's attempts/recaps, upload into A's folder, list A's audio, or sign/download A's object. Admin may read attempt/recap metadata but cannot read audio through ordinary authenticated storage access. An unauthenticated public object URL fails.
- Append-only: ordinary authenticated users cannot delete attempts/recaps or overwrite/delete audio. Saved recap paths cannot be replaced. New recaps cannot be added after an attempt is finished; late upload of an existing recap remains possible.
- Access: an account without Reading Center access cannot create/finalize attempts or upload. Existing own history remains readable under the authored policies; confirm that is the intended entitlement behavior.
- Capture results with account roles, attempt IDs, response statuses, and screenshots/DOM evidence; exclude tokens and credentials. Mark backend acceptance complete only after these signed-in checks pass.
