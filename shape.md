# Shape Plan: Alive, Stimulating Workbook

## Goal
Transform the Intro to LR bootcamp design from a static, uniform workbook into a "lively," visually stimulating, and reactive coaching environment.

## Key Refinements

### 1. Variable Content Vignettes (Callouts)
- **Geometry:** Replace uniform callouts with variable-width and variable-border designs (e.g., asymmetrical accents, floating elements).
- **Structure:** Move from "mono-text" to hierarchy-rich layouts using a mix of Outfit and Fraunces, emphasizing distinct voices (Concept, Tool, Insight).
- **Visual Stimulus:** Incorporate specific layout affordances (e.g., icons, color-dense sections) to ensure content types are immediately distinguishable and engaging.

### 2. "Alive" Visual Depth
- **Texture:** Introduce procedural geometric patterns (subtle dots/lines) into the neutral `bg-shadow` / `surface` layer transition.
- **Reactive Interaction:** Implement reactive hover states—positional shifts or high-chroma color tinting—that respond dynamically to user input, making the UI feel "alive."

### 3. Dynamic Workbook Layout
- **Asymmetry:** Break the fixed margins for specific callouts or insights to create visual flow and interest.
- **Density Variation:** Implement phase-dependent visual density (e.g., "Joshua Insight" sections appear more saturated and "denser" with accent colors than "Drill/Attempt" phases) to help the student feel the lesson context intuitively.

## Next Steps
1. User approval of this plan (`shape.md`).
2. Execution: Implement procedural textures and reactive hover mechanics.
3. Execution: Build the new `ContentVignette` component set.
4. Execution: Apply asymmetrical layout changes to lesson pages.
