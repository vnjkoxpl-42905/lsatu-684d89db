# Drill builder corrections and release evidence

Date: 2026-10-02. Claude PR #197 head 890be999. Codex correction da09c92.

The independent review found three defects: changing a set could bypass an unknown save, a time-window heuristic could recover an unrelated sitting, and account changes could admit delayed replies. Those paths now use one client-generated session UUID, exact-ID reads, immutable request settings and actor checks before writes and after responses. The existing session primary key prevents two inserts for the same launch. No database migration was required.

Pending requests persist in account-scoped sessionStorage before insertion and survive same-tab reload. An explicit Retry original launch control identifies the original passage IDs and settings; another Start stays blocked. Malformed/unavailable storage fails closed. Storage is cleared only after exact acknowledgement and successful cleanup.

## Verification

- Independent run: 208 tests passed in 21 suites covering RC, LR picker and LR composition.
- Typecheck passed. Scoped ESLint passed with no warnings after renaming an unused test argument.
- Production build passed, including the 769-file postbuild check. Known build-generated churn was restored before staging.
- Independent review confirmed the original issues and the reload/UI corrections; no other high-priority source finding remained.
- Actual signed-in QA app: invalid custom time disabled Inspect, inspected counts came from loaded content, Start saved and opened the exact selected PT125 Groupthink passage with eight questions.
- QA session f21e7fed-f72b-4970-a2b0-307741debfe0 reopened after reload, paused, completed and displayed a saved result of 0/8 with eight deliberately unanswered questions. This is a QA account record, not a student's learning record. A transient clock-save pause recovered using Retry save; its initial cause was not isolated.
- Actual builder viewport widths 390, 700, 820, 1280 and 1440 had no horizontal overflow (client widths 375, 685, 805, 1265 and 1425 respectively).
- Changed-set, changed timing/reveal, previous unrelated session, delayed account transition, pending remount and storage failure behavior were covered by automated tests. A real lost-save-response outage was not induced.

## Scope still open

This releases the bounded builder slice, not all of #171. LR attempt mode/source persistence and the remaining full-ticket hub acceptance remain open. #176 backend work is separate and was not deployed here. No existing record was deleted, no credential was committed, and no Claude weekly reset or Lovable AI prompt was used.

## Published release

Guarded push released cf49405a2edb80f4e9d8905024d25e3617ce6322, preserving the preceding Review release. GitHub marked PR #197 merged. Lovable imported that exact release; free deployment 555d9fe8-125a-4a4a-b7df-3cf6ea1c6588 completed and displayed Your website was updated. Fresh production served /assets/index-tAddikcz.js and the new builder. Invalid custom time disabled Inspect; valid Inspect showed PT110, African American Rice Cultivation, one passage and six questions. [Live builder screenshot](artifacts/drill-171-codex/live-builder.png).

After integrating main, 62 Review tests across five suites passed. The authenticated QA sitting described above is distinct from the fresh production builder check; no completed production sitting is claimed.

These publication observations come from the completed 2026-10-02 release session and its handoff. During documentation closeout, git ls-remote freshly confirmed main at cf49405a2edb80f4e9d8905024d25e3617ce6322 and gh confirmed #197 MERGED. Production and Lovable were not freshly rechecked during closeout.

Documentation closeout reran the production build successfully, including the 769-file postbuild exclusion check. Known generated bank, finder and MCP churn was restored before scoped staging; no implementation file is included in the closeout commit.

Joshua's older Lovable restore warning dated 2026-10-02 at 14:27 remains unverified UI state: Keep repository version was advised, but no restore or resolving click was verified. No Lovable credit spend occurred.

Next bounded acceptance slice: LR drill mode/source persistence across account-owned save, reload, Continue, completion and Results/Review. Legacy missing metadata must remain explicit. Full #171 acceptance, RC lost-save-response outage verification and broader hub flows remain open; #176 remains separate.
