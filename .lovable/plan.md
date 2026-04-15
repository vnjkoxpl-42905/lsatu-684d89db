

## Analysis & Plan: Full PDF Content Integration into Abstract Bootcamp

### What happened with the last edit

The code is structurally correct — `Bootcamps.tsx` has the third card, `App.tsx` has the route, all component files exist and import correctly. The most likely cause of the missing card is a **build failure in the large `data.ts` file** (345 lines of string templates with backticks, special characters, and nested quotes). When the Vite build fails silently, the preview serves a stale cached version that predates the Abstract card. The fix is to ensure every file compiles cleanly.

### Content gap audit: What the PDFs teach vs. what `data.ts` currently contains

**PDF 1 (Stem Explanations) — Missing:**

| Gap | What's in the PDF | What's in the app |
|-----|-------------------|-------------------|
| Introductory pedagogy | Full paragraph on "de-abstractifying" as a critical skill for advanced students | Nothing — Module 1 jumps straight into stems |
| Stem #4 | Full 4-requirement checklist (opposing view, author argues against, observation provided, author says insufficient) | Requirements listed but the structured checklist form is compressed |
| Stem #5 | Full teaching on "explanation = cause" as a strict LSAT definition, plus reference to PT43-S3-Q23 | Partially there but the cross-reference and emphasis is lost |
| Stem #7 | Teaching on assumptions (teased: "we will look at assumptions in a subsequent chapter") | Missing the pedagogical note about assumptions |
| Stem #10 | Identical to #5 note | Current example is just "Same structure as stem #5" — lazy placeholder |
| Stem #11 | Full Darwin/evolution hypothesis explanation (5 sentences) | Compressed to 2 sentences |
| Stems #12-15 | Examples are generic ("Any argument with...") rather than concrete scenarios | Same issue — these need the PDF's actual teaching substance |
| Generalizations vs Examples | Full teaching distinction from stem #4 answer D in PDF 2 (p.3 lines 102-108) | Missing entirely |

**PDF 2 (Role Questions) — Missing:**

| Gap | What's in the PDF | What's in the app |
|-----|-------------------|-------------------|
| Introductory framing | Timing advice, systematic approach, "fill knowledge gaps" | Missing |
| Difficult Trait #1 | "Make sure you are clearly categorizing each statement as you read it" | Missing |
| Difficult Trait #2 | "Be extra careful of vague/abstract terms in answer choices" | Missing |
| Difficult Trait #3 | "Role questions are famous for brutally abstract stimuli" | Missing |
| PT34 walkthrough narrative | Full step-by-step "Statement 1, Statement 2..." teaching with reasoning process | Lost — only structuralMap entries remain |
| PT70-S4-Q24 lesson | "Focus on exactly what the question is asking about" + "mini-argument within a sentence" | Missing |
| PT70-S4-Q24 diagram | The argument chain diagram teaching | Missing |
| PT70-S1-Q17 causality teaching | John/Netflix example, Megan's Coffee full walkthrough, YLS conditional example, "Cause→Effect ≠ Premise→Conclusion", "Sufficient→Necessary ≠ Premise→Conclusion" | Only Megan's Coffee survives in causalTrapWarning — 70% of the teaching is missing |
| PT87-S3-Q8 | "Probably" = opinion signal, independent premises teaching | Missing from walkthrough |
| PT79-S1-Q22 | "So what?" technique for disconnected statements, detailed diagramming of economist vs consumer advocate | Missing |
| PT59-S2-Q7 | John/lung cancer comparison (similarities vs differences), keyword extraction method for abstract answer E | Missing |
| PT51-S3-Q23 (Ethicist) | Full 7th question with stimulus, stem, options A-E | Entirely absent |
| "Conclusion" terminology | "'Conclusion' can mean both main and intermediate. 'Conclusion of the argument as a whole' = main conclusion" | Missing |
| Per-answer teaching narratives | Each wrong answer has a full reasoning narrative explaining the thought process | Compressed to 1-2 sentence explanations |

### Plan to fix

**Step 1: Extend type system** (`types.ts`)

Add new fields to support the missing content:
- `StemDrill.requirements?: string` — structured checklist of what must be true
- `StemDrill.lsatNote?: string` — LSAT-specific terminology warnings
- `RoleQuestion.walkthrough: string[]` — the full step-by-step statement analysis narrative
- `RoleQuestion.preTeaching?: string` — introductory lesson before the question (e.g., causality teaching for PT70-S1-Q17)
- `RoleQuestion.difficultTrait?: { title: string; text: string }` — the "Difficult Trait #N" callout
- `RoleQuestion.takeaway?: string` — lesson summary after the question

**Step 2: Expand `data.ts` with ALL missing content**

- Add module-level intro text (exported as constants) for both modules
- Enrich every stem with the full PDF text: complete examples, complete requirements, LSAT notes
- Add the 7th question (PT51-S3-Q23 ethicist)
- Add full walkthrough narratives for all 6 (now 7) questions
- Add pre-teaching content for PT70-S1-Q17 (the causality vs structure lesson)
- Add Difficult Trait callouts to PT34 (#1), PT87 (#2), PT59 (#3)
- Expand every answer breakdown to include the full reasoning narrative from the PDF

**Step 3: Update `InteractiveStemDrill.tsx`**

- Add a module intro screen (State 0) showing the de-abstractification pedagogy before the first stem
- Add a "Requirements" panel as an optional 4th reveal state between Translation and Advance (for stems that have a checklist)
- Add LSAT terminology notes where applicable
- Fix stems #10-15 to show real teaching content instead of placeholder text

**Step 4: Update `AdvancedQuizViewer.tsx`**

- Add a module intro screen with timing advice and systematic approach guidance
- Add "Difficult Trait" callout boxes above relevant questions
- Add a "Walkthrough" section in the teardown that shows the full step-by-step statement analysis
- Add "Pre-Teaching" expandable section for PT70-S1-Q17 with the full causality lesson (John/Netflix, Megan's Coffee, YLS conditional)
- Add "Takeaway" section at the bottom of each teardown
- Expand answer breakdowns to show full narrative reasoning
- Add the 7th question (ethicist)

**Step 5: Update `AbstractionBootcamp.tsx`**

- Update Module 2 subtitle from "6 Questions" to "7 Questions"
- Update the MODULES array total count

**Step 6: Update `Bootcamps.tsx`**

- Update stats to `['2 Modules', '15 Exercises', '7 Questions']`

### Files modified

| Action | File |
|--------|------|
| Modify | `src/components/bootcamp/abstraction/types.ts` |
| Rewrite | `src/components/bootcamp/abstraction/data.ts` |
| Modify | `src/components/bootcamp/abstraction/InteractiveStemDrill.tsx` |
| Modify | `src/components/bootcamp/abstraction/AdvancedQuizViewer.tsx` |
| Modify | `src/components/bootcamp/abstraction/AbstractionBootcamp.tsx` |
| Modify | `src/pages/Bootcamps.tsx` |

### Build fix approach

All string content in `data.ts` will use standard single-quote strings with explicit `\n` for line breaks instead of template literals with backticks — this eliminates the class of escape/quote errors that likely caused the silent build failure.

