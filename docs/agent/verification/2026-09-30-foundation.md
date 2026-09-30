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

## Still open

- Fresh production and selected-student teacher UI checks are recorded only after publication.
- Full source coverage, real Activity response/completion reconciliation, teacher action attribution, denied mutation checks and access revocation.
- Three historical test Activity rows and one guided assignment say `completed` but have null completion timestamps. Their status was not repaired or treated as verified completion.
- An Activity classroom mirror's Unassign currently affects the mirror without revoking the source assignment. Its teacher display also uses the mirror status. This needs a separate source-backed fix.
- Guided Continue can fail if the current source pool becomes empty before the launch gate restores a valid durable queue.
- LR reload can auto-sync a newer device copy without the active-test-leg check in `drillResumeSession.ts`. Strict cross-device writes need an atomic server contract; a device pause that never reaches the server cannot be promised on another device.
- Full PrepTest outage/break, second-device and revoked-access acceptance remains open. No backend schema or Edge Function was deployed in this slice.
