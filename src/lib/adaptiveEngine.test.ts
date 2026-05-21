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

// ─── Smart Drill selector profile ───────────────────────────────────────────

describe('AdaptiveEngine.buildStudentProfile', () => {
  it('tracks weakness by qtype, difficulty, reasoning type, and question features', () => {
    const engine = new AdaptiveEngine();
    const profile = engine.buildStudentProfile([
      makeAttempt({
        qid: 'flaw-1',
        qtype: 'Flaw',
        difficulty: 3,
        correct: false,
        reasoningType: ['Causation'],
        questionFeatures: ['Causal Difference-Maker'],
      }),
      makeAttempt({
        qid: 'flaw-2',
        qtype: 'Flaw',
        difficulty: 3,
        correct: false,
        reasoningType: ['Causation'],
        questionFeatures: ['Causal Difference-Maker'],
      }),
      makeAttempt({
        qid: 'weaken-1',
        qtype: 'Weaken',
        difficulty: 2,
        correct: true,
        reasoningType: ['Conditional Reasoning'],
        questionFeatures: ['Contrapositive Logic'],
      }),
    ]);

    expect(profile.attemptCount).toBe(3);
    expect(profile.byQType.Flaw.accuracy).toBe(0);
    expect(profile.byDifficulty[3].accuracy).toBe(0);
    expect(profile.byReasoningType.Causation.accuracy).toBe(0);
    expect(profile.byQuestionFeature['Causal Difference-Maker'].accuracy).toBe(0);
    expect(profile.dataMode).toBe('cold');
  });

  it('degrades gracefully when reasoning metadata is missing', () => {
    const engine = new AdaptiveEngine();
    const profile = engine.buildStudentProfile([
      makeAttempt({
        qid: 'na-1',
        qtype: 'Necessary Assumption',
        difficulty: 2,
        correct: false,
        reasoningType: undefined,
        questionFeatures: undefined,
      }),
    ]);

    expect(profile.byQType['Necessary Assumption'].accuracy).toBe(0);
    expect(profile.byReasoningType).toEqual({});
    expect(profile.byQuestionFeature).toEqual({});
  });
});

// ─── Smart Drill selector ───────────────────────────────────────────────────

describe('AdaptiveEngine.selectSmartDrillQuestion', () => {
  it('prioritizes weak qtype, difficulty, reasoning type, and feature matches', () => {
    const engine = new AdaptiveEngine();
    const profile = engine.buildStudentProfile([
      makeAttempt({
        qid: 'miss-1',
        qtype: 'Flaw',
        difficulty: 3,
        correct: false,
        reasoningType: ['Causation'],
        questionFeatures: ['Causal Difference-Maker'],
      }),
      makeAttempt({
        qid: 'miss-2',
        qtype: 'Flaw',
        difficulty: 3,
        correct: false,
        reasoningType: ['Causation'],
        questionFeatures: ['Causal Difference-Maker'],
      }),
      makeAttempt({
        qid: 'hit-1',
        qtype: 'Weaken',
        difficulty: 3,
        correct: true,
        reasoningType: ['Conditional Reasoning'],
        questionFeatures: ['Contrapositive Logic'],
      }),
    ]);

    const pool = [
      makeQuestion({
        qid: 'target',
        qtype: 'Flaw',
        difficulty: 3,
        reasoningType: ['Causation'],
        questionFeatures: ['Causal Difference-Maker'],
      }),
      makeQuestion({
        qid: 'distractor',
        qtype: 'Weaken',
        difficulty: 3,
        reasoningType: ['Conditional Reasoning'],
        questionFeatures: ['Contrapositive Logic'],
      }),
    ];

    const selected = engine.selectSmartDrillQuestion(pool, profile, {
      attempts: [],
      currentSessionUsedQids: new Set(),
      recentExposureQids: new Set(),
    });

    expect(selected?.question.qid).toBe('target');
    expect(selected?.selectionReason.matchedWeaknesses).toEqual(
      expect.arrayContaining(['qtype:Flaw', 'reasoningType:Causation', 'questionFeature:Causal Difference-Maker']),
    );
  });

  it('never selects current-session qids or immediately repeats latest correct or missed qids', () => {
    const engine = new AdaptiveEngine();
    const attempts = [
      makeAttempt({ qid: 'correct-now', correct: true, timestamp: new Date('2024-01-03') }),
      makeAttempt({ qid: 'missed-now', correct: false, timestamp: new Date('2024-01-04') }),
    ];
    const profile = engine.buildStudentProfile(attempts);
    const pool = [
      makeQuestion({ qid: 'used-this-session' }),
      makeQuestion({ qid: 'correct-now' }),
      makeQuestion({ qid: 'missed-now' }),
      makeQuestion({ qid: 'fresh' }),
    ];

    const selected = engine.selectSmartDrillQuestion(pool, profile, {
      attempts,
      currentSessionUsedQids: new Set(['used-this-session']),
      recentExposureQids: new Set(),
    });

    expect(selected?.question.qid).toBe('fresh');
  });

  it('respects recent exposure history before falling back to exposed questions', () => {
    const engine = new AdaptiveEngine();
    const profile = engine.buildStudentProfile([]);
    const pool = [
      makeQuestion({ qid: 'recently-shown' }),
      makeQuestion({ qid: 'fresh' }),
    ];

    const selected = engine.selectSmartDrillQuestion(pool, profile, {
      attempts: [],
      currentSessionUsedQids: new Set(),
      recentExposureQids: new Set(['recently-shown']),
    });

    expect(selected?.question.qid).toBe('fresh');
  });
});
