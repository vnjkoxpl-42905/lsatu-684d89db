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

Publication and production browser readback are recorded below after deployment. Local preview checks above are not claims of production frontend acceptance.

Release candidate `3389858bf83c34cb1526d68a19a5075efbba3be6` passed the post-merge push TypeScript gate and is on GitHub main. Lovable's free Git settings reported GitHub four commits ahead; the project remained at `8244623f`. A new receipt commit is being pushed to trigger the documented missing-push-notification recovery. The checked QA production account identity is `joshua.fisseha01@gmail.com`; its existing Classroom launcher and notification are visible before frontend publication. The old Reading Center route still returns 404, so no production acceptance is claimed at this checkpoint.

Lovable's concurrent grading task then saved `13af89c9` to `lovable-sync-1791933310`. Its work was preserved in a clean merge into the Reading Center checkout. Renewed affected checks passed 152 tests in 19 files, including the new answer-key tests and all Reading Center access, persistence and playback tests. The original 252-test run remains evidence for unchanged Activity Centre integration coverage.

The merged release `5d6e59410c0355ff4758165777430e974a58a560` passed the guarded TypeScript push and a fresh production build/content guard. Independent merge review found no high-priority issue; 119 additional ActivityRunner, Observatory and grading regression tests in 6 files passed. Lovable confirmed this exact SHA before free deployment `1ec3b668-7a31-4f13-bdd4-3ec5be5fe82b` was started.

## Scope

AI Summary/Generate remain excluded by Joshua's earlier decision. Import supports text, Markdown and HTML up to 5 MB; PDF/DOCX parsing, Wordela integration and the original Spreeder commercial catalogue are outside this feature. No Edge Function deployment or Lovable AI credit spending was used.
