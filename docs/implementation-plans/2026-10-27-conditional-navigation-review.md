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

## Plan round 3
Result: C:\Users\Joshu\AppData\Local\Temp\conditional-navigation-20261027\plan3\claudex-ae4c26lh\result.json

{
  "verdict": "APPROVED",
  "summary": "The round 2 pins resolve my four open findings (R2-1 to R2-4), and I found no new material defects. R2-1: direct step links share one helper that keeps the existing `url(id, drill && started)` rule, the Start/Continue/Review labels, the projected-complete screen and the no-resume rule. R2-2: step and chapter progress filters are fully defined, including chapters with zero required steps. R2-3: `from` is accepted only for notes in the authorized edition-adjusted steps and is rendered through `url(from)`, so there is no arbitrary redirect. R2-4: the tests use the real `save` and `resume` spies and are limited to list-page filter interactions. Round 1 items F2 to F6 remain resolved. F1 stays withdrawn. Nothing was run, and the plan describes no implementation yet. The remaining risk is in execution: the code inspection should confirm the zero-write assertions and that no course-list query keys leak through courseUrl or conditionalCentreUrl.",
  "findings": [],
  "coverage": [
    "Compared the revised plan with the round 2 pins and my earlier findings R2-1 to R2-4.",
    "Re-checked the pins against code I read earlier: OpeningCourse.tsx 140-520 (CoursePath, stepAction, DrillEntry gating at line 518, the projected-complete screen at line 517, CardStatus, LessonCompletion), FlashcardTools.tsx (`from` handling at line 42, `allowed` at line 516), routes.tsx 160-230, and the store API in courseProgress.tsx."
  ],
  "limitations": [
    "Plan-level review only; no implementation, diff, tests, build or browser output exists, and nothing was run.",
    "Did not read courseProgress.tsx, routes.tsx 240-420, SkillPracticeHub or ConditionalActivityCentre in full.",
    "Did not trace the assignment and grant producers beyond the URL builders.",
    "APPROVED applies to the plan's design only, not to any later code."
  ]
}
Approved plan SHA256 48ee2cff07fbbf30c48d983b2b4c82dc0912f13bf9b76b0740e2bea63de5c0a1. CLI observed model claude-sonnet-5-5. Plan approval only, independent implementation inspection still required.


## Implementation inspection 1

{
  "verdict": "REVISE",
  "summary": "The core helpers (courseNavigation.ts, courseCardLinks.ts) are consistent with the plan's pins: status mapping, chapter classification, the zero-required case, and group/deck relevance matching FlashcardTools' own availability rules. Two material defects remain. List filters leak into the workspace links built in routes.tsx. TermDeck gains new localStorage persistence on mount, which contradicts the plan's \"no mount/persistence changes for card state\". One low-severity accessibility regression is also listed. I could not run tests, and the review was not exhaustive (see limitations).",
  "findings": [
    {
      "id": "F1",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/routes.tsx:266-275",
      "evidence": "Shell builds `linkedSearch` from the raw `location.search` and uses it for `workspaceLinks.overview/review/journal/reference`. courseUrl() strips COURSE_LIST_QUERY_KEYS, but these four links do not. Scenario: a student is on `/lessons?courseStatus=completed&courseChapter=2`. The sidebar's Course/overview link becomes `BASE?courseStatus=completed&courseChapter=2`, so Home (and review/journal/reference) opens with a stale filter, or stale deck/card/activity/from keys. This violates the requirement to clear course-list query parameters when navigating to a different list or unrelated page, and the rule that filters must not be inherited.",
      "fix": "Build the workspace links from a copy of the context that deletes COURSE_LIST_QUERY_KEYS. Preferably also delete the skill/activity, deck, card and from keys, the same set courseUrl clears. Add a routes test that the overview and review links carry no course* keys when the current URL has them."
    },
    {
      "id": "F2",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/components/TermDeck.tsx:14-24",
      "evidence": "The new `useEffect` writes `conditional-term-cards-v2:${storageScope}` to localStorage on every mount, before any interaction. `storageScope` defaults to 'anonymous'. The plan says native card state is unchanged and there are no mount/persistence changes for card state. Merely opening the Foundation deck, or Filters, now writes storage. FlashcardTools' own test, 'filters only available decks\u2026without writing progress', only avoids this because it never mounts a deck. Anonymous or unscoped users share one key on a shared device. The filter-change guard in the plan ('zero writes') is also weakened for this deck.",
      "fix": "If saved place is intended prior-authorized behaviour, record that as an explicit scope change and write only after the user changes the card (inside `go`), not on mount. Otherwise revert to non-persistent TermDeck. Either way, make the key scope explicit and add a test that mount causes no write."
    },
    {
      "id": "F3",
      "severity": "low",
      "path": "src/bootcamps/conditionals/components/OpeningCourse.tsx (CoursePath)",
      "evidence": "The direct-link row sets `aria-label={`${target.label}: ${step.title}`}` on a link whose visible content includes the kicker, optional marker, summary and saved status. The aria-label replaces the accessible name, so screen readers lose the description, the Optional marker and the saved status. The plan says CoursePath direct links retain description, optional marker and saved status. The mismatch also fails the 'label in name' principle.",
      "fix": "Drop the aria-label, or include status and optional text in it. Alternatively keep the visible text as the name and add the action label as visually-hidden text."
    },
    {
      "id": "F4",
      "severity": "low",
      "path": "src/bootcamps/conditionals/components/OpeningCourse.tsx",
      "evidence": "The CoursePath rewrite removed the accordion. `laterLabel` is now an unused prop, and `stepAction`, `ChevronDown` and `useState` may be left unused or only partially used. I did not run lint or typecheck, but this is likely to produce no-unused-vars warnings. Also, `CourseCard` and `CoursePath` now derive the Start/Continue/Review wording from different code (inline versus `courseStepLink().label`). The plan asked for one helper for both href and label.",
      "fix": "Remove dead props and imports. Have CourseCard use `courseStepLink().label` or a shared label function so label and href share one source."
    }
  ],
  "coverage": [
    "Plan read in full.",
    "Read in full: courseNavigation.ts, courseCardLinks.ts, ConditionalFilters.tsx.",
    "Read from the diff, with surrounding source for skillPractice.ts (allowedSkillGroups, skillPracticeUrl) and routes.tsx (courseUrl, conditionalCentreUrl, Shell, OpeningCourseRoute): OpeningCourse.tsx, FlashcardTools.tsx, IndicatorWordDeck.tsx, TermDeck.tsx.",
    "Checked: step and chapter status classification against the plan pins, deck and group relevance against FlashcardTools availability, `from` validation, filter URL construction and reset behaviour, projected-completion link behaviour, and the leak of list filters into workspace links.",
    "Spot-checked only: courseProgress.tsx priorCompletion handling, for projected-complete steps in the visible steps map."
  ],
  "limitations": [
    "I could not run tests, typecheck, build or a browser. Nothing here claims passing tests, and visual, responsive, keyboard and reduced-motion criteria are unverified.",
    "I did not read the test files in full (courseNavigation.test.ts, OpeningCourse.navigation.test.tsx, courseCardLinks.test.ts), so I did not assess their coverage against the plan's required assertions, such as zero save/resume calls and the no-nested-anchors check.",
    "I did not inspect the new files in the manifest beyond the three I read: the ActivityCentre, SkillPracticeHub, GuidedConditionalActivity, MissingLinks and activity registry code, the assignments and requirements changes, and the CSS files.",
    "Callers outside src/bootcamps/conditionals (for example src/dev/ConditionalOpeningPreview.tsx and the teacher assignment UI) were not reviewed. Whether the preview url helper clears course-list keys is unverified.",
    "The prior uncommitted local work is mixed into the diff against HEAD, so I could not separate this plan's changes from earlier authorized ones."
  ]
}

Host dispositions: F1 accepted; clean workspace navigation context and test it. F2 accepted: saved card place is prior-authorized integration work, but mount writes were unnecessary. Persist only explicit Next/Back changes with an explicit actor scope; unscoped decks retain session state only. Mount/flip/unscoped zero-write test added. F3 accepted: preserve accessible description and optional/saved state. F4 accepted: remove obsolete props and derive card action from shared helper.

Visual refinement after rendered inspection: retained approved landscape material while reducing hero size, oversized progress numeral, text shadows and floating shadows. These CSS refinements will be included in inspection 2.


## Implementation inspection 2

{
  "verdict": "REVISE",
  "summary": "Round-1 fixes F1, F3 and F4 are resolved in the code I read. F1: `conditionalWorkspaceSearch` now cleans the workspace links. F3: the CoursePath rows use `aria-describedby`. F4: the dead imports and props are gone. The filter, status and chapter-progress helpers match the plan's pins. One material defect remains. The F2 fix is incomplete: the Flashcards tools screen still passes a shared `'anonymous'` storage scope, so TermDeck persists card position under a shared key. Two low-severity items are also listed. Nothing was run, so no test results are claimed.",
  "findings": [
    {
      "id": "R3-1",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/components/OpeningCourse.tsx (tools view, CourseScreen) and src/bootcamps/conditionals/components/TermDeck.tsx:14-28",
      "evidence": "The host disposition for F2 said unscoped decks keep session state only and persist only with an explicit actor scope. But CourseScreen passes `storageScope={storageScope ?? progress?.storageScope ?? 'anonymous'}` to FlashcardTools, which forwards it unchanged to TermDeck. With no actor scope, TermDeck still reads and writes `conditional-term-cards-v2:anonymous` on every Next/Back. Two students on one shared device then inherit each other's card position. TermDeck also shows 'saved in this browser' for that shared key. The plan says native card state has no persistence changes, and TermDeck previously persisted nothing. The deck-level test 'opening deck filters preserves\u2026' uses an explicit scope, so the 'anonymous' default is not covered by any test I read.",
      "fix": "Do not default the scope to 'anonymous'. Pass `storageScope ?? progress?.storageScope` and let TermDeck stay session-only when it is undefined. Alternatively, make 'anonymous' an explicit sentinel that TermDeck treats as unscoped. Add a test that mounting or using the Foundation deck with no actor scope makes no localStorage write."
    },
    {
      "id": "R3-2",
      "severity": "low",
      "path": "src/bootcamps/conditionals/components/OpeningCourse.tsx (CourseLessonIndex, EmptyCourseList)",
      "evidence": "The old 'No opening lessons are available in this work.' message is replaced by EmptyCourseList for every empty list. When the authorized list is empty, not filtered to empty, the learner sees 'No work matches these filters' and a Reset filters link that goes nowhere useful. CourseContinue also still builds its Start/Continue label inline instead of using `courseStepLink`, so the plan's single shared label helper is not fully applied.",
      "fix": "Show EmptyCourseList only when `steps.length > 0` and the filtered list is empty. Otherwise keep the original no-work message. Have CourseContinue use `courseStepLink`."
    },
    {
      "id": "R3-3",
      "severity": "low",
      "path": "src/bootcamps/conditionals/components/OpeningCourse.tsx (CourseIndexFilters on PracticePage)",
      "evidence": "On the drills page the chapter dropdown lists every part found in `steps`, including chapters that have no drills. Choosing one gives an empty result. `change` also writes `courseContent=drills` into the URL for a page that already forces drills.",
      "fix": "Build the part list from the drills on that page. Omit `content` from the URL when `content={false}`."
    }
  ],
  "coverage": [
    "Read in full: courseNavigation.ts, courseCardLinks.ts, ConditionalFilters.tsx, TermDeck.tsx.",
    "Read the tracked diff for OpeningCourse.tsx, FlashcardTools.tsx, IndicatorWordDeck.tsx, routes.tsx (courseUrl, conditionalCentreUrl, conditionalWorkspaceSearch, Shell), assignments.ts, courseRequirements.ts and the CSS files.",
    "Spot-checked source: skillPractice.ts (allowedSkillGroups, SKILL_QUERY_KEYS), the OpeningCourse.tsx CourseCard, CourseContinue, LessonCompletion and CourseScreen entry points, courseProgress.tsx storageScope plumbing, and conditionalTargetKey in conditionalBootcampAssignment.ts. The target key covers activity settings, so the URL-versus-metadata comparison for activity assignments is sound.",
    "Checked these against the plan pins: filter and status semantics, chapter classification including the zero-required case, `from` validation, and deck relevance against FlashcardTools availability."
  ],
  "limitations": [
    "I did not run tests, typecheck, build or a browser. The visual, responsive, keyboard, reduced-motion and Taste-inspector criteria are unverified.",
    "I did not read the test files (courseNavigation.test.ts, OpeningCourse.navigation.test.tsx, courseCardLinks.test.ts), so I did not check them against the plan's required assertions: zero save/resume calls on filter interactions, no nested anchors, and the edition-adjusted fixtures.",
    "I did not review ConditionalActivityCentre, SkillPracticeHub, GuidedConditionalActivity, MissingLinks, the activity registry or centreAccess beyond how routes.tsx calls them.",
    "The assignment-grant changes (activity scope in assignments.ts and courseRequirements.ts) were checked only for the target-key comparison.",
    "Files outside src/bootcamps/conditionals were not reviewed: ConditionalOpeningPreview, the teacher assignment UI and the drill gate. I did not verify that the preview URL helper clears course-list keys.",
    "Prior uncommitted local work is mixed into the diff against HEAD, so I could not separate this plan's changes from earlier authorized work.",
    "Because the CSS changed after the inspection-1 fixes, any later changes made after this snapshot are not covered."
  ]
}

Host dispositions: all findings accepted and fixed after inspection. R3-1: removed the anonymous fallback at actual CourseScreen and added an unscoped Foundation Next zero-write regression. R3-2: empty authorized work now says no work available without a dead reset link; CourseContinue uses the shared helper. R3-3: practice chapter filters derive from authorized drills, and hidden content filters are omitted from generated URLs. Focused final rerun: 68 tests across OpeningCourse, navigation, and routes.andOr passed. The two inspection rounds are exhausted. These final fixes have host tests, not another independent approval.

An initial inspection-2 launch failed before reviewer invocation because the feedback path was relative to the host working directory. Retried with the absolute path; no verdict inferred from the failed launch.
