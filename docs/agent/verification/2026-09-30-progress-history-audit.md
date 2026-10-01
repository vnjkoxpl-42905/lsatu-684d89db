# Progress and History account parity

Read-only exploration followed by the authorized canonical identity correction. No source records, identity mappings, RLS policies or backend functions were changed by this batch.

## Verified calculations and source populations

- First-answer calculation selects the first graded response globally before applying 7/14/21/30/All. Repeats in the window do not rewrite an earlier first answer. Percentages remain unavailable below three distinct questions; three to nine is an early signal.
- Completed protected LR sections enter via `section_history` question detail. Their `attempts.mode='full-section'` rows are excluded from the ordinary drill adapter, preventing double counting. Unanswered questions do not enter answer accuracy.
- Completed RC sessions gate RC first-answer eligibility. The reader now preserves `timed_section_sitting_id` and labels those owned standalone sources `timed-section`; ordinary drills remain `rc-drill`, completed PrepTests remain `practice-test`.
- The canonical selected-student RPC deliberately rejects distinct class/auth UUIDs. The corrected readers validate the canonical account before querying account records, retain the original class scope for permission checks, and fail visibly on missing/conflicting identity. Self account reads retain their UUID.
- Ordinary tester/admin JWT source reconciliation matched row counts and SHA256 values for all five ledger sources: attempts 17, section_history 9, rc_attempts 81, rc_drill_sessions 11, practice_test_runs 2. This establishes matching raw source populations for one designated QA account, not every account or browser rendering. Evidence: `2026-09-30-first-answer-source-parity-live.json`.

## Remaining concrete History work

1. `src/pages/DrillHistory.tsx` catches a section query failure and sets `sections=[]`. It consequently presents an empty Sections list instead of unavailable data. Test: reject section read while ordinary attempt read succeeds; retain available attempts and show section retry/error rather than “no sections.”
2. The same page stores rows/sections without owner scope and does not reset them when auth owner changes. Test: load owner A, switch to B while B queries remain pending; A's rows/counts must disappear immediately, and late A responses must not populate B.
3. Sections are all time while Timeline/By question follow the window. The page explicitly discloses “Sections below show all time,” so this is a known product scope distinction rather than silent filtering. Shared-window section behavior remains a #173 acceptance decision.
4. Tracked `drill_history` RC SQL directly selects `rc_attempts.is_correct` without joining session completion. Protected RC checkpoints persist grading before close. The legacy History timeline can therefore reveal an active end-of-set outcome unless its live source is masked. Root assigned navigation review/fix before release; this audit makes no claim that the managed view was independently inspected or the fix completed.

Meaningful outcome masking check: an actual owned protected in-progress RC session with saved responses must remain unfinished/ungraded in History, then become graded after acknowledged completion. Existing completed RC outcomes and original source rows must remain unchanged. A query failure must fail visibly rather than imply complete coverage.

#173 remains open for broader coverage, dense table/source-linked actions and full live acceptance. #170 remains open outside the bounded native/Hard Sentences episode implementation.
