# Guided work evidence and RC save safety

Date: 2026-09-30
Tickets: #166 and #167 remain open.
Release: local verification passed; publication tracked separately in the build sequence.

## What changed

- Assignment evidence reads both legacy `practice_sessions` and distinct `drill_runs` under the selected student's ID and normal RLS. Guided sittings must match the outer and embedded owner, record ID, and assignment source. Empty and direct-launch sittings do not count. A completed sitting remains completed through later practice; repeat assignment instances remain separate.
- RC questions and clock wait for the saved-answer read. A failed read offers Retry loading answers. Normal question navigation saves elapsed time and the destination index before moving, including unanswered questions and previously answered questions. Clock writes serialize so a heartbeat cannot overwrite the saved destination.
- A newer whole-second device clock remains paused until account acknowledgment. Fractional time already represented by the saved integer clock does not cause a false recovery prompt. Failed answer retries reuse their attempt ID; a successful answer followed by a failed position save retries position without another answer insert.

## Observed evidence

- Nine focused files passed 62 tests. Typecheck, production build and diff check passed. Changed-file ESLint had no errors and one existing unused-argument warning in the RC API test.
- Normal admin and designated-student authentication were used, with no service-role key. The student received empty results when requesting the admin's guided assignments, Activity assignments, `bootcamp_kv`, RC sessions and PrepTest runs. The admin could read the student's rows. These are read checks, not mutation-policy proof.
- In the local app, the designated student saved one answer in existing guided assignment `a84153c7-26ee-48bf-a57c-584e2c94d304`. My Work changed to In progress. Reopening showed question 2 of 6 and one saved answer. The separate same-title assignment `e47f7ea5-b91b-425d-a654-c78d638abf71` remained separate.
- Switching to the teacher account and selecting that student showed the same guided assignment In progress and the separate copy Assigned. Teacher Activity mirrors still show the contradictory historical completion statuses listed below.
- Existing timed RC session `2ed5a995-0086-47f6-88e2-f3b18216055f` was used. Blocking the `rc_attempts` account request hid questions and showed Retry loading answers. Clearing the block recovered the runner.
- Blocking `rc_drill_sessions` during unanswered Next held question 1 and paused the clock. Clearing the block and Retry save advanced exactly once to question 2. Reload restored question 2 and paused to acknowledge a newer device clock. Retry save recovered; Save and exit returned to Practice. Browser blocks were cleared.
- These browser checks saved test-student work and clock/position changes against the production backend. They did not create assignments, notify real students, or finish the RC sitting.

## Still open after the twenty-second slice (historical)

- Fresh production and selected-student teacher UI checks are recorded only after publication.
- Full source coverage, real Activity response/completion reconciliation, teacher action attribution, denied mutation checks and access revocation.
- Three historical test Activity rows and one guided assignment say `completed` but have null completion timestamps. Their status was not repaired or treated as verified completion.
- An Activity classroom mirror's Unassign currently affects the mirror without revoking the source assignment. Its teacher display also uses the mirror status. This needs a separate source-backed fix.
- Guided Continue can fail if the current source pool becomes empty before the launch gate restores a valid durable queue.
- LR reload can auto-sync a newer device copy without the active-test-leg check in `drillResumeSession.ts`. Strict cross-device writes need an atomic server contract; a device pause that never reaches the server cannot be promised on another device.
- Full PrepTest outage/break, second-device and revoked-access acceptance remains open. No backend schema or Edge Function was deployed in this slice.

## Twenty-third slice continuation

Activity classroom mirrors now use owned source and saved-response evidence, matching the student projection. Missing evidence is disclosed as Unverified. Activity Unassign is disabled with an explanation because removing the mirror cannot safely revoke the source. Ordinary assignment controls remain available; true Activity revocation remains open.

Guided Continue restores an owned, source-matched frozen queue before drawing from the current eligible pool. Explicit missing runs fail closed. The local existing assignment `a84153c7-26ee-48bf-a57c-584e2c94d304` restored question 2 of 6 with question 1 answered.

Official timed LR hydration is read-only. Failed account loads and newer device copies stay paused until guarded retry. Generic persistence excludes official LR and PrepTest records from background upload queues, including startup hydration and transactions. Real-adapter tests prove pending copies are not silently replayed. Client checks remain non-atomic.

RC section readback counts only A through E selections and uses the saved section clock. Early finish no longer copies the current question's dwell time into every unanswered row. Failed attempt reads return unavailable evidence rather than a zero score.

### Verification gates and owned task walks

- 161 tests across 18 files passed. Typecheck and production build passed. Changed-file ESLint had zero errors and 29 existing Drill warnings. Generated bank, finder-index and MCP build churn was restored separately. Independent review identified the hidden startup upload path, then independently rechecked its correction with no remaining material finding.
- Local teacher Work showed Spot the Relationship and Conditional Rephrase Assigned, matching the student source projection, with disabled Activity Unassign and a visible explanation.
- A genuine designated-student PrepTest 101 was started as run `2677bdb1-2eca-491b-8773-449166017509`. Blocking RC answer saves and LR account saves paused clock/navigation; retry after clearing each block advanced once. RC first-leg session `5b2c7e2d-5d13-4ece-b4a5-f16c520b4dbd` completed early with 27 distinct attempt rows, one selected answer, 26 blanks and a saved 57-second clock.
- That leg's parent result was cached by the previously published reader and incorrectly says 27 answered and 756554 ms. The corrected reader is covered by tests; historical parent results were preserved, not rewritten.
- Blocking parent writes paused the break at 8:57 and blocked the next section. Reload showed paused device-copy recovery. Restoring the network and retrying account load/save recovered the same break.
- A simulated secondary writer changed active device/revision; a stale compare-and-swap returned zero rows and the browser detected takeover. An actual separate-origin client claim (localhost versus production in the same browser) then conflicted, reloaded and reclaimed successfully. This is not a two-physical-device test.
- Temporarily revoking both designated-student access flags made the live test show Not open yet without questions. Both flags were restored and read back as true. Normal student cross-owner PrepTest read and same-value update returned zero rows. Revoked in-flight writes and teacher actor attribution remain unverified.
- Modified local LR third-leg save failure/reload kept its device copy paused without background replay. Retry after network restoration recovered it. The third leg was paused and left unfinished. All network blocks were cleared. No assignments, historical completion timestamps or real-student records were repaired or deleted.

### Server contract and remaining acceptance

Live read-only SQL metadata confirmed ownership/RLS and parent revision fields, but no atomic timed checkpoint RPC or writer/access/terminal enforcement trigger. Owner-only write policies do not prove those protections. The [timed-write contract](../../implementation-plans/2026-09-30-timed-write-contract.md) specifies proposed parent/child checkpoints, device epochs, revisions, idempotency and rollout checks. It is a prepared proposal, not a deployed backend.

Keep #166 and #167 open for full source coverage, genuine Activity response/finish and source revocation, authorized teacher actions, assignment revocation, two-device races and server rejection of stale/revoked writes. Publication and fresh production routes are recorded separately in the build sequence. No backend deployment or credit-spending Lovable action occurred.

## Twenty-fourth slice: confirmed generic Activity completion

The generic Activity runner requires completed status plus a completion timestamp before reopening a report or trusting its stored score. An old completed-status row with no timestamp and no saved responses opens its normal introduction. A saved-response read failure blocks practice with Retry loading, including historical completed-status rows.

Normal Finish and fully resolved recovery first flush pending responses, reread the persisted response log, and require all items resolved. The assignment completion API requires a returned matching row with completed status and timestamp. Zero-row writes fail. A failed closeout keeps responses and offers Retry saving; the classroom completion signal follows account acknowledgment.

Local browser checks used the existing designated-student Spot the Relationship assignment, without altering its historical completion fields. It opened the normal introduction instead of an empty 48-item report. Blocking activity_item_responses reads showed the load failure gate without Start or questions; clearing the block and Retry loading restored the introduction. Network blocks were cleared.

Independent review found no material defect in this scoped patch. Genuine free-text response/finish was not exercised: generic grading can invoke activity-coach through the Lovable AI gateway and requires immediate credit confirmation. Focused tests cover failed closeout, persisted-log checks and zero-row completion rejection. Final test counts, release gates and production publication are recorded in the build sequence.

RRC SectionRunner is a separate deferred case: it catches completion failure around line 1048 and still opens its report around line 1085. It needs acknowledged closeout with recording/response retention and retry. This slice does not fix that flow or Activity source revocation. Keep #166 and #167 open.

## Next foundation pass: ordinary-authenticated source parity

On 2026-09-30 at 10:20 UTC, the read-only `scripts/verification/scoped-source-audit.mjs` authenticated the designated student and administrator separately using the existing central environment credentials and confirmed the administrator's role. It uses the public app key, no service-role key, and prints no credentials or student record content. Independent review corrected KV identity comparison to include both namespace and record ID, and made network failures explicit even when no error code is returned; the corrected probe passed.

| Source | Student-owned rows | Admin reading that student | Same source IDs | Student reading admin-owned rows | Confirmed admin-owned rows |
| --- | ---: | ---: | --- | ---: | ---: |
| Guided assignments | 2 | 2 | Yes | 0 | 1 |
| Activity assignments | 4 | 4 | Yes | 0 | 13 |
| Bootcamp KV | 15 | 15 | Yes | 0 | 79 |
| RC sessions | 9 | 9 | Yes | 0 | 12 |
| PrepTest runs | 1 | 1 | Yes | 0 | 2 |
| Classroom items | 9 | 9 | Yes | 0 | 7 |

Every request succeeded. These are positive cross-owner read denials because the admin session confirmed foreign rows existed. The exact owned IDs matched between both authorized reads. This does not prove UI projection, every bootcamp source, assigned-only authorization, denied mutations, teacher mutation attribution, or timed races. Classroom sets may legitimately differ when visibility/unlock policies filter student reads. #166 remains open.

Fresh read-only live catalogs separately confirmed no Activity revocation columns and broad student source UPDATE/response INSERT policies without source-revocation checks. A mirror-only Unassign cannot close those paths. Backend draft and isolated database verification are tracked separately from deployment and production acceptance.
## Integrated RRC closeout and Activity revocation readiness (2026-09-30)

Final integrated verification: 132 tests across ten files, typecheck, focused changed-file ESLint without errors, production build and diff check passed. Independent review corrected exact-take closeout, completion replay timestamps, stale selected-student mutations, and declaration ordering before release. The build retained existing asset, Tailwind and chunk-size warnings; its canonical-content check scanned 748 output files. Known generated churn was restored.

RRC now retains a student/assignment-scoped finish marker for the exact attempt and recording. Closeout requires all frozen item orders for that same take, a stored audio object, and a matching account completion acknowledgment. A failed closeout retains recovery evidence and offers Retry completion before the report. Reload retries that exact finished take; unrelated older rows cannot supply missing items. Failed or pending attempt-history reads block recording. Idempotent completion readback preserves an existing timestamp; historical completed/null rows require a new verified finished take.

Teacher Activity Unassign is wired to a capability-gated, receipt-validated source RPC in both mirrored and unmirrored Work rows. It freezes the selected student/source, keeps the confirmation open after an unconfirmed response, distinguishes acknowledged success from a subsequent refresh failure, and never falls back to deleting the mirror. Known revoked sources cannot hydrate student recovery or practice. The current live backend has no revocation capability, so these controls remain disabled. The unapplied SQL draft and readiness record are under `docs/implementation-plans/`; 35 isolated PGlite assertions exercise source preservation, ownership, actor attribution, response writes, mirror suppression, and replay. This is not live JWT or multi-client concurrency acceptance. Deployment route confirmation is pending.

Browser evidence: the real local teacher Work page showed the exact selected student's owned and mirrored Activities with disabled controls. Synthetic intercepted capability/source responses enabled one explicitly labeled Activity and its saved-work confirmation; an intercepted 503 showed Could not confirm Activity unassignment / Refresh the work list before retrying and retained the dialog. Separate synthetic RRC recording/response/closeout responses showed Retry completion on failed acknowledgment, then the report after acknowledgment. These were isolated browser responses, not genuine completed or revoked account records. A real blocked RRC history request showed Recording has not started and Retry loading before any submitted recording. All test interceptions, network blocks and local markers were cleared. The original RRC source remained in progress with a null completion timestamp.

Evidence screenshots are in the outer vault's `research/2026-09-30-lsatu-foundation-evidence/`: `rrc-closeout-retry-synthetic-local.png`, `rrc-closeout-ack-synthetic-local.png`, `rrc-history-read-failure-local.png`, `teacher-revocation-gated-local.png`, and `teacher-revocation-unconfirmed-synthetic-local.png`. A genuine graded Activity task walk requires immediate possible-credit approval. The atomic timed-write design remains a separate backend implementation/adoption phase; no atomic writer is active. #166 and #167 remain open.
### Fresh production and cross-owner UPDATE acceptance

Frontend commit `122eadf` reached GitHub main through safe-push and was imported by Lovable. Free deployment `3b94869f-28e6-4791-b01c-812e56f791c9` reported Your website was updated. A fresh designated-student RRC route showed Recording has not started / Retry loading after blocking the history request. Back returned to the briefing, blocks were cleared, and read-only live SQL confirmed the original assignment still in progress with a null completion timestamp. No recording, grading request or completion was submitted. The fresh live teacher-selected Work page showed both owned and mirror-backed Activities with disabled Unassign controls. Phone-width local inspection measured 375px viewport and 375px document scroll width, with the gated controls visible. Screenshots: `production-rrc-history-failure.png`, `production-teacher-revocation-gated.png`, and `teacher-revocation-phone-verified-local.png`.

Root reviewed and executed `scripts/verification/cross-owner-write-audit.mjs` with separate ordinary student/admin sessions. For all six sources above, the teacher first confirmed one own foreign fixture; an exact student cross-owner UPDATE setting only the identity column to its already-stored value returned zero rows without error. KV constrained namespace, record ID and owner. The probe refused service-role keys and printed no record identities or credentials. This is positive UPDATE denial evidence, not INSERT coverage, teacher mutation attribution, source revocation or timed-race evidence.
### Inactive timed control foundation prepared

The PrepTest phase-one SQL artifact adds nullable protected control fields, append-only command receipts and LR bindings behind a dedicated no-login executor identity. It exposes no public create/commit writer, creates or adopts no live protected row, changes no frontend adapter and is not deployed. 34 isolated SQL assertions passed, including an independent root rerun; review corrected and regression-tested legacy DELETE compatibility. The separate readiness document distinguishes these single-database invariants from production JWT, entitlement locks, child-write exclusion, replay handling, clocks and concurrent atomic closeout. Do not deploy this foundation alone as a timed safety fix. Full writer, trusted content manifest, child guards, closeout contract and client adoption remain required.

### Full inactive atomic PrepTest batch prepared and independently reviewed

The following batch supersedes the phase-one-only implementation status above. It is prepared source code and unapplied SQL, not a production safety release. Existing runners still use their published paths. No backend deployment, configuration activation, production record mutation, AI grading or credit-spending action occurred.

The writer now commits parent, LR/RC child progress, mandatory LR wrong-answer journal/history, child completion and parent advancement atomically. It checks owner, exact access grants, revision, writer epoch, device, phase and server lease; direct protected child/parent writes are guarded. Stable command receipts support lost-response replay without reapplying a save or returning stale parent state. Grant rows are locked against concurrent revocation. Server time is capped at the acknowledged lease; a pause that never reaches the server is not claimed to pause instantly.

Server-selected content freezes 59 PrepTests, 177 legs and 222 source hashes. Manifest identity: `fa624d90c24b86c1c9ab6bf4550dc96c4478dbd4c21fa788d64c5e9601ea93a8`. Source parity checks cover every offered canonical leg, removed LR positions and exact RC identities. Artifacts contain no question text or answers. Existing client-derived grading remains the disclosed trust boundary.

Unused client, parent, LR and RC adapters validate the typed contract and frozen content, retain exact pending commands across recovery, gate foreign/expired writers and use a monotonic local display clock. Native owner/run Web Locks serialize cross-tab queue operations; unsupported locking fails closed. Definitely rejected commands can be archived with their evidence before a new claim; ambiguous lost responses cannot be discarded. Existing UI report/review flows and historical adoption are not switched.

Fresh read-only production metadata exposed two deployment incompatibilities before installation: PostgreSQL 17 ownership SET membership and the managed role's inability to grant auth schema access. Corrected drafts temporarily restore migration membership and use a narrowly granted migration-owned identity helper delegating to `auth.uid()`. A separate local nonsuperuser deployment role reproduces the managed ACL shape; the executor itself has no auth schema access or ordinary caller membership. Live evidence is recorded in the adjacent `2026-09-30-timed-live-*.json` files, including exact assignment grants absent from the initial catalog.

Final integrated checks: **309 tests across 11 files**, **154 isolated writer assertions**, **36 foundation assertions**, **46 real PostgreSQL multi-connection assertions**, and **10 managed-role assertions** passed. Independent backend and adapter reviews found no remaining material defect after fixes. Changed-file ESLint and deterministic manifest freshness passed. Native browser two-tab contention proved one retained command and one conflict with the same pending UUID; no backend requests were made and the exact synthetic local state and tabs were cleared. See `2026-09-30-timed-native-locks.json`. These are local synthetic concurrency and permission proofs, not deployed JWT or live two-device acceptance.

Remaining activation work: confirmed Lovable Cloud deployment route; reviewed lease/configuration selection; complete official runner adoption and historical report/review compatibility; explicit supported legacy adoption or safe exclusion; staged installation and live lost-response, revoked in-flight write and second-device task walks. Activity revocation deployment and genuine graded completion remain separately pending. Keep #166/#167 open and finish foundation acceptance before navigation. Readiness documents under `docs/implementation-plans/` identify each prepared component and its limits.

Typecheck and production build also passed. Build output retained existing Tailwind ambiguity, missing noise asset and chunk-size warnings; the canonical-content postbuild check scanned 748 files successfully. Only known generated-file churn was restored before the commit.
