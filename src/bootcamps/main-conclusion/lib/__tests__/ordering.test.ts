/**
 * Module ordering smoke tests (A.4).
 * Asserts the G2.DRL-3.4 architectural constraint: Drill 3.4 completion is the
 * unlock signal for /simulator/*; no other surface flips that bit.
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
    // Preview mode: simulator surfaces are seeded (LockedRoute also bypasses gates via BOOTCAMP_PREVIEW_OPEN).
    expect(INITIAL_UNLOCKED_ROUTES).toContain('/simulator');
    expect(INITIAL_UNLOCKED_ROUTES).toContain('/simulator/bank');
  });

  it('every /simulator/* route requires Drill 3.4', () => {
    for (const route of ['/simulator', '/simulator/bank', '/simulator/trap-master', '/simulator/hard-mode']) {
      expect(ROUTE_REQUIREMENTS[route]?.blocker).toBe('MC-DRL-3.4');
    }
  });

  it('completing lesson 1.N unlocks lesson 1.N+1, not the simulator', () => {
    const additions = unlockNext('/lessons/1.5', blank());
    expect(additions).toEqual(['/lessons/1.6']);
    expect(additions).not.toContain('/simulator');
  });

  it('completing lesson 1.13 unlocks nothing further (capstone is the last lesson)', () => {
    expect(unlockNext('/lessons/1.13', blank())).toEqual([]);
  });

  it('completing /drills/3.4 unlocks all four simulator routes (and only those)', () => {
    const additions = unlockNext('/drills/3.4', blank());
    expect(additions.sort()).toEqual(
      ['/simulator', '/simulator/bank', '/simulator/hard-mode', '/simulator/trap-master'].sort(),
    );
  });

  it('completing any drill OTHER than 3.4 does NOT unlock the simulator', () => {
    for (const drill of ['/drills/3.1', '/drills/3.2', '/drills/3.3', '/drills/3.5', '/drills/3.6', '/drills/3.7', '/drills/3.8', '/drills/3.9']) {
      const additions = unlockNext(drill, blank());
      expect(additions).not.toContain('/simulator');
      expect(additions).not.toContain('/simulator/bank');
    }
  });

  it('unlockNext is pure — no mutation of input', () => {
    const progress = blank();
    const before = JSON.stringify(progress);
    unlockNext('/drills/3.4', progress);
    expect(JSON.stringify(progress)).toBe(before);
  });
});
