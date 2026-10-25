# Arguments Repo Feature Integration Spec for Intro to LR Bootcamp

**Source repo inspected:** `vnjkoxpl-42905/arguments`  
**Target product:** LSAT U Intro to LR Bootcamp  
**Purpose:** Extract every useful interaction, visual mechanic, and instructional feature from the `arguments` prototype and map it into the first Intro to LR Bootcamp.

---

## Executive Decision

The `arguments` repo should not be copied visually. Its dark cyber style, neon hero, glowing SVG grid, aggressive red and green feedback, and loud motion do not fit the LSAT U Intro to LR Bootcamp.

The value is in the interaction architecture.

The best reusable idea is:

> Turn each lesson concept into a small interactive reasoning tool that the student must operate before moving forward.

This supports the LSAT U bootcamp direction: one dominant learning object per page, student action before explanation, visible reasoning structure, restrained motion, and teacher-like feedback.

---

# Top-to-Worst Priority Ranking

## Priority 1: Author Position Translator

**Status:** Build first  
**Source feature:** `NegativeSection` and `REBUTTAL_BANK`  
**Best target page:** Page 7, `Beyond Premises and Conclusions`  
**Secondary target:** Page 5, `Conclusions`

### What it does

Students see a rebuttal-style stimulus and must translate what the author actually believes.

Example source pattern:

```text
Some people believe X. However, this view is mistaken.
```

The student must choose the best unpacked version of the author's position.

### Why it matters

This is the strongest feature from the repo because it teaches a real LSAT move:

- Do not mistake the opposing view for the author's view.
- Do not leave referential language packed up.
- Do not overstate the author's position.
- Translate the rebuttal into a clean claim.

### Where it goes in Intro to LR

**Page 7, after the section on opposing views, concessions, and pivots.**

Suggested section name:

```text
Author Position Translator
```

### Student flow

```text
1. Read the rebuttal stimulus.
2. Identify the view the author is rejecting.
3. Choose the best plain-English translation of the author's actual position.
4. Receive trap-specific feedback.
5. Reveal the model structure.
```

### Answer choice types

| Choice type | Purpose |
|---|---|
| Correct unpacked author position | Teaches exact author view |
| Opposing view trap | Catches students who pick the other side |
| Vague referential language trap | Catches students who leave "this" or "that" unresolved |
| Too extreme trap | Catches students who over-negate or overstate |

### LSAT U adaptation

Use restrained tactile answer rows, not neon answer blocks.

**Use:**
- paper surface
- thin border
- selected row state
- amber correction chip
- compact coach note

**Avoid:**
- full red wrong answer blocks
- shaking every wrong answer
- glowing cyber styling

---

## Priority 2: Pivot Reveal

**Status:** Build now  
**Source feature:** Trojan Horse Concession Reveal  
**Best target page:** Page 7, `Beyond Premises and Conclusions`

### What it does

The student clicks the pivot word to reveal where the author takes over.

Source-style pattern:

```text
Granted, the new transit policy did reduce traffic downtown.
HOWEVER
the policy is still misguided.
```

### Why it matters

This gives Page 7 a memorable visual teaching moment. It shows students that concessions are not usually the author's final point. The pivot is where the author's real argument begins.

### Where it goes in Intro to LR

**Page 7, inside the section on concessions and pivots.**

Suggested section name:

```text
Pivot Reveal: Where the Author Takes Over
```

### Student flow

```text
1. Read the concession.
2. Click the pivot word.
3. Watch the concession dim.
4. Watch the author's position reveal.
5. Read a short Joshua note.
```

### Visual behavior

| State | Treatment |
|---|---|
| Before click | concession visible, pivot chip active |
| On click | pivot chip activates |
| After click | concession dims, author position brightens |
| Coach note | "The concession is not the main point. The pivot tells you where the author takes over." |

### LSAT U adaptation

Keep the click-to-reveal structure. Replace the glowing button with a quiet pivot chip and role underline.

---

## Priority 3: Referential Language Unpacker

**Status:** Build now  
**Source feature:** clickable "such laws" replacement  
**Best target page:** Page 7, `Beyond Premises and Conclusions`  
**Secondary target:** Page 5, `Conclusions`

### What it does

Students click vague referential language and the app replaces it inline with the exact referent.

Example:

```text
"However, such laws won't affect the homicide rate."
```

After click:

```text
"However, [laws requiring mandatory background checks] won't affect the homicide rate."
```

### Why it matters

This is highly LSAT-specific. Many conclusions use packed language like:

- this
- that
- such
- these
- this view
- that claim
- this position
- such laws

Students often identify the right sentence but do not understand the full claim. This feature fixes that.

### Where it goes in Intro to LR

Best placement:

**Page 7, after opposing view and pivot instruction.**

Second placement:

**Page 5, inside conclusion identification.**

### Student flow

```text
1. Read a conclusion with packed language.
2. Click the packed phrase.
3. See the exact referent inserted inline.
4. Answer: "What does the author actually believe?"
```

### LSAT U adaptation

Use bracket replacement, not a flashy glow.

Suggested visual:

```text
such laws
```

becomes:

```text
[laws requiring mandatory background checks]
```

Use a thin cyan or blue underline, a subtle bracket chip, and a margin tutor note.

---

## Priority 4: Claim Bucket Inspector

**Status:** Build now  
**Source feature:** "Categorizing Claims Like a Surgeon" bucket cards  
**Best target page:** Page 7, `Beyond Premises and Conclusions`

### What it does

Students inspect role categories before applying them to a real stimulus.

Source bucket set:

- Main Conclusion
- Support
- Neutral
- Opposing

### Why it matters

Page 7 currently needs a compact mental model before students start labeling full stimuli. This is the clean setup for the Full Stimulus Role Lab.

### Where it goes in Intro to LR

**Page 7, before the Full Stimulus Role Lab.**

Suggested section name:

```text
Role Tray
```

### LSAT U role set

Expand the source repo's four buckets into the richer LSAT U role set:

| LSAT U role | Definition |
|---|---|
| Background | Context that frames the issue but does not support the author's claim |
| Opposing View | A view the author is responding to or rejecting |
| Opposing Support | Support for the opposing side |
| Concession | Something the author grants before making the real point |
| Pivot | Language that turns from one side to another |
| Premise | Support for the author's conclusion |
| Conclusion | The author's main claim |

### Student flow

```text
1. Click each role chip.
2. See one-line definition.
3. See one example sentence.
4. Mark the role as inspected.
5. Unlock the role-labeling lab.
```

### LSAT U adaptation

Do not use large glowing gradient cards. Use small role chips and one active explanation panel.

---

## Priority 5: FABS Indicator Activator

**Status:** Build now  
**Source feature:** FABS hover interaction  
**Best target page:** Page 4, `Premises`

### What it does

Students activate the four high-value premise indicators:

- F = For
- A = After all
- B = Because
- S = Since

The active indicator reveals what it does.

### Why it matters

Page 4 currently needs to avoid becoming a static indicator list. This turns premise indicators into a small tactile tool.

### Where it goes in Intro to LR

**Page 4, replacing or upgrading the static Premise Indicators section.**

Suggested section name:

```text
FABS: The Support Signals
```

### Student flow

```text
1. Student clicks F.
2. "For" reveals with one-line function.
3. Student clicks A.
4. "After all" reveals with one-line function.
5. Repeat for B and S.
6. Student completes a mini-check: "Which claim is being supported?"
```

### Accessibility fix

The source uses hover. LSAT U should use click or tap, not hover-only.

---

## Priority 6: Main Conclusion Practice Simulator

**Status:** Build after Page 7 core lab  
**Source feature:** `SimulatorSection` and `INTERACTIVE_BANK`  
**Best target page:** Page 8, `The 2-Part Conclusion Check`  
**Secondary target:** Page 5, `Conclusions`

### What it does

The student reads a short argument and clicks the sentence that functions as the main conclusion.

If correct:

- explanation appears
- other sentence roles reveal
- next drill becomes available

If wrong:

- student gets immediate feedback and can retry

### Why it matters

This is the cleanest capstone interaction for the first 8 pages. It lets students apply the 2-Part Conclusion Check after learning it.

### Where it goes in Intro to LR

Best placement:

**Page 8, after the 2-Part Check Machine.**

Suggested section name:

```text
One More Rep
```

### Student flow

```text
1. Read a short stimulus.
2. Click the main conclusion.
3. If wrong, try again with a hint.
4. If correct, reveal the model map.
5. Continue.
```

### LSAT U adaptation

Use this after the 2-Part Check Machine, not before it. The simulator should test the tool the student just learned.

---

## Priority 7: Model Structure Reveal

**Status:** Build as reusable component  
**Source feature:** explanation plus role cards after correct simulator answer  
**Best target pages:** Pages 5, 7, and 8

### What it does

After the student answers, the app reveals the structure of the stimulus.

Example output:

```text
Main Conclusion
Premise
Opposing View
Background
```

### Why it matters

This gives students a clear post-attempt model. It also makes the page feel alive because the hidden structure appears after action.

### Where it goes in Intro to LR

Use it in:

| Page | Use |
|---|---|
| Page 5 | reveal why a candidate is the conclusion |
| Page 7 | reveal full role map after labeling |
| Page 8 | reveal which claim passes the 2-Part Check |

### Component idea

```text
ModelStructureReveal
```

Props:

```text
sentences
roles
studentSelections
coachNote
```

### LSAT U adaptation

Use underlines and chips instead of colored blocks.

---

## Priority 8: Completion-Gated Next Button

**Status:** Build across first 8 pages after first lab is stable  
**Source feature:** next module button appears only after completion  
**Best target pages:** All first 8 Intro to LR pages

### What it does

The page does not treat reading as completion. The student must complete the page's required interaction before the continue action becomes active.

### Why it matters

This changes the entire bootcamp from passive notes to active training.

### Where it goes in Intro to LR

Each first-eight page should have one completion condition.

| Page | Completion condition |
|---|---|
| Page 1 | Student identifies active vs passive reading |
| Page 2 | Student completes question anatomy scanner |
| Page 3 | Student completes support physics interaction |
| Page 4 | Student activates FABS and completes premise check |
| Page 5 | Student selects a conclusion candidate |
| Page 6 | Student classifies at least 3 conclusion types |
| Page 7 | Student completes author position lab |
| Page 8 | Student runs the 2-Part Check machine |

### LSAT U adaptation

Do not block the whole page aggressively at first. Start with:

```text
Continue button disabled until interaction complete.
```

Add persistence later.

---

## Priority 9: Scenario Progress Pips

**Status:** Build where a lab has multiple examples  
**Source feature:** progress pips inside Absolute Statements section  
**Best target pages:** Page 6 or Page 8

### What it does

Small progress pips show how many examples in a mini-lab have been reviewed.

### Why it matters

This gives students orientation inside multi-example lessons without adding a heavy dashboard.

### Where it goes in Intro to LR

Use in:

| Page | Lab |
|---|---|
| Page 6 | conclusion type switchboard |
| Page 8 | 2-Part Check machine with Claim A, Claim B, Claim C |

### LSAT U adaptation

Use thin step chips or quiet pips, not glowing bars.

---

## Priority 10: Binary Validity Slider

**Status:** Archive for later  
**Source feature:** Validity Tester  
**Best future target:** Conditional Logic, Must Be True, Sufficient Assumption, Formal Logic  
**Possible Intro to LR target:** Page 3, only as a short optional concept

### What it does

The student drags a guarantee slider. Anything below 100 percent fails. Exactly 100 percent passes.

### Why it matters

It makes "guarantee" physical and memorable.

### Why not build now

The first Intro to LR Bootcamp should focus on argument anatomy, premises, conclusions, role ownership, and the 2-Part Conclusion Check. This slider is useful, but it points more toward formal validity and conditional logic.

### Archive note

Save for a future validity or conditional logic lesson.

---

## Priority 11: Conditional Trigger Tester

**Status:** Archive for Conditional Logic Bootcamp  
**Source feature:** "If you smash the window with the bat, the alarm has to go off" scenario tester  
**Best future target:** Conditional Logic Bootcamp

### What it does

Students test four conditional scenarios:

1. Sufficient condition triggered
2. Necessary condition absent
3. Necessary condition present
4. Sufficient condition absent

### Why it matters

Excellent conditional logic teaching tool.

### Why not build now

It is not central to the first Intro to LR Bootcamp. Adding it now would distract from the argument-structure sequence.

### Archive note

High-value future feature.

---

## Priority 12: Absolute Statements Tester

**Status:** Archive for later argument-strength lessons  
**Source feature:** Absolute statements module  
**Best future targets:** Flaw, Strengthen, Weaken, Necessary Assumption, Most Supported

### What it does

Students review full-force statements, apply an invalidation test, then compare with a softened version.

### Why it matters

This teaches scope, force, and vulnerability.

### Why not build now

It is useful, but not core to Intro to LR's first eight pages. Page 6 could mention conclusion force, but the full tester belongs later.

### Archive note

Use later for answer-choice precision and flaw work.

---

## Priority 13: Coach Note Completion Card

**Status:** Archive for end-of-bootcamp polish  
**Source feature:** final coach note module  
**Best future target:** End of Intro to LR Bootcamp or module completion screen

### What it does

A large closing card gives students a teacher-like completion moment.

### Why it matters

It can make the module feel human and complete.

### Why not build now

The current priority is interactive reasoning, not celebration or wrap-up polish.

### LSAT U adaptation

Use a concise Joshua-style note, not a long motivational monologue.

Example:

```text
You now have the core map:
facts support claims,
authors own conclusions,
and opposing views are not the author's point.
```

---

# Recommended Implementation Order

## Phase 1: Page 7 Author Position Lab

Build these together because they reinforce one another:

1. Claim Bucket Inspector
2. Pivot Reveal
3. Referential Language Unpacker
4. Author Position Translator
5. Model Structure Reveal

### Why Page 7 first

Page 7 has the largest flatness risk and the best fit for the `arguments` repo features. It currently needs to teach roles beyond premise and conclusion. These features turn that into a real lab.

### Suggested Page 7 flow

```text
1. Inspect the role tray.
2. Click the pivot to reveal where the author takes over.
3. Unpack the packed claim.
4. Translate the author's real position.
5. Reveal the model map.
6. Unlock Role Sorting Lens.
```

---

## Phase 2: Page 4 Premise Indicator Upgrade

Build:

1. FABS Indicator Activator
2. Short premise support check

### Suggested Page 4 flow

```text
1. Activate F, A, B, and S.
2. See what each indicator does.
3. Read a short example.
4. Pick which claim is being supported.
```

---

## Phase 3: Page 8 Main Conclusion Capstone

Build:

1. Main Conclusion Practice Simulator
2. Model Structure Reveal
3. Scenario progress pips

### Suggested Page 8 flow

```text
1. Run the 2-Part Check Machine.
2. Try one more stimulus.
3. Click the main conclusion.
4. Reveal model structure.
5. Continue.
```

---

## Phase 4: Archive Features for Later

Save these for future bootcamps:

1. Binary Validity Slider
2. Conditional Trigger Tester
3. Absolute Statements Tester
4. Coach Note Completion Card

---

# Implementation Notes for LSAT U

## Likely target files to inspect first

```text
src/bootcamps/main-conclusion/modules/lessons/notes/IntroLessonPage.tsx
src/bootcamps/main-conclusion/modules/lessons/notes/IntroNotesShell.tsx
src/bootcamps/main-conclusion/modules/lessons/notes/NoteInteractions.tsx
src/bootcamps/main-conclusion/content/introToLrPath.ts
```

## New component candidates

```text
AuthorPositionTranslator.tsx
PivotReveal.tsx
ReferentialLanguageUnpacker.tsx
ClaimBucketInspector.tsx
FabsIndicatorActivator.tsx
MainConclusionMiniSimulator.tsx
ModelStructureReveal.tsx
ScenarioProgressPips.tsx
```

## Shared primitive candidates

```text
TactileAnswerRow.tsx
RoleChip.tsx
StimulusSentenceRow.tsx
CoachNoteRail.tsx
CompletionGate.tsx
```

---

# What Not To Copy

Do not copy these from the `arguments` repo:

- dark cyber visual system
- neon SVG background
- glowing node network
- massive gradient hero
- aggressive red and green correctness fills
- constant pulsing
- shimmer on main actions
- large glowing card shells
- harsh wrong-answer shake
- over-the-top wording
- "turn your brain off" phrasing
- "massive narcissist" phrasing
- "surgeon" metaphor as the main language

Use the interaction logic. Re-skin everything into LSAT U's restrained paper/workbench system.

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
- vnjkoxpl-42905/arguments

Goal:
Use the interaction ideas from the arguments repo to upgrade the Intro to LR Bootcamp, especially Page 7, without copying the repo's dark neon visual style.

Do not redesign the whole bootcamp shell.
Do not change routing.
Do not modify unrelated drill systems.
Do not add Supabase persistence in this pass.
Do not use the dark cyber visual style from the reference repo.

First implementation target:
Page 7, Beyond Premises and Conclusions.

Build a Page 7 Author Position Lab using these interaction ideas:
1. Claim Bucket Inspector
2. Pivot Reveal
3. Referential Language Unpacker
4. Author Position Translator
5. Model Structure Reveal

Required Page 7 flow:
1. Student inspects the role tray: Background, Opposing View, Opposing Support, Concession, Pivot, Premise, Conclusion.
2. Student clicks a pivot word to reveal where the author takes over.
3. Student clicks packed referential language like "this view" or "such laws" to unpack it into the exact referent.
4. Student chooses the best translation of the author's actual position.
5. The model structure reveals with restrained role underlines and chips.
6. The page unlocks the continue action only after the interaction is complete.

Visual requirements:
- Use LSAT U's restrained warm paper/workbench style.
- Use tactile rows, thin borders, small chips, and role underlines.
- Use amber correction chips for wrong answers, not harsh red blocks.
- Use a compact coach note, not a chatbot.
- Motion should be subtle and purposeful, 90ms to 240ms.
- Respect reduced motion.
- Use real buttons for interactive choices.
- Avoid hover-only interactions.

Acceptance criteria:
- Page 7 no longer feels like a static stack of explanatory cards.
- The student must act before the model explanation appears.
- The role tray is inspected before the role lab unlocks.
- The pivot reveal clearly distinguishes concession from author position.
- The referential language unpacker replaces vague phrases with exact referents.
- The author position translator has at least three answer types: correct translation, opposing-view trap, and vague-reference trap.
- ModelStructureReveal appears after completion.
- Existing routes still work.
- No unrelated pages are redesigned in this pass.

After implementation, report:
1. Files changed.
2. Components added.
3. How Page 7 completion is gated.
4. Any follow-up work needed for Pages 4, 5, and 8.
```

---

# Final Recommendation

Use the `arguments` repo mainly for **Page 7**.

The top feature package is:

```text
Claim Bucket Inspector
+ Pivot Reveal
+ Referential Language Unpacker
+ Author Position Translator
+ Model Structure Reveal
```

That turns the flattest conceptual page into a real reasoning lab and gives the Intro to LR Bootcamp a much more alive, premium, instructional feel.
