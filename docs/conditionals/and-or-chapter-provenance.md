# Conditional Bootcamp, Chapter 2 (And/Or): provenance and coverage

Developer-facing note. Nothing here appears in the student flow. Status of every line of copy: implementation draft, not Joshua-approved wording.

## What was adapted, refined and deferred

| Source (vault paths, read 2026-10-19) | Adapted | Refined | Deferred or left out |
|---|---|---|---|
| `Loophole Lecture/Conditional Reasoning 2026-10-18/How to Diagram (and Contrapositive) And Or/` (native captions are automatic, not listening-verified) | Indicator targets the complete group; AND needs both, OR needs at least one and is inclusive; contrapositive of AND/OR by negating the whole group; vertical layout as a readability recommendation | Vertical stack is presented as readability only, never as the one valid logic. "Flip the connector" is never a free-floating instruction: it is derived from when a group fails. Readable condensed conditions replace letters | Entertainment tangents; the source's lecture-specific examples and media; book page references; the textbook figures |
| `How to Diagram Basic Conditionals`, `How to Chain Conditionals` (native captions) | Prerequisite meaning, complete conditions, not chaining away an unmet conjunct | Partial chain is a typed two-rule item (a rule reaching one conjunct leaves the other needed) | Chaining as its own lesson |
| `corpus/loophole-online/bootcamps/conditional-reasoning/and-or-if-and-only-if-inclusion-and-exclusion/README.md` | Coverage of AND/OR placement, inclusive OR, invalid split, one-branch error | Entire mixed 14-question drill NOT imported; no source prose or questions reused; final-answer states there were not independently verified against every diagram image | If-and-only-if, inclusion/exclusion (Group 3/4, biconditional, quantity) |
| `corpus/loophole-online/workouts/unofficial-diagramming-marathon/README.md` | Noted as later application only | Not assigned as new beginner homework | Entire Conditional Rehab routine |

All examples and questions are original. Exclusive OR appears only as a one-paragraph meaning boundary in lesson 2.1.

## Structure

- Lessons 2.1 to 2.3 and four practice sets are in `openingCoursePath.ts` as Chapter 2 (`part: 2`). Existing step IDs, routes, videos and stored work are untouched.
- Step IDs are new and unique and persist through `progress.course[stepId]`. `unitId` `and-or` / `de-morgan` is an access topic only. `CONDITIONAL_OPENING_UNIT_IDS` is unchanged, so legacy lesson/guided/practice routes, saved runs, read marks and the opening-edition review rules behave as before.
- Typed semantics live in `content/andOrLogic.ts`. Every graded compound item in `content/andOrItems.ts` is structure: atoms with complete canonical labels (`yes` / `no`), flat AND/OR groups, negation flags. Answer keys, wrong options, hints, contrapositives and truth-table checks are derived from that structure in `content/andOrTasks.ts`. Learner-written short labels are drafts only and are never evaluated as logic.
- No paid grading, no provider call, no backend function, no schema change.

## Practice sets (6 items each)

1. `and-or-meaning-practice` (and-or): is the whole group established, ruled out, or open. Includes inclusive OR and an unmentioned member.
2. `and-or-placement-practice` (and-or): the four placements, one-branch OR, elimination, and a two-rule partial chain.
3. `and-or-whole-group-practice` (de-morgan): denying a group, including an existing negative member cancelling.
4. `and-or-transfer-practice` (de-morgan): choose or build the contrapositive, including two build items and one contrapositive-use item.

Difficulty and access follow the existing contract: curriculum difficulty stays `medium` for both topics, an explicit assigned difficulty wins, and no step is granted through `group-2`.

## Media decision

No MP4 was produced. The existing Conditional films are static files under `public/media/conditionals/`; this checkout holds no generator for them (nothing under `scripts/` builds them). The Contrapositive lecture's source project is recorded in the vault as living outside this checkout and was not opened or run in this session, and the plan allows no paid generation or placeholder video. No local, free, reproducible workflow was verified here, so none was attempted. The three lessons are complete in writing with purposeful native interactions: a four-combination table, a placement explorer with fact probes, a three-step flip/deny/switch demo and an eight-case equivalence table. No video file, poster or caption track was added. Absence of a video is a decision, not a defect.

## Known limits

- Narration, copy and visuals are unreviewed by Joshua and unreviewed in a signed-in browser.
- The two legacy touch-ups are now made in `applications.source.ts` (the And/Or worked diagram says "may enter", and the negation method says AND/OR switch only as part of denying the whole compound). The generated content files change only after the host runs `npm run content:conditionals`; until that run is checked in, the generated output still carries the old wording.
- Progress: Chapter 1 steps keep permanent "done" status. Chapter 2 practice sets alone send `reopen`, so a finished set returns to "started" with a lower done count when an edit invalidates required work. Drafts, misses and the last hint are kept, and the hint is labelled earlier feedback.
