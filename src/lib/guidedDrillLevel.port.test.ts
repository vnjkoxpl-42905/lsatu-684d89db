import { describe, it, expect } from 'vitest';
import { resolveLeveledDrillQids as appResolve } from './guidedDrillLevel';
import { resolveLeveledDrillQids as nodeResolve } from '../../scripts/lib/drill-level.mjs';
import type { LRQuestion } from '@/lib/questionLoader';
import type { QuestionStat } from '@/lib/questionStats';
import type { StudentLevel } from '@/lib/studentLevel';

/**
 * scripts/lib/drill-level.mjs is a hand port, for the same reason
 * drill-launch.mjs is: local Node tooling cannot import the app's TypeScript
 * through Vite's aliases.
 *
 * The stakes are higher here than for the template port. This one decides
 * WHICH QUESTIONS a student gets, so a drift means a drill assigned from the
 * terminal holds different questions from one assigned through the teacher UI,
 * with nothing on either side to notice. Both implementations run over the
 * same pools with the same seeded rng, and any divergence fails.
 */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const q = (qid: string, difficulty: number | null) => ({ qid, difficulty }) as unknown as LRQuestion;

const stat = (correctPct: number, topTrapTag: string | null, trapSpread = 0.6) =>
  ({ correctPct, topTrapTag, trapSpread }) as QuestionStat;

const LEVELS: (StudentLevel | null)[] = [null, 'beginner', 'intermediate', 'advanced'];
const TRAPS = ['Too Strong', 'Out Of Scope', 'Irrelevant Comparison', null];

function pools() {
  const shapes: [string, (number | null)[]][] = [
    ['full-range', [1, 2, 3, 4, 5]],
    ['clamped-1-3', [1, 2, 3]],
    ['clamped-3-5', [3, 4, 5]],
    ['single-3', [3]],
    ['with-nulls', [1, 2, null, 4, null]],
    ['edges', [1, 5]],
  ];
  const out: { label: string; pool: LRQuestion[] }[] = [];
  for (const [name, difficulties] of shapes) {
    for (const size of [1, 4, 12, 40]) {
      out.push({
        label: `${name}/${size}`,
        pool: Array.from({ length: size }, (_, i) =>
          q(`${name}-q${i}`, difficulties[i % difficulties.length]),
        ),
      });
    }
  }
  return out;
}

function statsFor(pool: LRQuestion[]) {
  return new Map<string, QuestionStat>(
    pool.map((question, i) => [
      question.qid,
      stat(50 + ((i * 7) % 45), TRAPS[i % TRAPS.length], ((i % 10) + 1) / 10),
    ]),
  );
}

describe('drill-level.mjs is a faithful port of guidedDrillLevel.ts', () => {
  it('agrees on the default path, which is the one that runs today', () => {
    const diverged: string[] = [];
    let seed = 1;
    for (const { label, pool } of pools()) {
      for (const level of LEVELS) {
        for (const questionCount of [null, 1, 5, 20]) {
          const input = { pool, level, questionCount };
          const a = appResolve({ ...input, rng: mulberry32(seed) });
          const b = nodeResolve({ ...input, rng: mulberry32(seed) });
          seed++;
          if (JSON.stringify(a) !== JSON.stringify(b)) {
            diverged.push(`${label} ${level} ${questionCount}`);
          }
        }
      }
    }
    expect(diverged).toEqual([]);
  });

  it('agrees with trap targeting and empirical weighting turned on', () => {
    const diverged: string[] = [];
    let seed = 5000;
    for (const { label, pool } of pools()) {
      const stats = statsFor(pool);
      for (const level of LEVELS) {
        for (const trapWeight of [0, 0.5, 1]) {
          for (const empiricalWeight of [0, 0.5, 1]) {
            const input = {
              pool,
              level,
              questionCount: 5,
              stats,
              targetTrapTags: ['Too Strong'],
              trapWeight,
              empiricalWeight,
            };
            const a = appResolve({ ...input, rng: mulberry32(seed) });
            const b = nodeResolve({ ...input, rng: mulberry32(seed) });
            seed++;
            if (JSON.stringify(a) !== JSON.stringify(b)) {
              diverged.push(`${label} ${level} trap=${trapWeight} emp=${empiricalWeight}`);
            }
          }
        }
      }
    }
    expect(diverged).toEqual([]);
  });

  it('agrees on a pinned list, including the warning', () => {
    const pool = pools()[3].pool;
    const pinned = [pool[0].qid, pool[1].qid];
    const known = new Set(pool.map((p) => p.qid));
    for (const level of LEVELS) {
      const input = { pool, level, assignmentQids: pinned, knownQids: known };
      expect(JSON.stringify(nodeResolve({ ...input, rng: mulberry32(9) }))).toBe(
        JSON.stringify(appResolve({ ...input, rng: mulberry32(9) })),
      );
    }
  });
});
