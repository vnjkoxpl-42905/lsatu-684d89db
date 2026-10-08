# LSAT U Missing-Feature Backfill — Lovable Handoff

Source: LSAT Lab question-bank tags, cross-referenced against `missing_question_features (1).csv` (562 questions LSAT U has no feature tag for).
Extraction: read LSAT Lab's full LR question bank (3,810 rows) client-side; each question's `subtypes` = its feature tags. Mapped Lab tags to LSAT U's 60-feature vocabulary (`src/lib/questionFeatureFamilies.ts`).

Bottom line: of 562 missing, LSAT Lab supplies a real LSAT-U feature for only **8**. The rest are blank in Lab, reasoning-tag-only, or not in Lab's bank. The missing set overlaps heavily with the questions Lab itself leaves untagged.

---

## 1. APPLY THESE — 8 questions we can now backfill

These map cleanly to LSAT U's existing 60-feature vocabulary. Set each question's `questionFeatures` to the listed values (these are the canonical names already used in `questionFeatureFamilies.ts`).

| PrepTest | Section | Q | Question Type | Features to assign |
|---|---|---|---|---|
| PT101 | 3 | 11 | Must be True | Causal Difference-Maker |
| PT109 | 3 | 14 | Argument part | Plans / Recommendations, Rebuttals, Implied Conclusion |
| PT109 | 4 | 4 | Must be True | Refute a Conditional |
| PT119 | 4 | 21 | Sufficient Assumption | New Concept in Conclusion, Missing Link / Idea |
| PT120 | 1 | 26 | Strengthen | Explain Curious Fact, Plausibility, Focused on Evidence |
| PT120 | 3 | 21 | Sufficient Assumption | Conditional Diagramming, First Sentence Conclusion, New Concept in Conclusion |
| PT120 | 4 | 15 | Sufficient Assumption | Missing Link / Idea, Links Between Premises |
| PT131 | 2 | 22 | Strengthen | Explain Curious Fact, First Sentence Conclusion, Plausibility |

---

## 2. DECISION NEEDED — 219 questions with a reasoning tag only

Lab tags these only with a reasoning type (Causation / Comparison / Conditional Logic). These are NOT in LSAT U's current 60-feature taxonomy, so they are left unassigned. If Joshua decides to track reasoning types as features, apply the `lab_reasoning` value from the CSV. Until then, treat as still-missing.

- **PT101:** S3Q4, S3Q7, S3Q8
- **PT102:** S2Q2, S3Q3, S3Q4, S3Q5, S3Q7, S3Q20, S3Q22, S4Q2, S4Q7, S4Q8, S4Q13, S4Q16
- **PT103:** S1Q1, S1Q6, S1Q7, S1Q10, S1Q11, S1Q12, S1Q19, S1Q20, S1Q22, S2Q18, S2Q20, S2Q21
- **PT104:** S4Q8
- **PT105:** S1Q6, S1Q9, S2Q1, S2Q2, S2Q5, S2Q9, S2Q10, S2Q14, S2Q17, S2Q19, S2Q23, S2Q24
- **PT106:** S2Q3, S2Q6, S2Q13, S2Q14, S3Q3
- **PT107:** S3Q7, S3Q9, S3Q13, S3Q15, S3Q23
- **PT108:** S3Q6
- **PT109:** S3Q1, S4Q2, S4Q5, S4Q9, S4Q13, S4Q14, S4Q19, S4Q20, S4Q23, S4Q25
- **PT110:** S2Q4, S2Q5, S2Q7
- **PT111:** S3Q16, S4Q3, S4Q21
- **PT112:** S3Q3, S3Q17
- **PT113:** S3Q13
- **PT114:** S2Q8, S4Q1
- **PT117:** S2Q14, S4Q20
- **PT118:** S4Q20
- **PT119:** S2Q6, S3Q2, S4Q1, S4Q13, S4Q15
- **PT120:** S3Q3, S4Q23
- **PT121:** S1Q12, S1Q16, S1Q19, S1Q21, S1Q22, S1Q26
- **PT122:** S1Q7, S1Q8, S1Q9, S2Q20, S4Q15, S4Q17
- **PT123:** S2Q25
- **PT125:** S2Q4, S2Q17, S4Q6, S4Q13, S4Q21
- **PT126:** S4Q8
- **PT127:** S1Q5, S1Q26
- **PT128:** S2Q4, S2Q19, S3Q3, S3Q6, S3Q9, S3Q10, S3Q11, S3Q12, S3Q13, S3Q14, S3Q15, S3Q16, S3Q18, S3Q23, S3Q24
- **PT129:** S1Q21, S3Q4
- **PT130:** S4Q1, S4Q13
- **PT131:** S2Q1, S2Q3, S2Q4, S2Q5, S2Q6, S2Q8, S2Q11, S2Q15, S2Q20, S2Q21, S3Q1, S3Q3, S3Q4, S3Q5, S3Q7, S3Q8, S3Q10, S3Q11, S3Q13, S3Q14, S3Q20, S3Q22, S3Q23, S3Q24
- **PT132:** S2Q4, S2Q24, S4Q8, S4Q13, S4Q14, S4Q16
- **PT133:** S1Q4, S2Q10, S3Q5, S3Q8, S3Q9, S3Q12, S3Q13, S3Q25
- **PT134:** S1Q2, S1Q3, S1Q6, S2Q18, S3Q8, S3Q13, S3Q16, S3Q26
- **PT135:** S1Q12, S4Q1, S4Q9
- **PT136:** S2Q7, S2Q12, S2Q15, S2Q16, S2Q17, S2Q23, S2Q25, S4Q6, S4Q10, S4Q13, S4Q15, S4Q18, S4Q22
- **PT137:** S2Q1, S2Q2, S2Q4, S2Q12, S3Q1, S3Q17, S4Q3, S4Q15, S4Q17, S4Q23
- **PT138:** S2Q1, S2Q2, S2Q6, S2Q9, S2Q13, S2Q20, S3Q9, S3Q10, S3Q20, S4Q9
- **PT139:** S1Q11, S1Q14, S1Q15, S4Q5, S4Q14, S4Q15, S4Q19, S4Q23
- **PT140:** S2Q7, S2Q9, S2Q13, S2Q14, S2Q18, S3Q3, S3Q26

---

## 3. STILL MISSING — not fillable from LSAT Lab (335 questions)

### 3a. Blank in LSAT Lab too (165) — Lab has no tags for these

- **PT101:** S2Q13, S3Q12
- **PT102:** S3Q14, S4Q10, S4Q21, S4Q26
- **PT103:** S1Q17, S3Q1, S3Q18
- **PT105:** S1Q5, S1Q7, S1Q10, S2Q18, S4Q5, S4Q11, S4Q15, S4Q16, S4Q18, S4Q19, S4Q20, S4Q22
- **PT106:** S2Q20
- **PT107:** S3Q2
- **PT108:** S2Q2, S2Q4, S2Q6, S2Q10, S2Q14, S2Q18, S2Q19, S3Q2, S3Q4, S3Q7, S3Q9, S3Q13, S3Q24
- **PT109:** S1Q1, S1Q6, S1Q8, S1Q11, S1Q14, S3Q21, S4Q7, S4Q17, S4Q24
- **PT110:** S2Q6, S2Q8, S2Q10, S2Q12, S2Q22, S2Q23, S3Q12, S3Q25, S3Q26
- **PT111:** S1Q25, S3Q1, S3Q3, S3Q9, S3Q20, S3Q23, S4Q2, S4Q12, S4Q14, S4Q15, S4Q23
- **PT112:** S4Q1, S4Q9, S4Q18
- **PT113:** S2Q2, S2Q4, S2Q5, S2Q12, S2Q17, S2Q21, S3Q9, S3Q11, S3Q18, S3Q19, S3Q20, S4Q2, S4Q5, S4Q9, S4Q17, S4Q18, S4Q25
- **PT114:** S1Q1, S1Q15, S1Q17, S1Q19, S1Q20, S1Q21, S2Q6, S2Q7, S2Q15, S2Q16, S2Q24, S4Q15, S4Q16, S4Q17, S4Q19
- **PT115:** S2Q3, S4Q5, S4Q6, S4Q9, S4Q16, S4Q17, S4Q23
- **PT116:** S2Q15, S3Q1
- **PT117:** S3Q5, S3Q11, S3Q14, S3Q18, S4Q15, S4Q21
- **PT118:** S1Q8, S1Q23, S3Q4, S3Q5, S3Q11, S3Q23, S4Q18, S4Q25
- **PT119:** S2Q4, S2Q8, S2Q17, S2Q19, S2Q23, S3Q1, S3Q7, S3Q9, S3Q10, S3Q13, S3Q16, S3Q24
- **PT120:** S1Q6, S1Q9, S1Q15, S1Q22, S3Q2, S4Q18
- **PT121:** S4Q5, S4Q8, S4Q18, S4Q19, S4Q20, S4Q21, S4Q23, S4Q26
- **PT122:** S2Q2, S2Q12, S4Q10, S4Q11, S4Q14, S4Q18, S4Q19, S4Q22
- **PT126:** S4Q2
- **PT132:** S2Q14
- **PT134:** S1Q14, S1Q25, S3Q10
- **PT137:** S2Q22, S4Q22
- **PT138:** S2Q11

### 3b. Only a Lab topic tag LSAT U does not track (9)

- PT101 S2 Q12 (Main Conclusion) — Lab tag: Main Point
- PT103 S3 Q4 (Role) — Lab tag: ROLE
- PT108 S2 Q7 (Most Supported) — Lab tag: Animals
- PT117 S4 Q6 (Argument Part) — Lab tag: ROLE
- PT120 S1 Q19 (Weaken) — Lab tag: (AS) Inductive Reasoning | (AS) Pros/Cons
- PT120 S3 Q4 (Weaken) — Lab tag: (AS) Recommendations
- PT120 S3 Q14 (Weaken) — Lab tag: (AS) Recommendations
- PT120 S3 Q20 (Method) — Lab tag: (AS) Standards and Measurements
- PT122 S1 Q4 (Paradox) — Lab tag: (AS) Inductive Reasoning

### 3c. PT141–159: not in LSAT Lab's bank (155) — Lab's LR bank tops out at PT140; need another source

- **PT141:** S2Q2, S2Q5, S2Q24, S4Q22
- **PT142:** S1Q11, S1Q12, S1Q15, S1Q20, S1Q21, S1Q22, S1Q25, S2Q3, S2Q9, S2Q25, S4Q8, S4Q9, S4Q10, S4Q11, S4Q12, S4Q13, S4Q17, S4Q19, S4Q20, S4Q21, S4Q23, S4Q24, S4Q25, S4Q26
- **PT143:** S1Q6, S1Q12, S1Q14, S1Q17, S1Q20, S3Q5, S3Q11, S3Q14, S4Q7, S4Q22, S4Q24
- **PT144:** S2Q4, S2Q7, S2Q11, S3Q5, S3Q12, S3Q22, S4Q3, S4Q25
- **PT145:** S2Q20, S4Q3
- **PT146:** S3Q4, S3Q9, S3Q16
- **PT147:** S1Q3, S4Q3, S4Q5
- **PT148:** S3Q11, S4Q3, S4Q10, S4Q13
- **PT149:** S1Q13, S3Q14, S4Q5, S4Q12, S4Q23, S4Q25, S4Q26
- **PT150:** S2Q6, S2Q7, S2Q8, S2Q9, S2Q11, S2Q19, S2Q20, S2Q24, S2Q25, S3Q2, S3Q4, S3Q6, S3Q9, S3Q16, S3Q17, S3Q24
- **PT151:** S2Q11, S3Q15, S3Q23, S4Q2, S4Q6, S4Q7, S4Q9, S4Q10, S4Q11, S4Q17, S4Q20, S4Q21, S4Q23, S4Q24, S4Q25
- **PT152:** S1Q13, S1Q18, S1Q22, S2Q1, S2Q8, S2Q10, S2Q13, S2Q15, S2Q17, S2Q22, S2Q24, S4Q14, S4Q23
- **PT153:** S2Q20, S2Q21, S2Q23, S3Q4, S3Q5, S3Q24
- **PT154:** S1Q2, S1Q6, S1Q9, S1Q10, S1Q15, S1Q16, S1Q23, S1Q24, S1Q25, S2Q12, S2Q18, S2Q22, S2Q23, S4Q3, S4Q5, S4Q7, S4Q8, S4Q10, S4Q13, S4Q15, S4Q18, S4Q20, S4Q21, S4Q26
- **PT155:** S1Q3, S1Q18
- **PT156:** S2Q3, S4Q15
- **PT157:** S2Q19, S3Q18, S3Q23
- **PT158:** S2Q5, S3Q6, S3Q20
- **PT159:** S1Q4, S1Q9, S1Q14, S3Q6, S3Q7

### 3d. Question number does not exist in Lab's LR bank (6) — likely RC/mislabeled in the missing list

- PT103 S2 Q26 (Sufficient Assumption)
- PT113 S3 Q25 (Flaw)
- PT113 S3 Q26 (Strengthen)
- PT118 S1 Q5 (Agree/Disagree)
- PT128 S2 Q26 (Weaken)
- PT131 S1 Q26 (Method)

---

## Acceptance criteria
- Only the questions in section 1 get new `questionFeatures`. Do not touch any other question.
- Use exact feature strings from `questionFeatureFamilies.ts`. Do not invent new feature names.
- Do not change question text, answers, types, or any non-feature field.
- Sections 2 and 3 are reference only; do not apply unless Joshua approves section 2.

Full per-question data (all 562, every status and raw Lab tag): `lsatu_feature_backfill.csv`.