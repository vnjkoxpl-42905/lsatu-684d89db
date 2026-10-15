# Structuredrill Audit: Intro to LR Bootcamp Feature Integration Spec

## Purpose

This file translates the `vnjkoxpl-42905/structuredrill` repo audit into concrete LSAT U Intro to LR Bootcamp implementation options.

The goal is not to copy the visual skin from `structuredrill`. The goal is to extract the strongest interaction mechanics, make them LSAT U native, and use them to turn the first Intro to LR Bootcamp from polished lecture notes into a premium interactive reasoning lab.

Core standard:

> The bootcamp should feel alive because the reasoning responds to the student. The student should touch the stimulus, commit before reveal, see structure appear, receive compact coaching, and then move forward.

---

## Repo inspected

Repository:

```text
https://github.com/vnjkoxpl-42905/structuredrill
```

Primary inspected file:

```text
index.html
```

The repo is a single-page HTML prototype with inline CSS and JavaScript. It includes a dashboard, lesson notes, embedded quizzes, an argument dissection drill, a flashcard deck, local progress persistence, loading states, toast feedback, and responsive behavior.

Evidence points from the repo:

- Global design tokens, ambient background, navigation, save indicator, button system, and transitions are defined at the top of `index.html`. fileciteturn41file0L10-L37
- View transitions, tactile button states, progress bars, lesson layout, lesson nav, coach notes, framework buckets, and embedded quiz styling are defined in the CSS. fileciteturn42file0L3-L17 fileciteturn42file0L19-L37 fileciteturn42file0L55-L64 fileciteturn42file0L113-L145
- Drill workspace, selectable phrase styling, indicator-word tooltip parsing, step controls, choice buttons, feedback panels, and flashcards are defined in the middle of the file. fileciteturn43file0L28-L58 fileciteturn43file0L59-L89
- Lesson content includes pop quizzes, a four-bucket role framework, referential language work, and a practice-arena transition. fileciteturn44file0L3-L17 fileciteturn44file0L20-L47 fileciteturn44file0L49-L95
- The app persists progress through a storage manager and tracks lesson sections, drills, flashcards, quiz states, and the last learning view. fileciteturn45file0L5-L35 fileciteturn45file0L41-L51
- The drill data model stores each stimulus as parts with role flags, including conclusion, support, opposing, and neutral. fileciteturn46file0L148-L153
- The drill state machine asks the student to select the conclusion, classify structure, select support or opposing material, then submit. fileciteturn49file0L42-L67
- The model reveal recolors the stimulus roles and shows a feedback panel. fileciteturn48file0L44-L96
- Hover states are wrapped for non-touch devices and the mobile layout converts complex panes into stacked or horizontal scrolling surfaces. fileciteturn50file0L49-L70 fileciteturn50file0L72-L101

---

## Current LSAT U target area

Use these current LSAT U files as the first integration target:

```text
src/bootcamps/main-conclusion/modules/lessons/notes/IntroLessonPage.tsx
src/bootcamps/main-conclusion/modules/lessons/notes/IntroNotesShell.tsx
src/bootcamps/main-conclusion/modules/lessons/notes/NoteInteractions.tsx
src/bootcamps/main-conclusion/content/introToLrPath.ts
```

The first Intro to LR Bootcamp pages are:

1. Page 1: How to Read an LR Stimulus
2. Page 2: The Three Parts of an LR Question
3. Page 3: So, An Argument
4. Page 4: Premises
5. Page 5: Conclusions
6. Page 6: Five Types of Conclusions
7. Page 7: Beyond Premises and Conclusions
8. Page 8: The 2-Part Conclusion Check

Integration principle:

> Do not rebuild the whole shell first. Keep the existing route and shell. Add reusable interactive reasoning components inside the lesson content.

---

# Executive decision

## The top feature to implement from structuredrill

### Full Stimulus Role Lab

This should be the first major adoption from `structuredrill`.

Structuredrill's best mechanic is its staged argument dissection flow:

1. Student selects the main conclusion.
2. Student classifies the argument structure.
3. Student selects supporting material or opposing material.
4. Student submits.
5. The model map reveals the correct roles.

This is the exact behavior Intro to LR needs, especially on Page 7, where the lesson currently teaches multiple roles that are easy to flatten into repeated explanation cards.

LSAT U version:

```text
Step 1: Select the author's main conclusion.
Step 2: Classify the stimulus structure.
Step 3: Label one key sentence role.
Step 4: Submit.
Step 5: Reveal the full model role map.
```

Use this first because it creates the reusable foundation for Pages 4, 5, 7, and 8.

---

# Feature inventory and integration plan

## 1. Staged Argument Dissection Flow

### Source behavior

Structuredrill runs the drill through a clear state machine:

- Step 1: select the main conclusion.
- Step 2: classify the structure as first-sentence or rebuttal.
- Step 3: select support or opposing viewpoint.
- Submit and reveal the map.

The controls are rendered based on `drillState.step`. fileciteturn49file0L42-L67

### LSAT U adoption

Build a reusable staged lesson lab called:

```text
StructuredRoleLab
```

It should support:

- click a sentence or phrase
- choose a role or structure type
- lock reveal until the student commits
- reveal the model answer after submit
- show a compact coach note

### First Intro to LR placement

Primary:

```text
Page 7: Beyond Premises and Conclusions
```

Secondary reuse:

```text
Page 4: Premises
Page 5: Conclusions
Page 8: The 2-Part Conclusion Check
```

### LSAT U version

For Page 7:

```text
Step 1: Click the author's conclusion.
Step 2: Choose the structure type.
Options: simple support, rebuttal, concession-pivot, background-heavy.
Step 3: Label one sentence as background, opposing view, concession, premise, or conclusion.
Step 4: Submit.
Step 5: Reveal full role map.
```

### Build now or archive

Build now.

### Priority

P0.

---

## 2. Clickable Stimulus Segmentation

### Source behavior

Structuredrill stores each stimulus as role-bearing parts and renders each part as a clickable phrase. fileciteturn49file0L23-L35

The data model uses role flags:

```text
isC = conclusion
isS = support
isO = opposing viewpoint
isN = neutral information
```

Examples of these flags appear in the drill data. fileciteturn46file0L148-L153

### LSAT U adoption

Create a reusable stimulus rendering primitive:

```text
StructuredStimulusText
SentenceSegmentButton
```

Each segment should support:

- id
- text
- role
- indicator metadata
- selectable state
- selected role
- model role
- explanation

### First Intro to LR placement

Use in:

```text
Page 4: Premises
Page 5: Conclusions
Page 7: Beyond Premises and Conclusions
Page 8: The 2-Part Conclusion Check
```

### LSAT U visual treatment

Do not copy structuredrill's full background-fill highlight style. Use restrained structure ink:

| Role | Treatment |
|---|---|
| Conclusion | thin green underline, role chip on reveal |
| Premise | thin blue underline, role chip on reveal |
| Opposing view | thin violet underline, role chip on reveal |
| Concession | thin amber bracket, small chip |
| Pivot | amber bracket or dotted underline |
| Background | thin gray underline, lower visual weight |

### Build now or archive

Build now.

### Priority

P0.

---

## 3. Indicator Word Parser

### Source behavior

Structuredrill marks indicator words inline with custom syntax like:

```text
<i-w t="Premise Indicator">because</i-w>
```

Then `parseIndicators()` converts the custom markup into styled indicator spans with role labels and colors. fileciteturn47file0L94-L102

### LSAT U adoption

Create a reusable component:

```text
IndicatorWord
RoleInkText
```

Recommended metadata:

```text
phrase
role
function
exampleId
warning
```

Example:

```text
phrase: because
role: premise-indicator
function: introduces support
warning: find the claim this reason supports
```

### First Intro to LR placement

Use in:

```text
Page 4: Premises, for FABS and premise indicators
Page 5: Conclusions, for conclusion indicators
Page 7: Beyond Premises and Conclusions, for pivot and concession language
Page 8: 2-Part Conclusion Check, for However and attribution markers
```

### LSAT U visual treatment

Use accessible click or tap disclosure, not hover-only teaching.

States:

| State | Treatment |
|---|---|
| Idle | thin dotted underline |
| Hover | subtle tint, no popover dependency |
| Focus-visible | 2px focus ring |
| Open | margin note or inline note appears |
| Mobile | tap toggles note under the sentence |

### Build now or archive

Build now, but keep the first version simple.

### Priority

P0.

---

## 4. Embedded Micro Checkpoints

### Source behavior

Structuredrill embeds quiz blocks directly inside lesson notes. The quiz asks a short conceptual question, records the selected answer, and shows immediate feedback. fileciteturn44file0L3-L17

### LSAT U adoption

Rename this pattern:

```text
MicroCheckpoint
```

Avoid the phrase “Pop Quiz.” It feels lower-end and school-like.

### First Intro to LR placement

Use exactly one micro-checkpoint on these pages:

| Page | Micro-checkpoint |
|---|---|
| Page 1 | Which sentence is the author trying to prove? |
| Page 4 | Which statement actually supports the conclusion? |
| Page 5 | Which sentence is a conclusion rather than a fact? |
| Page 6 | What type of conclusion is this? |
| Page 8 | Does this claim pass both checks? |

### LSAT U visual treatment

Use tactile answer rows:

| State | Treatment |
|---|---|
| Idle | paper surface, 1px border |
| Hover | 1px border darkens, translateY(-1px) |
| Selected | subtle active tint, no correctness yet |
| Submitted correct | compact success note |
| Submitted incorrect | amber correction note, no harsh red flood |
| Completed | checkpoint collapses into a small result chip |

### Build now or archive

Build now, but only after the role lab component exists.

### Priority

P0.

---

## 5. Role Framework Buckets

### Source behavior

Structuredrill teaches a role framework with four buckets:

- Main Conclusion
- Support
- Opposing Viewpoint
- Neutral Info

The framework appears as four visual buckets. fileciteturn44file0L20-L29

### LSAT U adoption

Use the concept, not the exact bucket grid.

LSAT U should expand the framework into a richer role tray:

```text
Background
Opposing View
Opposing Support
Concession
Pivot
Premise
Intermediate Conclusion
Main Conclusion
```

### First Intro to LR placement

Primary:

```text
Page 7: Beyond Premises and Conclusions
```

Secondary:

```text
Page 6: Five Types of Conclusions
```

### LSAT U visual treatment

Make it a horizontal or sticky role tray, not a static card grid.

Desktop:

```text
Role tray sits above or beside the active stimulus.
```

Mobile:

```text
Role tray becomes horizontal scroll chips above the stimulus.
```

### Build now or archive

Build now for Page 7.

### Priority

P0.

---

## 6. Feedback Panel With Model Map Reveal

### Source behavior

After submission, structuredrill disables phrase selection, applies the correct role classes, and shows a feedback panel labeled either “Perfect Dissection” or “Review the Map.” fileciteturn48file0L44-L88

### LSAT U adoption

Create:

```text
ModelMapReveal
CoachFeedbackPanel
```

### First Intro to LR placement

Use after submissions on:

```text
Page 4: Premise Support Sorter
Page 5: Conclusion Candidate Tester
Page 7: Full Stimulus Role Lab
Page 8: 2-Part Check Machine
```

### LSAT U version

Instead of “Perfect Dissection,” use restrained language:

```text
Model structure
Your pick
What the model sees
Joshua note
```

### State treatment

| State | Treatment |
|---|---|
| Pre-submit | hidden |
| Submitted | fade in 160ms to 200ms |
| Correct | subtle success chip, no large green block |
| Incorrect | amber correction chip, no harsh red panel |
| Model reveal | role underlines and chips appear in the stimulus |

### Build now or archive

Build now.

### Priority

P0.

---

## 7. Tactile Choice Buttons

### Source behavior

Structuredrill uses large choice buttons for structure classification, with selected state and hover lift. fileciteturn49file0L51-L56

### LSAT U adoption

Create a shared primitive:

```text
TactileChoiceRow
TactileChoiceGrid
```

### First Intro to LR placement

Use in:

```text
Page 2: anatomy scanner region choices
Page 4: supports vs does not support
Page 5: conclusion candidates
Page 6: conclusion type choices
Page 8: yes/no gates
```

### LSAT U treatment

Use rows for text-heavy choices and chips for short role selections.

Required states:

| State | Treatment |
|---|---|
| Idle | #FFFDF9 surface, #E8DED2 border |
| Hover | translateY(-1px), border #D7C8B8 |
| Focus-visible | 2px focus ring, immediate |
| Pressed | scale(.995), shadow collapse |
| Selected | active border and light tint |
| Disabled | 45 percent opacity, no lift |

### Build now or archive

Build now as shared UI.

### Priority

P0.

---

## 8. Lesson Side Navigation With Completion Indicators

### Source behavior

Structuredrill has a sticky lesson nav with active and completed states. Completed sections get a completed indicator. fileciteturn42file0L113-L126 fileciteturn46file0L103-L107

### LSAT U adoption

Do not replace LSAT U's existing path rail immediately. Use the idea later to improve `IntegratedPathRail`.

### First Intro to LR placement

Later enhancement:

```text
IntegratedPathRail
```

### LSAT U version

States should be richer than simple completion:

```text
Not started
In progress
Interaction complete
Tool unlocked
Review due
```

### Build now or archive

Archive for path rail upgrade.

### Priority

P1.

---

## 9. Resume Learning Logic

### Source behavior

Structuredrill tracks the last learning view and changes the dashboard CTA based on whether the student last used notes, drills, or flashcards. fileciteturn46file0L67-L101

### LSAT U adoption

Use this for the Bootcamp dashboard or Smart Hub later.

### First Intro to LR placement

Later enhancement:

```text
Smart Hub
Bootcamp dashboard
Intro to LR module landing page
```

### LSAT U version

Example:

```text
Resume Intro to LR
Current: Page 7, Role Sorting Lens
Next action: Complete sentence ownership lab
```

### Build now or archive

Archive for dashboard phase.

### Priority

P1.

---

## 10. Persistent Save Indicator

### Source behavior

Structuredrill shows a small “Saved” indicator after save events. The indicator becomes visible after state writes and hides after a timeout. fileciteturn45file0L162-L173

### LSAT U adoption

Use this later when interaction completion saves to Supabase.

### First Intro to LR placement

Potential placements:

```text
Dynamic Island TOC
IntroNotesShell bottom navigation
CoachDrawer footer
```

### LSAT U version

Use restrained copy:

```text
Saved
Progress saved
Attempt saved
```

### Build now or archive

Archive until Supabase persistence pass.

### Priority

P1.

---

## 11. Storage Manager and Local Fallback

### Source behavior

Structuredrill checks localStorage availability and falls back to in-memory storage if the sandbox blocks localStorage. fileciteturn45file0L5-L35

### LSAT U adoption

The idea is useful, but LSAT U should not copy this as the final persistence model.

LSAT U should use:

```text
Supabase for real progress
local component state for first visual pass
local fallback only if intentionally added later
```

### First Intro to LR placement

Not in the first pass.

### Build now or archive

Archive.

### Priority

P2.

---

## 12. Flashcard Stack and Indicator Deck

### Source behavior

Structuredrill has a visual flashcard stack with flip behavior, review controls, role badges, examples, and coach notes. fileciteturn43file0L59-L89

It also contains a large indicator-word deck covering conclusion indicators, premise indicators, pivot words, opposing-view phrases, concessions, and opinion indicators. fileciteturn48file0L111-L144

### LSAT U adoption

Strong later feature, but not the first bootcamp page upgrade.

### First Intro to LR placement

Later:

```text
Indicator Vault
Review Queue
Concept Unlock review mode
Reference cards
```

### LSAT U version

Avoid 3D flipping as the default. Use a restrained card review pattern:

```text
Front: What does “because” usually do?
Back: Introduces support. Ask what claim this reason supports.
Example: The proposal should fail because it is too expensive.
Joshua note: Do not stop at the indicator. Find the relationship.
```

### Build now or archive

Archive for review system.

### Priority

P1.5.

---

## 13. Skeleton Loading and Top Progress Bar

### Source behavior

Structuredrill has skeleton placeholders and a top progress bar during simulated loading. fileciteturn50file0L4-L10 fileciteturn45file0L126-L145

### LSAT U adoption

Use only where there is real async loading or saving.

### First Intro to LR placement

Potential later locations:

```text
Bootcamp dashboard loading
Supabase attempt save
Smart Hub
Practice loading
Review queue loading
```

### Do not use for

```text
Static note page route transitions
```

Fake loading would make the bootcamp feel slower.

### Build now or archive

Archive.

### Priority

P2.

---

## 14. Scroll Reveal Animation System

### Source behavior

Structuredrill uses an IntersectionObserver to reveal cards, quizzes, examples, drills, and flashcards as they enter the viewport. fileciteturn45file0L60-L91

CSS for the reveal system uses opacity and translateY. fileciteturn50file0L12-L22

### LSAT U adoption

Use sparingly.

The deep research report says motion should guide attention, not compete with content. This means scroll reveal can help page entry, but it should not be the primary way the page feels alive.

### First Intro to LR placement

Use only for:

```text
The central learning object entering the page
Coach drawer appearing after submit
Concept unlock card appearing after completion
```

### Motion limits

```text
Duration: 140ms to 240ms
Movement: 6px to 8px maximum
Reduced motion: opacity only
```

### Build now or archive

Use carefully in P1.

### Priority

P1.

---

## 15. Toast Feedback

### Source behavior

Structuredrill has bottom-center toast messages with icons and enter/exit animation. fileciteturn50file0L28-L41

### LSAT U adoption

Useful for save events and completion events, but should not replace inline feedback.

### First Intro to LR placement

Potential locations:

```text
Concept card unlocked
Progress saved
Attempt saved
Lesson completed
```

### LSAT U rule

For instructional correctness, use inline coach feedback. Toasts are only for system feedback.

### Build now or archive

Archive for persistence and completion feedback.

### Priority

P2.

---

## 16. Inline Errors

### Source behavior

Structuredrill has inline error states for form validation. fileciteturn50file0L37-L38

### LSAT U adoption

Useful for typed responses and required commit states.

### First Intro to LR placement

Use when a student tries to reveal before acting:

```text
Choose a sentence first.
Select a role before submitting.
Answer both gates before reveal.
```

### LSAT U treatment

Do not use harsh red for learning errors. Use amber for incomplete instructional state.

### Build now or archive

Build now as part of `CommitBeforeRevealGate`.

### Priority

P0.

---

## 17. Empty State

### Source behavior

Structuredrill shows an “All Drills Completed” empty state when all drills are completed. fileciteturn44file0L110-L117

### LSAT U adoption

Good for future review queues and drill sets.

### First Intro to LR placement

Potential later locations:

```text
Review queue
Practice set complete
Bootcamp module complete
Indicator deck complete
```

### Build now or archive

Archive.

### Priority

P2.

---

## 18. Responsive Lesson Nav Conversion

### Source behavior

On mobile, structuredrill collapses the lesson layout from two columns into a single column and converts the lesson nav into a horizontal scroll strip. fileciteturn50file0L72-L101

### LSAT U adoption

This is useful for mobile Intro to LR pages.

### First Intro to LR placement

Later enhancement:

```text
IntroNotesShell
IntegratedPathRail
DynamicIslandTOC
CoachDrawer
```

### LSAT U version

Desktop:

```text
left rail + center lab + right coach note
```

Mobile:

```text
horizontal progress chips + center lab + coach note as bottom sheet or inline panel
```

### Build now or archive

Archive for responsive pass.

### Priority

P1.

---

## 19. Dashboard Next Best Action

### Source behavior

Structuredrill's dashboard has a “Next Best Action” card that changes based on saved state. fileciteturn50file0L153-L165

### LSAT U adoption

This is good for the Smart Hub, not for the first note-page pass.

### First Intro to LR placement

Later:

```text
Smart Hub
Bootcamp dashboard
Student foyer
```

### LSAT U version

```text
Next: Finish Page 7 Role Sorting Lens
Reason: You started the role lab but have not revealed the model map.
```

### Build now or archive

Archive.

### Priority

P2.

---

## 20. Framework Example Breakdown Steps

### Source behavior

Structuredrill uses example cards with numbered breakdown steps and small circular step icons. fileciteturn43file0L15-L23

It uses this for referential language and conclusion translation. fileciteturn44file0L49-L86

### LSAT U adoption

Useful for Page 8 and future hard sentence labs.

### First Intro to LR placement

Use in:

```text
Page 8: 2-Part Conclusion Check
Page 7: Role Lab model reveal
Page 5: Conclusion Candidate Tester
```

### LSAT U version

Use numbered steps only after the student attempts:

```text
1. Claim belongs to author.
2. Claim is supported by another statement.
3. Therefore, it passes as the main conclusion.
```

### Build now or archive

Build now as part of Page 8.

### Priority

P0.

---

# Page-by-page integration map for first Intro to LR Bootcamp

## Page 1: How to Read an LR Stimulus

### Integrate

- MicroCheckpoint
- Tactile sentence rows
- Active reading lens
- Inline incomplete-state feedback

### Structuredrill source inspiration

- Embedded pop quiz pattern
- Tactile answer rows
- Coach note

### Proposed feature

```text
Active Reading Lens
```

Student sees a short stimulus and must click the sentence the author is trying to prove before the model explanation appears.

### Build status

Archive for second pass. Page 7 and Page 8 are higher leverage first.

---

## Page 2: The Three Parts of an LR Question

### Integrate

- Tactile choice rows
- Step badges
- Guided spotlight flow
- Status prompt
- Margin tutor note

### Structuredrill source inspiration

- Step-based controls
- Tactile buttons
- Feedback panel

### Proposed feature

```text
Question Anatomy Scanner
```

Student clicks stimulus, question stem, and answer choices in order.

### Build status

Build now or immediately after Page 7.

---

## Page 3: So, An Argument

### Integrate

- Feedback panel
- Step reveal
- Tactile selected state
- Coach note

### Structuredrill source inspiration

- Model reveal
- Coach note
- Tactile state system

### Proposed feature

```text
Argument Support Physics
```

Replace low-quality static diagram moments with a conclusion tile, premise blocks, and support-beam reveal.

### Build status

Build after Page 2 or Page 7.

---

## Page 4: Premises

### Integrate

- Clickable stimulus segmentation
- Tactile choice rows
- Indicator parser
- MicroCheckpoint
- Model map reveal

### Structuredrill source inspiration

- Selectable phrase system
- Indicator-word parsing
- Step-based drill flow

### Proposed feature

```text
Premise Support Sorter
```

Student sees a conclusion and sorts sentences into support, not support, or need more context.

### Build status

Build after shared primitives exist.

---

## Page 5: Conclusions

### Integrate

- Clickable candidate sentences
- MicroCheckpoint
- Indicator parser
- Feedback panel

### Structuredrill source inspiration

- Select conclusion step
- Author opinion pop quiz
- Feedback panel

### Proposed feature

```text
Conclusion Candidate Tester
```

Student clicks the sentence they think is the conclusion, then answers whether it is the author's claim and whether it is supported.

### Build status

Build after Page 7 and Page 8.

---

## Page 6: Five Types of Conclusions

### Integrate

- Tactile choice rows
- Role buckets
- MicroCheckpoint
- Concept cards

### Structuredrill source inspiration

- Framework buckets
- Flashcard role deck
- Tactile selected state

### Proposed feature

```text
Conclusion Type Switchboard
```

Student classifies a conclusion as recommendation, causal hypothesis, prediction, judgment, or rebuttal before reveal.

### Build status

Archive for later within this bootcamp. Useful, but not first.

---

## Page 7: Beyond Premises and Conclusions

### Integrate

- Full staged argument dissection flow
- Clickable stimulus segmentation
- Role tray
- Indicator parser
- Model map reveal
- Coach feedback panel
- Tactile sentence rows

### Structuredrill source inspiration

- This is the direct match.
- Select conclusion, classify structure, select support or opposition, reveal map.

### Proposed feature

```text
Full Stimulus Role Lab
```

This is the first feature to implement from structuredrill.

### Build status

Build first.

---

## Page 8: The 2-Part Conclusion Check

### Integrate

- Clickable claim segmentation
- Step gates
- Tactile yes/no choices
- Model map reveal
- Breakdown steps
- Coach feedback panel

### Structuredrill source inspiration

- Step-based drill flow
- Select conclusion
- Feedback panel
- Role map reveal

### Proposed feature

```text
2-Part Check Machine
```

Student runs Claim A, Claim B, and Claim C through two gates:

```text
Gate 1: Is this the author's own opinion?
Gate 2: Is this supported by another statement?
```

### Build status

Build second after Page 7 or in same phase if scope allows.

---

# Active implementation package

## Components to create

Place these in:

```text
src/bootcamps/main-conclusion/modules/lessons/notes/components/
```

Create:

```text
StructuredStimulusText.tsx
SentenceSegmentButton.tsx
RoleChipTray.tsx
StepPromptBar.tsx
MicroCheckpoint.tsx
ModelMapReveal.tsx
CoachFeedbackPanel.tsx
IndicatorWord.tsx
CommitBeforeRevealGate.tsx
```

Optional later:

```text
ConceptUnlockCard.tsx
LessonStatusToast.tsx
ProgressSaveIndicator.tsx
ReviewFlashcard.tsx
```

---

## First implementation target

```text
Page 7: Beyond Premises and Conclusions
```

### Why this page first

Page 7 has the highest flatness risk because it teaches many roles through repeated explanations. Structuredrill's exact strength is role-based argument dissection. This page is where the prototype's mechanic will make the biggest difference.

### Feature name

```text
Full Stimulus Role Lab
```

### Student flow

```text
Step 1: Select the author's main conclusion.
Step 2: Classify the stimulus structure.
Step 3: Label one key sentence role.
Step 4: Submit.
Step 5: Reveal full model structure.
```

### Role tray

```text
Background
Opposing View
Opposing Support
Concession
Pivot
Premise
Intermediate Conclusion
Main Conclusion
```

### Visual states

| State | Treatment |
|---|---|
| Idle sentence | paper surface, 1px line, normal ink |
| Hover sentence | translateY(-1px), border darkens |
| Selected conclusion | thin conclusion underline, selected chip |
| Selected support | thin premise underline, selected chip |
| Selected opposing | thin opposing underline, selected chip |
| Submitted model | all model roles appear with chips and underlines |
| Wrong or incomplete | amber correction chip, no harsh red panel |

### Coach feedback content

After submit:

```text
Your pick
Model structure
Why this role matters
Joshua note
Next move
```

---

# Archive of features for later phases

## Archive: Smart Hub and dashboard

Use later:

- resume learning logic
- next best action card
- progress cards
- completed nav indicators
- save status

Target locations:

```text
Smart Hub
Bootcamp dashboard
Student foyer
IntegratedPathRail
```

## Archive: review system

Use later:

- flashcard stack concept
- indicator deck content model
- review again / got it controls
- concept unlock cards
- spaced review queue

Target locations:

```text
Indicator Vault
Review Queue
Reference Vault
Concept cards
```

## Archive: async and loading polish

Use later:

- skeleton screens
- top loading bar
- empty states
- toasts

Target locations:

```text
Supabase save states
Practice loading
Review queue loading
Messaging and inbox loading
```

## Archive: shell and responsive polish

Use later:

- sticky lesson nav completion indicators
- mobile horizontal rail conversion
- restrained scroll reveal
- route continuity

Target locations:

```text
IntroNotesShell
IntegratedPathRail
DynamicIslandTOC
CoachDrawer
```

---

# What to avoid copying

Do not copy these visual choices directly from structuredrill:

- constant ambient background drift
- floating login card
- shimmer progress bars on static surfaces
- gradient-shifting action cards
- constantly pulsing coach icons
- heavy red and green correctness fills
- 3D flashcard flip as default learning UX
- fake loading for static routes

Reason:

The Intro to LR Bootcamp should feel alive through instructional state changes, not decorative motion.

Use:

- click states
- role underlines
- bracket labels
- dimming irrelevant material
- staged prompts
- model reveal
- compact coach feedback

---

# Implementation prompt for Lovable or Claude Code

```text
Inspect the current Intro to LR Bootcamp implementation before editing.

Files to inspect:
- src/bootcamps/main-conclusion/modules/lessons/notes/IntroLessonPage.tsx
- src/bootcamps/main-conclusion/modules/lessons/notes/IntroNotesShell.tsx
- src/bootcamps/main-conclusion/modules/lessons/notes/NoteInteractions.tsx
- src/bootcamps/main-conclusion/content/introToLrPath.ts

Reference inspiration:
- structuredrill repo: https://github.com/vnjkoxpl-42905/structuredrill
- Focus on the argument dissection flow, clickable phrase segmentation, role metadata, step controls, model reveal, micro-checkpoints, and tactile choice rows.
- Do not copy the exact visual skin, animation style, color palette, or single-file architecture.

Root problem:
The Intro to LR Bootcamp currently feels too much like polished lecture notes. Page 7 especially needs to become an interactive reasoning lab where the student clicks the stimulus, commits to role labels, and sees the model structure reveal after submission.

Before implementing, briefly confirm:
1. Where Page 7, “Beyond Premises and Conclusions,” is rendered in IntroLessonPage.tsx.
2. Which existing note interaction components can be reused from NoteInteractions.tsx.
3. Whether the current page already has XRayExample, GridCard, or role-related content that should be wrapped rather than deleted.
4. Where new reusable note components should live under modules/lessons/notes/components.

Implementation spec:
Create a reusable Full Stimulus Role Lab for Page 7.

Add these components:
- StructuredStimulusText.tsx
- SentenceSegmentButton.tsx
- RoleChipTray.tsx
- StepPromptBar.tsx
- ModelMapReveal.tsx
- CoachFeedbackPanel.tsx
- IndicatorWord.tsx
- CommitBeforeRevealGate.tsx

Apply the first version only to Page 7.
Do not redesign the whole bootcamp shell.
Do not change routing.
Do not change the drill system.
Do not add Supabase persistence in this pass.

Student flow for Page 7:
1. Student sees one full stimulus split into sentence rows.
2. Step 1 asks the student to select the author’s main conclusion.
3. Step 2 asks the student to classify the structure: simple support, rebuttal, concession-pivot, or background-heavy.
4. Step 3 asks the student to label one key sentence role using a role tray.
5. Submit stays disabled until required selections are complete.
6. After submit, reveal the model map over the same stimulus.
7. Show a compact coach feedback panel with Your pick, Model structure, Why this matters, Joshua note, and Next move.

Role tray options:
- Background
- Opposing View
- Opposing Support
- Concession
- Pivot
- Premise
- Intermediate Conclusion
- Main Conclusion

Visual/state treatment:
- Idle sentence row: #FFFDF9 surface, 1px #E8DED2 border, 16px body text, 26px line height.
- Hover on pointer devices only: translateY(-1px), border #D7C8B8, shadow step up one tier.
- Focus-visible: 2px focus ring, immediate, no delayed animation.
- Selected sentence: subtle active tint, 3px left role rail, selected chip.
- Model conclusion: thin green underline plus role chip.
- Model premise: thin blue underline plus role chip.
- Model opposing view: thin violet underline plus role chip.
- Model concession or pivot: thin amber bracket or dotted underline plus role chip.
- Model background: thin gray underline and lower visual weight.
- Incomplete submit attempt: amber inline message saying what selection is missing.
- Do not use harsh red for learning mistakes.
- Do not use large highlighter blocks.
- Do not use confetti, neon gradients, or constant movement.

Accessibility:
- Use real button elements for sentence rows and role chips.
- Use aria-current="step" on the current step chip.
- Use aria-pressed only for genuine selected toggle state.
- Use aria-live="polite" for the status prompt.
- All interactions must work with keyboard only.
- Reduced motion must remove translation and use opacity or instant state changes only.

Acceptance:
- Page 7 contains a visible interactive role lab, not only repeated explanatory cards.
- Student cannot reveal the full model structure before making the required selections.
- Submit is disabled until Step 1, Step 2, and Step 3 are complete.
- The model reveal appears on the same stimulus, not in a detached answer block.
- Role colors and labels are visible without relying on color alone.
- Existing first 8 note routes still work.
- Page 7 remains readable on mobile, with the role tray becoming horizontally scrollable above the stimulus.
- No Supabase writes are added in this pass.

Risk controls:
- Keep all new state local to the Page 7 component for now.
- Do not delete the existing Page 7 teaching content wholesale. Replace the repeated passive card area with the lab, and keep essential explanations as compact coach notes or post-submit reveal content.
- Do not import structuredrill HTML, CSS, or JS directly.
- Do not copy fake loading, ambient background drift, shimmer progress, or 3D flip behavior.

Suggested commit message:
feat(intro-lr): add structured role lab to page seven
```

---

# Final priority list

## Build now

1. Full Stimulus Role Lab for Page 7
2. Clickable stimulus segmentation primitive
3. Role chip tray
4. Step prompt bar
5. Model map reveal
6. Coach feedback panel
7. Indicator word primitive
8. Commit-before-reveal gate
9. Tactile choice row primitive
10. MicroCheckpoint primitive

## Build next in this bootcamp

1. Page 8, 2-Part Check Machine
2. Page 2, Question Anatomy Scanner
3. Page 4, Premise Support Sorter
4. Page 5, Conclusion Candidate Tester
5. Page 6, Conclusion Type Switchboard
6. Page 1, Active Reading Lens

## Archive for later

1. Resume dashboard logic
2. Progress save indicator
3. Supabase persistence for note interactions
4. Indicator flashcard deck
5. Review queue integration
6. Smart Hub next best action card
7. Skeleton loading states for real async surfaces
8. Toast system for system feedback only
9. Responsive path rail upgrade
10. Concept unlock cards and spaced review
