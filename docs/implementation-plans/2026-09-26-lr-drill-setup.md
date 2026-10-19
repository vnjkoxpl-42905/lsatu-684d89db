# LR drill setup: design brief

## Current refinement, 2026-10-18

Joshua requested implementation of a simpler LR builder after reviewing its live search, summary and preview. This supersedes the historical layout and confirmation status below, not the set-composition rules. The current job is: choose question type, difficulty and question count, preview the drill, then start. Specific-question selection remains optional; less-used choices use More options.

Joshua's follow-up removes all bank/facet totals, selection breakdowns, attempt history/counts, timing/reveal explanations and repeated action counts. Keep Easy, Medium and Hard, the question-count control, clear actions and useful PrepTest references. No visible technical labels such as filters, guaranteed or question IDs. Do not replace removed noise with more explanatory prose.

The supplied screenshots and live builder show excessive inventory counts presented as the drill itself, repeated timing paragraphs, raw-ID/Inspect language, heavy type, inconsistent control shapes and a tall viewport-wide mobile tray. Refine these as one system using the existing Outfit family and classroom palette: normal-weight body copy, modest headings, persistent field labels, aligned 44px controls, restrained borders, consistent spacing and clear keyboard/disabled/error states. No gradients, shadows or enlarged headings as decoration.

Use Your drill, Preview drill, View questions and Start drill. Use complete PrepTest/section/question references; keep internal IDs and parser behavior internal. Keep the exact preview, chosen questions outside filters, atomic reference handling, preview invalidation and one-time launch behavior. Previewing remains read-only. No source/key, scoring, account or RC changes are authorized by this refinement. Evidence and actual verification are recorded in [the dated design evidence](../design-evidence/lr-drill-builder-2026-10-18/README.md). Merge/publication require their separate standing release authorization.

## Historical brief, 2026-09-26

Date: 2026-09-26
Status: awaiting Joshua's confirmation before implementation
Target: revise draft LSAT U PR #137, `codex/drill-layout`

## What the setup must accomplish

A student entering **Set up an LR drill** should be able to find specific questions, narrow the remaining question bank, review the resulting set, and start it without decoding several competing input methods. The student may use exact questions, broader filters, or both. Smart Drill remains the separate one-click path on the drill home page.

The main action is to create a set whose contents are clear before launching it.

## Design direction

- **Register:** product UI within the classroom's existing dark drill surface and warm paper shell. Use the established Outfit type and classroom tokens. Keep color restrained and use contrast, weight, alignment, and spacing for hierarchy.
- **Scene:** a student at a desk, preparing a focused practice block on a laptop or phone and wanting to start quickly without losing control of the questions.
- **Anchors:** the existing classroom shell, the current top-bar dark **Find a question** control, and the existing question table. These are visual references from this product, not new decorative motifs.
- **Scope:** production-ready revision of the LR drill home and setup flow in draft PR #137, including desktop and mobile behavior, keyboard access, and reduced motion. No production publication is part of this brief.

## Page structure

1. **Drill home:** retain the global PrepTest, Section, Question Number quick jump and the LR/RC switch. The Smart Drill button gives a small, continuous heartbeat-like pulse without user interaction. Its label and shape remain stable.
2. **Drill setup:** the global quick-jump/search strip is absent. One compact **Choose questions** area inside the setup surface owns question discovery. It starts with a wide, dark **Find a question** field styled like the former top-bar control. Searching by question text or an address such as `PT101.S2.Q1` filters the visible question list below; a result can be added to the set.
3. Beneath search, one aligned **PrepTest → Section → Question Number** row uses styled dropdowns that fit the dark surface. PrepTest and Section narrow available questions. Selecting Question Number adds that exact question to the set and shows it in a selected-question list. It does not launch a drill.
4. A small collapsed **Paste question references** option preserves bulk entry. It accepts the current range syntax and exact references, with clear feedback about whether the entry narrowed the pool or added exact questions. No second always-visible text box repeats the main controls.
5. **Narrow the rest** groups Question Type, Reasoning Types, Question Features, and Levels in one orderly, responsive section. The four controls remain equally available. Their selected values are visible without forcing the whole section open.
6. The question table follows selection and filtering. Its count, add/remove actions, and selected state stay visible and understandable. The right-hand summary on desktop, or a stacked summary on mobile, shows exact picks, remaining places, and the proposed set before launch. It uses plain labels such as **Your set** instead of **Composition**. Remove redundant explanatory copy and the extra “Drawing from...” banner.

## Set-building rules

- Exact questions are guaranteed places in the set. If two exact questions are chosen for a set of ten, the other eight come from the active PrepTest, Section, Question Type, Reasoning Types, Question Features, and Levels filters.
- A chosen exact question remains in the set even when later filters would exclude it from the remaining pool. The summary must make this visible rather than silently dropping it.
- Search narrows the visible question list for discovery. It does not silently replace exact picks or immediately navigate away.
- If the chosen set size is smaller than the number of exact picks, show a clear correction path before creating the set.
- If filters cannot supply the remaining places, show the available count and let the student adjust filters or set size. Do not claim the set is ready.

## Key states and copy

| State | What the student sees |
|---|---|
| No selections | Search, three address dropdowns, four focus controls, available-question count, and a clear create action. |
| Search with matches | Matching rows in the question table, with each row's address and add action. |
| Search with no matches | “No questions match this search.” Keep the search editable and offer a clear/reset action. |
| Exact question added | Selected state in the row, a removable item in the selected-question list, and an updated set summary. |
| Too many exact picks | Explain that selected questions exceed set size; offer a larger size or removal. |
| Too few filtered questions | Show the shortage and which selection to loosen, without fabricating a ready set. |
| Loading or failed bank | Keep controls stable and report loading or retry plainly. |
| Narrow screen | Search spans the available width, address selectors stack or wrap in order, focus controls form a readable grid/stack, and summary follows selection before launch. |

Controls need hover, focus, selected, disabled, and error states. Dropdown menus use the same dark palette as their triggers, a visible active option, clear scroll affordance, and keyboard navigation. The pulse stops under `prefers-reduced-motion` and carries no information needed to use Smart Drill.

## Existing behavior to preserve or change deliberately

- Preserve the four focus dimensions, the filtered question table, exact-question selection, bulk range capability, set preview, and set-size control.
- Change the current split between global quick jump and builder state: setup controls must operate on the builder, not open a separate question route.
- Consolidate builder search and address discovery into the single **Find a question** area. Keep the global quick jump on the home page for opening a single question.
- Preserve the ability to create another set, with natural copy such as **Create another set**.

## Implementation references

Use the impeccable product, layout, interaction, adapt, animate, and accessibility guidance during implementation. Verify rendered contrast and responsive spacing against the classroom surface, not only token values. Test the set composition rules as behavior, and inspect the actual browser result at phone and desktop widths.

## Open question

- Joshua to confirm that this brief matches the intended setup before the draft PR is revised.
