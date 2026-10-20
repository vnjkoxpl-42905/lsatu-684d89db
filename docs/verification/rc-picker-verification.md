# RC Training picker reset and progress verification

Date: 2026-10-20. Scope: the actual `RcRecallPage` selection interface, before entering an exercise.

Status: local implementation and Codex browser verification complete. No publication or production behavior is claimed.

## Local harness boundaries

Open `http://127.0.0.1:8095/docs/verification/rc-picker-preview.html`; append `?scenario=error` to fail the first reset PATCH and allow retry. The isolated `rc-picker-vite.config.ts` aliases only the authentication hook to a fixture identity. The page, queries, history, paragraph counting, progress computation, reset persistence helper, confirmation dialog, and styles are actual application code.

Passage bank and backend responses are local fixtures. External requests are denied. Fixture attempts include a resumable two-of-four-paragraph passage, a ready zero-of-four passage, a completed passage, and another unfinished session. Completed history and saved recap rows are retained. Attempt creation is deliberately denied and logged so an accidental reset-to-start path cannot succeed silently.

The collapsed **Local verification diagnostics** disclosure exposes backend requests, selected attempt updates, remaining checkpoint identities, history counts, document scroll position, microphone request count, and runner mounts in the DOM. The microphone counter delegates to the real browser API without changing permissions or responses; no synthetic input is used. No microphone input is necessary for this picker task.

## Observed by the parent agent in the Codex browser

- Opened the actual picker harness and exercised reset cancellation and acceptance.
- Search `PT141` stayed selected after reset.
- The other unfinished session and completed history remained available.
- The reset passage returned to its ready state with a Start action; it did not enter the exercise.

## Acceptance evidence

- [x] DOM diagnostics confirm zero attempt creation, microphone requests, and runner mounts during reset.
- [x] One PATCH targets the selected attempt and student with `finished_at=is.null`, retaining `started_at`. Only that checkpoint is removed. The other unfinished attempt/checkpoint, two recap rows and completed passage row remain.
- [x] First-reset failure leaves both checkpoints and unfinished attempts intact, shows an inline error, and allows successful retry.
- [x] Search PT141 and the full-section practice-length filter remain selected. Mobile row reset retained scrollY 344 before and after.
- [x] Ready shows Start with no active bar; active shows saved 2 of 4 with a slim bar; zero remains In progress; completed shows a full bar/date and Review results.
- [x] Review focuses the exact existing completed result. Fixture feedback is unavailable and correctly reports that failure, without fabricating feedback.
- [x] Codex in-app browser checked desktop 1440x1000 and mobile 390x844, plus the normal docked browser size. Screenshots: rc-picker-desktop.jpg and rc-picker-mobile.jpg.
- [x] Final RC regression suite: 790 tests across 27 files passed. Final typecheck and production build, including prebuild content checks and postbuild canonical-content check, passed. Existing bundle-size and Browserslist warnings remain.

No production requests, push, or publication are performed by this harness or verification report.
