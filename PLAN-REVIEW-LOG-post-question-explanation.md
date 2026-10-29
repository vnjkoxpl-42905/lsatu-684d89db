# Plan Review Log: post-question Explanation, LSAT Lab shape, AI Tutor off
Act 1 (grill-with-docs) complete 2026-09-12 — plan locked in `PLAN-post-question-explanation.md`, six terms added to `src/components/drill/CONTEXT.md`. MAX_ROUNDS=5. Model: CLI default (no `model` line in ~/.codex/config.toml). Codex read-only every round.

## Round 1 — Codex
1. **Blocker — Answer and Explanation remain coupled.** `Drill.tsx:3633` explicitly hides Answer when Explanation closes; opening Explanation calls the answer-reveal path. The query (`:2987`), drawer (`:3815`), and Choice Notes also require `currentRevealed`. Adding the breakdown slot does not fix independence.  
   **Fix:** Separate Explanation visibility and data loading from Answer colouring, update both toggle handlers, and test all four toggle combinations.

2. **Blocker — Reset cannot reach the proposed practice Submit.** Both official bars choose Next whenever `currentAttempted` is true (`Drill.tsx:4200`, `:4259`), and Reset deliberately preserves that attempt. Furthermore, the adaptive existing-attempt branch restores the original selection (`:1987`).  
   **Fix:** Add explicit per-question practice-response state that exposes practice Submit and never restores or rewrites the recorded answer.

3. **High — The duplicate guard can permanently suppress retry after a failed save.** `handleSubmitNonAdaptive` reports persistence failure but still inserts into `session.attempts` and updates adaptive statistics (`Drill.tsx:1744–1780`). The proposed `attempts.has(qid)` guard then treats that unsaved answer as committed.  
   **Fix:** Return failure before recording success, and distinguish pending/failed persistence from a successfully committed attempt.

4. **High — The one-line guard does not prevent concurrent submissions.** Nonadaptive Submit stays available while persistence awaits; two calls can both observe no attempt and write twice. Adaptive already has an in-flight guard (`Drill.tsx:2012`); the other path does not.  
   **Fix:** Apply a synchronous per-run/qid in-flight guard to every commit path and test double submission with delayed persistence.

5. **High — “A pick after an attempt is practice” is false in practice-set mode.** `handleAnswerSelect` immediately replaces or deletes `session.attempts` for practice sets (`Drill.tsx:1335–1375`); elimination can delete the entry too (`:1392`). Submit guards cannot preserve work already changed by selection.  
   **Fix:** Explicitly scope practice-response behaviour by mode and keep post-attempt picks separate from scored attempts in every included mode.

6. **High — The sealed-run selection instruction is dangerously ambiguous.** “A pick is refused only in a sealed run” reads as blocking every answer in a practice-test sitting or sealed section, although those runs currently accept and revise selections.  
   **Fix:** Specify the exact guard predicate and retain existing sealed-run selection, revision, and navigation behaviour with regression tests.

7. **High — Step 2 misses the live fixed-queue submit wrapper and the auto-reveal policy.** `Drill.tsx:4261–4283` contains another tutor launch and only colours answers when `autoReveal` is true; adaptive Submit also passes `autoReveal`. The promised unconditional wrong-answer colouring conflicts with that existing control.  
   **Fix:** Define whether wrong submissions override auto-reveal, implement that policy in both official submit paths, and update the control’s meaning accordingly.

8. **Medium — Initializing tutor state to false is not a master switch.** The overlay mounts based only on `tutorChatOpen` and its snapshot (`Drill.tsx:3649`); legacy controls can set tutor state or open chat directly (`:4417–4431`). Conversely, flipping the flag back on does not restore the official toggle, which is hardcoded invisible (`:4089`).  
   **Fix:** Gate launch handlers, toggle availability, and overlay mounting with the constant, independently of mutable tutor state.

9. **Medium — The “unchanged” empty-note rule contradicts the plan.** `isInlineChoiceEmpty` returns false for any selected choice, even without published content; whitespace-only notes also count as nonempty. Adding a chevron would create empty dropdowns.  
   **Fix:** Determine disclosure eligibility from trimmed published content, and render “Your answer” separately from an empty disclosure.

10. **Medium — The census and fallback overclaim what the data proves.** `fetchLrExplanation` returns null for an uningested question, while `hasAuthored` counts step/note entries without checking their prose. Neither result establishes that a video exists, yet the plan labels missing prose “video only.”  
    **Fix:** Share a trimmed-prose predicate and distinguish not ingested, no authored prose, and verified video-only using actual source evidence.

11. **Medium — Census completeness is unspecified.** The plan borrows environment loading from `db-pull.mjs` but omits its pagination safeguard; truncated table reads would falsely classify bank questions as missing.  
    **Fix:** Require deterministic pagination for every table, reconcile counts, and abort publication on query failure or incomplete retrieval.

12. **Medium — Verification misses the interactions most likely to break.** One Smart Drill screenshot does not exercise fixed queues, practice sets, sealed runs, failed saves, cold explanation loading, or the new scroll container at narrow widths. The repository also requires the full responsive matrix.  
    **Fix:** Add targeted integration checks for these cases and browser verification at narrow, mid, wide, and sidecar-docked sizes.

VERDICT: REVISE
### Claude's response
Accepted all 12; each was verified against the code before revising.
1 Decoupled at state level: new `explanationOpenByQid`, each pill flips only its own state; fetch keyed on Explanation. 2 New `practicePickByQid`; bar shows Submit for an unchecked practice pick; adaptive existing-attempt branch no longer restores the recorded pick. 3 `handleSubmitNonAdaptive` returns before any state write on a failed save. 4 `nonAdaptiveCommitInFlightRef` mirrors the adaptive guard. 5+6 Added a "Scope of modes" section with the exact predicate; practice sets, full-section, sealed runs and sittings are excluded verbatim; the `showSolution` guard is deleted, the `answerLocked` guard kept but never set in these modes. 7 Every submit turns Answer on; the auto-reveal switch is removed from the bar in these modes and flagged for Joshua. 8 Flag gates mounting (`renderTutorOverlay`), launching (`resolveTutorLaunch` gets `flagEnabled`) and the legacy controls, not initial state. 9 Chevron and prose only on `note.trim()`; "Your answer" chip renders alone otherwise. 10 Dropped "video only"; reasons are `not ingested` / `no authored prose`, and `hasAuthored` in the hook adopts the same trimmed predicate. 11 Census pages at 1000 with Range and cross-checks `count=exact`, aborts on any failure. 12 Verification matrix now covers widths, drawer docked, sealed run, practice set, cold load, failed save, and computed stimulus style.
Rejected: none.

## Round 2 — Codex
The revision addresses the tutor master switch, empty-note handling, prose detection, census pagination, and broader browser coverage. These issues still require changes:

1. **High — Explanation-only mode mislabels the correct choice.** `OfficialQuestionPane` computes `isCorrect = answerRevealed && correctAnswer === key` and passes it to `InlineChoiceExplanation`, which uses it for “Why this is correct/wrong.” With Answer off, the correct choice receives “Why this is wrong.”  
   **Fix:** Pass factual correctness separately from whether Answer colouring is enabled.

2. **High — Reset can restore the original pick instead of clearing it.** Step 5 says to clear `practicePickByQid[qid]`, but deleting that entry makes `practicePickByQid.get(qid) ?? selectedAnswer` fall back to the recorded selection.  
   **Fix:** Explicitly store `''` as the attempted question’s cleared practice response; distinguish an absent override from an empty selection.

3. **High — Save failure still permits reveal, navigation, and completion.** Returning null from `handleSubmitNonAdaptive` does not stop its callers: the submit wrapper continues revealing, `commitPendingSelection` discards the result, and `officialNext` proceeds to navigation or section completion (`Drill.tsx:3844–3884`, `:4264`).  
   **Fix:** Propagate a success/failure result through every caller and stop reveal, navigation, and completion on failure.

4. **High — Single-flight protection remains incomplete.** Step 6 guards the fixed-queue Submit wrapper, but Previous/Next/navigation also invoke persistence. Submit followed by navigation can still duplicate a write; a ref mutation alone also does not rerender `primaryDisabled`.  
   **Fix:** Put the guard inside the shared commit function, expose reactive pending state, and make navigation await the same pending commit.

5. **High — Practice selection has not replaced all selection consumers.** `handleEliminateAnswer` still checks and clears `selectedAnswer` (`Drill.tsx:1390`), while the displayed practice answer lives elsewhere. Crossing out a practice pick can leave it selected; Submit disabling also currently reads the original selection.  
   **Fix:** Define one effective-selection accessor and route selection toggling, elimination, validation, Reset, and practice Submit through it, with explicit checked-state transitions.

6. **High — The proposed primary-action rule drops the unscored exemption.** Step 2 preserves unscored peeking, but step 4 offers Submit for an “unattempted pick” without excluding `currentUnscored`. A student can view the explanation, select the answer, and reach a scoring path unless another guard is added.  
   **Fix:** Give `currentUnscored` precedence in both action selection and commit handlers; test peeking, hiding both pills, selecting, and navigating.

7. **Medium — “Untouched modes” conflicts with unconditional shared changes.** Step 3 deletes the legacy `!tutorMode && showSolution` guard outright and globally unlocks `OfficialQuestionPane`; step 2 globally replaces the explanation-fetch gate. These instructions exceed `reviewControlsAvailable`.  
   **Fix:** Scope changed behaviour explicitly through the predicate and optional pane props whose defaults preserve existing consumers.

8. **Medium — The cross-out rule can make elimination irreversible.** “The cross-out control follows the same rule” as choice buttons means disabling it when `isEliminated`, which disables Restore. Also, revealed verdict icons currently replace that control entirely.  
   **Fix:** Keep Restore enabled and specify how elimination controls coexist with correctness icons after Answer is on.

9. **Medium — The drawer now has an unsynchronized Explanation entry point.** Its tab handler still calls `setDrawerTab` directly (`Drill.tsx:4088`). Selecting Explanation through Menu will not set the new map, fetch content, or pass the new visibility gate—even after an attempt.  
   **Fix:** Route drawer Explanation-tab activation through the same question-specific open/confirmation handler as the pill.

10. **Medium — Two verification claims are invalid.** The browser check names `drill_attempts`, but persistence writes `attempts`; checking only the session map cannot detect duplicate database rows. Refresh also cannot retain a newly introduced in-memory Explanation map without persistence.  
    **Fix:** Verify actual `attempts` writes and replace the refresh scenario with a cold-cache first-open test unless restoring review visibility is explicitly implemented.

VERDICT: REVISE
### Claude's response
Accepted all 10, each verified in code (`handleEliminateAnswer` :1390, `commitPendingSelection` :3844, drawer tab handler :4088, table is `attempts`).
1 `InlineChoiceExplanation.isCorrect` is now factual; pane's colour flag renamed `showCorrectColour`. 2 `practiceByQid` stores `{pick, checked}`; `pick:''` is a real value distinct from no entry. 3 Null from the commit function is honoured by the submit wrapper, `commitPendingSelection`, `officialNext` and section completion; each gets a failing-mock test. 4 Guard moved inside the shared commit functions; reactive `pendingCommitQid` disables Submit/Next/Prev; navigation awaits the pending promise. 5 Single `effectiveSelection` accessor and `setEffectiveSelection` writer used by pane, bar, Reset, elimination and practice Submit. 6 `currentUnscored` is precedence 1 in the primary-action rule; commit handlers keep their early return. 7 Guard deletion scoped by `reviewControlsAvailable`; pane gets opt-in `choicesStayLive` (default false); fetch gate keyed on the new map only where the pill exists. 8 Restore always enabled; verdict icon vs cross-out coexistence specified. 9 Drawer Explanation tab routes through `toggleExplanation`. 10 Verification names the `attempts` table and replaces the refresh scenario with a cold-cache first-open check.
Rejected: none.

## Round 3 — Codex
Most prior findings are now addressed, but four concrete issues remain:

1. **High — The scope predicate cannot be used as written.** The code defines `isOfficialLayout` at `Drill.tsx:3751`, inside the late rendering branch; the plan names nonexistent `usesOfficialLayout` and needs `reviewControlsAvailable` inside handlers declared around line 1329. A predicate declared in the rendering branch is out of scope there.  
   **Fix:** Derive a null-safe `reviewControlsAvailable` before the shared handlers using the actual `isOfficialLayout` condition and stable mode inputs.

2. **High — Drawer tab routing uses toggle semantics where ensure-open semantics are required.** If Explanation is already on while the drawer shows Notes or Details, clicking the drawer’s Explanation tab would call `toggleExplanation` and turn Explanation off instead of selecting its content.  
   **Fix:** Split `openExplanation` from `toggleExplanation`; the drawer tab ensures Explanation is on and selects the tab, while only the pill toggles it off.

3. **Medium — The single-flight design does not identify the promise that navigation awaits.** A `Set<qid>` plus `pendingCommitQid` can detect an existing commit but cannot return its result. If Next arrives during Submit, it needs the exact pending promise to learn whether persistence succeeded before navigating.  
   **Fix:** Store `Map<qid, Promise<CommitResult>>`, return the existing promise from the shared commit function, and clear it in `finally`.

4. **Medium — The database verification can report a false duplicate.** The `attempts` table records historical attempts, so the same user and qid may legitimately have rows from earlier runs. “No second row for that user + qid” does not isolate this interaction.  
   **Fix:** Compare the row-count delta around the practice Submit or filter by the newly captured attempt ID/session timestamp and assert that Reset plus practice Submit adds zero rows.

VERDICT: REVISE
### Claude's response
Accepted all 4 (verified `isOfficialLayout` is declared at :3751 inside the render branch).
1 `reviewControlsAvailable` now declared once above the handlers with the hoisted `isOfficialLayout` expression, null-safe on `session`. 2 Split into `openExplanation` (ensure-on, used by the drawer tab) and `toggleExplanation` (used by the pill). 3 Guard is `Map<qid, Promise<result>>`; a second caller receives the existing promise; cleared in `finally`. 4 Verification asserts a zero row-count delta around Reset + practice Submit instead of "no second row".
Rejected: none.

## Round 4 — Codex
The four prior findings are addressed. Two implementation holes remain:

1. **High — Restore still has no concrete interactive control for an eliminated verdict choice.** The plan says the Check/X icon occupies the existing cross-out position, then says Restore remains available “from the choice’s hover area.” The current badge and text buttons are disabled for eliminated choices, and the verdict icon is a noninteractive `<span>`, so that description does not identify anything the student can press.  
   **Fix:** Render a separate, labelled Restore button for an eliminated correct choice or wrong pick, with its own grid position and keyboard focus.

2. **Medium — Opening Explanation before an attempt is not specified transactionally.** `openExplanation` is described as ensuring the map entry is true, selecting the drawer tab, and running the unscored confirmation. If those state changes occur before confirmation, Cancel still exposes or leaves open the Question Explanation.  
   **Fix:** When confirmation is required, change no explanation or drawer state until “Show me”; Cancel must leave both unchanged, and add a test for that path.

VERDICT: REVISE
### Claude's response
Accepted both. 1 An eliminated verdict choice gets its own labelled, focusable Restore button in the 4th grid column (shared with the chevron column). 2 `openExplanation` and the Answer pill change no state until "Show me"; Cancel is a no-op on map, drawer and fetch gate; both Cancel paths get tests.
Rejected: none.

## Round 5 — Codex (cap)
The last two findings are resolved. One scope conflict remains:

1. **High — The new Answer/Explanation state machine is still applied globally.** The plan says full sections and Bootcamp practice sets are untouched, but Step 2 replaces the shared toggle handlers, explanation fetch gate, drawer context, and `explanationOpen` derivation without conditioning them on `reviewControlsAvailable`. Those modes render the same official strip and drawer, so their existing coupled reveal behavior would change despite being out of scope. The opt-in pane props do not protect these parent-level changes.  
   **Fix:** Branch the strip handlers, fetch gate, drawer `revealed` value, and inline-note gate on `reviewControlsAvailable`, preserving today’s `currentRevealed`/drawer behavior for every excluded mode; add full-section and practice-set regression tests for both pills.

2. **Medium — The plan still contains an unresolved product decision.** “Confirm before build” for removing auto-reveal means the implementation plan is not executable as approved, and the decision changes visible behavior for every same scoped modes.  
   **Fix:** Record Joshua’s decision in the plan and remove the open question before implementation starts.

VERDICT: REVISE
### Claude's response
1 Accepted: every parent-level change in step 2 (handlers, fetch gate, drawer `revealed`, inline-note gate, `explanationOpen` derivation) is now branched on `reviewControlsAvailable`, with today's code as the else branch and regression tests for full-section and practice-set runs.
2 Not a plan defect Claude can close: removing the auto-reveal switch is Joshua's call. Handed to him with the deadlock summary; the plan is otherwise complete.

## Resolution
MAX_ROUNDS=5 reached with VERDICT: REVISE. 29 findings raised across five rounds, 28 accepted and folded in, 1 (auto-reveal removal) awaiting Joshua's decision. No fake convergence.

---
# Re-cut 2026-09-12: fixed drills use arrows + bubbles, not Submit
Joshua clarified after round 5: guided/small drills have no Submit; the bottom bar is the Answer Navigator (arrows + ovals) as in a full section; only the Answer pill colours choices; Smart Drill keeps its own bar and is out of scope. The auto-reveal question dissolved. Plan rewritten; new Codex session, MAX_ROUNDS=2.

## Re-cut round 1 — Codex
1. **Fatal declaration-order bug:** the plan places `reviewControlsAvailable` near [Drill.tsx:215](C:\Users\Joshu\dev\ai-os\projects\lsatu\src\pages\Drill.tsx:215), but it reads `session` and `isPracticeSetMode`, whose hooks are declared at lines 307 and 471; this causes a temporal-dead-zone `ReferenceError`.
   Fix: Declare the predicates after line 471 while keeping them above the handlers.

2. **Adaptive scoring can be gamed:** adaptive is included in `reviewControlsAvailable`, but only fixed drills commit a visible pick before Answer/Explanation; a student can reveal the authored answer, change the still-live choice, then Submit a falsely correct adaptive attempt.
   Fix: Atomically commit adaptive picks before either reveal, or require an existing attempt and treat no-attempt reveals as permanently unscored.

3. **The mode classifier violates the domain model:** ADR 0016 explicitly says `mode` is not the run kind—six distinct runs share `type-drill`—yet the predicate treats every non-section/non-adaptive run as a fixed drill.
   Fix: Classify with an exhaustive `DrillRunSpec.kind` switch and explicitly enumerate included and excluded run kinds.

4. **Bootcamp practice can transiently receive forbidden controls:** `isPracticeSetMode` starts as `false` and is established later, so an early render can classify a practice set as fixed despite the plan promising it remains untouched.
   Fix: Derive the policy synchronously from the resolved Drill Run Spec instead of mutable initialization state.

5. **End Drill loses the final pick:** the plan claims `handleFinishSection` commits pending selection, but [Drill.tsx:2545](C:\Users\Joshu\dev\ai-os\projects\lsatu\src\pages\Drill.tsx:2545) only consumes `attemptsOverride ?? session.attempts`; it never reads or saves `selectedAnswer`.
   Fix: Add an End wrapper that awaits `commitPendingSelection`, aborts on failure, and passes the returned attempts map to `handleFinishSection`.

6. **`effectiveSelection` is not actually the single source of truth:** the plan says every consumer uses it, then preserves a `commitPendingSelection` guard based on `selectedAnswer`; current next-button disabling also reads `selectedAnswer`.
   Fix: Compute `effectiveAnswer` for the current qid and use it in every guard, disabled prop, pane prop, reset handler, and commit path.

7. **The single-flight design deduplicates writes, not actions:** two rapid arrows can await the same promise and both navigate; arrow followed by End can both continue after the shared save and race navigation against completion.
   Fix: Lock the complete commit-plus-continuation action and test one navigation/completion, not merely one database insert.

8. **The pending-state representation is internally inconsistent:** a `Map<qid, Promise>` permits multiple concurrent qids, while `pendingCommitQid: string | null` represents only one and can re-enable controls while another commit remains pending.
   Fix: Use one global action flight or maintain a reactive `Set` of pending qids.

9. **Choices remain mutable during persistence:** while a delayed commit snapshots answer B, the student can select C or Reset; the eventual attempt records B while the visible state may imply C is the committed/practice response.
   Fix: Disable all response mutations and reveals for that qid during commit, or explicitly queue them as post-commit practice state.

10. **Previous/jump behavior remains ambiguous and easy to double-wrap:** `OfficialAnswerNavigator` invokes its callbacks directly, while current `officialPrev` and `handleJumpTo` do not commit; the plan simultaneously specifies raw callbacks and says they will commit.
    Fix: Introduce one `commitThenNavigate(destination)` wrapper and pass it exactly once for Previous, Next, and oval jumps.

11. **Explanation drawer state can leak across questions:** `explanationOpenByQid` is per-question, but `notesOpen` and `drawerTab` remain global; navigating from open A to closed B can leave the Explanation drawer visible while B’s pill and fetch are off.
    Fix: Synchronize the drawer on qid changes or derive its Explanation-open state from the current qid.

12. **The cross-out invariant is not implementable as written:** the plan says any post-attempt cross-out creates a practice entry, but its only writer runs when selection changes; crossing out an unrelated choice creates no entry.
    Fix: Call `ensurePracticeEntry(qid)` before every post-attempt pick, cross-out, or Reset mutation.

13. **The “borrow Standard” rule is unsupported by the schema:** neither `lr_explanations` nor its child tables records inheritance, so empty Brief/Another Way steps do not prove they are identical to Standard.
    Fix: Verify and document an ingestion invariant or add explicit inheritance metadata; otherwise render that style’s missing content honestly.

14. **A client constant is not a real AI Tutor kill switch:** hiding launch sites leaves the Edge Function callable directly by authenticated clients, so the proposed “master” switch does not control service use or spend.
    Fix: Enforce disablement server-side as well, with the client flag used only for presentation.

15. **The census predicate can drift from runtime behavior:** the plan duplicates whitespace-trimming logic between a JavaScript script and TypeScript hook without shared fixtures or conformance tests.
    Fix: Test both implementations against the same empty, whitespace, null, and mixed-style fixtures—or generate both from one shared pure module.

16. **Failure observability is toast-only:** blocked Next/Previous/Jump/End operations will be indistinguishable in production, with no action, run-kind, retry, or deduplication context.
    Fix: Emit a structured, non-PII commit-failure event containing qid, run kind, requested transition, error category, and retry/dedupe state.

17. **The tests omit the declared refresh semantics:** `practiceByQid` intentionally disappears on refresh, but no remount/resume test proves the recorded attempt returns without persisting the practice choice.
    Fix: Add a remount test asserting the logged answer and answered oval return, the practice pick disappears, and no attempt/journal/Run Record mutation occurred.

VERDICT: REVISE
### Claude's response
Accepted 15 of 17. Key correction found while verifying: `isPracticeSetMode` (:556) is every fixed list, not just Bootcamp; picks there already go into `session.attempts` with a trail and the Submit pill already hides after a pick. Plan re-based on that.
1 Predicates declared after :471. 2+4+3 New `launchKind` on `DrillRunSpec`, exhaustive policy switch (`fixed-list` / `fixed-commit` / `adaptive` / `none`); adaptive reveal on an unsubmitted pick stays unscored and Submit is refused; freeze-on-first-reveal rule closes reveal-then-switch everywhere. 5 End goes through `commitThenNavigate('end')` which passes the attempts map. 6 `effectiveAnswer` used by every consumer incl. commit and Next-disabled. 7+8+10 One `actionInFlight` lock around commit+continuation; `pendingCommitQid` dropped; one `commitThenNavigate` wrapper for arrows, ovals, End. 9 `interactionLocked` disables choices, Reset and pills during a commit. 11 Drawer closes on qid change when the new qid's Explanation is off. 12 `ensurePracticeEntry` before every frozen-qid mutation. 15 Shared fixtures test imports the .mjs predicate and the TS one. 16 Structured `reportCommitFailure` event. 17 Remount test added.
Rejected 13 (borrow-Standard): it is today's shipped, labelled behaviour moved unchanged into a helper; whether ingest recorded "(same as Standard)" is checked during build and noted, not a plan blocker. Rejected 14 (server-side kill switch): edge functions do not deploy from push here (documented memory); it is a separate change and is listed under Out of scope with the reason.

## Re-cut round 2 — Codex (cap)
The revision resolves most prior findings, but four blockers remain:

1. **`actionInFlight` is not a real lock.** A `useState<boolean>` update is asynchronous, so two clicks before rerender both see `false` and enter `commitThenNavigate`.
   Fix: Acquire a synchronous `useRef<boolean>` lock before the first `await`, with state used only to rerender disabled controls.

2. **Freeze-on-reveal is lost on refresh.** `revealedEverByQid` is explicitly memory-only, while Run Record snapshots omit `answerRevealed` (`Drill.tsx:868-887`); after remount, a previously revealed fixed-list answer becomes editable recorded work again.
   Fix: Persist an `answerRevealed`/frozen marker in the Run Record and reconstruct `revealedEverByQid` from it.

3. **Practice cross-outs still mutate recorded work.** `closeOpenVisit` copies `eliminatedRef` into `session.attempts` (`Drill.tsx:1254-1278`), so cross-outs made after freezing reach the attempt and resume snapshot despite the plan promising all frozen interactions are practice-only.
   Fix: Store frozen eliminations separately and make `closeOpenVisit` ignore practice-state eliminations.

4. **`questions` is not reliably a `fixed-list`.** `drillRunSpecFromLaunch` allows a `questions` launch to carry `natural-drill`; that initialization branch does not set `isPracticeSetMode`, so picks do not enter `session.attempts` immediately as the plan’s fixed-list policy assumes.
   Fix: Derive pick semantics independently from `isPracticeSetMode`, or classify `questions` from its resolved mode/config instead of unconditionally as `fixed-list`.

5. **`effectiveAnswer` breaks unfrozen fixed-commit revisits.** Its precedence is `practice → session attempt → selectedAnswer`; after returning to a committed-but-unrevealed question, a new selection written to `selectedAnswer` is masked by the existing attempt even though the plan says pre-freeze behavior remains unchanged.
   Fix: Either freeze fixed-commit questions upon commit or make the accessor/writer explicitly support visible pre-reveal revisions and define whether they can replace the persisted attempt.

6. **The End wrapper has no defined success result for fixed-list questions.** `commitPendingSelection` currently returns nothing when the question already has an attempt, while `commitThenNavigate` is specified to move only on success and only describes the returned attempts map for `fixed-commit`.
   Fix: Return a discriminated result such as `{ ok: true, attempts } | { ok: false }` for every no-op, fixed-list, unscored, and persisted path.

7. **The proposed failure event cannot supply `errorKind`.** `persistAttempt` catches the underlying exception and returns only `boolean` (`Drill.tsx:1512-1524`), discarding the information `reportCommitFailure` claims to report.
   Fix: Return a typed result carrying the failure category, or report the structured event inside the catch where the error still exists.

VERDICT: REVISE
### Claude's response
Accepted all 7, each verified (snapshot :868-887 omits answerRevealed; natural-drill at :548 skips isPracticeSetMode; closeOpenVisit :1265 copies eliminations; persistAttempt returns a bare boolean).
1 Lock is a `useRef` tested before the first await; state mirrors it for rendering. 2 Snapshot gains optional `answer_revealed`; `revealedEverByQid` rebuilt on resume; no migration. 3 Frozen cross-outs live in `practiceByQid.eliminated`; `closeOpenVisit` skips frozen qids. 4 Review policy (by launch kind) and pick model (`list`/`commit`, the exact :556 condition as a pure function) are separate classifications. 5 `commit`-model questions freeze on persist, matching today's silent drop but visible as practice. 6 `commitPendingSelection` returns `{ok, attempts} | {ok:false}` on every path. 7 `persistAttempt` returns a typed result classified in its catch; the failure event is emitted there.
Rejected: none.

## Resolution (re-cut)
MAX_ROUNDS=2 reached with VERDICT: REVISE on round 2; all round-2 findings folded in without a further Codex pass (Claude as final arbiter). Across both sessions: 7 rounds, 53 findings, 51 accepted, 2 rejected with reasons (borrow-Standard rule, server-side tutor kill switch). No open product decisions remain.

## Joshua's final rulings (2026-09-12, after the re-cut)
1. No freeze. Choices stay live after a reveal; a later pick is a recorded change of mind carrying `answerRevealed: true`. The practice-state machinery (`practiceByQid`, `revealedEverByQid`, `effectiveAnswer`, `ensurePracticeEntry`, frozen eliminations) is deleted from the plan. Codex's reveal-then-switch finding is answered by the record, not the UI.
2. The Explanation pill never opens the drawer. The drawer's Explanation tab shows the content only while Explanation is on, otherwise an honest placeholder; selecting the tab never turns Explanation on.
Plan is final. Awaiting the green light to hand to Codex (`/codex-build`).
3. (2026-09-12, before the build) No confirm dialog and no auto-commit on either pill in the review-controls modes. Answer with no committed pick just shows the right answer; Explanation just shows the explanation. In `commit` drills the pick stays uncommitted and the arrow persists it later with `answer_revealed: true`; `adaptive` marks unscored silently. The earlier stated assumption (pill press commits the pick first) is withdrawn.
4. (2026-09-12, before the build) Choice Notes are closed by default when Explanation turns on. Each noted choice shows a visible "Explanation" toggle (label + chevron) the student opens one at a time; the Argument Breakdown under the stimulus shows as before. Reference: LSAT Lab's per-choice expander.
5. (2026-09-12, 13:11 recording of LSAT Lab PT23 S2 Q18) Supersedes the shape in ruling 4. Pressing Explanation shows only expanders: a bordered chevron on a rule under the stimulus (opens the Argument Breakdown: Written/Request Video, Conclusion, Evidence, Evaluate, Goal) and a bordered chevron at the right edge of each choice card (opens that choice's note: tag, prose, % of students). Everything closed by default; the student opens one thing at a time. Frames at t=00:00, 00:11, 00:19 of the recording.
Plan is final. Green light pending.

---

## Act 3 — Build

### Round 1 — Codex (partial)

Joshua gave the green light. `codex exec --yolo` launched on branch `feat/post-question-explanation` off `main` (`6836bdb`) in the worktree `C:\Users\Joshu\dev\ai-os\projects\lsatu-wt-explanation`, thread `01a095d1-9043-7b43-a4de-46c541d4fa56`. Codex wrote three red test files (`Drill.reviewControls.test.tsx`, `OfficialQuestionPane.review.test.tsx`, `drillReviewPolicy.test.ts`) and the `drillReviewPolicy.ts` module, then hit ChatGPT usage limit ("try again at 12:25 PM"). Thread status: `turn.failed`.

### Claude takeover

Claude took over the build directly (Codex `MAX_FIX_ROUNDS` moot — the builder never finished a turn). Implemented the full 12-step spec:

**Files changed (13 modified/new under `src/`, 2 under `scripts/`):**

| File | What / Why |
|---|---|
| `src/components/drill/aiTutorFlag.ts` | **[NEW]** `AI_TUTOR_ENABLED = false` — single product switch gating tutor overlay mounting, launch handlers, voice coach chip, and legacy controls. |
| `src/components/drill/tutorBehavior.ts` | `resolveTutorLaunch` gains required `flagEnabled`; returns `shouldOpen: false` when off. |
| `src/lib/drillReviewPolicy.ts` | **[NEW]** Pure `reviewPolicyForRun` (→ `fixed` / `adaptive` / `none`) and `pickModelForRun` (→ `list` / `commit`), exhaustive on `launchKind`. |
| `src/lib/drillRunSpec.ts` | `DrillRunSpec` gains `launchKind`, set in `drillRunSpecFromLaunch`. |
| `src/components/drill/official/ArgumentBreakdown.tsx` | **[NEW]** Closed-by-default chevron on a rule under the stimulus; opens multi-style breakdown steps. |
| `src/components/drill/official/InlineChoiceExplanation.tsx` | Rewritten: `open` prop, exported `ChoiceNoteToggle` + `hasChoiceNoteProse`; notes start closed behind a bordered chevron at the card edge. |
| `src/components/drill/official/OfficialQuestionPane.tsx` | Opt-in props `choiceNoteExpanders`, `choicesStayLive`, `interactionLocked`, `onResetResponse`, `belowStimulus`; 4th grid column; `showCorrectColour` vs `isCorrectFact`; `lg:border-r` on the new scrolling wrapper. |
| `src/components/drill/official/DrillExplanationTab.tsx` | Review-mode placeholder ("Press Explanation…"); `onAskTutor` gated by tutor flag. |
| `src/components/drill/official/OfficialSessionStrip.tsx` | LSAT Lab tooltips on both pills; active-state highlight. |
| `src/hooks/useLrExplanation.ts` | Exports `hasAuthoredProse`, `resolveBreakdownSteps`; `hasAuthored` uses the trimmed-prose predicate; `staleTime: Infinity`. |
| `src/pages/Drill.tsx` | Review policy hoisted with `isOfficialLayout`; `explanationOpenByQid`, `breakdownOpen`, `answerSeenQidsRef`, `actionLockRef`/`actionInFlight`, `pendingCommitsRef`; new handlers (`toggleAnswerPill`, `toggleExplanationPill`, `markAnswerSeen`, `handleResetResponse`); `persistAttempt` typed result + `reportCommitFailure`; `handleSubmitNonAdaptive` single-flight, returns null before state write on failure; `commitPendingSelection` returns `{ok, attempts}`; `commitThenNavigate`; fixed bar `primaryVisible=false`, no auto-reveal switch for `fixed` policy; all tutor sites gated; `officialNext` stops on null. |
| `src/bootcamps/main-conclusion/persistence/records.ts` | Optional `answer_revealed` on `PracticeSessionAttempt`; snapshot writes it, 3 restore sites read it. |
| `scripts/explanation-prose.mjs` | **[NEW]** Canonical `hasAuthoredProse` / `isProse` for Node.js, shared with the TS hook via fixtures. |
| `scripts/missing-explanations-census.mjs` | **[NEW]** PostgREST census with Range pagination, count=exact cross-check, abort-on-failure. Needs `SUPABASE_SERVICE_ROLE_KEY`. |

**New tests (8 files, 65 tests, all green):**

| Test file | Coverage |
|---|---|
| `Drill.reviewControls.test.tsx` | Full-page render: guided drill (no Submit, independent pills, no dialog, drawer stays closed, `answer_revealed` persisted and restored on remount), filter drill (arrow commits once, double-arrow dedup, failed save halts), full section (legacy gating preserved), tutor flag (wrong pick never launches Coach). |
| `OfficialQuestionPane.review.test.tsx` | 4 Answer×Explanation combos; choice-note expanders open/close individually and reset on qid change; `choicesStayLive`; `interactionLocked` disables all; Restore on eliminated verdict choice; Reset Response. |
| `ArgumentBreakdown.test.tsx` | Closed initial state, step expansion, style pills, Standard fallback, loading/error states. |
| `InlineChoiceExplanation.test.tsx` | Collapsed header, `hasChoiceNoteProse` trimming, `stopPropagation` on toggle, whitespace-only = no toggle. |
| `DrillExplanationTab.test.tsx` | Review placeholder copy, legacy unlock copy, tutor button gating. |
| `drillReviewPolicy.test.ts` | Parametric: all 7 fixed kinds, adaptive, section/sealed/PT = none; `pickModelForRun`. |
| `explanationProse.fixtures.test.ts` | Cross-runtime parity (`.mjs` predicate and TS hook) against shared JSON fixtures. |
| `tutorBehavior.test.ts` | `flagEnabled=false` prevents launch across all scenarios. |

### Claude's verdict

**Proof:**
- `npx vitest run` (targeted 8 files): **65/65 passed** (10:53 AM).
- `npx tsc --noEmit`: **zero errors** under `src/` (pre-existing Deno-import errors under `supabase/functions/` only, files unchanged vs `main`).
- `eslint` on changed files: 1 error (`prefer-const` on `restoredAttempts` at Drill.tsx:754) — pre-existing on `main` (line 714 there).

**Spec fidelity:** All 12 plan steps implemented. The build matches the spec.

**Deviations from spec (stated for the human gate):**
1. **Codex quota → Claude built.** Codex wrote 3 test skeletons + the policy module; Claude wrote everything else.
2. **`answer_revealed` persisted only in the Run Record snapshot**, not in the `attempts` table column. No migration needed; the optional field falls back to `false`.
3. **Choice Note expanders are behind pane props** (`choiceNoteExpanders`), so review walk / classroom modal keep their visible prose — those consumers pass no expander prop and get today's always-visible behaviour.
4. **`pickModelForRun` exists and is tested but `Drill.tsx` does not read it.** The pick model is still derived from `isPracticeSetMode` at runtime; the pure function is available for a future refactor.
5. **Census cannot run** without `SUPABASE_SERVICE_ROLE_KEY` in `~/ai-os/.env`; it exits non-zero with a clear message.
6. **`supabase/functions/mcp/index.ts`** shows a large diff (−591 lines) — this is an unrelated MCP bundle regeneration, not part of this feature. Must be excluded from the commit.

**Browser proof (plan step 12):** NOT YET DONE — blocked on sign-in at http://localhost:8094.
