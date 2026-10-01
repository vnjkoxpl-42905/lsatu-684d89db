# Progress and History account parity

Read-only exploration followed by the authorized canonical identity correction. No source records, identity mappings, RLS policies or backend functions were changed by this batch.

## Verified calculations and source populations

- First-answer calculation selects the first graded response globally before applying 7/14/21/30/All. Repeats in the window do not rewrite an earlier first answer. Percentages remain unavailable below three distinct questions; three to nine is an early signal.
- Completed protected LR sections enter via `section_history` question detail. Their `attempts.mode='full-section'` rows are excluded from the ordinary drill adapter, preventing double counting. Unanswered questions do not enter answer accuracy.
- Completed RC sessions gate RC first-answer eligibility. The reader now preserves `timed_section_sitting_id` and labels those owned standalone sources `timed-section`; ordinary drills remain `rc-drill`, completed PrepTests remain `practice-test`.
- The canonical selected-student RPC deliberately rejects distinct class/auth UUIDs. The corrected readers validate the canonical account before querying account records, retain the original class scope for permission checks, and fail visibly on missing/conflicting identity. Self account reads retain their UUID.
- Ordinary tester/admin JWT source reconciliation matched row counts and SHA256 values for all five ledger sources: attempts 17, section_history 9, rc_attempts 81, rc_drill_sessions 11, practice_test_runs 2. This establishes matching raw source populations for one designated QA account, not every account or browser rendering. Evidence: `2026-09-30-first-answer-source-parity-live.json`.

## History corrections verified in the integrated release

History now shows unavailable section data instead of an empty list, clears all prior-owner rows immediately on account change, and gates timed LR/RC and section rows against exact saved completion. PrepTest outcomes wait for completed parent authority. The raw view is excluded for LR/RC; RC attempts are read only from eligible completed sessions. Unanswered RC rows stay out of answer accuracy. Supported native lab answers use authored-question identity across runs while retaining each saved response; labels display answers rather than transport JSON.

Eleven focused transport/UI checks, typecheck, lint, independent review, local account/error/recovery and CSS390/820/1060/1280/1600 checks passed. Fresh production History showed45 answers /17 authored questions for the designated tester, including repeated native lab responses. This is a client-facing History gate, not a new backend secrecy contract for raw attempt tables. Unknown/unmarked legacy evidence retains its prior behavior. Sections remain explicitly disclosed as all time.

#173 remains open for broader coverage, dense table/source-linked actions and full live acceptance. #170 remains open outside the bounded native/Hard Sentences episode implementation.
