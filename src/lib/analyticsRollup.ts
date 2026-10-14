// Analytics reconstruction from the server-side attempt_accuracy_rollup RPC.
// The RPC returns one row per (qtype, level, time-bucket) with total + correct
// counts, replacing a client-side pass over every attempt row. This module turns
// those grouped rows back into the exact aggregates the Analytics page renders, so
// the reconstruction has a pure, unit-tested seam instead of living inline in the
// component. COMPREHENSIVEAUDIT Phase 6.

export interface AttemptRollupRow {
  qtype: string;
  level: number;
  // 'current7d' = last 7 days, 'prev7d' = the 7 days before, 'older' = everything else.
  bucket: string;
  total: number;
  correct: number;
}

export interface AnalyticsData {
  accuracyByType: Record<string, { correct: number; total: number; accuracy: number }>;
  accuracyByLevel: Record<number, { correct: number; total: number; accuracy: number }>;
  accuracyByTypeLevel: Record<string, Record<number, { correct: number; total: number; accuracy: number }>>;
  trend7d: Record<string, number>;
  recentMissShare: Record<string, Record<number, number>>;
}

export interface OpportunityArea {
  type: string;
  level: number;
  impact: number;
  currentAccuracy: number;
  gap: number;
  attempts: number;
}

// Opportunity score = (target_accuracy − current_accuracy) × attempt_share.
// Target is the LSAT-prep convention for "near-mastery" — a question type sitting
// under this accuracy is the highest-leverage place to drill.
const TARGET_ACCURACY = 85;

export function computeAnalyticsFromRollup(rows: AttemptRollupRow[]): {
  data: AnalyticsData;
  opportunities: OpportunityArea[];
} {
  const typeStats: Record<string, { correct: number; total: number }> = {};
  const levelStats: Record<number, { correct: number; total: number }> = {};
  const typeLevelStats: Record<string, Record<number, { correct: number; total: number }>> = {};
  const type7d: Record<string, { correct: number; total: number }> = {};
  const typePrev7d: Record<string, { correct: number; total: number }> = {};

  for (const row of rows) {
    const qtype = row.qtype;
    const level = Number(row.level);
    const total = Number(row.total);
    const correct = Number(row.correct);

    if (!typeStats[qtype]) typeStats[qtype] = { correct: 0, total: 0 };
    typeStats[qtype].total += total;
    typeStats[qtype].correct += correct;

    if (!levelStats[level]) levelStats[level] = { correct: 0, total: 0 };
    levelStats[level].total += total;
    levelStats[level].correct += correct;

    if (!typeLevelStats[qtype]) typeLevelStats[qtype] = {};
    if (!typeLevelStats[qtype][level]) typeLevelStats[qtype][level] = { correct: 0, total: 0 };
    typeLevelStats[qtype][level].total += total;
    typeLevelStats[qtype][level].correct += correct;

    if (row.bucket === 'current7d') {
      if (!type7d[qtype]) type7d[qtype] = { correct: 0, total: 0 };
      type7d[qtype].total += total;
      type7d[qtype].correct += correct;
    } else if (row.bucket === 'prev7d') {
      if (!typePrev7d[qtype]) typePrev7d[qtype] = { correct: 0, total: 0 };
      typePrev7d[qtype].total += total;
      typePrev7d[qtype].correct += correct;
    }
  }

  const accuracyByType: AnalyticsData['accuracyByType'] = {};
  Object.entries(typeStats).forEach(([type, stats]) => {
    accuracyByType[type] = { ...stats, accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0 };
  });

  const accuracyByLevel: AnalyticsData['accuracyByLevel'] = {};
  Object.entries(levelStats).forEach(([level, stats]) => {
    accuracyByLevel[Number(level)] = { ...stats, accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0 };
  });

  const accuracyByTypeLevel: AnalyticsData['accuracyByTypeLevel'] = {};
  Object.entries(typeLevelStats).forEach(([type, levels]) => {
    accuracyByTypeLevel[type] = {};
    Object.entries(levels).forEach(([level, stats]) => {
      accuracyByTypeLevel[type][Number(level)] = { ...stats, accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0 };
    });
  });

  const trend7d: Record<string, number> = {};
  Object.keys(accuracyByType).forEach(type => {
    const current7d = type7d[type] ? (type7d[type].correct / type7d[type].total) * 100 : 0;
    const prev7d = typePrev7d[type] ? (typePrev7d[type].correct / typePrev7d[type].total) * 100 : 0;
    trend7d[type] = current7d - prev7d;
  });

  // Miss share per (qtype, level) as a fraction of all misses. Misses per group =
  // total − correct, summed across all time buckets. Divide by total misses
  // (floor 1 to avoid divide-by-zero).
  let totalMisses = 0;
  const recentMissShare: Record<string, Record<number, number>> = {};
  for (const row of rows) {
    const misses = Number(row.total) - Number(row.correct);
    if (misses <= 0) continue;
    const qtype = row.qtype;
    const level = Number(row.level);
    totalMisses += misses;
    if (!recentMissShare[qtype]) recentMissShare[qtype] = {};
    if (!recentMissShare[qtype][level]) recentMissShare[qtype][level] = 0;
    recentMissShare[qtype][level] += misses;
  }
  const missDenom = totalMisses || 1;
  Object.keys(recentMissShare).forEach(type => {
    Object.keys(recentMissShare[type]).forEach(level => {
      recentMissShare[type][Number(level)] /= missDenom;
    });
  });

  const totalAttempts = rows.reduce((sum, row) => sum + Number(row.total), 0) || 1;
  const opportunities: OpportunityArea[] = [];
  Object.entries(accuracyByTypeLevel).forEach(([type, levels]) => {
    Object.entries(levels).forEach(([level, stats]) => {
      const currentAccuracy = stats.accuracy;
      const gap = Math.max(0, TARGET_ACCURACY - currentAccuracy);
      const recentShare = stats.total / totalAttempts;
      const impact = Math.round(100 * gap * recentShare);
      if (stats.total >= 3 && impact > 0) {
        opportunities.push({ type, level: Number(level), impact, currentAccuracy, gap, attempts: stats.total });
      }
    });
  });
  opportunities.sort((a, b) => b.impact - a.impact);

  return {
    data: { accuracyByType, accuracyByLevel, accuracyByTypeLevel, trend7d, recentMissShare },
    opportunities: opportunities.slice(0, 3),
  };
}
