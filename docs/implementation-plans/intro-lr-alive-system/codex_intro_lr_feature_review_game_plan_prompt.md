# Codex Review Prompt: Intro to LR Bootcamp Feature Selection and Implementation Game Plan

## Role

You are acting as a senior frontend architect, product engineer, implementation planner, and UI/UX reviewer for LSAT U.

Your task is to review three attached Markdown feature-integration specs, inspect the current LSAT U codebase, and produce the optimal implementation game plan for upgrading the first 8 Intro to LR Bootcamp pages.

Do **not** implement immediately.

First, inspect the repo and produce a clear plan. Wait for approval before editing code.

---

# Attached Files to Review

Review these three attached Markdown files one by one:

1. `logicalreasoningfoundationalpartial_intro_lr_feature_integration_spec.md`
2. `arguments_repo_intro_lr_bootcamp_feature_integration_spec.md`
3. `structuredrill_intro_lr_bootcamp_feature_integration_spec.md`

These files summarize three GitHub prototype audits and map their best features into the LSAT U Intro to LR Bootcamp.

Your job is to decide which suggestions are optimal, which are risky, which should be archived, and what the safest first implementation plan should be.

---

# Product Goal

The first 8 Intro to LR Bootcamp pages currently risk feeling too much like polished notes.

The target experience is a premium interactive reasoning-workbench experience.

The student should:

- touch the stimulus
- identify structure
- commit before reveal
- see reasoning structure appear
- receive compact coach feedback
- continue only after meaningful interaction

The bootcamp should feel alive because the reasoning responds to the student, not because the interface adds loud animation.

---

# Current Target Area

Focus only on the first 8 Intro to LR Bootcamp note pages.

Likely files to inspect first:

```text
src/bootcamps/main-conclusion/modules/lessons/notes/IntroLessonPage.tsx
src/bootcamps/main-conclusion/modules/lessons/notes/IntroNotesShell.tsx
src/bootcamps/main-conclusion/modules/lessons/notes/NoteInteractions.tsx
src/bootcamps/main-conclusion/content/introToLrPath.ts
```

Also inspect:

- existing shared UI primitives
- hooks used by the bootcamp
- lesson progress logic
- route handling
- current note interaction components
- any existing X-Ray, reveal, support simulator, or card components

---

# Hard Constraints

Do not start implementing until the plan is approved.

Do not:

- redesign the entire bootcamp shell
- change routing
- break any of the first 8 note pages
- remove existing content wholesale
- touch unrelated drills, practice systems, or Supabase tables during the planning pass
- add Supabase persistence in the first implementation slice unless there is already a safe existing pattern for this exact bootcamp note state
- copy dark neon visual styles from the reference prototypes
- add fake analytics
- add fake mastery
- add fake progress
- add shimmer, confetti, or loud decorative motion
- use hover-only teaching interactions
- use clickable divs where real buttons are appropriate
- make broad changes across all pages in one commit

Use small, rollback-safe steps.

---

# Design Standard

Use LSAT U’s restrained warm paper/workbench style.

The UI should feel:

- premium
- tactile
- calm
- precise
- instructional
- alive through interaction

Avoid:

- generic SaaS dashboard feel
- noisy gamification
- neon
- overbuilt animation
- decorative effects
- red/green correctness floods
- fake completion or mastery claims

Motion should guide attention only.

Suggested motion rules:

```text
Hover/tactile lift: 90–120ms
Small reveal: 140–180ms
Spotlight shift: 160–200ms
Panel/drawer movement: 220–280ms
No infinite decorative motion
Reduced motion must be supported
```

---

# Review Process

Go through each attached spec separately.

For each file, summarize:

1. Best feature ideas from that source.
2. Ideas actually worth building now.
3. Ideas to archive for later.
4. Which first-eight Intro to LR page each idea fits.
5. Any ideas that conflict with the current LSAT U codebase.
6. Any ideas that should be rejected.

Then synthesize all three specs into one ranked implementation plan.

---

# Prioritization Logic

Choose the safest, highest-impact implementation order.

Prefer:

1. reusable primitives
2. one focused proof page
3. small commits
4. visible product improvement
5. no risky data or route changes

Expected optimal direction unless repo inspection proves otherwise:

```text
Phase 0: Shared primitives and interaction foundation
Phase 1: Page 2 proof: Question Anatomy Scanner plus Structure X-Ray
Phase 2: Page 3 Support Structure Simulator
Phase 3: Page 7 Author Position / Role Lab
Phase 4: Page 8 2-Part Check Machine
Phase 5: Pages 4, 5, and 6 targeted upgrades
Phase 6: Path rail and polish later
```

Do not blindly follow that order. Inspect the repo first and confirm whether this is actually the safest path.

If the current codebase makes Page 7 safer as the first implementation slice, explain why. Otherwise, Page 2 is likely the safest first proof.

---

# Evaluation Questions to Answer Before Implementation

Answer these before proposing code changes:

1. Where exactly are the first 8 Intro to LR note pages rendered?
2. Are the first 8 pages rendered through a single file, separate components, or conditional sections?
3. Which existing components can be reused instead of creating new ones?
4. Is there already a role-highlighting or X-Ray component?
5. Is there already local page interaction state?
6. Is there already a reduced-motion utility or pattern?
7. What is the safest first implementation slice?
8. What could break the current first 8 page flow?
9. What should not be touched in this pass?
10. What can be done with local state only?
11. What should wait for a persistence/Supabase pass?
12. What should be archived for a later bootcamp?

---

# Required Planning Output

Before coding, produce a clear implementation game plan with the following sections.

## 1. Current Repo Findings

Include:

- exact files inspected
- how the first 8 pages currently render
- what existing interaction components already exist
- how the shell and route work
- where Page 2, Page 3, Page 7, and Page 8 currently live
- current risk areas
- what should remain untouched

## 2. Source-File Review

Review each attached file separately.

### File 1: logicalreasoningfoundationalpartial spec

Identify whether to use:

- Structure X-Ray
- Logical Gap Simulator
- Guided Focus Layer
- Page 2 Anatomy Scanner
- Stock Analysts Structure X-Ray
- Are / Are Not contrast cards
- LR First Read Protocol
- 2-Point Check converted into machine
- Peripheral Information Lens
- status rings
- archive-only items

### File 2: arguments spec

Identify whether to use:

- Author Position Translator
- Pivot Reveal
- Referential Language Unpacker
- Claim Bucket Inspector
- FABS Indicator Activator
- Main Conclusion Practice Simulator
- Model Structure Reveal
- Completion-gated next behavior
- Scenario Progress Pips
- archive-only items

### File 3: structuredrill spec

Identify whether to use:

- staged argument dissection flow
- clickable stimulus segmentation
- indicator word parser
- micro-checkpoints
- role framework buckets
- model map reveal
- tactile choice rows
- lesson nav completion states
- archive-only items

For each file, clearly mark:

```text
Build now
Build later
Archive
Reject
```

## 3. Optimal Feature Selection

Rank the optimal feature set from highest to lowest priority.

Include:

1. Shared primitives
2. Page 2 Question Anatomy Scanner + Structure X-Ray
3. Page 3 Support Structure Simulator
4. Page 7 Author Position Lab / Full Stimulus Role Lab
5. Page 8 2-Part Check Machine
6. Page 4 Premise Support Sorter
7. Page 5 Conclusion Candidate Tester
8. Page 6 Conclusion Type Switchboard
9. Later polish and persistence

## 4. Proposed Architecture

List exact new components only if needed.

Prefer reuse first.

Potential shared primitives:

```text
LearningObjectFrame
TactileRow
StructureXRayText
CoachNoteRail
CompletionGate
LessonStatusStrip
RoleChip
RoleUnderline
ModelStructureReveal
ScenarioProgressPips
ScaffoldFadeControls
```

Potential page-specific components:

```text
QuestionAnatomyScanner
StockAnalystsXRayExample
SupportStructureSimulator
AuthorPositionTranslator
PivotReveal
ReferentialLanguageUnpacker
FullStimulusRoleLab
TwoPartCheckMachine
FabsIndicatorActivator
PremiseSupportSorter
ConclusionCandidateTester
ConclusionTypeSwitchboard
```

For each proposed component, state:

- purpose
- target page
- whether it is shared or page-specific
- whether it should be built in the first slice or later
- why it is safe or risky

## 5. First Implementation Slice

Recommend **one narrow first slice only**.

The first slice must be small enough to review safely.

Preferred first slice unless repo inspection suggests otherwise:

```text
Build shared primitives needed for Page 2.
Apply only to Page 2: The Three Parts of an LR Question.
Add Question Anatomy Scanner.
Add Structure X-Ray for the Stock Analysts example.
Keep the existing route and page shell intact.
Do not visibly alter Pages 1, 3, 4, 5, 6, 7, or 8.
```

The first slice should not include:

- Page 7 full rebuild
- Supabase persistence
- path rail redesign
- all-page completion gating
- broad shell changes
- full new design system
- unrelated drill changes

## 6. Acceptance Criteria for First Slice

Include:

- existing first 8 note routes still load
- Page 2 is still readable before interaction
- student must identify stimulus, question stem, and answer choices in order
- Structure X-Ray can be toggled on and off
- X-Ray uses restrained role underlines, not heavy highlight blocks
- continue behavior is clear and does not break navigation
- keyboard users can complete the interaction
- reduced-motion users are supported
- no unrelated drills or data flows are touched
- no Supabase writes are introduced
- mobile layout remains usable

## 7. Risks and Rollback Plan

List:

- what could break
- what files are highest risk
- how to keep the change rollback-safe
- what should be committed separately
- how to verify the first 8 pages still work

## 8. Commit Strategy

Use small commits.

Suggested commit order after approval:

```text
1. Add shared primitives with no page integration.
2. Integrate Page 2 only.
3. Run typecheck and tests.
4. Manually QA all first 8 note pages.
5. Report results.
```

Do not do one mega-commit.

---

# Accessibility Requirements

Any proposed implementation must include:

- real buttons for interactive choices
- `aria-current="step"` for active step chips
- `aria-expanded` and `aria-controls` for reveal panels
- `aria-live="polite"` for status updates
- visible focus states
- keyboard-only completion path
- no hover-only teaching
- no color-only meaning
- reduced-motion support
- readable mobile layout

---

# Implementation Rule After Approval

After the plan is approved, implement **only the approved first slice**.

Do not broaden scope.

After implementation, report:

1. files changed
2. components added
3. what was intentionally left untouched
4. how to QA all first 8 pages
5. how keyboard accessibility was handled
6. how reduced motion was handled
7. what the next best slice should be

---

# Final Instruction

Do not implement yet.

First inspect the repo, review the three attached specs, and produce the implementation game plan.

The output should be specific enough that I can approve it or ask for revisions before any code is changed.
