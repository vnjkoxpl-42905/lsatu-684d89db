import { describe, it, expect } from 'vitest';
import {
  LEVEL_BANDS,
  STUDENT_LEVELS,
  bandMidpoint,
  coerceStudentLevel,
  describeBand,
  isInBand,
  isStudentLevel,
  levelBand,
} from './studentLevel';

describe('studentLevel', () => {
  it('defines the three agreed bands, overlapping', () => {
    expect(LEVEL_BANDS.beginner).toEqual({ min: 1, max: 3 });
    expect(LEVEL_BANDS.intermediate).toEqual({ min: 2, max: 4 });
    expect(LEVEL_BANDS.advanced).toEqual({ min: 3, max: 5 });
  });

  it('covers the whole 1-5 scale with no gap between bands', () => {
    const covered = new Set<number>();
    for (const level of STUDENT_LEVELS) {
      const { min, max } = LEVEL_BANDS[level];
      for (let d = min; d <= max; d++) covered.add(d);
    }
    expect([...covered].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('recognises only the exact lowercase level strings', () => {
    expect(isStudentLevel('beginner')).toBe(true);
    expect(isStudentLevel('Beginner')).toBe(false);
    expect(isStudentLevel('BEGINNER')).toBe(false);
    expect(isStudentLevel('expert')).toBe(false);
    expect(isStudentLevel(1)).toBe(false);
    expect(isStudentLevel(null)).toBe(false);
    expect(isStudentLevel(undefined)).toBe(false);
  });

  it('coerces to the fallback rather than guessing', () => {
    expect(coerceStudentLevel('advanced', null)).toBe('advanced');
    expect(coerceStudentLevel('Advanced', null)).toBe(null);
    expect(coerceStudentLevel(null, null)).toBe(null);
    expect(coerceStudentLevel(undefined, 'beginner')).toBe('beginner');
  });

  it('reports band membership, and never counts a non-finite difficulty', () => {
    const band = levelBand('beginner');
    expect(isInBand(1, band)).toBe(true);
    expect(isInBand(3, band)).toBe(true);
    expect(isInBand(4, band)).toBe(false);
    // The bank has one question with a null difficulty. Raw numeric comparison
    // would let it pass every filter; this must not.
    expect(isInBand(null, band)).toBe(false);
    expect(isInBand(undefined, band)).toBe(false);
    expect(isInBand(NaN, band)).toBe(false);
    expect(isInBand('2' as unknown, band)).toBe(false);
  });

  it('computes band midpoints for nearness ranking', () => {
    expect(bandMidpoint(LEVEL_BANDS.beginner)).toBe(2);
    expect(bandMidpoint(LEVEL_BANDS.intermediate)).toBe(3);
    expect(bandMidpoint(LEVEL_BANDS.advanced)).toBe(4);
  });

  it('describes a band for the UI', () => {
    expect(describeBand({ min: 1, max: 3 })).toBe('difficulty 1-3');
    expect(describeBand({ min: 5, max: 5 })).toBe('difficulty 5');
  });
});
