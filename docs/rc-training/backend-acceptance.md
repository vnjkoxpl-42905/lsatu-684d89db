# RC Training backend deployment and acceptance

## Version 2 passed the bounded semantic and continuous-audio controls

After Joshua approved the capture migration, grader revision and five additional provider calls, the root reported Lovable deployed commit `6d68da6897580f275681305a8a45f77d03927294`, Drizzle migration `0036`, build `2026-10-18-rc-grader-2`. Four live assessments passed with exactly one new ASR call and four judge calls, with no retries. Three assessments reused trusted version-1 transcripts after source/audio hash verification.

| Control | Meaning points | Result |
| --- | --- | --- |
| Accurate paraphrase | 6/6, 100% | All three canonical sentence units preserved |
| Substantial omission | 2/6, 33% | Correct premise retained; psychological evidence and examples missing |
| Changed quantities and certainty | 0/6, 0% | Some/all, apparent/proved, most-by-six/every-exactly-six, and can/always changes identified |
| Continuous perfect reading, omitted recall, perfect checking | 2/6, 33% | Only hidden-recall words reached the judge; perfect read/check speech did not inflate points |

The continuous control used offline synthesized speech, 112.553 seconds of audio and an immutable 50,159–62,371 ms recall window. Its graded transcript exactly matched the short omitted-details recall. All four cached grading requests left their persisted rows unchanged, including tries, usage counters and hashes. The feedback now names actual missing details and changed qualifications rather than advising gist or summarizing.

Twelve live capture checks passed: capture/window creation, upload, saved-state propagation to the linked recap, rejection of window mutation and saved-capture mutation, admin metadata isolation, admin audio-signing denial, anonymous isolation and finalization. No records were deleted or overwritten. Results, transcripts of synthetic speech, generated assessments and usage counters are recorded in `grader-v2-acceptance-results-20261018.json`; continuous fixture timings are in `continuous-grader-fixture-20261018.json`.

These are controlled API/semantic checks, not evidence of browser microphone capture, keyboard operation, or crash recovery. The three-unit denominator is deterministic sentence/chunk meaning points with AI semantic judgments, not a calibrated LSAT score. The version-1 failed control below remains preserved as historical evidence and is superseded by this version-2 pass.

## Earlier version-1 semantic acceptance was partial

With Joshua's explicit approval for at most six provider calls, three offline Windows TTS recordings were tested against the same canonical PT140, section 4, passage ID 16, paragraph 1. The live source URL returned HTTP 200 and matched the local bank text. The paragraph SHA-256 was `023476d01ea080e07f76eba650d691e40591a9bdeeae0522cff5cc5004240df6`. Only synthetic speech was submitted. No hardware microphone recording was sent to AI.

Exactly three new grading requests were made, conservatively accounting for all six approved calls (one Deepgram transcription and one judge call per recording). No failed grading request was retried. Two additional cached requests returned the ready grades without changing `tries`, `updated_at`, transcript, or source/audio hashes.

- Accurate paraphrase: ready. The assessment accepted reworded ideas and retained qualifications, evidence, age example and athletic traits. Six details were marked kept.
- Substantial omission: ready. It accepted the correctly recalled premise while identifying missing psychologists, prodigies, apparent heritability, age and athletic examples. It did not equate a correct gist with complete recall.
- Changed quantifiers and certainty: failed safely with stored reason `ungrounded_source_evidence`, `tries=1`. Its ASR transcript and source/audio hashes were persisted, but the proposed assessment failed the source quotation guard. No fabricated grade was displayed. This control has not passed semantic acceptance.

The ready assessments' next-step advice also recommended summarizing. That wording conflicts with the full-detail recall task and needs correction. Citation reliability and teaching feedback remain launch blockers for the grader. A judge-only retry may reuse the saved transcript, but requires a separately approved additional provider budget. Detailed synthetic fixture texts and per-request results are in `grader-acceptance-fixtures-20261018.json` and `grader-acceptance-results-20261018.json`.

An initial read-only preflight used a synthetic attempt finalized as ended early; the deployed grader correctly refused it with HTTP 409 because the deployed contract now requires `completed=true`. That record was retained unchanged. Fresh completed synthetic attempts were used for all three provider tests.

## Authenticated acceptance after deployment on 2026-10-18

After Joshua approved backend deployment and acceptance, the root agent reported Lovable applied commit `18ad58f8` through Drizzle migrations `0033` and `0034`. The following live tests then passed under the saved tester and admin accounts. The earlier missing-schema findings below are historical and were superseded by these checks.

Twenty authenticated/anonymous checks passed. Both tables are now readable. The tester created one-passage and four-passage attempts, silent and spoken recap metadata, and uploaded a valid one-second synthetic MP3. The saved row was read back. An owner-signed audio URL returned exactly the original 8,611 bytes. Admin metadata read succeeded; admin audio signing failed. Anonymous public audio access failed, and anonymous attempt reads returned no rows. Both attempts finalized as ended early. A subsequent finalized update affected no rows and the original result remained unchanged. A new recap after finalization was rejected with HTTP 403.

Retained acceptance attempts: `85703227-ea03-4454-9bac-94c52903dd01` (one passage) and `fd7e5b4d-1ac2-4f59-9990-751d46c7af87` (four passages). Their recap keys begin `acceptance-20261018-`. No records or objects were deleted or overwritten, and no permissions were changed. Sanitized per-check evidence is in `backend-acceptance-results-20261018.json`; it contains no credentials, tokens or signed URLs.

Fixture correction: the four-ID raw API test used `[14,15,16,17]`; the actual PT140 section contains `[14,15,16,18]`. That test proves allowed cardinality and persistence, not canonical section identity. The valid published-bank selection is checked separately by the frontend integrity tests. The later semantic-grader acceptance fixtures use canonical passage ID `16` with the valid paragraph key `p1-para1-recall`.

These API checks do not prove microphone capture, browser playback, crash recovery, or UI completion. Those require browser acceptance. A second non-admin student and a no-entitlement account were unavailable, so cross-student and revoked-access checks remain unverified. Admin audio denial provides a tested separate-identity check but does not substitute for those cases. The earlier interrupted-recording source defect was repaired locally and requires final browser recovery acceptance.

The deployed compatible schema differs from the initial authored PostgreSQL migration: the root reported Lovable required `student_id uuid not null` without a direct auth/profile foreign key, while retaining `auth.uid()` ownership policies and immutable guards. The root also reported bucket MIME enforcement through the storage insert policy rather than the unsupported native bucket MIME configuration. Reconcile the actual deployment SQL with the release branch before merge.

## Earlier read-only audit

Initial status checked on 2026-10-18 before deployment. No production writes were performed during that initial audit.

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
