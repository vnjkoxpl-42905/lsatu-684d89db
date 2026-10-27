# Conditional browse workspaces,2026-10-27

Local, uncommitted refinement of the existing conditional bootcamp. No publishing or account writes.

## Direction and product inventory

Existing Taste v2 editorial-greeting direction,seed1697682538, palette/type kept. Working screens use compact paper/charcoal composition. Landscape identity remains on Home; browsing should put actual work first.

Product-specific material: seven authored chapters; Group1 sufficient indicators; Group2 requirements; Group3 exception forms; Group4 exclusions; separate AND/OR lessons; required versus optional edition steps; native course progress and projected history; Unless milestones; Missing Links bridge questions; distinct word/concept and sentence-recall cards; topic/mode-specific assignments.

Each screen's question: Lessons asks what to read next in this chapter. Drills asks what skill to practise next here. Flashcards asks which relevant recall collection to open. The signature is the same chapter and truthful progress staying in place while the content switch changes the work.

21st.dev inspiration: Segmented Tabs bymicka_design,demo26923,https://21st.dev/@micka_design/components/tabs-base. Metadata and source retrieved through the21st MCP. Adopt the compact selected-segment treatment using existing React/router primitives; no BaseUI dependency install and no external AI generation. Navigation uses real links and aria-current, not panel semantics over URLs.

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

## Verification

Pending implementation and final rendered checks. See implementation plan and independent review log in docs/implementation-plans/2026-10-27-conditional-workspaces*. No final checks claimed here yet.
