# RC player vs LR player — full parity audit and fix plan

**Date:** 2026-08-27 · **Revised:** v3, after two adversarial rounds · **Author:** Claude (Jay 2) · **Branch:** `main` at `026a2ffc`
**Scope:** the RC drill runner (`/rc/drill`, live and `?review=1`) measured against the LR drill runner (`/drill`, smart mode). The hub was audited last session and is out of scope except where a finding crosses into it.
**Method:** code read of both runners and their shared chrome, plus a live run of both surfaces on the dev server at `localhost:64051`, 1046×964. Findings marked **[live]** were proven by driving the running app, not inferred from source. Measurements are `getComputedStyle` / `getBoundingClientRect` values taken from the running page.
**Review:** two adversarial rounds by Codex (`gpt-5.6-sol`, read-only), both **REVISE**; the loop was stopped at 2 of a possible 5 by my call, with reasons in the log. Transcript and my point-by-point responses: [rc-lr-parity-audit-2026-08-27-review-log.md](rc-lr-parity-audit-2026-08-27-review-log.md). Changes are marked **[v2]** and **[v3]**. Every claim Codex made was independently verified against source before being accepted, including the one that corrects me. Round 1 caught two of my proposed fixes that would have shipped as regressions.

---

## 0. What the two players actually share

Both runners mount the same four chrome components, so every divergence below is a *prop* divergence, not a fork:

| Component | LR passes | RC passes |
|---|---|---|
| `OfficialDrillFrame` | notes panel, tutor toggle, pause | `notepadEnabled={false}`, `fillViewport`, pause |
| `OfficialSessionStrip` | breadcrumbs + **Answer, Explanation, Help, Pause, Complete** | breadcrumbs only in review; pause + complete in a live drill |
| `OfficialDrillToolbar` | LR directions, notes button, timer | RC directions, `leftTools`, no timer in review |
| `OfficialSmartDrillBar` | End · auto-reveal, Skip, Submit | End, Menu · **nothing on the right in review** |
| `DrillSplit` | `passage-weighted`, `maxWidthClassName={null}` | `passage-weighted`, `maxWidthClassName={null}` |

The geometry is genuinely shared. The type, the palette, the controls, the keyboard and the state restoration are not.

---

## 1. Correctness bugs

### A1 — a keystroke in blind review rewrites the *displayed* first answer **[live]** **[v2: severity corrected]**

`RcPlayer.tsx:333-338`. The global key handler dispatches `{ type: 'select' }` straight into the reducer. The `onSelect` prop passed to `RcQuestionPane` (`RcPlayer.tsx:579`) has two guards the keyboard does not: it routes to `reattemptPicks` when `reattemptMode` is on, and it returns early when `revealed`.

**Proven live.** On `?review=1` with `selected: "B"` (the student's own first answer, read off the mounted pane's React props), one synthetic `keydown` of `C` moved the pane's `selected` prop to `"C"`. Nothing on screen changed, because in re-attempt mode the row highlight reads `reattemptPick`, not `selected` — so the corruption is invisible until the student answers again, at which point `RcReviewLayer` reports `1st C` for a question they answered `B`.

**[v2] v1 claimed this reaches the database. It does not, and Codex was right to knock it down.** `recordAttempt` is insert-only — "Existing rows are never updated, so the original answer stays intact" (`rcProgress.ts:141-176`) — and `goTo`'s `end_of_set` write is gated on `!state.recorded.has(...)` (`RcPlayer.tsx:283-290`), which is always false in review. The damage is confined to what the student is shown and to the `1st`/`2nd` chips in the verdict line. That is still a lie about their own work, and it is still worth fixing; it is not data loss.

**Fix:** one guarded `selectLetter(letter)` used by both the pane and the keyboard. **[v2]** It must be a `useCallback` declared *above* the loading/error early returns at `RcPlayer.tsx:347/365`, with `questionId`, `revealed` and `reattemptMode` computed nullable-safe above it — otherwise either the hook count changes between renders (the hazard already documented at `RcPlayer.tsx:385`) or the effect closes over stale state.

**[v3] Dependency lists are named here so the implementation cannot satisfy the linter by suppressing it.** `selectLetter` depends on `item`, `questionId`, `revealed`, `reattemptMode`, `sessionId`, `state.flagged` and the elimination map that feeds persistence; the keyboard effect depends on `selectLetter`, `goTo`, `state.paused` and its modal gates. The `sessionId!` non-null assertion at `RcPlayer.tsx:582` becomes a real guard.

**[v3] The handler must also ignore events from portalled UI.** It currently checks only its own `modal` state, so once B3 mounts `HelpSheet` — a Radix `Sheet` (`HelpSheet.tsx:204`) — letter and arrow keys pressed with focus inside it would still drive the drill underneath. Gate on `helpOpen`, and ignore events originating in a dialog, popover or contenteditable. Handled keys call `preventDefault()`.

### A2 — the cross-out control in review is live, invisible, and writes phantom data **[live]**

`RcQuestionPane.tsx:124` forces the row's eliminated state off during a blind re-attempt, while the eliminate button's own `disabled` is `showFeedback`, which is false in that state. The control is clickable, the click reaches the reducer, and nothing renders.

**Proven live.** Clicking the eye on choice A left the `<li>` class string byte-identical, left the text without `line-through`, and left the button's `aria-label` at `"Cross out choice A"` — it never flips to `"Restore"`, so a screen-reader user gets no feedback either. Reading the pane's props afterwards showed `eliminations: ["A"]`. The state moved; the screen did not. This is precisely the "dead button" the project's own product rules forbid.

**Fix:** **[v2] a new `eliminationDisabled` prop on `RcChoiceRow`. Do not reuse the existing `disabled`** — that prop also gates the badge and text buttons (`RcChoiceRow.tsx:70,88`), so reusing it would make the blind re-attempt unanswerable. Codex caught this and it would have been a shipped regression. **[v3]** It gates the click handler as well as the HTML attribute (`disabled={disabled || eliminationDisabled}` plus the same predicate inside `onClick`), so the row cannot be driven by a synthetic event or a stale pointer.

### A3 — hydration confuses the first attempt with the re-attempt **[v2: promoted, was "does not restore cross-outs"]**

The hydration effect (`RcPlayer.tsx:165-186`) loops every row `getSessionAttempts` returns. That query is `select().eq('session_id').order('created_at', ascending: true)` (`rcProgress.ts:180-188`) — **all** attempts, oldest first — and the loop does `answers.set(a.questionId, a.selected)` unconditionally. The last row wins.

So the second time a student opens the same session in review, the answer labelled as theirs is the re-answer they gave during the *first* review, not their original. The blind re-attempt exercise then compares them against themselves and reports it as first-versus-second.

`eliminations` are never restored at all, which is the v1 finding and still true: after reveal the review shows a clean set of five choices and implies they crossed nothing out.

**Fix:** **[v2]** partition hydration on `isFirstAttempt`. Build `firstAttempts` and `reviewAttempts` separately; `answers`, `recorded`, the displayed eliminations and (per A5) the reveal state all derive only from `isFirstAttempt === true`. **[v2] And keep display-only first-attempt eliminations out of the array handed to the re-attempt's `recordAttempt` (`RcPlayer.tsx:582`)** — writing them there would attribute the first attempt's cross-outs to the second, the same class of lie in the other direction.

**[v3] This is not a new model to invent.** `RcResults.tsx:114` already does exactly this — `for (const a of attempts) if (a.isFirstAttempt) map.set(a.questionId, a)`. The results page partitions correctly; the player is the lone outlier. That is the strongest argument for the fix and it settles the shape of it.

**[v3]** Prior review attempts are **history only**. They never seed `reattemptPicks` — every review visit asks for a fresh blind answer. Stated explicitly because "retain them separately" otherwise invites exactly that reuse.

**[v3] One consequence to handle:** once first-attempt cross-outs are restored, a re-attempt can land on a choice the student originally crossed out. `line-through` is applied independently of selection (`RcChoiceRow.tsx:91`), so that row would render as selected *and* struck through, reading as "you crossed out your own second answer". Suppress elimination styling on the current re-attempt pick, or attribute the cross-out to the first attempt explicitly.

### A4 — the overflow Menu still offers Pause in review

`c88f011d` removed Pause from the header strip in review because "review has no clock and nothing to pause". `RcPlayer.tsx:646` still passes `onPause` unconditionally, so Menu → Pause drops a scrim over the student's own answers. The same menu offers **Save and exit** where nothing is being saved.

**Fix:** make `onPause` optional on `RcOverflowMenu`, omit it in review. The exit label is copy cleanup, not correctness. **[v2: severity downgraded to match.]**

### A5 — resuming a drill loses its reveal state **[v2: new, from Codex · v3: scope corrected]**

Hydration restores `answers`, `flagged`, `recorded` and `submitted`. It never restores `state.revealed` or `state.reviewedPassages`, and `isRevealed` reads exactly those (`rcSession.ts:107-117`).

In `per_question` mode this is a duplicate write: an already-confirmed question resumes unrevealed with its answer still selected, which leaves the Confirm pill enabled (`disabled: !selected || revealed`), and pressing it calls `writeAttempt` again.

**[v3] In `per_passage` mode it is not.** `recordPassage` filters `!state.recorded.has(...)` (`RcPlayer.tsx:264-266`), so no second row is written. The defect there is milder: the passage resumes unreviewed and demands another Check click. v2 overstated it; Codex was right.

**Fix:** derive `revealed` and `reviewedPassages` from the first-attempt map, per reveal mode — `reviewedPassages` only where every question in that passage has a recorded first attempt — and refuse `writeAttempt` for anything already in `state.recorded`.

### A6 — arrow-key navigation skips the `end_of_set` write **[v2: new, from Codex]**

`RcPlayer.tsx:330` dispatches `prev`/`next` straight to the reducer instead of calling `goTo`, so the silent "write as the student moves on" branch inside `goTo` (`RcPlayer.tsx:283-290`) never runs for keyboard navigation. A student who walks an `end_of_set` drill with the arrow keys has nothing persisted until final submit.

**Fix:** route both arrows through `goTo`.

### A7 — the keyboard stays live while the drill is paused **[v2: new, from Codex]**

The handler returns early for inputs, open modals and a missing item. It never checks `state.paused`. The pause scrim blocks the pointer; it does not block the keyboard, so a "paused" drill can still be answered and navigated.

**Fix:** `if (state.paused) return;` at the top of the handler.

### A8 — session-local UI state survives a session change **[v2: new, from Codex]**

The boot effect deliberately re-runs when `sessionId` / `passage` / `location.key` changes, because the component stays mounted across a search-param change. `reattemptPicks`, `skippedReattempt`, `elapsed`, `scrollTops`, `passageOnly` and `modal` are never reset, so they bleed from one drill into the next.

**Fix:** reset all session-local UI state in the same effect that re-boots.

### A9 — attempt classification is race-prone, and the caller's flag is ignored **[v3: SPLIT OUT, see §6]**

`recordAttempt` does a read-then-insert (`rcProgress.ts:150-176`) with no database invariant, so two rapid writes for one question can both see zero priors and both be stored as first attempts.

Separately: `RcAttempt` carries an `isFirstAttempt` field, `RcPlayer` sets it at both call sites, and `recordAttempt` **ignores it entirely** and recomputes from the prior query. Every caller is passing a value that does nothing, which reads as a guarantee and is not one.

**[v3] This is now its own piece of work, not part of this plan.** Codex's fix is correct — normalize existing duplicate first rows, add a partial unique index on `(session_id, question_id) where is_first_attempt`, split the API into an idempotent `recordFirstAttempt` and an append-only `recordReviewAttempt` — and it is a **production Postgres migration**. Nothing else in this plan depends on it: the hydration partition in A3 works against existing data exactly as `RcResults` already does. Bundling a schema migration into a UI parity pass is how a cleanup becomes an outage. See §6.

### A10 — hydration has no cancellation, so one session's answers can land in another **[v3: new, from Codex]**

The boot effect carries a `cancelled` flag (`RcPlayer.tsx:140-145`). The hydration effect at `:150` does not. Since the component deliberately stays mounted across a session change, session A's `getSessionAttempts` promise can resolve after the player has switched to session B and dispatch A's answers into B's state. A8's reset does not help: the late promise lands *after* the reset.

**Fix:** a session-generation token checked before dispatch, matching the pattern the boot effect already uses ten lines above.

### A11 — a failed write is presented to the student as saved work **[v3: new, from Codex]**

`writeAttempt` catches every error and returns silently (`RcPlayer.tsx:245`), so Confirm reveals, Check passage proceeds, and `handleSubmit` completes and navigates to results whether or not anything was stored. The review re-attempt at `:582` is fire-and-forget with no `.catch` at all.

The comment says "A failed write must not swallow the student's place in the drill", which is a fair goal, but the current behaviour goes further than that: it tells them the work is recorded when it is not. That is the "no fake progress" rule, broken.

**Fix:** writes return an explicit result; reveal and complete only on success; a failed write surfaces a retry instead of a silent pass.

---

## 2. Parity — what the student sees

### B2 — the "REVIEW" badge · **KEEP, this is what Joshua asked for**

`RcPlayer.tsx:516-520` renders a dark red (`#7f1d1d`) uppercase pill next to Passage Only whenever `reviewOnly` is set. LR has no analogue in any mode. It sits in the toolbar's left group, which in the official interface holds the section's *tools*, and it labels a state the breadcrumb and the absent timer already carry.

**Fix:** delete it.

### B7 + B6 — the re-attempt banner: broken layout, foreign palette · **KEEP, merged [v2]**

**[live]** The banner is 61.6px tall; both the message and the "Show my answer" button are **41.6px**, i.e. two lines each. The button is 94.5px wide and wraps mid-phrase to "Show my / answer", and `justify-content: space-between` then opens a ragged gap. This is what is visible in the screenshot Joshua selected.

While it is being fixed: `rc.css:167` styles it with `hsl(var(--primary) / 0.1)`, which **[live]** resolves to `rgba(18, 18, 18, 0.1)` — a neutral grey box, in a surface otherwise built from LawHub slate and `#7f1d1d`. It is the only element in the exam pane reaching for the product's app tokens, and at 13px it sits three pixels under the pane it introduces.

**[v2]** Codex called "wrong design system" subjective and said cut it unless paired with the wrap fix. Paired. One banner change: stop it wrapping (`white-space: nowrap` and `flex-shrink: 0` on `.rc-skip-link`), then bring the fill, border and size onto the exam pane's own scale.

### B3 — RC has no Help route at all · **KEEP, scope corrected [v2]**

**[live]** The header strip in RC review contains exactly one button: the "Reading Comprehension" breadcrumb. LR's strip always carries Answer, Explanation, a Help circle and Pause.

**[v2] v1 said "pass `onOpenHelp`". That would have wired a button to nothing** — RC has no `HelpSheet` import, no `helpOpen` state and no mounted sheet, where LR has the full path (`Drill.tsx:24, 244, 3573`). Shipping the prop alone would have created exactly the dead button the product rules forbid. Codex caught it.

**Fix:** import and mount `HelpSheet`, add controlled open state, then pass the opener to the strip, in both RC modes. Do **not** re-add Answer/Explanation: in RC those are the pane's own disclosure rows.

### B4 — the review action bar is left-heavy · **REDUCED [v2]**

RC review: `End` and `Menu` on the left, nothing on the right. LR: `End` left, auto-reveal + `Skip` + `Submit` right.

**[v2]** v1 proposed a `Next question` pill for the right cluster. Codex is right that it duplicates the pager's already-labelled chevron (`RcChrome.tsx:180`). Cut. What remains is the copy fix from A4: label the left action `Exit` in review, since "End" names ending something that is already over.

### B11 — LR's eliminate button has no accessible name · **KEEP**

`OfficialQuestionPane.tsx` renders the eye button with no `aria-label` and no `title`; RC's has both. A screen-reader user on LR hears an unlabelled button. The one place in this audit where RC is ahead.

**Fix:** copy RC's labels into LR.

### B12 — Passage Only View is two columns at every width **[v2: new, from Codex]**

`player.css:72` sets `column-count: 2; column-gap: 48px` with **no media query — there are zero `@media` rules in either RC stylesheet.** At 375px that is two ~150px columns of Fraunces. The 52ch measure cap is also switched off in this mode (`RcPassagePane.tsx:213`), so nothing else bounds it.

This is already a defect at today's 17px, and the project's responsive gate ("narrow, mid, and wide viewports plus the sidecar-docked case, every time") applies.

**Fix:** a minimum column width and a single-column fallback below it. This is a prerequisite for B1, not a follow-on.

### B1 — RC runs 2-3px smaller than LR everywhere · **DECOMPOSED AND GATED [v2]**

**[live]** at default scale:

| | LR | RC |
|---|---|---|
| Reading surface | **19px** / 1.7 | **17px** / 1.7 |
| Question stem | **19px** | **16px** |
| Answer choice text | **19px** | **16px** |
| Choice letter badge | 14.8px | 12.5px |

`OfficialQuestionPane.tsx:96` sets `baseSize = 19 * fontScale` and says why: "7Sage sets both the stimulus and the answer choices at 19px and the student reads ours next to theirs." `RcExamPane.tsx` sets 17 and 16 and calls itself "The LR player's type stack, scaled." `rcDirections.tsx:32` goes further: "100% is the LR player's base size, so the two drills read identically at the default." **Both statements are false against the measurement.** The line heights do match (1.7 / 1.6), which is why the mismatch reads as drift rather than as a decision.

**[v2] v1 proposed raising both to 19px in one step. That was underspecified and Codex was right to block it.** Passage and question are two separate decisions (11.8% vs 18.75% growth), RC's accessibility range multiplies whatever base is chosen up to 175% (14.25px → 33.25px), and Passage Only is not responsive yet.

**Fix, in order:** B12 first. Then screenshot the 75/100/125/150/175% × narrow/mid/wide/docked matrix at 17/16 and at 19/19. Then choose. **This is Joshua's call, not mine and not Codex's** — it changes how every RC passage reads. Whichever way it goes, the two false comments get corrected, because a comment claiming a parity the code does not have is the actual defect here.

### B5 — the two review layers share no palette · **REDUCED [v2]**

RC is inconsistent *with itself*: the verdict banner greens are `#2f9e64` on `#eaf6ef` (`rc.css:68-75`) while the correct choice row three lines below is Tailwind `green-500` on `green-50`. Two greens for one verdict, on one screen. Same for wrong: `#e5484d` / `#fdecec` against nothing. Four hardcoded hexes, against the standing rule that LSAT U drives colour from tokens.

**[v2]** Codex said keep the hex removal, cut the pixel-matching of LR's chip sizes, indent and hover states. Agreed — that half was cloning for its own sake. **Held:** the internal two-greens inconsistency is not cloning, it is one surface disagreeing with itself, and it goes with the hex removal.

### B9 — one keyboard, two vocabularies · **REDUCED [v2]**

LR (full-section only): arrows/Enter navigate, **1-5** select. RC (every mode): arrows navigate, **A-E** select, **`f`** flags — routed through nothing, which is A1/A6/A7.

**[v2]** Keep the guarded RC repair (A1, A6, A7). Cut the cross-player shortcut migration; there is no evidence a student has hit it, and it would change LR for symmetry alone.

---

## 3. Cut from this plan **[v2]**

Codex argued these cost more than they return, and I agree on each:

| Item | Why it is cut |
|---|---|
| **B8** font-size vocabulary (RC's "125%" vs LR's "Large") | Would change LR for symmetry with no demonstrated student failure, and the two controls genuinely expose different ranges. Joshua's call if he ever wants it; not worth a change now. |
| **B10** strike-through vs desaturation on a cross-out | Cosmetic, and RC's is arguably the clearer of the two. |
| **C1** LR's percent-only disclosure row | RC's predicate drops it, LR's keeps it, and LR's own comment forbids it — but a percentage is information, not necessarily an empty shell. **Gate on data:** count LR choices with a percentage and neither tag nor note. If zero, this is a comment fix. If not, decide then. |
| **D1** dead `RcReviewModal` (~100 lines), **D2** dead `RcToolbarIcon`, **D4** stale `rightTools` doc, **D5** stale `DrillSplit` doc | Real, all verified, all zero-risk — but they belong in a separate hygiene commit, not mixed into state-machine repairs. |

**D3 is not cut, it is upgraded.** `findCount` is dead state, but **[v2]** `findIndex` is only ever set to `0` (`RcPlayer.tsx:205, 506`) — it is never advanced. So Find always scrolls to the first match and the count is collected for a UI that does not exist. Either build next/previous match navigation or remove both, honestly. Codex found this; it is a half-built feature, not dead code.

---

## 3a. Status — what has shipped **[v3]**

| Step | Item | State |
|---|---|---|
| 1 | Blind-review state machine tests | **done** — `rcHydration.test.ts`, 16 cases where there were none |
| 2 | Hydration projection (A3, A5, A10) | **done** — `rcHydration.ts`; confirmed against real rows |
| 3 | Guarded selector + elimination split (A1, A2) | **done** |
| 4 | A4, A6, A7, A8 | **done** |
| 5 | A11 write failures | **done** — writes report success; reveal, passage review and submit all wait on it |
| 6 | B2 badge, B7+B6 banner, B3 Help | **done** — `HelpSheet` mounted and keyboard-gated behind it |
| 7 | B12 Passage Only responsive | **done** — and it turned out to be worse than the audit said: see below |
| 8 | B1 type scale | **open — Joshua's call**, screenshots taken at both sizes |
| 9 | B5 hexes, B11 LR label, B4 copy | **done** |
| 10 | D3 Find | **done** — built the match navigation rather than deleting the plumbing |
| 11 | D1/D2/D4/D5 hygiene | **done** — D2 stopped being dead code by becoming the Find buttons |

**B12 was two defects, not one.** The columns sat on `.rc-passage-col`, which is
the scroll container and therefore height-constrained. A multi-column box that
cannot grow down grows sideways: at 375px the pane's `scrollWidth` was **2856px
against a 357px frame**, so Passage Only was a horizontal scroller at every
width, not only a two-column one. `column-count: 1` does not fix that — any
column property makes the element a multicol container and it still overflows
inline. The columns moved onto the inner text, whose height is free. Measured
after, across 375 / 680 / 900 / 1440: one column below ~900, two above, no
horizontal overflow anywhere, page `scrollWidth` equal to the viewport at all four.

**New finding, not in the audit, for B1's decision.** The reading measure is
~78 characters per line at 17px and ~80 at 19px. The `52ch` cap is doing its
job (`max-width` computes to exactly 52ch) but 52ch of Fraunces is 573px, not
the "~68 real characters" `OfficialQuestionPane` claims — so both players run
above the 45-75 band the same comment cites. **The size change does not move
this**: the cap scales with the font, so 17px and 19px land within two
characters of each other. The measure is a separate decision from B1 and is
left for Joshua.

---

## 4. Order of work **[v3: de-duplicated per Codex]**

Tests first, because the state-machine fixes below are exactly the class of bug that shipped last night without one. v2 split the hydration work across steps 2 and 3, which was circular; it is one step now.

1. **Failing tests** — hydration (first-vs-review partition, stale cancellation, mode-specific resume), pause gating, keyboard navigation and selection, blind-review gating, and write-failure handling. D6: the blind-review state machine has *zero* coverage today; `rcSession.ts` has no test file at all.
2. **The hydration projection, complete** — A3, A5 and A10 in one change: partition on `is_first_attempt`, derive `answers` / `recorded` / eliminations / `revealed` / `reviewedPassages` from the first-attempt map by reveal mode, and add the session-generation guard.
3. **A1 + A2** — the guarded selector, the `eliminationDisabled` split, the elimination-vs-second-pick styling conflict, and modal-safe keyboard gating.
4. **A4, A6, A7, A8** — the remaining gating fixes and the session-identity reset.
5. **A11** — writes report success or failure, and the UI stops claiming saved work it does not have.
6. **B2** (delete the badge), **B7+B6** (the banner), **B3** (the complete Help path).
7. **B12** — make Passage Only responsive. **[v3]** The fallback keys off the pane's actual available width, not the viewport, so the sidecar-docked case is covered.
8. **B1** — decide the type scale from the viewport × accessibility-scale matrix. **Joshua's call.**
9. **B5** (hexes → tokens), **B11** (LR's missing label), **B4** (Exit copy).
10. **D3** — finish or remove Find.
11. Separate commit: **D1, D2, D4, D5** hygiene.

Every step verified in the running app before the next starts. `npm run typecheck` and `npx vitest run` clean before any push, and the full responsive matrix before any push that touches layout.

---

## 6. Split out of this plan **[v3]**

**A9, the attempt-classification invariant.** Codex's fix is right and it is a production Postgres migration: normalize existing duplicate `is_first_attempt` rows (rank by `created_at, id`, demote all but the earliest), add a partial unique index on `(session_id, question_id) where is_first_attempt`, then replace `recordAttempt` with an idempotent `recordFirstAttempt` and an append-only `recordReviewAttempt`.

It is split out because **nothing above depends on it.** The hydration partition reads `is_first_attempt` as it stands, the same way `RcResults` already does. The race it closes is a rare double-submit. Shipping a schema change against live student data as part of a UI parity pass is the wrong bundle, and it needs its own backup, its own dry run against a copy, and its own gate.

---

## 5. Out of scope

- **RC analytics.** They do not exist and are currently labelled honestly. Building them is a project, not a cleanup.
- **The hub asymmetry** (LR: two practice tiles + carousel; RC: three + history). Flagged last session; a content decision for Joshua.
- **Restoring the LR/RC switch to the runners.** Removed on Joshua's "why is LR there?"; a parallel session had added it the day before. Left removed until he rules.
- **The RC bank, question data, or explanations.** Untouched by every step above.
