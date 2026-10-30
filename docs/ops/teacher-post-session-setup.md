# Post-session Home: deployment and acceptance

This is prepared code, not an active automatic service. Nothing in this folder applies a migration or deploys a function.

## Pin the operator before deployment

The dedicated owner is `5ff160ef-016e-4ab5-aab1-55c7a2ad888f`. Set `TEACHER_HOME_OWNER_ID` to this UUID and `TEACHER_HOME_GOOGLE_EMAIL` to `contact@aspiringattorneys.com`. Reuse the existing private Google OAuth secret names described in `_shared/googleCalendar.ts`. Never place tokens in SQL, cron text, frontend code, or this document. Google Calendar must have read scope. The function verifies GET calendars/primary against both the environment email and the stored identity on every request.

Deploy through the approved Lovable Cloud route after Joshua's separate deployment confirmation. The endpoint must permit a no-JWT scheduler request (`verify_jwt=false` for this function only): handler authentication still requires a short-lived, single-use, service-minted ticket. Ordinary requests require the pinned owner's authenticated admin account. Tickets authorize only sync, not folder import.

Apply `20261027190000_teacher_post_session.sql` through the approved backend route. All new data is private, owner-admin readable. Only the two authenticated Home RPCs permit changes; all source writes and lease/ticket functions are service-only. Student role and access settings remain untouched.

## Import before enabling

The verified Drive root is `1NDkg75paR7UygvfOxYm2Hzxbl0nn_ALL`. The vault tool `setup/student-context-drive/connect_home.py` owns a generated manifest with 17 exact active-account matches and 6 unresolved entries at preparation time. Re-run its read-only preflight before import. POST action `import_folders`, `drive_root_id`, `folders[{slug,folder_id,emails,student_id}]`, and `dry_run:true` using the pinned admin bearer token. The function resolves every email against current paged auth users, rejects ambiguous or archived identities, and compares any expected student_id. It never guesses a display name. Check the returned `linked`/`unresolved` report, then repeat without dry_run. Folder aliases are limited to the verified live account email; broader alias verification is intentionally not implicit.

Call the pinned admin action `folder_links`: it returns `{ok:true,drive_root_id,folders:[{student_id,slug,folder_id}]}` with every owner folder link, paged without a silent cap. Compare the exact expected mapping set and root ID; unexpected or missing rows fail acceptance. Read settings back with the admin client. Import initializes settings disabled with no activation cutoff. It does not create tasks or run AI. The Home RPC returns two open sessions and exact counts. The task sheet reads pages of 20; handled history loads only when requested.

## Activate only after separate approval

Review `teacher-post-session-activation.sql`. It is inert while `approved=false`. The script pins the verified project endpoint `https://atrcqxpmqrynmtvvyjju.supabase.co/functions/v1/teacher-post-session-sync`; recheck this identity immediately before deployment. It requires a Drive root and at least one imported folder link before enabling settings. Confirm pg_cron and pg_net availability. No laptop process substitutes for the server job. Approve/deploy before setting the flag true. Its transaction sets the initial cutoff once and creates a named five-minute job. Existing job names cause a stop rather than duplicate scheduling. Inspect cron.job, cron.job_run_details, and net response status. Single-use tickets last two minutes and contain no stable secret.

Calendar scheduled end means follow-up is due; it does not prove attendance. New tasks require end >= cutoff and <= run time. Cancellation never creates a task. Existing cancellation, move, or missing-source states keep work/history. The worker drains seven-day coverage chunks with a 24-hour overlap and complete page processing. It separately scans late changes and revisits 20 oldest checked active tasks per run. A renewable two-minute DB lease guards source writes and finish. A partial failure does not advance either cursor. Manual match, transcript, checklist, handled state and history survive source refresh.

## Acceptance evidence required after deployment

1. Student token: Home RPC and mutation denied; table reads expose no private rows. A second admin cannot access the pinned owner's records or bind Google tokens.
2. Pinned owner: dry-run/import/readback; verify 17 matches or explain changed counts. Unresolved students remain unlinked.
3. Real future teaching session ends after activation: one task appears without a transcript. Retry retains exactly the same ID.
4. Handle/reopen and checklist persist after refresh. Two simultaneous revisions reject the stale update.
5. A unique native Gemini Google Doc attachment links late. Multiple documents show needs review. Explicit manual link cannot be overwritten by sync. No notes or recaps are posted automatically.
6. Edit a session into the future, cancel it, and test Calendar 404/410: work remains, with truthful source state. Test shared and archived attendee emails; neither auto-attaches.
7. Stop the laptop and inspect a later successful server job. Home shows last success/error and catch-up state truthfully.

Local checks: `deno test --allow-net supabase/functions/teacher-post-session-sync/model_test.ts`; `deno check supabase/functions/teacher-post-session-sync/index.ts`. SQL authorization/lease semantics require a real PostgreSQL acceptance run; static inspection is not a database execution proof. No live acceptance was performed while deployment remains prohibited.


## Review hardening and known limits

Source refresh does not change the teacher mutation revision. Revision conflicts mean another teacher action changed the task, rather than routine Calendar polling. Changed source times append a durable `source_rescheduled` task event containing old and new times; a later ordinary refresh may label the now-past session ended, but cannot erase this event.

The service-only attempt RPC writes `last_attempt_at` and a bounded operational error for failures before the lease exists. Older attempts cannot overwrite a newer successful run. A missing or stale success is still a UI warning: a stopped server cannot report its own failure. The lease token and lease deadline have no authenticated select grant; Home RPC never returns them.

Folder import uses one service-only PostgreSQL transaction for validation, settings, and accepted links. Dry-run validates existing and within-manifest slug/student collisions. Conflicts return unresolved; accepted rows preserve existing verified aliases and merge the live account email. No folder is guessed from a display name.

Automatic transcript linking from an ingestion ledger is deferred. This release reads only unique native Google Doc Calendar attachments; a teacher can explicitly attach a Doc link. A Drive file arriving without an event attachment does not link itself. No automatic synthesis or content posting is enabled.

Ticket retention is deliberate in this unpublished preparation. Used and expired ticket rows remain for audit; every consume rejects replay and expiry. No purge is introduced because deletion was not authorized. At five-minute scheduling this adds at most 288 rows per day for the configured owner. Before long-term operation, obtain approval for an explicit bounded retention/archive policy and verify row counts. Do not silently add deletion to the scheduler.

Final local fixes: only sync actions record sync attempts/errors; starting an attempt preserves the previous error until a successful finish. Worker ticket consumption, claim, renewal and source writes recheck the admin role. Native Google Doc attachments without a recognized transcript title are shown as needing review. Verified roster identity takes precedence over loose event-title filters; unmatched work requires a real non-declined guest. These final fixes received local tests after the review budget was exhausted and do not have independent approval.

## Full teaching desk extension (2026-10-28)

Apply `20261028100000_teacher_home_desk.sql` after the post-session migration. Provision only the verified pinned owner settings row with `enabled=false`; the owner-private desk then works before background synchronization is enabled. This migration does not enable the worker or schedule a job.

- Home reads at most two active session tasks and zero handled history; full session/manual/consultation sheets use bounded 20-row keyset pages, exact totals, source/student filters and owner-private teacher-task counts. Manual edits use revisions and append history. Blockers and confirmed recap posting are separate saved facts; neither is inferred from opening a link.
- `agenda` and `email` actions authenticate the pinned owner freshly and return before any worker-attempt/lease/health path. Read failures cannot change synchronization status. Agenda uses original primary-calendar metadata, a fresh selected-field roster on every request, fresh candidate eligibility, 20-event provider pages, HMAC-signed owner/calendar/window-bound cursors expiring in ten minutes without isolate memory, and server timestamps. Expired or invalid cursors return a distinct restart-required error; cold starts preserve valid cursor operation.
- A non-teacher organizer remains an exact student candidate. Teacher/self/resource/declined attendees do not. Ambiguous, archived or admin candidates never receive a prep link.
- Calendar event labels are explicit owner-private revisioned facts. Consultation is not inferred from a title or URL. A labelled consultation creates one private follow-up only when its timed end is at or after both activation and label time, with an eligible guest. Cancellation preserves existing work; relabeling an instance with any durable task is rejected, so classification changes cannot strand or erase it. Each recurring instance retains its own event identity.
- Direct Gmail reads require existing `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`. The live profile email must equal `TEACHER_HOME_GOOGLE_EMAIL`. Optional `TEACHER_HOME_ENQUIRY_LABEL` defaults to `LSAT U/Tutoring enquiries`. If the explicit label does not exist, student correspondence may load, but enquiries remain visibly unconfigured. Never classify generic personal mail as enquiries. Only exact eligible student sender addresses or that explicit label qualify; these GET reads never mark messages read or send anything. Email scans up to five 20-message pages per request, verifies exact scope on every message, and returns distinct-thread counts. It reports scan_limit=100 and count_is_lower_bound when another provider page exists; Open email provides full history.
- `teacher_home_payments` returns three 90-day recent rows, three attention rows and exact unresolved count. Credited/dismissed/ignored and test-mode rows never create another grant; succeeded unrefunded attention is explicitly review-required, grantable=false. Home never asserts grant eligibility from ledger hints. Details/mutations remain on the existing authorized payment surface. `teacher_home_results` returns three latest eligible student section results, never whole-test or mastery claims.

Initial Drive copy is unchanged. This extension does not promise continuous folder synchronization, AI recap generation, automatic posting, automatic assignments or automatic email.
