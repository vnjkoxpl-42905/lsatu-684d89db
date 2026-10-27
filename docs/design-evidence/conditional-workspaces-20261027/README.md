# Conditional browse workspaces, 2026-10-27

Local, uncommitted refinement of the existing conditional bootcamp. No publishing or account writes.

## Direction and product inventory

Existing Taste v2 editorial-greeting direction, seed 1697682538, palette/type kept. Working screens use compact paper/charcoal composition. Landscape identity remains on Home; browsing should put actual work first.

Product-specific material: seven authored chapters; Group 1 sufficient indicators; Group 2 requirements; Group 3 exception forms; Group 4 exclusions; separate AND/OR lessons; required versus optional edition steps; native course progress and projected history; Unless milestones; Missing Links bridge questions; distinct word/concept and sentence-recall cards; topic/mode-specific assignments.

Each screen's question: Lessons asks what to read next in this chapter. Drills asks what skill to practise next here. Flashcards asks which relevant recall collection to open. The signature is the same chapter and truthful progress staying in place while the content switch changes the work.

21st.dev inspiration: Segmented Tabs by micka_design, demo 26923, https://21st.dev/@micka_design/components/tabs-base. Metadata and source retrieved through the 21st MCP. Adopt the compact selected-segment treatment using existing React/router primitives; no BaseUI dependency install and no external AI generation. Navigation uses real links and aria-current, not panel semantics over URLs.

## Before critique

Opened before-lessons desktop and phone fold, before-cards desktop fold. Additional baseline sheets are under `.taste-skill/conditional-destinations`. Automated measurements are evidence, not aesthetic approval.

1. Main question: titles and next actions disagree with selected scope. A Lessons list is called Lessons and drills; a chapter-filtered next action can point to another kind/chapter.
2. Frame: selection controls, a full-width continuation bar and multiple navigation buttons occupy too much height. The phone's first usable lesson arrives late.
3. Hierarchy: the timeline and repeated book circles compete with the lesson titles. Cards are large repeated panels even though the user is choosing a collection.
4. Data: completion is edition-adjusted, but labels do not consistently distinguish whole-course/chapter progress from filtered lists. Preserve denominators while clarifying scope.
5. States: existing empty/no-authorized states, saved progress and read-only projected completion must survive the redesign.
6. Legends/charts: not applicable. Numbered lessons are curriculum data; do not remove their identifiers.
7. Phone: row controls stack heavily; switch,scope and compact rows should put the task earlier without shrinking hit targets.

Worst three to fix: a common chapter switch and scope; relevant next action; one coherent list/collection composition. Existing library mixed fonts and oversized titles will be unified in the scoped browse styles.

## Final critique and verification

Opened all six final images for each destination: desktop, tablet and phone folds plus paginated full-page sheets, 18 images total. The final files remain under `.taste-skill/conditional-destinations/final-{lessons,cards,drills}`. Representative folds are copied beside this report.

1. Main question: each workspace makes one choice clear. The chapter title and progress stay in place; Lessons, Drills and Flashcards change the work.
2. Frame: a shared 860px reading frame aligns headers, switchers, next actions and rows. Desktop titles are 28px; phone titles are 24px. Repeated ornamental timelines and oversized cards were removed.
3. Hierarchy: topic titles lead, supporting descriptions explain the task, and status/actions remain subordinate. Flashcard categories distinguish concepts, indicator words and sentence translations.
4. Data: progress uses authorized, edition-adjusted required steps. Filters do not change the denominator or write completion. Saved flashcard position survives the chooser return. Mixed sentence collections preserve existing comparison questions.
5. States: tests cover restricted assignments, honest empty collections, filter resets, explicit mixed legacy views, drill landing instructions and active-attempt focus. Existing projected progress remains owned by the course provider.
6. Legends/charts: no decorative visualization. Progress has text and accessible values; lesson numbers remain visible curriculum identifiers.
7. Phone: the switch fits, filters wrap and actions stack without horizontal scrolling. Tablet retains the sidebar and readable row descriptions. The first task appears earlier than the baseline.

Taste inspection: all three final destinations reported 0 FAIL, 2 WARN. The font-count warning counts Inter and the local LSATU Inter alias separately; these are the same face alongside Georgia. The dev-server warning remains: this preview route is development-only. Production build passed, but a production-rendered or signed-in account acceptance check is not claimed.

Manual browser checks: chapter-scoped Lessons to Drills to Flashcards; unchanged chapter progress; Group 3 saved Card 2 of 3; All flashcards return to Chapter 3; keyboard Enter activates Lessons; Chapter 4 has a truthful empty-card state; phone CSS width 390 and docked CSS width 1024 have no horizontal overflow. Reduced-motion emulation gives all three switch links 0s transition and animation durations. Emulation restored and Chapter 1 Lessons left open.

Automated proof: 201 agreed tests passed across ten files before the final review fixes. The 30 affected tests across three files passed after those fixes. Final typecheck, production build and diff whitespace check passed. Two independent Claude source inspection rounds were completed and warranted findings fixed. Final small fixes were host-tested, not independently re-reviewed. Full independent coverage is listed in the review log; it is not a whole-repository or visual approval.

No dependency added, no new authored drill question, no account writes, no commit, no push and no publish. The existing release gate remains unchanged.
