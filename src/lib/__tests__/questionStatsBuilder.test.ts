import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// The builder is a Node script, not app code — it is imported here because the
// vitest glob is src/**, and these invariants are worth more than tidy layout.
import {
  baseTrapTag,
  empiricalDifficultyFromPct,
} from '../../../scripts/knowledge/build-question-stats.mjs';
import { parseExplanationFile } from '../../../scripts/knowledge/parse-lr-explanations.mjs';

/**
 * A question printed in all three LSAT Lab styles. The choice block repeats
 * once per style with identical percentages, which is the trap this fixture
 * exists to pin: the result must be five choices, not fifteen.
 *
 * It also carries the second trap — the credited answer (C) is tagged
 * "Weakens", not "Correct", and choice A *is* tagged "Correct answer bait".
 * Anything reading the tag instead of the `**Correct answer:**` line gets A.
 */
const THREE_STYLE_FIXTURE = `# PrepTest 999 — Explanations

# Section 1 (Logical Reasoning)

## S1 · Q1 — Flaw

**Correct answer:** C

### Stimulus
Some stimulus text.

### Prompt
Which one of the following?

### Standard
**Answer choices**

**A. First choice.** — Correct answer bait (12% of students)

Prose about A.

**B. Second choice.** — Too Strong: must / ensure (9% of students)

**C. Third choice.** — Weakens (61% of students)

**D. Fourth choice.** — Out Of Scope: primary / secondary (11% of students)

**E. Fifth choice.** — No Impact (7% of students)

### Brief
**Answer choices**

**A. First choice.** — Correct answer bait (12% of students)

**B. Second choice.** — Too Strong: must / ensure (9% of students)

**C. Third choice.** — Weakens (61% of students)

**D. Fourth choice.** — Out Of Scope: primary / secondary (11% of students)

**E. Fifth choice.** — No Impact (7% of students)

### Another Way
**Answer choices**

**A. First choice.** — Correct answer bait (12% of students)

**B. Second choice.** — Too Strong: must / ensure (9% of students)

**C. Third choice.** — Weakens (61% of students)

**D. Fourth choice.** — Out Of Scope: primary / secondary (11% of students)

**E. Fifth choice.** — No Impact (7% of students)
`;

describe('empiricalDifficultyFromPct', () => {
  it('returns the calibration anchors', () => {
    expect(empiricalDifficultyFromPct(91.7)).toBe(1);
    expect(empiricalDifficultyFromPct(84.4)).toBe(2);
    expect(empiricalDifficultyFromPct(75.2)).toBe(3);
    expect(empiricalDifficultyFromPct(66.4)).toBe(4);
    expect(empiricalDifficultyFromPct(54.0)).toBe(5);
  });

  it('clamps outside the measured range', () => {
    expect(empiricalDifficultyFromPct(100)).toBe(1);
    expect(empiricalDifficultyFromPct(3)).toBe(5);
  });

  it('is monotonically non-decreasing as accuracy falls', () => {
    let prev = 0;
    for (let pct = 100; pct >= 0; pct -= 1) {
      const d = empiricalDifficultyFromPct(pct);
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
  });

  it('interpolates between anchors', () => {
    const mid = empiricalDifficultyFromPct((84.4 + 75.2) / 2);
    expect(mid).toBeGreaterThan(2);
    expect(mid).toBeLessThan(3);
  });
});

describe('baseTrapTag', () => {
  it('takes everything before the colon', () => {
    expect(baseTrapTag('Too Strong: must / ensure')).toBe('Too Strong');
    expect(baseTrapTag('Out of Scope: primary / secondary')).toBe('Out Of Scope');
  });

  it('folds casing variants together', () => {
    expect(baseTrapTag('Out Of Scope')).toBe(baseTrapTag('Out of Scope'));
  });

  it('passes through an untagged choice', () => {
    expect(baseTrapTag(null)).toBeNull();
    expect(baseTrapTag('')).toBeNull();
  });
});

describe('a three-style question', () => {
  const parsed = parseExplanationFile(THREE_STYLE_FIXTURE, 'PT999-explanations.md');
  const q = parsed.questions[0];

  it('parses without skips', () => {
    expect(parsed.skipped).toEqual([]);
    expect(parsed.questions).toHaveLength(1);
  });

  it('yields exactly one entry per letter, not one per style', () => {
    expect(q.choices).toHaveLength(5);
    expect(q.choices.map((c) => c.letter)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('takes the correct answer from the stated line, never from a tag', () => {
    expect(q.correctChoice).toBe('C');
    // The decoy: A is the one tagged with the word "Correct".
    expect(q.choices.find((c) => c.letter === 'A')?.tag).toMatch(/Correct/);
  });

  it('carries a percentage on every choice', () => {
    for (const c of q.choices) expect(Number.isFinite(c.percent)).toBe(true);
  });
});

describe('the generated sidecar', () => {
  const file = path.resolve('public/data/question-stats.json');
  const raw = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;

  it('exists — run scripts/knowledge/build-question-stats.mjs if this fails', () => {
    expect(raw).not.toBeNull();
  });

  it('never publishes a question whose percentages do not sum to ~100', () => {
    const bad: string[] = [];
    for (const [qid, s] of Object.entries(raw.q)) {
      const stat = s as { p: Record<string, number> };
      const sum = Object.values(stat.p).reduce((a, b) => a + b, 0);
      if (sum < 95 || sum > 105) bad.push(`${qid}=${sum}`);
    }
    expect(bad).toEqual([]);
  });

  it('always has the correct letter present among the choice percentages', () => {
    const bad: string[] = [];
    for (const [qid, s] of Object.entries(raw.q)) {
      const stat = s as { c: string; p: Record<string, number> };
      if (!(stat.c in stat.p)) bad.push(qid);
    }
    expect(bad).toEqual([]);
  });

  it('never names the correct choice as the top trap', () => {
    const bad: string[] = [];
    for (const [qid, s] of Object.entries(raw.q)) {
      const stat = s as { c: string; tl: string | null };
      if (stat.tl && stat.tl === stat.c) bad.push(qid);
    }
    expect(bad).toEqual([]);
  });

  it('keeps trap spread a fraction of the wrong mass', () => {
    for (const s of Object.values(raw.q)) {
      const stat = s as { ts: number };
      expect(stat.ts).toBeGreaterThanOrEqual(0);
      expect(stat.ts).toBeLessThanOrEqual(1.001);
    }
  });

  it('reports coverage rather than implying it is complete', () => {
    expect(raw.coverage.bankWithoutStats).toBeGreaterThan(0);
    expect(raw.coverage.statsAndBank).toBeLessThan(raw.coverage.bankQuestions);
  });
});
