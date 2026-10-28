# Teach the operation, then let the learner perform it

## Goal, decisions and authorization

Make Groups 3 and 4 and the AND/OR lessons clearer to read and easier to reproduce independently. Improve the writing, place small useful checks beside new ideas, make the diagrams manipulable, use clear lesson/drill titles, and integrate relevant existing drills/homework.

Joshua confirmed:
1. Review Groups 3/4, their separation, AND/OR and their titles, plus existing Unless Drill, saved homework and relevant Loophole workouts.
2. Students build answers before seeing completed diagrams: move an idea, perform its negation, and place the other idea. Dragging and click/keyboard placement are equivalent options.
3. Small lesson checks are ungraded, with hints/retries; the existing Unless Drill comes afterward as fluency work.
4. Propose TWO lessons for negating AND/OR versus building compound contrapositives.

This is the grill-by-Claude planning/review phase, not authorization to implement this new scope. Existing page/film fixes are a completed separate task. Keep code, source files, lessons, media, assignments and progress unchanged while planning. No commit, push, publication, external sends or paid narration/provider calls. Codex coordinates; Claude independently reviews using its configured CLI default. Maximum5 plan-review rounds. A separately authorized build would receive fresh inspection (maximum2) and focused verification.

Evidence and source catalog: `docs/conditionals/2026-10-27-writing-and-practice-audit.md`. That report distinguishes current source evidence, one direct rendered Group4 read, full extracted-text homework reads, live Gmail SHA matching and source limitations. Source/answer-key concerns are candidates for adjudication, not a completed source-bank grading audit.

## Teaching contract

- Use Joshua's selected voice: `C:/Users/Joshu/dev/ai-os/wiki/teaching-voice.md`, `references/lsat-teaching-voice-standard.md`, and current `wiki/COPY-CORRECTIONS.md`, including the 2026-10-25/2026-10-26 AND/OR corrections. Plain conversational reasoning, complete ideas, technical terms followed by ordinary explanations. Do not put “connector,” “complete group,” “whole group” or “full group” in student copy. Name AND, OR, the + sign, both conditions or either condition as appropriate. No recognition-drill labels or needless future-chain jargon.
- Start with ordinary meaning, introduce and demonstrate the operation, then require a fresh attempt. Do not cold-test an untaught method. “Build before answer” means the answer to THIS attempt stays hidden; it does not remove the prior explanation or example.
- Group3: choose either complete idea, negate it on the IF/sufficient side, put the other unchanged on THEN/necessary. Group4: keep either complete idea unchanged on IF, negate the other on THEN. Show the difference explicitly; do not teach identical negation operations under different labels.
- Keep negation distinct from writing an equivalent rule, taking a contrapositive, and denying a whole conditional. Preserve original negatives, scope, subject, quantifiers, timing and permission versus actual conduct. Short word labels stand for explicitly defined complete ideas; a strike means NOT. No slash-letter notation in lesson copy or word diagrams.
- AND's requirements depend on its side: both triggers needed versus both consequences follow. OR includes one or both. For a standalone asserted A OR B, not A proves B; a false member of an OR trigger in an unactivated conditional does not prove its other member. Keep Joshua's explicitly chosen term “conjoins” if used, with its ordinary explanation.
- Teaching quality is separate from functional correctness. A polished widget or passed test does not prove a learner can transfer the method. End with fresh independent construction and boundary questions, not just recalling the example.

## Course structure and titles

Keep existing AND and OR lessons separate. Keep Groups3 and4 separate, followed by their existing comparison lesson. Their methods differ; a shared board does not justify merging the content.

| Destination | Proposed visible title | Identity/progress treatment |
|---|---|---|
| Existing2.1 | AND | Keep `and-or-both-or-either`. |
| Existing2.2 | OR | Keep `and-or-either-condition`. |
| Existing2.3 | AND and OR on either side of the arrow | Keep `and-or-either-side`; remove vague “Where the group sits” and left/right-only description. |
| New2.4 | Negate AND and OR | New `and-or-negate-conditions` ID and dedicated negation revision; covers denying a compound idea, not denying the whole conditional. |
| Existing combined lesson, now2.5 | Contrapositives with AND and OR | Keep `and-or-negate-group` as compatibility destination for the original combined content; remove duplicated beginner negation section from its new presentation after2.4 exists. |
| Existing placement practice | What follows from AND and OR? | Keep `and-or-placement-practice`. |
| Existing negation practice | Practice negating AND and OR | Keep `and-or-whole-group-practice`; distinguish it from the lesson title and describe opposite truth conditions while preserving restrictions. |
| Existing transfer practice | Build the diagram and its contrapositive | Keep `and-or-transfer-practice`. |
| Existing3.1 | Group3: Unless, until and without | Keep `exception-language`. |
| Following practice | Translate unless, until and without | Keep `exception-language-practice`; Group3 stays in supporting context. |
| Existing3.2 | Group4: No, none and never | Keep `exclusion-language`. |
| Following practice | Translate no, none and never | Keep `exclusion-language-practice`. |
| Existing3.3 | Use Groups3 and4 together | Keep `negative-translation`. |
| Following practice | Translate sentences with existing negatives | Keep `negative-translation-practice`. |

Use normal spacing in student-facing Group3/4 labels (for example “Group 3”); compressed IDs/numbers above are plan shorthand. Do not silently change URLs, saved run IDs, assignment grants or the frozen legacy course.

Exact Chapter 2 order: 2.1 AND; 2.2 OR; existing meaning practice; 2.3 AND and OR on either side of the arrow; existing placement practice; new 2.4 Negate AND and OR; existing negation practice; retained-ID 2.5 Contrapositives with AND and OR; existing transfer practice. Keep the four drill IDs and drill numbering. Split the current mixed lesson quiz into negation and contrapositive ownership while preserving item identities.

Add the new lesson to `openingCoursePath.ts`, `AndOrLessons.tsx` dispatch and `OpeningCourseContent.tsx` dispatch. Update path order, numbered navigation, descriptions, quiz ownership and route/lesson-standard/teaching-regression tests. Both separated lessons use `unitId` and `primaryUnitId` of `de-morgan`, and `accessAnyOfUnitIDs:['de-morgan']`, with the current edition and learn-action constraints. Access and assignment completion membership are separate: existing full-course/de-morgan learn grants may view the new lesson as optional, but their required-step denominator stays fixed. New versioned grants require both lessons. And-or-only grants and frozen legacy membership do not gain access. Progress projection never grants access. Defer the existing combined negation/contrapositive film from the split lesson presentations unless it is locally revised and verified to match the dedicated 2.5 scope. Do not merely retitle unchanged mixed teaching or invent a film for 2.4; the written lesson is usable without it.

### Preserve historical completion across the split

Use distinct new revisions, `and-or-negation-20261027-r1` and `and-or-contrapositive-20261027-r1`, for the new separated lessons. Before editing, freeze the current combined component/registry and preserved earlier registry as compatibility evidence. Only completed `and-or-negate-group` records with exact known revisions `and-or-split-20261025` or `and-or-20261019` can project into BOTH new destinations. The latter compatibility generation needs its preserved combined-content source evidence in the implementation record. Missing/unknown revisions, started work, unrelated unprefixed records and AND-only records grant no new negation credit. New separated completions never grant sibling credit.

Replace the single-source split descriptor with explicit source/revision allowlists per target; retain the existing AND-to-OR compatibility rule separately. In `courseProgress.tsx`, recognize historical same-ID completions before the generic prefixed-current-record shortcut. Projection is pure and read-only, strips mutable state, preserves the source date exactly, and makes zero writes on mount. Use the existing “Completed earlier” view and “Resume and revise” action. Protecting revision alone is insufficient because `recordCourseStep` replaces `updatedAt` on every save.

Only explicit resume starts the selected destination's new-revision attempt. Preserve immutable historical completion provenance `{sourceKey, completedAt, contentRevision}` in `sourceCompletion`, plus a bounded prior-attempt snapshot before overwriting any old draft/answers. Projection must recognize that provenance after the retained 2.5 source record has been resumed or recompleted, so 2.4 does not lose its earned historical credit. Current new-revision started/done attempts take precedence for their own destination. Normal saves cannot replace historical dates or reopen projected work. Keep attempt history local and account/edition scoped; never manufacture a fresh completion by mounting content.

Tests must cover both known generations, same-ID zero-write projection and exact dates, negative unknown/missing/started/unrelated cases, independent new completions, explicit resume of either target, retained-ID resume/recompletion preserving sibling credit, serialization/reload/account isolation, assigned subsets and stable direct links. New optional lesson checks do not change mark-as-read or course completion rules.

### Freeze assignment requirements independently of access

The current denominator is not a stored grant snapshot: `routes.tsx` filters the live registry with `registryStepAllowed`, while `OpeningCourse.tsx` uses `requiredForEditionCompletion` for chapter/course totals and next work. Add a shared pure `courseRequirements.ts` resolver, with an explicit frozen pre-new-2.4 required-ID list for historical grants without metadata. Intersect it with the fetched row's protected target; never derive the historical list from the mutable current registry. Mark this provenance `pre-split-default`. Eligible historical grants see new 2.4 as optional, excluded from totals and next-required selection. A previously complete grant stays complete even when its missing/unknown revision cannot project new lesson credit.

Newly authored grants snapshot `conditional_requirements:{version:1,revision:'conditional-required-20261027-r1',requiredStepIds:[...]}` into `plan.metadata` in `src/lib/assignWork.ts`. Read this only from a fetched validated classroom row in `assignments.ts`; the snapshot controls completion membership, never entitlement. IDs must be unique, known and eligible for that row's protected target. Unknown versions, invalid/duplicate/out-of-scope IDs produce an explicit unavailable/teacher-update state. Do not backfill existing rows or infer a permission from snapshot IDs.

Pass assignment-specific step COPIES from `routes.tsx` into `OpeningCourse.tsx`; all course/chapter totals, continuation, optional labels and next-required selection consume the same effective flags. Do not mutate registry objects. `AssignmentBuilder.tsx` uses the shared resolver for prospective new and existing assignment summaries. Where `ConditionalAssignmentFields.tsx` displays counts, use the same resolver. Its duplicate detection must compare both entitlement target and requirements generation so a deliberately newly assigned generation is not confused with an old grant; creating it never upgrades an old row.

Leave `conditionalBootcampAssignment.ts` entitlement target/key/URL schema and `classroomItems.ts` exact-row routing unchanged. The current target normalizer would discard a target-level requirements field, and protected URL validation rejects extra parameters; metadata is intentionally separate. No teacher-facing conditional lesson denominator was found in the current teacher/lib sources, so do not claim to fix one. Any added teacher preview count uses the shared resolver. Existing classroom item status remains unchanged.

Proof includes `courseRequirements.test.ts`, `assignments.test.ts`, `routes.andOr.test.tsx`, `OpeningCourse.test.tsx`, `assignWork.test.ts`, teacher authoring/preview tests and existing classroom routing tests: old full-course/de-morgan/eligible-area grants keep exact denominators and 100% when complete; new eligible grants require 2.4; unrelated scopes gain nothing; malformed snapshots and URL overrides fail closed; no cross-grant mutation; authoring/preview/student counts agree; no old row writes. Requirement membership and earned completion remain independent.

## Shared constrained construction board

Build a small two-idea teaching board using the existing formula AST/equivalence engine, not the entire nested formula editor. Each idea has one identity, complete statement, short word label, original polarity and current polarity. Display and grading share that state.

1. Show the original sentence and identify both complete ideas, including any original NOT. For a fresh identification check, let the student select the spans; clicking already-highlighted answers cannot establish an independent success state.
2. Ask the learner to select/drag either complete idea to IF. Keep its ORIGINAL polarity on drop. Do not auto-negate.
3. Group3 asks the learner to negate this IF idea; Group4 keeps it unchanged. Place the other idea on THEN, then apply Group4's negation there. The other original idea never silently changes.
4. Permit checking the arrangement. Incomplete states explain what is missing. Accept both equivalent correct orientations, including already-negative ideas. Do not grade display-label equality.
5. A wrong attempt retains the arrangement and gives an operation-specific hint. Do not reveal the completed answer on the first miss. Offer retry and an explicit reveal using the existing formative pattern. Revealed and independently successful states are distinct formative states. Neither is a score or a course-completion event.
6. On success/reveal, read the rule in full English and explain the guarantee and relevant limit. Then invite the opposite starting idea. Show both finished versions together only at this comparison stage.

Drag is an additional input method, not a dependency: the same reducer accepts pointer drops, card selection plus IF/THEN buttons, and keyboard controls. Use visible focus, meaningful labels, position/negation announcements, touch-friendly targets and reduced-motion behavior. A cancelled drag keeps state, dropped cards do not duplicate, reset is predictable, and layout reflow never silently moves an idea. No new AI grading or provider calls for these deterministic tasks. Prototype the board with drag/click/keyboard parity before expanding it across authored examples.

## Group3 writing and inline checks

Preserve its meaning-before-method structure and current complete-idea definitions. Do not replace its only worked demonstration with an unanswered board. After the meaning and single-idea negation explanation, KEEP one fully worked game/rain model: choose Rains for IF, visibly negate it, place Played unchanged on THEN, and read it back. Show the alternative orientation as part of the model. Then offer a short guided rehearsal of that same pair with visible choose/negate/place prompts; this is instructional modelling, not another scored/core check. The first independent board (core check 2) uses a NEW sentence with no completed arrangement supplied. Its alternative finished comparison appears only after success/reveal. Prior worked examples do not disclose this fresh task's answer.

Suggested instructional copy, proposed rather than final approved wording:

“Unless joins two ideas. Choose either one for the if side. Negate it: treat that complete idea as not true. Put the other idea on the then side exactly as it was. Now read your rule back. Does it make the same promise as the sentence?”

Place short checks at the exact new distinction:
- Meaning: keep the no-rain question before diagrams.
- Construction: require the complete method on a fresh simple sentence after the model; either orientation works.
- Repair: learner edits Rains -> crossed-out Played, then considers rain AND a played game as an allowed case. The first hint names the operation, not the full answer.
- Existing NOT: start from crossed-out Opens for “the store does not open.” Learner negates it by removing the strike, then places Arrives unchanged.
- Without: ask what “a ticket” means as a complete statement BEFORE constructing the rule. Do not treat without itself as part of the idea.
- Until: retain “by then”/“yet.” Ask whether inspection complete guarantees immediate opening; use an allowed complete-inspection/closed-lab case to show the limit.
- Fresh transfer: one new original simple sentence in the core construction check. After the lesson quiz, optional paragraph extraction and correction practice use original authored and semantically verified items; validated homework enters independent practice only. No lesson check depends on pending source adjudication. Keep compound negation later than its prerequisite.

Bound the first pass to FOUR core checks in this order: (1) meaning before diagrams; (2) fresh simple construction; (3) existing NOT; (4) the until timing limit. The without noun expansion is a short worked explanation, with an optional collapsed check. Keep the original four-question quiz as a distinct end-of-lesson section. Repair, alternative starting-idea repetition, paragraph/correction extension and Unless speed drill appear after that quiz under optional practice, with individual start buttons. Show one active task at a time within each section. Core means part of the recommended reading sequence, never a navigation/completion gate. Do not add every proposed check as another mandatory stop.

Integrate the EXISTING Unless Drill after untimed understanding/construction as optional “Unless speed drill.” Prefer extracting an embeddable experience from the current page so standalone and inline entries share implementation, semantic logic and its independent progress store. Retain all four patterns, either orientation, existing10s/5s behavior and standalone route. Give a clear introduction that it is symbolic fluency, not a test of without/until or full-English understanding. Do not replace it with Ellen's three-form timing standard. Keep it optional and separate from lesson completion, existing assignments and full-course run state.

## Group4 writing and inline checks

Give Group4 a deliberate presentation comparable to Group3 instead of relying on answer-reveal demo buttons. Start from the sculpture sentence and ask what cannot happen together before explaining exclusion. Introduce the technical name after its meaning is visible.

Implement this in a dedicated `components/ExclusionLesson.tsx`, dispatched by `FullCourseLesson` only for `exclusion-language`, parallel to `UnlessLesson`. Pass the existing film and quiz slots into it; reuse the constrained board and target lesson styles. Add a dedicated `components/NegativeTranslationLesson.tsx` dispatch for `negative-translation` to deliver the existing 3.3 comparison with the two negation locations, original-negative handling and fresh mixed checks. All other IDs keep the existing generic template, Demonstration buttons, contextual disclosure and comparison labels. Target-only components use the approved diagram-first comparison wording and visible boundary sections. Test dispatch and unrelated generic rendering explicitly.

Proposed bridge:

“No loaned sculpture is offered for sale. Could the same sculpture be loaned and offered for sale? The sentence rules that out. If it is loaned, it is not offered for sale. Now start from offered for sale: it cannot be loaned. Keep the idea on the if side; negate the other idea on the then side.”

After instruction, require a fresh construction rather than merely exposing those answers. Check the forbidden overlap and an allowed neither case separately. Then visible short sections:
- Not both: identify the TWO named ideas, show both is excluded while neither remains possible.
- Existing negatives: preserve original polarity and remove a double negative only for that same idea.
- Not all: at least one exception, not none; use a purpose-built quantity check rather than forcing a two-atom board onto a multi-member quantity claim.
- Cannot/permission: distinguish not allowed from did not happen. First examples should be unambiguous; keep policy and factual predicates separate in grading/readbacks.

Use “if side / sufficient condition” and “then side / necessary condition.” Replace supplied “Click here to keep X on the left” with an actual learner choice. Use diagram-first “Does not follow from this rule” comparisons consistently, not bare Wrong labels. Finish with independent Group4 practice, then3.3 explicitly compares WHERE each method puts the negated idea.

Bound Group4 to FOUR core checks: (1) forbidden overlap before diagrams; (2) fresh two-idea construction; (3) allowed neither case; (4) existing-negative construction after its model. Not-both, not-all and cannot/permission each get a short visible worked boundary example, not three extra required tasks. Their optional checks, paragraph/repair work and the cross-family comparison follow the lesson quiz or live in the next practice. A reader sees the boundary explanations even if optional practice stays collapsed. Each AND/OR split lesson has at most THREE core checks, followed by its separate quiz/practice; do not duplicate the same operation as multiple required widgets. Evaluate reading load and method recall in the proposed learner tryout.

## AND/OR writing and checks

- Correct the overbroad OR takeaway with an example distinguishing an asserted OR from an OR in a sufficient condition that has not been met. Preserve one-or-both inclusion.
- Add a fresh small check after each relevant meaning distinction: AND with one unknown member; AND with one false member; OR with both true; unknown is not false; rule not triggered versus rule violated.
- Keep facts GIVEN separate from what FOLLOWS. A click cannot silently turn an exploratory assumption into a conclusion.
- Separate2.4 compound denial from2.5 compound contraposition. Swap AND for OR (or OR for AND) and negate each condition; contraposition additionally reverses the complete sides. Neither is denying the whole conditional.
- Finish ao-transfer-2 success feedback with its actual conclusion, and fix the matching descriptions in all title/registry/data surfaces.
- Existing build/reveal boundaries already avoid leaking the expected arrangement; preserve those rather than regressing to an answer-filled example during a fresh task.

## Homework and external workouts

Use the audit report's full source catalog and email hash receipt. Do not edit original Desktop/email/corpus sources or silently treat an old answer key as truth.

Before ANY source item can be incorporated or graded:
1. Record exact source/page/item, its original question and key status, and whether it duplicates an existing exercise. Preserve identities/provenance separately from new course IDs.
2. Read the complete item and explanation. Inspect rendered PDF marks wherever extraction may have lost negation strokes. Independently derive the relationship, original negatives, modalities and required subject.
3. Validate both accepted orientations/contrapositives where relevant. Test at least the tempting invalid reverse and an allowed/forbidden counterexample. Record disagreements explicitly; repair only in the new authored item after adjudication, retaining the original evidence.
4. Unkeyed or ambiguous items remain ungraded/pending until a verified authored answer exists. Do not create fake grading or silently guess. Group4's missing key and the AND/OR key's reported errors require this work.
5. Introduce validated simple items first. Move compound, mixed-family, paragraph and repair tasks to their prerequisites. The joint July set is Group3-only despite its filename; use a truthful course title while leaving the filename unchanged.

Priority sources: September Group3 staged packet; Group4 HTML; selectively validated July AND/OR/joint packet; current semantic practice items. Integrate a small set of fresh checks first, then the remaining validated source sets in their proper independent practice positions. Do not claim all raw counts are unique or validated yet.

Loophole Unless Practice is a separate captured vendor procedure: relevant as a fluency reference, not text/examples to paste or authority to override Joshua's drill. Conditional Rehab and Unofficial Diagramming Marathon fit later optional transfer. Citation-only official-question sheets need actual question access and answer verification, not reconstructed stimuli. Linking belongs after chains; Negation Station belongs with whole-statement denial, not the initial Group3/4 operation. Retain these as deliberately placed later candidates rather than stuffing every related drill into the intro.

## Feedback, progress and feasibility

- Restore concise COMPLETE correct-answer reasoning in target lessons. Add `embeddedSuccessExplanation: 'first-sentence' | 'full'` to `FullCourseDrill`, defaulting to `first-sentence`. Truncate only embedded correct feedback with that default; nonembedded/reveal behavior remains full. In `FullCourseLesson`, opt into `full` for `exception-language`, `exclusion-language` and `negative-translation`, including the quiz passed to the dedicated UnlessLesson. Test those callers and unchanged default behavior. AND/OR uses `AndOrPractice`; fix its authored `why` separately, including ao-transfer-2's conclusion.
- Decouple copy edits from earned drill outcomes before changing explanation/hint strings. Current `FullCourseDrill` `JSON.stringify(drill.items)` invalidates saved runs for presentation changes. Inventory committed, verified released and current pre-build LOCAL item definitions/signatures separately. A commit alone does not prove release; dirty bytes are only a local compatibility generation. FullCourseDrill and AndOrPractice are currently untracked, so do not invent released signatures for them. Freeze current local definitions to preserve existing preview saves; recover any additional deployed baseline only from actual release evidence if it exists. Introduce explicit per-item grading revisions and required-membership revision, separate from presentation revisions. Migrate version-1 saves only when their stored signature matches an exact known frozen grading-equivalent baseline. Explanation/hint/layout-only edits preserve answers, misses, correctness, revealed/resolved flags, completion and original date without recording a new earned attempt. Changes to premise/target/meaning/restriction/operation or required membership require a new grading generation and an explicit fresh attempt, preserving the old run as history. Unknown legacy signatures stay recoverable with their historical record and an explicit revision notice; never silently reset or promote them. Test completed and partial runs, revealed answers, semantic-key and membership changes, unknown signatures and reload. Use a real committed/released-signature fixture where such a generation is established; otherwise label the fixture local and report the absent release baseline explicitly.
- Component-specific limits: `AndOrPractice` has no content signature; its builderSignature only controls hint freshness. Its planned `why`-only change therefore retains existing attempts and needs a reload regression, not a fabricated signature migration. Choice responses are positional: do not reorder choices or change answerAt/meaning without an explicit grading revision and archived prior attempt. `StagedReasoningDrill` fingerprints full item JSON (including hints/models/explanations), archives only three previous runs on changes, and saves on mount. This plan does not edit its items or fingerprint path; retain a nonregression check. If later authoring would change those generated strings, stop that extension until copy-only compatibility is separately implemented and tested there. Do not silently broaden this build into a general migration of all drill engines.
- Reuse existing AST/equivalence, hint/retry/reveal and keyboard placement patterns. Drag support and the constrained two-card shell are new work; the broad existing editor/refresher cannot simply be embedded without state/persistence adapters.
- Inline checks have a separate formative state namespace from independent quizzes/drills. Revising/revealing never overwrites saved earned correctness, attempts or assignment completion. Learning text remains scrollable, hints/checks do not lock course navigation, and explicit lesson completion behavior stays intact.
- Keep paid film narration out of this build contract. Finalize writing first. Audit existing films against final copy; retain logically consistent media, omit/defer an unavailable film honestly, and report any consequential contradiction. A paid rerecording needs its own explicit budget approval. Do not silently publish stale/inconsistent media.

## Proposed build order and proof after approval

1. Writing/title/sequence corrections, original authored lesson-check items and source-item adjudication ledger; review complete prompts, hints, success/reveal and English readbacks, not just initial strings. Verify original lesson items here; pending homework is not a dependency of lesson construction.
2. One constrained board with deterministic semantics, complete drag/click/keyboard parity, both families and existing negatives. Exercise it before duplicating examples.
3. Integrate Group3/4 checks and comparison, AND/OR split/checks and complete feedback; revision-safe routing/progress; optional shared Unless Drill experience.
4. Add validated homework items at their appropriate stage, retaining independent practice and historical records. Keep unresolved items out of automatic grading.
5. Run focused semantic/interaction/progress tests, `npx vitest run src/bootcamps/conditionals --testTimeout=60000 --maxWorkers=1 --fileParallelism=false`, relevant UnlessDrill/refresher tests, `npm run typecheck`, and `npm run build`. Test count is a baseline, not a substitute for coverage. Restore the known Vite-generated mcp stub only if its initial clean state is verified; never revert unrelated work.
6. Browser proof at375/768/980/1280 and docked content widths; touch-like pointer drag, click-only and keyboard-only; correct/wrong/partial/retry/reveal/reset; cancelled drag, both orientations, existing negatives, reduced motion, no overflow, focus/announcements and readback correspondence. Check old combined completion projections, new split IDs, reload/resume, unchanged standalone drill behavior and optional drill not becoming a completion gate. No live assignment writes/provider calls needed for local deterministic tests.
7. Fresh Claude code/source inspection of the final scoped changes; host verifies actual browser/media evidence separately. A source-only review cannot certify signed-in production, real screen-reader speech, physical phones, continuous media or learner transfer.

Success means a reader can state the method in ordinary words and build/repair a new correct rule, while understanding what it leaves open. A small observed learner tryout is the eventual check of replicability; automated checks only establish implementation/semantic properties. No learning-outcome guarantee or production release is implied.
