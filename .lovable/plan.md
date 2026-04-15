

## Plan: Abstraction Bootcamp — Full Content & Component Overhaul

### Summary
Replace the current 5-section static lesson content with a 2-module interactive coaching engine. Module 1 is a step-through drill for 15 abstract answer choice stems. Module 2 is a quiz walkthrough for 6 hard PT Role questions. Both follow a "Step-Pause" pedagogy: exercise first, coaching second.

### Module 1: The De-Abstraction Lab (15 stems)

**Data structure** — each of the 15 stems stored as:
```ts
interface StemDrill {
  id: number;
  rawStem: string;                    // e.g. "It is used to illustrate the general principle..."
  keywords: { word: string; definition: string }[];  // e.g. { word: "presuppose", definition: "Require" }
  coachTranslation: string;           // plain English rewrite
  concreteExample: string;            // the John/Megan scenarios verbatim from PDF
}
```

**Component: `InteractiveStemDrill.tsx`** — 4-state stepper per stem:
- **State 1 (Exercise):** Raw abstract stem only. "Tap to begin coaching" button.
- **State 2 (Keywords):** Keywords highlighted in the stem with coach definitions below.
- **State 3 (Translation + Example):** Plain English translation + concrete example from the PDF.
- **State 4:** Auto-advance to next stem (or show completion).

### Module 2: Advanced Application Quiz (6 questions)

**Data structure** — each of the 6 PT questions:
```ts
interface RoleQuestion {
  id: string;                         // e.g. "PT34-S3-Q14"
  stimulus: string;
  questionStem: string;
  options: { letter: string; text: string }[];
  correctAnswer: string;
  structuralMap: { label: string; text: string }[];  // e.g. [{ label: "Premise 1", text: "..." }]
  answerBreakdowns: { letter: string; explanation: string; isCorrect: boolean }[];
  causalTrapWarning?: string;         // triggered for Megan's Coffee-type causal chain questions
}
```

**Component: `AdvancedQuizViewer.tsx`** — 2-state per question:
- **State 1 (Test):** Stimulus, question, options A-E. Student selects and submits.
- **State 2 (Teardown):** Structural Map labeling every sentence. Each answer choice explained (correct highlighted green, wrong explained with reason). Causal Trap warning box when applicable (PT70 S1 Q17 uses the Megan's Coffee logic).

### Questions from PDFs mapped

**Module 1 stems (all 15):** Extracted verbatim from PDF 1, pages 1-7. Each with keywords, translation, and example.

**Module 2 questions (6):**
1. PT34 S3 Q14 — politicians / rhetoric (Answer: B)
2. PT70 S4 Q24 — fossilized bacteria (Answer: C)
3. PT70 S1 Q17 — meteorologist / downpours (Answer: D) — **Causal Trap**
4. PT87 S3 Q8 — astronomer / heavier elements (Answer: A)
5. PT79 S1 Q22 — consumer advocate / price gouging (Answer: E)
6. PT59 S2 Q7 — columnist / live music (Answer: E)

Note: PT51 S3 Q23 (ethicist) appears at the end of the PDF without a full breakdown — it will be included as a 7th bonus question if the user wants, but the PDF provides only the stem + options, no walkthrough. I will include the 6 that have full explanations.

### Files

| Action | File |
|--------|------|
| Rewrite | `src/components/bootcamp/abstraction/types.ts` — new interfaces for StemDrill, RoleQuestion, and module structure |
| Rewrite | `src/components/bootcamp/abstraction/data.ts` — all 15 stems + 6 questions, every word from the PDFs |
| Create | `src/components/bootcamp/abstraction/InteractiveStemDrill.tsx` — 4-state stepper component |
| Create | `src/components/bootcamp/abstraction/AdvancedQuizViewer.tsx` — quiz + teardown component |
| Rewrite | `src/components/bootcamp/abstraction/AbstractionBootcamp.tsx` — 2-module sidebar, renders the correct component per module |

### UI Style
- Monochromatic, high-contrast (Linear/Stripe aesthetic)
- Stem text in large mono font for the "exercise" state
- Keywords highlighted with subtle background pill + tooltip
- Structural Map uses labeled rows with left border color-coding (premise = neutral, IC = amber, conclusion = blue)
- Causal Trap warning rendered as a distinct amber/orange callout box

### Sidebar
Two entries:
- **01. The De-Abstraction Lab** — subtitle: "15 Exercises"
- **02. Advanced Application** — subtitle: "6 Questions"

Progress tracked per module (stems completed / questions answered).

