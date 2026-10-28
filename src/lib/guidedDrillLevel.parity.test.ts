import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { resolveLeveledDrillQids } from './guidedDrillLevel';
import type { LRQuestion } from '@/lib/questionLoader';
import type { StudentLevel } from '@/lib/studentLevel';

/**
 * The hard invariant behind percentage-aware selection: with `stats` absent or
 * both weights at zero, every draw is byte-identical to the draw before that
 * feature existed.
 *
 * This spec is the proof, and it has to be written BEFORE the ranking lands or
 * it proves nothing — a snapshot taken after the change would happily bless
 * the change. The digest below was recorded against the pre-ranking
 * implementation. If it moves, the default path moved, whatever the reason.
 *
 * It is deliberately a digest of 50 pools rather than 50 assertions. The
 * failure it exists to catch is "something shifted somewhere", and a single
 * changed qid in pool 37 must fail as loudly as a rewritten algorithm.
 */

/** Seeded rng. Deterministic across machines and Node versions, unlike Math.random. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function question(qid: string, difficulty: number | null): LRQuestion {
  // Only the two fields the resolver reads. The bank's other 20 are noise here.
  return { qid, difficulty } as unknown as LRQuestion;
}

const LEVELS: (StudentLevel | null)[] = [null, 'beginner', 'intermediate', 'advanced'];

/**
 * 50 pools spanning what the library actually contains: tiny pools that cannot
 * fill a drill, pools clamped to one difficulty, pools with null difficulties,
 * and pools far larger than any question count.
 */
function pools(): { label: string; pool: LRQuestion[] }[] {
  const out: { label: string; pool: LRQuestion[] }[] = [];
  const shapes: [string, number[]][] = [
    ['full-range', [1, 2, 3, 4, 5]],
    ['clamped-1-3', [1, 2, 3]],
    ['clamped-3-5', [3, 4, 5]],
    ['single-3', [3]],
    ['single-5', [5]],
    ['edges-only', [1, 5]],
    ['with-nulls', [1, 2, null as unknown as number, 4, null as unknown as number]],
    ['mid-heavy', [2, 3, 3, 3, 4]],
    ['null-only', [null as unknown as number]],
    ['sparse-4', [4]],
  ];
  const sizes = [1, 3, 7, 26, 120];
  for (const [name, difficulties] of shapes) {
    for (const size of sizes) {
      const pool: LRQuestion[] = [];
      for (let i = 0; i < size; i++) {
        pool.push(question(`${name}-q${i}`, difficulties[i % difficulties.length]));
      }
      out.push({ label: `${name}/${size}`, pool });
    }
  }
  return out;
}

/**
 * Everything the resolution promises, flattened. Not just the qids: a change
 * that kept the same questions but renumbered inBandCount would still be a
 * change to what the assign sheet shows.
 */
function fingerprint(): string {
  const lines: string[] = [];
  const cases = pools();
  let seed = 1;
  for (const { label, pool } of cases) {
    for (const level of LEVELS) {
      for (const questionCount of [null, 1, 5, 10, 40]) {
        const r = resolveLeveledDrillQids({
          pool,
          level,
          questionCount,
          rng: mulberry32(seed++),
        });
        lines.push(
          [
            label,
            level ?? 'none',
            questionCount ?? 'default',
            r.source,
            r.poolCount,
            r.inBandCount,
            r.outOfBandUsed,
            r.warning ?? '-',
            r.qids.join('|'),
          ].join(','),
        );
      }
    }
  }
  return createHash('sha256').update(lines.join('\n')).digest('hex');
}

describe('resolveLeveledDrillQids default-path parity', () => {
  it('covers 50 pools across every level and question count', () => {
    expect(pools()).toHaveLength(50);
  });

  it('is byte-identical to the pre-ranking implementation', () => {
    // Recorded 2026-08-04, before questionSelectionSignals existed.
    expect(fingerprint()).toBe('1e44025be211340beb6466c31e278ade40e7fdbcc90e626a146966ce285604e0');
  });

  it('is stable across repeated runs', () => {
    expect(fingerprint()).toBe(fingerprint());
  });
});
