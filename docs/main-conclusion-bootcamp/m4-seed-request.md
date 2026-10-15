# M4 Simulator Seeds — Joshua hand-off

**Status:** Pending Joshua. Unblocks Phase D (80-distractor batch authoring).
**Per:** Architecture-plan §6 + G2.SIM-4.2-AC inversion.

## What I need from you

**2 more distractor sets**, in the format below. I've authored MC-SIM-Q1 (First-sentence) as a worked example to lock the format. You author:

- **One Rebuttal** (suggest MC-SIM-Q11 *Letter to the editor / Judge Mosston* — clean rebuttal structure with a "but" pivot)
- **One wildcard** (suggest MC-SIM-Q20 *Multinational grain companies / since-clause leading* — atypical First-sentence with the support clause arriving first via "since")

Once your two land, I scale to all 80 distractors using the three seeds as the trait-tag template.

---

## Format reference (Distractor schema)

```ts
{
  question_id: 'MC-SIM-QN',
  letter: 'A' | 'B' | 'C' | 'D' | 'E',
  text: string,                 // The full answer-choice prose
  is_correct: boolean,
  trait_id: 'T1' | ... | 'T7',  // null on the correct answer
  fingerprint_note: string,     // 1 sentence: why this distractor exemplifies its trait
  audit_voice: string,          // The Coach's-Note one-word verdict ("Too strong" / "Stay narrow" / "Out of scope" / "Premise-as-conclusion" / "Half-the-claim" / etc.)
}
```

The 7 trap traits live in `src/data/traps.generated.json`. Reference them as you tag.

---

## Worked example — MC-SIM-Q1 (First-sentence)

**Stimulus:**
> The vision test for obtaining a driver's license should not be limited to measuring the adequacy of vision in daylight conditions, as is the current practice. Many people whose daylight vision is adequate have night vision that is inadequate for safe night driving. Most car accidents occur at night, and inadequate vision plays a role in 80 percent of these accidents.

**Main conclusion (the right answer):**
> The vision test for obtaining a driver's license should not be limited to measuring the adequacy of vision in daylight conditions.

### Distractors (Claude's draft — review and adjust voice if needed)

| Letter | Text (draft) | Correct? | trait_id | fingerprint_note | audit_voice |
|---|---|---|---|---|---|
| **A** | Many people with adequate daylight vision have night vision inadequate for safe driving. | ✗ | **T2** (Premise as conclusion) | Lifts a support sentence verbatim and floats it as the conclusion. The author uses this fact to *support* the recommendation; it isn't the recommendation itself. | Premise-as-conclusion |
| **B** ✓ | The vision test for obtaining a driver's license should not be limited to measuring the adequacy of vision in daylight conditions. | ✓ | — | — | Correct |
| **C** | The vision test for obtaining a driver's license should be expanded to include night-vision testing. | ✗ | **T1** (Stronger / more specific than the author) | Adds a specific remedy ("expanded to include night-vision testing") the author never proposes — author only says the current limit shouldn't stand. | Too strong |
| **D** | Inadequate vision is responsible for 80 percent of car accidents that occur at night. | ✗ | **T2** (Premise as conclusion) | Quotes the third support sentence as if it were the point. Statistic is evidence, not the claim. | Premise-as-conclusion |
| **E** | Driver's licensing standards should be reformed to address the leading causes of car accidents. | ✗ | **T6** (Out of scope / generalization) | Generalizes the recommendation to "leading causes of car accidents" — broader than the author's narrow claim about the *vision test*. | Out of scope |

**Notes on this seed:**
- Letter B is correct. Distribution will balance across A–E across the 20 questions.
- Two T2s on this question is a deliberate choice — the most common trap on first-sentence-conclusion items is grabbing a support sentence. The 80-question set won't double up T2 within a single question by default, but Q1 is a teaching moment, so it does.
- `fingerprint_note` voice is Register-1 (procedural/decisive). One sentence each. No CAPS, no exclamation marks.

---

## Your two seeds

Author below in the same table format. If you want a different question for the Rebuttal or wildcard, swap freely — the exemplar value matters more than the specific question.

### Seed 2 — MC-SIM-Q11 (Rebuttal) — *Letter to the editor / Judge Mosston*

**Stimulus:**
> Letter to the editor: I was shocked to learn that Judge Mosston was convicted of criminal assault. Nevertheless, despite his conviction, Mosston should not be forced to resign as judge. He has a long record of community service, and many of his community programs have benefited the city greatly.

**Main conclusion:** Mosston should not be forced to resign as judge.

| Letter | Text | Correct? | trait_id | fingerprint_note | audit_voice |
|---|---|---|---|---|---|
| A | | | | | |
| B | | | | | |
| C | | | | | |
| D | | | | | |
| E | | | | | |

### Seed 3 — MC-SIM-Q20 (Wildcard / since-leading) — *Multinational grain companies*

**Stimulus:**
> Since multinational grain companies operate so as to maximize profits, they cannot be relied on to initiate economic changes that would reform the world food-distribution system. While it is therefore left to the United Nations to play a major role in reforming the world food-distribution system, the United Nations has not been particularly effective so far. Hence, no improvements in the world food-distribution system are likely to occur in the near future.

**Main conclusion:** They (multinational grain companies) cannot be relied on to initiate economic changes that would reform the world food-distribution system.

> Wildcard hint: candidates here will tempt with (a) the *final* sentence ("no improvements... near future") which is the overall takeaway but not the *main* conclusion of the first argument-step; (b) the since-clause as conclusion (T2); (c) the UN sentence (intermediate conclusion).

| Letter | Text | Correct? | trait_id | fingerprint_note | audit_voice |
|---|---|---|---|---|---|
| A | | | | | |
| B | | | | | |
| C | | | | | |
| D | | | | | |
| E | | | | | |

---

## Once your seeds land

I'll:
1. Re-tag MC-SIM-Q1 if your conventions diverge from my draft.
2. Author all 17 remaining distractor sets following the three locked seeds.
3. Submit at Phase D for your single batch review.

No urgency — the rest of Phase A runs without these. They unlock Phase D specifically.
