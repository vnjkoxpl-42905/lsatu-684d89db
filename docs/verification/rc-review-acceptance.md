# RC review and reader repair evidence

Date: 2026-10-17. Branch: `codex/rc-t06-review-reliability`, based on `origin/main` at `21bfefd0`. This is implementation evidence, not publication or signed-in production acceptance.

## Implemented

- Ordinary completed results, history scores, answer keys, question verdicts and passage summaries stay hidden until an owner-scoped reveal reaches the account. Reveal state is separate from immutable first-take performance.
- Review reanswers await acknowledgement and retain an exact UUID command on failure, including recovery after refresh. Account and session changes invalidate stale callbacks. Original protected answers remain immutable.
- Exclusion saves are acknowledged; failed writes retain the prior analytics state. Missed-passage retries retain and recover the original creation identity; protected sessions refuse this action.
- Legacy history surfaces offer confirmed Discard only for ordinary unfinished drills. They retain attempts and remove destructive Delete controls.
- Latest graded-answer time is distinct from exposure time, so skipped/abandoned retakes do not promote old grades into recent accuracy.
- Search can continue beyond 200 results. Search tables and the manual picker render bounded pages of 40; manual selections survive page changes. The embedded builder links to question-level search.
- Timed marks are validated before rendering; local save failures are visible and retryable. Both timed runners use readable frame colors without changing the global theme. Standalone display settings are retained per owner/sitting. Shared timed reader has match counts/navigation and container-responsive passage/question tabs. Comparative Both/A/B preserves original text nodes and annotation offsets.
- Tutor context becomes an editable Inbox draft with a return link, scoped to the originating account. Existing text is preserved; insertion is explicit when needed. Nothing sends automatically.
- A PR workflow is prepared in `docs/verification/rc-pr-workflow.patch` to run typecheck, RC/shared tests and build. GitHub refused creation through the current OAuth credential because it lacks workflow scope, so CI is not enabled. The local `.github/workflows/rc-pr.yml` is preserved outside the pushed commit. The structural explanation inventory is separate from teaching-quality review.

## Running Chrome checks

Used the real React components through `e2e/rc-review-fixture/` at `http://127.0.0.1:8098`. The fixture replaces account APIs and controllers with synthetic data. It is a development-only entry point, outside the production build. The Supabase adapter rejects backend access.

| Scenario | Observed result |
|---|---|
| Completed ordinary results before reveal | Neutral completion screen, no score/key/focus/misses. |
| Failed reveal | Error remains visible; scores and keys remain hidden. |
| Successful reveal and reload | Results appear and fixture reveal decision survives reload. |
| Failed review answer, then retry | Exact pending answer remains retryable; successful retry leaves global blind-review results hidden. |
| Ordinary Find with no match | Explicit `0/0 · No matches`. |
| Search with 205 results | Reached 201-205; question pagination advances independently; changing the query resets pages. |
| Manual picker | 40 rows before and after Next; returning to Previous retains the selected passage. |
| Comparative source | Passage A hides B without rewriting text; Find searches Both, count advanced from 1/3 to 2/3. |
| Timed Find without matches | `0/0`, match buttons disabled. |
| Phone 390x844 | Passage/Questions controls reachable; questions and answer controls usable; pause hides the reader. |
| Tablet 768x1024 | Single-pane reader. |
| Wide 1440x900 | Split reader after ResizeObserver settles. |
| Docked simulation in wide viewport | Reader container about 624px uses a single pane. |
| Display | Text size 1.15, spacing 0.2 and navy scheme survive reload. |
| Full-test child runner | Real child runner/shared reader rendered with readable controls and sealed feedback. |
| Existing Inbox draft | Context arrival preserves typed text; explicit Insert appends source details; Send remains disabled in fixture. |

Initial fixture wiring failures were corrected before these checks. Browser rendering also exposed a real inherited-color defect in the timed white frame; both runner frames were repaired and rechecked.

## Automated verification

The integrated RC/shared suite passed 658 tests across 53 files. A subsequent focused Inbox/review check passed 24 tests across seven files. These runs overlap and must not be added together. Targeted lint errors in newly authored test fixtures were fixed; runner hook/fast-refresh warnings remain. Typecheck and production build passed, including answer-key/index verification and the no-canonical-content build check.

## Limits and unfinished packets

Synthetic-controller rendering does not establish backend lease/clock behavior, two-device account recovery, production mutation acknowledgement, or the backend preflight/Fresh creation boundary. No production clock, Discard, answer mutation, email or Inbox send was performed.

Actual screen-reader speech and a complete 200% zoom/keyboard acceptance matrix remain open. Device-local marks do not become account-backed annotations. Ordinary player Display consolidation and its full responsive redesign remain separate. Saved RC fixed sets/recipes, strict exposure tracking with historical Unknown handling, broader adaptive transparency, optional training overlays and missing authored explanations are unfinished. The explanation inventory identifies 556 questions without prose; it does not approve existing explanations pedagogically.

Do not describe the whole T01-T10 plan as complete. Merge requires Joshua's authorization; publication follows an authorized merge through the standing free Lovable route.
