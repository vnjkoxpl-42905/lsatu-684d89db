import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AdaptiveEngine,
  SMART_DRILL_SELECTOR_WEIGHTS,
  type AttemptRecord,
  type StudentAbility,
} from './adaptiveEngine';
import type { LRQuestion } from './questionLoader';

type AttemptRow = {
  qid: string;
  correct: boolean;
  time_ms: number;
  qtype: string;
  level: number;
  timestamp_iso: string;
};

let mockAttemptsRows: AttemptRow[] | null = [];
let mockAttemptsError: { message: string } | null = null;
let mockQueryCount = 0;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      mockQueryCount += 1;
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: () => Promise.resolve({ data: mockAttemptsRows, error: mockAttemptsError }),
      };
      return builder;
    },
  },
}));

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

beforeEach(() => {
  mockAttemptsRows = [];
  mockAttemptsError = null;
  mockQueryCount = 0;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

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

// ─── DB hydration ────────────────────────────────────────────────────────────

describe('AdaptiveEngine.hydration', () => {
  it('waits for hydrated historical attempts before adaptive selection builds a profile', async () => {
    mockAttemptsRows = [
      {
        qid: 'historic-flaw',
        correct: false,
        time_ms: 70000,
        qtype: 'Flaw',
        level: 4,
        timestamp_iso: '2024-01-01T00:00:00.000Z',
      },
    ];
    const engine = new AdaptiveEngine();

    expect(engine.getHydrationStatus()).toBe('idle');
    await engine.ensureHydratedFromDB('class-1');

    expect(engine.getHydrationStatus()).toBe('ready');
    expect(engine.getRecentAttempts()).toEqual([
      expect.objectContaining({
        qid: 'historic-flaw',
        qtype: 'Flaw',
        difficulty: 4,
        correct: false,
      }),
    ]);
  });

  it('does not accidentally cold-start the first profile when DB history is available', async () => {
    mockAttemptsRows = Array.from({ length: 16 }, (_, i) => ({
      qid: `historic-${i}`,
      correct: i % 2 === 0,
      time_ms: 60000 + i,
      qtype: 'Necessary Assumption',
      level: 3,
      timestamp_iso: new Date(2024, 0, i + 1).toISOString(),
    }));
    const engine = new AdaptiveEngine();

    await engine.ensureHydratedFromDB('class-1');
    const profile = engine.buildStudentProfile(engine.getRecentAttempts());

    expect(profile.attemptCount).toBe(16);
    expect(profile.dataMode).toBe('warm');
    expect(profile.byQType['Necessary Assumption'].attempts).toBe(16);
  });

  it('shares an in-flight hydration promise so selection cannot race duplicate DB reads', async () => {
    mockAttemptsRows = [];
    const engine = new AdaptiveEngine();

    await Promise.all([
      engine.ensureHydratedFromDB('class-1'),
      engine.ensureHydratedFromDB('class-1'),
    ]);

    expect(mockQueryCount).toBe(1);
    expect(engine.getHydrationStatus()).toBe('ready');
  });

  it('marks hydration failed and retries on the next Smart Drill launch', async () => {
    mockAttemptsRows = null;
    mockAttemptsError = { message: 'network down' };
    const engine = new AdaptiveEngine();

    await engine.ensureHydratedFromDB('class-1');

    expect(engine.getHydrationStatus()).toBe('failed');
    expect(engine.getRecentAttempts()).toEqual([]);

    mockAttemptsRows = [];
    mockAttemptsError = null;
    await engine.ensureHydratedFromDB('class-1');

    expect(mockQueryCount).toBe(2);
    expect(engine.getHydrationStatus()).toBe('ready');
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
  it('keeps selector weights stable and centralized', () => {
    expect(SMART_DRILL_SELECTOR_WEIGHTS).toEqual({
      weaknessFit: 0.4,
      difficultyFit: 0.3,
      freshness: 0.15,
      variety: 0.1,
      metadataQuality: 0.05,
    });
  });

  it('samples equally useful cold-start questions instead of always taking bank order', () => {
    const engine = new AdaptiveEngine();
    const profile = engine.buildStudentProfile([]);
    const pool = [
      makeQuestion({ qid: 'bank-first' }),
      makeQuestion({ qid: 'bank-second' }),
    ];

    const selected = engine.selectSmartDrillQuestion(pool, profile, {
      attempts: [],
      currentSessionUsedQids: new Set(),
      recentExposureQids: new Set(),
      random: () => 0,
    });

    expect(selected?.question.qid).toBe('bank-second');
  });

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

  it('lets the caller-provided pool decide whether an older missed question may return', () => {
    const engine = new AdaptiveEngine();
    const attempts = [
      makeAttempt({ qid: 'missed-now', correct: false, timestamp: new Date('2024-01-04') }),
    ];
    const profile = engine.buildStudentProfile(attempts);
    const pool = [
      makeQuestion({ qid: 'missed-now' }),
      makeQuestion({ qid: 'fresh' }),
    ];

    const selected = engine.selectSmartDrillQuestion(pool, profile, {
      attempts,
      currentSessionUsedQids: new Set(),
      recentExposureQids: new Set(),
      random: () => 1,
    });

    expect(selected?.question.qid).toBe('missed-now');
  });

  it('never selects current-session qids or recently exposed questions', () => {
    const engine = new AdaptiveEngine();
    const attempts = [
      makeAttempt({ qid: 'correct-now', correct: true, timestamp: new Date('2024-01-03') }),
    ];
    const profile = engine.buildStudentProfile(attempts);
    const pool = [
      makeQuestion({ qid: 'used-this-session' }),
      makeQuestion({ qid: 'correct-now' }),
      makeQuestion({ qid: 'fresh' }),
    ];

    const selected = engine.selectSmartDrillQuestion(pool, profile, {
      attempts,
      currentSessionUsedQids: new Set(['used-this-session']),
      recentExposureQids: new Set(['correct-now']),
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
