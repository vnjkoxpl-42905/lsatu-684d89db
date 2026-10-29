# Prototype to LSAT U Placement Map

This report maps the inspected prototype drills and lesson apps onto LSAT U's existing Intro to LR surfaces. It is a review-first planning artifact only. No LSAT U drill or lesson implementation is included here.

The source review below is grounded in raw GitHub files where available plus live Netlify behavior. The goal is to copy interaction mechanics, drill structure, pacing, reveal logic, and student workflow while keeping LSAT U's current warm/light bootcamp style and preserving its routing, unlocks, and data model.

## 1. Prototype Source Map

### Placement Summary

| Prototype | Source repo | Netlify | Source file inspected | Dataset vars | Q count | Flashcards | Best LSAT U target | Match |
| --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| `structuredrill` | [vnjkoxpl-42905/structuredrill](https://github.com/vnjkoxpl-42905/structuredrill) | [structuredrill.netlify.app](https://structuredrill.netlify.app) | raw `index.html` | `drillsData`, `flashcardsData`, `DEFAULT_STATE`, `appState`, `drillState` | 20 | 33 | simulator bank, canonical `3.4` path | exact-match |
| `introconclusiondrill` | [vnjkoxpl-42905/introconclusiondrill](https://github.com/vnjkoxpl-42905/introconclusiondrill) | [introconclusiondrill.netlify.app](https://introconclusiondrill.netlify.app) | raw `index.html` | `data` | 20 | 0 | `3.2` exact, `3.3` partial | exact / partial |
| `arguments` / `argumentslr` | [vnjkoxpl-42905/arguments](https://github.com/vnjkoxpl-42905/arguments) | [argumentslr.netlify.app](https://argumentslr.netlify.app) | raw `index.html` | `SECTIONS`, `REBUTTAL_BANK`, `INTERACTIVE_BANK`, `scenarios`, `fabs` | 10 in `INTERACTIVE_BANK` | 0 | lesson checkpoints, embedded X-Ray blocks | partial-match |
| `logicalreasoningfoundation` | none provided in repo list | [logicalreasoningfoundation.netlify.app](https://logicalreasoningfoundation.netlify.app) | live site only | none inspectable from supplied raw source set | n/a | 0 | lesson pacing and embedded checkpoint inspiration | inspiration-only |
| `mainconclusion.netlify.app` | no separate repo supplied in prompt | [mainconclusion.netlify.app](https://mainconclusion.netlify.app) | live HTML | `questions` | 20 | 0 | `3.2` interaction inspiration | partial-match |
| `mainconclusionrebuttalvsfirst.netlify.app` | no separate repo supplied in prompt | [mainconclusionrebuttalvsfirst.netlify.app](https://mainconclusionrebuttalvsfirst.netlify.app) | live HTML | `hwData`, `sessionData` | 20 total refs across 4 stages | 0 | `3.3` and `3.4` stage/protocol inspiration | partial-match |
| `MAINCONCLUSION-ROLE` | [vnjkoxpl-42905/MAINCONCLUSION-ROLE](https://github.com/vnjkoxpl-42905/MAINCONCLUSION-ROLE) | not treated as source of the two Netlify drills above | raw `index.html`, `README.md`, `package.json`, `src/main.tsx`, `src/App.tsx` | modular React app, no single-file drill dataset confirmed from inspected files | n/a | 0 | none as direct model | inspiration-only / mismatch |

### `structuredrill`

- Source repo: [vnjkoxpl-42905/structuredrill](https://github.com/vnjkoxpl-42905/structuredrill)
- Netlify URL: [structuredrill.netlify.app](https://structuredrill.netlify.app)
- Source file inspected: raw [`index.html`](https://raw.githubusercontent.com/vnjkoxpl-42905/structuredrill/main/index.html)
- Dataset variable names:
  - `drillsData`
  - `flashcardsData`
  - `DEFAULT_STATE`
  - `appState`
  - `drillState`
- Question count: 20
- Flashcard count: 33
- Data shape:
  - drill item: `{ id, type, parts, feedback }`
  - `type`: `'first' | 'rebuttal'`
  - `parts[]`: `{ id, text, isC?, isS?, isO?, isN? }`
  - flashcard: `{ front, role, function, example, note }`
- Correctness fields:
  - `isC`
  - `isS`
  - `isO`
  - `isN`
- Role-map fields:
  - `parts[].isC` -> conclusion
  - `parts[].isS` -> support
  - `parts[].isO` -> opposing view
  - `parts[].isN` -> neutral/background
- Hint / breakdown / explanation fields:
  - `feedback` on each drill item
  - flashcard `function`, `example`, `note`
- Interaction flow:
  - start from dashboard or drills surface
  - show start-like drill intro
  - click conclusion
  - classify family (`first` or `rebuttal`)
  - click support or opposing follow-up based on family
  - submit
  - reveal full role map with feedback
  - continue to next unresolved question
  - finish with completion summary
- UI mechanics worth copying:
  - start card
  - progress header
  - segmented/clickable stimulus parts
  - conclusion selection
  - family classification
  - support/opposing follow-up
  - submit
  - full role-map reveal
  - next-question flow
  - completion summary
- Best LSAT U target surface:
  - `/bootcamp/intro-to-lr/simulator/bank`
  - Drill `3.4`, especially final/canonical stage
  - likely implementation landing surfaces:
    - [StructuredDissectionLab.tsx](/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/src/bootcamps/main-conclusion/components/structured-dissection/StructuredDissectionLab.tsx)
    - [Drill3_4.tsx](/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/src/bootcamps/main-conclusion/modules/drills/Drill3_4.tsx)
- Match level: exact-match

### `introconclusiondrill`

- Source repo: [vnjkoxpl-42905/introconclusiondrill](https://github.com/vnjkoxpl-42905/introconclusiondrill)
- Netlify URL: [introconclusiondrill.netlify.app](https://introconclusiondrill.netlify.app)
- Source file inspected: raw [`index.html`](https://raw.githubusercontent.com/vnjkoxpl-42905/introconclusiondrill/main/index.html)
- Dataset variable names:
  - `data`
- Question count: 20
- Flashcard count: 0
- Data shape:
  - `{ sentences: string[], ans: number, roles: string[], breakdown: string, hint: string }`
- Correctness fields:
  - `ans`
- Role-map fields:
  - `roles[]` values such as `premise`, `conclusion`, `opposing`
- Hint / breakdown / explanation fields:
  - `hint`
  - `breakdown`
- Interaction flow:
  - initialize lab
  - read one paragraph rendered sentence-by-sentence
  - click a sentence
  - submit/analyze
  - if wrong, show targeted hint and reset selection
  - if correct, reveal role colors and breakdown panel
  - continue to next item
- UI mechanics worth copying:
  - sentence-level clickable selection
  - submit disabled until user selects
  - wrong answer -> targeted hint
  - correct answer -> sentence role reveal
  - breakdown panel
  - compact progress flow
  - clean next-question pacing
- Best LSAT U target surface:
  - `/bootcamp/intro-to-lr/drills/3.2`
  - `/bootcamp/intro-to-lr/drills/3.3`
- Match level:
  - `3.2`: exact-match
  - `3.3`: partial-match, because LSAT U must add the first-sentence classification step after conclusion selection

### `arguments` / `argumentslr`

- Source repo: [vnjkoxpl-42905/arguments](https://github.com/vnjkoxpl-42905/arguments)
- Netlify URL: [argumentslr.netlify.app](https://argumentslr.netlify.app)
- Source file inspected: raw [`index.html`](https://raw.githubusercontent.com/vnjkoxpl-42905/arguments/main/index.html)
- Dataset variable names:
  - `SECTIONS`
  - `REBUTTAL_BANK`
  - `INTERACTIVE_BANK`
  - `scenarios`
  - `fabs`
- Question count:
  - `INTERACTIVE_BANK`: 10
  - `REBUTTAL_BANK`: 3
- Flashcard count: 0
- Data shape:
  - `INTERACTIVE_BANK`: `{ id, sentences: { text, role }[], explanation }`
  - `REBUTTAL_BANK`: prompt-like item with answer options using `isCorrect` and `feedback`
- Correctness fields:
  - `isCorrect` on answer choices in rebuttal bank
- Role-map fields:
  - sentence roles include `"Main Conclusion"`, `"Premise"`, `"Trap"`, `"Neutral"`
- Hint / breakdown / explanation fields:
  - choice `feedback`
  - `INTERACTIVE_BANK.explanation`
  - module-local explanatory copy in `scenarios` and other note sections
- Interaction flow:
  - move through guided modules
  - inspect concepts visually
  - use embedded simulator block
  - click conclusion in a short stimulus
  - reveal explanation and non-conclusion roles
- UI mechanics worth copying:
  - guided discovery pacing
  - embedded checkpoints instead of a separate route
  - lightweight X-Ray blocks inside a lesson flow
  - click-to-identify conclusion as an inline lesson exercise
- Best LSAT U target surface:
  - argument-basics lesson checkpoints
  - embedded X-Ray blocks inside lessons
  - not a dedicated drill route unless later data review proves it should be
- Match level: partial-match

### `logicalreasoningfoundation`

- Netlify inspected: [logicalreasoningfoundation.netlify.app](https://logicalreasoningfoundation.netlify.app)
- Raw source available from supplied repo list: none
- Usable findings from live inspection:
  - strong lesson sequencing
  - clear anatomy / stimulus / stem / answers teaching blocks
  - X-Ray example presentation
  - protocol-oriented lesson progression
- Best LSAT U target surface:
  - lesson pacing
  - embedded checkpoint inspiration only
- Match level: inspiration-only

### `mainconclusion.netlify.app`

- Netlify inspected: [mainconclusion.netlify.app](https://mainconclusion.netlify.app)
- Raw source provided in prompt: none beyond live site
- Dataset variable names:
  - `questions`
- Question count: 20
- Flashcard count: 0
- Data shape:
  - `{ chunks: string[], ans: number, kws: string[], hint: string }`
- Correctness fields:
  - `ans`
- Role-map fields:
  - no full explicit role map in the inspected live dataset
  - `kws` acts as pivot-clue support rather than a full role taxonomy
- Hint / breakdown / explanation fields:
  - `hint`
- Interaction flow:
  - initialize drill
  - click one text chunk
  - analyze selection
  - if wrong, highlight pivot clues from `kws`
  - if correct, advance to next question
- UI mechanics worth copying:
  - chunk-based click target
  - Analyze button
  - wrong-answer clue highlighting
  - brisk next-question cadence
- Best LSAT U target surface:
  - `3.2` inspiration, especially the wrong-answer clue behavior
- Match level: partial-match

### `mainconclusionrebuttalvsfirst.netlify.app`

- Netlify inspected: [mainconclusionrebuttalvsfirst.netlify.app](https://mainconclusionrebuttalvsfirst.netlify.app)
- Raw source provided in prompt: none beyond live site
- Dataset variable names:
  - `hwData`
  - `sessionData`
- Question count:
  - 4 stages x 5 question references = 20 referenced PT/sec/question items
- Flashcard count: 0
- Data shape:
  - `hwData[stage] = { pt, sec, q }[]`
  - `sessionData[stage] = { answers, graded, score }`
  - stored answer shape includes `type`, `reason`, `restate`, `grade`
- Correctness fields:
  - per-item self-grade stored in `grade`
  - stage score threshold `4/5` unlocks next stage
- Role-map fields:
  - explicit conclusion-type classification: `First Sentence` vs `Rebuttal`
- Hint / breakdown / explanation fields:
  - protocol cards
  - rule synopsis
  - indicator vault
  - stage descriptions
- Interaction flow:
  - intro briefing
  - stage navigation
  - classify each item as First Sentence or Rebuttal
  - write reason
  - restate conclusion with pronouns unpacked
  - self-grade against key
  - score stage
  - unlock next stage if threshold met
- UI mechanics worth copying:
  - staged progression
  - explicit First Sentence vs Rebuttal framing
  - unlock pacing
  - protocol-first onboarding
- Best LSAT U target surface:
  - Drill `3.3`
  - Drill `3.4`
- Match level: partial-match

### `MAINCONCLUSION-ROLE` repo

- Source repo: [vnjkoxpl-42905/MAINCONCLUSION-ROLE](https://github.com/vnjkoxpl-42905/MAINCONCLUSION-ROLE)
- Source files inspected:
  - raw [`index.html`](https://raw.githubusercontent.com/vnjkoxpl-42905/MAINCONCLUSION-ROLE/main/index.html)
  - raw [`README.md`](https://raw.githubusercontent.com/vnjkoxpl-42905/MAINCONCLUSION-ROLE/main/README.md)
  - raw [`package.json`](https://raw.githubusercontent.com/vnjkoxpl-42905/MAINCONCLUSION-ROLE/main/package.json)
  - raw [`src/main.tsx`](https://raw.githubusercontent.com/vnjkoxpl-42905/MAINCONCLUSION-ROLE/main/src/main.tsx)
  - raw [`src/App.tsx`](https://raw.githubusercontent.com/vnjkoxpl-42905/MAINCONCLUSION-ROLE/main/src/App.tsx)
- File-tree evidence observed:
  - repo exposes `src/`
  - repo includes Vite / React app files like `package.json`, `vite.config.ts`, `src/App.tsx`
  - this differs materially from the single-file raw HTML structure of `mainconclusion.netlify.app` and `mainconclusionrebuttalvsfirst.netlify.app`
- Findings:
  - this is an AI Studio / Vite React app shell with modular lesson components
  - inspected files do not establish it as the source for the two Netlify drill apps above
  - treat it as a source mismatch unless a deeper source handoff proves otherwise
- Best LSAT U target surface:
  - none as a direct drill-source model
- Match level: inspiration-only / mismatch

## 2. Exact Reusable Data Found

### Highest-confidence reusable source models

- `structuredrill`
  - strongest reusable model for canonical multi-step structure drilling
  - already mirrors LSAT U's existing simulator/dissection direction closely
  - data structure lines up cleanly with LSAT U's existing role-based adapters

- `introconclusiondrill`
  - strongest reusable model for single-prompt conclusion selection with immediate hint/reveal logic
  - best fit for `3.2`
  - nearly fits `3.3`, but LSAT U needs one extra step: after identifying the real conclusion, ask whether that conclusion was sentence one

### Lesson-only or inspiration-only data

- `arguments`
  - good lesson checkpoint bank
  - useful inline X-Ray format
  - useful trap / negation / pronoun-translation mini interactions
  - not the right basis for a standalone drill route by default

- `logicalreasoningfoundation`
  - useful lesson structure and sequencing inspiration
  - not safe to treat as a source-of-truth data model because no raw source was supplied in the prompt's source list

### Partial inspiration sources

- `mainconclusion.netlify.app`
  - good for `3.2` chunk-click pacing
  - good for wrong-answer pivot-clue highlighting
  - weaker than `introconclusiondrill` as a full source model because it does not expose a richer role reveal structure

- `mainconclusionrebuttalvsfirst.netlify.app`
  - good for stage framing and briefing language
  - good for progression pacing and unlock thresholds as inspiration
  - not the correct direct mechanic for LSAT U because it is self-graded and form-heavy rather than click-analyze-reveal

## 3. Exact LSAT U Placement

### `structuredrill` -> exact placement

- Use for:
  - `/bootcamp/intro-to-lr/simulator/bank`
  - `/bootcamp/intro-to-lr/drills/3.4`, especially final/canonical stage
- LSAT U surfaces to preserve while extending:
  - [SimulatorShell.tsx](/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/src/bootcamps/main-conclusion/modules/simulator/SimulatorShell.tsx)
  - [StructuredDissectionLab.tsx](/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/src/bootcamps/main-conclusion/components/structured-dissection/StructuredDissectionLab.tsx)
  - [structuredSimulatorAdapter.ts](/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/src/bootcamps/main-conclusion/components/structured-dissection/structuredSimulatorAdapter.ts)
  - [Drill3_4.tsx](/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/src/bootcamps/main-conclusion/modules/drills/Drill3_4.tsx)

### `introconclusiondrill` -> exact / partial placement

- Use for:
  - `/bootcamp/intro-to-lr/drills/3.2`
  - `/bootcamp/intro-to-lr/drills/3.3`
- LSAT U surfaces to preserve while extending:
  - [Drill3_2.tsx](/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/src/bootcamps/main-conclusion/modules/drills/Drill3_2.tsx)
  - [Drill3_3.tsx](/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/src/bootcamps/main-conclusion/modules/drills/Drill3_3.tsx)
  - [InteractiveDrillRunner.tsx](/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/src/bootcamps/main-conclusion/components/interactive-drills/InteractiveDrillRunner.tsx)
  - [adapters.ts](/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/src/bootcamps/main-conclusion/components/interactive-drills/adapters.ts)

### `arguments` / `logicalreasoningfoundation` -> lesson embedding only

- Use for:
  - argument-basics lesson checkpoints
  - embedded X-Ray blocks inside lessons
- LSAT U surfaces to preserve while extending:
  - [argument-basics.tsx](/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/src/bootcamps/main-conclusion/modules/lessons/notes/argument-basics.tsx)
  - [EmbeddedDrillRunner.tsx](/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/src/bootcamps/main-conclusion/modules/lessons/EmbeddedDrillRunner.tsx)
  - [Lesson.tsx](/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/src/bootcamps/main-conclusion/modules/lessons/Lesson.tsx)
- Do not create a separate drill route from these unless later content review proves a real need

### `mainconclusion` / `mainconclusionrebuttalvsfirst` / `MAINCONCLUSION-ROLE`

- `mainconclusion.netlify.app`
  - use as interaction inspiration for `3.2`
  - especially wrong-answer clue highlighting and click-analyze-next pacing

- `mainconclusionrebuttalvsfirst.netlify.app`
  - use as protocol and unlock inspiration for `3.3` and `3.4`
  - especially stage framing, first-sentence vs rebuttal vocabulary, and briefing copy patterns

- `MAINCONCLUSION-ROLE` repo
  - do not treat as the source model for those two Netlify drills
  - document as a repo/source mismatch

## 4. Interaction Mechanics to Copy

### Copy from `structuredrill`

- start drill card
- progress header
- segmented stimulus clicks instead of detached answer buttons
- conclusion selection as step 1
- family classification as step 2
- support vs opposing follow-up as step 3
- explicit submit
- full role-map reveal
- clean next-question flow
- completion summary

### Copy from `introconclusiondrill`

- sentence-level click targets
- submit disabled until a selection exists
- wrong answer shows a targeted hint
- correct answer reveals sentence roles immediately
- breakdown panel under the paragraph
- one-question-at-a-time pacing

### Copy from `arguments` / `logicalreasoningfoundation`

- guided discovery pacing inside lesson flow
- small checkpoint bursts rather than spinning out full routes
- embedded X-Ray examples
- lightweight click-to-identify conclusion interactions

### Copy from `mainconclusion`

- click exact chunk
- Analyze button cadence
- wrong-answer pivot-clue highlighting
- fast reset and next behavior

### Copy from `mainconclusionrebuttalvsfirst`

- protocol-first framing before the drill begins
- explicit First Sentence vs Rebuttal vocabulary
- staged unlock pacing
- summary/reference vault framing as prep material

## 5. What Not to Copy

- do not copy any prototype color system, branding, typography stack, or dark theme
- do not iframe any Netlify app
- do not paste entire single-file HTML apps into LSAT U
- do not replace LSAT U routing, `IntegratedPathRail`, or `DynamicIslandTOC`
- do not replace LSAT U data with prototype data wholesale
- do not delete existing LSAT U question data
- do not change qids
- do not renumber drills
- do not touch Practice Drills
- do not break Simulator Bank
- do not break Drill `3.4` unlock behavior
- do not unhide archived drills `3.5`, `3.6`, `3.8`, or `3.9` unless a verification pass specifically requires confirming they remain hidden
- do not copy `mainconclusionrebuttalvsfirst` self-grading flow
- do not copy its PDF export
- do not make freeform answer storage the primary drill mechanic in LSAT U

## 6. Risk Notes

- `logicalreasoningfoundation.netlify.app` appears distinct from the provided `arguments` raw source. Treat it as content inspiration, not source-of-truth code.
- `MAINCONCLUSION-ROLE` repo appears to be a separate Vite/AI Studio React project and not the direct source for `mainconclusion.netlify.app` or `mainconclusionrebuttalvsfirst.netlify.app`.
- `structuredrill` is the strongest simulator and `3.4` model, but its data includes explicit `isC` / `isS` / `isO` / `isN` flags that LSAT U should adapt into current role structures rather than port literally.
- `introconclusiondrill` fits `3.2` cleanly but only partially fits `3.3`; LSAT U must preserve the two-step logic already implied by current `3.3` design: find the actual conclusion, then classify whether it was first sentence.
- `mainconclusion.netlify.app` has useful clue-highlighting behavior, but it lacks the richer reveal structure already present in LSAT U's current role-based interactive drill system.
- `mainconclusionrebuttalvsfirst.netlify.app` has strong pedagogy and stage pacing, but its self-grading and text-entry workflow would be a regression if copied directly into LSAT U drills.

## 7. Recommended Implementation Order

1. Finish verifying Simulator Bank against `structuredrill`.
2. Reuse `structuredrill`-style runner for Drill `3.4` final/canonical stage.
3. Rebuild Drill `3.2` using `introconclusiondrill` mechanics.
4. Rebuild Drill `3.3` using `introconclusiondrill` plus first-sentence check.
5. Add argument-basics lesson checkpoints from `arguments` / `logicalreasoningfoundation` only if the source content is strong enough.
6. Add flashcards only after the main drill flows are stable.

## Assumptions

- This report lives at repo root: [PROTOTYPE_TO_LSATU_PLACEMENT_MAP.md](/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/PROTOTYPE_TO_LSATU_PLACEMENT_MAP.md)
- "Review first" means this file is produced now and implementation stops here until approval.
- For mismatched sources, the safe default is explicit documentation rather than speculative reuse.
- LSAT U should borrow mechanics, pacing, structure, reveal logic, and workflow only, not prototype styling or app architecture.
