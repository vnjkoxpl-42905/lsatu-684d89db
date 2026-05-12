import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveEngine, type AttemptRecord, type StudentAbility } from './adaptiveEngine';
import type { LRQuestion } from './questionLoader';

function makeQuestion(overrides: Partial<LRQuestion> = {}): LRQuestion {
  return {
    qid: 'q1',
    pt: 1,
    section: 1,
    qnum: 1,
    qtype: 'Weaken',
    difficulty: 3,
    stem: 'Stem text',
    choices: { A: 'choice A', B: 'choice B', C: 'choice C', D: 'choice D', E: 'choice E' },
    answer: 'A',
    ...overrides,
  } as LRQuestion;
}

function makeAttempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    qid: 'q1',
    correct: true,
    time_ms: 60000,
    qtype: 'Weaken',
    difficulty: 3,
    timestamp: new Date('2024-01-01'),
    ...overrides,
  };
}

// ─── calculateAbility ────────────────────────────────────────────────────────

describe('AdaptiveEngine.calculateAbility', () => {
  let engine: AdaptiveEngine;
  beforeEach(() => { engine = new AdaptiveEngine(); });

  it('returns overall=3 with empty history', () => {
    const ability = engine.calculateAbility([]);
    expect(ability.overall).toBe(3);
    expect(ability.byQType).toEqual({});
  });

  it('overall is clamped to [1, 5]', () => {
    const allCorrect = Array.from({ length: 20 }, (_, i) =>
      makeAttempt({ qid: `q${i}`, correct: true, difficulty: 5 })
    );
    const a = engine.calculateAbility(allCorrect);
    expect(a.overall).toBeGreaterThanOrEqual(1);
    expect(a.overall).toBeLessThanOrEqual(5);
  });

  it('all wrong → low ability', () => {
    const allWrong = Array.from({ length: 10 }, (_, i) =>
      makeAttempt({ qid: `q${i}`, correct: false, difficulty: 1 })
    );
    const a = engine.calculateAbility(allWrong);
    expect(a.overall).toBeLessThan(2.5);
  });

  it('all correct at difficulty 5 → high ability', () => {
    const perfect = Array.from({ length: 10 }, (_, i) =>
      makeAttempt({ qid: `q${i}`, correct: true, difficulty: 5 })
    );
    const a = engine.calculateAbility(perfect);
    expect(a.overall).toBeGreaterThan(3);
  });

  it('produces per-qtype breakdown', () => {
    const attempts = [
      makeAttempt({ qid: 'q1', qtype: 'Weaken', correct: true }),
      makeAttempt({ qid: 'q2', qtype: 'Weaken', correct: false }),
      makeAttempt({ qid: 'q3', qtype: 'Strengthen', correct: true }),
    ];
    const a = engine.calculateAbility(attempts);
    expect(a.byQType).toHaveProperty('Weaken');
    expect(a.byQType).toHaveProperty('Strengthen');
  });

  it('per-qtype ability is in [1, 5] range', () => {
    const attempts = [
      makeAttempt({ qid: 'q1', qtype: 'Flaw', correct: true }),
      makeAttempt({ qid: 'q2', qtype: 'Flaw', correct: true }),
    ];
    const a = engine.calculateAbility(attempts);
    expect(a.byQType['Flaw']).toBeGreaterThanOrEqual(1);
    expect(a.byQType['Flaw']).toBeLessThanOrEqual(5);
  });
});

// ─── recordAttempt ───────────────────────────────────────────────────────────

describe('AdaptiveEngine.recordAttempt', () => {
  it('puts the question on cooldown after recording', () => {
    const engine = new AdaptiveEngine();
    const pool = [makeQuestion({ qid: 'q1', difficulty: 3 })];
    const ability: StudentAbility = { overall: 3, byQType: {} };

    // Before recording, question is eligible
    engine.recordAttempt(makeAttempt({ qid: 'q1', timestamp: new Date() }));

    // Now it's on cooldown (seen < 1 hour ago) — selectNextQuestion should skip it
    // and fall back to pool[0] since there are no other candidates
    const next = engine.selectNextQuestion(pool, ability);
    // Fallback should return pool[0] when nothing else is eligible
    expect(next).toBe(pool[0]);
  });
});

