# Conditional writing and practice plan: Claude review log

2026-10-27. Codex coordinates; Claude independently reviews the plan through Claude Code CLI. This is a NEW planning scope after the completed notation fixes. No implementation authorization is inferred from the earlier build. User confirmed student construction, ungraded hint/retry checks followed by optional existing Unless Drill, and proposing separate negation/contrapositive AND/OR lessons. Groups3/4 already separate; recommend retain them. Sources audited with limits documented in docs/conditionals/2026-10-27-writing-and-practice-audit.md. Seven primary sent attachments SHA-match Desktop copies.

Plan: docs/implementation-plans/2026-10-27-conditional-writing-and-practice.md.
Maximum5completed plan reviews; if build later authorized, maximum2fresh inspections. No opt-out. Requested reviewer model/effort: none; use CLI configured defaults, report actual observed identity. CLI C:/Users/Joshu/.local/bin/claude.exe version2.1.309. Run diagnostics outside checkout. No commit/push/publication, source mutation, live assignment writes, external sends or paid narration calls.

Review must assess the teaching method, scope/feasibility, titles and sequencing, interaction and answer-reveal boundaries, data/progress compatibility, and source-adjudication contract. Earlier tests/inspections concern a different change and do not validate this plan. Preserve exact reviewer coverage/limits and do not turn source-only approval into learner/production evidence.

## Review round1

Result: C:/Users/Joshu/AppData/Local/Temp/claudex-conditional-writing-20261027/round1/claudex-jgvwm800/result.json. Verdict REVISE; observed claude-sonnet-5-5. Plan hash38c9a1ebe57ba7592c19da5bbdf66d118b723020f910cbc67d3c6e4366c6a800.

{
  "verdict": "REVISE",
  "summary": "The plan is thorough and guards well against answer leakage, grading shortcuts and unvalidated source items. Two parts are underspecified against the repo as it stands: the 2.4/2.5 split mechanics and the ordering of the practice drills. They need to be nailed down before a build is authorized. I checked the progress and registry code the split would touch (openingCoursePath.ts, courseProgress.tsx) and the audit report's existence. I did not run anything.",
  "findings": [
    {
      "id": "F1",
      "severity": "high",
      "path": "src/bootcamps/conditionals/openingCoursePath.ts:75-81",
      "evidence": "The existing projection supports exactly one source per lesson. SPLIT_LESSON_SOURCES maps only 'and-or-either-condition' to the combined AND lesson at AND_OR_COMBINED_REVISION. The plan keeps 'and-or-negate-group' as the compatibility ID, but that ID already carries AND_OR_SPLIT_REVISION and already means 'contrapositives'. Its content will change: the beginner negation section is removed and it moves from 2.4 to 2.5. Two outcomes are possible. If the revision is not bumped, existing completions silently apply to the changed lesson, and the new 2.4 has no defined source to project from. If the revision is bumped, courseProgress.tsx:60-62 sets reopen and status 'started', so previously completed learners lose done status. The plan does not say which of these happens, or which saved revision proves a completion 'contained both' for the negate-group to 2.4 case. That revision differs from the combined AND/OR one.",
      "fix": "Specify the new revision constant and a source map that allows more than one projection target. Define which stored revisions of 'and-or-negate-group' count toward the new 2.4 and 2.5, and whether bumping the revision is meant to reopen. Add tests for completions saved under the combined revision, the split revision and the new revision."
    },
    {
      "id": "F2",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/openingCoursePath.ts:82",
      "evidence": "chapterTwoOrder places 'and-or-negate-group' before 'and-or-whole-group-practice', and the entry is lessonNumber '2.4' with unitId 'de-morgan'. The plan inserts a new 2.4 and renumbers the old lesson to 2.5, but never states where 'Practice negating AND and OR' goes. If the order stays as it is, the negation drill comes after contrapositives, so it tests a method taught before the contrapositive lesson. Lesson numbers are also hard-coded in the registry, in summaries and possibly in tests. Renumbering would shift displayed numbers for the existing practices and any '2.4' references.",
      "fix": "State the full new Chapter 2 order explicitly: 2.4 negate, then negation practice, then 2.5 contrapositives, then placement and transfer practice. Grep and update every lessonNumber and '2.4' consumer, including routes, OpeningCourseContent, tests and the progress-summary surfaces. Decide the unitId for the new lesson."
    },
    {
      "id": "F3",
      "severity": "low",
      "path": "docs/implementation-plans/2026-10-27-conditional-writing-and-practice.md (Feedback section)",
      "evidence": "The plan says FullCourseDrill slices the correct-answer reasoning after the first sentence and asks for 'an explicit target lesson presentation option'. It names no callers and no default. Other lessons share this component and the plan wants their layout unchanged. The risk is a global behavior change that affects the unrelated chapters.",
      "fix": "Make the option default to the current behavior and opt in per lesson ID. List the callers in the plan and add a regression test asserting that non-target lessons are unchanged."
    }
  ],
  "coverage": [
    "Read the full plan.",
    "Confirmed the audit report file exists, but did not read its contents.",
    "Inspected the chapter-2 registry, split revisions and SPLIT_LESSON_SOURCES in openingCoursePath.ts.",
    "Inspected the completion projection and reopen logic in courseProgress.tsx.",
    "Grepped the files that reference 'and-or-negate-group'.",
    "Grepped FullCourseDrill for the reasoning slicing; the matching line was truncated, so I could not confirm the exact slicing code."
  ],
  "limitations": [
    "Did not read the audit report contents, the source packets, or the voice and copy standards.",
    "Did not inspect the AST/equivalence engine, Unless Drill, the assignment code or route code in depth.",
    "Did not run tests or a browser; no claim about passing tests.",
    "Drag, accessibility and learner-transfer qualities cannot be assessed from the plan alone.",
    "The working tree has substantial uncommitted modifications that I did not diff."
  ]
}

Host dispositions: F1 accepted high. Replace abstract split-compatibility promise with exact revision/source projection contract after tracing current consumers. F2 accepted medium for explicit complete order and label/reference consumers; prerequisite order will place placement practice with2.3, negation practice immediately after2.4 and transfer after2.5, rather than blindly adopting the reviewer's suggested placement order. F3 accepted low; specify FullCourseDrill embedded-success option default and FullCourseLesson target-ID opt-in plus unrelated regression. No code changes. Next round will additionally ask for actual writing/teaching-contract review; round1 did not read the audit or voice/source material and is not independent coverage of those.
`n## Round 2`nResult: C:\Users\Joshu\AppData\Local\Temp\claudex-conditional-writing-20261027\round2\claudex-urdliq7e\result.json
{
  "verdict": "REVISE",
  "summary": "The revision resolves the three round-1 findings in substance. The plan now has explicit IDs and revisions, a stated Chapter 2 order, per-target allowlists, provenance, and a default-preserving `embeddedSuccessExplanation` option. The teaching contract and the audit's boundaries (extracted-text versus rendered evidence, keys not authoritative) are sound. Four plan-level defects remain: a build-order dependency, an under-specified frozen-signature baseline, a missing assignment-impact analysis for the new lesson, and no cap on how much a single lesson has to carry. None needs a design change; each needs specification before an implementation is authorized.",
  "findings": [
    {
      "id": "R2-1",
      "severity": "medium",
      "path": "docs/implementation-plans/2026-10-27-conditional-writing-and-practice.md (Group 3 'Fresh transfer' vs 'Proposed build order' steps 3-4 and 'Homework' rules)",
      "evidence": "The Group 3 lesson is to include 'one modest paragraph extraction and one correction task from validated homework'. Build order step 3 integrates the lesson checks. Step 4 is where homework items are added after adjudication, and the Homework section forbids using any source item before it has been adjudicated, and says 'Introduce validated simple items first. Move compound, mixed-family, paragraph and repair tasks to their prerequisites.' So the lesson would depend on items that are not yet validated when it is built. The audit confirms Group 3 key explanations contradict their own correct sentences and the policy example shifts between permission and conduct. The paragraph and repair tasks are exactly the ones that are mixed-family or compound. Building the lesson first leaves either pending ungraded placeholders or unvalidated content in a lesson.",
      "fix": "Make the lesson's transfer checks original authored items in step 3, and let adjudicated homework items enter only the independent practice sets in step 4. Alternatively, move adjudication of the specific items to step 1. State that lesson checks never depend on pending source items."
    },
    {
      "id": "R2-2",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/components/FullCourseDrill.tsx:91 (plan: 'Decouple copy edits from earned drill outcomes')",
      "evidence": "Saved runs are keyed on `JSON.stringify(drill.items)`. The plan says to migrate v1 saves only when their stored signature matches a 'known frozen baseline'. The working tree has large uncommitted edits to drillDemos.ts, curriculum.generated.json, assignments and content files, so the current working-copy item text may never have been released. Users' stored signatures come from earlier released builds. Freezing the working-tree strings as the baseline would match no real saves, and every existing learner would take the 'unknown signature' path. The plan also does not say how the same concern applies to AndOrPractice (whose `why` it edits) and StagedReasoningDrill, which use different fingerprint mechanisms (AndOrPractice.tsx:21, StagedReasoningDrill.tsx:103-121).",
      "fix": "Define the baseline set as signatures computed from the last released/committed revisions (and any intermediate released ones), not from the working tree. List which drill components the migration covers, and for AndOrPractice and StagedReasoningDrill, state their separate fingerprint behavior. Add a test using a stored signature from a released commit."
    },
    {
      "id": "R2-3",
      "severity": "medium",
      "path": "docs/implementation-plans/2026-10-27-conditional-writing-and-practice.md ('Course structure': accessAnyOfUnitIDs ['de-morgan'])",
      "evidence": "The new lesson is placed in unit `de-morgan`, so existing full-course and de-morgan learn assignments 'consequently include the new lesson'. The plan says projection never grants access, but does not address completion. A student whose assignment was complete before the change gains a new, incomplete required lesson. Under the plan's rules, a learner with only unknown or missing revisions, or a started record, gets no projected credit. Their assignment would silently revert from complete to incomplete, and denominators change for in-flight assignments and teacher progress views. `src/lib/assignWork.ts` and `classroomItems.ts` appear in the working-tree modifications, and the plan lists neither as touched.",
      "fix": "Name the assignment/classroom completion consumers. Specify whether already-completed assignments are grandfathered or the new step is excluded from existing grants' completion math, and add a test that a completed de-morgan assignment stays complete for projected learners. Trace the teacher-facing progress counts as well."
    },
    {
      "id": "R2-4",
      "severity": "low",
      "path": "docs/implementation-plans/2026-10-27-conditional-writing-and-practice.md ('Group 3 writing and inline checks', 'Group 4 writing and inline checks')",
      "evidence": "Novice load is not bounded. Group 3 carries meaning, construction, repair, existing-NOT, without, until, fresh transfer, paragraph extraction, correction, the optional speed drill and the existing four-question quiz. Group 4 carries the sculpture bridge, fresh construction, overlap/neither, not-both, existing negatives, not-all and cannot/permission, plus comparisons. The plan says checks 'do not lock navigation' but sets no order, no required-versus-optional split and no maximum. A first-time learner could face more than ten ungraded stops in one note. The 'do not cold-test' principle is kept, but the cumulative load is the risk to reproducibility.",
      "fix": "Give each lesson a short numbered sequence marking which checks are core and which are collapsed/optional, with a stated maximum for the core set. Move the correction and paragraph tasks, and the speed drill, to after the lesson's quiz or to the following practice. Pair this with the planned observed learner tryout."
    },
    {
      "id": "R2-5",
      "severity": "low",
      "path": "docs/implementation-plans/2026-10-27-conditional-writing-and-practice.md ('Shared constrained construction board' step 1; 'Joshua confirmed' 3; 'Course structure' film note)",
      "evidence": "Decision 3 says lesson checks are ungraded. Board step 1 says 'do not award credit for clicking already-highlighted answers' and step 5 says reveal 'does not create course credit'. The word 'credit' for ungraded checks is ambiguous and could be implemented as a recorded score. Also, the retained 2.5 film is titled 'Deny the whole group' while 2.4 (negation) has no film, so the film that teaches negation sits with the lesson that no longer teaches it.",
      "fix": "Replace 'credit' with 'success state' for formative checks. State the media decision explicitly: either the retained film is retitled and scoped to contrapositives, or it is deferred honestly, per the plan's own media rule."
    }
  ],
  "coverage": [
    "Re-read the full revised plan against the round-1 findings F1-F3 and judged them resolved at plan level.",
    "Read the full audit report, including the source-issue and provenance sections.",
    "Read the full teaching-voice.md.",
    "Read courseProgress.tsx lines 1-80 and verified the projection, save and resume logic the plan intends to replace.",
    "Grepped openingCoursePath.ts, courseEditionProgress.test.ts and the progress types for revision constants and sourceCompletion.",
    "Verified FullCourseDrill's signature and truncation lines (91, 108).",
    "Confirmed signature/fingerprint mechanisms in AndOrPractice and StagedReasoningDrill by grep only."
  ],
  "limitations": [
    "Did not read lsat-teaching-voice-standard.md or COPY-CORRECTIONS.md, so spec fidelity against them is not checked.",
    "Did not open any Desktop homework PDFs/HTML, the Loophole corpus or the email receipt; source claims rest on the audit's own account, which is host and agent extracted text. No rendered-PDF or visual inspection by me.",
    "Did not read the current Group 3/4 or AND/OR lesson components (UnlessLesson, FullCourseLesson, AndOrLessons) in full, nor the assignment/classroom code. R2-3 is inferred from the plan and git status and needs confirmation.",
    "Did not diff the uncommitted working tree, so which signatures were released is unverified.",
    "No tests or browser run; no claim of passing tests. Learner transfer, real accessibility and drag behavior cannot be assessed from a plan."
  ]
}
Host dispositions: R2-1 accepted original authored lesson transfer independent of pending homework. R2-2 accepted released/committed baseline distinction and component-specific fingerprint audit. R2-3 accepted fixed existing-grant completion membership, tracing all consumers before final contract. R2-4 accepted four core checks per G3/G4 and three per AND/OR lesson with optional extension after quiz. R2-5 accepted formative state terminology and honest mixed-film deferral. No app code changes.

## Round 3
Result: C:\Users\Joshu\AppData\Local\Temp\claudex-conditional-writing-20261027\round3\claudex-egeja81q\result.json
{
  "verdict": "REVISE",
  "summary": "Round-2 findings R2-1 to R2-5 are resolved at plan level. Lesson checks are now original and bounded to 3-4 core items. The homework dependency is removed. The assignment-requirement freeze and the drill baseline are carefully scoped. Three smaller plan defects remain, found against the teaching standard, COPY-CORRECTIONS and the current lesson components. One is a teaching-sequence gap in Group 3, one is an unspecified Group 4 implementation surface, and one is a copy-wording constraint missing from the plan. All three are fixable by adding specification, not by redesign.",
  "findings": [
    {
      "id": "R3-1",
      "severity": "medium",
      "path": "docs/implementation-plans/2026-10-27-conditional-writing-and-practice.md (Group 3 'Replace the first passive two-answer choice panel with the constrained build attempt'; core check 2 'after the model')",
      "evidence": "The standard says 'Define before demonstrating' and 'Do not cold-test an untaught method', and the plan repeats this. Today UnlessLesson.tsx:41-56 (EitherIdea) is the only worked demonstration of the pick-negate-place method on the game/rain sentence. The plan replaces it with a build attempt, and core check 2 requires construction 'after the model'. After the replacement, no section demonstrates the method before the first attempt, because the earlier sections (lines 67-89) only check meaning and negating one idea. The first board attempt then becomes the cold test, or check 2 follows no model. The plan's suggested copy states the steps but gives no worked case.",
      "fix": "Specify the sequence explicitly: (a) keep one fully worked example, such as the game/rain pair shown both ways or a different original pair, before any build; (b) make the first board use the same example with visible step prompts (choose, negate, place), counted as a guided build; (c) make core check 2 the unscaffolded construction on a new sentence. Say which one is the 'model'."
    },
    {
      "id": "R3-2",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/components/FullCourseLesson.tsx:19-26 (plan: Group 4 'deliberate presentation comparable to Group 3')",
      "evidence": "Only `exception-language` has a dedicated component (line 19). `exclusion-language` and `negative-translation` go through the shared template: Demonstration answer-reveal buttons (line 25, the source of 'Click here to keep X on the left'), a collapsed `contextHeading` disclosure holding not-both/not-all/cannot (lines 20-22), and the '× Wrong' / '✓ Right' labels (line 26) that other lessons also render. The plan requires visible short sections, learner-chosen building, and 'Does not follow from this rule' cards, but lists no Group 4 component, dispatch or file. Changing the shared template to deliver this would change unrelated lessons, contradicting 'Preserve unrelated lessons' layout/behavior'.",
      "fix": "Name a dedicated Group 4 lesson component and a FullCourseLesson dispatch for `exclusion-language`, parallel to UnlessLesson. Decide how `negative-translation` gets its 'where the negated idea goes' comparison without altering other lessons, with a test that non-target lessons render unchanged."
    },
    {
      "id": "R3-3",
      "severity": "low",
      "path": "docs/implementation-plans/2026-10-27-conditional-writing-and-practice.md (AND/OR section: 'switches the connector'; Teaching contract)",
      "evidence": "COPY-CORRECTIONS 2026-10-25 states 'connector is not good student wording in AND vs OR. Name AND, OR or the + sign'; 'whole group' and 'full group' are also rejected, and 2026-10-26 prefers 'both conditions' / 'either condition'. The plan uses 'connector' in its own description of the 2.4 content and the teaching contract does not list it as banned. A writer working from the plan's phrasing could carry it into student copy for the new 2.4 lesson.",
      "fix": "Add 'connector' to the banned student wording in the teaching contract. Phrase the 2.4 operation as 'swap AND for OR (or OR for AND) and negate each condition'. Also list the COPY-CORRECTIONS 2026-10-25 and 2026-10-26 entries as a required review input for the new lesson."
    }
  ],
  "coverage": [
    "Re-read the full revised plan against R2-1 to R2-5; the dispositions are consistent with the text.",
    "Read all of lsat-teaching-voice-standard.md and teaching-voice.md.",
    "Read COPY-CORRECTIONS.md lines 484-535 (AND/OR and Group 3 entries) and grepped the rest for AND/OR/unless/exclusion entries.",
    "Read UnlessLesson.tsx and FullCourseLesson.tsx in full.",
    "Grepped AndOrLessons.tsx for Wrong labels and conventions, and spot-checked the requiredForEditionCompletion/registryStepAllowed consumers cited by the assignment section (routes.tsx, OpeningCourse.tsx, openingCoursePath.ts).",
    "Re-read the audit report (previous round) and the source-qualification language; the plan keeps the audit's extracted-text versus rendered-evidence distinctions intact."
  ],
  "limitations": [
    "Did not read AndOrLessons.tsx in full or the Group 4 content source (fullCourseContent.ts); R3-2 rests on FullCourseLesson.tsx and a grep.",
    "Did not read assignments.ts, assignWork.ts or ConditionalAssignmentFields.tsx; the assignment-requirement design is judged only from the plan's description and the grep of its named consumers.",
    "Did not independently check the homework PDFs or HTML; the audit's own claims were taken as stated.",
    "No tests, builds or browser runs; nothing here shows implementation or learner transfer works. Approval of the plan would be plan approval only."
  ]
}
Host dispositions: R3-1 accepted retain fully worked game/rain model and guided rehearsal before fresh independent check, preserving four-core cap. R3-2 accepted dedicated ExclusionLesson and NegativeTranslationLesson dispatch, generic non-target behavior unchanged. R3-3 accepted exact copy bans and AND/OR swap wording. No app code changes.

## Round 4: approved plan
Result: C:\Users\Joshu\AppData\Local\Temp\claudex-conditional-writing-20261027\round4\claudex-w3gl3o8v\result.json
Plan SHA256: 2ff0817d0463fef3753b7154d7c5505c0e9a68327ea3c06847a92410c9fc3aa4
Requested model/effort: CLI defaults. Observed: claude-sonnet-5-5.
{
  "verdict": "APPROVED",
  "summary": "I found no material unresolved plan-level defects. R3-1 is resolved. Group 3 keeps one fully worked game/rain model with both orientations, then a guided rehearsal that is not a core check. The independent board comes only after that, on a new sentence with its answer hidden. R3-2 is resolved. Dedicated ExclusionLesson and NegativeTranslationLesson components are dispatched only for their own IDs, and the generic template is explicitly protected by a regression test. R3-3 is resolved. The student-wording bans for connector, whole group, full group and complete group are added, and the plan now says to swap AND for OR (or OR for AND) and negate each condition. This is plan approval only; nothing about implementation, tests, browser behavior or learner transfer is claimed.",
  "findings": [],
  "coverage": [
    "Re-read the final plan in full and checked each round-3 disposition against its text.",
    "Earlier rounds covered the audit report contents, teaching-voice.md, lsat-teaching-voice-standard.md, COPY-CORRECTIONS.md entries on AND/OR and Group 3, UnlessLesson.tsx, FullCourseLesson.tsx, courseProgress.tsx, the openingCoursePath.ts split registry, and the FullCourseDrill signature and truncation lines.",
    "Spot-checked that the assignment-requirement consumers the plan cites (registryStepAllowed, requiredForEditionCompletion) exist in routes.tsx and OpeningCourse.tsx."
  ],
  "limitations": [
    "Did not re-open assignments.ts, assignWork.ts, ConditionalAssignmentFields.tsx or AssignmentBuilder.tsx. The assignment-requirement freeze is judged from the plan and the consumer grep only; the build-stage inspection should verify it.",
    "Did not read the Group 4 content source (fullCourseContent.ts), the full AndOrLessons.tsx or the Unless Drill source.",
    "Did not inspect the homework PDFs or HTML, the Loophole corpus or the email receipt. I took the audit's claims as stated; they rest on host extracted text, not visual or rendered inspection.",
    "No tests, builds or browser runs were done. Drag, accessibility, projection behavior and learner transfer remain to be verified after a separately authorized build."
  ]
}
Host disposition: approved plan only, no unresolved findings. No new app implementation, tests/build/browser validation, commit/push/publication or live data writes in this planning phase. Source and independent-review limits remain explicit.
