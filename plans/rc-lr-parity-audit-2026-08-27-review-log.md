# Plan Review Log: RC player vs LR player parity audit

Started 2026-08-27 session. `MAX_ROUNDS=5`.
Plan under review: [rc-lr-parity-audit-2026-08-27.md](rc-lr-parity-audit-2026-08-27.md)
Critic: Codex CLI 0.146.0, model `gpt-5.6-sol`, reasoning effort `medium`, sandbox `read-only` every round.

`PLAN.md` at the repo root is a committed plan for a different feature and is explicitly excluded from this review.

---
## Round 1 — Codex

I’m using the review skill because this is a source-backed adversarial plan review. I’ll read the governing context, the full skill instructions, the specified plan, and the relevant RC/LR code paths before judging each claim.

The repository’s `review` skill is designed for diff-vs-fixed-point reviews, so its two-axis workflow does not fit this plan audit. I’m keeping its evidence-and-citation discipline but following your six requested axes directly; no files will be changed.

The first pass confirms A2 and A4, but A1 overstates database corruption: the reducer mutates the in-memory “first answer,” while existing persistence guards generally prevent overwriting the stored first-attempt row. I’m now tracing hydration, re-attempt persistence, responsive layout, and shared chrome because those expose larger dependencies than the plan acknowledges.

Recommendation: revise before implementation. The core review-state problems are real, but A1 overstates persistence corruption, A2’s fix is dangerously underspecified, and the plan misses several more serious state-restoration defects.

## 1. A1–A4

| Item | Judgment | Evidence |
|---|---|---|
| A1 | Real, but incorrectly characterized | The keyboard dispatches directly into the reducer at [RcPlayer.tsx:323](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:323), bypassing the guarded click path at [RcPlayer.tsx:579](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:579). It therefore changes the in-memory first pick during review or after reveal. It does **not normally overwrite the database first attempt**: attempts are insert-only at [rcProgress.ts:141](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/api/rcProgress.ts:141), and review/end-of-set navigation skips already recorded questions at [RcPlayer.tsx:283](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:283). |
| A2 | Real | Re-attempt mode hides `eliminated` at [RcQuestionPane.tsx:124](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/components/RcQuestionPane.tsx:124), while the eliminate button remains enabled through [RcChoiceRow.tsx:101](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/components/RcChoiceRow.tsx:101). |
| A3 | Real, but incomplete | Hydration restores no eliminations, and worse, loops through **all** attempts so every later review attempt overwrites the first answer in the `answers` map at [RcPlayer.tsx:166](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:166). A subsequent review can therefore label the prior re-attempt as the student’s “1st” answer. |
| A4 | Real, partly cosmetic | Pause is unconditionally offered at [RcPlayer.tsx:646](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:646), despite being removed from the review header. “Save and exit” versus “Exit” is wording, not a correctness bug. |

Fix A1: Rename it “keyboard mutates the displayed original answer,” then route keyboard selection through one guarded selector and test that both `selected` and persisted first-attempt data remain unchanged.

Fix A2: Add a separate `eliminationDisabled` prop; do not reuse `RcChoiceRow.disabled`, because that prop also disables answer selection and would make the blind re-attempt impossible.

Fix A3: Hydrate `answers`, eliminations, and review truth exclusively from `isFirstAttempt === true`; retain later attempts separately.

Fix A4: Make `onPause` optional, omit it in review, and treat the exit-label change as copy cleanup.

## 2. Selector closure and elimination dependencies

Routing keyboard selection through the same closure is correct only if the derivations are moved above the early returns. Adding `useCallback` near the current JSX would violate hook ordering because loading/error renders return at [RcPlayer.tsx:347](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:347), exactly the hazard already documented at [RcPlayer.tsx:385](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:385). Omitting that callback from the keyboard effect’s dependencies would instead create stale `revealed`, question, elimination, or re-attempt state.

Fix: Compute nullable `questionId`, `revealed`, and `reattemptMode` before the keyboard effect, create the guarded callback before every conditional return with complete dependencies, and have both UI and keyboard call it.

Disabling only elimination during re-attempt does not break a live non-review drill. Reusing the existing row-level `disabled` prop breaks blind review answer selection. A3 creates another dependency: restoring first-attempt eliminations and then passing them into the second `recordAttempt` at [RcPlayer.tsx:582](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:582) falsely attributes the first attempt’s cross-outs to the second attempt.

Fix: Keep display-only first-attempt eliminations separate from the elimination array recorded for a review re-attempt.

## 3. B1 type-scale risk

The proposed blanket 19px change is not ready:

- Passage text grows 11.8%, while stems and choices grow 18.75%.
- The `52ch` cap at [RcPassagePane.tsx:210](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/components/RcPassagePane.tsx:210) grows in pixels with the font. Its approximate character measure stays similar on wide screens, but fixed 53/47 columns will wrap substantially earlier before the cap is reached.
- RC’s 75–175% range produces 14.25–33.25px text after the change. At 150% and 175%, answer rows, disclosures, and the 47% question column need explicit validation.
- Passage Only View unconditionally uses two columns and a 48px gap at [player.css:71](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/player.css:71), including narrow viewports. Removing the `52ch` cap there makes the high-scale case worse. This is already a responsive defect even at 17px.
- The two-column view has no test coverage, breakpoint, minimum column width, or single-column fallback.

Fix: Separate the decision into passage size and question size, make Passage Only responsive first, then test 75/100/125/150/175% at narrow, mid, wide, and docked widths before selecting a base size.

## 4. Cut the bikeshedding

- **B4:** Cut the new `Next question` pill. It duplicates the pager’s labeled chevron at [RcChrome.tsx:180](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/components/RcChrome.tsx:180).
- **B5:** Keep removal of non-token hardcoded colors; cut pixel-perfect cloning of LR chip sizes, indentation, and hover treatments.
- **B6:** Cut the palette redesign unless paired with B7. The wrapping is defective; “wrong design system” is subjective.
- **B8:** Cut the cross-product vocabulary migration. It changes LR for no demonstrated student failure and the controls expose different scale ranges.
- **B9:** Keep the guarded RC keyboard repair; cut adding every shortcut to both runners unless keyboard parity becomes its own tested requirement.
- **B10:** Cut. Strike-through versus desaturation is cosmetic and RC’s behavior is arguably clearer.
- **C1:** Cut unless data analysis proves percentage-only LR rows exist and are harmful. A percentage is information, not inherently an empty shell.
- **D1–D5:** Cut from this implementation. Dead-code and comment cleanup can be a separate low-risk hygiene change.

Keep B2 because it was explicitly requested, B3 because Help is a real missing capability, B7 because wrapping is visibly broken, and B11 because it is an accessibility defect.

## 5. Material misses

1. **Hydration confuses first and later attempts.** Later attempts overwrite earlier answers because the loop ignores `isFirstAttempt`.

   Fix: Build distinct `firstAttempts` and `reviewAttempts` maps during hydration.

2. **Per-question resume does not restore reveal state.** A recorded answer resumes selected but unrevealed, so Confirm can insert a duplicate attempt at [RcPlayer.tsx:431](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:431).

   Fix: Restore `revealed` for recorded per-question attempts, or make Confirm refuse already-recorded questions.

3. **Keyboard arrows bypass persistence.** They dispatch `prev`/`next` directly at [RcPlayer.tsx:330](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:330) instead of using `goTo`, so end-of-set answers are not saved on keyboard navigation until final submission.

   Fix: Route arrow navigation through `goTo`.

4. **Keyboard remains active while paused.** The pause scrim blocks pointers, but the global handler does not check `state.paused`.

   Fix: Return immediately from the keyboard handler while paused.

5. **Transient state survives session changes.** The component intentionally remains mounted across query changes, but `reattemptPicks`, skipped re-attempts, elapsed time, scroll positions, passage-only state, and modal state are never reset.

   Fix: Reset all session-local UI state when the effective session ID changes.

6. **Attempt classification is race-prone.** `recordAttempt` performs a read-then-insert without a database invariant at [rcProgress.ts:150](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/api/rcProgress.ts:150); rapid duplicate submissions can both become first attempts.

   Fix: Enforce one first attempt per session/question in Postgres and make the write atomic or idempotent.

7. **B3’s proposed implementation is incomplete.** RC has neither `helpOpen` state nor a mounted `HelpSheet`; merely passing `onOpenHelp` cannot open anything. LR implements the complete path around [Drill.tsx:3456](/Users/joshuaf/ai-os/projects/lsatu/src/pages/Drill.tsx:3456).

   Fix: Import and mount `HelpSheet`, add controlled open state, then pass the opener to the strip.

8. **D3 masks an unfinished Find feature.** `findCount` is discarded and `findIndex` is never advanced, so search always scrolls to the first match.

   Fix: Either expose match count/next/previous navigation or remove both count and index plumbing honestly.

## 6. Ordering

Section 5’s ordering is wrong. Tests come after three state-machine fixes, A2 and A3 share elimination semantics, and B1 depends on repairing Passage Only responsiveness first.

Recommended order:

1. Write failing hydration, pause, keyboard-navigation, and blind-review tests.
2. Define the first-attempt/review-attempt hydration model and database invariant.
3. Fix A1–A3 together, including separate display and re-attempt elimination state.
4. Fix A4 and paused-keyboard gating.
5. Reset transient state across sessions.
6. Implement B2, B7, and the complete B3 Help path.
7. Repair and test Passage Only responsiveness.
8. Decide B1 from the full viewport × accessibility-scale matrix.
9. Make the limited token/accessibility fixes from B5 and B11.
10. Leave cross-player cosmetic parity and dead-code cleanup for separate changes.

VERDICT: REVISE


### Claude's response to Round 1

Every claim was checked against source before being accepted. All of them held, including the one that corrects me.

**Accepted and verified:**

| Codex claim | Verification |
|---|---|
| A1 does not reach the database | Confirmed. `recordAttempt` is insert-only (`rcProgress.ts:141-176`, "Existing rows are never updated"), and `goTo`'s `end_of_set` write is gated on `!state.recorded.has(...)`, always false in review. **v1 was wrong; severity corrected to in-memory display only.** |
| A3 is worse — hydration lets later attempts overwrite the first answer | Confirmed. `getSessionAttempts` is `select().order('created_at', ascending: true)` over **all** rows; the loop `answers.set()`s each one unconditionally, so the last wins. A second review visit labels the re-answer as the "1st". Promoted. |
| A2's fix must not reuse `RcChoiceRow.disabled` | Confirmed. That prop also gates the badge and text buttons (`RcChoiceRow.tsx:70,88`); reusing it would make the blind re-attempt unanswerable. Would have been a shipped regression. New `eliminationDisabled` prop instead. |
| The guarded selector must sit above the early returns | Confirmed against the hook-count hazard already documented at `RcPlayer.tsx:385`. Specified in the fix. |
| B3 as written wires a button to nothing | Confirmed. RC has no `HelpSheet` import, no `helpOpen`, no mounted sheet; LR has all three (`Drill.tsx:24, 244, 3573`). Scope corrected to the full path. |
| A5 per-question resume can duplicate an attempt | Confirmed. `isRevealed` reads `state.revealed` / `state.reviewedPassages` (`rcSession.ts:107-117`); neither is hydrated. Added. |
| A6 arrows bypass `goTo` | Confirmed at `RcPlayer.tsx:330`. Added. |
| A7 keyboard live while paused | Confirmed — the handler checks inputs, modal and item, never `state.paused`. Added. |
| A8 transient state survives a session change | Confirmed. Added. |
| A9 `recordAttempt` read-then-insert race | Confirmed at `rcProgress.ts:150-176`. Added, **plus my own finding**: the caller-supplied `isFirstAttempt` on `RcAttempt` is ignored entirely — `recordAttempt` recomputes it. Both call sites pass a value that does nothing. |
| B12 Passage Only is two columns at every width | Confirmed — `grep -c "@media"` returns **0** for both `player.css` and `rc.css`. Added, and made a prerequisite for B1 rather than a follow-on. |
| D3 masks an unfinished feature | Confirmed. `setFindIndex` appears twice and is only ever set to `0` (`RcPlayer.tsx:205, 506`). Upgraded from "dead state" to "half-built Find". |

**Cuts accepted:** B4's `Next question` pill (duplicates the pager chevron), B8 (changes LR for symmetry with no demonstrated failure), B9's cross-player shortcut migration, B10 (cosmetic), C1 (gated on a data count first), D1/D2/D4/D5 (real but belong in a separate hygiene commit).

**Held, with reasons:**

1. **B5, partially.** Codex said keep the hardcoded-hex removal and cut the LR chip/indent/hover cloning. Agreed on the cloning. **Held:** the two-different-greens-for-one-verdict problem is not cloning — `#2f9e64`/`#eaf6ef` in the banner against Tailwind `green-500`/`green-50` in the choice row three lines below is one surface disagreeing with itself, and it travels with the hex removal.
2. **B6, by merging rather than cutting.** Codex called "wrong design system" subjective and said cut unless paired with B7. Paired — one banner change, not two. The measured facts (`rgba(18,18,18,0.1)` fill, 13px against a 16px pane) stay in as the reason.
3. **B1 stays in the plan, gated rather than cut.** Codex's decomposition is accepted in full and B12 is now a prerequisite. But the two source comments asserting a parity that the measurement disproves are a defect regardless of which size wins, so the item does not leave the plan.
4. **B1's final call goes to Joshua, not into another round.** It changes how every RC passage reads. Per the skill's own rule, product decisions do not get argued with the critic.

## Round 2 — Codex

I’m using the dedicated `codex-review` skill for this second adversarial pass. I’ll focus only on v2 and won’t reopen the settled cuts or the product owner’s final type-size choice without new source evidence.

The skill’s orchestration loop is not applicable because you are directly asking this read-only critic to review the named v2 file, and explicitly excluded `PLAN.md`. I’m applying its re-assertion guard and source-evidence standard while reviewing the requested file directly.

Recommendation: revise once more. V2 is substantially stronger, but the persistence contract and hydration semantics are still underspecified enough to produce incorrect history.

## 1. Correctness claims

- **A1 is now accurate.** The damage is in-memory presentation, not replacement of the stored first-attempt row.
- **A2 is real and the independent prop is the correct direction.**
- **A3 correctly identifies the main hydration defect, but its partition is not yet sufficient.**
- **A4, A6, and A7 are correct.**
- **A5 is only partly correct.** Per-question resume can duplicate through Confirm, but per-passage does not have the same duplicate-write path because `recordPassage` filters `state.recorded` at [RcPlayer.tsx:266](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:266). Its actual defect is that the passage resumes unrevealed and requires another Check click.
- **A8 is real, but resetting state does not address stale asynchronous hydration.**
- **A9 is real, but its proposed fix still leaves the core API decision unresolved.**

Fix A5: Describe per-passage as lost reveal state, and derive `reviewedPassages` only for per-passage mode when every question in that passage has a recorded first attempt.

## 2. First-attempt/review-attempt partition

Partitioning by `isFirstAttempt` is the right model, and it matches the results implementation at [RcResults.tsx:111](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcResults.tsx:111). It is not sufficient until four details are explicit:

1. **Existing duplicate first rows can prevent the partial unique index from being created.** The migration needs to normalize any existing duplicates before adding the invariant.

   Fix: In the migration, rank first rows by `created_at, id`, reclassify every row after the earliest as `is_first_attempt = false`, then create the partial unique index.

2. **A9 does not choose an API contract.** “Drop `isFirstAttempt` or honour it” is still an open implementation fork. The current read-then-insert cannot become genuinely idempotent from the unique index alone.

   Fix: Split the API into an idempotent `recordFirstAttempt` and append-only `recordReviewAttempt`, with the former implemented atomically in Postgres and the latter always writing `is_first_attempt = false`.

3. **The partition must define every hydrated field.** `answers`, first-attempt eliminations, and `recorded` should come from first attempts; review rows should not affect those fields. Reveal restoration must also be conditional on `config.reveal`.

   Fix: Specify a single hydration projection that derives `answers`, `firstAttemptEliminations`, `recorded`, `revealed`, and `reviewedPassages` by reveal mode from the first-attempt map.

4. **The plan does not say what `reviewAttempts` are used for.** Current review behavior requests a fresh re-attempt on every visit, so merely retaining later rows “separately” does nothing and invites accidental reuse.

   Fix: State that prior review attempts are history-only and never seed the current `reattemptPicks`, unless the product explicitly decides otherwise.

## 3. Elimination split

A separate `eliminationDisabled` prop preserves live non-review behavior and keeps answer selection enabled during blind review. It must gate both the native button and its click handler, not merely set the HTML attribute.

Fix: In `RcChoiceRow`, use `disabled={disabled || eliminationDisabled}` and guard the handler with the same combined predicate.

There is also a new semantic conflict after A3: once first-attempt eliminations are restored, a student can choose during the re-attempt a choice they crossed out originally. After reveal, that row will be both the second pick and `line-through`, because line-through is applied independently at [RcChoiceRow.tsx:91](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/components/RcChoiceRow.tsx:91). The interface will appear to say they crossed out their second answer.

Fix: Represent first-attempt cross-outs explicitly in review, or suppress elimination styling on the current second pick; do not render one row as simultaneously selected and crossed out without attribution.

## 4. Selector and hooks

The proposed above-early-returns `useCallback` satisfies hook ordering. Nullable derivation is safe, and there is no circular hook dependency.

It remains correct only if:

- `selectLetter` is declared before every conditional return.
- Its dependencies include `item`, `questionId`, `revealed`, `reattemptMode`, `sessionId`, `state.flagged`, and whichever elimination map feeds persistence.
- The keyboard effect depends on `selectLetter`, `goTo`, `state.paused`, and its modal gates.
- The non-null `sessionId!` assertion is replaced with an actual guard.

Fix: Document the callback and keyboard dependency lists in A1 so the implementation cannot “solve” lint by suppressing exhaustive-deps.

B3 adds a hidden keyboard dependency. `HelpSheet` is a Radix dialog at [HelpSheet.tsx:204](/Users/joshuaf/ai-os/projects/lsatu/src/components/help/HelpSheet.tsx:204), but RC’s global handler only knows about its own `modal`. Letter and arrow keys pressed while focus is on a sheet button can still modify the drill underneath.

Fix: Gate shortcuts while `helpOpen`, and ignore events originating inside dialogs, popovers, or contenteditable controls.

A6 should also prevent the browser’s default arrow behavior.

Fix: Call `preventDefault()` for handled navigation and selection shortcuts before routing arrows through `goTo`.

## 5. Additional misses

### Stale hydration can cross sessions

The hydration effect at [RcPlayer.tsx:150](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:150) has no cancellation cleanup. If session A’s attempts resolve after the player has switched to session B, A’s answers can be restored into B’s state. Resetting local state in A8 does not prevent the late promise from overwriting it.

Fix: Give hydration a cancellation flag or session-generation token and discard results unless both the session ID and passage generation still match.

### Persistence failures are presented as success

`writeAttempt` swallows every write error at [RcPlayer.tsx:245](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:245). Confirm then reveals anyway, passage review proceeds, and `handleSubmit` can complete and navigate despite missing attempts. The review re-attempt uses fire-and-forget persistence with no catch at [RcPlayer.tsx:582](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:582).

Fix: Make writes return an explicit success result, reveal or complete only after success, and expose a retryable error instead of silently presenting unsaved work as recorded.

## 6. B1, cuts, and ordering

B12 now properly precedes B1, and the viewport × accessibility-scale matrix is sufficient. Ensure the fallback responds to actual available pane width, especially the docked case, rather than assuming desktop viewport width guarantees two usable columns.

The settled cuts are reasonable. I see no new evidence requiring B4’s Next pill, B8, cross-player B9, B10, C1, or the hygiene items to return.

Section 4 still has two ordering problems:

- Step 2 says it implements the hydration partition, while step 3 says it implements A3. That is duplicate and circular.
- A5 is itself hydration behavior, so it should not wait until the generic gating step.

Recommended corrected order:

1. Failing tests, including persistence failure, stale hydration, mode-specific resume, and migration duplicate handling.
2. Normalize existing duplicate first rows, add the database invariant, and replace `recordAttempt` with the explicit first/review write APIs.
3. Implement the complete hydration projection, including A3, A5, cancellation, and mode-specific reveal restoration.
4. Implement A1/A2 together with separate elimination display semantics and modal-safe keyboard handling.
5. Implement A4/A6/A7 and session-identity resets from A8.
6. Continue with B2, B7+B6, B3, B12, B1, and the remaining presentation work in the existing order.

VERDICT: REVISE

### Claude's response to Round 2 — and the decision to stop the loop here

**Accepted and verified:**

| Codex claim | Verification |
|---|---|
| Hydration has no cancellation, so session A's attempts can land in session B | Confirmed. The **boot** effect carries a `cancelled` flag (`RcPlayer.tsx:140-145`); the **hydration** effect at `:150` has none. Added as A10. |
| `writeAttempt` swallows every write error and the UI proceeds as if saved | Confirmed at `RcPlayer.tsx:245`, and the review re-attempt at `:582` is fire-and-forget with no `.catch`. Added as A11. Directly against the standing "no fake progress" rule. |
| A5 overstated per-passage | Confirmed. `recordPassage` filters `!state.recorded.has(...)` (`RcPlayer.tsx:264-266`), so there is no duplicate-write path there. Corrected: per-passage loses reveal state and demands a second Check click, nothing worse. |
| Restored first-attempt cross-outs will collide with the second pick | Confirmed. `line-through` is applied independently of selection (`RcChoiceRow.tsx:91`), so a re-attempt landing on an originally-eliminated choice renders as selected *and* struck through. Added to A2/A3. |
| B3 opens a keyboard leak | Confirmed. `HelpSheet` is a Radix `Sheet` (`HelpSheet.tsx:204`) and RC's global handler only knows its own `modal`. Folded into A1's gating. |
| Arrows need `preventDefault()` | Accepted. |

**My own addition while checking:** `RcResults.tsx:114` already does `if (a.isFirstAttempt) map.set(...)`. The results page partitions correctly and the player does not. The partition is not a new model to invent, it is the model the codebase already uses in one of two places.

**Stopping at round 2 of a possible 5, deliberately.**

The trajectory says converge. Round 1 found five material misses and caught two of my fixes that would have shipped as regressions. Round 2 found two genuinely new bugs (A10, A11) and otherwise asked the plan to pre-specify implementation detail: exact hook dependency arrays, an API split into `recordFirstAttempt` / `recordReviewAttempt`, a full hydration projection written out in prose. Those are real decisions, but they are settled better against the code with a failing test than declared in a plan document, and a third round would produce another layer of the same.

**One held, and it is a scope call rather than a technical disagreement.** Codex now wants a Postgres migration: normalize existing duplicate `is_first_attempt` rows, then add a partial unique index, then split the write API. That is correct for A9's race, but A9 is a rare double-submit and **the migration is not a prerequisite for anything else in the plan** — the hydration partition (A3) works against existing data exactly as `RcResults` already does. So A9 is split out: the UI and state repairs ship without touching the schema, and the attempt-classification invariant becomes its own piece of work with its own gate. Bundling a production schema migration into a UI parity pass is how a cleanup turns into an outage.

**Not carried:** nothing from round 2 was rejected on the merits.
