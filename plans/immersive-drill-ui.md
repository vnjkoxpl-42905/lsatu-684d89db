# Plan: Immersive "Coach's Workbook" Drill UI

Elevate the flat, clinical LR drill interface into a deeply immersive, tactile "Coach's Workbook" experience. This plan applies the "Impeccable" design standards and "Emil-style" design engineering to `OfficialQuestionPane.tsx`.

## Objective
Transform the drill UI from a "generic test-prep" feel to a premium, layered, and lifelike environment that feels physically present.

## Key Files & Context
- **Component:** `src/components/drill/official/OfficialQuestionPane.tsx`
- **Context:** `DESIGN.md` (Coach's Workbook theme) and `PRODUCT.md` (Personal/Confident tone).
- **Core Principles:**
    - **Dark-by-purpose:** Use the layered dark neutral ramp (`bg-shadow`, `bg-night`, `surface`).
    - **Editorial Typography:** Fraunces for stimulus prose; Outfit for UI.
    - **Physical Depth:** 3D transforms, inner shadows, and tactile feedback.
    - **Lifelike Motion:** Scale-on-press (`0.97`), spring-based interactions, and origin-aware transitions.

## Proposed Changes

### 1. Visual Foundation (The Workbook)
- **Surface Layering:** Replace the white background with the `bg-shadow` / `bg-night` tonal ramp.
- **Typographic Authority:** 
    - Stimulus: Switch to `Fraunces` (serif) with `body-prose` sizing (15px, 1.7 line-height, 64ch max).
    - Question/Choices: Switch to `Outfit` (sans).
    - Labels: Use `JetBrains Mono` for metadata callouts.
- **The "Glass & Ink" Effect:** Use subtle `border-white/5` hairlines and `ring-1 ring-white/10` to define edges without heavy borders.

### 2. Immersive Stimulus Column
- **Textured Depth:** Add a subtle `bg-gradient-to-br from-white/[0.02] to-transparent` to the stimulus column.
- **Micro-interactions:** When text is highlighted, use a soft glow transition rather than a hard color swap.

### 3. Tactile Answer Choices
- **Button Feedback:** Implement `transform: scale(0.98)` on `:active` for choice buttons.
- **Selection States:**
    - **Default:** `bg-surface` with `shadow-sm`.
    - **Selected:** `bg-aspiring-gold` text on `bg-shadow` surface, or a "lifted" elevated card effect with a gold hairline.
    - **Eliminated:** Lower opacity and a `filter: grayscale(0.5)` to visually "recede" into the background.
- **3D Lift:** On hover, apply a subtle `translateY(-2px)` and `shadow-lg` to choice cards to make them feel like physical tokens.

### 4. Emil-Style Transitions
- **Reveal Mechanics:** When answers are revealed, use a "springy" scale-up from `0.95` with a `blur-sm` transition to bridge the visual gap.
- **Flag Animation:** A crisp, no-bounce `ease-out` transition for the flag state.

## Implementation Steps

### Phase 1: Style & Theme Injection
1. Update `OfficialQuestionPane.tsx` to use project-standard colors from `DESIGN.md` (replacing hardcoded hex like `#212529`).
2. Implement the typography split (Fraunces for Stimulus, Outfit for UI).

### Phase 2: Component Hardening & Depth
1. Refactor answer choice `<li>` into a "Token" card with hover/active states.
2. Add the "Workbook" styling to the columns (borders, padding, gradients).

### Phase 3: Animation & Polish
1. Apply `framer-motion` for spring-based entrance and reveal animations.
2. Add the "AI Slop" pass: Remove identical card grids, ensure rhythmic spacing, and refine typography scale.

## Verification & Testing
- **Visual Audit:** Capture a new screenshot and compare against the original "flat" version.
- **Interactivity Test:** Verify that answer selection and elimination feel "snappy" and responsive (under 200ms).
- **Responsive Check:** Ensure the 3D transforms don't cause layout shifting on smaller screens.
