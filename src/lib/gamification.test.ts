import { describe, it, expect } from 'vitest';
import { getLevelThreshold, calculateLevel, getLevelProgress } from './gamification';

// Pure XP/level math (M151). calculateXP is DB-driven and covered elsewhere;
// these cover the deterministic progression curve so a silent regression in the
// threshold tiers (which drive every level-up in the UI) is caught.

describe('getLevelThreshold', () => {
  it('is strictly positive and non-decreasing across the tier boundaries', () => {
    let prev = 0;
    for (let level = 1; level <= 80; level++) {
      const t = getLevelThreshold(level);
      expect(t).toBeGreaterThan(0);
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });

  it('matches the documented tier formulas at the boundaries', () => {
    expect(getLevelThreshold(1)).toBe(100); // 100 * level
    expect(getLevelThreshold(10)).toBe(1000);
    expect(getLevelThreshold(11)).toBe(1200); // 1000 + (11-10)*200
    expect(getLevelThreshold(25)).toBe(4000); // 1000 + 15*200
    expect(getLevelThreshold(26)).toBe(4500); // 4000 + (26-25)*500
    expect(getLevelThreshold(50)).toBe(16500); // 4000 + 25*500
    expect(getLevelThreshold(51)).toBe(17500); // 16500 + (51-50)*1000
  });
});

describe('calculateLevel', () => {
  it('starts everyone at level 1 with zero XP', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('crosses to level 2 exactly at the level-1 threshold, not before', () => {
    expect(calculateLevel(getLevelThreshold(1) - 1)).toBe(1);
    expect(calculateLevel(getLevelThreshold(1))).toBe(2);
  });

  it('is monotonic in total XP (more XP never means a lower level)', () => {
    let prevLevel = 1;
    for (let xp = 0; xp <= 30000; xp += 137) {
      const level = calculateLevel(xp);
      expect(level).toBeGreaterThanOrEqual(prevLevel);
      prevLevel = level;
    }
  });

  it('agrees with the cumulative threshold sum (a level needs the sum of all prior thresholds)', () => {
    let cumulative = 0;
    for (let level = 1; level <= 40; level++) {
      // Just below this level's cumulative cost => still the current level.
      expect(calculateLevel(cumulative + getLevelThreshold(level) - 1)).toBe(level);
      cumulative += getLevelThreshold(level);
      // Exactly at the cumulative cost => next level.
      expect(calculateLevel(cumulative)).toBe(level + 1);
    }
  });
});

describe('getLevelProgress', () => {
  it('reports zero progress at the start of a level', () => {
    const xpForLevel2Start = getLevelThreshold(1);
    const p = getLevelProgress(xpForLevel2Start, 2);
    expect(p.current).toBe(0);
    expect(p.required).toBe(getLevelThreshold(2));
    expect(p.percentage).toBe(0);
  });

  it('reports partial progress within a level', () => {
    const xpForLevel2Start = getLevelThreshold(1);
    const p = getLevelProgress(xpForLevel2Start + 50, 2);
    expect(p.current).toBe(50);
    expect(p.required).toBe(getLevelThreshold(2));
    expect(p.percentage).toBeCloseTo((50 / getLevelThreshold(2)) * 100);
  });

  it('caps percentage at 100 even when XP overflows the level', () => {
    const p = getLevelProgress(1_000_000, 3);
    expect(p.percentage).toBeLessThanOrEqual(100);
  });
});
