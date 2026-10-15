# Reading Center integration verification, 2026-10-13

Recovered Claude chat: `bf955c16-f999-4fd3-bce9-90b0cab25ac4`, Spreeder website analysis. The newer standalone Reading Center is the source for this port.

## Implemented and checked

- Five reading modes, preferences, speed controls, search, bookmarks and notes, tags, imports, library shelves, Profile, goals and reading sessions use the LSAT U feature routes under `/reading-center`.
- Cloud storage replaces standalone browser storage. User-specific queries and private imports are isolated by account. Personal edits to shared texts do not change the teacher's published passage.
- Reading Center is issued as one Classroom tool assignment. `/teacher/tools/reading-center` selects an exact student and verifies the saved launcher; student cards resolve to `/reading-center`. Classroom navigation shows Reading Center only after a verified assignment, including accounts without broad access flags.
- Database access requires an unlocked, visible assignment using immutable Classroom source fields, or administrator access. Repeated assignment reuses the same launcher. Revocation preserves saved reading work.
- Browser-found defects repaired: Flow pause/resume, missing Finished shelf, eReader completion, immediate completion persistence, import error/format handling, narrow sidebar/header/dialog/Profile layouts, saved eReader page restoration, paste autosave and slow bookmark creation.
- Completion and bookmark saves confirm backend writes before reporting success. Failed saves retain a retry path.

## Evidence

- Final affected test slice: **252 tests in 24 files passed**, including assignment-only Classroom, Home and Sidebar coverage and the latest merged Activity Centre tests. Full application TypeScript check passed. Production build and postbuild content guard passed. Standalone: 42 tests in 9 files, TypeScript check and production build passed. Existing large-chunk and unrelated Tailwind warnings remain.
- [30 live authorization assertions](security-receipt.md), [probe SQL](security-probes.sql): anonymous/unassigned/wrong account denial, duplicate grant, private data isolation, future unlock, revocation and forged metadata. Every probe write rolled back.
- [16 live tag assertions](tag-security-receipt.md), [probe SQL](tag-security-probes.sql): duplicate rename refusal, validation, color updates and atomic metadata propagation. Every probe write rolled back.
- [Responsive matrix](responsive-matrix.json): actual browser CSS widths 375, 640, 1036 and 1440; reader, preferences, library and Profile have no horizontal page overflow. Browser overrides restored.
- Local signed-in LSAT U preview connected to the real backend: the QA account `joshua.fisseha01@gmail.com` was denied before assignment, then saw Reading Center in Classroom and opened it from Start assigned work. Grant `689b3dfb-e18b-43fe-9b28-b2f42c10f541` persisted and changed to in_progress after reading.
- HTML import omitted scripts/styles and persisted a private QA text. Bookmark saved across reload; pasted note autosaved to the live database. Serial and eReader completion appeared in Finished after confirmed saves. Tool assignment remains in_progress after finishing one text.
- Multipage eReader stored word 214, reopened at page 3 of 6, and retained page 3 after a full reload. Fullscreen returned true on entry and false on exit through actual document state. High Contrast applied scoped tokens; System followed emulated dark/light and emulation was cleared.
- Flow revealed while playing, held the identical mask transform across pauses, and resumed from that transform. Serial, Highlight, Scroll and eReader layouts inspected; wide keyboard help and keyboard speed/restart/play controls checked.
- Original Spreeder import opens a single-file chooser; original Profile Dashboard and Stats empty state and the wide keyboard popover compared live. Original fullscreen is an app focus view that hides the header and transport; its enter/exit controls were checked and reading progress stayed at 3%. No original source account content created, saved or deleted during this takeover.

## Preserved test records

The first browser assignment selected the separate account named tester instead of the saved QA login. This identity mistake was reported immediately; the test grant was preserved rather than deleted. Both are test accounts. The correct QA assignment and its private import, bookmark, tag, progress and sessions are retained. No real student's assignment was changed.

## Publication

**Published and verified on `https://lsatprep.study` on 2026-10-13.** Free deployment `1ec3b668-7a31-4f13-bdd4-3ec5be5fe82b` completed with the editor reporting "Your website was updated". The release was the checked merged commit `5d6e59410c0355ff4758165777430e974a58a560`.

- The old production entry `/assets/index-vys3nUC2.js` changed to `/assets/index-D7yiy4Es.js`. The new entry references `TeacherReadingCenter-C01svRYb.js`, which contains the unique "Reading Center assignment verified" marker. Teacher chunk SHA-256: `6a8962ee552104f884422022216051b7f13f4174c56fb381bf147b65ef199a2a`.
- Signed-in production teacher route `/teacher/tools/reading-center?student=d763bfe6-d710-4c4b-90ff-4b3a20929211` selected the exact QA account and confirmed its existing assignment. [Production assignment screenshot](production-teacher-assignment.png).
- Signed-in QA student Classroom displayed the Reading Center quick-access link and Continue assigned work. Continue opened the integrated library. Its private imported text and Finished shelf loaded from the live backend. The reader retained 210 WPM; its bookmark note "Cloud autosave verified 2026-10-13" survived a full production reload. [Production bookmark screenshot](production-student-bookmark.png).
- During publication one transient recovery screen appeared while the live entry changed. The page recovered before its reset control could be clicked; subsequent Classroom, library, reader and full reload worked. No credential or cache clearing was performed. Physical-device acceptance and filled lists/completion effects on the original Spreeder account remain outside the verified evidence.

Release history follows for the recovered synchronization issue.

Release candidate `3389858bf83c34cb1526d68a19a5075efbba3be6` passed the post-merge push TypeScript gate and is on GitHub main. Lovable's free Git settings reported GitHub four commits ahead; the project remained at `8244623f`. A new receipt commit is being pushed to trigger the documented missing-push-notification recovery. The checked QA production account identity is `joshua.fisseha01@gmail.com`; its existing Classroom launcher and notification are visible before frontend publication. The old Reading Center route still returns 404, so no production acceptance is claimed at this checkpoint.

Lovable's concurrent grading task then saved `13af89c9` to `lovable-sync-1791933310`. Its work was preserved in a clean merge into the Reading Center checkout. Renewed affected checks passed 152 tests in 19 files, including the new answer-key tests and all Reading Center access, persistence and playback tests. The original 252-test run remains evidence for unchanged Activity Centre integration coverage.

The merged release `5d6e59410c0355ff4758165777430e974a58a560` passed the guarded TypeScript push and a fresh production build/content guard. Independent merge review found no high-priority issue; 119 additional ActivityRunner, Observatory and grading regression tests in 6 files passed. Lovable confirmed this exact SHA before free deployment `1ec3b668-7a31-4f13-bdd4-3ec5be5fe82b` was started.

## My Work and sidebar correction, 2026-10-13

Joshua clarified that student visibility must follow an admin assignment and that the sidebar launcher belongs high up beside My Work. The student launcher now sits immediately after My Work, with its Quick access copy removed. It is hidden for admins, who manage assignments and preview through Teacher Workspace. Customized navigation preferences remain stored unchanged; My Work is temporarily shown while the assigned tool is available.

My Work's To do/Completed routes and tabs now accept a verified Reading Center grant without broad Classroom access. That narrow view shows only the exact Reading Center assignment and suppresses weekly plans/ordinary coursework. Notes retains its own permission gate. Rows also disappear when the live grant check fails or is withdrawn, even when broad Classroom access exists.

- 121 focused tests across 8 files, TypeScript, production build/content guard and independent review passed.
- Actual QA browser with Classroom access temporarily off and its existing grant active: sidebar Home/My Work/Reading Center order, one Reading Center row, To do/Completed open, Notes locked, no weekly plan or ordinary assignment rows.
- [Five-width navigation matrix](my-work-navigation-matrix.json): 300/375/640/1036/1440 pixels, correct visible sidebar order and one tool row, no horizontal page overflow. Overrides cleared.
- [Assigned-only screenshot](my-work-assigned-only-local.png); [withdrawn screenshot](my-work-unassigned-local.png). When the QA grant visibility was temporarily withdrawn, its launcher disappeared, My Work locked and the direct reader URL showed Not open yet.
- The same original QA grant ID and in_progress status were restored through authenticated admin API; its original visible=true and Classroom flag=true values were read back. The direct database-owner attempt to restore visibility was rejected by the admin guard. No role defaults, real student assignments, saved reading work or assignment IDs changed; no notifications sent. [Scoped QA restore script](restore-qa-assignment.mjs) keeps credentials/token in process memory.
- Local admin browser has no student Reading Center shortcut and retains Teacher Workspace's assignment page, which confirms the QA grant. The restored QA My Work list also retains all its original ordinary assignments.

Published correction commit `c50cfb21` in checked merged release `1190cb2601e29f1449a5e0affc05e9ed62064008`, after preserving incoming Activity/Abstract work. The combined release passed 91 additional tests in 7 changed files, renewed TypeScript/build/content guards and independent review; the merge did not change any Reading Center/navigation/access file. Lovable confirmed the exact SHA before free deployment `b8444b88-80c4-413e-be23-09aa8f802ecc`.

Live entry changed from `/assets/index-C8F-Wb_V.js` to `/assets/index-DByF-8o8.js`, which contains the new "Checking assigned work access" marker. Entry SHA-256: `4d25545a0235f6e6824da0e820ebcd28629930c31b52d8ba06548f19e97ddce0`. Signed-in production QA My Work displays Reading Center directly below My Work in the sidebar and as its first To do item; clicking the item opens the integrated library. [Live My Work screenshot](my-work-production.png). The live admin assignment page still confirms the exact QA grant and its Classroom sidebar has no automatic student Reading Center shortcut. No extra test assignment or notification was created.

## Scope retained from the original release

AI Summary/Generate remain excluded by Joshua's earlier decision. Import supports text, Markdown and HTML up to 5 MB; PDF/DOCX parsing, Wordela integration and the original Spreeder commercial catalogue are outside this feature. No Edge Function deployment or Lovable AI credit spending was used.

## Student article import check, 2026-10-14

Published QA student UI: pasted a 44-word two-paragraph article and imported a 20-word HTML article through the real file chooser. Both appeared under Added By Me, survived reload, and opened in View with exact expected text. HTML scripts/styles/head title were excluded and entities/Unicode preserved; HTML paragraph formatting is flattened. Serial playback reached ENDARTICLE, 100 percent, and the finish confirmation. Unsupported CSV showed a clear format error with Save disabled. Cloud readback confirmed both owner IDs match the QA student. No real student assignment changed.

Live Spreeder comparison confirmed Paste Text and Import Document menu entries and a single-file chooser; no source-account content was imported. This does not establish full format or service parity. Supported files remain TXT/MD/TEXT/HTML/HTM up to 5 MiB; PDF/DOCX/URL import is unsupported.

Fixed a slow-save loss risk: AddText locks fields and close controls while saving, prevents duplicate submission, shows saving status, and retains failed drafts for retry. Two mounted regressions plus six import/cloud tests passed; TypeScript and production build/content guard passed. Actual local browser with 12-second network latency showed disabled fields/Close/Cancel/Save and saving status, then the saved QA article appeared. Network conditions restored. Generated MCP dev stub was restored and excluded from changes.


## LSAT U account and navigation corrections, 2026-10-14

Reading Center now uses canonical profiles.display_name for the signed-in auth ID; account icon and LSAT U Profile link open /classroom/account. Its separate name editor is removed. The former Profile route remains Reading Progress, backed by only that account's recorded sessions. Loading/error/empty states are explicit. Recent pace and active time share describe playback/page estimates and recorded durations, with fractional minutes and a real 30-day session/word/time summary.

Spreed is renamed My Library. Search text searches title, author, and article body. Reading Center heading always returns to the library, including resetting a shelf/search view. Return control has padding and no arrow; students return to /classroom, admins to /teacher/tools. The desktop hamburger is removed; the mobile drawer closes after navigation. Empty Courses shortcut is removed. Tags explains grouping articles by subject or reading goal. Generic blue document art is replaced by title/word-count covers. Added By Me contains only personal imports; shared articles have a separate From LSAT U shelf.

Verified local QA student account link opens its actual LSAT U Account page, named josh. Database initially confirmed 3 own sessions / 139 words / 0.31 active minutes, exactly matching the rendered dashboard; teacher account has zero sessions. A fresh real serial read added exactly one session and 20 words (4 / 159 / 0.42). A second run plus statistics-only network failure, reload, and explicit retry confirmed retained work and exact cloud acknowledgement; final totals 6 / 199 / 0.64 matched both UI and database. Temporary network blocking was cleared. No real student assignments or teacher account data were changed.

Session saving now retains per-account, per-session UUID retry records until exact cloud readback, safely across multiple tabs. Legacy pending arrays copy before clearing. Hidden/blurred playback pauses, background time is excluded, and final eReader page exposure counts once after five foreground seconds. Playback and exposure are not comprehension measurements. Focused regression tests cover save failures, exact-ID retry, account isolation, two-tab enqueue/ack races, final-page capture, foreground timing and mode switching.

Library and dashboard passed 300/375/640/1036/1440 pixel checks with no horizontal page overflow; expanded mobile navigation and automatic closing were inspected. Viewport overrides reset. See account-navigation-matrix.json.

