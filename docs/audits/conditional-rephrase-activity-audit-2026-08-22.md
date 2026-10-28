# Conditional Rephrase (The Switchyard) — quality + performance audit

**Date:** 2026-08-22 · **Auditor:** Claude (Jay 2) · **Branch:** `main` at `2bc21447` (committed, unpushed)
**Scope:** everything EXCEPT the item content. Joshua is supplying the conditional-logic teaching content and correction context separately, so the 62-item bank, its explanations, and its ladder order were read but deliberately not touched.
**Method:** code read of the whole feature, five live checks in the Claude Code browser against the dev server (`http://localhost:8080`), one full production build for real bundle numbers, and in-page measurement of load cost.

---

## Grade

| Dimension | Score | One-line reason |
|---|---|---|
| Progress durability (the thing that was asked for) | 84 / 100 | Resume, verdict replay and show-answer logging are real and tested. Three holes remain: un-submitted text, a failed write, and a coach outage. |
| Correctness of what the student sees | 68 / 100 | The world's contrapositive display contradicts the authored contrapositive. Currently unreachable in the runner, which is its own finding. |
| Performance | 55 / 100 | Opening an Activity downloads and parses a 5.5 MB question bank the Activity never uses. |
| Accessibility | 52 / 100 | Verdicts are not announced, the answer box never takes focus, and negation is carried by an `aria-hidden` dot. |
| Mobile | 60 / 100 | The world takes the whole first screen; the answer box is a scroll away on every question. |
| Craft (tests, motion, vocabulary discipline) | 90 / 100 | 596 tests, reduced-motion honoured in every world, a real ubiquitous language in `CONTEXT.md`. |
| **Overall** | **72 / 100** | A well-built engine with three shipping-grade defects and one large unclaimed win. |

---

## Live checks run (Claude Code browser, dev server, no other Chrome opened)

1. **Intro renders and measures** — `/activity-lab` → Intro → Conditional Rephrase. Task block, tagline, rules, credited answers and Start all render. Measured in the DOM: page `scrollHeight` **1341px** against a **900px** viewport, Start button top at **1266px**, i.e. **366px below the fold** on a desktop-sized window.
2. **Ladder + world across items** — Switchyard tab, items 1 / 18 / 62 at Arrival, Routed and Flipped. Item order matches the intended single ladder. Question Types render student-safe (`Trigger word: whenever`, `Negative requirement: unless`). Milepost rail draws (`17 OF 62 DOWN THE LINE`).
3. **Submit path with the Coach down** — Runner shell, typed a correct rephrase + contrapositive, submitted. The edge function returned 401 (unauthenticated lab), the fallback fired: toast, credited answer revealed, item resolved. See finding 3 for what it displayed.
4. **Mobile** — 375×812. No horizontal overflow. World block measures **774px tall** before the answer column begins.
5. **Load cost** — fresh navigations to `/activity-lab` and `/activities`, resource timing read from the page; plus a production `npm run build`.

Unverified, as before: the signed-in student runner at `/activities/:assignmentId` is behind auth plus `has_activity_access` and was not exercised with a real account. Frame-rate could not be measured: the browser pane reports `document.hidden === true`, so `requestAnimationFrame` is throttled and any FPS number from it would be fiction.

---

## Findings, ranked

### 1. Every Activity page downloads a 5.5 MB question bank it never uses — `src/App.tsx:398`

`<Route path="/*" element={<QuestionBankProvider>…` wraps the catch-all, so the provider mounts on essentially every route, including `/auth`, `/activities`, and `/activities/:assignmentId`.

Measured:

| | |
|---|---|
| `/data/_bank.generated.json` | **5,539,562 bytes raw · 1,471,908 bytes gzipped** |
| Parse on this Mac | **111 ms** of blocked main thread (plus indexing 3,964 questions and attaching 1,249 explanations after it) |
| Extra requests | 9–14 `PT1xx-explanations.json` fetches |
| Heap after load | ~58 MB |

Confirmed live: navigating to `/activities` while signed out lands on `/auth` and **still** pulls 5.6 MB of bank. On a phone on cellular this is seconds of delay and several hundred ms of main-thread parse before the drill can paint.

**Fix:** move `QuestionBankProvider` down onto the route groups that consume it (drill, analytics, journal, homework, guided drills, question finder). The Activity Centre imports none of it. This is the single largest performance win available and it is a routing change, not a rewrite.

### 2. The Switchyard's contrapositive is never performed for a student — `src/features/activity-centre/worlds/registry.tsx:182`

`phase={answered ? "routed" : "arrival"}`. The `"flipped"` phase is never passed. Everything built for it — the junction's half-turn (`SwitchyardStage.tsx:120`), the capsule swap, `flip()` in `routing.ts:89`, the `MECHANICAL` easing — is reachable only from the dev lab.

The Activity's own instruction is "Rephrase the statement as If [sufficient], then [necessary]. **Then give me the contrapositive.**" The half of the task the world was designed to dramatise is the half it never shows. This is the biggest unclaimed win in the feature: a beat after the verdict (routed, hold, flip) turns a static diagram into the thing that teaches. Fix finding 3 first.

### 3. The flip displays a logically wrong sentence — `routing.ts:89` + `SwitchyardStage.tsx:72`

`flip()` swaps the clauses and toggles `negated`, but does not change the clause **text**. `Capsule` renders `clause.text` and expresses negation only through `<span class="sy-lamp" data-lit={clause.negated} aria-hidden="true" />`, an unlabelled dot.

Observed live on item 18 in the Flipped phase, with the authored plate visible directly beneath it at the same moment:

| Where | What it says |
|---|---|
| IF rail | "the beacon goes dark" (lamp lit) |
| THEN rail | "the generator is not refueled by dusk" (lamp off) |
| Authored contrapositive plate | "If the beacon **did not** go dark, the generator **was** refueled by dusk." |

The rails and the plate contradict each other on screen, in the drill whose subject is negation. Note the lamp is ambiguous by construction: on the routed phase a lit lamp sits beside text that already contains "not"; on the flipped phase a lit lamp sits beside text that does not.

**Fix:** parse the authored contrapositive with `parseRouting` and use its clauses for the flipped state when it is in "If X, then Y" form (item 18's is), falling back to a visible negation affix on the capsule when it is not. Either way the negation has to be in the words, not only in the lamp.

**Reachability:** currently lab-only, because of finding 2. It becomes student-facing the moment the flip is wired.

### 4. A Coach outage silently costs the student marks, and calls a right answer wrong — `ActivityItemView.tsx:78` and `ActivityRunner.tsx:28`

On any coach failure the item resolves with `verdict: null`, and the UI renders `setResult({ verdict: "incorrect" })`, which draws the red **"Not yet"** chip. Verified live: a correct rephrase and contrapositive were stamped "Not yet" when the function returned 401.

`scoreFor` weights `null` as 0 and divides by the full item count, so every item lost to an outage is a permanent zero on the graded score, with no path back — the item is resolved and the run moves on.

This runs against the truthfulness rule: the number no longer traces to anything the student did. **Fix:** a distinct "could not check this one" state (neutral, not red), exclude un-judged items from the denominator, and offer a re-judge on the next open. See also finding 5.

### 5. The Coach call has no timeout, no abort, and no output cap — `hooks/useActivityCoach.ts:37`, `supabase/functions/activity-coach/index.ts:151`

- No `AbortController` and no timeout: if the gateway hangs, the textarea stays disabled and the spinner spins forever. There is no user-visible way out of that state.
- No `max_tokens` on the model call, and no thinking/reasoning control on `google/gemini-2.5-flash`. Feedback is specified as 2-3 sentences; an explicit cap (~220 tokens) plus a minimal thinking budget is the difference between roughly a second and roughly four, on every one of 62 submissions. The proxy passes the body straight through (`gemini-proxy/index.ts:176` only rewrites `model`), so both are one-line changes.
- No streaming, so the student watches a spinner rather than words arriving.
- `_sb.auth.getUser()` adds a network round trip to the auth server before the model call on every submit.

### 6. Progress is not yet lossless in three places

The resume work is real and I could not fault the replay logic (`progress.ts` handles correct / cap / coach-null, continues attempt numbering, and tolerates legacy duplicate rows). The gaps are around it:

- **Typed but not submitted is lost.** Text is only persisted as part of an attempt row. Close the tab mid-sentence on question 24 and that sentence is gone. A debounced `localStorage` draft per `(assignmentId, itemOrder)`, cleared on record, closes this.
- **A failed write is lost, and the toast says otherwise.** `handleRecord`'s failure path toasts "Your progress this session still counts", but nothing is queued, so on the next open that attempt never happened. Either queue and flush, or tell the truth in the copy.
- **No end-early-and-submit.** Deferred last session, still open. Exit is lossless now, so this is a preference, not a defect.

### 7. The list page ships every assignment's full item snapshot — `api/activitiesClient.ts:34`

`listStudentAssignments` does `select("*")`, which includes the whole `items` jsonb per row. Conditional Rephrase's snapshot alone is ~30 KB. The card renders title, subtitle, status, score and `items.length`. Eight assignments is roughly a quarter of a megabyte of JSON parsed to draw eight cards, growing with the library.

**Fix:** select the columns the card needs plus a count (`jsonb_array_length(items)` through a view or RPC).

### 8. Runner opens with two sequential round trips — `ActivityRunner.tsx:157`

The hydration effect waits for the assignment before it starts `listItemResponses`. Both are keyed by ids known at mount (`assignmentId`, `user.id`), so the log fetch can start in parallel and save a full round trip on the slowest screen in the flow.

### 9. Accessibility

- **No `aria-live` anywhere on the verdict or feedback.** `CoachFeedback` renders a chip and a paragraph with no announcement, so a screen-reader user gets silence after submitting. The only `role="status"` in the feature is the Switchyard's fault line.
- **The answer box never takes focus.** Every wing in every world uses `autoFocus`; the actual answer textarea does not. Sixty-two questions, sixty-two mouse clicks.
- **Focus is not moved after Next**, and there is no Enter-to-continue on a resolved item. `⌘/Ctrl+Enter` submits but is nowhere advertised.
- **Negation is `aria-hidden`** (finding 3), so the contrapositive is unreadable non-visually.
- **The credited answer sits in the DOM before it is revealed**, veiled by CSS only. A screen reader will read it out. It should not be rendered until revealed.

### 10. Mobile: the world eats the first screen — `ActivityRunner.tsx:398`

`className="relative flex min-h-[560px] flex-col md:sticky md:top-0 md:h-screen"`. Below `md`, the world stacks above the answer column with a 560px floor; measured 774px in the lab at 375×812. The student scrolls past a full screen of yard to reach the answer box on every question, and the routing payoff then happens off-screen behind them. Options: collapse the world to a compact band on small screens, or make the answer box the first thing and the world a sticky strip.

### 11. Intro: Start is below the fold (pre-existing, unchanged)

1341px page, Start at 1266px on a 900px viewport (measured). The block added last session costs zero height, so this is inherited, not introduced. A sticky "Start / Back to question N" bar, or a tighter orb cluster, puts the primary action where a student can see it.

---

## Production build numbers (for the record)

`npm run build` succeeded in 4m51s. The Activity Centre is well split:

| Chunk | Raw | Gzip |
|---|---|---|
| `ActivityRunner` | 10.05 kB | 3.66 kB |
| `ActivityQuestionStack` | 11.36 kB | 3.92 kB |
| `activity-centre` (all 8 worlds) | 95.84 kB | 25.13 kB |
| `activity-centre.css` | 83.26 kB | 16.86 kB |

None of the 7 content JSONs ship in the runner path. The feature's own weight is not the problem; finding 1 is. App-wide, `index-aBsqcAT1.js` is 1.50 MB (434 kB gz) and `index-DwmB6eg8.css` is 548 kB (79 kB gz), which is a separate conversation.

---

## Supercharge list, ranked by value per hour

1. **Judge the obvious answers locally, in under 50 ms.** `routing.ts` already parses "If X, then Y" and `diagnose()` already names the three canonical errors (reversal, dropped negation, trimmed condition). When a student's parse matches the credited parse, that is a deterministic correct — no model call, no wait, no cost, and no chance of the model contradicting the answer key. Send only the near-misses to the Coach, which is where prose feedback actually earns its latency. This is the biggest single quality-and-speed move available.
2. **Wire the flip** (findings 2 + 3). The world already contains the animation; it needs a phase and correct words.
3. **Make "never lose progress" literally true**: draft autosave, a write-retry queue, and an honest failure state (finding 6).
4. **Keyboard-first flow**: autofocus the answer box, Enter to continue when resolved, the `⌘↵` hint visible, focus moved to the feedback region with `aria-live`. Over 62 items this is the difference between a drill and a chore.
5. **Keep the student's text on "Try again"** (`ActivityItemView.tsx:104` clears it). With two attempts and a twenty-word answer, wiping the box punishes a one-word miss.
6. **Say where they are.** The card says "In progress" but not "Question 24 of 62". The N+1 objection from last session dissolves if `last_item_order` is denormalised onto `activity_assignments` on each write.
7. **A session shape.** "Ten and stop" with a natural stopping beat, instead of an undifferentiated 62.
8. **Re-drill the misses.** The attempt log already holds a verdict per item; the end screen can offer "the nine you missed" as a practice run that writes nothing.
9. **Stream the Coach feedback.** Same total time, much shorter felt time.
10. **A teacher view of the verdict log** by indicator family — which words cost this student marks. That is prep material for the next session, from data already stored.

---

## Not touched

- **All item content**, per Joshua's instruction: prompts, credited answers, explanations, Question Types, ladder order.
- **The un-deployed migration** `20260822190000_conditional_rephrase_ladder.sql` and the `activity-coach` edge function change. Still committed-not-pushed at `2bc21447`.
- No code was changed in this audit. Nothing was committed or pushed.
