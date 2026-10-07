import { describe, expect, it } from 'vitest';
import { parseExplanationFile } from '../../../scripts/knowledge/parse-lr-explanations.mjs';

const file = (breakdown: string) => `# PrepTest 999 explanations

## S1 · Q1 — Flaw

**Correct answer:** A

### Stimulus

Some stimulus.

### Prompt

Some prompt.

### Written (single style)

**Argument breakdown**

${breakdown}

**Answer choices**
**A. First choice** — Correct (60% of students)
Why A is right.

**B. Second choice** — Out of Scope (10% of students)
Why B is wrong.

**C. Third choice** — Out of Scope (10% of students)
Why C is wrong.

**D. Fourth choice** — Out of Scope (10% of students)
Why D is wrong.

**E. Fifth choice** — Out of Scope (10% of students)
Why E is wrong.
`;

const labels = (md: string) =>
  parseExplanationFile(md, 'PT999-explanations.md').questions[0].explanations[0].steps.map(
    (s: { label: string }) => s.label,
  );

describe('argument breakdown layouts', () => {
  it('reads the italic-label layout (PT154)', () => {
    const md = file(`*Rhett's Claims*
1. Otto gives me a ride.
2. I shouldn't have to pay.

*Evaluate:* Barbara disputes claim #2.

*Goal:* Find an answer about claim #2.`);
    expect(labels(md)).toEqual(["Rhett's Claims", 'Evaluate', 'Goal']);
  });

  it('keeps italic cues inside a bold-layout step as step text', () => {
    const md = file(`- **Conclusion:** Most students care.
*rephrase:* They do care.
- **Evaluate:** Check the sample.
*Given that* ... the sample is biased,`);
    expect(labels(md)).toEqual(['Conclusion', 'Evaluate']);
  });
});
