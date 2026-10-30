# Local implementation and independent code inspection

User authorized implementation on 2026-10-27. Host/builder Codex; Claude CLI default reviewer, observed claude-sonnet-5-5. No commit/push/publication/live writes. Prebuild HEAD6a167c8555b4a404334310aad48a5d748b1b0861; substantial pre-existing dirty work preserved using a separate local snapshot.

## Inspection 1

Result: C:\Users\Joshu\AppData\Local\Temp\claudex-conditional-writing-build-20261027\inspection1\claudex-p29ttk92\result.json

{
  "verdict": "APPROVED",
  "summary": "I found no material defects in the files I inspected, but that is a partial review. I read the diff for assignments, requirements, progress projection, routes and the teacher builder, and I read IdeaBoard.tsx, courseRequirements.ts and the top of FullCourseDrill.tsx. I did not read the lesson components (UnlessLesson, ExclusionLesson, NegativeTranslationLesson, AndOrLessons), the authored content (andOrItems.ts, fullCourseItems.ts), the homework adjudication ledger, the tests or the CSS in full. This approval covers only what I read, and it does not certify lesson pedagogy, copy, or the homework semantics.",
  "findings": [
    {
      "id": "R1-LOW-1",
      "severity": "low",
      "path": "src/bootcamps/conditionals/components/IdeaBoard.tsx:68-76",
      "evidence": "The palette buttons set onDragStart and the slots set onDrop, but no button has a draggable attribute. Buttons are not natively draggable, so the HTML5 drag-and-drop path (dataTransfer, onDrop) probably never fires. Pointer-based dragging (onPointerDown/Up with elementFromPoint) is the only drag route that can work. Drag still works through that route, and click and keyboard placement are unaffected. The unit tests that exercise HTML drop events would pass while real mouse use never takes that route. The host also reported that real drag was not proven in the browser.",
      "fix": "Either remove the dead onDragStart/onDrop handlers and tests, or add draggable to the buttons and make sure the pointer path and the HTML5 path cannot both place the same idea. Verify real mouse and touch drag in a browser."
    }
  ],
  "coverage": [
    "assignments.ts: protectedConditionalTarget, readConditionalAssignments, registryStepAllowed. I found no URL or metadata mismatch that gets past the parser.",
    "courseRequirements.ts: the pre-split-default list leaves out and-or-negate-conditions. Snapshot IDs are checked against the row's eligible steps, and duplicates, empty lists and unknown versions fail closed.",
    "assignWork.ts: the preallocated v3 identity, the protected route, the snapshot written into metadata, and the rollback delete by classroom item ID.",
    "courseProgress.tsx createEditionCourseStore: historical split projection, provenance kept in sourceCompletion, resume and re-completion keeping 2.4 credit, save-blocking for read-only projections. I traced these by reading and found no defect. The only oddity is that the comparison in resume (sourceCompletion.sourceKey === id) mixes a prefixed key with an unprefixed ID, so a same-ID draft is not carried forward there. The old attempt is still archived in priorAttempts, so no data is lost.",
    "progress.ts nextCourseStep: completedAt is preserved on later saves and set fresh only on reopen.",
    "routes.tsx and the AssignmentBuilder duplicate and requirements preview wiring, read from the diff only.",
    "IdeaBoard.tsx: reducer, boardCorrect (equivalence-based, accepts both orientations), hint and reveal flow, saved-state validation.",
    "FullCourseDrill.tsx lines 1-112: the embeddedSuccessExplanation default and the grading-signature compatibility check.",
    "FullCourseLesson.tsx dispatch for exclusion-language, negative-translation and the targeted quiz setting, via grep."
  ],
  "limitations": [
    "I did not read the UnlessLesson, ExclusionLesson, NegativeTranslationLesson or AndOrLessons content, so I did not judge the writing, teaching voice, copy rules (banned terms, slash notation), worked-before-fresh ordering, or whether each lesson stays within its core-check limits.",
    "I did not read andOrItems.ts, fullCourseItems.ts, drillCompatibility.ts, fullCourseGradingBaseline.json, the homework adjudication ledger, or any of the tests. I did not check homework semantics or whether the frozen local baseline matches the real prebuild bytes.",
    "I did not compare the build against the prebuild baseline copies in the temp folder.",
    "I ran no tests, builds or browser checks, and I make no claim that any passed.",
    "I did not check CSS layout or reduced motion, or real touch or screen-reader behavior.",
    "Files outside the listed scope are unreviewed."
  ]
}

Host disposition: low dead HTML-drag path accepted. Removed unused HTML handlers and synthetic-only HTML test, retaining one pointer-based drag path with mouse/touch pointer support, cancellation and same-board hit-testing. Existing click/keyboard paths unchanged. Changed drag announcement to aria-live rather than a second status role so original feedback tests remain specific. First approval is explicitly partial and does not cover unread lesson writing/homework.

## Inspection 2

Result: C:\Users\Joshu\AppData\Local\Temp\claudex-conditional-writing-build-20261027\inspection2\claudex-xu2vm6s2\result.json

{
  "verdict": "REVISE",
  "summary": "The Group 3, Group 4, 3.3 and AND/OR lessons largely match the plan. Each teaches the operation first, then asks for a fresh build. The board accepts both orientations, and Group 3 negates on IF while Group 4 negates on THEN. Core checks stay within the plan's caps, and the ten new homework items derive correctly. I found two defects worth fixing: one in the \"fresh\" repair tasks, one in the drill-revision completion handling. I also found one low-severity item. This is a source-only read. No tests were run and no browser behaviour was observed.",
  "findings": [
    {
      "id": "R2-MED-1",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/components/LessonPractice.tsx",
      "evidence": "IdeaBoard persists formative state under `conditional-formative-v1:<scope>:<family>:<sentence>` (IdeaBoard.tsx:43), so identical sentences share state. The Group 3 repair board (LessonPractice.tsx:11) uses 'The path is open unless the river floods.' with family 3. That is the same sentence the core fresh-construction board uses (UnlessLesson.tsx:100). The Group 4 paragraph and repair boards both use 'No archived painting is displayed.' (family 4). Failure case: a learner solves the core board, finishes the quiz and opens 'Repair a rule'. The repair board restores the saved success arrangement and shows 'This says the same thing' before they have done anything. A solved paragraph board does the same to the Group 4 repair, and the two same-key boards also overwrite each other's saved state. This defeats the plan's requirement that a fresh task not show a completed arrangement, and it makes repair and paragraph practice impossible to attempt independently.",
      "fix": "Give every IdeaBoard instance a distinct persistence key. Either add an optional `instanceId` prop and include it in the key, or use a different sentence for each task. Use `core`, `repair` and `paragraph` instance IDs and add a test that opening repair after solving the core board starts blank."
    },
    {
      "id": "R2-MED-2",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/components/FullCourseDrill.tsx",
      "evidence": "Ten appended optional items (fullCourseItems.ts:463-530) change gradingSignature for the exception-language, exclusion-language and negative-translation practice sets. A student with a completed prior run is therefore routed to the 'This practice has changed' screen. Clicking 'Start revised practice' calls persist with `revisionChanged.current` true, which sends `reopen:true` (FullCourseDrill.tsx:119). nextCourseStep then sets status to 'started' and clears completedAt. Old runs are archived in history, but an older frozen-requirements grant is already counted complete. It drops below 100% merely because the student opened the appended optional practice. This conflicts with the plan's statement that a previously complete grant stays complete. The adjudication doc also says the previous run is not 'silently erase[d] or promote[d]'. Here the completion is demoted.",
      "fix": "Treat append-only membership growth as a new attempt that keeps the step's 'done' status and completedAt, with the new items tracked as their own run. Alternatively, reopen only when existing item grading changed. Add a test that a completed v1 run followed by 'Start revised practice' keeps the step done and its original date."
    },
    {
      "id": "R2-LOW-1",
      "severity": "low",
      "path": "src/bootcamps/conditionals/content/fullCourseItems.ts",
      "evidence": "homeworkBuild adds `sourceRefs` containing the absolute local path `C:/Users/Joshu/Desktop/Conditionals - Final Set/...`. fullCourseItems.ts is imported by client components, so these strings are bundled into the student-facing JavaScript. They leak a local username and directory layout. gradingSignature strips sourceRefs, so this does not affect grading.",
      "fix": "Store a relative, non-identifying provenance label such as 'Final Set/08 Group 3 (Sep 10)/...', or keep the absolute paths only in the ledger document."
    }
  ],
  "coverage": [
    "Read in full: UnlessLesson.tsx, ExclusionLesson.tsx, NegativeTranslationLesson.tsx, LessonPractice.tsx, IdeaBoard.tsx (reducer, boardCorrect, pointer path, reveal and hint logic), AndOrLessons.tsx, FullCourseDrill.tsx, drillCompatibility.ts, and the homework adjudication doc.",
    "Read fullCourseItems.ts lines 440-531 (all ten appended hw- items). I re-derived each relationship and orientation, including the original negatives, the 'can survive/can certify' modality, the OR antecedent in the career item, and the ANDed consequent in the paragraph item. I found no semantic error.",
    "Read the diffs for the plumbing in the manifest: courseProgress.tsx, openingCoursePath.ts, progress.ts, routes.tsx, assignments.ts, assignWork.ts and AssignmentBuilder.tsx. I only grepped FullCourseLesson.tsx for dispatch and the 'full' explanation opt-in, and the UnlessDrill source for the `edition` prop. The edition-scoped milestone key keeps inline speed-drill progress separate from course progress.",
    "Pedagogy judged from the written copy:\n- Model before fresh task: met in the Unless, Exclusion and NegativeTranslation lessons.\n- Group 3 IF negation versus Group 4 THEN negation: handled correctly in lesson copy and in IdeaBoard grading.\n- OR assertion versus unactivated trigger: handled in the 2.2 library and parcel checks.\n- 2.4 and 2.5 duties separated: correct.\n- Core checks within the plan's caps."
  ],
  "limitations": [
    "I did not read the test files, so I cannot say what they assert. That includes IdeaBoard.test.tsx, fullCourseHomework.test.ts, DrillCompatibility.test.tsx, AndOr*.test.tsx and the progress tests.",
    "I did not read fullCourseGradingBaseline.json, so I cannot verify the frozen local generation or the byte-order assumption in knownLocalSignature.",
    "I did not read andOrItems.ts, AndOrVisuals, AndOrPractice or the CSS. I did not read teaching-voice.md or COPY-CORRECTIONS.md, so banned-term and voice compliance was judged only from the plan's stated list. Phrases such as 'the group' in 2.3 were not checked against COPY-CORRECTIONS.",
    "I did not visually read any source PDF. The adjudication evidence is taken from the host's ledger. I re-derived the item logic independently but did not check the original key pages.",
    "The already-covered progress and assignment plumbing was not re-audited in depth.",
    "I cannot certify browser or touch drag behaviour, screen-reader speech, rendered layout, film alignment, the build, or that any test passed. I also cannot certify learner transfer."
  ]
}

Host dispositions and final corrections:
- R2-MED-1 accepted. Optional repair/paragraph instances now have separate persistence IDs; the default core namespace is preserved for existing formative drafts. Regression proves solved core -> blank repair -> independent paragraph -> original core success retained.
- R2-MED-2 accepted for append-only growth. Exact known prior grading generation with unchanged prefix preserves completion/date/counts and earned old answers while starting appended items as a separate explicit run, archived original retained. Reload preserves that historical completion. Unknown/changed semantic generations still require explicit fresh attempt and retain recovery history. Regression verifies historical done/date before and after start/reload.
- R2-LOW-1 accepted. New client source labels are relative Final Set references; original absolute provenance remains only in the adjudication ledger.
- Host visual correction: selected palette text inherited white from the outer host against a pale background. Scoped selected/hover colors now use rgb(23,57,74) on rgb(233,239,232), verified by rendered readback and corrected screenshot.

The two-inspection budget is exhausted. These final host corrections were tested and browser-checked where applicable, but NOT independently re-inspected. Inspection2 verdict remains REVISE for its recorded snapshot; do not claim a final independent APPROVED state. The earlier partial approval is not overall coverage. No unresolved reported findings remain in host judgment, with the coverage limits above preserved.

Final host proof:799-test broad regression before final corrections;104 targeted tests after those corrections; npm run typecheck exit0; final npm run build exit0 with764-file no-canonical verification. No commit/push/publish/live data writes. Physical touch, native screen-reader speech and learner tryout unverified.
