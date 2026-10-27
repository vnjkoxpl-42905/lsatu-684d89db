# Conditional bootcamp navigation, 2026-10-27

Local checkout: `lsatu-conditional-full-20261025`. No commit, push, publish or production assignment writes.

## What changed

Home chapter cards have a direct chapter link and sibling Lessons / Drills / relevant Flashcards actions. Expand Lesson progress for each saved lesson and a direct link. Required lesson and drill counts use edition-adjusted authorized steps. Optional work cannot fabricate completion. Direct course rows use a shared Start / Continue / Review destination rule; only already-started drills jump into a run.

Filters are present on home, lesson/chapter lists, course drills, the integrated practice centre, guided collection and flashcards. Filters preserve assignment and edition context, clear stale settings on unrelated destinations, and do not write completion or invoke resume. Players remain mounted when their filter disclosure closes. Relevant lesson-to-practice/card links validate return lessons against authorized work.

Native and imported conditional practice remains in the Practice centre, including Unless and Missing Links. Existing history and independent filtered assignments remain on their original identities. The release gate remains unchanged.

## Rendered evidence and critique

The approved paper, charcoal and landscape direction is retained. Final home screenshots were opened at 1440, 768 and 390 CSS pixels. Earlier oversized hero, numerals, text shadows and floating shadows were reduced after inspecting the render. The final home inspector reports 0 FAIL. Its warnings are deliberate: seven chapters require scrolling; the compact landscape hero retains 42px of visual rest; the page is a development-only preview.

Flashcard library desktop and phone screenshots were opened; its measured report has 0 FAIL. Chapter drill list desktop/phone was inspected and then refined to a smaller title/hero and a flat primary action. The first final chapter capture timed out during concurrent verification; the subsequent capture is tracked separately in `.taste-skill/conditional-navigation-chapter-verified`.

Manual browser checks: home Lessons action -> filtered Chapter 1 -> Sufficient lesson -> Group 1 cards -> valid return link. Phone lesson progress expands to real saved states. Phone Chapter 3 filter yields onlyChapter 3 with unchanged course completion and no horizontal overflow. Group 3 Drills opens its four relevant drills; a drill row opens its instructions. At 1024x900 CSS pixels, every home card fits with no horizontal overflow. Keyboard Enter toggles Filters. Reduced-motion emulation gives artwork transition 0s; settings and viewport were restored.

## Checks and limits

- Broad conditional run: 825/829 passed, with one obsolete navigation-label assertion and three 15s timeouts under concurrent load.
- All three timeout files passed serially: 23 tests. The obsolete navigation assertion was updated and its 17-test file passed.
- Final focused changes: 68 tests passed across OpeningCourse 41, navigation 10, routes.andOr 17. Earlier route 85, helper 13, centre/flashcard/skill 27 tests passed. Do not sum overlapping reruns.
- Final TypeScript check passed. Production build and canonical-content guard passed after the functional fixes; the final font-only build is recorded below.
- Claude plan approval and two scoped source inspections are logged in the implementation review. All reported findings were fixed. Inspection 2 remained REVISE; the final fixes were tested but were not independently re-reviewed because the two-round budget was exhausted. Review coverage excludes unrelated files and is not full repository certification.
- Rendered evidence is local development preview. Signed-in production student assignment/resume flows and a production-rendered authenticated bootcamp were not exercised. The built application compiles its production assets; the development-only preview is intentionally absent from production routing.

## Typography follow-up

The chapter inspector flagged an external font loading race. Inter Latin variable (48,256 bytes) is now self-hosted with its SIL Open Font License and source SHA256 under `public/fonts/inter`. Conditional surfaces use the unique family `LSATU Inter` so a competing remote face cannot take precedence. Actual browser CDP readback confirmed this face is loaded. This small CSS/asset refinement occurred after the two independent source inspections; its evidence is browser readback, rendered screenshots and a fresh production build.

## Final readback

Final production build passed, including the local font and its `LSATU Inter` CSS in emitted bootcamp/Unless bundles. The canonical-content guard scanned 769 files successfully. Final typecheck passed after functional changes; subsequent changes were CSS and licensed font assets only. `git diff --check` passed. The generated MCP stub was restored to its pre-build HEAD content. HEAD remains `bebb4948771d18d323a865f27e26fccfba756b64`; no staging, commit, push or publishing was performed.

Final home screenshots: `home-desktop.jpg`, `home-phone.jpg`, `home-overview.jpg`, copied from `.taste-skill/conditional-navigation-deliverable` after opening desktop, tablet and phone renders. Final inspector: 0 FAIL, with the three documented development/scrolling/visual-rest warnings. Final chapter inspector: 0 FAIL; numbered path stations intentionally distinguish lessons and drills. The external-font warning was resolved by the local font follow-up above.
