# Conditional Rephrase (The Switchyard) — build plan to 100

**Date:** 2026-08-22 · **Revised:** 2026-08-23 (v2, after adversarial review) · **Author:** Claude (Jay 2) · **Branch:** `main` at `2bc21447` (committed, unpushed)
**Source:** [conditional-rephrase-activity-audit-2026-08-22.md](../audits/conditional-rephrase-activity-audit-2026-08-22.md) — graded **72 / 100**
**Review:** one adversarial round by Codex (`gpt-5.6-sol`, read-only), verdict **REVISE**. Full transcript and my point-by-point response: [PLAN-REVIEW-LOG.md](../../PLAN-REVIEW-LOG.md). Six stages were rewritten as a result; the changes are marked **[v2]** below. Every claim Codex made was independently verified before being accepted.
**Scope:** Conditional Rephrase only. Six of the eleven findings live in engine files shared by all eight Activities; fixing them here fixes them everywhere, which is a side effect of the scope, not an expansion of it. Every stage below is marked `[engine]` or `[switchyard]` so that is never ambiguous.

**Frozen, by Joshua's instruction:** all item content. The 62-item bank, its prompts, its credited answers, its explanations, its Question Types and its ladder order are not edited by any stage in this plan. Joshua is supplying the conditional-logic teaching content and the correction context separately. Stage 11 is the slot it lands in.

---

## 0. Read this before the stages

Three corrections to the audit, and three findings it missed. The plan is built on the corrected picture, not the original one.

### Correction 1 — one accessibility finding was wrong

Audit finding 9, last bullet: *"The credited answer sits in the DOM before it is revealed, veiled by CSS only. A screen reader will read it out."*

That is not true. `SwitchyardStage.tsx:468` sets `aria-hidden={active ? undefined : true}` on the inactive plate, and `switchyard.css:416` applies `filter: blur(7px)` to the plate's text while it is inactive. The credited answer is hidden from assistive technology and unreadable visually. **No work is planned against this bullet.** The other four bullets of finding 9 stand and are Stage 6.

### Correction 2 — the proposed fix for finding 3 does not scale

The audit proposed parsing the authored contrapositive with `parseRouting` and using its clauses for the flipped state. Measured against the bank:

| | |
|---|---|
| Items whose **first** credited answer parses as `If X, then Y` | **62 / 62** |
| Items whose **second** credited answer (the contrapositive) starts `If X, then Y` | **13 / 62** |
| Items whose second credited answer starts `If X, …` (comma, no "then") | **36 / 62** |
| Items whose second credited answer is shorthand or chained prose | **26 / 62** |

So parsing the authored contrapositive covers at best 36 of 62 items even with a relaxed pattern, and item 62's second answer literally opens `"Chained the other way: …"`. A fallback that fires on 26 items is not a fallback, it is the main path. Stage 4 solves this differently, and the difference matters: it is the one place in this plan where the right answer is a small design decision rather than a mechanical fix.

### Correction 3 — the ranking changes *(itself revised in v2)*

The audit named finding 2 (the flip is never performed) "the biggest unclaimed win." It is the biggest *pedagogical* win.

v1 of this plan argued the local judge outranked it. **After review, that claim is narrowed.** The exact-match fast path (Stage 2a) is still the biggest *performance* win and it does make the model unable to contradict the answer key **on the fast path** — but only there, and it no longer closes finding 4 by itself, because the classifier that would have done that is on probation. The honest ranking is now: Stage 1 is the biggest measured win, Stage 4 is the biggest teaching win, Stage 2 is the biggest felt-speed win and the only stage that produces evidence for a future decision.

### New finding A — the author's teaching note is never shown to a student who gets it right

`CoachFeedback.tsx:49` gates the whole reveal block, including `item.explanation`, on `revealed`. `revealed` is `true` only when the student ran out of attempts or pressed Show answer (`ActivityItemView.tsx:88`, `:99`, `:125`). On a **correct** answer, `resolve("correct", false)` — `revealed` is false.

Every item in this bank carries an authored explanation naming the indicator word and the discrimination it teaches: `"Whenever" (sufficient). "Whenever," like "every" and "all," marks the sufficient side.` A student who translates 62 statements correctly never reads a single one of them. The drill's own teaching is withheld from exactly the students who are working it well. Stage 7.

### New finding B — the second credited answer is labelled wrong

`CoachFeedback.tsx:59` renders `item.credited_answers.slice(1)` under the label **"Also accepted:"**. In this Activity, slot 1 is not an alternative phrasing. It is the **contrapositive** — the second half of what the task asks for. On item 62 that renders as:

> Also accepted: Chained the other way: if the stratum was not sealed, the match is not trustworthy; and with no trustworthy match, no confirmed spring dating.

The label is generic engine copy that happens to be true for Negation Station and false here. Stage 7.

### New finding C — a spec contradiction, for Joshua (content, not built here)

> **Closed 2026-08-23.** The task now reads *"Rephrase the statement as If [sufficient], then [necessary], in your own words. The contrapositive counts too, since it says the same thing."* The placeholder no longer re-demands the contrapositive either. Shipped as `20260823130000_conditional_rephrase_task_copy.sql`, with a regression test asserting the task and the rubric cannot drift apart again.
>
> **Decided 2026-08-23 by Joshua: either direction is credited, both are praised.** The rubric wins; `instructions.task` is the field that is wrong. Stage 2's fast path is built on this and credits any authored direction. The task copy still says "Then give me the contrapositive" and now contradicts the grader out loud, so the sentence needs correcting on the live Activity row. Note that the ladder migration writes `items` only and never touches `instructions`, so this is not a line to edit inside it: it is a small `jsonb_set` on `instructions`, of exactly the shape `20260823061500_conditional_rephrase_contrapositive_label.sql` already uses, and it can ride in that file or its own. That edit is content and is Joshua's; it is the one line Stage 11 must not miss.

Two authored fields disagree about what the student is being asked for:

- `instructions.task`: *"Rephrase the statement as If [sufficient], then [necessary]. **Then give me the contrapositive.**"* — both required.
- `instructions.coach.rubric[0]`: *"Either direction is credited. … a student who supplies only one of them has still translated correctly."* — either alone is enough.

Today the Coach follows the rubric, so a student who ignores the second half of the instruction is marked correct. Stage 2's fast path has to know which of these is the rule, and Stage 4's flip changes what the yard is claiming. **This is a decision, not a defect, and it is Joshua's.** See §5.

**[v2] It is also a gate, not a footnote.** v1 scheduled this decision in Stage 11, nine stages after the stage that depends on it. It moves to Stage 0.

### Correction 4 [v2] — Stage 2's original design would have graded correct answers wrong

The first version of this plan proposed making `diagnose()` authoritative for the score. Traced by hand on item 1, with the **authored contrapositive** as the student's answer:

```
straight = alignment(student.if, credited.if) + alignment(student.then, credited.then) = 0 + 0    = 0
crossed  = alignment(student.if, credited.then) + alignment(student.then, credited.if) = 0.8 + 0.75 = 1.55
crossed > straight && crossed >= 1  ->  { kind: "reversal" }
```

A student who types `credited_answers[1]` verbatim would have been graded **partial: reversal**. The task field asks for exactly that answer. Three more items break the same way, because they author *both* logical directions as credited:

| Item | Type | Both directions credited |
|---|---|---|
| 46 | Not both | `brass -> not quartet` **and** `quartet -> not brass` |
| 47 | Not both | both orderings |
| 48 | If and only if | the conditional **and** its converse |

And the classifier is too loose in the other direction: on item 18, `"If the generator is refueled by dusk, then bananas dance"` scores `straight === 1` exactly, skips the `straight < 1` bail-out, and returns `dropped-negation`. A nonsense answer graded **partial**.

`parseRouting` is a **display parser for one authored format**, not a semantic grader. It requires the comma and the literal word "then". The rubric explicitly permits free wording and either direction. Stage 2 is rewritten around that.

### Correction 5 [v2] — the negation-stripping premise was wrong

v1 claimed deriving a positive `core` reuses an operation `parseRouting` already performs. It does not: `isNegated()` (`routing.ts:52`) returns a bare boolean with no matched span, and the generic `no + noun` case is a separate regex outside the `NEGATIONS` list. Verified breakage in the bank:

- **Item 46** — the clause is the ellipsis `"the string quartet is not"`. Strip `is not` and no proposition remains.
- **Item 61** — `"lack impulsive onsets"` is lexical negation. `isNegated()` reads it as positive, so the polarity bit is simply wrong.
- **Item 59** — `"no trace of taint"` reaches negation through the `\bno\s+\w` regex, which has no `NEGATIONS` span to strip.
- **Modals** — `"cannot yet climb"` strips to `"yet climb"`; removing the negative modal does not recover the positive one.

### Correction 6 [v2] — pushing to main does not deploy the migration

`safe-push.sh` typechecks, fetches, merges and runs `git push origin main`. It applies no SQL and deploys no Edge Function. Stage 0 is rewritten.

### New finding D [v2] — item 62 is malformed in the yard today

Neither the audit nor v1 of this plan caught this. `IF_THEN` (`routing.ts:26`) is non-greedy on the first clause and anchored on the second, so item 62's two linked conditionals parse as:

| Rail | Text |
|---|---|
| IF | `the pollen match is confirmed (and trustworthy)` |
| THEN | `the flood layer dates to spring; and if the match is trustworthy, then the stratum was sealed` |

An entire second conditional stuffed into one capsule. **This is live today**, independent of every change in this plan. Verified by running the regex against the bank. Stage 4 handles it.

### New finding E [v2] — the client is trusted with the score, and always has been

Verified in the schema: students may update their own `activity_assignments` rows (`USING student_id = auth.uid()`), the immutability trigger guards snapshot fields but not `score` or `status`, and the `activity_item_responses` INSERT policy checks only `student_id = auth.uid()` without verifying the assignment belongs to that student.

**This is pre-existing, not introduced by anything here** — `ActivityRunner.tsx:290` already computes the score client-side and writes it. It is filed as a finding because v1 used the word "authoritative" about local judging, which is loose language for a client-side check. Server-side scoring is out of scope for this plan and worth its own decision.

### New finding F [v2] — the attempt log cannot audit a judging change

`activity_item_responses` stores verdict, response text and attempt number, and nothing else. There is no judge source, parser version, fault, latency or fallback reason. A local judge cannot be validated, compared, or rolled back from production data without those columns. Stage 2 adds them before it needs them.


---

## 1. The shape of the plan

Two tracks, run as one sequence.

- **Repair** — the eleven audit findings, minus the one that was wrong, plus the two new ones. This is what gets the grade from 72 to roughly 92.
- **Amplify** — six upgrades that are not fixes for anything. This is the last eight points, and it is where the drill stops being a well-built form and starts being the thing that teaches.

Twelve stages. Every stage is independently shippable, independently revertable, and ends with a stated proof. Nothing in the Amplify track weakens anything in Repair; three of the Amplify stages are only *possible* because of a Repair stage, which is why they are sequenced after.

| # | Stage | Track | Layer | Closes | Size |
|---|---|---|---|---|---|
| 0 | Ship the migration, and settle finding C | — | ops | (gate) | 0 |
| 1 | Get the 5.5 MB bank off the Activity path | Repair | `[engine]` | 1 | S |
| 2 | The fast path, and the judge on probation | Both | `[engine]` | 5 (part), F, sc#1 | M |
| 3 | Honest scoring and a real "could not check" state | Repair | `[engine]` | 4 | S |
| 4 | Make the flip true, then scope it honestly | Both | `[switchyard]` | 3, 2, D | M |
| 5 | Never lose a keystroke | Repair | `[engine]` | 6 | M |
| 6 | Keyboard-first and announced | Repair | `[engine]` | 9 | S |
| 7 | Show the teaching that is already authored | Both | `[engine]` | A, B | S |
| 8 | Mobile: the yard as a band | Repair | `[switchyard]` | 10 | S |
| 9 | Intro: put Start where it can be seen | Repair | `[switchyard]` | 11 | S |
| 10 | The performance tail | Repair | `[engine]` | 5, 7, 8 | S |
| 11 | The content slot | — | content | C | (Joshua) |
| 12 | The indicator ledger | Amplify | `[engine]` | sc#10 | M |

S = under a day. M = one to two days.

---

## Stage 0 — Ship the migration *(blocking)* **[v2 — rewritten]**

> **Status 2026-08-24. Applied.** The live `activities` row for this slug reads 62 items, which is this migration's snapshot, so the ladder is what students are running. The paragraph below described the state on 2026-08-23 and is kept for the reasoning, not for the status.
>
> **Status 2026-08-23.** Finding C is settled (above). The migration is still **unapplied**: Stage 1 was cherry-picked to `origin/main` on its own so the app win could ship without deploying the new app in front of the old content, and the ladder commit stays local until Joshua applies the SQL through Lovable. Stage 2 is built and local on the same branch.

`2bc21447` is committed and unpushed. It contains `supabase/migrations/20260822190000_conditional_rephrase_ladder.sql`, which rewrites the live `activities` row for Conditional Rephrase and re-snapshots assignments that have not been started. Until it is applied, the live Activity still serves the **old two-ladder content**, and every stage below is being built against a version of the Activity no student is running.

**v1 of this plan was wrong about how this ships.** `safe-push.sh` typechecks, fetches, merges and pushes. It applies no SQL. Pushing to `main` deploys the *app*; the migration and any Edge Function change are applied separately by Lovable (`docs/implementation-plans/PHASE6-LOVABLE-DEPLOY.md`). So this stage is two steps, not one, and the second is the one that matters.

**Step 1 — check what is in flight.**

```sql
select id, student_id, status, started_at, jsonb_array_length(items) as n
from activity_assignments
where activity_id = (select id from activities where title = 'Conditional Rephrase')
order by created_at desc;
```

Any row with `status <> 'assigned'` is a run in flight; the migration deliberately spares those. If the count is zero, this is risk-free.

**Step 2 — push the app, then apply the migration.**

```bash
bash .claude/safe-push.sh
```

Then apply the migration through Lovable and confirm it ran. A push alone leaves the app updated and the data stale, which is the worst of the three possible states.

**Proof.** The query above returns the new 62-item snapshot for unstarted assignments and the old one for started ones.

> `safe-push.sh` typechecks the working tree, not the committed tree. Before trusting a green run, confirm the tree is clean or check the committed tree in a worktree.

---

## Stage 1 — Get the 5.5 MB question bank off the Activity path `[engine]` **[v2 — inventory added]**

**Finding 1.** The largest measured win in the audit, and a routing change rather than a rewrite.

`src/App.tsx:398` wraps the catch-all in `<QuestionBankProvider>`, so it mounts on essentially every route including `/auth`, `/activities` and `/activities/:assignmentId`. Measured cost paid by all of them: **5,539,562 bytes** raw (1,471,908 gzipped), **111 ms** of blocked main thread, 9-14 extra `PT1xx-explanations.json` fetches, ~58 MB heap. The Activity Centre imports none of it. Confirmed live: `/activities` while signed out redirects to `/auth` and still pulls the whole bank.

### The consumer inventory [v2]

v1 said "grep the consumers" and left it there. That was under-specified for the most breakage-prone change in the plan, and a missed consumer throws at runtime, not at build time. The routes that consume the bank, each verified:

| Route | Reached through |
|---|---|
| `/drill` | `DrillContent` |
| `/classroom/drill` | launcher panels in `AcademyMainhub` |
| `/journal/:qid` | `JournalViews` |
| `/flagged/:qid` | `FlaggedViews` |
| `/teacher/library/guided-drills` | `DeskLibraryGuidedDrillsSurface` |
| `/teacher/library/homework/:setId` | `QuestionMultiPicker` |
| `/bootcamp/principle-flaw` | `Practice` tab |
| `/bootcamp/fallacy-flaw` | `Home` + `GuidedDrills` surfaces |
| `/bootcamp/intro-to-lr/hard-sentences/capstone` | `LRQuestionModal`, which calls the hook even inline |

Already individually wrapped, and untouched by this stage: the admin homework route, the admin guided-drill route, and the two public guided-drill routes at `App.tsx:380` / `:387`.

### The structural problem [v2]

**One nested layout route is not enough.** `/activities` sits inside the same persistent `ClassroomLayout` tree (`App.tsx:464`) as `/journal/:qid`, `/flagged/:qid` and `/classroom/drill`, which are all consumers. Wrapping that tree reloads the bank on `/activities` and achieves nothing; wrapping only some of its children needs additional pathless layout routes inside it. And the bootcamp and full-screen consumers live outside that tree entirely.

So the shape is: **pathless `<Route element={<QuestionBankProvider><Outlet/></QuestionBankProvider>}>` groups in each of the three places consumers cluster** — inside `ClassroomLayout`, around the full-screen drill routes, and around the bootcamp routes — rather than one group at the top.

**Safety net.** Give `useQuestionBank()` a named error that says which route is missing its provider, instead of the generic context-undefined crash. That converts the failure mode from a white screen to a message that names the fix.

**Proof.** `/activities/:assignmentId` with the network panel open: zero requests for `_bank.generated.json` or `PT1*-explanations.json`. Then **every route in the table above**, each confirmed still loading the bank and rendering. This is nine checks, not one, and the stage is not done until all nine pass.

**Moves:** Performance 55 → 78.

### As built — 2026-08-23 **[deviation from this stage as written]**

Shipped, but **not by the method above.** Writing the per-route providers meant answering "which routes need the bank", and that question turned out to have no reliable answer: **24 modules read the `questionBank` singleton directly without ever calling `useQuestionBank()`** — `/analytics`, the blind-review components, the principle-flaw bootcamp libraries, `useStudentAnalytics`, `adaptiveEngine`. Route-level provider placement would have had to enumerate the transitive closure of all of them, and **a miss renders a page with silently empty questions**, which is worse than the crash the safety net was designed to catch. My own inventory had already found two consumers Codex's nine-route list missed (`FlawDrillLauncher`, `JournalEntrySurface`), which is the evidence that enumeration was the wrong instrument.

So the provider stays exactly where it is and instead **skips the fetch on a denylist of verified bank-free prefixes** — `/activities`, `/activity-lab`, `/auth` — re-evaluated on every navigation. The safety property inverts and becomes provable: any route *not* named in the list keeps byte-for-byte the behaviour it had before, so the change cannot silently break a page it does not mention. Both denied subtrees were verified by grep to import neither `questionLoader` nor `useQuestionBank`.

Measured on the same route, back to back, in one session:

| Code | `/activity-lab` |
|---|---|
| Before (stashed) | bank fetched, **5.28 MB decoded, 1,304 ms** |
| After | **no bank fetch** |

`/activities` while signed out redirects to `/auth` with **zero** bank fetches, which is the exact case the audit measured starting at t=1232 ms. `/drill` still triggers the load. The Activity Lab renders correctly (screenshotted).

**What this does not deliver:** the audit's win for *other* non-consumer routes (`/schedule`, `/booking`, `/inbox`, most of `/teacher`). A denylist only helps the routes it names. Per-route providers remain the right end state, and the honest precondition for writing them is migrating those 24 direct singleton readers onto the hook first. That is now its own piece of work, not a footnote inside this stage.

**Proof status.** The route gate is asserted mechanically for all 21 paths (5 denied, 16 consumer) in `src/contexts/QuestionBankContext.test.tsx`, plus a first-render regression guard and a bank-free → consumer navigation case. Live proof covers the Activity routes and `/drill`. **The remaining consumer routes were not exercised signed-in** — they redirect to `/auth` without an account, and the audit already records that the authenticated runner has never been exercised. The unit gate covers the routing decision; it does not cover those pages rendering.

---

## Stage 2 — The fast path, and the judge on probation `[engine]` **[v2 — redesigned]**

**Audit supercharge #1**, rebuilt after the review demolished v1's version of it. The value is still real. The authority was not.

### What changed and why

v1 proposed making `diagnose()` authoritative for the graded score. Correction 4 shows what that does: a student typing the credited contrapositive gets **partial: reversal**, and a nonsense answer on item 18 gets **partial: dropped-negation**. `parseRouting` is a display parser for one authored format; the rubric permits free wording and either direction. Making it the grader would have shipped the exact truthfulness violation the stage claimed to fix.

The fix is to split the idea in two and give each half only the authority it has earned.

### 2a — The exact-match fast path *(authoritative, safe)*

Parse **every** credited answer for the item, not just the first. If the student's normalized routing matches **any** credited direction, that is `correct`, decided locally, in under a millisecond.

```ts
export function matchesAnyCredited(item: ActivityItem, response: string): boolean
// parse each of item.credited_answers that parses; compare the student's
// routing against every one; any match is a match.
```

This is safe precisely because it makes no inference. It only recognises an answer the author already wrote down. It correctly handles items 46, 47 and 48, whose second credited answer is a *different logical direction*, and it correctly handles a student who answers with the contrapositive alone.

What it buys:

- **Instant `correct` on the common case**, with no model call and no spinner.
- **The model cannot contradict the answer key on the fast path**, because the model is not consulted.
- **Fewer model calls** — real savings this time, because the fast path returns without asking for prose. (v1 claimed 60-70% fewer calls while also saying every correct answer still called for prose. Both could not be true. Corrected.)

What it does **not** do: recognise a correct paraphrase. `differs()` compares normalized token sequences with no stemming, synonyms or tense handling, so *"fans are running all night"* against *"fans run overnight"* falls through. That is fine — **falling through means asking the Coach**, which is the safe direction to fail in.

### 2b — `diagnose()` in shadow mode *(no authority, telemetry only)*

Ship the classifier disabled. On every Coach-judged submission, run `diagnose()` alongside, and record what it *would* have said next to what the Coach *did* say. Nothing student-facing changes.

That requires finding F's columns on `activity_item_responses`:

| Column | Why |
|---|---|
| `judge_source` | `fast-path` / `coach` / `fallback` |
| `shadow_fault` | what `diagnose()` claimed, or null |
| `parser_version` | so a rule change is attributable |
| `latency_ms` | so the speed claim is measured, not assumed |

After enough real submissions, the disagreement rate is a number rather than an argument, and the decision to promote `diagnose()` to authoritative — for `partial` only, never for `correct` or `incorrect` — becomes evidence-based. **That promotion is explicitly not in this plan.** It is a later decision that this stage exists to inform.

### 2c — Route the yard on the fast path only

Once a fast-path `correct` is known synchronously, the capsules can couple the instant the student submits. Perceived latency goes to zero on the answers that earn it.

**One constraint the review caught:** the runner treats a world as `answered` only when `verdicts[order] !== undefined`, and a **first-attempt partial deliberately does not resolve** (`ActivityItemView.tsx:92-101`) because the student still has an attempt left. So 2c applies to fast-path correct answers only. Routing the yard on an unresolved partial would either eat the retry or need a new phase distinct from `resolved`, and neither is worth it here.

### Still open, and it gates this stage

The fast path needs finding C's answer — is the contrapositive required, or is either direction enough? See §5. **Sequencing consequence: this decision cannot wait for Stage 11.** v1 put the decision's content update after Stage 2 while also saying Stage 2 depends on it. The decision moves to Stage 0, ahead of everything.

**Proof.** A table-driven suite over all 62 items asserting: every credited answer for an item matches the fast path for that item (this is the test v1 got wrong — it only checked `credited_answers[0]`); items 46, 47 and 48 match on **both** authored directions; item 1's contrapositive matches; the item 18 `"bananas dance"` case does **not** reach a verdict locally and goes to the Coach. Then a live submission showing the yard routed with no completed network request.

> **Built 2026-08-23.** 2a and 2c shipped; 2b ships its columns as `20260823060000_activity_response_judge_telemetry.sql`, and the client writes the attempt without the telemetry if that migration has not been applied yet, so an unapplied migration costs measurement rather than a student's attempt. `diagnose()` remains disabled for scoring, exactly as designed.

**Moves:** Performance 78 → 88. **Correctness: unchanged at 68 by this stage**, because the fast path only confirms answers the author already wrote. v1 claimed 68 → 88 here; that credit belonged to a design that did not survive review.

---

## Stage 3 — Honest scoring and a real "could not check" state `[engine]` **[v2 — persistence model added]**

**Finding 4.** A Coach outage stamps a red **"Not yet"** over a correct answer and books it as a permanent zero. Verified live: a correct rephrase and contrapositive returned 401 and were marked wrong.

Three defects in one path:

1. `ActivityItemView.tsx:87` sets `setResult({ verdict: "incorrect" })` on failure. It renders as a judgement. It is not one.
2. `ActivityRunner.tsx:28` `scoreFor` divides by `total`, so a `null` verdict is arithmetically identical to a wrong answer.
3. The item resolves, so there is no path back to it.

### What the review changed [v2]

v1 said "divide by judged items" and "offer it again on next open" without checking whether either was representable. Both needed work.

**The schema stores one bare percentage.** There is no judged count, no total, no scoring version. So a judged-only denominator is invisible and unauditable, and an old total-denominator score is indistinguishable from a new judged-only one — including on the Activity card, which renders a bare number, and in the runner, which deliberately displays the *stored* value for a completed assignment (`ActivityRunner.tsx:330`).

**Therefore the denominator change requires columns**, not just arithmetic:

```sql
alter table activity_assignments
  add column score_numerator   numeric,
  add column score_judged      integer,
  add column score_total       integer,
  add column scoring_version   smallint default 2;
```

Old rows keep `scoring_version = 1` and their existing meaning. Nothing is backfilled and nothing is silently reinterpreted.

**"Offer it again on next open" was false as written.** Verified: a null verdict resolves the item (`progress.ts:62`), the last item completes the assignment regardless of whether its verdict was null (`ActivityRunner.tsx:283`), and a completed assignment opens straight to the summary (`:192`). And making null *unresolved* while letting the student continue breaks the replay's resolved-prefix invariant — replay stops at the first unresolved item and later answered rows are ignored.

**So this is a decision, not an implementation detail.** Two coherent options:

- **(i) Keep the run `in_progress` until every item is judged.** An outage leaves the run open with a "1 item still to check" affordance. Preserves the prefix invariant if the unjudged item is offered at the *end* rather than in place.
- **(ii) Let it complete, and persist the honest denominator.** The run closes, the score says "88% of 59 checked", and the unjudged items are listed on the summary. Simpler, no replay change, no invariant risk.

I recommend **(ii)**. It is the smaller change, it needs no new replay semantics, and it is honest on the screen where the number actually appears. (i) is better pedagogically and considerably more expensive.

**Also unspecified in v1:** the score when *zero* items were judged. Returning `0%` repeats the false judgement being removed. It renders as "not scored", not as a number.

After Stage 2's fast path, this path fires less often. It still has to be right for the answers that reach the Coach.

**Proof.** Unit: `scoreFor` with one null in ten equals nine of nine, and zero-judged returns "not scored" rather than 0. Live: force a 401, confirm the chip is neutral, the summary names the denominator, and the stored row carries `scoring_version = 2`.

> **Built 2026-08-23, option (ii) as recommended.** The Coach-failure branch now sets a neutral `unchecked` state instead of a fake `incorrect`; `scoreFor` moved to `progress.ts` and returns `{numerator, judged, total, percent}` with `percent: null` when nothing was judged; the summary names its denominator and calls an unjudged item "Not checked", not "Skipped". The parts persist via `20260823120000_activity_assignment_honest_score.sql`, and a completed run is displayed from what was STORED, so a version-1 row is never silently re-scored under version-2 rules. `completeAssignment` degrades to the bare completion if the columns are not there yet: closing the run matters more than the audit trail for its denominator.

**Moves:** Durability 84 → 92 · Correctness 68 → 82.

---

## Stage 4 — Make the flip true, then scope it honestly `[switchyard]` **[v2 — scoped]**

**Findings 3, 2 and D.** Finding 3 is currently unreachable *only because* of finding 2. Wiring the flip first would ship a logical error to students, so the order inside this stage is fixed.

### The problem, precisely

`flip()` (`routing.ts:89`) swaps the clauses and inverts `negated`, but never touches the clause **text**. `Capsule` (`SwitchyardStage.tsx:104`) renders `clause.text` and carries polarity in an unlabelled `aria-hidden` lamp. On item 18 the rails read *"the beacon goes dark"* (lamp lit) and *"the generator is not refueled by dusk"* (lamp off), directly above a plate reading *"If the beacon did not go dark, the generator was refueled by dusk."* They contradict each other on screen, in the drill about negation.

### What the review changed [v2]

v1 proposed deriving a positive `core` by stripping the negation, and rendering polarity as a visible `NOT` token. **Correction 5 shows the stripping does not work on this bank**: ellipsis clauses (item 46's `"the string quartet is not"`), lexical negation (item 61's `"lack impulsive onsets"`), the `no + noun` path (item 59), and negative modals (`"cannot yet climb"`). And the `NOT [...]` diagram does not resolve scope on compound clauses: `NOT [both X and Y]` and `NOT [X rather than Y]` need explicit proposition boundaries the bank does not carry.

Codex's conclusion was that the bank needs an authored logical structure. **That is correct as analysis and it collides with the constraint that item content is Joshua's.** The resolution is not to break that constraint. It is to build the flip only where it is provably safe and route the rest to him.

### The scoping rule

An item's flip is **derivable** when all three hold:

1. Its first credited answer parses to exactly two clauses (item 62 fails: finding D).
2. Each clause's polarity is detected by an explicit `NEGATIONS` span, not the generic `no` regex and not lexical negation (items 59 and 61 fail).
3. Neither clause is an ellipsis or a compound needing scope brackets (items 46, 47 and the `rather than` item fail).

**Compute this over the bank as the first task in the stage, and publish the count.** Everything that passes gets the animated flip. Everything that fails shows the **authored contrapositive plate only**, with the junction static and no derived rails. A plate is not a downgrade: it is the authored sentence, which is correct by construction.

No item ever displays a derived flip that has not passed the gate. That is the whole safety property, and it is checkable in a test rather than argued about.

### Finding D — item 62 is broken today, independent of the flip

`parseRouting` currently yields `THEN = "the flood layer dates to spring; and if the match is trustworthy, then the stratum was sealed"`. A student looking at item 62 right now sees an entire second conditional inside one capsule.

`parseRouting` returns `null` when it cannot parse, and the world already falls back cleanly to the hero panel on null (`ActivityRunner.tsx:393`). So the fix is to **detect the multi-conditional shape and return null**, rather than returning a confident wrong parse. Item 62 then shows the plain prompt and its authored answers, which is correct, instead of a diagram that is wrong. Whether item 62 eventually deserves a two-edge yard is a content question for Stage 11.

### Then wire the flip, for derivable items only

`registry.tsx:182` currently reads `phase={answered ? "routed" : "arrival"}`. For derivable items it becomes a beat: `arrival` → (submit) → `routed` → (hold ~1.2s) → `flipped`, with a replay control on the junction, and reduced motion going straight to `flipped` with both plates lit, exactly as the existing `still` path does everywhere else in this world.

Everything needed already exists: the half-turn (`SwitchyardStage.tsx:122`), `MECHANICAL` easing (`:51`), the capsule swap, the contrapositive plate (`:311`). The world was built for this beat and has never performed it.

**One conflict the review caught:** Next is available the moment the item resolves (`AnswerPanel.tsx:101`), and Stage 6's Enter-to-continue makes skipping easier still. The 1.2s hold must therefore be **interruptible, not blocking** — pressing Next mid-flip advances immediately. The animation is a reward, never a gate.

**Proof.** A test that computes the derivable set and asserts every member's derived flip polarity matches its authored contrapositive's polarity on both sides, and asserts every non-member renders the plate with no derived rails. Item 62 asserted to render the fallback, not a malformed capsule. Live: item 18 flipped, rails and plate screenshotted together, in agreement.

> **Built 2026-08-23. The census, first, as the stage required: 24 of 62 items are derivable.**
>
> `1, 3, 4, 5, 6, 8, 11, 18, 19, 21, 22, 24, 27, 30, 31, 33, 34, 40, 47, 48, 49, 50, 51, 54`. The 38 excluded break down as 22 whose authored contrapositive does not parse even under the relaxed `If X, Y` form, 8 whose contrapositive clauses cannot be stated positively, 7 whose own clauses cannot (46, 56-61: ellipsis, lexical negation, the bare `no + noun` path), and item 62, which no longer parses at all.
>
> **The gate gained a fourth condition during the build, and it earned its place.** The first three admitted items 52 and 53, whose clause is *"takes the color unevenly"* — lexical negation carried by a prefix, invisible to any list of negation words worth maintaining. The derived flip would have rendered a double negative for the student to untangle. So derivability now also requires that the **derived polarity agree with the authored contrapositive on both sides**. That is self-verifying: anything the word lists have not thought of disagrees with the author and drops silently to the plate. 52 and 53 excluded themselves the moment the rule went in.
>
> Requiring the strict `If X, then Y` form for that check excluded item 18 — the stage's own showcase — because only 13 of 62 contrapositives are written that way. A relaxed comma form is used for verification only; the display parse is unchanged.
>
> **Finding D** is fixed at the source: `parseRouting` refuses a sentence carrying two conditionals rather than handing back the whole tail as one clause. Exactly one item is refused, and the count is asserted so a second cannot appear unnoticed.
>
> **Polarity is now readable text**, not only an unlabelled lamp: every capsule announces it to assistive technology, and a derived flip shows it as a `NOT` token beside the clause. The hold is 1.2s, interruptible by construction since nothing in the yard gates Next, it never runs over a fault, and reduced motion arrives at the flip without travelling. A replay control offers the flip in both directions.

**Moves:** Correctness 82 → 94 · Accessibility +6, once the polarity is readable text on derivable items rather than only a lamp.

---

## Stage 5 — Never lose a keystroke `[engine]`

**Finding 6.** Resume works; the edges around it do not.

1. **Typed but not submitted is lost.** Text is only persisted as part of an attempt row. Close the tab mid-sentence on question 24 and the sentence is gone. Fix: a debounced (400ms) `localStorage` draft keyed `(assignmentId, itemOrder)`, read into `initialValue` on mount, cleared on record. Local storage is right here: a draft is not durable state and does not deserve a network write per keystroke.
2. **A failed write is lost, and the toast lies about it.** `handleRecord` (`ActivityRunner.tsx:273`) toasts *"Your progress this session still counts"* and queues nothing. Fix: a small `localStorage` outbox, flushed on the next successful write and on mount. If it cannot be made to work, the copy has to change to the truth instead.
   **[v2] The outbox needs an idempotency key before it ships.** `activity_item_responses` has no uniqueness constraint, so a retry that actually succeeded the first time inserts a duplicate attempt — and the replay in `progress.ts` then counts an attempt the student never made. Add a client-generated key with a unique index on `(assignment_id, student_id, item_order, attempt_no)`, or make the insert an upsert on that tuple. The replay already tolerates legacy duplicate rows, which is what has been masking this.
3. **"Try again" wipes the box.** `handleRetry` (`ActivityItemView.tsx:106`) calls `setValue("")`. With a twenty-word answer and a one-word miss, that is a punishment for being close. Keep the text; select it so a rewrite is still one keystroke away.
4. **No end-early-and-submit.** Deferred twice. Exit is lossless, so this is a preference, not a defect. It becomes worth building once Stage 12's session shape exists; parked until then.

**Proof.** Type into question 24, kill the tab, reopen: the text is there. Take the network down, submit, restore it, submit the next item, confirm both rows land.

> **Built 2026-08-23, points 1-3. Point 4 stays parked, as written.**
>
> Drafts are a debounced (400ms) `localStorage` entry keyed `(assignmentId, itemOrder)`, cleared the moment the attempt is on record. The outbox holds a refused write, replaces rather than stacks on the same `(assignment, item, attempt)`, caps at 50 so it stays a retry queue rather than a leak, discards a corrupt payload instead of carrying it forever, and flushes both on mount and after the next good write. Every path is best-effort: `localStorage` throws in private mode and when full, and failing to cache a draft must never take down the run it was protecting. The toast no longer lies -- it says the attempt is held on the device and will go up, which is now true.
>
> **The idempotency key was load-bearing, exactly as the sequencing note said.** `20260823140000_..._one_row_per_attempt.sql` collapses any existing duplicates (keeping the earliest of each group, which is the attempt the student actually made) and adds a unique index on `(assignment_id, student_id, item_order, attempt_no)`. The client treats `23505` as success: the row it was trying to record is on record. Without it the outbox would have written a second row per retry, and `reconstructProgress` counts rows -- so a duplicate reads as an extra attempt and can strand a student on a question they never exhausted.
>
> Try again keeps the text and selects it, so starting over is still one keystroke.

**Moves:** Durability 92 → 99.

---

## Stage 6 — Keyboard-first and announced `[engine]`

**Finding 9**, minus the bullet that was wrong. Sixty-two items multiplies every small friction by sixty-two.

- **`aria-live` on the verdict.** `CoachFeedback` renders a chip and a paragraph with no announcement; a screen-reader user gets silence after submitting. Wrap the verdict block in `role="status" aria-live="polite"`.
- **Autofocus the answer box.** Every world's entrance uses `autoFocus`; the actual textarea (`AnswerPanel.tsx:65`) does not. Sixty-two questions, sixty-two mouse clicks.
- **Enter to continue on a resolved item**, and move focus to the feedback region when the verdict lands, then to the answer box on Next.
- **Advertise `⌘↵`.** It works (`AnswerPanel.tsx:73`) and is invisible. One hint line under the textarea.
- Negation readability is handled by Stage 4.

**Proof.** VoiceOver: submit an answer and hear the verdict. Then run one full item start to finish without touching the mouse.

> **Built 2026-08-23.** The verdict block is `role="status" aria-live="polite"` and takes focus when the item resolves, so the announcement is also where the student is standing. The textarea autofocuses. Enter continues from a resolved item, and steps aside for any button under the cursor so it never double-fires. The `⌘↵` hint is on screen under the box, and gains ", Enter to continue" once there is nothing left to answer.

**Moves:** Accessibility 58 → 92.

---

## Stage 7 — Show the teaching that is already authored `[engine]`

**New findings A and B.** Both are small, both are pure gain, and A is the highest teaching-value-per-line change in this document.

1. **Show `item.explanation` on a correct answer.** `CoachFeedback.tsx:49` gates it behind `revealed`, which is false when the student is right. Every one of the 62 explanations names the indicator word and its discrimination. Withholding them from the students who are succeeding is backwards. Show the explanation on every resolved item; keep the credited-answer block gated on `revealed` as it is now, because that part genuinely is a reveal.
2. **Stop calling the contrapositive "Also accepted".** `CoachFeedback.tsx:59` labels `credited_answers.slice(1)` generically. Give the label a per-Activity override in `instructions` (`credited_secondary_label`), so Conditional Rephrase says **"Contrapositive"** and every other Activity keeps today's wording untouched. Default unchanged, so nothing else moves.
3. **A one-line legend for the polarity lamp** in the yard, now that Stage 4 has made the lamp reinforcement rather than the only signal.

> **Built 2026-08-23, points 1 and 2.** The explanation now shows on every resolved item and moved out of the reveal box so it renders once, in both states; the credited-answer block stays gated on `revealed` exactly as before. The label is `instructions.credited_secondary_label`, default unchanged, set to "Contrapositive" for this Activity in the content seed and in `20260823061500_conditional_rephrase_contrapositive_label.sql` for the live row. This also fills the gap Stage 2 opened: a fast-path correct answer arrives with no Coach prose, and without this it landed as a bare chip.
>
> **Point 3 was deferred, and deliberately.** The polarity-lamp legend is written to describe a lamp that Stage 4 has demoted to reinforcement. Stage 4 was not built, so the legend would have described a signal that was still the only one there is. It belonged with Stage 4.
>
> **Built 2026-08-24, once Stage 4 had shipped and made it true.** The key sits under the yard from the moment the routing lands, and carries a real `.sy-lamp` in each state rather than a drawing of one, so it cannot drift from the signal it explains. It is `aria-hidden`: every capsule already announces its own polarity in words, and describing the colour of a ring a screen reader cannot see is noise on top of the fact. On a phone it joins the plates and the milepost rail behind the band's Expand control, because in a 260px cap it wraps to two lines and spends them explaining a signal instead of showing one.

**Proof.** Answer item 1 correctly and read the "Whenever" explanation on screen. Reveal item 62 and see "Contrapositive", not "Also accepted".

**Moves:** Craft 90 → 96, and the largest teaching gain per hour in the plan.

---

## Stage 8 — Mobile: the yard as a band `[switchyard]`

**Finding 10.** `ActivityRunner.tsx:398` gives the world a `min-h-[560px]` floor below `md`; measured **774px** at 375×812. The student scrolls past a full screen of yard to reach the answer box on every question, and the routing payoff then plays off-screen behind them.

**The change.** Below `md`, invert the stack: the answer column first, the yard as a **sticky compact band** above it carrying the departures board, the two rails and the junction at reduced height (target ≤ 280px), expandable to full height on tap. When the verdict lands, scroll the band into view so the routing and the flip are watched rather than missed.

The world's internals do not need to change; `switchyard.css` already drives its layout off breakpoints. This is a container decision plus a compact variant.

**Proof. [v2]** `AGENTS.md:60` requires the **full emulate matrix before pushing**: narrow, mid, wide, and the sidecar-docked case, every time. v1 specified one phone width, which is below this repo's own gate. So: 375×812, a mid width, a wide width, and sidecar-docked — answer box visible without scrolling on load in each, and the routing beat on screen when it plays.

> **Built 2026-08-23.** Measured before: the world was **864px** at 375x812 (the plan recorded 774) and the answer box sat at **y=1663**. Two causes, not one. The world's own floor, now a capped sticky band with an Expand control and a fade at the clip edge; and `ActivityQuestionStack` centring the card inside a `min-h-screen` flex box, which is right beside the world on a wide screen and added ~700px of empty space beneath it on a phone. Both are `md:`-gated, so nothing above the breakpoint moves. The band scrolls itself into view when the verdict lands, so the routing beat is watched rather than playing off-screen behind the student, and it collapses again on the next question.
>
> After, at 375x812: band **260px**, answer box at **431**, Submit fully visible at **611**. Matrix run at 375, 480, 768 and 1440: answer box reachable without scrolling at every one.

**Moves:** Mobile 60 → 90.

---

## Stage 9 — Intro: put Start where it can be seen `[switchyard]`

**Finding 11.** Measured: page `scrollHeight` **1341px**, Start button top at **1266px**, on a **900px** viewport. The primary action is 366px below the fold on a desktop-sized window, and worse on a laptop. Pre-existing, not introduced by the last session's work.

**The change.** A sticky action bar carrying **Start** / **Back to question N**, pinned to the bottom of the intro until the real button scrolls into view, and a tightened orb cluster. The resume affordance already knows which question it would return to (`ActivityIntro` `resumeAt`), so the sticky bar carries real information rather than being a duplicate button.

**Proof. [v2]** Re-measure across the full matrix required by `AGENTS.md:60` — narrow, mid, wide, sidecar-docked — with Start reachable without scrolling in each.

> **Built 2026-08-23.** Confirmed first: Start at **1123px** inside an **1186px** intro on a 900px viewport. A sticky dock now carries the action, labelled from the same source as the real button so a resumed run reads "Back to question 24" in both places. It is rendered only where there is an `IntersectionObserver` to retire it, because a dock that can never retire is a permanent second Start and worse than the scroll it saves.
>
> **Verified in two halves, honestly.** The placement half is live: the dock is pinned and reachable with no scrolling at 375, 480, 768 and 1440. The retire-on-scroll half is covered by test only — the browser pane reports `document.hidden === true`, and Chrome withholds IntersectionObserver callbacks from a hidden document, so a *fresh* observer gets no entries either. Nine tests drive the observer directly and assert it watches the real button, retires on intersect, returns when scrolled away, leaves exactly one Start in the tab order once retired, and disconnects on unmount.
>
> Six existing runner tests broke on an ambiguous "Start" and were updated rather than the design changed: the page now genuinely offers the action twice, and both call the same handler.

**Moves:** Mobile 90 → 94.

---

## Stage 10 — The performance tail `[engine]` **[v2 — two items corrected]**

Everything left after Stage 1, none of it large individually.

- **Finding 7 — the list page ships every assignment's full item snapshot.** `activitiesClient.ts:37` does `select("*")`, which includes the whole `items` jsonb per row; Conditional Rephrase's snapshot alone is ~30KB, and the card renders only title, subtitle, status, score and `items.length`. Select the columns the card needs plus `jsonb_array_length(items) as item_count`.
  **[v2] This needs a new type, not just a narrower query.** `hydrateAssignment()` (`activitiesClient.ts:17`) coerces a missing `items` field to `[]`, and `ActivityCard.tsx:87` reads `assignment.items.length` — so a narrowed query silently renders **"0 items"** on every card. Introduce an `ActivityAssignmentSummary` type carrying `item_count`, and change the card to consume it. The list and the runner stop sharing one shape, which is correct: they never needed the same data.
- **Finding 8 — two sequential round trips on open.** `ActivityRunner.tsx:170` waits for the assignment before starting `listItemResponses`, but both are keyed by ids known at mount. `Promise.all` them and save a full round trip on the slowest screen in the flow.
- **Finding 5 — the Coach call has no timeout, no abort and no output cap.**
  - `AbortController` with a hard timeout (12s) in `useActivityCoach.ts:39`. Today a hung gateway leaves the textarea disabled and the spinner spinning with no way out.
  - `max_tokens: 220` and a minimal thinking budget on the model call (`activity-coach/index.ts:158`). Feedback is specified as two to three sentences; capped versus uncapped is roughly a second versus roughly four. The proxy passes the body straight through, so both are one-line changes.
  - **[v2] Do NOT drop `auth.getUser()`.** v1 listed it as a removable round trip, copying the audit. `activity-coach/index.ts:68` **is the function's authentication check** — removing it admits any request carrying an arbitrary `Authorization` header. Struck. If the ~50-100ms genuinely matters later, the replacement is local JWT verification, which is a separate piece of work with its own review.
  - **[v2] Streaming is not a one-line change and moves out of this stage.** The hook uses `supabase.functions.invoke` (`useActivityCoach.ts:36`) and the function buffers the upstream response, parses complete JSON, then returns (`activity-coach/index.ts:189`). Both protocols have to change. After Stage 2c removes the wait from the fast path, this is low value for its cost; parked.

**[v2] One more thing this stage must not do.** If Stage 2's `decidedVerdict` and `fault` are ever sent to the edge function, they are **caller-controlled input**. They must be enum-validated server-side and never interpolated raw into the system prompt, or they are a prompt-injection path. Stage 2 as redesigned does not send them, so this is a guard rail for the later promotion decision, not work for now.

**Proof.** Network panel on `/activities`: response size for the list query, and every card showing a correct item count. Runner open: two requests in flight together. Coach: a forced hang recovers at 12s with a usable UI.

> **Built 2026-08-23. The narrowed list needed more than the plan predicted, and the type system found it.**
>
> `ActivityAssignmentSummary` landed as specified, and the compiler immediately caught two consumers the plan had not named: `useClassroomHome` reads `heroActivity.instructions.tagline` for the hero, so `instructions` stays in the summary (a few hundred bytes against the snapshot's thirty thousand), and `ActivityCentre.asCard` was building a whole assignment for a card. A third slipped through both, because it lied about its shape: `ActivityCard.test.tsx` cast its fixture `as never`, so it kept passing after the card stopped reading `items`. A fourth was caught only by looking -- the dev lab's list rendered "· items" with no number.
>
> The count is a **generated column** (`20260823150000_..._item_count.sql`), so the questions genuinely leave the wire rather than being fetched and discarded. The client falls back to counting a carried array where that column does not exist yet.
>
> The open is one round trip: the attempt log starts at mount, keyed by ids known before either request goes out, instead of waiting for the assignment. The Coach call has a 12s `AbortController` timeout -- a hung gateway used to leave the textarea disabled and the spinner spinning with no way out -- and `max_tokens: 220` on the model call. `auth.getUser()` is untouched, and streaming stays parked, both as the review required.

**Moves:** Performance 88 → 97.

---

## Stage 11 — The content slot *(Joshua)*

Nothing above touches item content. When the conditional-logic teaching content and correction context arrive, they land here, and only here:

- `content/conditional-rephrase.json` — prompts, credited answers, explanations, Question Types, ladder order.
- `instructions.task` / `instructions.rules` / `instructions.coach.rubric` — including the finding C decision.
- The ladder currently runs **53 distinct Question Types across 62 items**, in the order: trigger words → requirement words → negative requirements → negated results → look-alike pairs → jargon → compounds → stacked negatives → two-conditionals. That ordering is the thing most likely to change when the content arrives, and Stage 12 depends on the family grouping, which is why Stage 12 sits last.

A content change ships as a new migration in the same shape as `20260822190000_conditional_rephrase_ladder.sql`, and re-snapshots unstarted assignments only.

> **Built 2026-08-23, first content pass.** `20260823190000_conditional_rephrase_rules_and_rubric.sql`, with `content/conditional-rephrase.json` updated to match and all nineteen strings verified verbatim across the two. `rules` goes 5 → 10 and `coach.rubric` 4 → 9. **Item content is untouched**: no prompt, credited answer, explanation, Question Type or ladder position moves, and the ladder order stands as built.
>
> Three rules the drill tests and the instructions never stated:
>
> 1. **The compound flip**, and the reason this shipped first. Contraposing "If A and B, then C" gives "If not C, then not A **or** not B". The old rules said only "keep compound conditions whole", which a student satisfies perfectly while writing "not A and not B" — a strictly stronger claim than the statement supports. The rubric had no line that would catch it, so it was being credited. This was a live grading defect, not a copy gap.
> 2. **The two illegal moves, by name.** Reversing the arrow, and negating the trigger. The rubric now names both so the Coach hands back which one the student made.
> 3. **Biconditionals.** `if and only if`, `then and only then`, and the `otherwise` construction run the arrow both ways; nothing previously let a two-way answer be correct.
>
> Also written down: `unless`/`until`/`without` as an if-not translation, and where the negation lands in a `no`/`none` statement. Both were already drilled by items in the bank with nothing in the rules to support them.
>
> The [v2] re-snapshot requirement above is honoured: the migration copies `instructions` onto `status = 'assigned'` rows behind the trigger-disable dance, so the new rubric reaches assignments already issued.
>
> Verified: 734 activity-centre tests pass (730 + 4 new), full suite 1885 passed / 1 skipped / 0 failed on the pushed tree, typecheck exit 0, and all ten rules render numbered in the intro without truncation. One test asserted "wording is free" at `rubric[3]`, the old last slot; it now asserts on contents rather than position.
>
> **Applied to production 2026-08-23**, directly via the Lovable connector rather than by handing the file to Lovable. Verified after the write: `activities` for this slug reads `rules = 10`, `rubric = 9`, `items = 62` unchanged; the single `activity_assignments` row (`status = 'assigned'`, the only assignment that exists) carries the same; every other Activity's rules, rubric and item counts are untouched; and `activity_assignments_guard_immutables` is back to `tgenabled = 'O'`. The re-snapshot ran inside a `do $$ ... $$` block so a mid-way failure would have rolled the trigger disable back with it.
>
> Two notes from doing it live. There is exactly ONE user trigger on `activity_assignments`, so the "disables every user trigger" caution recorded during review is narrower in practice than it reads. And this migration is deliberately NOT inserted into `supabase_migrations.schema_migrations`: the hand-authored migrations in this repo are not tracked there at all (only Lovable's UUID-named ones are), which is why each one ends up duplicated. Re-running is harmless because the migration is idempotent.
>
> **Also settled:** the mid-drill concern raised in review is empty. There are zero `in_progress` assignments for this Activity, so no student was ever being graded by the stale rubric.
>
> **Still open:** the ladder order and the family grouping Stage 12 depends on have not been revisited against the rule set, and the 38 items that fail the derivability gate still get the authored plate and no derived rails.

**[v2] That migration copies only `items`.** Verified. So a change to `task`, `rules` or `coach.rubric` would update the `activities` row and leave every existing unstarted assignment snapshot carrying the **old instructions** — including the old coach rubric, which is what actually grades the student. Any content migration that touches `instructions` has to re-snapshot that column too, or the fix reaches new assignments only and silently misses the ones already issued.

---

## Stage 12 — The indicator ledger `[engine]`

**Audit supercharge #10, extended.** The last stage, because it depends on Stage 3's honest verdicts and on the content being settled.

The attempt log already holds a verdict per item, and every item already carries a Question Type naming its indicator word. Nobody has ever joined the two. Doing so produces, from data already stored:

- **For the student, on the completion screen:** the words that cost them marks, grouped into families (trigger / requirement / negative requirement / look-alike / compound), not a list of 62 rows. "Unless cost you three. Only if cost you two. Everything else was clean." That is a diagnosis, and it is the difference between a score and a lesson.
- **Re-drill the misses.** The end screen offers the items they missed as an ungraded practice run that writes nothing. The `practice` path already exists (`ActivityRunner.tsx:301`) and already writes nothing; this is a filtered item list handed to it.
- **For Joshua:** the same join across students, as prep material for the next session. Which indicator families are costing this student marks, from work they have already done. This is the piece with the longest tail of value and it needs no new capture.

**Also in this stage, if wanted:**

- **Say where they are.** The card says "In progress" but not "Question 24 of 62". Denormalise `last_item_order` onto `activity_assignments` on each write and the N+1 objection from two sessions ago dissolves.
- **A session shape.** Sixty-two items is not a sitting. "Ten and stop" with a real stopping beat, resumable, so a student meets the drill six times instead of abandoning it once. This is the change most likely to alter completion rate, and it is the one that makes Stage 5's end-early-and-submit worth building.
- **Navigable mileposts.** The rail at `SwitchyardStage.tsx:411` is a beautiful affordance that does nothing. Make a resolved milepost clickable for read-only review, no re-score.

**[v2] Two things this stage needs that v1 assumed it had:**

- **A normalized family key.** v1 proposed grouping on `item.category`, which is 53 distinct mutable display strings. Aggregating on display copy means the ledger silently re-buckets itself the next time a label is reworded. The families need an explicit map (`trigger` / `requirement` / `negative-requirement` / `negated-result` / `look-alike` / `compound` / `chained`) held in code and versioned, with a test asserting every one of the 62 categories maps to exactly one family. That map is derived from the content, so it is another reason this stage sits after Stage 11.
- **The practice path cannot take a filtered item list yet.** `handlePracticeAgain()` (`ActivityRunner.tsx:301`) only resets state, and `items` always comes from the full assignment snapshot (`:96`). "Re-drill the nine you missed" needs `items` to accept an override. Small, but it is real work and not free.

**Moves:** Craft 96 → 100, and it is the only stage that produces something for Joshua rather than only for the student.

> **Built 2026-08-24. The three core pieces; three of the "if wanted" list are not, and are named below.**
>
> **The family map earned its place before it was written.** 53 distinct categories over 62 items is the item list with extra steps, not a diagnosis. The map is an explicit table of all 53, held in `indicator-families.ts` and versioned, exactly as v2 required, and the reason is the one v2 gave: `category` is display copy. Group on the string and the ledger silently re-buckets itself the day somebody fixes a capital letter; group on the map and that reword fails a test instead. Four tests hold it: every one of the 62 items placed, no dead entry, every entry in a declared family, no family standing empty.
>
> **Eight families, not seven.** The plan predicted `trigger / requirement / negative-requirement / negated-result / look-alike / compound / chained`. The content asked for one more: `biconditional`, because "if and only if" is the single form that runs both ways and filing it under compound would have taught the wrong thing about it. Two categories that read like families are not: "Same rule, new seat" is a teaching device, so its unless is a negative requirement and its only if is a requirement; "Contrast inside the condition" is one item drilling *necessitates*, and a family of one reads as noise in a diagnosis rather than as a lesson.
>
> **The map carries the indicator separately from the family**, which is what lets "Requirement word: presupposes" and "Requirement word under jargon: presupposes" merge into one word a student missed twice rather than two words they missed once.
>
> **A partial is a miss.** The score already docks it half a mark, and a ledger that forgave what the percentage on the same screen punished would be lying to the student twice at once. An unjudged item is neither a miss nor a clean pass and is absent from both numerator and denominator: a Coach outage is not evidence about a word. The ledger declines to render at all rather than guess, for an Activity nobody has grouped and for a run where nothing was judged.
>
> **The re-drill needed the second prerequisite v2 named**, and it was real work as predicted. `items` now takes an override, set only from the completion screen and only alongside practice mode, so a graded run can never be narrowed to a subset the student picked. An override matching nothing falls back to the full set: a stale list is not an empty activity. "Practice again" repeats whatever set was just run rather than always reopening all 62.
>
> **The teacher's half splits its aggregation in two, deliberately.** Per assignment the runs stay separate, because two runs of the same Activity can disagree about an item and there is no obvious rule for which one describes the student. Across assignments the families merge, because that question is about the student, and a word missed in two runs has cost them twice. Two queries, not N+1. It resolves class_id through `students` the way the bootcamp panel beside it does, and falls back to the class_id when no mapping row exists.
>
> **The completion screen was the last surface auth made unreachable**, so the dev lab grew a panel for it: any Activity, three run shapes (some missed, none missed, some never judged), with the teacher's view of the same run underneath. Verified there on the real bank: "only if cost you 3 questions", 27 of 62 across 7 families, and the outage shape correctly counting 55 rather than 62.
>
> **Not built, and still optional as the stage wrote them:** the session shape ("ten and stop"), which is a product decision about what a sitting is rather than an engineering one; navigable mileposts; and `last_item_order` on the card. Note that the runner already shows "24 / 62" in its own header, so that last one is only about the Activity CARD on the list page, which is a smaller gap than the stage assumed.
>
> **Not verified:** the signed-in dossier. Reaching it needs credentials, so the branch logic is held by tests and the presentation by the lab.
>
> 798 tests pass, up 47 across the two stages built today. Typecheck clean.

---

## 3. How 72 becomes 94 **[v2 — revised down, honestly]**

v1 projected 97. That number assumed Stage 2 would make the grader authoritative and Stage 4 would derive every flip. Neither survived review, so the projection comes down with them.

| Dimension | Now | After | The stages that move it |
|---|---|---|---|
| Progress durability | 84 | **99** | 3, 5 |
| Correctness of what the student sees | 68 | **94** | 3, 4 |
| Performance | 55 | **97** | 1, 2, 10 |
| Accessibility | 52 | **92** | 4, 6 |
| Mobile | 60 | **94** | 8, 9 |
| Craft | 90 | **100** | 7, 12 |
| **Overall** | **72** | **94** | |

**Where the missing six points are, named rather than hidden:**

- **Correctness stops at 94, not 100.** The items that fail Stage 4's derivability gate show an authored plate instead of a performed flip. That is correct, but it is not the full teaching move, and no amount of engineering closes it. It closes with authored structure in the bank, which is Stage 11.
- **A drill cannot grade above the quality of what it asks.** Finding C is a live contradiction between the task and the rubric, and item 62 currently asks for something the world cannot draw. Both are content.
- **The judge stays on probation.** Promoting `diagnose()` to authoritative is deliberately not in this plan. It is a later decision, made on the shadow-mode evidence Stage 2 collects, and it is where the last of the correctness score lives.

---

## 4. Sequence and dependencies **[v2 — three constraints added]**

```
Stage 0  ── gate: ship the migration AND settle finding C
   │        (v1 put finding C in Stage 11, after the stage that depends on it)
Stage 1  ── independent, ship first (biggest measured win, smallest change)
   │
Stage 2  ── fast path + shadow telemetry ──┐
   │                                       ├─ 2c (route on fast path) needs 2a
Stage 3  ── needs 2's verdict shape        │
   │                                       │
Stage 4  ── D, then 3, then 2 ─────────────┘
   │
Stage 5, 6, 7, 8, 9, 10  ── independent of each other, any order
   │
Stage 11 ── waits on Joshua
   │
Stage 12 ── needs 3 (honest verdicts) and 11 (settled families)
```

**Hard ordering constraints. v1 claimed three; there are six.**

1. **Stage 4's text fix precedes Stage 4's wiring.** Wiring the flip while the rails contradict the plate ships a logical error into a logic drill. The one place where half the work is worse than none.
2. **Stage 3 after Stage 2.** The fast path changes which paths can produce a null verdict at all.
3. **Stage 12 after Stage 11.** The ledger groups by indicator family, and the families are content.
4. **[v2] Finding C moves to Stage 0, before Stage 2.** The fast path has to know whether the contrapositive is required. v1 had Stage 2 depending on a decision it scheduled nine stages later.
5. **[v2] Stage 2c is limited by the retry semantics.** A first-attempt partial deliberately does not resolve, so the yard cannot route on it without eating the retry. 2c applies to fast-path correct answers only.
6. **[v2] Stage 5's idempotency key precedes Stage 10's parallel loading.** Retrying inserts into a table with no uniqueness constraint duplicates attempts, and the replay counts them.

Also **[v2]**: Stage 4's 1.2s hold and Stage 6's Enter-to-continue conflict directly. Resolved inside Stage 4 by making the hold interruptible rather than blocking, but it is a real interaction between two stages that v1 listed as independent.

**Test posture.** 596 tests pass across 42 files in this feature, re-run and green on 2026-08-23. Every stage adds its own and none may go red; `npx vitest run src/features/activity-centre` is the gate before each commit.

**[v2] But that gate does not cover this plan.** The feature-only suite validates none of: the `App.tsx` provider move (Stage 1), the edge function (Stages 2, 10), the migrations (Stages 0, 3, 11), or the authenticated production runner — which the audit records as **never having been exercised with a real account**. Stages 1, 2 and 3 each need at least one live signed-in check on top of the unit suite, and Stage 1 needs nine.

---

## 5. Decisions I need from Joshua **[v2 — five, up from three]**

1. **Ship the migration?** (Stage 0.) Asked across three sessions, still unanswered. Until it is applied, everything here is built against content no student is running. Note that pushing alone does not do it: Lovable applies the SQL.
2. **Finding C: is the contrapositive required, or is either direction enough?** (Stage 0, moved up.) `instructions.task` says both; `instructions.coach.rubric[0]` says either alone is correct. The fast path cannot be built without the answer. My recommendation: **either direction is credited, both are praised** — it matches the rubric that has been grading students all along, and it is the reading under which items 46, 47 and 48 make sense.
3. **[v2] Stage 3: does an outage keep the run open, or does it close with an honest denominator?** My recommendation is **close it and say "88% of 59 checked"** — smaller change, no replay-invariant risk, honest on the screen where the number appears.
4. **[v2] Item 62, and the items that fail the derivability gate.** Stage 4 gives them the authored plate and no derived rails, which is correct but is not the full teaching move. Whether they eventually get authored display structure is a content decision, and it is the single largest remaining gap between 94 and 100.
5. **Which stages, in what order?** My recommendation if the answer is "some of it": **0, 1, 2, 3, 4, 7.** That is the migration, the largest measured performance win, the fast path plus the telemetry that makes a future judging decision evidence-based, the change that stops a right answer being scored wrong, the change that makes the drill teach the thing it is named for, and the highest teaching gain per line in the document. Stages 5, 6, 8, 9, 10 are quality a good product has and no student will name. Stage 12 is the one that gives you something back.

---

## 6. Not touched by this plan

- **All item content**, per instruction. The 62-item bank, its explanations, its Question Types, its ladder order.
- **The other seven Activities.** Six of the twelve stages live in engine files and will improve all eight as a consequence; none of them is a content, ladder or quality pass on any Activity but this one. Vocab Rehab's intro truncating its "After" orb text was seen again and is deliberately left alone.
- **The app-wide bundle.** `index-aBsqcAT1.js` at 1.50MB (434KB gzipped) and `index-DwmB6eg8.css` at 548KB (79KB gzipped) are a separate conversation. Stage 1 does not touch them; it stops the Activity path paying for a data file, which is a different problem.
