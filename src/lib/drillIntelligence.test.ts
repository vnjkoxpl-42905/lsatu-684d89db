import { describe, it, expect, beforeEach, vi } from 'vitest';

// M151: recommendation shape + priority ordering + cold-start. drillIntelligence
// reads the attempts table; each public method's query chain terminates in
// .limit(), so the mock resolves there with the configured fixture.

let attemptsData: any[] | null = [];
let attemptsError: { message: string } | null = null;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const b: any = {
        select: () => b,
        eq: () => b,
        order: () => b,
        limit: () => Promise.resolve({ data: attemptsData, error: attemptsError }),
      };
      return b;
    },
  },
}));

import { drillIntelligence, type DrillRecommendation } from './drillIntelligence';

const PRIORITY_RANK = { high: 3, medium: 2, low: 1 } as const;

function makeAttempts(spec: Array<{ qtype: string; level: number; correct: boolean; n: number }>) {
  const rows: any[] = [];
  let i = 0;
  for (const s of spec) {
    for (let k = 0; k < s.n; k++) {
      rows.push({
        qtype: s.qtype,
        level: s.level,
        correct: s.correct,
        timestamp_iso: new Date(2026, 0, 1, 9, 0, i++).toISOString(),
      });
    }
  }
  return rows;
}

function assertShape(r: DrillRecommendation) {
  expect(typeof r.title).toBe('string');
  expect(typeof r.description).toBe('string');
  expect(['high', 'medium', 'low']).toContain(r.priority);
  expect(Array.isArray(r.config.qtypes)).toBe(true);
  expect(Array.isArray(r.config.difficulties)).toBe(true);
  expect(typeof r.config.count).toBe('number');
  expect(r.confidence).toBeGreaterThanOrEqual(0);
  expect(r.confidence).toBeLessThanOrEqual(1);
}

beforeEach(() => {
  attemptsData = [];
  attemptsError = null;
});

describe('generateRecommendations', () => {
  it('cold start (no attempts) returns a single high-priority Build Foundation rec', async () => {
    attemptsData = [];
    const recs = await drillIntelligence.generateRecommendations('u1');
    expect(recs).toHaveLength(1);
    expect(recs[0].title).toBe('Build Foundation');
    expect(recs[0].priority).toBe('high');
    expect(recs[0].config.count).toBe(15);
    assertShape(recs[0]);
  });

  it('falls back to Build Foundation with too few attempts (<15)', async () => {
    attemptsData = makeAttempts([{ qtype: 'Weaken', level: 3, correct: false, n: 10 }]);
    const recs = await drillIntelligence.generateRecommendations('u1');
    expect(recs).toHaveLength(1);
    expect(recs[0].title).toBe('Build Foundation');
  });

  it('falls back to Build Foundation when the query errors (error is not treated as data)', async () => {
    attemptsError = { message: 'boom' };
    attemptsData = null;
    const recs = await drillIntelligence.generateRecommendations('u1');
    expect(recs).toHaveLength(1);
    expect(recs[0].title).toBe('Build Foundation');
  });

  it('surfaces a weak question type as a high-priority rec and returns recs in non-increasing priority order', async () => {
    // 10 Weaken attempts at 30% accuracy (weak) + 10 Strengthen at 90% (strong).
    attemptsData = makeAttempts([
      { qtype: 'Weaken', level: 3, correct: true, n: 3 },
      { qtype: 'Weaken', level: 3, correct: false, n: 7 },
      { qtype: 'Strengthen', level: 3, correct: true, n: 9 },
      { qtype: 'Strengthen', level: 3, correct: false, n: 1 },
    ]);
    const recs = await drillIntelligence.generateRecommendations('u1');
    expect(recs.length).toBeGreaterThan(0);

    const weak = recs.find((r) => r.title === 'Target Weak Areas');
    expect(weak).toBeDefined();
    expect(weak!.priority).toBe('high');
    expect(weak!.config.qtypes).toContain('Weaken');
    expect(weak!.config.qtypes).not.toContain('Strengthen');

    // Sorted high -> low.
    for (let i = 1; i < recs.length; i++) {
      expect(PRIORITY_RANK[recs[i - 1].priority]).toBeGreaterThanOrEqual(PRIORITY_RANK[recs[i].priority]);
    }
    recs.forEach(assertShape);
  });
});

describe('detectPatterns', () => {
  it('returns no patterns below the minimum sample size (cold start)', async () => {
    attemptsData = makeAttempts([{ qtype: 'Weaken', level: 3, correct: true, n: 10 }]);
    const patterns = await drillIntelligence.detectPatterns('u1');
    expect(patterns).toEqual([]);
  });

  it('returns [] when the query errors', async () => {
    attemptsError = { message: 'boom' };
    attemptsData = null;
    const patterns = await drillIntelligence.detectPatterns('u1');
    expect(patterns).toEqual([]);
  });
});
