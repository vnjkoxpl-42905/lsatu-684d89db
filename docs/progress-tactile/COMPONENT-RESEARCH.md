# Components that make Progress useful to handle

Research date 2026-10-27. Targeted Firecrawl search/scrape using existing authorized credits; no feedback telemetry sent. Primary-source search output is preserved in `C:/Users/Joshu/dev/ai-os/.firecrawl/progress-*-20261027.json`. No external component source copied or new runtime dependency added. Source claims below are separate from visual observations.

## Shortlist

1. **Travelling selection plate.** Use the installed Framer Motion `layoutId` pattern for a raised selected segment within a recessed subject/date track. The active segment moves to where the user pressed, making the selection easier to follow. Read [Motion layout documentation](https://motion.dev/docs/react-layout-animations). Browser inspected Animate UI's live tabs and changed Overview to Analytics; screenshot showed the selected segment and new content. Implement independently on existing dependencies, not a bulk Animate UI install. No entrance choreography.
2. **Question-type evidence tray.** Select a readable topic row to reveal actual question labels and outcomes in a warm inset plane. [Animate UI accordion example](https://animate-ui.com/docs/primitives/radix/accordion) and [Radix accordion](https://www.radix-ui.com/primitives/docs/components/accordion) show the expandable heading pattern. Live homepage accordion was clicked and its revealed text inspected. Proposed LSAT adaptation is original, not a claim the reference already has question records. Use existing Radix semantics, visible focus, expanded state and keyboard support.
3. **Answer mosaic.** A compact sequence of correct/missed first answers uses teal and charcoal/amber with text-equivalent counts. A focused mark identifies its question; selecting it opens the same evidence view. This is an original Progress-specific component. Does not imply a trend, LSAT score or mastery; aggregate marks must be explicitly labelled if grouped. Never make dozens of tiny squares the only usable navigation; equivalent readable list remains available.
4. **Question-type bullet rows.** Teal proportional accuracy tracks with right-aligned numerator/denominator and an explicit small-sample label. Selecting a row changes the detail pane. Same LR topic population, same period, no arbitrary 'impact' score. For fewer than three answers show counts without a percentage. Not a mastery bar or a goal-completion indicator.
5. **Fold-out practice notebook.** Chronological date groups with visible totals and concise session evidence; expandable rows reveal answers. Colour belongs to results and focused evidence; paper layers separate date groups. No decorative fake bindings or simulated handwritten student notes.
6. **Pressable controls.** Opaque button face, fine contact edge, short lower shadow; pressed state reduces shadow and moves at most 1px. Focus stays a separate visible ring. Same light direction across the page. User's tactile brief overrides optional flat-surface taste presets.

## Researched and left out

[React Bits](https://reactbits.dev/) surveyed through Firecrawl. Its broad collection includes animated lists, card stacks and visual effects, but no component is imported solely because it is unusual. Card-swap navigation hides comparable performance; pointer-following glows and shader backgrounds add motion without explaining progress. NumberFlow search did not return an authoritative matching package page; no claims or dependency choice made from that search. Animated figures are unnecessary for honest small datasets.

## Three compositions, one data contract

- **Study desk:** LR/RC summary and compact answer mosaic, with question-type evidence and a contextual focus panel. Recommended first direction.
- **Question-type explorer:** strong type index and proportional rows; selecting a type controls the evidence workspace. Primary job is deciding what to inspect next.
- **Practice timeline:** readable chronological practice groups lead; results and topic context live beside the selected date. Primary job is understanding recent practice.

All retain warm paper and soft charcoal, with saturated teal on the main data and pale related tints. Blue may identify RC separately only when LR/RC appear together; amber labels missed-answer evidence, never a global 'bad student' state. Same concept keeps same colour. Colour never replaces text. Shared date selection and consistent first-answer population.

## Visual evidence and limits

Animate UI homepage was opened in the permitted browser, tabs and accordion interacted with, and a screenshot inspected. Its dark floating demonstration composition is not the LSAT U visual direction. No LSAT prototype exists yet; no responsive, animation-quality, accessibility or production results are claimed. [Reduced-motion media feature](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) informs the planned fallback, not evidence of an implemented one.
