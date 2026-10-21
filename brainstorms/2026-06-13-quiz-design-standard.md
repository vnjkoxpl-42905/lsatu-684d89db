# LSAT U Quiz Design Standard: Brainstorm / Discovery Notes
Date: 2026-06-13 · Goal: Define the reusable quiz design structure, principles, and format for LSAT U (starting with Intro to LR Bootcamp, reusable across all future bootcamp quizzes). Output becomes the official quiz design standard `.md` in the LSAT U project.

## Status
Interview in progress (grill-me). Capture file is the source of truth; updated after every answer.

## Grounding already read (so we don't re-ask)
- `PRODUCT.md` — product purpose, brand voice (warm coach), anti-references, design principles. Key existing mandates relevant to quizzes:
  - "Compute the next step; do not present a grid."
  - "Truthfulness over performance" (no fake analytics, honest empty states).
  - Drills/Labs principles 11–14: reveal teaches the weakness (not just the answer); FirstSentenceVsRebuttal is the craft bar; a lab is a built surface not a list row; calibration not gatekeeping ("Re-run open," never "Failed").
- `DESIGN.md` — the unified **drill/lab** visual system: near-monochrome graphite palette, near-white surface, system sans, restrained Apple motion, fixed drill anatomy (top bar, header, stimulus card, options, reveal/teach block, footer, end-of-set review with KPI + "where it slipped" + answer key).
- Existing quiz-ish surfaces in code: `IndicatorPopQuiz` (inline lesson pop quiz, warm-serif cream skin), `QuizCard` (fallacy-flaw), `DrillVerdict`, `InteractiveDrillRunner`, end-of-set review patterns.

## Open question driving Q1
Does "quiz" mean a NEW surface distinct from the existing drills/labs and inline pop quizzes, or a unification/renaming of them? This sets the scope for everything downstream.

## Summary / key decisions
(running synthesis, updated as we go)

- **D1 — Scope:** A quiz is its OWN standard. Do NOT unify drills + pop quizzes + quizzes in this doc. (Confirmed Q1.)
- **D2 — Definition:** A quiz is a *structured comprehension check that follows a lesson.* More formal than a quick in-lesson pop quiz; structured and intentional; scored/reviewable; focused on lesson comprehension.
- **D3 — Purpose:** Mainly **lesson reinforcement + concept reinforcement** (test whether the student understood and retained what the lesson just taught before continuing). NOT primarily gate-progression, spaced review, or an end-of-module exam.
- **D4 — Quality bar:** Must feel premium and LSAT U-native. Borrow design quality from the best existing surfaces, **especially the First Sentence vs Rebuttal quiz** in Intro to LR, while staying focused on its core purpose (a structured test that follows a lesson).
- **D5 — Atomic unit is flexible, not rigid.** Format fits the concept. MC is most common but the standard is not MC-locked.
- **D6 — Canonical per-question pattern:** prompt/question/compact stimulus → choose from closed set → one correct answer → immediate right/wrong feedback → explanation immediately or in review.
- **D7 — No fixed option count** (2–N). **Allowed formats:** MC, classify/sort, select-the-part, matching, other closed-response. **Excluded:** free-text/open-response as standard.
- **D8 — Flow (REVISED in Q9):** one question on screen at a time; immediate right/wrong feedback. ~~selection locks on pick~~ → **answers do NOT lock; reattempt allowed.**
- **D9 — Two-tier explanation:** brief useful inline feedback immediately (why right; when helpful why the tempting wrong pulls), then full revisitable explanation in the end review.
- **D10 — REVISED in Q9:** ~~One attempt per question, no retry~~ → **Reattempt IS allowed after a mistake; answers don't lock.** Navigation is NOT gated (skip-ahead allowed). Resume AND pause mid-quiz available. (Scoring reconciliation pending Q10.)
- **D11 — Length:** default ~8–15 questions (shorter only if lesson is very narrow; longer only if several key concepts). Focused, not a full drill/exam.
- **D12 — Order:** fixed authored order, no randomization by default; intentional difficulty ramp (easier → progressively harder → distinctively hardest at the end). Usually one quiz per lesson.
- **D13 — Scoring:** count + percent, first-answer-only, shown at end. Soft ~80% threshold shapes verdict TONE only, never gates. No hard-block, no letter grades, no "failed."
- **D14 — Verdict copy is quiz-specific** (structure borrowed from `DrillVerdict`): strong = "Solid read."; lower = "Worth another pass."; next action = "Review the misses before continuing."
- **D15 — Review anatomy:** verdict block (line + count/percent + next action) → missed questions expanded first (question, pick, correct, full explanation) → full answer-key grid (every item, correct/missed, tap to jump). All items revisitable.
- **D16 — Concept rollup** is lightweight and optional, only when a quiz spans clear sub-concepts; plain labels ("Necessary vs sufficient: 2 missed"), never charts or mastery %.
- **D17 — Retake** allowed but de-emphasized; same authored question + option order (no reshuffle); first-attempt score preserved honestly, retake recorded separately.
- **D18 — Visuals are token-agnostic in THIS doc.** Do not inherit current `DESIGN.md` (it's being reworked separately). Define quiz principles/structure/anatomy + hold the premium FSvR-craft bar; defer exact palette/type/motion tokens to the reworked DESIGN.md. Visual zone (seamless-with-lesson vs distinct test zone) is per-bootcamp context, not a hard rule.
- **D19 — Question-screen required elements:** top bar (quiz label + exit + optional autosave) · progress header (counter + thin bar; "k right" optional/hideable) · prompt/stimulus · options (2–N) · gated inline feedback block · footer advance.
- **D20 — Navigation:** BOTH Previous and Next buttons; answers don't lock; **navigation is NOT gated (skip-ahead allowed)**; resume AND pause mid-quiz available.
- **D21 — Score = first answer only.** Reattempt is formative; it never improves the recorded score; first-answer misses still populate the review.
- **D22 — Wrong first pick withholds the correct option** ("not quite" nudge + reattempt). Full explanation reveals only after the student lands it and in the review. Recommended escape hatch: "Show the answer" after a couple wrong tries (confirm at backstop).
- **D23 — Placement:** quiz is the lesson's closing step, surfaced as the computed next step, available but not hard-locked.
- **D24 — Completion:** "complete" = finished (not passed); finishing advances regardless of score; NO mastery mark / no score-gated badge; always revisitable + retakeable.
- **D25 — Authoring rules:** tests-what-the-lesson-taught · diagnostic distractors (each = a specific predictable misunderstanding) · authored difficulty ramp · explanations carry the teaching.
- **D26 — Stimulus length fits the concept** (NO compact-only cap; a quiz may use a longer/full stimulus when warranted).
- **D27 — All student-facing copy routes through the warm-coach teaching voice.**
- **D28 — Wrong-pick feedback = hint + correction, answer withheld.** Name the misunderstanding, don't name the correct option; allow reattempt. Stimulus length fits the concept (confirmed).
- **D29 — Data captured:** first-answer correctness per question + first-attempt score + completion + retakes stored separately (first attempt never overwritten). Schema is implementation, deferred.
- **D30 — Admin visibility:** Joshua sees real per-student results (lesson, first-attempt score, missed concepts) for coaching; real data only, honest empty states.
- **D31 — No WAJ linkage** in this standard; quizzes are self-contained.
- **D32 — State set:** no-quiz → no dead CTA · loading → quiet skeleton · error → never lose answers + retry · pause/resume → exact question+state · perfect → calm verdict no confetti · low → warm verdict to misses.
- **D33 — A timer RUNS during quizzes** (reverses earlier "no timer").
- **D34 — Timer = count-up stopwatch:** from 00:00, discreet in header, no limit / no auto-submit / no penalty; pausing pauses the timer (real working time); recorded with attempt, shown on review ("Time: 7:42"), visible to Joshua.
- **D35 — Accessibility (WCAG) + mobile are OUT OF SCOPE for this version** of the standard ("don't worry about WCAG or mobile for now"). Deferred, not abolished (app-wide PRODUCT.md floor still exists); layer in later.
- **D36 — Escape hatch CONFIRMED:** "Show the answer" after a couple of wrong reattempts; first-answer miss still stands.
- **D37 — Naming:** quiz is titled after the specific topic of its lesson (bootcamps have multiple lessons; one quiz per lesson, named to the lesson's topic), not a generic "Lesson Quiz."
- **D38 — Audio feedback ALLOWED** for right/wrong and where applicable; keep it restrained + premium (anti-Duolingo), tasteful not arcade.
- **D39 — No question reuse:** each item authored once, lives in exactly one quiz/place.
- **D40 — Images/diagrams in stems** allowed when the concept needs one (text default) — recommended default.

## Reconciliation pass (contradictions checked)
- Q3 "selection locks / one attempt" was REVERSED by Q9/Q10: answers do NOT lock, reattempt allowed, BUT recorded score = first answer only. Now internally consistent. (D8/D10 marked revised.)
- Q5 "first-answer-only score" + Q9 "reattempt" reconciled in Q10/D21: reattempt is formative, never improves score. Consistent.
- Q3 immediate explanation vs Q10 withhold-on-wrong: reconciled — brief inline feedback appears, but on a WRONG first pick it's a hint+correction that withholds the correct option; the full answer-revealing explanation appears after the student lands it and in review. Consistent (D9 + D22 + D28).
- My "no Previous / gated Next / no timer / WCAG+mobile floor" recommendations were all overridden by Joshua (D20, D33–D35). Captured as his decisions.
- No remaining contradictions.

## Q&A log

### Q8 — Quiz structural anatomy (token-agnostic skeleton)
- Asked: confirm required question-screen elements; no Previous button?
- Captured:
  - **Question screen required elements (confirmed):**
    1. Top bar — quiz identity label/eyebrow ("Lesson Quiz" + lesson name) + unobtrusive exit/back; autosave indicator if progress persists.
    2. Progress header — position counter (`Question 4 / 13`) + thin progress bar. Running "k right" is optional and can be hidden to reduce test anxiety.
    3. Prompt / stimulus — question text or compact stimulus, roomy, primary read.
    4. Options — closed set (2–N), resting → selected → locked/correct/wrong states.
    5. Inline feedback block — right/wrong mark + brief two-tier explanation, gated to appear only post-answer.
    6. Footer / advance — clear advance ("Next" / "See results" on last).
  - Review screen (end): verdict block → misses expanded → answer-key grid → exit (from Q6).
  - **Navigation: BOTH Previous and Next buttons during the quiz** (revises my "no Previous" recommendation). Student can page backward and forward through the set. (Exact semantics of Previous re: locked answers -> Q9.)
- Flags: none.

### Q18 — Backstop: escape hatch + missed items
- Asked: confirm "Show the answer" escape hatch? naming / images / audio / question reuse?
- Captured:
  - **Escape hatch CONFIRMED ("1. yes"):** after a couple of wrong reattempts, surface "Show the answer" so a stuck student isn't trapped. The first-answer miss still stands.
  - **Naming:** the quiz is titled after the **specific topic of its lesson** (bootcamps often have MULTIPLE lessons; each lesson's quiz carries that lesson's topic name). NOT a generic "Lesson Quiz." E.g., a "Main Conclusion" lesson → a "Main Conclusion" quiz.
  - **Audio/sound feedback ALLOWED (revises assumed-none):** can be used for right/wrong answers and wherever applicable. (My note: keep it restrained + premium, consistent with the anti-Duolingo / calm bar — tasteful, not arcade. Flagged for the design pass.)
  - **Question reuse = NO.** The same item **cannot appear in multiple quizzes**; each item is authored once and lives in exactly one place.
  - **Images/diagrams in stems (default, not explicitly raised):** allowed when the concept needs one; text is the default. Recommended default, confirm if wrong.
- Flags: audio must stay tasteful/premium (design pass); images-in-stems default unconfirmed.

### Q17 — Accessibility + mobile
- Asked: adopt WCAG 2.1 AA + keyboard + SR announcements? mobile first-class / mobile-first?
- Captured: **Out of scope for now.** "Don't worry about WCAG or mobile for now." This version of the quiz standard does NOT focus on accessibility or mobile responsiveness.
- Flags: PRODUCT.md still sets an app-wide WCAG 2.1 AA floor + desktop/mobile requirement, so a11y/mobile are deferred, not abolished. Layer them in when ready. -> owner: Joshua (later).

### Q16 — Timer semantics
- Asked: count-up vs count-down? pause pauses timer? show on review + to Joshua?
- Captured:
  - **Count-up stopwatch** (informational, builds pacing awareness). Counts from 00:00, shown discreetly in the header.
  - **No time limit, no auto-submit, no penalty.** The number just climbs.
  - **Pausing the quiz pauses the timer** → reflects real working time, not wall-clock.
  - **Recorded with the attempt**, shown on the review screen (e.g., "Time: 7:42"), and **visible to Joshua** as coaching data.
- Flags: none.

### Q15 — States, edge cases, timing
- Asked: confirm full state set; no timer or optional off-by-default timer?
- Captured:
  - **State set agreed:**
    - **No quiz available:** do NOT show a dead "Take quiz" CTA; honest fallback, lesson just ends.
    - **Loading:** quiet skeleton, no blank-screen spinner, no jank.
    - **Save/load error:** never lose answers; hold state + retry on save fail; clear retry on load fail; never a dead end.
    - **Pause/resume:** return the student to the **exact question and state** they left (not a silent restart); clear "Resume" entry.
    - **Perfect score:** calm, premium verdict ("Solid read."), NO confetti/XP/trophies (anti-Duolingo).
    - **Zero/low score:** warm, instructional verdict ("Worth another pass"), never punishing, points to the misses.
  - **TIMER: Joshua WANTS a timer to run during quizzes** (REVERSES my "no timer" recommendation). Semantics still open -> Q16.
- Flags: timer semantics (count-up vs count-down, visible?, auto-submit?, pauses on pause?, recorded?) -> Q16.

### Q14 — Data captured + admin visibility + WAJ linkage
- Asked: capture first-answer + score + completion + separate retakes? admin sees results? feed Wrong Answer Journal?
- Captured:
  - **Persist (intent, not schema):** per question the student's **first answer** + correct/incorrect; the **first-attempt score**; **completion state**; **retakes stored separately** so the first attempt is never overwritten (locks D17/D21). Enough to power resume, the review screen, and later revisit.
  - **Admin (Joshua) visibility = YES.** Joshua can see real per-student quiz results (which lesson, first-attempt score, which questions/concepts missed) to coach from. Real data only; honest empty states when a student hasn't taken a quiz; no fabricated trends.
  - **Student-facing:** student sees their own attempt + review; nothing pretends to be richer analytics than exists.
  - **Wrong Answer Journal: NO.** Quizzes stay self-contained; do NOT wire quiz misses into WAJ in this standard.
  - Note: exact Supabase schema/storage is implementation, deferred (per project rule about not changing DB logic outside a DB-specific task).
- Flags: none.

### Q13 — Clarify garbled fragment
- Asked: confirm stimulus rule; was "withhold which option is correct" a reversal?
- Captured:
  - **Stimulus rule confirmed:** quizzes may use a longer/full stimulus when the concept needs it; no compact-only cap.
  - **Wrong-pick feedback confirmed + refined:** WITHHOLD which option is correct. On a wrong pick, **only give a hint and a correction** — point at the misunderstanding without naming the right option — and allow reattempt. (Reinforces D22; "correction" = name the error, not the answer.)
- Flags: resolved (the fragment was re-affirming Q10, not reversing it).

### Q12 — Question quality + authoring principles + voice
- Asked: confirm authoring/quality rules + distractor rules; route all student-facing copy through teaching voice?
- Captured:
  - **Accepted authoring/quality rules:**
    - Every question tests something the **lesson actually taught** (no out-of-scope trivia / gotchas).
    - **Distractors are diagnostic, not filler** — each wrong option embodies a *specific, predictable misunderstanding* a student might hold after this lesson, so a miss is informative. No throwaway/absurd options.
    - **Authored difficulty ramp** (locks D12): early = recognition/recall; middle = discrimination between close cases; final = hardest application/synthesis.
    - **Explanations carry the teaching:** inline brief (why right; when useful why the tempting wrong pulls); review fuller, naming the transferable takeaway not just the key.
  - **EXCEPTION (revises my proposed rule):** Do NOT bake in "stems must be compact / never use an LSAT-length passage / long passages are drill-exam-only." **Stimulus length fits the concept being tested.** A quiz MAY use a longer or full stimulus when the concept requires it. No artificial length cap. (Consistent with "atomic unit isn't rigid; format fits the concept.")
  - **Voice (confirmed "2. yes"):** ALL student-facing quiz copy (stems, options, feedback, verdict) routed through the warm-coach **teaching voice** before shipping (`lsat-u-voice` skill + vault teaching-voice note). "The argument," not "the stimulus." No spec jargon. Calm, direct, struggle normalized.
- Flags: garbled fragment in Joshua's reply ("is the part these withhold which option is correct") — unclear if he is revising the Q10 "withhold the correct option on wrong pick" decision or if it's a voice-to-text artifact. -> CLARIFY (Q13).

### Q11 — Placement + completion relationship
- Asked: quiz = lesson's closing step, available-not-locked? complete = finished not passed? any mastery-mark case?
- Captured:
  - **Quiz = the lesson's closing step.** Launches at lesson end via clear CTA ("Take the lesson quiz") and is surfaced as the computed next step once the student has worked through the lesson.
  - **Available, not hard-locked.** Positioned after the lesson; does not require 100% lesson completion to open. (Consistent with no-hard-blocking.)
  - **"Complete" = attempted and finished, NOT passed.** Finishing advances the computed next step **regardless of score.**
  - **No mastery marking.** ("2. no") The quiz never marks lesson mastery; there is NO ≥80% checkmark / no score-gated completion badge. Finishing is always enough.
  - **Always revisitable** in review mode (verdict + answer key) from the lesson/module hub; retake available there.
- Flags: (interpretation) "no" read as "no mastery-mark case." If Joshua meant otherwise, revisit.

### Q10 — Reconcile reattempt with honest score
- Asked: score = first answer only? withhold correct option on wrong first pick?
- Captured (CONFLICT RESOLVED):
  - **Recorded score = FIRST answer only.** Reattempt never improves the score. A miss the student later self-corrects still counts as a miss in the gradebook and still appears in the review's "misses." (Preserves Q5/D13 honesty.)
  - **On a wrong first pick, WITHHOLD which option is correct.** Show a brief "not quite" nudge (no answer reveal) and **allow reattempt** = genuine re-thinking, not a free point.
  - Full explanation (which names + explains the correct answer) shows **after they land the correct answer**, and again in the **review screen**. Two-tier model intact.
  - **(Recommended, pending final confirm) Escape hatch:** after a couple of wrong tries on the same question, surface "Show the answer" so nobody gets stuck; taking it reveals the explanation and moves on; the first-answer miss still stands. -> CONFIRM at backstop.
- Flags: escape-hatch "Show the answer" — confirm or drop.

### Q9 — Navigation semantics + resume/pause (REVISES Q3, Q8)
- Asked: Previous read-only? Next gated until answered? Resume mid-quiz?
- Captured (multiple reversals):
  - **Answers do NOT lock. Reattempt IS allowed after a mistake.** A wrong pick does not freeze the question; the student can try again. (REVERSES D8 "locks on pick" and D10 "one attempt, no retry.")
  - **Navigation is NOT gated. Student can skip ahead freely** and is not forced to answer in order; can leave questions unanswered and return. (REVERSES my "Next gated until answered" recommendation.)
  - **Resume mid-quiz AND pause mid-quiz** must both be available.
- **CONFLICT to reconcile (drives Q10):** Q5/D13 said the recorded score is "first-answer-only, truthful." But now reattempt is allowed and answers don't lock. Need to settle: does the recorded score still reflect the FIRST answer only (reattempt = formative learning, gradebook unaffected), or does reattempt change the score? Also: when does the brief explanation reveal the correct answer (revealing it on first wrong pick makes reattempt trivial)?
- Flags: scoring-vs-reattempt reconciliation -> Q10.

### Q7 — Visual system: inherit DESIGN.md or own skin?
- Asked: inherit DESIGN.md graphite/near-white tokens wholesale? quiz in distinct test zone or seamless with lesson?
- Captured (IMPORTANT correction):
  - **Do NOT inherit DESIGN.md as-is.** `DESIGN.md` is **out of date and not what we want.** Joshua will run a SEPARATE `/grill-me` to rework `DESIGN.md`. So this quiz standard must NOT hard-bind to the current DESIGN.md palette/type/motion tokens.
  - This quiz-standard doc should stay **token-agnostic on exact visual values**: define quiz **principles, structure, and anatomy**, hold the **premium / FSvR-level craft quality bar**, and defer the concrete design tokens to the reworked DESIGN.md (to be produced in its own session).
  - **Visual zone is flexible per bootcamp, not a hard rule.** A quiz does NOT have to be styled to blend back into the lesson page, but it CAN feel seamless with the lesson depending on the bootcamp context. Context-dependent, not fixed.
- Flags: **DESIGN.md is being reworked in a separate /grill-me** -> once that exists, the quiz standard's visual layer should reference/align to it. Keep this doc's visual section at the principle/structure level until then. -> owner: Joshua (separate session).

### Q6 — Review / end screen anatomy
- Asked: lead with misses expanded + answer-key grid? per-concept rollup? retake behavior?
- Captured:
  - **Verdict block at top:** quiz-specific verdict line + score (count + percent) + clear next action.
  - **Review leads with missed questions expanded first.** Each miss shows: the question, what the student picked, the correct answer, and the full explanation.
  - **Full answer-key grid:** every question, correct/missed marked clearly, tap to jump to any item's explanation. Misses come first, but ALL questions stay revisitable.
  - **Concept rollup:** lightweight, only when the quiz naturally spans clear sub-concepts. **No fake analytics, no charts, no mastery percentage.** Simple labels only, e.g., "Necessary vs sufficient: 2 missed," and only when actually useful.
  - **Retake:** allowed from the review screen but NOT emphasized over review. Default next action is "Review the misses" or "Continue."
  - **Retake uses the SAME authored question order and option order** — no reshuffle by default (the sequence is intentional).
  - **First-attempt score stays honest.** A retake can be recorded separately but must NOT erase the first attempt.
- Flags: how/where retakes are stored separately -> ties into data/persistence question (later).

### Q5 — Scoring + verdict
- Asked: count+percent display? soft threshold for tone only? never hard-block? reuse drill verdict copy or quiz-specific?
- Captured:
  - **Score = count + percent**, shown clearly at the end (e.g., `11 / 13 · 85%`). **Truthful, first-answer-only.**
  - **Soft threshold ~80%**, used ONLY to shape verdict tone. **Never a hard pass/fail gate.**
  - **No hard-blocking** of progression. A low score never prevents continuing; it changes what the quiz surfaces next: review the misses, revisit weak concepts, then continue when ready.
  - **No letter grades. No harsh language ("failed").**
  - **Quiz-specific verdict copy** (borrow STRUCTURE from `DrillVerdict`, not its exact words). Examples:
    - Strong result: **"Solid read."**
    - Lower result: **"Worth another pass."**
    - Next action: **"Review the misses before continuing."**
  - Net: score honest; framing instructional and calm.
- Flags: none.

### Q4 — Quiz length + structure
- Asked: ~3–8 (target 5) or firmer count? Fixed order or shuffle? One quiz per lesson or clusters?
- Captured:
  - **Default range: ~8–15 questions** (3–8 was too short; these are real comprehension checks).
  - **Shorter** only if the lesson is very narrow; **longer** only if the lesson has several important concepts.
  - Still must stay focused — NOT a full drill or exam — but long enough to check the lesson properly.
  - **Fixed authored order, no randomization by default.**
  - **Usually one quiz per lesson.**
  - **Intentional difficulty ramp:** start easier, move progressively harder, and the final question(s) should be distinctively the hardest.
- Flags: none.

### Q3 — Per-question flow + explanation timing
- Asked: One-at-a-time + lock on pick? Two-tier explanation? Retry on wrong or one attempt?
- Captured:
  - **One question on screen at a time** (not a scrollable list).
  - Student chooses → **selection locks** → **immediately** sees right/wrong (correct=green, own wrong pick=red, others recede, per DESIGN.md convention).
  - **Two-tier explanation:** (1) brief inline feedback immediately after answering — short and useful, says why the correct answer is right and, when helpful, why the tempting wrong one pulls. NOT a long lesson. (2) Full/revisitable explanation again on the review screen at the end.
  - **One attempt per question, then continue. NO retry by default.** The review screen is where the student revisits and learns from a miss.
  - Continue/Next is gated until the question is answered (attempt-before-reveal holds).
- Flags: none.

### Q2 — Atomic unit: what is a single quiz question? (format)
- Asked: Is MC the default with classify/select-the-part as variants, or MC-only? Fixed option count or range?
- Captured: Atomic unit is NOT rigid; it varies by what the lesson tests. MC is most common but the standard is NOT locked to MC. Format must fit the concept.
  - **Canonical per-question pattern:** student sees a prompt / question / compact stimulus → chooses from a **closed set of options** → **one correct answer** → **immediate right/wrong feedback after choosing** → explanation follows **either immediately or in the review**.
  - **No fixed option count.** Some questions 2 options, some 3, 4, or more, depending on quiz type.
  - **Allowed formats:** multiple choice, classify/sort, select-the-part, matching, or another closed-response format if it best tests the lesson.
  - **Excluded as standard:** free-text / open-response (harder to score cleanly, makes the quiz feel less instant).
- Flags: none.
- Note: this also locks feedback as **immediate right/wrong per question**; explanation-timing depth still open (see Q3).

### Q1 — What is a "quiz" vs existing drills/labs/pop quizzes? (scope)
- Asked: Is a quiz a new separate surface or a unification? What is it for in the student journey?
- Captured: Quiz is its own standard for this doc; do NOT unify with drills/pop quizzes now. A quiz = structured comprehension check that follows a lesson: more formal than an in-lesson check, structured/intentional, scored or reviewable, focused on lesson comprehension. Purpose is lesson + concept reinforcement, not gating/spaced-review/module-exam. Must feel premium, borrow from FirstSentenceVsRebuttal quiz, stay focused on "structured test after a lesson."
- Flags: none.

## Open flags (pending input)
- **DESIGN.md rework** (separate `/grill-me`) — once it exists, align the quiz standard's visual layer to the new tokens. Until then this doc stays at principle/structure level. -> Joshua, separate session.
- **Audio feedback** must stay tasteful/premium (anti-Duolingo) — resolve exact sounds in the design pass.
- **Images/diagrams in stems** default (allowed when warranted) — confirm if wrong.
- **Accessibility (WCAG) + mobile** deferred for this version; layer in later against the app-wide PRODUCT.md floor.
- **Interpretation flag (Q11):** "no mastery mark" read from a terse "no" — revisit if misread.

## Interview status: COMPLETE
All branches covered, contradictions reconciled. 40 decisions captured (D1–D40). Next step: turn this into the official `QUIZ-DESIGN-STANDARD.md` for the LSAT U project (awaiting Joshua's go).
