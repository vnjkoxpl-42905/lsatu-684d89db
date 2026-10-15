# PF Day → qtype/features mapping — inferred, awaiting line-by-line confirmation

**Source:** `src/bootcamps/principle-flaw/data.ts:1014` (`scheduleData`)
**Inference basis:** the `focus` string + `do[]` PracticeSet IDs.
**Canonical qtypes** come from `src/lib/questionLoader.ts:252` (`CANONICAL_QTYPES.allTypes`) — only values listed there are valid: `Flaw`, `Necessary Assumption`, `Weaken`, `Strengthen`, `Sufficient Assumption`, `Principle-Strengthen`, `Evaluate`, `Most Strongly Supported`, `Must Be True`, `Agree/Disagree`, `Must Be False`, `Method of Reasoning`, `Main Conclusion`, `Parallel Flaw`, `Role`, `Parallel Reasoning`, `Principle-Conform`, `Paradox`.

**Difficulty scale**: 1–5 (LRQuestion.difficulty). PF uses "Level 1/2/3/4" — best-fit mapping:
- Level 1 → `[1, 2]`
- Level 2 → `[2, 3]`
- Level 3 → `[3, 4]`
- Level 4 → `[4, 5]`

**Default counts**: homework `10`, practice `25`. Override per-day if you want.

**`generates: false`** = day is review-only / out-of-LR-scope (timed-section, RC, tutoring prep). The Homework/Practice buttons would be hidden or disabled.

---

## Day 1 — Flaw Foundation (Mon, Medium, 75–100m)
- `generates`: **true**
- `qtypes`: `["Flaw"]`
- `difficulties`: `[1, 2]`
- `questionFeatures`: *(none — keep wide for Level 1 entry)*
- `homeworkCount`: 10
- `practiceCount`: 25
- **Reasoning:** focus "Flaw Foundation" + `do: ["flaw-worksheet", "flaw-pm-1"]` indicates introductory Flaw. Level 1 difficulty band.

## Day 2 — Tutoring Prep & Light Review (Tue, Light, 30–45m)
- `generates`: **false**
- **Reasoning:** focus "Tutoring Prep & Light Review", `do: ["Redo 2 hardest questions from Monday"]`. No new question pull; review-only.

## Day 3 — Principle Foundation (Wed, High, 60–90m)
- `generates`: **true**
- `qtypes`: `["Principle-Strengthen"]`
- `difficulties`: `[1, 2]`
- `questionFeatures`: *(none — entry-level)*
- `homeworkCount`: 10
- `practiceCount`: 25
- **Reasoning:** focus "Principle Foundation", `do: ["principle-strengthen-hw", "Redo 2 Flaw Level 1 questions"]`. Primary new pull is Principle-Strengthen at L1 difficulty.

## Day 4 — Flaw Level 2 & Precision (Thu, Medium, 75–100m)
- `generates`: **true**
- `qtypes`: `["Flaw"]`
- `difficulties`: `[2, 3]`
- `questionFeatures`: `["Famous Flaws"]` — *suggested; remove if too narrow*
- `homeworkCount`: 10
- `practiceCount`: 25
- **Reasoning:** focus "Flaw Level 2 & Precision", `do: ["flaw-pm-2"]`. Level 2 step-up. "Famous Flaws" is the LSAT U feature tag most aligned with classic precision-Flaw drilling.

## Day 5 — Principle Application (Fri, Medium, 60–90m)
- `generates`: **true**
- `qtypes`: `["Principle-Strengthen"]`
- `difficulties`: `[2, 3]`
- `questionFeatures`: *(none)*
- `homeworkCount`: 10
- `practiceCount`: 25
- **Reasoning:** focus "Principle Application", `do: ["principle-strengthen-hw", "strengthen-app-hw", "Redo 2 Flaw misses"]`. "Strengthen Application" is **not** a canonical LSAT U qtype — closest is `Principle-Strengthen`. **Flag for user**: do you want this to also pull plain `Strengthen` to capture application-flavored items?

## Day 6 — Timed Practice (Sat, High, 120m)
- `generates`: **false** (timed full-section flow, not a filtered pull)
- **Reasoning:** focus "Timed Practice", `do: ["One timed LR section"]`. This is the existing full-section drill, mode=`full-section`. Should route to the existing Practice → Full Section flow, not the PF auto-gen pull.

## Day 7 — Controlled Review Day (Sun, Light, 45–60m)
- `generates`: **false**
- **Reasoning:** `do: ["Redo 3 Flaw misses", "Redo 2 Principle misses"]`. Review-only.

## Day 8 — Flaw Level 3 (Mon W2, Medium, 90–120m)
- `generates`: **true**
- `qtypes`: `["Flaw"]`
- `difficulties`: `[3, 4]`
- `questionFeatures`: *(none)*
- `homeworkCount`: 10
- `practiceCount`: 25
- **Reasoning:** focus "Flaw Level 3", `do: ["flaw-pm-3", "strengthen-app-hw"]`. Level 3 difficulty band. (Note: `strengthen-app-hw` is a secondary `do`; primary is the Flaw 3 set.)

## Day 9 — Tutoring Prep & Conform (Tue W2, Medium, 75–100m)
- `generates`: **true**
- `qtypes`: `["Principle-Conform"]`
- `difficulties`: `[2, 3]`
- `questionFeatures`: *(none)*
- `homeworkCount`: 10
- `practiceCount`: 25
- **Reasoning:** focus "Tutoring Prep & Conform", `do: ["principle-conform-hw", "Redo 3 Flaw misses"]`. First introduction of Principle-Conform.

## Day 10 — Mixed Drills (Wed W2, High, 90–120m)
- `generates`: **true**
- `qtypes`: `["Flaw", "Principle-Strengthen", "Principle-Conform"]`
- `difficulties`: `[2, 3, 4]`
- `questionFeatures`: *(none)*
- `homeworkCount`: 10
- `practiceCount`: 25
- **Reasoning:** focus "Mixed Drills", `do: ["flaw-pm-3", "principle-conform-hw"]`. Mixed task identification — pull across all three PF qtypes.

## Day 11 — Conform & Parallel Bridge (Thu W2, High, 90–120m)
- `generates`: **true**
- `qtypes`: `["Principle-Conform", "Parallel Flaw"]`
- `difficulties`: `[3, 4]`
- `questionFeatures`: *(none)*
- `homeworkCount`: 10
- `practiceCount`: 25
- **Reasoning:** focus "Conform & Parallel Bridge", `do: ["principle-conform-hw", "parallel-flaw-bridge"]`. Both qtypes are primary today.

## Day 12 — Final Timed LR (Fri W2, High, 120m)
- `generates`: **false** (timed full-section flow)
- **Reasoning:** same shape as Day 6.

## Day 13 — Final Mastery & RC (Sat W2, Medium, 120m)
- `generates`: **true** (Flaw portion only — RC is out of scope for the LR question bank)
- `qtypes`: `["Flaw"]`
- `difficulties`: `[4, 5]`
- `questionFeatures`: *(none — hardest band)*
- `homeworkCount`: 10
- `practiceCount`: 25
- **Reasoning:** focus "Final Mastery & RC", `do: ["flaw-pm-3", "Redo 5 Flaw hard ones", "One untimed RC passage"]`. Level 4 Flaw is the auto-generable piece; RC is bank-scoped out.

## Day 14 — Strategic Wrap-up (Sun W2, Light, 60m)
- `generates`: **false** (review-only)
- **Reasoning:** `do: ["Redo 3 Flaw, 3 Principle, 1 Parallel Flaw"]`. Review-only.

---

## Summary table

| Day | Focus                          | gen?  | qtypes                                                  | diff   | features            |
|-----|--------------------------------|-------|---------------------------------------------------------|--------|---------------------|
| 1   | Flaw Foundation                | ✅    | `["Flaw"]`                                              | 1–2    | —                   |
| 2   | Tutoring Prep & Light Review   | ❌    | —                                                       | —      | —                   |
| 3   | Principle Foundation           | ✅    | `["Principle-Strengthen"]`                              | 1–2    | —                   |
| 4   | Flaw Level 2 & Precision       | ✅    | `["Flaw"]`                                              | 2–3    | `["Famous Flaws"]`* |
| 5   | Principle Application          | ✅    | `["Principle-Strengthen"]` (+`"Strengthen"`?)           | 2–3    | —                   |
| 6   | Timed Practice                 | ❌    | (full section)                                          | —      | —                   |
| 7   | Controlled Review Day          | ❌    | —                                                       | —      | —                   |
| 8   | Flaw Level 3                   | ✅    | `["Flaw"]`                                              | 3–4    | —                   |
| 9   | Tutoring Prep & Conform        | ✅    | `["Principle-Conform"]`                                 | 2–3    | —                   |
| 10  | Mixed Drills                   | ✅    | `["Flaw","Principle-Strengthen","Principle-Conform"]`   | 2–4    | —                   |
| 11  | Conform & Parallel Bridge      | ✅    | `["Principle-Conform","Parallel Flaw"]`                 | 3–4    | —                   |
| 12  | Final Timed LR                 | ❌    | (full section)                                          | —      | —                   |
| 13  | Final Mastery & RC             | ✅    | `["Flaw"]`                                              | 4–5    | —                   |
| 14  | Strategic Wrap-up              | ❌    | —                                                       | —      | —                   |

\* = best guess, please confirm or replace.

---

## What I need from you

For each day with `generates: ✅`, confirm:
1. `qtypes` — accept as-is, narrow, or expand.
2. `difficulties` — accept the level-mapping bracket, or override.
3. `questionFeatures` — accept the suggestion (Day 4 only), or supply your own list per day.
4. `homeworkCount` / `practiceCount` — accept defaults (10 / 25) or override per day.

For Day 5 specifically: should `qtypes` also include `"Strengthen"` to capture "Application" items, or stay `["Principle-Strengthen"]` only?

Once approved, I'll add `targets?: DayTargets` to the matching `scheduleData` rows and wire `pickHomeworkForDay` / `pickPracticeForDay` in `src/bootcamps/principle-flaw/lib/dayQuestions.ts`. The Wave-3 cooldown hook (an `excludeQids` parameter) goes in at the same time, unused for now.
