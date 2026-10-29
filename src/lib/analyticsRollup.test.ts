import { describe, it, expect } from 'vitest';
import { computeAnalyticsFromRollup, type AttemptRollupRow } from './analyticsRollup';

// The rollup RPC (attempt_accuracy_rollup) returns grouped counts; this suite
// pins the client-side reconstruction so the aggregates the Analytics page renders
// stay identical to the old fetch-all-attempts pass. COMPREHENSIVEAUDIT Phase 6.

const ROWS: AttemptRollupRow[] = [
  { qtype: 'Flaw', level: 3, bucket: 'current7d', total: 10, correct: 6 },
  { qtype: 'Flaw', level: 3, bucket: 'prev7d', total: 10, correct: 4 },
  { qtype: 'Flaw', level: 5, bucket: 'older', total: 5, correct: 1 },
  { qtype: 'Assumption', level: 3, bucket: 'current7d', total: 4, correct: 4 },
];

describe('computeAnalyticsFromRollup', () => {
  it('sums totals/correct across buckets into per-type accuracy', () => {
    const { data } = computeAnalyticsFromRollup(ROWS);
    // Flaw: 25 total, 11 correct -> 44%
    expect(data.accuracyByType.Flaw).toEqual({ total: 25, correct: 11, accuracy: 44 });
    // Assumption: 4/4 -> 100%
    expect(data.accuracyByType.Assumption).toEqual({ total: 4, correct: 4, accuracy: 100 });
  });

  it('aggregates by level across types and buckets', () => {
    const { data } = computeAnalyticsFromRollup(ROWS);
    // level 3: Flaw(20) + Assumption(4) = 24 total, 14 correct
    expect(data.accuracyByLevel[3].total).toBe(24);
    expect(data.accuracyByLevel[3].correct).toBe(14);
    expect(data.accuracyByLevel[3].accuracy).toBeCloseTo((14 / 24) * 100, 6);
    // level 5: 5 total, 1 correct -> 20%
    expect(data.accuracyByLevel[5]).toEqual({ total: 5, correct: 1, accuracy: 20 });
  });

  it('builds qtype x level accuracy', () => {
    const { data } = computeAnalyticsFromRollup(ROWS);
    expect(data.accuracyByTypeLevel.Flaw[3]).toEqual({ total: 20, correct: 10, accuracy: 50 });
    expect(data.accuracyByTypeLevel.Flaw[5]).toEqual({ total: 5, correct: 1, accuracy: 20 });
    expect(data.accuracyByTypeLevel.Assumption[3]).toEqual({ total: 4, correct: 4, accuracy: 100 });
  });

  it('computes the 7d trend as current7d accuracy minus prev7d accuracy', () => {
    const { data } = computeAnalyticsFromRollup(ROWS);
    // Flaw: current 60% - prev 40% = +20
    expect(data.trend7d.Flaw).toBeCloseTo(20, 6);
    // Assumption: current 100% - prev 0 (no prev7d rows) = +100
    expect(data.trend7d.Assumption).toBeCloseTo(100, 6);
  });

  it('computes miss share as a fraction of all misses, ignoring zero-miss groups', () => {
    const { data } = computeAnalyticsFromRollup(ROWS);
    // Misses: Flaw.3 = 10, Flaw.5 = 4, Assumption.3 = 0 (skipped). Total = 14.
    expect(data.recentMissShare.Flaw[3]).toBeCloseTo(10 / 14, 6);
    expect(data.recentMissShare.Flaw[5]).toBeCloseTo(4 / 14, 6);
    // A perfect group contributes no miss-share entry.
    expect(data.recentMissShare.Assumption).toBeUndefined();
  });

  it('ranks opportunities by impact and drops zero-gap / low-volume groups', () => {
    const { opportunities } = computeAnalyticsFromRollup(ROWS);
    // totalAttempts = 29. Flaw.3: gap 35 * share 20/29 * 100; Flaw.5: gap 65 * 5/29 * 100.
    // Assumption.3 has gap 0 -> excluded.
    expect(opportunities.map((o) => `${o.type}-${o.level}`)).toEqual(['Flaw-3', 'Flaw-5']);
    expect(opportunities[0].impact).toBe(Math.round(100 * 35 * (20 / 29)));
    expect(opportunities[1].impact).toBe(Math.round(100 * 65 * (5 / 29)));
    expect(opportunities[0].impact).toBeGreaterThan(opportunities[1].impact);
  });

  it('excludes groups with fewer than 3 attempts from opportunities', () => {
    const rows: AttemptRollupRow[] = [
      { qtype: 'Flaw', level: 2, bucket: 'older', total: 2, correct: 0 },
    ];
    const { opportunities } = computeAnalyticsFromRollup(rows);
    expect(opportunities).toEqual([]);
  });

  it('returns empty aggregates for no rows without dividing by zero', () => {
    const { data, opportunities } = computeAnalyticsFromRollup([]);
    expect(data.accuracyByType).toEqual({});
    expect(data.accuracyByLevel).toEqual({});
    expect(data.trend7d).toEqual({});
    expect(data.recentMissShare).toEqual({});
    expect(opportunities).toEqual([]);
  });

  it('caps opportunities at the top 3 by impact', () => {
    const rows: AttemptRollupRow[] = [
      { qtype: 'A', level: 1, bucket: 'older', total: 100, correct: 0 },
      { qtype: 'B', level: 1, bucket: 'older', total: 50, correct: 0 },
      { qtype: 'C', level: 1, bucket: 'older', total: 25, correct: 0 },
      { qtype: 'D', level: 1, bucket: 'older', total: 10, correct: 0 },
    ];
    const { opportunities } = computeAnalyticsFromRollup(rows);
    expect(opportunities).toHaveLength(3);
    expect(opportunities.map((o) => o.type)).toEqual(['A', 'B', 'C']);
  });
});
