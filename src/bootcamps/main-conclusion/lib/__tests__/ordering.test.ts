/**
 * Module ordering smoke tests (A.4).
 * Simulator has no gate drill — it is always accessible.
 */

import { describe, it, expect } from 'vitest';
import { unlockNext, INITIAL_UNLOCKED_ROUTES, ROUTE_REQUIREMENTS } from '@/bootcamps/main-conclusion/lib/ordering';

const blank = () => ({
  unlocked_routes: [...INITIAL_UNLOCKED_ROUTES],
  completed_lessons: [],
  completed_drills: [],
});

describe('module ordering', () => {
  it('preview-mode initial unlocks seed every module surface (review-mode bypass per CLAUDE.md)', () => {
    expect(INITIAL_UNLOCKED_ROUTES).toContain('/lessons/1.1');
    expect(INITIAL_UNLOCKED_ROUTES).toContain('/reference');
    expect(INITIAL_UNLOCKED_ROUTES).toContain('/drills');
    // Simulator is always accessible — no gate drill.
    expect(INITIAL_UNLOCKED_ROUTES).toContain('/simulator');
    expect(INITIAL_UNLOCKED_ROUTES).toContain('/simulator/bank');
  });

  it('no simulator routes have a drill blocker', () => {
    for (const route of ['/simulator', '/simulator/bank', '/simulator/trap-master', '/simulator/hard-mode']) {
      expect(ROUTE_REQUIREMENTS[route]).toBeUndefined();
    }
  });

  it('completing lesson 1.N unlocks lesson 1.N+1, not the simulator', () => {
    const additions = unlockNext('/lessons/1.5', blank());
    expect(additions).toEqual(['/lessons/1.6']);
    expect(additions).not.toContain('/simulator');
  });

  it('completing lesson 1.12 unlocks nothing further inside lessons', () => {
    expect(unlockNext('/lessons/1.12', blank())).toEqual([]);
  });

  it('completing any drill does NOT unlock simulator routes (no gate)', () => {
    for (const drill of ['/drills/3.1', '/drills/3.2', '/drills/3.3', '/drills/3.4', '/drills/3.5']) {
      const additions = unlockNext(drill, blank());
      expect(additions).not.toContain('/simulator');
      expect(additions).not.toContain('/simulator/bank');
    }
  });

  it('unlockNext is pure — no mutation of input', () => {
    const progress = blank();
    const before = JSON.stringify(progress);
    unlockNext('/drills/3.1', progress);
    expect(JSON.stringify(progress)).toBe(before);
  });
});
