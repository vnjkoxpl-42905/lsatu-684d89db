# Review log: sections-post-section-rebuild

Date started: 2026-11-18
Host and coordinator: Claude Code (Sonnet 5.5). Reviewer: Codex CLI 0.167.0, requested model gpt-6-astra, effort high.
Mode: review only. Joshua said not to build. No build or inspection phase is authorized.
Plan: plans/sections-post-section-rebuild.md. Audit: docs/audits/2026-11-18-sections-post-section-review-audit.md.
Max rounds: 5. Run diagnostics are kept outside the checkout in the session scratchpad.

Joshua's brief to the reviewer: check each finding against the code, challenge ordering, schema choices (security-definer function versus UPDATE policy, idempotency key), seal preservation, and anything the audit missed.

## Round 1 (2026-11-18)
Reviewer: Codex CLI 0.167.0, requested gpt-6-astra high, effective gpt-6-astra high, sandbox read-only. Session 01a1ef98-7207-73b1-b54d-674ac1b33c6b.
Plan SHA256 reviewed: cc2cb6f56234ddd57eae815bc2cfa202b6ba47e2d06a638961f170df9910ad13
Result: C:/Users/Joshu/AppData/Local/Temp/claude/7d23ba4d324869bc/aaa07d72-baf8-4fff-99e8-fb880d909ee2/scratchpad/claudex-r1/claudex-odntn3zr/result.json (outside the checkout)
Verdict: REVISE, nine findings (3 high, 6 medium)

### Full response
{
 "verdict": "REVISE",
 "summary": "The plan has concrete gaps in protected-row updates, retry safety, assignment seals, saved-report fidelity, and historical navigation.",
 "findings": [
  {
   "id": "R1",
   "severity": "high",
   "path": "plans/sections-post-section-rebuild.md:59",
   "evidence": "Phase 2 considers only RLS policies. The section_history trigger in docs/implementation-plans/artifacts/2026-09-30-standalone-timed-writer.sql:59-98 rejects writes to protected rows unless current_user is timed_section_executor. An owner UPDATE policy cannot bypass it, and an ordinary security-definer function owned by another role also fails. Protected-path blind review would remain unsavable.",
   "fix": "Inspect deployed triggers and function ownership in Phase 0. Specify a narrowly authorized BR writer compatible with the protected executor contract, retaining ownership checks and first-answer immutability. Verify it with the actual source guards installed."
  },
  {
   "id": "R2",
   "severity": "high",
   "path": "plans/sections-post-section-rebuild.md:75",
   "evidence": "The proposed assignment seal cannot be determined from the saved row: neither persistSectionResults nor SectionHistoryRow carries assignment identity or a BR-required flag. Moving history creation before BR also exposes the new row through fetchSectionHistory, DrillHistory/SectionHistoryList, listPracticeSectionAttempts, and the review queue. Those readers display scores or credited answers without the proposed report-level seal.",
   "fix": "Persist assignment linkage and release requirements at close-out. Define a shared release check and apply it to history summaries, report/detail loaders, testing attempts, review queues, and BR entry points. Test navigating away from an assigned section before BR, including direct links."
  },
  {
   "id": "R3",
   "severity": "high",
   "path": "plans/sections-post-section-rebuild.md:48",
   "evidence": "Reusing runSittingCloseout's pattern does not provide the promised retry safety. Drill.tsx:2045-2148 inserts attempts and journals answered misses on every invocation; it throws after partial attempt failures without returning savedQids/wajQids. runSittingCloseout records progress only after that call succeeds. A later history failure or partial attempt failure therefore causes repeated attempt inserts and journal appends. The alternative sitting_key stored in JSON also has no database uniqueness guarantee.",
   "fix": "Specify stable per-sitting/per-question attempt and journal identities with server-enforced idempotency, plus a unique history identity. Preserve partial progress and retry attempt and journal work independently. Cover partial success, lost acknowledgments, concurrent submissions, and reloads; do not rely solely on localStorage bookkeeping or a JSON key."
  },
  {
   "id": "R4",
   "severity": "medium",
   "path": "plans/sections-post-section-rebuild.md:59",
   "evidence": "Moving persistence before BR writes analysis_json with blindReviewDone=false. The proposed BR function updates question BR fields and totals but never updates the diagnosis. sectionAnalysis.ts:679-699 then leaves the saved report saying no blind review was sat, even after BR completion, and omits recovered-versus-stuck findings. Previously the legacy results mount could generate the diagnosis after BR.",
   "fix": "Define how BR completion persists an updated or separately versioned diagnosis using saved question evidence and the original timing configuration. Ensure the report, history view, and any report email clearly reflect the appropriate analysis version."
  },
  {
   "id": "R5",
   "severity": "medium",
   "path": "plans/sections-post-section-rebuild.md:82",
   "evidence": "The claimed existing cross-source deduplication does not exist. buildReviewQueue deduplicates journal and flags internally, while ReviewQueuePage.tsx:194-210 concatenates those items with section items. projectReviewEpisodes does not merge them. Adding section misses will list a journaled miss twice, under lr:<qid> and section:<historyId>:<qid>.",
   "fix": "Add an explicit cross-source merge policy and implementation. Suppress mirrored journal items while retaining their notes and reasons, and preserve genuinely distinct sittings. Test an answered section miss present in both sources and repeated sittings of the same question."
  },
  {
   "id": "R6",
   "severity": "medium",
   "path": "plans/sections-post-section-rebuild.md:74",
   "evidence": "Old result URLs do not always contain a section_history id. practiceSectionAttempts.ts emits /testing/attempts/section/lr/<session.id> for completed legacy resume records without a matching history row, and PracticeSectionResult currently displays those records. Redirecting every old URL to a history-only report makes those existing results unavailable. Keeping isCompletedLrMirror does not create the missing history record.",
   "fix": "Resolve the old identifier against both history and completed resume records before redirecting. Provide a truthful legacy fallback or an explicitly designed, idempotent conversion that preserves the available saved evidence."
  },
  {
   "id": "R7",
   "severity": "medium",
   "path": "plans/sections-post-section-rebuild.md:71",
   "evidence": "The report promises predicted-versus-actual results from the saved row, but Drill.tsx:3764-3772 collects predictedScore only after the proposed close-out write. Neither the history writer nor reader persists it, and no later prediction update is planned. A row-only report cannot show the submitted prediction consistently immediately and on reopening.",
   "fix": "Add optional persisted prediction metadata and an owner-scoped update after prediction submission. Read it through SectionHistoryRow and preserve an explicit unknown state for older records."
  },
  {
   "id": "R8",
   "severity": "medium",
   "path": "plans/sections-post-section-rebuild.md:73",
   "evidence": "The proposed adapter passes saved choices but not the saved credited answer. SectionReviewWalk.tsx:239 supplies question.correctAnswer from the current question bank. If a credited answer changes after the sitting, the saved report and review walk will identify different answers as correct, violating the saved-record source-of-truth principle.",
   "fix": "Extend the walk input to carry the saved credited answer and use it for historical grading displays. Keep current question wording or explanations explicitly distinguished from saved outcomes, and handle unavailable bank questions without an indefinite Loading state."
  },
  {
   "id": "R9",
   "severity": "medium",
   "path": "plans/sections-post-section-rebuild.md:35",
   "evidence": "The mandatory Phase 0.1 query selects qual and with_check from pg_policy. Those are pg_policies view columns; pg_policy stores polqual and polwithcheck. The supplied query fails before producing the evidence required by the phase exit criterion.",
   "fix": "Query pg_policies with schemaname and tablename filters, or use pg_get_expr(polqual, polrelid) and pg_get_expr(polwithcheck, polrelid) against pg_policy."
  }
 ],
 "coverage": [
  "Verified the on-disk plan SHA256 matches cc2cb6f56234ddd57eae815bc2cfa202b6ba47e2d06a638961f170df9910ad13; read the companion audit.",
  "Traced legacy attempt writes, journal appends, close-out bookkeeping, history persistence, prediction, BR completion, and assignment completion.",
  "Inspected protected controller close-out, report routing, SQL writer and source guards, and relevant verification-script references.",
  "Traced history lists, owned detail loading, testing-attempt aggregation, review queue composition, review episodes, and saved review-walk inputs.",
  "Inspected selected existing tests as source evidence; reviewed first-answer and practice-test review readers."
 ],
 "limitations": [
  "No files edited, tests run, or work delegated.",
  "No live database, deployed policies/triggers, capability distribution, historic BR counts, or real student sittings inspected.",
  "No browser verification performed.",
  "Analytics-reader coverage was targeted, not the exhaustive inventory required by Phase 0.2."
 ]
}

### Coordinator dispositions
Round 1 dispositions from the coordinator. Every finding was checked against the code, and all nine are accepted. The plan was revised and has a new hash.

R1 accepted. The guard trigger in standalone-timed-writer.sql:59-98 does block updates to protected rows from any role but timed_section_executor. Design changed: section_history is written once and never updated. Prediction, blind review and the updated diagnosis go in a new table, section_review_records, keyed to the history row. Please check the composite FK to a protected row, and whether adding columns and a unique index to section_history can fire the guard.
R2 accepted. assignment_id and release_requires_br are persisted at close-out. One shared sectionReleaseState function is applied in every reader (Phase 3.1).
R3 accepted. Deterministic attempt ids, append_waj_wrong_once, unique client_sitting_id, and per-question partial progress in commitSessionAttempts (Phase 1). Local bookkeeping is now only an optimization.
R4 accepted. br_analysis_json is computed on blind review completion from the saved questions and timing, and the report labels which diagnosis version it shows (2.2, 2.7). The second teacher email is left as a decision for Joshua because it needs an Edge Function change.
R5 accepted. A cross-source merge is specified (4.2). I also narrowed the scope: after Phase 1 every miss is journaled, so section items now add only regret and changed-in-BR reasons.
R6 accepted. Old URLs resolve against history first, then completed resume records, with a truthful fallback (3.5).
R7 accepted. predicted_score is persisted in section_review_records at prediction time (2.3).
R8 accepted. The walk grades from the saved credited answer and handles missing bank questions explicitly (3.4).
R9 accepted. The query now uses pg_policies and pg_get_functiondef (Phase 0.1). I also added Phase 0.7 to 0.9.

Please re-review the revised plan end to end. Challenge especially: the side-table decision, whether idempotency holds when two tabs close out the same section, and whether any reader still exposes an assigned section before blind review.

## Round 2 (2026-11-18)
Reviewer: same Codex session (resumed), effective gpt-6-astra high, read-only.
Plan SHA256 reviewed: 0fac10394d28433c2d6a0fac0f0f27b730daa9f9531a03ae6b6aa0af1df593f4
Result: C:/Users/Joshu/AppData/Local/Temp/claude/7d23ba4d324869bc/aaa07d72-baf8-4fff-99e8-fb880d909ee2/scratchpad/claudex-r2/claudex-gd2mq3hc/result.json (outside the checkout)
Verdict: REVISE, six findings (3 high, 3 medium)

### Full response
{
 "verdict": "REVISE",
 "summary": "The side-table approach resolves the protected-history update problem. The revision still leaves concrete gaps in seal coverage, concurrent close-out consistency, shared failure handling, and merged review data.",
 "findings": [
  {
   "id": "R10",
   "severity": "high",
   "path": "plans/sections-post-section-rebuild.md:100",
   "evidence": "The expanded release rule still misses independent result sources. Phase 1 journals misses before BR, while getWAJEntries/getWrongAnswerSmartRows return them without release filtering. ReviewQueuePage builds journal items independently of buildSectionReviewQueue, and JournalEntrySurface displays their answers and credited answers. fetchDrillHistory also exposes legacy full-section attempts without assignment-release checks; firstAnswerSources/adaptLrSections project the newly saved history into progress without checking release_requires_br. Filtering section-derived queue items does not suppress these paths.",
   "fix": "Carry sitting attribution into attempts and journal events and apply release filtering before their student-facing projections, including direct journal routes, drill history and progress. Preserve previously released events for the same question. Test an assigned section before BR through each independent source, including when history persistence has not yet succeeded."
  },
  {
   "id": "R11",
   "severity": "high",
   "path": "plans/sections-post-section-rebuild.md:75",
   "evidence": "Deterministic row IDs prevent duplicates but do not make a multi-step close-out consistent. Two tabs can hold different answers for the same sitting: tab A inserts answer A, tab B treats its conflicting answer B insert as successful on 23505, then tab B writes history containing B. Attempts and history now disagree despite each having exactly one row. No canonical close-out snapshot or payload-conflict check is specified. The client_sitting_id lifecycle is also unspecified: existing practiceSessionIdFor is reused per user/pool across repeat sittings, and PracticeSession/device backups have no per-sitting identity. Guided drills already address the snapshot problem with lockGuidedCloseout before analytics writes.",
   "fix": "Define an account-persisted sitting identity that survives reloads and concurrent tabs but changes for a genuine retake. Atomically freeze one close-out snapshot before writing attempts or journal events, and derive every subsequent write from it. Reject conflicting payloads instead of treating every duplicate as success. Persist a closing state so re-entry retries that snapshot. Test divergent tab contents and a retake, not only duplicate submissions of identical data."
  },
  {
   "id": "R12",
   "severity": "high",
   "path": "plans/sections-post-section-rebuild.md:76",
   "evidence": "Changing commitSessionAttempts from throwing to returning failed changes callers outside the new standalone module. Drill.tsx:3178 runSittingCloseout consumes only savedQids/wajQids and gates history on journal coverage. If an answered-correct attempt fails, no journal entry is owed, so the practice-test leg can write history and finalize despite the missing attempt. handleFinishPracticeSet at Drill.tsx:2989 likewise relies on an exception to stop completion. These flows are declared out of scope.",
   "fix": "Preserve the existing throwing contract for unaffected callers through a wrapper, or explicitly update every caller to reject completion when failed is nonempty. Retain required timing/journal diagnostics. Add regressions for an answered-correct attempt failing in a practice-test leg and in a practice set."
  },
  {
   "id": "R13",
   "severity": "medium",
   "path": "plans/sections-post-section-rebuild.md:92",
   "evidence": "Record existence is not BR completion: savePrediction creates section_review_records before any BR. Phase 2.7 therefore selects a null br_analysis_json immediately after a successful prediction and hides the existing first-pass diagnosis. The data-model rule that the entire record wins also allows a prediction-only record to mask historical br_* data.",
   "fix": "Merge prediction and BR independently. Select the new BR block and diagnosis only when BR completion and the corresponding payload are present; otherwise retain the historical BR fields and first-pass analysis. Ensure prediction upserts cannot clear BR fields. Test prediction-only records over both new and historical history rows."
  },
  {
   "id": "R14",
   "severity": "medium",
   "path": "plans/sections-post-section-rebuild.md:112",
   "evidence": "The proposed same-sitting merge receives data that has already lost sitting identity. buildReviewQueue stores one item per qid and combines the first and latest journal events; ReviewQueueItem has no sitting key. Two ordinary misses of the same question in separate sections, with no BR changes, therefore produce one journal item and no additional section items under Phase 4.1, contradicting the two-sittings test. Protected journal events also lack the proposed new sitting key, as shown by standalone-timed-writer.sql:295-303.",
   "fix": "Build section review items per history row for missed/skipped questions as well as BR signals. Preserve journal-event sitting provenance before aggregation, then merge attributable duplicates while retaining notes and flags. Define an explicit fallback for historical and protected events without attribution; do not guess identity from qid alone."
  },
  {
   "id": "R15",
   "severity": "medium",
   "path": "plans/sections-post-section-rebuild.md:89",
   "evidence": "The saved-answer fix covers SectionReviewWalk but not the BR writer feeding the new record. EnhancedBlindReview.tsx:161 still computes result.correct against questionBank's current correctAnswer. If the saved credited answer was A and the bank now says B, submitting A in later BR produces a wrong BR result beside a walk that correctly identifies saved answer A. analyseSection consumes brCorrect; it does not independently grade BR answer letters.",
   "fix": "Derive BR correctness, changes, totals and diagnosis inputs from the saved first answers and credited answers in saveBlindReview, rather than trusting current-bank result.correct. Preserve untouched-answer semantics and explicitly handle unavailable questions. Test a bank answer-key change between sitting and BR."
  }
 ],
 "coverage": [
  "Verified the on-disk SHA256 matches 0fac10394d28433c2d6a0fac0f0f27b730daa9f9531a03ae6b6aa0af1df593f4 and read the revised plan and review log.",
  "Checked prior dispositions: protected-update avoidance, corrected policy query, old-URL fallback, prediction persistence and saved-answer walk changes address their original design defects.",
  "Inspected protected standalone and practice-test source guards. The proposed nullable-column/index additions and composite foreign-key reference do not perform parent-row DML and therefore do not invoke those guards.",
  "Traced close-out callers, guided snapshot locking, resume persistence, per-pool identities, device backups and finalization.",
  "Traced journal writes and readers, queue aggregation, direct journal display, drill history and first-answer progress.",
  "Reviewed BR grading, history persistence, diagnosis inputs and protected journal attribution."
 ],
 "limitations": [
  "No files edited, tests run, or work delegated.",
  "No live database policies, triggers, grants, data counts or capability distribution inspected; database conclusions are based on repository SQL.",
  "No browser verification performed.",
  "The new schema and modules remain a plan; their implementation and concurrency behavior could not be tested.",
  "Analytics-reader inspection was targeted rather than the exhaustive Phase 0.2 inventory."
 ]
}

### Coordinator dispositions
Round 2 dispositions from the coordinator. Every finding was checked. Five are accepted, one (R14) is accepted with a change. The plan was revised and has a new hash.

R10 accepted. I confirmed the leak exists today: the journal and attempts are written before blind review. The plan now writes nothing to attempts or the journal for a sealed assigned section until release, so the journal readers have nothing to leak. The release rule also applies in adaptLrSections, firstAnswerSources and fetchDrillHistory. Phase 0.11 and 0.12 prove the current leak and list every reader.
R11 accepted. The close-out is now one server transaction, close_standalone_section_v1, first writer wins on client_sitting_id, and the loser gets conflict and shows the saved result. The sitting identity is created at a genuine start, stored in the resume record and device backup, reused on resume and new on retake. Phase 0.10 checks the PracticeSession schema keeps the added field.
R12 accepted, resolved by not changing the shared code. The standalone legacy section no longer calls commitSessionAttempts. runSittingCloseout, handleFinishPracticeSet and guided close-out keep their current contracts, and Phase 1.8 adds regression tests for an answered-correct attempt failing in a practice-test leg and in a practice set.
R13 accepted. The record has independent column groups (prediction, blind review, release). Readers use blind review data only when br_completed_at and the payload are present. A prediction-only record cannot mask historical data.
R14 accepted with a change. The journal keeps its existing model of one episode per question; I am not changing that product behavior. Section items add only regret and changed-in-BR signals per history row. Journal events from the new close-out carry the sitting key, buildReviewQueue preserves it before aggregation, and events without a key are never matched by question alone.
R15 accepted. saveBlindReview derives correctness, changes, totals and diagnosis inputs from the saved first answers and saved credited answers, not from result.correct. Test with a bank key change between the sitting and the review.

Please re-review the revised plan end to end. Challenge especially: whether close_standalone_section_v1 as a security-definer function can be made safe against a caller forging a payload (the client already computes correctness today, so I treat that as the same trust level), whether the sealed deferral loses any student work, and whether any shared caller still changes behavior.

## Round 3 (2026-11-18)
Reviewer: same Codex session (resumed), effective gpt-6-astra high, read-only.
Plan SHA256 reviewed: 9dd3f232f102d93981fb9700157191cf1bd1b5d02947fce8f53fe22a4a2efa0f
Result: C:/Users/Joshu/AppData/Local/Temp/claude/7d23ba4d324869bc/aaa07d72-baf8-4fff-99e8-fb880d909ee2/scratchpad/claudex-r3/claudex-3dx11wq_/result.json (outside the checkout)
Verdict: REVISE, six findings (4 high, 2 medium)

### Full response
{
 "verdict": "REVISE",
 "summary": "The revision resolves the shared-caller and saved-BR grading issues. Remaining defects concern release recovery, privileged-write authorization, sitting-ID races, an overlooked journal writer, and deferred-event ordering.",
 "findings": [
  {
   "id": "R16",
   "severity": "high",
   "path": "plans/sections-post-section-rebuild.md:103",
   "evidence": "BR completion, release, and the release timestamp are separate writes, but sectionReleaseState considers br_completed_at sufficient for release. If BR saves and the release RPC fails or the tab closes, reopening shows a released report while attempts and journal entries remain absent. A subsequent completion handler conditioned on 'sealed' can skip release permanently. Additionally, the existing append_waj_wrong unconditionally appends history_json; adding a sitting key to its payload does not provide deduplication.",
   "fix": "Make release materialization and its server-owned completion marker one locked transaction. Require valid persisted BR before release, and make concurrent/replayed releases return without appending again. Either commit BR and release together or persist a recoverable pending-release state that readers reconcile after reload. Test interruption between every step and concurrent release calls."
  },
  {
   "id": "R17",
   "severity": "high",
   "path": "plans/sections-post-section-rebuild.md:58",
   "evidence": "Moving the writes into SECURITY DEFINER changes the authorization boundary even if client-computed correctness remains trusted. The current append_waj_wrong is SECURITY INVOKER, and repository policies restrict journal writes by class_id. A new elevated caller that checks history.user_id but forwards a forged class_id can write another student's journal. The plan does not define server-derived identity fields, assignment ownership checks, replay-owner checks, or a BR precondition for the release RPC. Broad owner UPDATE on section_review_records also leaves the proposed release marker client-writable.",
   "fix": "Specify the RPC security contract: require a non-null authenticated actor; derive user_id and class_id server-side; validate assignment ownership; reject protected/practice-test attribution; scope conflict lookups to the owner; validate distinct question identities and payload shape; and enforce release prerequisites server-side. Restrict release-marker writes to the release function, pin search_path, and explicitly grant execution. Add forged-class, foreign-assignment, foreign-replay and premature-release tests. Retaining client-trusted grades need not permit client-trusted ownership."
  },
  {
   "id": "R18",
   "severity": "high",
   "path": "plans/sections-post-section-rebuild.md:44",
   "evidence": "The transaction deduplicates only submissions sharing client_sitting_id. Two tabs can resume the same pre-existing in-progress record without sittingId, independently generate different UUIDs, and persist them with last-writer-wins upserts. Both close-outs then insert successfully under different keys. drillResumeSession.ts uses unconditional bootcamp_kv upserts, and its write queue is an in-memory Map, so it does not serialize tabs or devices.",
   "fix": "Atomically claim or retrieve the sitting ID for the account resume record, including migration of in-flight records. Return the winning ID to every tab before allowing close-out. Use a revision or generation check for retakes so a stale tab cannot overwrite a newer sitting's identity. Test simultaneous resume of a record lacking sittingId."
  },
  {
   "id": "R19",
   "severity": "high",
   "path": "plans/sections-post-section-rebuild.md:117",
   "evidence": "Deferring the close-out writer does not leave the journal empty. Drill.tsx:3442-3491 handles flagging by calling ensureJournalEntry with selectedAnswer and currentQuestion.correctAnswer. This handler is wired into the full-section OfficialQuestionPane at line 5143. Flagging an answered question during an assigned section therefore creates a journal outcome before close-out or BR, and the unchanged journal readers expose it.",
   "fix": "Defer the flag-to-journal bridge for sealed section sittings as well. Preserve the flag without publishing the answer outcome, then materialize the appropriate journal event at release. Keep unrelated drill behavior unchanged and test flagging answered and unanswered questions before close-out and before BR."
  },
  {
   "id": "R20",
   "severity": "medium",
   "path": "plans/sections-post-section-rebuild.md:58",
   "evidence": "The specified INSERT uses ON CONFLICT (client_sitting_id) DO NOTHING, but the only proposed uniqueness guarantee is a partial index WHERE client_sitting_id IS NOT NULL. That conflict target does not include the predicate needed to infer the partial index, so the statement fails rather than executing close-out.",
   "fix": "Use ON CONFLICT (client_sitting_id) WHERE client_sitting_id IS NOT NULL DO NOTHING, or use an ordinary unique index that permits multiple nulls. Verify the exact SQL against the exact proposed index."
  },
  {
   "id": "R21",
   "severity": "medium",
   "path": "plans/sections-post-section-rebuild.md:59",
   "evidence": "Deferred journal insertion can arrive after newer work. For example, a student misses a question in a sealed section, later answers it correctly in another drill, then completes the section's BR. append_waj_wrong unconditionally appends the older miss and sets last_status='wrong'. journalService.ts:433-445 and reviewQueueModel.ts:56-57 treat the last array entry as the latest attempt, so release incorrectly replaces the newer correct outcome with an older miss.",
   "fix": "Preserve the original sitting timestamp on deferred attempts and journal events. Make late insertion maintain chronological history and derive latest status/answer from event time, rather than insertion order. Preserve existing notes and flags. Test release after a newer correct attempt and release of two sections in reverse completion order."
  }
 ],
 "coverage": [
  "Verified the on-disk SHA256 matches 9dd3f232f102d93981fb9700157191cf1bd1b5d02947fce8f53fe22a4a2efa0f.",
  "Rechecked prior findings: unchanged shared close-out contracts, independent review-record groups, saved-key BR grading, and atomic same-ID close-out address their original defects.",
  "Inspected journal RPC implementation and RLS evidence, resume upserts and serialization, flag-to-journal writes, and full-section flag controls.",
  "Traced deferred journal events into status, latest-answer and review-queue projections.",
  "Reviewed the proposed release sequence, partial unique-index conflict target, and privileged RPC authorization requirements."
 ],
 "limitations": [
  "No files edited, tests run, or work delegated.",
  "No live database policies, function ownership, grants, or deployment state inspected.",
  "The new RPC bodies do not yet exist; findings assess the specified contract against repository behavior.",
  "No browser verification or exhaustive Phase 0 reader inventory performed."
 ]
}

### Coordinator dispositions
Round 3 dispositions from the coordinator. Every finding was checked. R17, R18 and R20 are accepted. R16, R19 and R21 are accepted as real defects of the deferral design, and I resolved them by removing the deferral. The plan was revised and has a new hash.

R16, R19 and R21 resolved by removing the design that caused them. Deferring attempts and journal writes for sealed sections created the release-recovery gap (R16), the flag-to-journal bridge exposure (R19) and the late-event ordering problem (R21). Each needs its own design, and together they cost more than the protection buys. The plan no longer defers anything. The journal and attempts keep today's timing and today's exposure of answered misses before blind review. That is documented as a Known limitation (confirmed by the ensureJournalEntry bridge at Drill.tsx ~3442 that you cited) and as decision 4 for Joshua. The release function, released_at and release_reason are gone, and blind review completion is a single write, so there is no half-released state. The journal is written only by the call that created the history row, so no per-item dedupe key is needed (answers the second half of R16). One narrow timing change is declared: unanswered misses are journaled at close-out instead of after blind review.
R17 accepted. The Data model now has an explicit security contract for every function: non-null auth.uid(), user_id and class_id derived on the server, sitting ownership and open state checked, protected and practice-test markers rejected, payload shape and distinct qids validated, assignment ownership checked (Phase 0.13), owner-scoped replay lookups, pinned search_path, execute revoked from public and granted to authenticated. section_review_records accepts no direct writes; two functions write it, and the blind review function sets br_completed_at itself and derives grading from saved answers. Tests for forged class, foreign assignment, foreign sitting, protected markers and premature completion are in Phase 1.1 and 2.1.
R18 accepted. The sitting id is now server-owned in a new standalone_section_sittings table. open_section_sitting_v1 is serialized by a partial unique index, returns the winner to every tab, converges in-flight sections that had no identity, and a restart abandons the old id so a stale tab's close-out returns stale. The resume record only caches the id. Test: simultaneous opens, and a restart racing a stale close-out.
R20 accepted. The unique index on client_sitting_id is now an ordinary unique index (many nulls are allowed), which is a valid ON CONFLICT target. Phase 1.1 verifies the exact SQL against the exact index.

Please re-review the revised plan end to end. Challenge especially: whether the Known limitation is stated honestly and whether any new surface of this plan widens it beyond the unanswered-miss timing change, whether the sitting table and functions leave any window where two tabs can both close out, and whether the security contract is complete.

## Round 4 (2026-11-18): did not complete
Plan SHA256 sent: 200fc44f0c6ce860ab7b86c3ea34bc3111598f889ce20c3180dbc75869de4bec (the revision after round 3).
Result: failed, not a verdict. Codex returned "You've hit your usage limit ... try again at 3:41 PM" and exited 1 after 112 seconds.
This is not an approval and not a review of the revised plan. The round does not count toward the five-round limit as a completed round, and no other provider was substituted.
State: plan revised after rounds 1 to 3 and never reviewed after round 3's changes. To continue: after the Codex quota resets, resume from the round 3 result with the same model and effort, using plans feedback written for round 3.


## Round 4 (2026-11-18), completed on retry after the quota reset
Plan SHA256 sent: 200fc44f0c6ce860ab7b86c3ea34bc3111598f889ce20c3180dbc75869de4bec. Resumed from the round 3 session. Model gpt-6-astra, effort high, read-only (effective values confirmed). Result: C:/Users/Joshu/AppData/Local/Temp/claude/7d23ba4d324869bc/aaa07d72-baf8-4fff-99e8-fb880d909ee2/scratchpad/claudex-r4b\claudex-j6rxw_l9\result.json
Verdict: REVISE (3 findings: R22 high, R23 high, R24 medium). The earlier failed attempt is superseded by this run.

{
 "verdict": "REVISE",
 "summary": "The revision resolves the deferral-related defects and explicitly discloses the earlier exposure of unanswered misses. The new sitting lifecycle still breaks replay recovery, lacks restart/close-out serialization, and leaves the sitting table’s authorization unspecified.",
 "findings": [
  {
   "id": "R22",
   "severity": "high",
   "path": "plans/sections-post-section-rebuild.md:51",
   "evidence": "Closed sittings return stale before the replay branch can run. If close-out commits but its response is lost, retry therefore cannot recover the saved history. Reload then calls open_section_sitting_v1, which creates another sitting because none is open. The unchanged resume record can still contain the submitted answers: Drill.tsx:2948-2965 finalizes it separately and swallows finalization failures. Submitting those answers under the new sitting duplicates history, attempts and journal entries despite the unique history key.",
   "fix": "Return the owner-scoped committed history for a closed sitting before applying the stale-state rejection. Treat abandoned sittings separately. Resume/reload must reconcile the cached sitting with its committed result; allocating a replacement generation must require an explicit new start. Cover lost acknowledgment, failed resume finalization and reload recovery."
  },
  {
   "id": "R23",
   "severity": "high",
   "path": "plans/sections-post-section-rebuild.md:49",
   "evidence": "The partial unique index guarantees only one open row; it does not serialize the state check against restart. A close-out can observe an open sitting, then a restart can abandon it and create its successor, after which the original close-out inserts history and sets the abandoned sitting closed. The successor can also close successfully. Likewise, repeated restart=true requests can abandon the generation just returned by an earlier request. The promised stale-tab protection does not follow from the specified index.",
   "fix": "Specify a common transaction lock for open, restart and close-out, with the state rechecked under that lock and an atomic conditional transition before writing outcomes. Make restart conditional on the expected generation or an idempotent request identity. Verify both restart/close-out interleavings and replayed restart requests."
  },
  {
   "id": "R24",
   "severity": "medium",
   "path": "plans/sections-post-section-rebuild.md:47",
   "evidence": "The new standalone_section_sittings table is called server-owned, but the plan defines neither its RLS policies nor its table grants. Restricting function EXECUTE does not restrict direct table access. An authenticated INSERT or UPDATE permission would let callers bypass generation allocation or reopen/abandon sittings directly. The existing protected sitting design explicitly enables RLS and separates authenticated SELECT from executor writes in standalone-timed-control-foundation.sql:149-165.",
   "fix": "Specify and verify the sitting table’s permissions: enable RLS, allow only appropriate owner/admin reads, deny direct client INSERT/UPDATE/DELETE, and grant mutations solely to the function executor. Include direct-table and cross-owner authorization tests alongside the RPC tests."
  }
 ],
 "coverage": [
  "Verified the on-disk plan SHA256 matches 200fc44f0c6ce860ab7b86c3ea34bc3111598f889ce20c3180dbc75869de4bec.",
  "Checked the prior dispositions and review log; did not reopen the removed deferral design or the corrected unique-index conflict target.",
  "Traced sitting recovery through Drill.tsx, drillResumeSession.ts and practiceSessionStore.ts, including account upserts and separate resume finalization.",
  "Inspected protected-writer guards, sitting-table authorization patterns, journal writes and the flag-to-journal bridge.",
  "Reviewed saved section statistics, blind-review grading, history and teacher readers, first-answer sources, attempts-list reconciliation and review-queue aggregation.",
  "The side-table composite FK and proposed index/column additions do not themselves perform the protected history-row updates prohibited by the guard."
 ],
 "limitations": [
  "No files edited, tests run or work delegated.",
  "No live database policies, grants, ownership or deployed function definitions inspected.",
  "The proposed functions are not implemented; concurrency findings assess the specified operations and guarantees.",
  "No browser verification or exhaustive Phase 0 reader inventory performed. The full extent of pre-BR exposure remains unverified."
 ]
}

### Coordinator dispositions
All three were checked against the plan text and the code references cited, and accepted. The plan was revised and has a new hash.
R22 accepted. As written, a closed sitting returned stale before any replay lookup, and a reload could allocate a second sitting while the resume record still held the submitted answers (Drill.tsx 2948-2965 finalizes it separately and swallows failure). Now a closed sitting returns its saved history first; open_section_sitting_v1 takes the cached id and returns closed plus the history id with no successor; only an explicit restart creates one.
R23 accepted. The partial unique index only bounds open rows; it did not serialize restart against close-out. Now one advisory transaction lock per (user, pool_key) is taken by open, restart and close-out, state is rechecked under it, close is a conditional update, and restart requires the expected generation so repeated requests abandon nothing. Tests specify real concurrent transactions for both interleavings.
R24 accepted. The sitting table now has RLS, owner/admin SELECT only, and all client writes revoked, following standalone-timed-control-foundation.sql 149-165. Direct-write and cross-owner tests added for both new tables.


## Round 5 (2026-11-18), final allowed round
Plan SHA256 sent: c82f923790c571ea2de9f9e93c9d52a98bb885c2d233290758ddb5f58d0ec8df. Resumed from round 4. Model gpt-6-astra, effort high, read-only (effective values confirmed). Result: C:/Users/Joshu/AppData/Local/Temp/claude/7d23ba4d324869bc/aaa07d72-baf8-4fff-99e8-fb880d909ee2/scratchpad/claudex-r5\claudex-1vp60nxj\result.json
Verdict: REVISE (R25 high, R26 medium).

{
 "verdict": "REVISE",
 "summary": "The revision addresses direct replay recovery, transaction locking and table authorization. Two generation-handling gaps remain: stale resume writes can overwrite newer work, and recovery can still create unintended successor sittings.",
 "findings": [
  {
   "id": "R25",
   "severity": "high",
   "path": "plans/sections-post-section-rebuild.md:122",
   "evidence": "The sitting lock does not protect the resume data. drillResumeSession.ts:76-84 unconditionally upserts one account record per user/pool; hydration at lines 258-266 chooses by timestamp, and Drill.tsx:1280-1297 keeps autosaving from other tabs. After tab B restarts into generation 2, tab A on abandoned generation 1 can overwrite generation 2's answers and clock. A delayed replay finalization can also mark that shared record completed: practiceSessionStore.ts:275-301 uses the same pool-derived ID. Returning the current sitting ID on reload does not recover the overwritten generation-2 snapshot and can associate generation-1 answers with generation 2.",
   "fix": "Bind legacy standalone snapshots, device backups and finalization to the sitting ID/generation. Either store snapshots separately per sitting or enforce server-side generation checks on shared-record writes. Hydrate only matching-generation data, preserve stale copies separately, and ensure replay finalization cannot complete a newer sitting's resume record. Test stale heartbeat, delayed finalization and reload after a restart without changing unrelated callers."
  },
  {
   "id": "R26",
   "severity": "medium",
   "path": "plans/sections-post-section-rebuild.md:54",
   "evidence": "The no-open branches bypass the intended generation safeguards. If generation 1 is abandoned, generation 2 finishes, and the old tab reloads with generation 1, the explicit 'known one abandoned' branch creates generation 3 despite p_restart=false. Similarly, a delayed duplicate restart request for generation 1 creates another successor if its first successor has already closed, because the expected-generation comparison applies only to an open sitting. The advisory lock serializes these requests but does not make them idempotent.",
   "fix": "Distinguish first-ever allocation from recovery after prior generations. An abandoned or outdated known sitting must return a stale/reconciliation result without allocating a successor. Check restart expectations against the latest generation regardless of its state, or persist a restart request identity and return its original successor. Test recovery after the replacement closes and replay of a restart after its successor closes."
  }
 ],
 "coverage": [
  "Verified the on-disk SHA256 matches c82f923790c571ea2de9f9e93c9d52a98bb885c2d233290758ddb5f58d0ec8df.",
  "Rechecked R22–R24 against the revised replay ordering, common advisory lock, conditional transition and explicit sitting-table permissions.",
  "Traced resume identity, account upserts, device-backup selection, heartbeat saves and completion writes through Drill.tsx, drillResumeSession.ts and practiceSessionStore.ts.",
  "Rechecked protected source guards and the side-table design; index/column additions and the proposed FK do not require prohibited history-row updates.",
  "Reviewed the remaining report, blind-review, release-rule, queue and shared-caller provisions against evidence inspected across this review and prior rounds.",
  "The known limitation explicitly discloses existing journal exposure and the earlier exposure of unanswered misses; removed deferral findings were not reopened."
 ],
 "limitations": [
  "No files edited, tests run or work delegated.",
  "No live database policies, grants, ownership or deployed function definitions inspected.",
  "The new RPCs are specifications, not implemented SQL; concurrency behavior was assessed statically.",
  "No browser verification or exhaustive Phase 0 reader inventory performed."
 ]
}

### Coordinator dispositions
Both accepted after checking the cited code (drillResumeSession.ts upserts one record per student and section id and hydrates by updated_at; the finalization id is pool-derived).
R25 accepted. Standalone legacy resume records and device backups are now keyed by sitting id, hydration reads only the server-returned sitting's record, finalization names the sitting, and an in-flight section is adopted by copying (never deleting) its old record. Tests added for stale heartbeat, delayed finalization, reload after restart and adoption. Phase 0.10 must list every caller of the old key before Phase 1.
R26 accepted. open_section_sitting_v1 no longer allocates from a known-but-superseded id (it returns stale plus the latest sitting) and restart compares the expected generation to the latest generation in any state, so a replayed restart after its successor closed creates nothing. Tests added.

### Final state
Five rounds used, the maximum. Every round returned REVISE. The plan was revised after round 5 (new SHA256 067ae3af6e5c157fe4b1742795917f42a432d8d845487d4eaefade3ad4dfd527) and the revision has NOT been independently reviewed. There is no APPROVED result for any plan hash. Findings per round (R1-R26 as logged): 9, 6, 6, 3, 2, trending down and narrowing to the sitting-identity lifecycle. Not approved, not built.

## Round 6 (2026-11-18), extension authorized by Joshua
Plan SHA256 sent: 067ae3af6e5c157fe4b1742795917f42a432d8d845487d4eaefade3ad4dfd527. Resumed from round 5. Model gpt-6-astra, effort high, read-only (effective values confirmed). Result: /c/Users/Joshu/AppData/Local/Temp/claude/7d23ba4d324869bc/aaa07d72-baf8-4fff-99e8-fb880d909ee2/scratchpad/claudex-r6/claudex-cq2l0m6w/result.json

```json
{
 "verdict": "REVISE",
 "summary": "The revised design addresses R25 and R26. The new legacy-record adoption step still needs recoverable initialization and explicit handling in the attempts list.",
 "findings": [
  {
   "id": "R27",
   "severity": "high",
   "path": "plans/sections-post-section-rebuild.md:57",
   "evidence": "Creating the sitting and copying its legacy snapshot are separate operations. If the first tab closes after open_section_sitting_v1 commits but before copying, the next load receives an existing open sitting whose new snapshot is absent. The specified hydration reads only that new key. A second tab can encounter the same window while the first is copying. Drill.tsx:1323-1333 automatically saves even an unanswered full section, and drillResumeSession.ts:76-84 uses an unconditional upsert, so an empty initialization or late adoption copy can overwrite the other tab's resumed work. Keeping the old record preserves bytes but does not make recovery load them.",
   "fix": "Make adoption a durable, idempotent initialization step associated with the sitting. Persist its source and initialization state, prevent running/autosaving until adoption completes, and ensure retries cannot overwrite an initialized snapshot. Specify recovery after interruption between sitting creation and copying. Test that interruption and concurrent adoption by two tabs."
  },
  {
   "id": "R28",
   "severity": "medium",
   "path": "plans/sections-post-section-rebuild.md:169",
   "evidence": "Adoption leaves the old pool-derived record unchanged and in_progress, while completion finalizes only the new sitting-specific record. listPracticeSectionAttempts still reads all practice_sessions records, uploads local legacy copies at lines 76-95, and emits their status at lines 143-158. Its isCompletedLrMirror explicitly rejects in-progress records at line 17. Consequently, a successfully adopted and completed section remains listed as an additional unfinished section indefinitely. Phase 5.1's existing heuristic cannot suppress it.",
   "fix": "Persist an explicit old-record-to-sitting adoption mapping and make the attempts-list reader use it to suppress the superseded resume representation without deleting historical data. Use sitting identity and state for new records rather than the historical mirror heuristic. Test the list and its resume links before adoption, after adoption, after completion and after a stale local copy is encountered."
  }
 ],
 "coverage": [
  "Verified the on-disk SHA256 matches 067ae3af6e5c157fe4b1742795917f42a432d8d845487d4eaefade3ad4dfd527.",
  "Rechecked R25: sitting-specific snapshot, backup and finalization keys isolate different generations once initialized.",
  "Rechecked R26: known superseded identities do not allocate successors, and restart expectations apply to the latest generation in any state.",
  "Traced adoption through resume hydration, account upserts, device backups and automatic initial snapshot writes.",
  "Inspected listPracticeSectionAttempts, its local-to-account writer, mirror detection, and callers in TestingCentre and PracticeExamPages.",
  "Reviewed the unchanged close-out, authorization, blind-review, release-rule and report provisions against repository evidence from this and prior rounds; resolved findings were not reopened."
 ],
 "limitations": [
  "No files edited, tests run or work delegated.",
  "No live database policies, grants, ownership or deployed functions inspected.",
  "The proposed adoption and RPC implementations do not yet exist; findings assess the specified behavior against existing callers and writers.",
  "No browser verification or exhaustive Phase 0 inventory performed."
 ]
}
```

### Coordinator dispositions
Both accepted after checking the cited code: the full-section autosave (Drill.tsx 1323-1333) writes even an empty snapshot, and listPracticeSectionAttempts lists every drill::section:: record and re-uploads local copies (lines 76-95), with isCompletedLrMirror rejecting in-progress rows.
R27 accepted. Adoption now happens inside open_section_sitting_v1, in the same transaction and lock that creates the sitting, as an insert-if-absent copy of the account record, recorded as adopted_from_record_id and initialized_at. The client does not autosave or start the clock until open returns an initialized sitting. A device-backup-only copy applies only to an untouched sitting record. Test added for interrupted and concurrent adoption.
R28 accepted. The attempts list reads the sittings, hides records named as adopted_from_record_id (and the local upload loop skips them), and lists sitting-keyed records from sitting state. Tests cover before adoption, after adoption, after completion and with a stale local copy.

### State after round 6
Plan revised (new SHA256 08b165946ea63a418e3fed3fae04ae8c98374c40d473d401d1d7188b7d7b95f4); this revision is not reviewed. Findings per round: 9, 6, 6, 3, 2, 2. Not approved, not built.

## Round 7 (2026-11-18), extension authorized by Joshua
Plan SHA256 sent: 08b165946ea63a418e3fed3fae04ae8c98374c40d473d401d1d7188b7d7b95f4. Resumed from round 6. Model gpt-6-astra, effort high, read-only (effective values confirmed). Result: /c/Users/Joshu/AppData/Local/Temp/claude/7d23ba4d324869bc/aaa07d72-baf8-4fff-99e8-fb880d909ee2/scratchpad/claudex-r7/claudex-wd57wnj6/result.json

```json
{
 "verdict": "REVISE",
 "summary": "The revision addresses R27’s account-copy race and R28’s duplicate list entry. One new recovery defect remains: the device-backup condition rejects valid unsynced work whenever the adopted account snapshot already contains an answer.",
 "findings": [
  {
   "id": "R29",
   "severity": "high",
   "path": "plans/sections-post-section-rebuild.md:57",
   "evidence": "Suppose Q1 was saved to the account, then Q2 and additional elapsed time were saved locally but the account write failed. Adoption copies the account snapshot containing Q1. The proposed backup write now fails its 'no attempts yet' condition, even with no concurrent changes, so hydration resumes without Q2 and with the older clock. Keeping the backup on disk does not provide a recovery path when it is explicitly not applied. This regresses drillResumeSession.ts:258-272, which retains and returns the newer local snapshot, and Drill.tsx:1062-1067, which pauses on that exact recovery state until saving succeeds.",
   "fix": "Distinguish an unchanged adopted snapshot from an empty snapshot. Permit recovery against the captured adoption revision or snapshot hash, scoped to the same open sitting, even when the baseline contains answers. If that comparison fails, retain both versions and keep an explicit recovery state rather than silently resuming older work. Test an acknowledged Q1 plus an unacknowledged Q2 and newer clock, including concurrent modification during recovery."
  }
 ],
 "coverage": [
  "Verified the on-disk SHA256 matches 08b165946ea63a418e3fed3fae04ae8c98374c40d473d401d1d7188b7d7b95f4.",
  "Rechecked R27: transactional account adoption, insert-if-absent initialization and the autosave gate address the previously identified initialization window.",
  "Rechecked R28: adoption mappings, suppression of legacy local uploads and sitting-state listing address the duplicate unfinished entry.",
  "Traced device-backup creation, failed account writes, hydration selection, paused recovery and retry through drillResumeSession.ts and Drill.tsx; read the related existing tests without executing them.",
  "Rechecked the unchanged lifecycle, authorization, report, blind-review, queue and shared-caller provisions against evidence inspected across this and prior rounds."
 ],
 "limitations": [
  "No files edited, tests run or work delegated.",
  "No live database policies, grants, ownership or deployed functions inspected.",
  "The proposed SQL and recovery implementation do not yet exist; this is a plan review.",
  "No browser verification or exhaustive Phase 0 inventory performed."
 ]
}
```

### Coordinator dispositions
R29 accepted after checking drillResumeSession.ts 258-272 (newer local copy kept and returned) and Drill.tsx 1062-1067 (paused on the question until a save succeeds). The no-attempts condition would have dropped a real unsaved answer. The sitting now records adopted_revision; device recovery uses the existing paused path scoped to the sitting key, with a conditional write against adopted_revision (or the last-read revision) whether or not the baseline has answers. If the record moved on, both copies are kept and the tab stays paused. Test added for acknowledged Q1 plus unacknowledged Q2 and newer clock, with concurrent change.

### State after round 7
Plan revised (new SHA256 a25bbc02d384661db8ff1c560ffa114976854ca8af66ba761b37c3927f6dc38b); not reviewed. Findings per round: 9, 6, 6, 3, 2, 2, 1. Not approved, not built.

## Round 8 (2026-11-18), extension authorized by Joshua
Plan SHA256 sent: a25bbc02d384661db8ff1c560ffa114976854ca8af66ba761b37c3927f6dc38b. Resumed from round 7. Model gpt-6-astra, effort high, read-only (effective values confirmed). Result: /c/Users/Joshu/AppData/Local/Temp/claude/7d23ba4d324869bc/aaa07d72-baf8-4fff-99e8-fb880d909ee2/scratchpad/claudex-r8/claudex-qcep17n1/result.json

```json
{
 "verdict": "APPROVED",
 "summary": "R29 is resolved at the plan level: recovery now checks the saved revision rather than requiring an empty snapshot, and concurrent changes preserve both copies in a paused state. No further material defects identified in the revised specification.",
 "findings": [],
 "coverage": [
  "Verified the on-disk SHA256 matches a25bbc02d384661db8ff1c560ffa114976854ca8af66ba761b37c3927f6dc38b.",
  "Rechecked device-backup selection, paused hydration, save acknowledgment and retry behavior in drillResumeSession.ts and Drill.tsx.",
  "Confirmed the revised recovery contract covers acknowledged answers plus newer unsynced answers and elapsed time, without overwriting a changed baseline.",
  "Rechecked prior resolutions for atomic adoption, sitting-specific storage, stale-generation handling, replay recovery and attempts-list deduplication.",
  "Reviewed the remaining close-out, authorization, blind-review, report, release-rule and shared-caller provisions using repository evidence inspected across these rounds.",
  "The documented pre-BR journal exposure and earlier exposure of unanswered misses remain explicit scope limitations."
 ],
 "limitations": [
  "Approval concerns the plan, not an implemented or deployed change.",
  "No files edited, tests run or work delegated.",
  "Live database policies, grants, ownership and Phase 0 evidence remain unverified.",
  "No browser verification or exhaustive reader inventory performed; the plan�s implementation and verification gates remain outstanding."
 ]
}
```

### Final state
APPROVED for plan SHA256 a25bbc02d384661db8ff1c560ffa114976854ca8af66ba761b37c3927f6dc38b (unchanged since sent). Findings per round: 9, 6, 6, 3, 2, 2, 1, 0. Approval covers the plan only. Outstanding before build: Phase 0 live checks and Joshua's four decisions (protected path rollout, second teacher email, unreleased assigned sections, existing journal exposure). Not built, not committed.

### Post-approval edit (2026-11-18)
Only the "Decisions for Joshua, not part of this build" section changed, to record Joshua's four decisions. No build steps, contracts or tests changed. New SHA256 4f39f6a1706988983470f390c994f75a98b39fd687e21da64ed0c10979ad87fc; the round 8 approval was issued for a25bbc02... and covers the build content unchanged.

## Round-three implementation and Phase 0 evidence ledger (2026-11-24)

Independent review base: `7dc7b355fbaf240dd4ef252ec1a4976fd2908ea0`. Round-two findings and release gates are in the [independent review](../../ai-os/handoffs/2026-11-23-pr291-round2-review.md). Before revising the PR's completion claims, collect the missing evidence below on the exact candidate tip.

| Phase 0 item | Evidence available | Open proof |
| --- | --- | --- |
| 0.1 Policies, triggers, function ownership | Checked-in [rebuild SQL](../docs/implementation-plans/artifacts/2026-11-20-sections-post-section-rebuild.sql) and [protected writer](../docs/implementation-plans/artifacts/2026-09-30-standalone-timed-writer.sql) describe the separate roles and writers. | Export actual policies, grants, function owners and trigger definitions, then exercise explicit owner, unrelated student and teacher roles. |
| 0.2 Attempts readers | [AST guard](../src/lib/attemptsReaders.test.ts) enumerates client/operator expressions. [Edge inventory](../docs/implementation-plans/artifacts/2026-11-23-ta-agent-br-filter.patch.md) names the deferred service readers. | Confirm scope and review authorization for each Edge reader and its deployed version. |
| 0.3 Row counts | The round-two PR body reports one test sitting's counts. | Capture aggregate counts for historical BR attempts, BR-used history rows and rows with no saved questions. |
| 0.4 Capability | The app exposes a capability RPC and the protected writer fixtures cover the enabled and disabled states. | Capture current ordinary-user capability split through the approved probe. |
| 0.5 Protected report | Signed-in local Exam Attempts rendered protected route entries. The account had a completed RC entry and no completed protected LR entry. | Verify an eligible completed protected LR sitting reaches the saved report through its legacy link and its protected completion screen. |
| 0.6 Legacy journal duplication | Round-two evidence documents duplicate risk. Current isolated fixture asserts one append per miss after replay. | Retain a real pre-change reproduction or label the historical reproduction unobserved. Capture post-change cardinality on the authorized fixture. |
| 0.7 Close-out retry duplication | Fixture distinguishes first write from replay. The PR body's HTTP 500 is a pre-commit scenario. | Verify commit followed by a lost acknowledgment, replay/reload, one result and one set of side effects. |
| 0.8 Report email | Edge source reads persisted history and uses a sitting-level provider idempotency key. The candidate requires assigned BR before fetching outcomes. | Approved Edge deployment and controlled delivery proof for close-out, first release, remount and retry. |
| 0.9 Old URLs | Route fixtures cover old owner/non-owner gates, history redirect and resume-only summary. | Current test-account sample of valid history and resume-only IDs, including protected LR. |
| 0.10 Resume identity | `open_section_sitting_v1`, `sectionCloseout.ts`, `drillResumeSession.ts`, `practiceSectionAttempts.ts` and `Drill.tsx` bind account records and pending saves to a sitting. | Real interrupted adoption, concurrent tabs, and two separate database connections. |
| 0.11 Pre-release exposure | Standard history and analytics use metadata-first reads. The approved plan records legacy journal and attempt write timing. | Compare actual ordinary request payloads before and after BR and PT completion. Decide whether direct table enforcement and remaining journal/TA readers belong in this PR. |
| 0.12 History readers | Shared release gate covers history, attempts list, first-answer analytics, teacher analytics and Recent Performance. Drill History gates protected LR and RC attempts by persisted completion. | Confirm browser request scopes and direct-access policies on the deployed candidate under each role. |
| 0.13 Assignment ownership | The checked-in close-out RPC scopes homework to the signed-in owner and checks membership of frozen question IDs in the assignment. | Verify the actual deployed definition and forged input behavior against an approved disposable database. |

Legacy first-pass grade is supplied by the existing browser bank and persisted by the standalone writer. The protected writer computes the stored totals from checkpoint and frozen section state. Both paths use the saved credited answer to grade later blind review through its own RPC where applicable. Source inspection and mocks establish the application paths. Phase 0 remains open until the actual deployed definitions, grants, counts, and role evidence are captured.

For isolated verification after authorization, use `scripts/verification/sections-post-section-rebuild-sql.mjs --with-reconciliation-proposal --with-blind-review-qids-proposal` and `scripts/verification/standalone-timed-writer.mjs --sections-conformance` with a disposable PGlite module. The protected overtime comparison should fail before applying the proposal. Repeat with `--apply-overtime-proposal` to confirm the real persisted fields, totals and diagnosis match. Use a separate two-connection PostgreSQL fixture for actual races.

Local gate results for the round-three worktree:

- Production build and Edge function typecheck passed. The four-worker full suite ran 787 files. All 21 failing files were on the recorded baseline. No new failure file remained.
- The changed-file suite passed 219 tests in 28 files. The final first-answer and resume follow-up passed 32 tests in three files, including the regression where a parent had a complete status and no persisted completion timestamp.
- The signed-in browser reached the legacy saved report. Four widths (375, 500, 768 and 1440 px) in both themes showed all four measured actions in bounds and zero horizontal page overflow. The 500 px check used viewport width. The desktop sidecar and completed protected LR route still need proof.
- The database fixtures and SQL proposals passed source or syntax review only. The managed database, GitHub branch, and production deployment were untouched. The unrelated MCP worktree change was left in place.
