# LogicalReasoningFoundationalPartial Feature Integration Spec for Intro to LR Bootcamp

**Source repo inspected:** `vnjkoxpl-42905/logicalreasoningfoundationalpartial`  
**Target product:** LSAT U Intro to LR Bootcamp  
**Purpose:** Extract every useful feature, interaction pattern, instructional mechanic, and visual system idea from the LR Field Manual prototype and map it into the first Intro to LR Bootcamp.

---

## Executive Decision

This repo should be used as a **field-manual interaction reference**, not as a visual skin.

The app is organized like a serious LR training manual. It has a sidebar, global mastery meter, focus mode, X-Ray scan, logical gap simulator, LR anatomy table, premise/conclusion contrast cards, a reading protocol, and a final takeaway.

The best reusable idea is:

> Make the Intro to LR Bootcamp feel like a set of precise reasoning tools students operate, not a set of polished notes they passively read.

Do not copy the dark field-manual look directly. Use the structure and interaction ideas inside LSAT U's current restrained paper/workbench design system.

---

# Current Source App Structure

The source app contains six modules:

1. Introduction
2. Anatomy
3. The Core
4. Components
5. The Protocol
6. Context

It also includes:

- identity gate
- desktop sidebar
- mobile top navigation
- global progress meter
- module status rings
- sticky top HUD
- Focus Mode toggle
- X-Ray Scan toggle
- Logical Gap Simulator
- Mark Module Mastered buttons

---

# Top-to-Worst Priority Ranking

## Priority 1: Structure X-Ray

**Status:** Build now  
**Source feature:** X-Ray Scan toggle  
**Best target pages:** Page 2, Page 5, Page 7, Page 8  
**Best first target:** Page 2, `The Three Parts of an LR Question`

### What it does

The source app lets the student press an X-Ray Scan button on a stimulus. Once active, the stimulus reveals role markup:

- premise
- conclusion
- opposing view
- indicator word

The value is that normal text becomes structured text. The student can literally see the reasoning.

### Why it matters

This is one of the cleanest ways to make the Intro to LR Bootcamp feel alive. It does not require loud motion. The content itself changes state.

It supports the core LSAT U rule:

> Make reasoning structure visible only after the student engages with the text.

### Where it goes in Intro to LR

| Intro to LR page | Specific use |
|---|---|
| Page 2: The Three Parts of an LR Question | X-Ray the Stock Analysts stimulus after the student identifies stimulus, stem, and answers |
| Page 5: Conclusions | X-Ray conclusion candidates and support |
| Page 7: Beyond Premises and Conclusions | X-Ray background, opposing view, concession, pivot, premise, and conclusion |
| Page 8: The 2-Part Conclusion Check | X-Ray which claim passes and which fails the test |

### LSAT U implementation

Create a reusable component:

```text
StructureXRayText
```

Suggested props:

```text
segments: Array<{
  id: string
  text: string
  role: "background" | "premise" | "conclusion" | "opposing" | "concession" | "pivot" | "indicator"
  label: string
  explanation?: string
}>
defaultMode: "plain"
showToggle: true
```

### Visual behavior

| State | Treatment |
|---|---|
| X-Ray off | clean stimulus with no role markup |
| X-Ray pending | button says `Run Structure X-Ray` |
| X-Ray on | role underlines appear |
| Premise | thin blue underline |
| Conclusion | thin green underline |
| Opposing view | thin violet underline |
| Concession | thin amber underline |
| Pivot | compact amber bracket |
| Background | thin gray underline |
| Indicator | small gold chip |

### What to avoid

Do not use the source app's dark neon color intensity. Do not use heavy background fills. Use underlines and small chips.

---

## Priority 2: Logical Gap Simulator

**Status:** Build now  
**Source feature:** cake, slab, premise blocks, collapse/rebuild animation  
**Best target page:** Page 3, `So, An Argument`

### What it does

The source app uses a physical metaphor:

- conclusion sits on top
- premises are blocks below
- removing a premise weakens the structure
- the conclusion collapses
- the student can rebuild the argument

### Why it matters

This is the strongest visual teaching tool for Page 3. It makes the relationship between premises and conclusions physical.

Page 3 should not just define an argument. It should let the student feel what support means.

### Where it goes in Intro to LR

**Page 3: So, An Argument**

Replace static or low-quality support visuals with:

```text
Support Structure Simulator
```

### Student flow

```text
1. Student sees a conclusion held up by premise blocks.
2. Student clicks "Remove a Premise."
3. One premise block fades away.
4. Support beam weakens.
5. Conclusion tile tilts slightly.
6. Status changes from "Supported" to "Support weakened."
7. Student clicks "Rebuild Argument."
8. Structure returns to stable.
9. Student answers one micro-check: "What failed?"
```

### LSAT U visual direction

Use a calm paper/workbench version.

Use:

- white paper surface
- subtle SVG support lines
- soft tilt
- small status chip
- short coach note

Avoid:

- black lab surface
- red panic state
- large collapse animation
- exaggerated invalid label

### Component name

```text
SupportStructureSimulator
```

---

## Priority 3: Guided Focus Layer

**Status:** Build now, but carefully  
**Source feature:** Focus Mode toggle  
**Best target pages:** Page 6 and Page 7  
**Secondary target:** Page 8

### What it does

The source app has a Focus Mode toggle. When enabled, inactive cards become blurred and faded while the active card becomes sharp.

### Why it matters

Your first 8 pages can feel like long vertical stacks. A guided focus layer can make the current learning object feel alive without adding more decoration.

### Where it goes in Intro to LR

| Page | Specific use |
|---|---|
| Page 6: Five Types of Conclusions | Focus one conclusion type at a time |
| Page 7: Beyond Premises and Conclusions | Focus one role family at a time |
| Page 8: 2-Part Conclusion Check | Focus active candidate claim and active gate |

### LSAT U adaptation

Do not use hover-only blur behavior. It is too gimmicky and weak on mobile.

Build:

```text
GuidedFocusLayer
```

Behavior:

- active object stays fully visible
- inactive objects dim to 45 percent
- no blur by default
- active object has a thin border and soft elevation
- mobile uses accordion progression
- reduced motion disables animated transitions

### Why this is useful

This gives the bootcamp a breathing quality. The page feels alive because attention shifts intentionally.

---

## Priority 4: Page 2 Anatomy Table Converted Into Scanner

**Status:** Build now  
**Source feature:** LR anatomy table  
**Best target page:** Page 2, `The Three Parts of an LR Question`

### What it does

The source app explains the three parts of every LR question:

1. Stimulus
2. Question Stem
3. Answer Choices

It also states the key rule:

> The stimulus matters most.

### Why it matters

This supports the Page 2 Question Anatomy Scanner we already identified.

### Where it goes in Intro to LR

**Page 2**

### LSAT U implementation

Convert the table into a guided scanner.

Student flow:

```text
1. Prompt: "Find the stimulus."
2. Student clicks the stimulus region.
3. Prompt: "Find the question stem."
4. Student clicks the question stem region.
5. Prompt: "Find the answer choices."
6. Student clicks the answer choice region.
7. Final state: stem and choices dim, stimulus stays active.
8. Coach note: "The reasoning lives in the stimulus."
```

### Component name

```text
QuestionAnatomyScanner
```

### Why this should be built early

It upgrades an existing Page 2 concept without changing the whole shell.

---

## Priority 5: Stock Analysts Structure X-Ray

**Status:** Build now  
**Source feature:** Stock Analysts example with conclusion and premise spans  
**Best target page:** Page 2

### What it does

The source app includes the Stock Analysts stimulus and marks up the conclusion and premise inside the text.

### Why it matters

The Stock Analysts example is ideal for showing students that answer choices are downstream from stimulus structure.

### Where it goes in Intro to LR

**Page 2, immediately after Question Anatomy Scanner**

### Student flow

```text
1. Read the full LR question surface.
2. Complete the Question Anatomy Scanner.
3. Click "Run Structure X-Ray."
4. The stimulus reveals premise and conclusion underlines.
5. The question stem and answer choices dim.
6. Coach note explains that the answer choices test the structure.
```

### LSAT U adaptation

Do not show the correct answer choice too early. Use the example to teach anatomy and structure first.

---

## Priority 6: Are / Are Not Contrast Cards

**Status:** Build now  
**Source feature:** premise/conclusion contrast boxes  
**Best target pages:** Page 4 and Page 5

### What it does

The source app contrasts what premises and conclusions are versus what they are not.

For premises:

- are facts, evidence, support, building blocks
- are not main judgments, the part you attack, final claims

For conclusions:

- are author's claim, point argued for, part you question
- are not automatically proven, self-supporting, always clear

### Why it matters

This is a simple high-yield teaching pattern. Students understand premise and conclusion better through contrast.

### Where it goes in Intro to LR

| Page | Feature |
|---|---|
| Page 4: Premises | Premises Are / Are Not |
| Page 5: Conclusions | Conclusions Are / Are Not |

### LSAT U interaction upgrade

Do not leave this as static contrast.

Add one micro-check:

```text
Click the statement that does NOT describe a premise.
```

or

```text
Click the statement that DOES describe a conclusion.
```

### Component name

```text
ConceptContrastCheck
```

### Visual direction

Use compact comparison panels with one active row, not large red/green boxes.

---

## Priority 7: LR First Read Protocol

**Status:** Build now  
**Source feature:** four-step reading protocol  
**Best target page:** Page 8  
**Secondary target:** Page 1

### What it does

The source app gives a clear reading sequence:

1. Ask whether it is an argument.
2. Find the conclusion.
3. Find the premises.
4. Analyze the gap.

### Why it matters

This is a perfect tool card for the end of the first 8 pages. It summarizes the whole Intro to LR sequence.

### Where it goes in Intro to LR

Best placement:

**Page 8, after the 2-Part Check Machine**

Secondary placement:

**Page 1, as the first protocol preview**

### LSAT U implementation

Create:

```text
LRFirstReadProtocolCard
```

Display:

```text
1. Is there an argument?
2. What is the conclusion?
3. What supports it?
4. What is the gap?
```

### Interaction

At the end of Page 8, the student checks off each step using a mini stimulus.

---

## Priority 8: 2-Point Check Card Converted Into Machine

**Status:** Build now  
**Source feature:** static 2-Point Check  
**Best target page:** Page 8, `The 2-Part Conclusion Check`

### What it does

The source app states the two checks:

1. Sounds like the author's opinion.
2. Is supported by at least one explicit claim.

### Why it matters

This is the exact Page 8 concept.

### Where it goes in Intro to LR

**Page 8**

### LSAT U implementation

Do not keep it as a static card. Use it as the rule engine inside:

```text
TwoPartCheckMachine
```

Student flow:

```text
1. Candidate claim enters Gate 1.
2. Gate 1 asks: "Author's own opinion?"
3. Student answers yes/no.
4. If yes, candidate moves to Gate 2.
5. Gate 2 asks: "Supported by another explicit claim?"
6. Student answers yes/no.
7. Result appears.
```

### Visual behavior

Use two vertical gates, not a flashy machine. This should feel like a precise diagnostic tool.

---

## Priority 9: Peripheral Information Lens

**Status:** Build now  
**Source feature:** context module with background, opposing views, concessions  
**Best target page:** Page 7, `Beyond Premises and Conclusions`

### What it does

The source app teaches:

- background information
- opposing views
- concessions

It also has an X-Ray example showing opposing view, pivot, and conclusion.

### Why it matters

This overlaps directly with Page 7. Page 7 is where students need to learn that not every important-looking sentence is part of the author's core support.

### Where it goes in Intro to LR

**Page 7**

### LSAT U implementation

Create:

```text
PeripheralInformationLens
```

Student flow:

```text
1. Read a short stimulus.
2. Choose what each sentence is doing.
3. Turn on X-Ray.
4. Background dims.
5. Opposing view gets violet underline.
6. Concession gets amber underline.
7. Author's conclusion gets green underline.
```

### Role set

Use:

```text
Background
Opposing View
Concession
Pivot
Premise
Conclusion
```

---

## Priority 10: Field Manual Progress Rings

**Status:** Build later  
**Source feature:** sidebar status rings and global progress  
**Best target:** Existing LSAT U `IntegratedPathRail`

### What it does

The source app uses status rings beside each module and a global progress bar at the top of the sidebar.

### Why it matters

This is a strong small visual language for module progress. It can make the bootcamp feel more structured and premium.

### Where it goes in Intro to LR

Use inside the existing path rail, not as a new sidebar.

### LSAT U states

| State | Treatment |
|---|---|
| Not started | empty ring |
| Current | active ring |
| Interaction complete | filled ring |
| Tool unlocked | small tool chip |
| Review due | quiet dot |

### Build timing

Build after the interaction labs. Do not start here.

---

## Priority 11: Valid vs Invalid Distinction

**Status:** Archive, but use lightly on Page 3  
**Source feature:** Valid vs Invalid card  
**Best target page:** Page 3  
**Future targets:** Flaw, Strengthen, Weaken, Necessary Assumption, Must Be True

### What it does

The source app defines:

- valid conclusion = proven
- invalid conclusion = not fully proven

### Why it matters

This is conceptually important, but it can become too formal for the first Intro to LR pass.

### Where it goes in Intro to LR

Use one short line on Page 3:

```text
When support fails, the conclusion is not fully proven.
```

### Archive note

Save deeper validity work for future modules.

---

## Priority 12: Manual Mastery Button

**Status:** Do not build as-is  
**Source feature:** Mark Module Mastered button  
**Best target:** Persistence and progress pass later

### What it does

The source app lets the student manually mark a module as mastered.

### Why not copy it

Manual mastery is misleading. In LSAT U, students should not be able to declare mastery without performance evidence.

### LSAT U adaptation

Replace with:

```text
Interaction complete
```

or

```text
Tool unlocked
```

Do not use the word mastery unless it is tied to real performance data.

---

## Priority 13: Identity Gate

**Status:** Do not use  
**Source feature:** name input and manual initialization  
**Best target:** none

### Why not use it

LSAT U already has auth and profile identity logic. A separate name gate would create friction and inconsistency.

### Archive note

None. Do not integrate.

---

# Build-Now Packages

## Package A: Page 2 Anatomy and X-Ray

### Features included

1. Question Anatomy Scanner
2. Stock Analysts Structure X-Ray
3. Stimulus-first coach note

### Target page

**Page 2: The Three Parts of an LR Question**

### Final page behavior

```text
1. Student identifies stimulus, stem, and answer choices.
2. Student runs Structure X-Ray on the stimulus.
3. The app reveals conclusion and premise structure.
4. The app dims answer choices.
5. Coach note reinforces: "The reasoning lives in the stimulus."
```

### Why this package matters

This turns Page 2 from static anatomy into an active dissection.

---

## Package B: Page 3 Support Structure Simulator

### Features included

1. Logical Gap Simulator
2. Valid vs invalid light concept
3. Rebuild argument action

### Target page

**Page 3: So, An Argument**

### Final page behavior

```text
1. Conclusion rests on premise blocks.
2. Student removes one premise.
3. Support weakens.
4. Student rebuilds the argument.
5. Student answers a micro-check about what failed.
```

### Why this package matters

This makes support physical and memorable.

---

## Package C: Page 7 Context Lens

### Features included

1. Peripheral Information Lens
2. Structure X-Ray
3. Guided Focus Layer
4. Role underlines

### Target page

**Page 7: Beyond Premises and Conclusions**

### Final page behavior

```text
1. Student sees a full stimulus.
2. Student labels background, opposing view, concession, pivot, premise, and conclusion.
3. Student turns on Structure X-Ray.
4. Student toggles Author's Argument Only.
5. Model map appears.
```

### Why this package matters

Page 7 is the highest risk page for flatness. This package gives it a real interactive identity.

---

## Package D: Page 8 Protocol and 2-Part Machine

### Features included

1. TwoPartCheckMachine
2. LRFirstReadProtocolCard
3. Scenario progress pips

### Target page

**Page 8: The 2-Part Conclusion Check**

### Final page behavior

```text
1. Student runs candidate claims through the 2-Part Check.
2. Student sees why claims fail or pass.
3. Student unlocks the LR First Read Protocol.
4. Student completes one final conclusion check.
```

### Why this package matters

It turns the core tool into something students operate.

---

# Recommended Implementation Order

## Phase 1: Page 2

Build:

1. `QuestionAnatomyScanner`
2. `StructureXRayText`
3. `StockAnalystsXRayExample`

Reason:

Page 2 is the cleanest place to introduce the X-Ray interaction.

---

## Phase 2: Page 3

Build:

1. `SupportStructureSimulator`
2. `PremiseBlock`
3. `ConclusionTile`
4. `SupportStatusChip`

Reason:

Page 3 needs the biggest visual upgrade. This is the clearest "alive" moment from this repo.

---

## Phase 3: Page 7

Build:

1. `PeripheralInformationLens`
2. `GuidedFocusLayer`
3. `RoleUnderlineLegend`
4. `AuthorArgumentOnlyToggle`

Reason:

This is the biggest conceptual payoff.

---

## Phase 4: Page 8

Build:

1. `TwoPartCheckMachine`
2. `LRFirstReadProtocolCard`
3. `ScenarioProgressPips`

Reason:

This converts the final tool into a capstone interaction.

---

## Phase 5: Path Rail Enhancement

Build later:

1. status rings
2. tool unlocked chips
3. interaction complete states

Reason:

Useful polish, but it should follow the core labs.

---

# Suggested Components

## New components

```text
StructureXRayText.tsx
QuestionAnatomyScanner.tsx
StockAnalystsXRayExample.tsx
SupportStructureSimulator.tsx
GuidedFocusLayer.tsx
PeripheralInformationLens.tsx
LRFirstReadProtocolCard.tsx
TwoPartCheckMachine.tsx
ScenarioProgressPips.tsx
ConceptContrastCheck.tsx
```

## Shared primitives

```text
RoleUnderline.tsx
RoleChip.tsx
SupportStatusChip.tsx
TactileTextSegment.tsx
CoachNoteRail.tsx
CompletionGate.tsx
```

---

# Suggested Target Files to Inspect in LSAT U

```text
src/bootcamps/main-conclusion/modules/lessons/notes/IntroLessonPage.tsx
src/bootcamps/main-conclusion/modules/lessons/notes/IntroNotesShell.tsx
src/bootcamps/main-conclusion/modules/lessons/notes/NoteInteractions.tsx
src/bootcamps/main-conclusion/content/introToLrPath.ts
```

---

# What Not To Copy

Do not copy these source app elements:

- dark field manual visual system
- name gate
- manual mastery claims
- heavy blur on hover
- hover-only Focus Mode
- red invalid collapse as the main tone
- "system active" military language
- full sidebar replacement
- dark black simulator surface
- raw completion percentages without real persistence

Use the interaction logic, not the skin.

---

# Copy-Paste Implementation Prompt

```text
Inspect the current Intro to LR Bootcamp implementation before changing anything.

Files to inspect:
- src/bootcamps/main-conclusion/modules/lessons/notes/IntroLessonPage.tsx
- src/bootcamps/main-conclusion/modules/lessons/notes/IntroNotesShell.tsx
- src/bootcamps/main-conclusion/modules/lessons/notes/NoteInteractions.tsx
- src/bootcamps/main-conclusion/content/introToLrPath.ts

Reference repo:
- vnjkoxpl-42905/logicalreasoningfoundationalpartial

Goal:
Use the interaction ideas from the LR Field Manual prototype to make the Intro to LR Bootcamp feel more like a precise reasoning toolset and less like a static note page.

Do not copy the dark field-manual visual style.
Do not add a new identity gate.
Do not replace the existing bootcamp shell or path rail.
Do not add manual "mastery" claims.
Do not use hover-only interactions.
Do not modify unrelated drill systems.
Do not add Supabase persistence in this pass.

First implementation target:
Page 2, The Three Parts of an LR Question.

Build:
1. QuestionAnatomyScanner
2. StructureXRayText
3. StockAnalystsXRayExample

Required Page 2 flow:
1. Student sees the full LR question surface.
2. Student must identify the stimulus, question stem, and answer choices in order.
3. The final scanner state dims the question stem and answer choices.
4. The stimulus remains active with the coach note: "The reasoning lives in the stimulus."
5. Student then runs Structure X-Ray on the Stock Analysts stimulus.
6. Premise and conclusion underlines appear.
7. The answer choices remain visually secondary.

Visual requirements:
- Use LSAT U's restrained warm paper/workbench style.
- Use thin role underlines, small labels, and subtle dimming.
- Use real buttons for clickable regions.
- Use visible focus states.
- Support reduced motion.
- Keep motion between 90ms and 240ms.
- Avoid dark neon styling, heavy glow, and loud collapse effects.

Acceptance criteria:
- Page 2 no longer behaves like a static anatomy explanation.
- Student action is required before explanation appears.
- Stimulus, stem, and answer choices can be identified in sequence.
- Structure X-Ray can be toggled on and off.
- X-Ray reveals premise and conclusion roles using restrained underlines.
- Existing route behavior remains intact.
- No unrelated pages are redesigned in this pass.

After implementation, report:
1. Files changed.
2. Components added.
3. How reduced motion is handled.
4. How keyboard access works.
5. Follow-up plan for Page 3 Support Structure Simulator.
```

---

# Final Recommendation

This repo should feed four major upgrades:

1. **Page 2:** Question Anatomy Scanner plus Structure X-Ray
2. **Page 3:** Support Structure Simulator
3. **Page 7:** Peripheral Information Lens plus Guided Focus Layer
4. **Page 8:** 2-Part Check Machine plus LR First Read Protocol

The top feature from this repo is **Structure X-Ray**.

The top visual teaching moment is **Support Structure Simulator**.

The top product-level idea is **field-manual clarity**, where each page gives the student one precise tool to operate.
