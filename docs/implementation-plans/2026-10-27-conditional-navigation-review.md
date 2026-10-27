# Conditional navigation review log

2026-10-27. Codex host and builder; Claude independent plan review and fresh final inspection. User authorized implementation; no publishing or commits. Five plan rounds, two inspections. Requested models: none; use configured CLI default and report observed model. Baseline HEAD bebb4948771d18d323a865f27e26fccfba756b64, with existing local integration/visual work preserved. Plan scope is navigation, filters and visible progress; previous integration remains.

## Plan round 1
Result: C:\Users\Joshu\AppData\Local\Temp\conditional-navigation-20261027\plan1\claudex-p0p0ey8f\result.json
Observed model: claude-sonnet-5-5

{
  "verdict": "REVISE",
  "summary": "The plan is directionally sound: sibling actions around CourseVolume, no progress writes, and reuse of existing URL builders. It has concrete gaps. It relies on an association source that does not exist in the repo. Its optional/required labelling could use the wrong edition flag. Its query-parameter clearing rule is ambiguous against the real courseUrl signature. Its flashcard relevance rule is under-specified. Nothing was run, and the component sources (OpeningCourse, FlashcardTools, the progress provider) were not read.",
  "findings": [
    {
      "id": "F1",
      "severity": "medium",
      "path": "docs/implementation-plans/2026-10-27-conditional-navigation.md (Approach, lesson-to-drill association)",
      "evidence": "The plan says to link related drills by 'exact unit matches or existing chapterGroups association only'. A repo-wide grep of src for chapterGroups returns no matches. The plan does not say which real source gives the association. The only candidates are unitId, primaryUnitId, accessAnyOfUnitIDs and alsoAvailableIn in openingCoursePath.ts. For example, 'sufficient' has unitId 'sufficient-necessary' and alsoAvailableIn ['orientation','group-1']. An implementer who cannot find chapterGroups is likely to invent a mapping.",
      "fix": "Name the real association field or helper. Define 'related drill' as a drill step in the same edition-filtered, already-authorized step list. It must share primaryUnitId, or its unitId or accessAnyOfUnitIDs must match the lesson's. Test against the real step arrays that the rule never yields a drill outside the grant. Remove the chapterGroups reference."
    },
    {
      "id": "F2",
      "severity": "medium",
      "path": "docs/implementation-plans/2026-10-27-conditional-navigation.md (Acceptance 2, optional vs required)",
      "evidence": "requiredForEditionCompletion is edition-dependent. courseRequirements.ts:67-72 recomputes it per target edition, and courseRequirements.test.ts:23-24 shows the same step is false in an old edition and true in the current one. Reading the flag from the raw registry or OPENING/FULL arrays would mislabel optional steps and give the wrong required lesson/drill counts for historical or projected-complete users.",
      "fix": "Take required and optional status only from the same edition-adjusted step list that CourseProgressProvider uses. Add a test with an old-edition snapshot where a step is optional in the old edition and required in the current one. Assert that the denominators match the provider's."
    },
    {
      "id": "F3",
      "severity": "medium",
      "path": "docs/implementation-plans/2026-10-27-conditional-navigation.md (Acceptance 5 and routes.tsx courseUrl)",
      "evidence": "courseUrl (routes.tsx:183-196) takes only a destination string, and its OpeningCourseUrl type (OpeningCourse.tsx:28) has no filter argument. It already copies unknown query keys to every destination. The plan says to clear courseChapter/courseContent/courseStatus on navigation to unrelated activities, an individual lesson/drill or a different list. It also needs those keys carried when returning to the same list. Nothing says how courseUrl tells these cases apart. If the keys are cleared in courseUrl, lesson-to-chapter 'Return' links lose the user's filter. If they are not cleared, filters leak into opening/<stepId> and into the centre URL builders. conditionalCentreUrl has its own separate delete list (routes.tsx:201), so the two must stay in sync.",
      "fix": "Define one COURSE_LIST_QUERY_KEYS constant. Have courseUrl and conditionalCentreUrl delete it by default. Add the keys back only through the new helper's explicit 'same list' decoration. Add tests for lesson, drill, centre, flashcard and cross-list destinations, plus a deliberate return-to-list case. Also confirm that no existing key such as 'unit' or 'mode' is reused for the course filters."
    },
    {
      "id": "F4",
      "severity": "medium",
      "path": "docs/implementation-plans/2026-10-27-conditional-navigation.md (Acceptance 4, relevant flashcards)",
      "evidence": "The plan says the existing chapter-N destination plus query filters are used for flashcards, and that irrelevant card actions are hidden. skillPractice.ts:10-14 allowedSkillGroups derives groups from step unitIds. Chapter-level relevance must therefore be computed from the chapter's own authorized steps, not from the chapter number. Part 1 notes such as meaning, must-arrow and contrapositive have unitId 'orientation', so they map to no group even though the foundation/G1/G2 decks exist. The plan does not say whether the foundation deck counts as relevant. A restricted user with only G3 could also get a link whose deck is blocked by the existing validation.",
      "fix": "Specify a relevance table. Derive deck groups per chapter or lesson from allowedSkillGroups(authorized steps) plus an explicit foundation rule. Intersect the result with the active grant. Hide the action when the intersection is empty. Test with restricted grants against the real chapter arrays, including a chapter with no match and one with only 'orientation' steps."
    },
    {
      "id": "F5",
      "severity": "low",
      "path": "docs/implementation-plans/2026-10-27-conditional-navigation.md (Approach, CoursePath rows and CourseHome)",
      "evidence": "Several requirements conflict or are unspecified. A whole-card CourseVolume link must coexist with sibling actions and the 'complete row/card hit areas' requirement. Making CoursePath rows direct links removes the accordion and may drop the description and status that the plan says to preserve. The plan has nothing on the order of the aria-label and the progressbar, on focus order, or on how a screen reader hears the main link against the sibling actions.",
      "fix": "Add acceptance tests for no nested interactives (a DOM query for a/button inside a/button). Test the tab order of the main link, Lessons, Drills, Flashcards and the expand control. Check that each row keeps its description and status text. Give the card actions distinct accessible names that include the chapter title."
    },
    {
      "id": "F6",
      "severity": "low",
      "path": "docs/implementation-plans/2026-10-27-conditional-navigation.md (Verification)",
      "evidence": "The 'completion unchanged after filtering' proof compares counts from identical provider snapshots. It does not say that the provider must also be untouched by mount, so nothing catches a stray write from a filter effect. The rule 'Expand filters in desktop by default only where existing tests/UI require it' is also vague. The 'Taste app inspector' step has no stated output or pass criterion.",
      "fix": "Spy on the progress store's write path and on localStorage and Supabase calls during filter and navigation interactions. Assert zero calls. State the default open/closed behaviour per surface as a testable rule."
    }
  ],
  "coverage": [
    "Read the plan in full.",
    "Read src/bootcamps/conditionals/components/CourseVolume.tsx and routes.tsx lines 160-230 (courseUrl, conditionalCentreUrl, ActivityCentreRoute).",
    "Grepped skillPractice.ts, activityRegistry.ts, openingCoursePath.ts, courseRequirements.ts and the related tests for the query-key lists, allowedSkillGroups and requiredForEditionCompletion.",
    "Checked that the test files named in Verification exist.",
    "Searched for chapterGroups and the proposed courseChapter/courseContent/courseStatus keys; none exist yet."
  ],
  "limitations": [
    "Did not read OpeningCourse.tsx, FlashcardTools.tsx, SkillPracticeHub.tsx, ConditionalActivityCentre.tsx or courseProgress.tsx in full, so I could not trace progress-provider reads or the existing filter and persistence code.",
    "Reviewed only the plan; no implementation or diff exists yet.",
    "Could not run tests, the build, or the browser or visual checks.",
    "The assignment and edition grant paths (assignments.ts, useConditionalAssignments) were not traced beyond the URL builders."
  ]
}

Host dispositions: F1 absent-helper claim rejected with direct local source evidence; use exact unit/chapter match for new related links. F2-F5 accepted and pinned throughout plan. F6 filter writes zero; baseline navigation start/persistence preserved.

## Plan round 2
Result: C:\Users\Joshu\AppData\Local\Temp\conditional-navigation-20261027\plan2\claudex-uyc0ilyv\result.json

{
  "verdict": "REVISE",
  "summary": "Most round-1 items are resolved. I withdraw F1. My earlier search for chapterGroups stopped at the 30-result limit I had set, so the \"absent\" claim was wrong. The function exists at OpeningCourse.tsx:164 and is purely positional, and the revised plan correctly stops using it for new links. F2 (edition-adjusted required flags), F3 (COURSE_LIST_QUERY_KEYS) and F4 (flashcard relevance) are now pinned. The F4 rule matches the existing `allowed` computation at OpeningCourse.tsx:516 and the `available` computation in FlashcardTools.tsx:33. F5 and F6 are mostly addressed. Four defects remain: three medium (R2-1 to R2-3) and one low (R2-4). Nothing was run.",
  "findings": [
    {
      "id": "R2-1",
      "severity": "medium",
      "path": "docs/implementation-plans/2026-10-27-conditional-navigation.md (Acceptance 1 and Approach, direct lesson/drill links)",
      "evidence": "Today a started drill is reached through `url(step.id, drill && status === 'started')`, which sets `run=1` (OpeningCourse.tsx:334, 404, 435). Unstarted or done drills go through the entry screen (OpeningCourse.tsx:518, `!run`). The plan says CoursePath rows become direct links but does not carry this rule over. If the new direct drill links always omit `run`, a drill in progress lands on the entry screen instead of resuming. If they always set `run`, they skip the entry screen. Projected-complete steps also route to the 'Completed earlier / Resume and revise' screen (OpeningCourse.tsx:517), so a direct link to one must not call resume.",
      "fix": "Specify that every new direct drill link uses the existing `url(step.id, drill && status === 'started')` rule and the existing stepAction label. Reuse the one shared link/label function rather than a second copy. Add a test for the started, done, projected-done and unstarted drill cases."
    },
    {
      "id": "R2-2",
      "severity": "medium",
      "path": "docs/implementation-plans/2026-10-27-conditional-navigation.md (Acceptance 3, progress filter semantics)",
      "evidence": "Filtering by saved progress (all / not started / in progress / completed) is defined for lessons, but the plan does not define it for a chapter on the home page. Under the existing rules a chapter can have done steps and no `started` step, or only optional steps, or no required steps (OpeningCourse.tsx:252-255 `complete` and `doneHere`). Without a rule, 'in progress' and 'not started' will be implemented inconsistently between the home cards, the drills index and the tests. For steps, a saved record whose status is neither 'started' nor 'done' is rendered as 'Not started' by CardStatus (OpeningCourse.tsx:413), and the filter must match that.",
      "fix": "Define the rules explicitly. For a chapter, use required steps from the unfiltered edition-adjusted list: completed means all required steps are done, not started means none have any saved status, and in progress is everything else, including partly done chapters with no `started` step. For a step, completed is status 'done', in progress is status 'started', and not started is any other value including no record. Cover chapters with zero required steps and make sure they are not labelled complete."
    },
    {
      "id": "R2-3",
      "severity": "medium",
      "path": "docs/implementation-plans/2026-10-27-conditional-navigation.md (Acceptance 4, lesson return links) and FlashcardTools.tsx:42, skillPractice.ts:5",
      "evidence": "The 'Back to lesson' link in the flashcard tools renders only when `from` is exactly 'sufficient' or 'necessary' (FlashcardTools.tsx:42). `from` is also in SKILL_QUERY_KEYS, so courseUrl and flashcardUrl clear it. The plan requires return links from lesson-linked cards for any lesson with a relevant deck. For a lesson such as 'contrapositive' or 'exception-language', the card page would show no way back, even though the plan says return links work. The plan does not say whether `from` is widened. If it is widened to arbitrary values, it must be validated against the authorized steps, or it becomes an open redirect-style link to a step the user cannot access.",
      "fix": "Widen `from` to accept only ids found in the authorized edition-adjusted steps list, and render the link through `url(from)`. Otherwise fall back to the chapter. Add tests for an unknown `from`, an unauthorized `from`, and a restricted grant."
    },
    {
      "id": "R2-4",
      "severity": "low",
      "path": "docs/implementation-plans/2026-10-27-conditional-navigation.md (Verification, injected progress store)",
      "evidence": "The tests refer to markStarted/markDone/resume writes. The store in courseProgress.tsx exposes `save(stepId, patch)` and `resume(stepId)`, and a lesson page writes on arrival through LessonCompletion's `save(stepId, {})` (OpeningCourse.tsx:439-453). Spy names that do not exist will silently assert nothing. The plan accepts that lesson-start writes happen on navigation, so the filter-only zero-write assertion must be scoped to the course list pages, which do not mount LessonCompletion.",
      "fix": "Spy on the actual `save` and `resume` functions of the injected store. Assert zero calls while the filter is toggled on the home, chapter and drills lists. For navigation, assert that the calls equal the baseline calls made without the new filters."
    }
  ],
  "coverage": [
    "Read the revised plan and the host dispositions.",
    "Re-verified `chapterGroups` at OpeningCourse.tsx:164-175; it is positional and not used by the new association rule.",
    "Read OpeningCourse.tsx 140-460: CourseHome, CoursePath, PracticePage, ChapterPage, CardStatus, LessonCompletion, and the FlashcardTools `allowed` computation at line 516.",
    "Read FlashcardTools.tsx, including `flashcardUrl`, the deck availability logic and the `from` handling.",
    "Read routes.tsx 160-230 (courseUrl and conditionalCentreUrl) in the earlier round.",
    "Grepped courseProgress.tsx for the store API (save, resume, projected completion).",
    "Checked the SKILL_QUERY_KEYS and CONDITIONAL_ACTIVITY_QUERY_KEYS definitions."
  ],
  "limitations": [
    "Did not read courseProgress.tsx, routes.tsx 240-420 (OpeningCourseRoute linkedSearch and grant filtering) or SkillPracticeHub and ConditionalActivityCentre in full.",
    "No implementation exists yet, so this is a plan review only.",
    "Did not run any tests, builds or browser checks.",
    "The earlier F1 error came from my own truncated search, not from the repository."
  ]
}
Host: R2-1 through R2-4 accepted with explicit shared href helper, chapter status rules, validated general lesson return, and save/resume spies. Earlier F1 withdrawn by reviewer.
