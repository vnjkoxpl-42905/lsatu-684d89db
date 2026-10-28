import { describe, it, expect } from 'vitest';
import { unlockNext, INITIAL_UNLOCKED_ROUTES, ROUTE_REQUIREMENTS } from '@/bootcamps/main-conclusion/lib/ordering';

const blank = () => ({
  unlocked_routes: [...INITIAL_UNLOCKED_ROUTES],
  completed_lessons: [],
  completed_drills: [],
});

describe('module ordering', () => {
  it('starts a new student on learning and drill surfaces, with simulator locked', () => {
    expect(INITIAL_UNLOCKED_ROUTES).toContain('/lessons/1.1');
    expect(INITIAL_UNLOCKED_ROUTES).toContain('/reference');
    expect(INITIAL_UNLOCKED_ROUTES).toContain('/drills');
    expect(INITIAL_UNLOCKED_ROUTES).not.toContain('/simulator');
    expect(INITIAL_UNLOCKED_ROUTES).not.toContain('/simulator/bank');
  });

  it('simulator routes are blocked by completion of the live drill path', () => {
    for (const route of ['/simulator', '/simulator/bank', '/simulator/trap-master', '/simulator/hard-mode']) {
      expect(ROUTE_REQUIREMENTS[route]).toMatchObject({
        blocker: 'MC-DRL-CT',
      });
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

  it('completing early drills does not unlock simulator routes', () => {
    for (const drill of ['/drills/main-conclusion-lab', '/drills/first-sentence-vs-rebuttal-lab']) {
      const additions = unlockNext(drill, blank());
      expect(additions).not.toContain('/simulator');
      expect(additions).not.toContain('/simulator/bank');
    }
  });

  it('completing the final live intro drill unlocks simulator routes', () => {
    expect(unlockNext('/drills/conclusion-type-lab', blank())).toEqual([
      '/simulator',
      '/simulator/bank',
      '/simulator/trap-master',
      '/simulator/answer-key-views',
      '/simulator/hard-mode',
    ]);
  });

  it('unlockNext is pure — no mutation of input', () => {
    const progress = blank();
    const before = JSON.stringify(progress);
    unlockNext('/drills/main-conclusion-lab', progress);
    expect(JSON.stringify(progress)).toBe(before);
  });
});
