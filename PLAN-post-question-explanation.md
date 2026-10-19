# Plan: post-question Explanation, LSAT Lab shape, AI Tutor off
_Locked via grill-with-docs on 2026-09-12 by Claude + Joshua. Revised after Codex rounds 1 to 5, re-cut after Joshua's clarification (fixed drills: arrows + bubbles, no Submit), revised again after Codex re-cut rounds 1 and 2 (cap), then Joshua's final rulings: no freeze, Explanation never opens the drawer. Terms per `src/components/drill/CONTEXT.md` (Answer, Explanation, Argument Breakdown, Choice Note, Reset Response, AI Tutor, Answer Navigator, Oval State, Drill Launch, Drill Run Spec)._

## Goal

On the official drill surface (`/drill`), the student reviews a question the
way LSAT Lab shows it. The **Answer** pill and the **Explanation** pill in
the session strip are independent on/off toggles, exactly as in Joshua's
LSAT Lab recording: press to show, press again to hide, and nothing ever
locks the choices. Pressing Explanation shows expanders, not prose: a
chevron on a rule under the stimulus that opens the **Argument Breakdown**,
and a chevron at the right edge of every choice card that opens that
choice's **Choice Note**. Everything starts closed and the student opens
what she wants (Joshua's 2026-09-12 LSAT Lab recording, 13:11). The
drawer's Explanation tab shows the same content but only when the student
opens the drawer herself. A **Reset Response**
control clears the pick. A fixed drill (guided drill, small drill, custom
queue) has no Submit pill: its bottom bar is arrows and ovals, as today,
and nothing shows colour until the student presses Answer. The **AI
Tutor** is off for every student behind one switch, because the Question
Explanation is authored LSAT Lab content already in Postgres
(`lr_explanations`, `lr_explanation_steps`, `lr_explanation_choice_notes`)
and the generated chat was failing on screen. Alongside the code change, a
census of every bank question with no authored prose, keyed PrepTest /
Section / Question.

## How picks work today (the model this plan builds on)

Two pick models exist on the official surface and both stay:

- **List drills** (`isPracticeSetMode`, set at `Drill.tsx:556` for every
  `type-drill` with `selectedQids`: guided drills, assignments, saved sets,
  Intro to LR practice sets, Bootcamp practice). A pick is written straight
  into `session.attempts` with an `answerTrail` and `switchCount`
  (`:1345-1375`); changing the pick is a recorded change of mind; the set
  is persisted at the end (`handleFinishSection` / `handleFinishPracticeSet`).
  The bar's Submit pill is already hidden once a pick exists
  (`primaryVisible={!currentAttempted && !currentUnscored}`, `:4308`).
- **Commit drills** (`type-drill` drawn by `filter`, no `selectedQids`): a
  pick sits in `selectedAnswer` and is persisted per question by
  `commitPendingSelection` when the student presses Next, Previous, an oval
  (`:4297-4326`) or Submit.
- **Smart Drill** (`adaptive`): Submit persists per question; Skip; the
  auto-reveal switch. Joshua reports its question selection is broken; a
  separate job, untouched here.

Both fixed-drill kinds already render arrows + `AnswerOvals` in the bar's
`pager` slot (`:4313`). The ovals mean "which question", never "right or
wrong" (Oval State), and that does not change.

## Scope, classified by Drill Launch kind

`DrillRunSpec` carries no `kind` (ADR 0016: `mode` is not the run kind; six
runs share `type-drill`). Add `launchKind: DrillLaunchBody['kind']` to
`DrillRunSpec`, set in `drillRunSpecFromLaunch`, and classify by it with an
exhaustive switch in a pure helper `src/lib/drillReviewPolicy.ts`:

| launch kind | review policy |
|---|---|
| `guided-drill`, `assignment`, `saved-set`, `questions`, `practice-set`, `bootcamp-day`, `filter` | `fixed` |
| `smart-drill` | `adaptive` |
| `section` | `none` (full section keeps today's opt-in reveal) |
| any kind with `sealed` or a practice-test leg (`ptRun`) | `none` |

`reviewControlsAvailable = policy !== 'none' && isOfficialLayout`.

The **pick model** is a second, independent classification, because a
`questions` launch can arrive as `natural-drill` (`Drill.tsx:548`), which
never sets `isPracticeSetMode`:
`pickModel = hasSelectedQidList(spec) ? 'list' : 'commit'`, where
`hasSelectedQidList` is the exact condition at `:556`
(`mode === 'type-drill' && config.selectedQids?.length > 0`), lifted into
the same pure helper. `'list'` is the in-memory-attempt model,
`'commit'` the per-question-persist model. Both are pure functions of the
resolved spec, so an early render can never misclassify a run (the
`isPracticeSetMode` state stays for the existing paths that read it;
classification no longer depends on it).
Declared **after** `session` (`:307`) and `isPracticeSetMode` (`:471`) and
before `handleAnswerSelect` (`:1329`); the `isOfficialLayout` at `:3751` is
hoisted to the same spot and deleted from the render branch.

**Every parent-level change below is branched on
`reviewControlsAvailable`, with today's code as the else branch**; full
section and a sealed assignment get regression tests on both pills.

## Approach

Work on a fresh branch off `main` (`feat/post-question-explanation`); the
current worktree branch `feat/calendar-strip-deeplink` carries 87 modified
files from another session and none of them are touched here.

### 1. One switch for the AI Tutor

- `src/components/drill/aiTutorFlag.ts` exports `AI_TUTOR_ENABLED = false`
  with a comment naming the surfaces it gates and the date.
- The constant gates **mounting and launching**, not just initial state:
  - `renderTutorOverlay` returns `null` when the flag is off, regardless of
    `tutorChatOpen`.
  - `openTutorForCurrent`, the three wrong-answer launch sites
    (`Drill.tsx:1849`, `:1957`, `:2105`) and the fixed-queue submit wrapper
    (`:4261-4283`) all read `AI_TUTOR_ENABLED && tutorMode`.
    `resolveTutorLaunch` gains a required `flagEnabled` argument and
    returns `shouldOpen: false` when it is off.
  - The legacy layout's tutor controls (`:4416-4431`) render only when the
    flag is on.
  - `tutorMode` initial state stays `true`; the flag is the master.
    `tutorToggleVisible` on the frame stays `false` as today.
- `DrillExplanationTab` receives `onAskTutor` only when the flag is on. Its
  no-prose copy becomes: "No written explanation was published for this
  question."
- `renderVoiceCoachChip` returns `null` when the flag is off.
- `TutorChatModal` and the `tutor-chat` edge function are not edited. The
  flag controls the product surface, not the service; a server-side switch
  is a follow-up (see Out of scope).

### 2. Answer and Explanation become independent

Today they are one switch with two reaches (`toggleExplanation` at
`Drill.tsx:3625-3640` hides the Answer when Explanation closes, and opening
Explanation goes through the reveal path; the drawer and Choice Notes also
gate on `currentRevealed`).

- New per-qid state `explanationOpenByQid: Map<string, boolean>`. In the
  `reviewControlsAvailable` modes,
  `explanationOpen = !!explanationOpenByQid.get(qid)` and the explanation
  fetch is enabled by `explanationOpen`; elsewhere both stay
  `notesOpen && drawerTab === 'explanation'` and `currentRevealed`, as now.
  The strip receives `onShowAnswer` / `onExplanation` bound to the new
  handlers only when `reviewControlsAvailable`, else the existing ones.
- `toggleAnswerReveal(qid)`: flips `showAnswerRevealed[qid]` only. Never
  touches the drawer or `explanationOpenByQid`.
- **The pill never touches the drawer, and never asks.** `toggleExplanation(qid)`
  flips the map entry, whatever the pick state: no pick, an uncommitted
  pick, or an attempt. There is **no confirm dialog** on either pill in
  the `reviewControlsAvailable` modes (Joshua, 2026-09-12: "if there's no
  answer committed and you press Answer, it should just show the right
  answer; if you press Explanation, it should show the explanation"). The
  existing `confirmUnscoredReveal` dialog stays only in the else branch
  (full section / sealed / classic). A reveal with no attempt sets
  `answerRevealed` for the qid so the later pick is recorded as made after
  seeing the answer (step 4). It never opens, closes or retabs the drawer
  (Joshua: "they have to click the drawer"; the recording shows the
  sidebar unchanged when Explanation toggles). Same rule for
  `toggleAnswerReveal`.
- **The drawer's Explanation tab is read-only on that state.** Selecting
  it (`onNotesPanelTabChange` at `:4088`) just sets the tab, as today. Its
  content renders when `explanationOpen` is true for the current qid;
  otherwise it shows "Press Explanation to open the written explanation."
  and nothing else. Selecting the tab never turns Explanation on.
- **A pill press never commits a pick.** `pickModel === 'list'`: a pick is
  already an attempt, the press just flips. `pickModel === 'commit'`: the
  press flips and leaves the pick uncommitted; the arrow commits it later
  as today, and because `answerRevealed` is already `true` for the qid the
  persisted attempt carries `answer_revealed: true`. `adaptive`: the press
  flips and silently marks the qid unscored (no dialog); the commit
  handlers refuse a Submit on an unscored qid, as today. In no mode can a
  student reveal, then submit a scored answer.
- `DrillExplanationTab.revealed` and `OfficialQuestionPane.inlineNotes`
  are driven by `explanationOpen`. The Choice Note dropdowns render when
  `inlineNotes` is non-null, independent of `answerRevealed`. Green/red
  colouring is driven by `answerRevealed` alone. The four combinations
  (off/off, Answer only, Explanation only, both) each have a test.
- **Correctness is a fact, colouring is a state.** `InlineChoiceExplanation`
  receives `isCorrect = correctAnswer === key` (factual). The pane's
  existing `isCorrect` (which folds in `answerRevealed`) is renamed
  `showCorrectColour` and used only for colour and the Check/X icon.

### 3. Fixed drills: no Submit pill, no auto-reveal switch, nothing locks

- The fixed-queue `OfficialSmartDrillBar` (`:4255-4330`) stays, with its
  Prev/Next arrows, `AnswerOvals` pager and End. Two props change when the
  policy is `fixed`: `primaryVisible={false}`
  (the Submit pill never shows; arrows and ovals already commit on the way
  out) and `onAutoRevealChange` omitted (the switch is not rendered; the
  `autoReveal` preference is left alone for Smart Drill).
- **One wrapper for leaving a question.** `commitThenNavigate(destination)`
  in `Drill.tsx` replaces the three inline `commitPendingSelection` +
  move blocks (`:4297-4326`) and the End path. The lock is **synchronous**:
  `actionLockRef = useRef(false)` is tested and set before the first
  `await`, and a mirrored `actionInFlight` state exists only to rerender
  the disabled controls. A second arrow, oval or End press while the ref
  is held returns immediately. `commitPendingSelection` returns a
  discriminated result on every path:
  `{ ok: true, attempts }` (persisted, or nothing to persist: `list`
  model, already attempted, unscored, no pick) or `{ ok: false }` (save
  failed). The wrapper moves only on `ok`. `Drill.tsx:2545`
  `handleFinishSection` does not read `selectedAnswer`, so End goes through
  the same wrapper with `destination: 'end'`, which passes
  `result.attempts` to `handleFinishSection`.
  While the lock is held the arrows, ovals, End, both pills, Reset and the
  choices are disabled (the pane gets `interactionLocked`), so the
  committed pick can never differ from the one on screen.
- `answerLocked` and `isRetryAfterWrong` are no longer set by any reveal
  path in the `reviewControlsAvailable` modes (`:1851`, `:1958`, `:1989`,
  `:2113`). They stay legacy-layout concerns.
- `handleAnswerSelect` guard: the `if (!tutorMode && showSolution) return;`
  line becomes `if (!reviewControlsAvailable && !tutorMode && showSolution) return;`.
- `OfficialQuestionPane` gets `choicesStayLive?: boolean` (default `false`).
  When true, choice buttons are disabled only when `isEliminated` or
  `interactionLocked`. `Drill.tsx` passes `choicesStayLive={reviewControlsAvailable}`.
- Cross-out: **Restore is always a real button.** With Answer on, the
  correct choice and the wrong pick show the Check/X verdict icon in the
  3rd grid column (as today); the other three keep their cross-out/Restore
  control there, live. When a verdict choice is *also* eliminated, the pane
  renders a separate labelled `<button aria-label="Restore choice A">`
  (`EyeOff` icon) in the new 4th column, keyboard-focusable; pressing it
  calls `onEliminate(key)`. Test: eliminate the correct choice, turn Answer
  on, Restore is present and works.

### 4. Picks stay live, and the record says the answer was seen

Joshua's ruling: no freeze. After Answer or Explanation has been on, the
choices behave exactly as they did before.

- `list` model: a later pick is a recorded change of mind, as today
  (`answerTrail`, `switchCount`). The attempt already carries
  `answerRevealed`; it is set `true` the first time either pill is turned
  on for that qid, so the record says the answer was seen before the change.
  The Run Record snapshot (`:868-887`) gains an optional `answer_revealed`
  per attempt so that fact survives a refresh (optional field, fallback
  `false`, no migration).
- `commit` model: a later pick on an already-persisted question is dropped
  on leave, as today (`commitPendingSelection` returns early on
  `currentAttempted`). Unchanged.
- `adaptive`: after Submit a click changes the highlighted choice only;
  the commit handlers refuse a second Submit on an attempted qid, as today.
  Unchanged.
- With Answer on, colour follows the live pick: the correct choice is
  green, the highlighted choice is red if it is not the correct one.
- No `practiceByQid`, no `revealedEverByQid`, no `effectiveAnswer`; the
  earlier drafts' practice-state machinery is deleted from this plan.
  `selectedAnswer` and `session.attempts` are the only pick state, as now.

### 5. Reset Response

- `OfficialQuestionPane` gets `onResetResponse?: () => void` and renders a
  right-aligned ghost button "Reset Response" under the `<ul>`, `disabled`
  when `selectedAnswer` is empty or `interactionLocked`. Rendered only when
  the prop is present (i.e. `reviewControlsAvailable`).
- Handler: the existing un-pick path (`handleAnswerSelect` with the
  current answer, `:1333-1343`): `selectedAnswer` cleared; in the `list`
  model the attempt entry is removed and the timer records `''`, which is
  today's recorded change of mind to "no answer". Touches nothing else: not
  the timer's run, `showAnswerRevealed`, `explanationOpenByQid`, drawer,
  journal, or resume. Matches the second recording: pick cleared, Confirm
  greyed, timer still running.

### 6. Persistence is honest and single-flight

- `persistAttempt` (`:1512-1524`) returns a typed result instead of a
  boolean: `{ ok: true } | { ok: false; errorKind: 'auth' | 'network' | 'db' | 'unknown' }`,
  classified inside its `catch` where the error still exists; the
  structured failure event is emitted there. Existing `if (!saved)`
  callers become `if (!saved.ok)`.
- `handleSubmitNonAdaptive` (`:1744-1785`) currently toasts on a failed
  save and still writes `session.attempts` and adaptive stats. Change: on
  `!saved.ok`, toast and `return null` **before** any state write.
- **Every caller honours that null.** `commitPendingSelection` maps it to
  `{ ok: false }`; `commitThenNavigate` (arrows, ovals, End) and the
  `commit`-model pill pre-commit stop there: no move, no completion, the
  question stays with its pick.
- Single-flight lives **inside** `handleSubmitNonAdaptive` (and stays
  inside `commitCurrentAdaptiveAnswer`): `pendingCommitsRef: Map<qid,
  Promise<Map<string, Attempt> | null>>`; a second caller for the same qid
  receives the existing promise; cleared in `finally`. The `actionInFlight`
  lock from step 3 is the single reactive pending state; `pendingCommitQid`
  from the earlier draft is dropped.
- Failure event: `reportCommitFailure({ qid, launchKind, transition, errorKind, deduped })`
  via `console.error` with a structured object (no PII; no user id, no
  answer text). If the repo has an error-reporting sink by build time it is
  used; otherwise `console.error` is the sink and that is stated in the
  code comment.
- Tests: double right-arrow, and right-arrow then End, with a delayed
  `persistAttempt` mock: exactly one `attempts` insert **and exactly one
  navigation/completion** each.

### 7. Argument Breakdown under the stimulus

- New `src/components/drill/official/ArgumentBreakdown.tsx`, props
  `{ data, isLoading, isError, activeStyle, onStyleChange, fontScale,
  open, onToggle }`. **Closed by default.** It renders a centred rule
  (`border-t`) with a small bordered chevron button sitting on the rule
  (`ChevronDown`, `ChevronUp` when open, `aria-expanded`, accessible name
  "Show argument breakdown" / "Hide argument breakdown"), exactly LSAT
  Lab's expander under the stimulus. When open, below the rule: the style
  pills only when `styles.length > 1`, then labelled steps (label on its
  own line, slate-700 600-weight ~0.85 × base; body sans at base size, 1.6
  line-height). The chevron is the only thing on screen while closed, so a
  student can see there is more without being handed it.
- `Drill.tsx` owns `breakdownOpen: boolean`, reset to `false` whenever
  Explanation turns on or the qid changes.
- Shared helper `resolveBreakdownSteps(data, activeStyle)` in
  `useLrExplanation.ts` carries the existing borrow-Standard rule (a
  non-Standard style with zero steps renders Standard's, labelled "same as
  Standard"), moved out of `DrillExplanationTab` unchanged. The rule is
  today's shipped behaviour and the label is honest about it; whether the
  ingest recorded "(same as Standard)" literally is checked during the
  build and noted in the helper's comment either way.
- `OfficialQuestionPane` gets `belowStimulus?: React.ReactNode`. The slot is
  a **sibling** of the stimulus `div`, inside a new left-column wrapper
  `flex flex-col overflow-y-auto`; the stimulus `div` loses only its own
  `overflow-y-auto` and keeps every other class: serif,
  `whitespace-pre-wrap`, `[&>*]:max-w-[52ch]`, padding, highlight handlers.
  The slot has its own `mt-6 px-6 sm:pl-9 sm:pr-8 font-sans
  whitespace-normal max-w-[60ch]`.
- `Drill.tsx` passes `belowStimulus={explanationOpen ? <ArgumentBreakdown …/> : null}`.
- The drawer's Explanation tab stays, rendered from the same data.

### 8. Choice Notes as dropdowns

- `InlineChoiceExplanation` gains `open: boolean` and `onToggle: () => void`.
  Header row (tag chip, "% of students", "Your answer") always renders when
  any of the three exists. The toggle and the prose render **only when
  `note.trim().length > 0`**. A selected choice with no published note gets
  its "Your answer" chip and no dropdown; `isInlineChoiceEmpty` keeps its job.
- **The toggle is a bordered chevron button at the right edge of the
  choice card**, vertically centred with the choice text (`ChevronDown`,
  `ChevronUp` when open, `aria-expanded`, accessible name "Show
  explanation for A" / "Hide explanation for A"), exactly LSAT Lab's
  per-choice expander in the recording. It lives in the 4th grid column
  (the Check/X icon column, shared with the Restore button from step 3);
  when both a Check/X and a chevron apply the icon sits left of the
  chevron. Clicking the chevron toggles the note and never changes the
  pick (`stopPropagation`). The note, when open, renders under the whole
  choice row: tag chip ("Correct", "Out of Scope"), prose, then the "% of
  students" chip, as in the recording.
- `OfficialQuestionPane` owns `openLetters: Set<string>`, reset to
  **empty** whenever `inlineNotes` becomes non-null or the qid changes:
  pressing Explanation shows the Argument Breakdown under the stimulus and
  every Choice Note **closed**, and the student opens the ones she wants
  one at a time (Joshua, 2026-09-12: "doesn't mean they all have to pop
  down"). Turning Explanation off discards the set.
- The "ALWAYS VISIBLE" comment at the top of `InlineChoiceExplanation` is
  rewritten to state the new rule and why.

### 9. Tooltips on the pills

`OfficialSessionStrip`: Answer `title` = "Show correct answer" / "Hide
correct answer"; Explanation `title` = "Show explanations" / "Hide
explanations". Copy from the LSAT Lab recording.

### 10. Census of questions with no authored explanation

- `scripts/missing-explanations-census.mjs`. Loads the service key the way
  `scripts/db-pull.mjs` does, and **pages every table at 1000 rows with
  `Range` headers until a short page**, the same loop `db-pull.mjs` uses.
  Aborts (non-zero exit, nothing written) on any query error or if a table's
  row count disagrees with a `count=exact` head request.
- Reads the bank from `public/data/PT*-LR.json` (156 files).
- **One predicate, two runtimes, one fixture set.** `hasAuthoredProse` (a
  step or choice-note `body` non-empty after `trim()`) is implemented in
  `useLrExplanation.ts` (replacing the row-count `hasAuthored`) and in the
  script. A vitest spec `explanationProse.fixtures.test.ts` runs **both**
  against the same fixtures (`src/lib/__fixtures__/explanationProse.json`:
  empty, whitespace-only, null, mixed-style, note-only, step-only) by
  importing the `.mjs` predicate directly, so they cannot drift.
- Reasons are exactly what the data proves: `not ingested` (no
  `lr_questions` row for the address) or `no authored prose` (row exists,
  nothing passes the predicate). No "video only" label: nothing in the
  schema records a video; the 14 known video-only questions (PT143, PT146
  per the 2026-08-03 migration) are a subset of "no authored prose", noted
  in the report header.
- Output `ai-os/wiki/explanations/MISSING-EXPLANATIONS.md`: summary counts
  (bank total, ingested, with prose, missing by reason), then one table per
  PrepTest, rows `PT · S · Q · question type · reason`, sorted PT, section,
  question. Run once, committed to the vault, not the app repo.

### 11. Tests

- `drillReviewPolicy.test.ts` (new): every launch kind maps to exactly one
  review policy; sealed and `ptRun` runs map to `none`; `pickModel` is
  `list` iff the spec has a selected-qid list, including a `questions`
  launch arriving as `natural-drill`.
- `OfficialQuestionPane.test.tsx`: the four Answer × Explanation
  combinations; Explanation on → breakdown chevron under the stimulus with
  no prose, every Choice Note closed with its chevron showing; breakdown
  chevron opens the steps, again closes them; choice chevron opens one
  note, again closes it, and does not change the pick; new qid closes
  all; a selected choice with no note shows the chip and no chevron; choices stay clickable while `answerRevealed` when
  `choicesStayLive`; everything disabled under `interactionLocked`;
  eliminated correct choice has a working Restore; Reset Response disabled
  with no pick, clears the pick, leaves `answerRevealed` alone.
- `InlineChoiceExplanation`: closed renders header and the toggle, no
  prose; whitespace note renders no toggle.
- `tutorBehavior.test.ts` (new): `resolveTutorLaunch` with
  `flagEnabled=false` never opens, whatever `tutorModeEnabled` is.
- Drill-level, `fixed` + `list` (a guided drill): no Submit pill; pick →
  attempt in session with trail; Answer with a pick flips colour only, no
  dialog, drawer untouched; Answer with no pick reveals at once, no
  dialog; Explanation same, and the drawer stays closed; after Answer on,
  a new pick is a recorded change of mind with `answerRevealed: true`;
  Reset clears the pick and the attempt entry as today; End persists the
  recorded attempts; **remount** restores the attempts and their
  `answer_revealed`; no tutor after a wrong pick.
- Drill-level, `fixed` + `commit` (a filter drill): arrow commits; failed
  save leaves the question in place, writes nothing, emits one failure
  event; double arrow and arrow-then-End each persist once and move once;
  pill with an uncommitted pick flips only, the pick stays uncommitted and
  the arrow then persists it with `answer_revealed: true`; a later pick on
  a committed question is dropped on leave, as today.
- Refresh: reveal Answer on a list-drill question, refresh: the attempt
  comes back with `answer_revealed: true`.
- Drill-level, `adaptive`: reveal via pill on an unsubmitted pick marks
  unscored silently (no dialog) and Submit is refused; after Submit a click changes the
  highlight only and no second attempt is written.
- Drill-level, full section and a sealed assignment: both pills behave as
  before.
- Existing tests asserting the tutor opens after a wrong answer, or that a
  fixed queue renders a Submit pill, are updated.

### 12. Verify in the browser

Preview server, at 1280, 1024 and 390 widths and with the drawer docked:
- A guided drill: bottom bar is arrows + ovals, no Submit; pick B, press
  Answer → B red, correct green, nothing else; Answer again → colours gone;
  Explanation → a chevron on a rule under the stimulus and a chevron on
  every noted choice, no prose yet; open the stimulus chevron → breakdown;
  open B's chevron → B's note; Explanation off → chevrons, notes and
  breakdown all gone; right arrow → oval marks
  answered; back arrow → pick and states as left; Reset Response → pick
  cleared, timer running; pick again → the session map shows the new pick
  with a two-entry trail and `answerRevealed: true`; the drawer never
  opened on its own during any of this; End Drill closes out and the
  `attempts` row count for that user + qid grew by exactly one relative to
  a count taken before the drill.
- A filter drill: same, plus arrow persists per question.
- Smart Drill: its own bar unchanged (Submit, Skip, auto-reveal switch);
  pills, breakdown, dropdowns and Reset work; no tutor after a wrong
  Submit.
- Cold cache first open: with an empty React Query cache, press Explanation
  on a fresh question; the slot shows "Loading explanation…" then the
  content, with no layout jump of the stimulus block.
- A sealed run and a full section: selection and navigation unchanged.
- Computed style of the stimulus `div` (font-family, font-size, padding,
  max-width) identical before and after, read with `getComputedStyle`.
- Screenshots for Joshua.

## Key decisions & tradeoffs

- **Classify by launch kind, not `mode`.** ADR 0016 says `mode` is not the
  run kind; `isPracticeSetMode` is mutable state set mid-init. A synchronous
  policy from the spec is the only thing that cannot misclassify a frame.
- **No freeze, by Joshua's ruling.** The choices stay live after a
  reveal. The reveal-then-switch case Codex raised is handled by the
  record, not by the UI: the attempt carries `answerRevealed: true` and the
  change-of-mind trail, so a switch after seeing the answer is visible in
  the data. Locking or shadow-tracking the pick was rejected as the rigid
  behaviour this plan exists to remove.
- **The Explanation pill never opens the drawer.** Joshua's ruling and the
  recording. The drawer's tab shows the content only while Explanation is
  on and is otherwise an honest placeholder.
- **One synchronous action lock, not per-qid pending state.** A ref is
  tested before the first `await`; state only rerenders the disabled
  controls. One question is on screen at a time.
- **`answer_revealed` is persisted.** The fact that the answer was seen
  must survive a refresh or the record lies.
- **Fixed drills keep their bar.** It already has the arrows and ovals; only
  the Submit pill and the auto-reveal switch go.
- **Flag gates mounting, not just state.** Round 1 showed the state-only
  version leaked through the legacy controls.
- **Answer and Explanation decoupled at the state level**, only in the
  `reviewControlsAvailable` modes, with today's code as the else branch.
- **Failures stop the caller chain and are reported structurally.**
- **Pane changes are opt-in props.** `choicesStayLive`, `belowStimulus`,
  `onResetResponse`, `interactionLocked` all default to today's behaviour.
- **Everything under Explanation starts closed behind a chevron:** the
  Argument Breakdown on a rule under the stimulus, each Choice Note at the
  right edge of its card. Chevron only where there is prose.
- **The pills never ask and never commit.** No confirm dialog, no
  auto-commit of a pick; the record (`answerRevealed`) carries the fact.
- **Census predicate is fixture-tested in both runtimes.**
- **Flag, not deletion** of the tutor. Joshua wants it back later.

## Risks / open questions

- `showSolution` / `showReviewButton` remain referenced by the legacy
  layout; the audit may find the official surface still reads them.
- Breakdown label sizing vs LSAT Lab is a taste call; verify on screen.
- The census needs the service key from `~/ai-os/.env`; if absent it says
  so and exits non-zero.

## Out of scope

- Smart Drill's question selection bug and its bottom bar.
- A server-side kill switch on the `tutor-chat` edge function. Edge
  functions do not deploy from a push on this project (memory: prove a
  function deploy with the build marker), so it is its own change; the
  client flag removes every launch point in the product and that is what
  Joshua asked for.
- `TutorChatModal`, token budgeting.
- Sealed runs, practice-test sittings, full-section mode, the classic
  `DrillTopBar` layout: behaviour preserved.
- Reading Comprehension (`RcChoiceDisclosure`) and the Classroom
  `LRQuestionModal`.
- Video explanations: no toggle, no hosting, no claim.
- Authoring the missing explanations.
