# Conditional work belongs in the existing bootcamp

## Decisions settled on 2026-10-27
Joshua approved implementation after the inventory and clarification interview. The expanded plan was independently approved in Claude review round 4, then its hash check passed. Work remains local and uncommitted. Earlier publication approval does not cover this expanded scope.

An activity means a named exercise collection, such as Conditional Rephrase or Missing Links. A mode changes the task or format within a collection. A topic filter narrows the material. A guided set is an existing LSAT question-bank activity with its own instructions, launch rules and history. A lesson teaches the skill; the activity provides practice. These terms do not imply different assignment tables or new copies of questions.

## Import map
| Existing work | Central location and treatment |
|---|---|
| Conditional Rephrase, 62 sentences | Translate the language; original paper-first paired-diagram player, group/timing settings and original history |
| General in Conditional practice | Same Rephrase collection, not another bank or a mixed mode |
| Linking, 8 questions | Connect rules; retain separate questions and history |
| Missing Link, 22 questions | Missing Links activity, attached to lesson 5.6; original player and IDs |
| Supplied Desktop file, 12 exercises | Already PHOTO-ML01..12 in the 22-question bank; no disconnected imported copy |
| Must Be True, 10 questions | Draw conclusions; existing player and history |
| Indicator sorting | Translate the language; at least two plausible groups |
| Sentence flashcards, 12 cards | Dedicated Flashcards area and centre recall entry; group/task/review filters and polished contrast rows |
| Diagram practice, 16 original plus 5 fresh transfer items | Translate the language; preserve original task, negatives and contrapositive options |
| Unless Drill | Group 3 plus centre entry; same four forms and earned speed milestones |
| Existing numbered course drills and legacy bank | Keep the teaching spine and existing question/run identities; expose conditional skill/level/mode practice |
| 13 explicitly Conditional Logic guided sets | Optional Easier/Medium/Harder application library, inside the bootcamp shell |

Easier sets are 1, 2 and 4; Medium 1 through 6; Harder 1 through 4. There is no Easier 3 record. Native and HTML names are aliases, not extra sets. The 104 nominal slots do not prove 104 distinct questions; filtered pools can overlap. Catalog estimated minutes are not a new countdown limit.

## Repetition
Five original flashcard/diagram prompts are identical across formats: Only members vote; The plant dies without water; No reptiles are warm-blooded; All dancers stretch; Nina will not sign until the terms change. Joshua accepted a few familiar repeated sentences followed by fresh independent practice. Five new diagram transfer sentences address those operations. No exact normalized prompt duplicates were found within Rephrase62 or between that bank and the original card/diagram pools. This is not an exhaustive semantic-equivalence audit.

Linking and Missing Link have overlapping chain-gap skills but distinct records. They remain separate. For example LINK1 and PHOTO-ML05 have the same structure under renamed letters; that does not establish duplicated questions.

## Assignments and progress
Teachers can assign the full bootcamp or one named activity with supported topic/mode settings. Full legacy and full v3 course grants include all conditional collections. Stage/area/skill grants retain their taught-unit restrictions; general practice remains bank practice; exact activity grants unlock no numbered lessons. Fetched source route and metadata must agree; a URL cannot expand a grant.

Reuse owned work and offer another attempt. Preserve immutable prior question snapshots, answer history, scores and session identities. Original Rephrase assignments stay assignments; new practice stays practice. Bootcamp assignment IDs remain distinct from guided assignment IDs. No student assignment is fabricated to make embedding work.

Optional imported work does not add mandatory course requirements, migrate old assignments, reset earned completion or create mastery credit from viewing/revealing/self-rating. Browser-only recall state says it is browser-saved; account-backed engines keep their existing save contracts.

## Exclusions
Mixed Negation Station and Spot the Relationship are excluded entirely. Causal work, broader SA/NA Missing Links guided sets, and the two unapproved Quantifier guided sets are excluded from this import. Existing quantifier lessons in the full course remain as before.

## Refinement standard
Preserve task formats and existing refinements. Use clear copy, complete conditions, correct modality/time boundaries, crossed-out short negatives, hints before reveal, useful retries and honest results. Flashcard comparisons use separate statement rows and vs, without em dashes. The bootcamp keeps its warm paper/ink style, readable hierarchy, consistent spacing and visible interaction states.

## Evidence boundaries
Inventory is source-verified. Local UI and automated checks are recorded separately in the design/implementation evidence. Source RLS supports authenticated reads of published guided definitions and owned progress; it is not a current live student acceptance result. This work creates no production runs, assignments, notifications, migrations or deployment.

## Practice centre structure interview reopened

Joshua rejected the implemented open-list appearance as insufficiently organised and requested two distinct directions before further changes, then invoked grill-with-docs-claude. Earlier A approval covered the prior implementation only; the next layout remains undecided. No app edit is authorized by this interview.

Confirmed requirements and glossary above remain unchanged. Current homepage has all ten permitted collections, no aggregate progress data, stable presentation-group filtering and existing activity links. The problem is structural and visual: text-like row affordances, repeated dividers, equal competing columns and detached review modules. These are host interpretations of Joshua's supplied screenshot, not measured usability findings.

Pending questions sent together:
1. Primary discovery: skill first (host recommendation), named activity first, or chapter first. Trade-off: novice orientation vs direct known-activity lookup vs course sequence.
2. Entry: open existing activity immediately with settings inside (host recommendation), or add preview/setup first. Trade-off: shortest navigation vs more context before launch.

After answers, update existing docs/implementation-plans/2026-10-27-practice-centre-design.md rather than creating a competing plan. Develop two distinct visual structures with actual content before user selects. Preserve existing local implementation while comparing proposals. No new ADR needed for a reversible visual choice. Codex coordinates and would build after authorization; Claude independently reviews the settled revised plan and later inspects code in a fresh session. Default five plan rounds, two fix rounds, two inspection rounds, no requested model/effort overrides. Claude's last finished-code attempt was HTTP429 usage_limit_reached, not an approval; do not retry blindly or substitute providers. Review diagnostics remain outside checkout. Source references: conditionals/CONTEXT.md, ConditionalActivityCentre.tsx, activityRegistry.ts and prior evidence under docs/design-evidence/practice-centre-a-20261027.

### Confirmed discovery and entry decisions
Joshua selected skill first: translate, connect rules, recall, apply. He selected preview and settings before entering the activity, overriding the host recommendation of immediate entry. Do not implement immediate launch from catalogue cards for this next direction. Starting from the preview must retain configured topic/mode and existing account/run identity; merely viewing a preview must never create a run or completion credit.

The two next visual proposals should therefore compare a split workbench (activity choice beside a preview on desktop, adapted to phone) with an inline expansion (preview directly below selected activity), not compare the now-rejected immediate-entry catalogue with a preview flow.

Next pending question: read-only unanswered example + settings (recommended), playable sample, or instructions/settings only. This determines whether preview introduces a second exercise flow. User has not yet answered. Do not infer permission to add a playable drill. No app edits made in this interview.

### Category clarity refinement requested
Joshua found Translate/Connect rules/Recall/Apply unclear and requested 21st.dev MCP research. Search and full retrieval of Origin UI Radio Group Card demo 747 informed selection cards with a title, description and checked control in the isolated prototype. Proposed labels: Translate sentences, Connect conditional rules, Review flashcards, Practise LSAT questions and Mixed conditional practice. The broad bank is proposed as a separate category. Counts describe full-course collections only, not progress or constrained-grant availability. Desktop and phone screenshots were opened; overflow, category selection, activity selection, settings and stub Start checks passed. No real app changes, package installation, run creation or publication. Grouping proposals await user acceptance. Component reference: https://21st.dev/@originui/components/radio-group

### Preview contents confirmed
Joshua selected instructions and settings only. No example sentence, sample answer, playable sample, new grading flow or progress credit belongs in the preview. Flow: choose skill, choose activity, read instructions/configure permitted settings, Start existing activity. Propose split-workbench versus inline-expansion designs before app changes.
