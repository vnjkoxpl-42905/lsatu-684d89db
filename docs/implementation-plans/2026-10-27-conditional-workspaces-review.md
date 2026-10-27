# Conditional workspaces review log

2026-10-27. User authorised organise/polish implementation and selected a switch per chapter, using 21st.dev inspiration and Taste. Codex host/planner/builder; Claude reviewer/inspector. Plan: docs/implementation-plans/2026-10-27-conditional-workspaces.md. No requested model overrides. Max5 plan rounds,2 fix attempts,2 inspections. Local uncommitted work only. Preserve existing authorized changes. Diagnostics outside checkout.


## Plan round1

{
  "verdict": "REVISE",
  "summary": "The plan is mostly sound and its helper-cycle and URL-stripping handling match the code. It leaves four spec gaps that would cause real regressions: the Lessons default change, `from` being dropped in chooser links, `authorizedSteps` defaulting to empty, and unverified chapter-to-card relevance.",
  "findings": [
    {
      "id": "F1",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/courseNavigation.ts:16-26",
      "evidence": "parseCourseListFilters returns content 'all' when courseContent is absent. Chapter cards at OpeningCourse.tsx:308-309, the 'All lessons' shortcut and RelatedCourseWork all build links through courseListUrl. The plan's outcome 2 says a plain chapter link defaults to Lessons, but outcome 3 says global Drills and Lessons are separate. If the default is changed inside the parser, every existing consumer and test that relies on 'all' changes, and a drills-only global destination could show lessons. The plan doesn't say where the default lives.",
      "fix": "Keep the parser's 'all' meaning. Resolve the effective content per destination in the new helper (chapter workspace missing content gives lessons; global lessons forces lessons; global practice forces drills). Add tests for plain chapter, global and legacy 'all' links."
    },
    {
      "id": "F2",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/components/FlashcardTools.tsx:45",
      "evidence": "The chooser cards call flashcardUrl(url, item.id) with no `from`, while deckChoices at line 40 passes from?.id. The return links at lines 49 and 55 use url('tools'), which drops `from`, and url() also strips courseChapter. Outcome 7 requires RelatedCourseWork's chooser link to keep an authorized `from`, so a chooser reached with from=lesson would lose it when a collection is selected and again when returning from the player.",
      "fix": "Make the chooser links, the filter, the player return link ('All flashcard sets') and the config links all carry the validated `from` and the validated courseChapter. Test chooser -> deck -> return -> chooser for both."
    },
    {
      "id": "F3",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/components/FlashcardTools.tsx:28",
      "evidence": "`authorizedSteps` defaults to []. The plan makes relevantCourseCardLinks(relevant, authorized, ...) the relevance authority and removes SkillPracticeLinks cardsOnly. A caller that passes `allowed` without authorizedSteps (other hosts, or tests) would get an empty library, or sentence collections would vanish because allowedSkillGroups([]) is empty. Core decks come from `allowed`, while sentence cards come only from the steps.",
      "fix": "Grep every FlashcardTools and tools-host caller and require authorizedSteps in the library path. Add a test with `allowed` set and steps empty that proves there is no silent loss, or derive both from one source."
    },
    {
      "id": "F4",
      "severity": "low",
      "path": "src/bootcamps/conditionals/courseCardLinks.ts:10-25",
      "evidence": "Chapter relevance is inferred from step.unitId or the ids sufficient and necessary (allowedSkillGroups). The plan asserts that Chapter 3 includes G3/G4 sentences and that Chapter 4 is card-empty. I did not verify that the chapter 3-7 steps carry unitIds group-3 and group-4. If chapter 4 uses unit group-4, it would not be empty. Outcome 6 also says the 'Indicator words' deck needs both g1 and g2 in the scoped chapter, so a chapter with only one of them hides that deck.",
      "fix": "Add real-registry tests, with both edition variants, that list the chapter-to-collection mapping for Chapters 1-7. Treat the result as the spec rather than hard-coding the plan's expectation."
    },
    {
      "id": "F5",
      "severity": "low",
      "path": "src/bootcamps/conditionals/courseNavigation.ts:3",
      "evidence": "courseNavigation imports a type from components/OpeningCourse. The new CourseBrowseNavigation component and the pure URL helper will import courseNavigation, and OpeningCourse imports both. A type-only import is safe today. A runtime import added to it in the refactor would create a cycle.",
      "fix": "Move OpeningCourseUrl to a pure types module, or keep these imports `import type` and add an eslint or import-cycle check."
    }
  ],
  "coverage": [
    "Read the plan in full.",
    "Read courseNavigation.ts, courseCardLinks.ts, skillPractice.ts, FlashcardTools.tsx and routes.tsx lines 170-222.",
    "Grepped usages of courseChapter, courseContent, flashcardUrl and relevantCourseCardLinks.",
    "Read the start of openingCoursePath.ts for the chapter 1 and 2 unitIds.",
    "Checked the plan's URL-stripping, `from`-validation and cycle-break claims against the code."
  ],
  "limitations": [
    "No tests, build, typecheck or screenshots were run, and none are claimed to pass.",
    "I did not read the full OpeningCourse.tsx, SkillPracticeHub.tsx, the existing tests, or the chapter 3-7 step definitions.",
    "I could not verify the visual, accessibility and responsive outcomes, or the 21st.dev and Taste references.",
    "I did not trace the store write paths (save and resume). The no-write-on-switch requirement is unverified."
  ]
}

Disposition: F1-F5 accepted as explicit pins; default resolution stays destination-owned, all chooser-return paths retain validated context, legacy allowed-only core API remains compatible, chapter mappings tested from real edition registries, helper imports stay type-only. Observed reviewer claude-sonnet-5-5.


## Plan round2

{
  "verdict": "APPROVED",
  "summary": "All five round-1 findings (F1-F5) are resolved in the revised plan's pins. F1: parser defaults stay unchanged, and effective content is resolved per destination with explicit handling of legacy courseContent=all. F2: validated `from` and courseChapter are preserved across chooser, player, config, filter and return links. F3: the allowed-only core-deck compatibility path is kept and has an explicit test. F4: chapter relevance is tested against the real edition registries. F5: helper imports stay type-only and the pure flashcard URL module has no runtime component imports. I found no new material defects in the revision. A from-lesson in a different chapter than courseChapter is a minor possible inconsistency, but both values are independently validated against authorized steps, so it is not a defect.",
  "findings": [],
  "coverage": [
    "Re-read the revised plan, including the new review pins section.",
    "Compared each pin against round-1 findings F1-F5, using the source I read in round 1: courseNavigation.ts, courseCardLinks.ts, skillPractice.ts, FlashcardTools.tsx and the routes.tsx URL helpers.",
    "Checked the pins for internal consistency with outcomes 2, 3, 6, 7 and 8."
  ],
  "limitations": [
    "This round re-read no additional repository files; the pins were judged against the round-1 source reading.",
    "I ran no tests, build, typecheck or screenshots and claim none pass.",
    "I did not trace the store save/resume write paths, so the no-write-on-switch requirement is unverified until implementation.",
    "I did not read the full OpeningCourse.tsx, SkillPracticeHub.tsx, the existing tests, or the chapter 3-7 step definitions.",
    "This is a plan review only; the implementation itself is not reviewed."
  ]
}

Approval check passed for SHA256 28d2e4a2c8fc0da56232baf4a562e96686a2daf4c1532a11f64595134ac080dd. Codex build started from preserved local snapshot and HEADbebb4948. Implementation caught a compatibility case: group-only sentence collections hide two existing contrast cards. Added Mixed sentence flashcards using the existing combined-groups player, preserving these questions and their history; this implements the approved preservation requirement without authoring new content.


## Implementation inspection1

{
  "verdict": "REVISE",
  "summary": "One high-severity defect: OpeningCourse.tsx removes the `drillInstructions` table but `DrillEntry` still reads it, so the sufficient-practice and contrapositive-practice drills would break. Two lower-severity regressions in the legacy URL and compatibility paths also need fixes. I did not run tests or the typechecker. Most of the chapter-scoping, validation and storage-scope logic that I read looks consistent with the plan.",
  "findings": [
    {
      "id": "F1",
      "severity": "high",
      "path": "src/bootcamps/conditionals/components/OpeningCourse.tsx",
      "evidence": "The diff deletes `const drillInstructions: Record<string, {...}>` (the entries for 'sufficient-practice' and 'contrapositive-practice'). `DrillEntry` still has `const instructions = drillInstructions[step.id];` at line 115, and a grep finds no other definition. These two drills reach that fallback because they have no full-course, source-worksheet, and-or, foundation-practice or mixed-practice handler. Opening /opening/sufficient-practice or /opening/contrapositive-practice without run=1 would throw a ReferenceError and unmount the screen. It is also a TypeScript 'cannot find name' error, so `npm run typecheck` and `npm run build` should fail. The new list links start non-started drills at the landing page, so students hit this path directly.",
      "fix": "Restore the `drillInstructions` constant, or move it to a shared module and import it. Add a test that renders DrillEntry for 'sufficient-practice' and 'contrapositive-practice' and checks the instruction list."
    },
    {
      "id": "F2",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/components/OpeningCourse.tsx",
      "evidence": "In `CourseIndexFilters`, `courseListUrl` writes `courseContent` only for 'lessons' or 'drills'. For a legacy chapter view with courseContent=all, `browseKind` is 'all'. Reset filters calls `courseListUrl(url, destination, { chapter, content: 'all' })`, and changing the chapter select also drops the content. Both produce a URL without courseContent. `ChapterPage` then resolves the missing content to 'lessons', so the mixed 'All work' view silently becomes Lessons-only. The plan pins explicit courseContent=all as a mixed list that stays stable.",
      "fix": "Preserve courseContent=all for the 'all' browse kind. Either teach courseListUrl to emit 'all' when asked, or append the parameter in the CourseIndexFilters reset and chapter-change handlers. Add a route test that resets filters and switches chapter from courseContent=all."
    },
    {
      "id": "F3",
      "severity": "low",
      "path": "src/bootcamps/conditionals/components/FlashcardTools.tsx",
      "evidence": "The plan says to keep the allowed-only compatibility API. With no `authorizedSteps`, `from` is validated against an empty list. A caller passing `?deck=foundation&from=sufficient` therefore loses the 'Back to ...' link it used to get, and the new test only asserts that authorizedSteps=[] gives no link. The mixed 'Indicator words' deck also now appears only when both group-1 and group-2 are allowed, where it used to be always present. A foundation-only caller silently loses that deck, and the test is rewritten to match.",
      "fix": "Either confirm both behaviours are intended and document them in the plan, or fall back to the legacy sufficient/necessary `from` allowlist when `authorizedSteps` is empty. Test the compatibility path for the mixed deck explicitly."
    }
  ],
  "coverage": [
    "Read in full: courseBrowse.ts, courseCardLinks.ts, flashcardNavigation.ts, CourseBrowseNavigation.tsx, courseNavigation.ts.",
    "Reviewed the supplied diffs for FlashcardTools.tsx and OpeningCourse.tsx, plus the diffs of the OpeningCourse, FlashcardTools, routes and routes.andOr tests.",
    "Read the OpeningCourse.tsx DrillEntry region and grepped it for orphaned references.",
    "Grepped SkillPracticeHub.tsx for its browse-context usage and routes.tsx for the COURSE_LIST_QUERY_KEYS and conditionalWorkspaceSearch callers.",
    "Checked that the tsconfig files set noUnusedLocals to false, so unused imports are not an error."
  ],
  "limitations": [
    "No tests, typecheck or build were run, so F1's compile failure is inferred from source.",
    "I did not open the CSS files, SkillPracticeHub.tsx beyond a grep, the courseBrowse, courseCardLinks, CourseBrowseNavigation or SkillPracticeHub test files, the stored review/screenshot evidence, or routes.tsx beyond a grep.",
    "I did not check the real-registry card relevance mapping for Chapters 1-7.",
    "I did not check the responsive and visual outcomes, the a11y behaviour in a browser, or the zero-writes-on-switch assertions.",
    "Files outside the listed scope (routes.tsx, skillPractice.ts, IndicatorWordDeck, TermDeck, ConditionalFilters) are unreviewed and not covered by this verdict."
  ]
}

Host dispositions:
- F1 accepted. Cleanup accidentally included the drillInstructions constant between the unused CourseCard and DrillEntry. Restored the exact constant from the pre-edit snapshot; added instruction-landing regressions for both affected drills. Typecheck had independently caught the same error before this verdict.
- F2 accepted. courseListUrl now serialises explicit content=all, preserving the mixed legacy chapter across Reset and chapter selection. Added regression for both operations.
- F3 rejected as a regression claim for this task. The pre-edit snapshot at C:/Users/Joshu/AppData/Local/Temp/conditional-workspaces-20261027/before/src/bootcamps/conditionals/components/FlashcardTools.tsx lines36 and39 already restricted the mixed indicator deck to both group1/group2, and validated from against authorizedSteps with empty default. These constraints were part of the immediately preceding authorized navigation work. They remain intended: an empty grant cannot validate a lesson return or supply an unauthorized mixed deck. The allowed-only compatibility guarantee preserves the permitted core decks. Current tests explicitly cover these conditions. This is not restoring a historical unsafe allowlist from HEAD.

Rendered refinement after inspection1: matched Flashcards and course lists to one860px frame, matching28px desktop/24px phone titles, identical progress aria and readback, consistent descriptions and local font inheritance. These source/CSS changes are in the second inspection snapshot.


## Implementation inspection 2

{
  "verdict": "REVISE",
  "summary": "The URL-context, validation and chapter-scoping logic I read is mostly consistent with the plan. I found one remaining spec gap and two lower-severity issues. The gap: the legacy courseContent=all mixed chapter list still turns into Lessons-only when \"All chapters\" is chosen. I ran no tests, typecheck or build.",
  "findings": [
    {
      "id": "R1",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/components/OpeningCourse.tsx (CourseIndexFilters.change, CourseLessonIndex)",
      "evidence": "On a chapter page with courseContent=all, browseKind is 'all'. Choosing 'All chapters' makes change() compute target = patch.chapter ? chapterView : (browseKind==='drills' ? 'practice' : 'lessons'), which is the global 'lessons' destination. The URL becomes lessons?courseContent=all. CourseLessonIndex then renders CourseBrowsePage with kind=\"lessons\" hard-coded, so the mixed 'Lessons and drills' list silently becomes Lessons-only while the URL still says all. This breaks the plan pin that explicit courseContent=all stays a mixed list. The inspection-1 F2 fix covered only reset and chapter-to-chapter changes, not this path.",
      "fix": "For browseKind 'all', do not move to a global destination that forces lessons. Either keep the mixed view at the chapter destination, or drop courseContent=all when leaving chapter scope. Add a route test: courseContent=all chapter, choose All chapters, assert a lessons-only result with no courseContent=all in the URL."
    },
    {
      "id": "R2",
      "severity": "low",
      "path": "src/bootcamps/conditionals/components/OpeningCourse.tsx (CourseScreen: view==='practice' renders SkillPracticeLinks; RelatedCourseWork)",
      "evidence": "The global Drills destination still renders SkillPracticeLinks without cardsOnly. That list includes an 'Open Translate and recall' sentence-flashcards entry, which duplicates the unified library and carries no chapter or from context. Outcome 3 says Drills shows drills only, and outcome 9 says to remove duplicate card sections. Separately, RelatedCourseWork renders for any `current` step, including while a drill is running (run=1) and when the step is a projected read-only view. That adds navigation links inside the drill run header area.",
      "fix": "Pass a filter that excludes 'translate-cards' from SkillPracticeLinks on the Drills page, or confirm in the plan that it is intended. Render RelatedCourseWork only for lessons or for the drill landing page, not while run is true."
    },
    {
      "id": "R3",
      "severity": "low",
      "path": "src/bootcamps/conditionals/courseNavigation.ts:58 and OpeningCourse.tsx CourseIndexFilters",
      "evidence": "courseListUrl now always emits courseContent when content is 'all'. The CourseIndexFilters handlers spread the parsed filters, whose default content is 'all'. As a result, a home-page filter change adds a redundant courseContent=all to the home URL. Any later link built from that URL then carries an explicit mixed marker where the default was previously absent. This is harmless on home but blurs the 'absent means default' contract.",
      "fix": "Emit courseContent=all only when the caller explicitly requests it, for example only for chapter destinations. Alternatively strip content from the filters for the home destination."
    }
  ],
  "coverage": [
    "Read in full: courseBrowse.ts, courseCardLinks.ts, CourseBrowseNavigation.tsx, courseNavigation.ts.",
    "Read SkillPracticeHub.tsx lines 1-80 (SkillPracticeLinks, LessonSkillLinks, browse-context handling).",
    "Reviewed the supplied tracked diffs of FlashcardTools.tsx, OpeningCourse.tsx and the FlashcardTools, OpeningCourse, routes and routes.andOr tests.",
    "Read the TermDeck storageScope and initialCardId handling and OpeningCourse expandedDraftScope; the storage-scope handoff to the indicator deck appears equivalent to the old host behaviour.",
    "Traced the from and courseChapter validation and re-add flow through chooser, player, config and return links."
  ],
  "limitations": [
    "No tests, typecheck, build or browser checks were run, and none are claimed to pass.",
    "Did not open the CSS files, the new test files (CourseBrowseNavigation, courseBrowse, courseCardLinks, courseNavigation, OpeningCourse.navigation, SkillPracticeHub tests), or flashcardNavigation.ts.",
    "Did not verify the real-registry chapter-to-card mapping for Chapters 1-7, or the zero-store-writes assertions.",
    "Visual, responsive and accessibility outcomes were not evaluated.",
    "Out-of-scope files such as routes.tsx, skillPractice.ts, IndicatorWordDeck, ConditionalFilters and the rest of the TermDeck behaviour are unreviewed and not covered by this verdict."
  ]
}

Host dispositions:
- R1 and R3 accepted. Emit explicit content=all only for chapter destinations. Leaving a mixed chapter for All chapters now opens Lessons with no stale mixed marker. Added URL regression.
- R2 accepted. Global Drills excludes Translate and recall; related-work navigation appears on lesson and drill landing pages, not during active drill runs. Added regression tests.

Both inspection rounds used. Final small fixes were host-tested after inspection 2 and were not independently re-reviewed. No implementation APPROVED verdict is claimed. Final typecheck and production build passed. Agreed suite: 201 tests passed across ten files before the final fixes; affected suite: 30 tests passed across three files after the final fixes.
