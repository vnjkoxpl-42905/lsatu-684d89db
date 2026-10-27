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
