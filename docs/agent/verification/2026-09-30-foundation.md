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
