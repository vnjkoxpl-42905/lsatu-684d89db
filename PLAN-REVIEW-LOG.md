# Plan Review Log: Conditional Rephrase (The Switchyard) — build plan to 100

Started 2026-08-23, session start. MAX_ROUNDS=1.
Plan under review: `docs/plans/2026-08-22-conditional-rephrase-build-plan.md`, copied to `PLAN.md` for the review.
Source audit: `docs/audits/conditional-rephrase-activity-audit-2026-08-22.md` (graded 72/100).

Reviewer: Codex CLI 0.146.0, model `gpt-5.6-sol`, `model_reasoning_effort=high` (overridden up from the config default of `low` because a single round makes critique depth the whole value). Sandbox: read-only, enforced explicitly.
Roles: Codex is a read-only critic. Claude implements. No code is written during the loop.

## Round 1 — Codex

_Model `gpt-5.6-sol`, reasoning effort high, read-only. Thread `01a02ccc-2691-73d3-b700-28c5aff233aa`._

The plan is not safe to implement as written. Stage 2 can assign false verdicts to credited answers, Stage 3 has no coherent persistence model, Stage 4 cannot represent the full bank, and Stage 1’s route inventory is incomplete.

## 1. Blocker: Stage 2 is not a sound grader

The central claim is WRONG. `parseRouting()` is a display parser for one authored format, not a semantic free-text parser. It accepts only `If X, then Y`, including the comma and the word “then”; the rubric explicitly allows free wording and either logical direction. [routing.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/routing.ts:26) [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:10)

Concrete failures:

- An exact credited contrapositive can be marked `partial: reversal`. Item 1’s second credited answer is `If not B, then not A`. Compared against the first answer’s `A → B`, `diagnose()` sees the clauses crossed and returns reversal before checking polarity. That means an answer copied verbatim from `credited_answers[1]` receives a false verdict. [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:42) [routing.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/routing.ts:187)

- Item 48 is biconditional and explicitly credits the converse. A student writing “If every fixture is shielded, then certification is granted” would again look like a reversal to `diagnose()`, despite the authored explanation saying that direction is credited. [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:510) [routing.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/routing.ts:194)

- Items 46 and 47 encode “not both,” where either direction is valid and both directions are authored. The same generic reversal rule would falsely penalize the second direction. [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:489) [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:499)

- A student who follows the displayed instruction and writes both sentences in one response is mis-parsed. The regex takes everything after the first `then` as one `thenClause`; negation in the second sentence can then produce a false `dropped-negation` diagnosis against an otherwise correct answer. `parseRouting()` has no sentence splitting or two-routing representation. [routing.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/routing.ts:26) [routing.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/routing.ts:68) [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:18)

- Correct forms such as `If X, Y`, `Y if X`, `Whenever X, Y`, `X → Y`, or a shorthand contrapositive are rejected. Even the bank contains accepted `If X, Y` answers without “then” and shorthand such as “Tank fine, pumps cycled.” [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:62) [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:259)

- Ordinary semantic paraphrases parse but do not match. `differs()` requires the normalized token sequence to be identical; it has no stemming, synonym handling, reference resolution, or tense normalization. “Fans are running all night” versus “fans run overnight” therefore falls back despite being permitted by the rubric. [routing.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/routing.ts:152) [routing.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/routing.ts:215)

- `diagnose()` can award `partial` to a substantially wrong answer. For item 18, “If the generator is refueled by dusk, then bananas dance” gets an exact content alignment on the first clause, reaches `straight >= 1`, and returns `dropped-negation` before noticing that the outcome is unrelated. The authored rubric says an unsupported relationship is `incorrect`. [routing.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/routing.ts:187) [routing.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/routing.ts:199) [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:15)

The proposed API is also incomplete. `diagnose() === null` means both “clean” and “too different to classify”; the existing tests explicitly pin both meanings. The proposed `LocalVerdict` does not explain how a parseable but unclassifiable answer becomes `unparsed`. [faults.test.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/faults.test.ts:13) [faults.test.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/faults.test.ts:42) [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:176)

The model-call savings claim is internally contradictory. Stage 2 says correct and partial answers still call the model for prose, so it does not produce “60-70% fewer model calls.” It merely changes the prompt and makes the call asynchronous. [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:189) [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:172)

Safer design: use a local fast path only for high-confidence exact matches against every credited logical direction. Send everything else, especially all partial classifications, to the Coach. Run `diagnose()` in shadow mode and record disagreements before making it authoritative.

## 2. Blocker: Stage 4 cannot model several bank items

The negation-stripping premise is WRONG. `isNegated()` returns only a boolean. It does not return a matched span, and generic `no + noun` is detected through a separate regex outside `NEGATIONS`. There is no existing “same operation” that can be reused to derive `core`. [routing.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/routing.ts:30) [routing.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/routing.ts:52) [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:269)

Bank-specific breakage includes:

- `cannot yet climb` becomes something like `cubs yet climb`; `cannot be amended` becomes `bids be amended`. Removing the negative modal does not recover the positive modal. [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:339) [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:369)

- Item 46’s clause is the ellipsis `the string quartet is not`. Stripping `is not` leaves no predicate, so neither `[string quartet]` nor `NOT [string quartet]` is a meaningful proposition. [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:489)

- Item 59 uses `no trace of taint`. The generic `no` detection has no matched `NEGATIONS` span for the proposed stripping algorithm. [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:619) [routing.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/routing.ts:53)

- Item 61 uses lexical negation, `lack impulsive onsets`, which `isNegated()` treats as positive. The proposed model therefore does not actually separate this clause’s content from polarity. [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:639) [routing.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/routing.ts:30)

- Item 62 is two linked conditionals. `parseRouting()` incorrectly turns the whole second conditional into part of one `thenClause`; swapping two capsules cannot express the authored chained contrapositive. [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:649) [routing.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/routing.ts:68)

The proof is unbuildable as written. The plan acknowledges that only 13 second answers parse as `If X, then Y`, then proposes testing all 62 derived flips against the authored contrapositive’s two polarities without defining a parser or oracle for the other 49. [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:23) [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:292)

Calling the rails a diagram does not resolve scope. `NOT [both X and Y]`, `NOT [X rather than Y]`, and `NOT [lack X]` require explicit proposition boundaries. The bank needs a human-reviewed logical AST or authored display atoms, including an array of edges for item 62. That conflicts with the plan’s promise not to touch item content. [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:7) [conditional-rephrase.json](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/content/conditional-rephrase.json:589)

## 3. High: Stage 1’s route inventory is incomplete

Removing the catch-all provider without additional wrappers breaks these live paths:

- `/drill`, through `DrillContent`. [App.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:405) [Drill.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/pages/Drill.tsx:122)
- `/classroom/drill` when its launcher panels mount. [App.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:469) [AcademyMainhub.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/pages/AcademyMainhub.tsx:149)
- `/journal/:qid`. [App.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:495) [JournalViews.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/JournalViews.tsx:236)
- `/flagged/:qid`. [App.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:487) [FlaggedViews.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/FlaggedViews.tsx:251)
- `/teacher/library/guided-drills`. [App.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:625) [DeskLibrarySurface.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/pages/teacher/desk/DeskLibrarySurface.tsx:109) [DeskLibraryGuidedDrillsSurface.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/pages/teacher/desk/library/DeskLibraryGuidedDrillsSurface.tsx:21)
- `/teacher/library/homework/:setId`, through `QuestionMultiPicker`. [App.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:620) [TeacherHomeworkDetail.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/pages/teacher/library/TeacherHomeworkDetail.tsx:190) [QuestionMultiPicker.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/components/homework/QuestionMultiPicker.tsx:30)
- `/bootcamp/principle-flaw` when the Practice tab mounts. [App.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:777) [Practice.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/bootcamps/principle-flaw/components/Practice.tsx:210)
- `/bootcamp/fallacy-flaw`, including its initial Home and Guided Drills surfaces. [App.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:784) [Home.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/bootcamps/fallacy-flaw-v2/components/Home.tsx:137) [GuidedDrills.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/bootcamps/fallacy-flaw-v2/components/GuidedDrills.tsx:24)
- `/bootcamp/intro-to-lr/hard-sentences/capstone` when its explanation modal opens. `LRQuestionModal` calls the bank hook even in inline mode. [App.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:772) [routes.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/bootcamps/main-conclusion/routes.tsx:320) [LRQuestionModal.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/components/drill/shared/LRQuestionModal.tsx:71)

The admin homework, admin guided-drill, and two public guided-drill routes are already individually wrapped. [App.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:293) [App.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:342) [App.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:380)

The claimed “one nested layout route” is not enough. `/activities` shares the persistent `ClassroomLayout` tree with several consumers. Wrapping that whole tree reloads the bank on `/activities`; selectively wrapping its children requires additional pathless layouts, while full-screen and bootcamp consumers live elsewhere. [App.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:454) [App.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:522)

## 4. Blocker: Stage 3 has no coherent scoring or replay model

The schema stores only one percentage. It has no judged count, total count, or scoring-version column, so the proposed denominator cannot be displayed or audited later. [20260614205124…sql](/Users/joshuaf/ai-os/projects/lsatu/supabase/migrations/20260614205124_c7587ecf-bf12-4d97-93aa-071befbd42e4.sql:60)

Existing completed assignments keep their stored score and the runner deliberately displays that stored value. The Activity card also displays only a bare percentage. Old total-denominator scores and new judged-only scores would therefore be indistinguishable. [ActivityRunner.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/components/ActivityRunner.tsx:330) [ActivityCard.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/components/ActivityCard.tsx:78)

The replay proposal is contradictory:

- Today a null verdict resolves the item. [progress.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/progress.ts:62)
- The last item completes the assignment regardless of whether its verdict was null. [ActivityRunner.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/components/ActivityRunner.tsx:283)
- A completed assignment opens directly to the summary before any retry branch. [ActivityRunner.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/components/ActivityRunner.tsx:192)

Therefore “offer it again on next open” is false unless completion semantics change. If null becomes unresolved but the student is allowed to continue, the replay algorithm’s resolved-prefix invariant is broken, and later answered rows are ignored when replay stops at the earlier unjudged item. [progress.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/progress.ts:3) [progress.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/progress.ts:58)

The plan also does not define the score for zero judged items. Returning `0%` would repeat the same false judgment it is trying to remove. [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:225)

Required decision: either keep the assignment `in_progress` until all items are judged, or persist numerator, judged denominator, total items, and scoring version. A bare percentage is insufficient.

## 5. High: the sequence misses hard dependencies

- Stage 2 cannot precede the contrapositive-credit decision. The plan says Stage 2 must know that answer, but puts the decision’s content update in Stage 11 after Stage 2. [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:199) [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:387) [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:455)

- Stage 2b conflicts with first-attempt partials. The runner considers a world “answered” only after `onResolved`; a first partial is deliberately not resolved because the student gets another attempt. Routing immediately therefore either removes the retry or requires a new state distinct from `resolved`. [ActivityRunner.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/components/ActivityRunner.tsx:121) [ActivityItemView.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/components/ActivityItemView.tsx:92)

- Stage 4’s 1.2-second flip conflicts with Next being available as soon as the item resolves. Stage 6’s Enter-to-continue makes skipping the animation and pending prose even easier. [AnswerPanel.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/components/AnswerPanel.tsx:101) [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:284)

- Stage 5’s outbox needs idempotency and replay ordering before Stage 10 parallelizes loading. The response table has no uniqueness constraint or client idempotency key, so retries can insert duplicate attempts. [20260614205124…sql](/Users/joshuaf/ai-os/projects/lsatu/supabase/migrations/20260614205124_c7587ecf-bf12-4d97-93aa-071befbd42e4.sql:150) [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:302)

- Stage 11 says a same-shaped migration will update instructions and resnapshot unstarted assignments, but the referenced migration copies only `items`. Updated task/rubric instructions would remain stale in existing unstarted snapshots. [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:389) [20260822190000…sql](/Users/joshuaf/ai-os/projects/lsatu/supabase/migrations/20260822190000_conditional_rephrase_ladder.sql:666)

## 6. High: deployment, RLS, and trust are under-specified

Stage 0’s command does not deploy a migration. `safe-push.sh` typechecks, fetches, merges, and runs `git push`; it never applies SQL or deploys an Edge Function. This repo’s own deployment documentation says Lovable must apply production migrations and functions separately. [safe-push.sh](/Users/joshuaf/ai-os/projects/lsatu/.claude/safe-push.sh:12) [PHASE6-LOVABLE-DEPLOY.md](/Users/joshuaf/ai-os/projects/lsatu/docs/implementation-plans/PHASE6-LOVABLE-DEPLOY.md:1)

Calling local judging “authoritative” also ignores the current trust boundary. Students may update their own assignment rows, and the immutability trigger protects snapshot fields but not `score`, `status`, or completion timestamps. A modified client can assign itself any score. [20260614205124…sql](/Users/joshuaf/ai-os/projects/lsatu/supabase/migrations/20260614205124_c7587ecf-bf12-4d97-93aa-071befbd42e4.sql:89) [20260614205124…sql](/Users/joshuaf/ai-os/projects/lsatu/supabase/migrations/20260614205124_c7587ecf-bf12-4d97-93aa-071befbd42e4.sql:116)

The response INSERT policy checks only that `student_id = auth.uid()`; it does not verify that the referenced assignment belongs to that student. [20260614205124…sql](/Users/joshuaf/ai-os/projects/lsatu/supabase/migrations/20260614205124_c7587ecf-bf12-4d97-93aa-071befbd42e4.sql:177)

The proposed `decidedVerdict` and `fault` are caller-controlled fields. The plan does not require enum validation or restrict that branch to Conditional Rephrase. Interpolating an unchecked fault into the system prompt also creates a prompt-injection path. [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:191) [activity-coach/index.ts](/Users/joshuaf/ai-os/projects/lsatu/supabase/functions/activity-coach/index.ts:73)

Stage 10’s suggestion to “drop” `auth.getUser()` is not a harmless performance tweak. That call is the function’s authentication check; removing it without replacement admits any request carrying an arbitrary Authorization header. [activity-coach/index.ts](/Users/joshuaf/ai-os/projects/lsatu/supabase/functions/activity-coach/index.ts:63)

## 7. High: tests and observability would not catch the dangerous failures

The Stage 2 proof is self-fulfilling: canonical answer, mechanically reversed answer, and mechanically stripped negation. It omits alternative credited answers, biconditionals, not-both items, multi-sentence submissions, paraphrases, missing “then,” shorthand, and item 62’s chain. [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:209) [routing.test.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/worlds/switchyard/routing.test.ts:11)

The feature-only Vitest gate does not validate the `App.tsx` provider move, Edge Function behavior, migration/backfill, or authenticated production runner. The audit explicitly says the signed-in runner was not exercised. [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:463) [conditional-rephrase-activity-audit-2026-08-22.md](/Users/joshuaf/ai-os/projects/lsatu/docs/audits/conditional-rephrase-activity-audit-2026-08-22.md:31)

The attempt log stores only verdict and response. There is no `judge_source`, parser version, fault, latency, or fallback reason, so a bad local judge cannot be audited or rolled back from production data. [types.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/api/types.ts:96) [activitiesClient.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/api/activitiesClient.ts:69)

The responsive proof is below repository requirements. The plan checks one phone size and two desktop sizes; the project requires narrow, mid, wide, and sidecar-docked verification. [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:351) [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:363) [AGENTS.md](/Users/joshuaf/ai-os/projects/lsatu/AGENTS.md:60)

## 8. Additional under-specified stages

- Stage 10’s summary query cannot continue returning `ActivityAssignment`. `hydrateAssignment()` converts a missing `items` field to `[]`, while the card still reads `assignment.items.length`; without a new summary type and card contract, every card will say `0 items`. [activitiesClient.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/api/activitiesClient.ts:17) [ActivityCard.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/components/ActivityCard.tsx:87)

- Streaming is not a one-line addition. The hook uses `supabase.functions.invoke`, while the Edge Function buffers the upstream response, parses complete JSON, and only then returns it. Both client and server protocols must change. [useActivityCoach.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/hooks/useActivityCoach.ts:36) [activity-coach/index.ts](/Users/joshuaf/ai-os/projects/lsatu/supabase/functions/activity-coach/index.ts:189)

- Stage 12’s re-drill path does not currently accept filtered items. `handlePracticeAgain()` merely resets state, and `items` always comes from the full assignment snapshot. [ActivityRunner.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/components/ActivityRunner.tsx:96) [ActivityRunner.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/components/ActivityRunner.tsx:300)

- Stage 12 has no normalized family key. It proposes aggregating mutable display strings in `category`, including 53 distinct labels, without defining the grouping map, versioning, teacher query, or teacher UI surface. [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:391) [PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:399)

VERDICT: REVISE

### Claude's response — Round 1

I independently verified the load-bearing claims rather than accepting them. **Every claim I checked held.** The verdict is correct and the plan needed material rework, not touch-ups.

#### Accepted, verified by me, and rewritten in the plan

1. **Stage 2 was unsound. This is the big one.** I traced `diagnose()` by hand on item 1 with the authored contrapositive as the student answer:
   `straight = 0`, `crossed = 0.8 + 0.75 = 1.55`, so `crossed > straight && crossed >= 1` fires and returns `{kind: "reversal"}`.
   **A student who types the credited contrapositive verbatim would have been graded `partial: reversal`.** The task field literally asks for that answer. My plan proposed making this authoritative for a graded score, which would have shipped exactly the truthfulness violation Stage 2 claimed to fix. Items 46, 47 and 48 break it the same way: all three author *both* logical directions as credited, and `diagnose()` calls the second one a reversal.
   Also verified: `"If the generator is refueled by dusk, then bananas dance"` on item 18 hits `straight === 1`, skips the `< 1` bail, and returns `dropped-negation` — a nonsense answer graded `partial`.
   Stage 2 is rewritten: exact-match fast path against **every** credited direction, `diagnose()` demoted to **shadow mode** with disagreement telemetry before it is ever trusted, everything else to the Coach.

2. **Stage 4's negation-stripping premise was wrong.** I claimed stripping the negation "is the same operation `parseRouting` already performs". It is not: `isNegated()` returns a bare boolean (`routing.ts:52`), and the generic `no + noun` case is a separate regex outside `NEGATIONS`. Verified Codex's bank cases: item 46's clause is the ellipsis `"the string quartet is not"` (strip it and no proposition remains), item 61 uses lexical negation `"lack impulsive onsets"` that `isNegated()` reads as positive, item 59 uses `"no trace of taint"`.

3. **Stage 1's route inventory was incomplete.** Codex enumerated nine consumer routes. Verified the structural objection: `/activities` sits inside the same `ClassroomLayout` tree (`App.tsx:464`) as `/journal/:qid`, `/flagged/:qid` and `/classroom/drill`, which are all bank consumers. My "one nested layout route" is therefore not sufficient.

4. **`safe-push.sh` does not deploy anything.** Read it: typecheck, fetch, merge, `git push origin main`. No SQL applied, no Edge Function deployed. Stage 0 was materially wrong about what pushing accomplishes.

5. **Stage 10's "drop `auth.getUser()`" would have removed authentication.** `activity-coach/index.ts:68` is the auth check, not a performance tax. Correct and important catch; struck from the plan.

6. **The 60-70% model-call saving was internally contradictory.** I said correct and partial answers still call the Coach for prose, then claimed the calls go away. Both cannot be true. Corrected to what it actually buys: latency masking, not call volume.

7. **Stage 3 had no persistence model.** Verified: `activity_assignments` stores one bare `score` percentage. A judged-only denominator is unrepresentable and unauditable, and old and new scores would be indistinguishable. Also verified the replay contradiction: a null verdict resolves the item (`progress.ts:62`), the last item completes the assignment regardless (`ActivityRunner.tsx:283`), and a completed assignment opens straight to the summary (`:192`), so "offer it again on next open" was false as written.

8. **Missed dependencies, all verified:** Stage 2b conflicts with first-attempt partials (a first partial deliberately does not resolve, so `answered` is false and the world cannot route); Stage 11's migration copies only `items`, so updated instructions would stay stale in unstarted snapshots; the response table has no uniqueness constraint, so Stage 5's outbox needs an idempotency key.

9. **My responsive proof was below this repo's own gate.** `AGENTS.md:60` requires narrow, mid, wide **and** sidecar-docked. I specified one phone plus two desktop widths.

#### New finding Codex surfaced that neither the audit nor I caught

**Item 62 is malformed in the yard today, before any change in this plan.** `parseRouting` is non-greedy on the first clause and anchored on the second, so on item 62 it yields
`THEN = "the flood layer dates to spring; and if the match is trustworthy, then the stratum was sealed"` —
an entire second conditional stuffed into one capsule. Verified by running the regex. This is a live display defect, filed as finding D.

#### Accepted with corrected attribution

**The trust-boundary finding is real but is not caused by Stage 2.** Verified: students can update their own `activity_assignments` rows (`USING student_id = auth.uid()`), and `activity_item_responses` INSERT checks only `student_id = auth.uid()` without verifying the assignment belongs to that student. But the client **already** computes the score and writes it today (`ActivityRunner.tsx:290`). Codex is right that calling local judging "authoritative" is loose language; it is wrong that Stage 2 introduces the exposure. Logged as pre-existing finding E, not as a Stage 2 blocker.

#### Held, with reason

**"The bank needs a human-reviewed logical AST, which conflicts with the promise not to touch item content."** Correct as analysis, wrong as an objection to the plan. Joshua has explicitly reserved item content for himself and is supplying it. The right response is not to break that constraint but to **scope Stage 4 to what is provably safe without authored structure, and route the rest to him as a content decision.** That is what the revision does. Recorded as a decision for Joshua, not as a plan defect.

#### Outcome

MAX_ROUNDS=1 reached. Verdict stands at **REVISE**. This is not a deadlock: there is no material disagreement left between the two models. The plan was wrong in the ways described, I verified each one, and v2 rewrites Stages 0, 1, 2, 3, 4 and 10 accordingly. What remains open are three product decisions that belong to Joshua and that no amount of further review can settle.
