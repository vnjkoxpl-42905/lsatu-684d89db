/**
 * Mainhub analytics engine.
 *
 * Pure, dependency-free reducers over raw `attempts` rows for a single
 * signed-in student. The `attempts` table is the atomic "every completed
 * question interaction" unit: one row per answered question across Smart
 * Drill, Full Section, Build a Set, bootcamp drills, and blind review.
 *
 * Diagnostic rule (locked in the design spec): the DEFAULT accuracy number
 * everywhere is FIRST-ATTEMPT accuracy — the earliest attempt per `qid`.
 * Repeat/review attempts are kept and surfaced as a secondary metric so
 * retries never inflate the diagnostic picture.
 *
 * No data source beyond the student's own `attempts` rows (plus a caller-
 * supplied question resolver for reasoning-type / feature / difficulty
 * metadata that lives in the question bank, not the attempt row). When a
 * dimension lacks enough first attempts, callers render a truthful empty /
 * low-sample state rather than a populated chart.
 */

/** Raw shape we read from the `attempts` table (student-scoped). */
export interface AttemptRow {
  qid: string;
  qtype: string;
  level: number;
  correct: boolean;
  mode: string | null;
  time_ms: number | null;
  timestamp_iso: string | null;
}

/** Question-bank metadata joined by qid (reasoning types + features). */
export interface QuestionMeta {
  reasoningType?: string[];
  questionFeatures?: string[];
}

export type QuestionResolver = (qid: string) => QuestionMeta | undefined;

/** Minimum first attempts before a dimension's accuracy is considered trustworthy. */
export const MIN_SAMPLE = 3;
/** Full-confidence sample size for the weighted priority score. */
export const CONFIDENCE_SATURATION = 8;
/** "Near-mastery" target; the gap below it drives the priority score. */
export const TARGET_ACCURACY = 85;

export interface DimensionStat {
  key: string;
  label: string;
  /** Distinct questions with a first attempt in this dimension. */
  firstAttempts: number;
  firstCorrect: number;
  /** 0-100. null when firstAttempts === 0. */
  firstAccuracy: number | null;
  /** Attempts beyond the first, on already-seen questions. */
  repeatAttempts: number;
  repeatCorrect: number;
  /** 0-100. null when repeatAttempts === 0. */
  repeatAccuracy: number | null;
  /** Avg time over first attempts, ms. null when unavailable. */
  avgTimeMs: number | null;
  /** Avg difficulty (level) over first attempts. null when unavailable. */
  avgDifficulty: number | null;
  /** Whether firstAttempts >= MIN_SAMPLE. */
  reliable: boolean;
}

export interface PriorityRow extends DimensionStat {
  /** Weighted weakness score (higher = more urgent). */
  score: number;
  /** Share of this dimension's first attempts that were misses in the last 14 days. */
  recentMissRate: number;
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  accuracy: number; // 0-100, first-attempt
  count: number; // first attempts that day
}

export interface VolumePoint {
  /** ISO date of the bucket start (day). */
  date: string;
  attempts: number;
}

export interface StudentAnalytics {
  totalAttempts: number;
  /** Distinct questions attempted. */
  totalQuestions: number;
  firstAttemptAccuracy: number | null;
  repeatAccuracy: number | null;
  /** last-7d minus prior-7d first-attempt accuracy, in points. null when insufficient. */
  trendDelta: number | null;
  accuracyTrend: TrendPoint[];
  volumeByDay: VolumePoint[];
  byType: DimensionStat[];
  byDifficulty: DimensionStat[];
  byReasoning: DimensionStat[];
  byFeature: DimensionStat[];
  priorities: PriorityRow[];
  /** True when there is at least one attempt. */
  hasData: boolean;
}

interface FirstAttemptFlag {
  row: AttemptRow;
  isFirst: boolean;
}

const DAY_MS = 86_400_000;

function dayKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Flags each row as a first attempt (earliest timestamp for its qid) or a
 * repeat. Rows without a timestamp sort last and are treated as repeats if a
 * timestamped attempt for the same qid exists.
 */
function flagFirstAttempts(rows: AttemptRow[]): FirstAttemptFlag[] {
  const sorted = [...rows].sort((a, b) => {
    const ta = a.timestamp_iso ? Date.parse(a.timestamp_iso) : Number.POSITIVE_INFINITY;
    const tb = b.timestamp_iso ? Date.parse(b.timestamp_iso) : Number.POSITIVE_INFINITY;
    return ta - tb;
  });
  const seen = new Set<string>();
  return sorted.map((row) => {
    const isFirst = !seen.has(row.qid);
    seen.add(row.qid);
    return { row, isFirst };
  });
}

interface Accum {
  firstAttempts: number;
  firstCorrect: number;
  repeatAttempts: number;
  repeatCorrect: number;
  timeSum: number;
  timeCount: number;
  difficultySum: number;
  difficultyCount: number;
  recentFirst: number;
  recentFirstMiss: number;
}

function emptyAccum(): Accum {
  return {
    firstAttempts: 0,
    firstCorrect: 0,
    repeatAttempts: 0,
    repeatCorrect: 0,
    timeSum: 0,
    timeCount: 0,
    difficultySum: 0,
    difficultyCount: 0,
    recentFirst: 0,
    recentFirstMiss: 0,
  };
}

function addToAccum(acc: Accum, flag: FirstAttemptFlag, recentCutoff: number): void {
  const { row, isFirst } = flag;
  const ts = row.timestamp_iso ? Date.parse(row.timestamp_iso) : NaN;
  if (isFirst) {
    acc.firstAttempts += 1;
    if (row.correct) acc.firstCorrect += 1;
    if (typeof row.time_ms === "number" && row.time_ms > 0) {
      acc.timeSum += row.time_ms;
      acc.timeCount += 1;
    }
    if (typeof row.level === "number" && Number.isFinite(row.level)) {
      acc.difficultySum += row.level;
      acc.difficultyCount += 1;
    }
    if (!Number.isNaN(ts) && ts >= recentCutoff) {
      acc.recentFirst += 1;
      if (!row.correct) acc.recentFirstMiss += 1;
    }
  } else {
    acc.repeatAttempts += 1;
    if (row.correct) acc.repeatCorrect += 1;
  }
}

function finalizeStat(key: string, label: string, acc: Accum): DimensionStat {
  return {
    key,
    label,
    firstAttempts: acc.firstAttempts,
    firstCorrect: acc.firstCorrect,
    firstAccuracy: acc.firstAttempts > 0 ? (acc.firstCorrect / acc.firstAttempts) * 100 : null,
    repeatAttempts: acc.repeatAttempts,
    repeatCorrect: acc.repeatCorrect,
    repeatAccuracy: acc.repeatAttempts > 0 ? (acc.repeatCorrect / acc.repeatAttempts) * 100 : null,
    avgTimeMs: acc.timeCount > 0 ? acc.timeSum / acc.timeCount : null,
    avgDifficulty: acc.difficultyCount > 0 ? acc.difficultySum / acc.difficultyCount : null,
    reliable: acc.firstAttempts >= MIN_SAMPLE,
  };
}

/**
 * Weighted weakness score. Combines, per the spec: low first-attempt
 * accuracy, enough sample to trust it, and recent misses weighted more than
 * old ones. A dimension with 20 attempts at 48% ranks above one with 1
 * attempt at 0%.
 */
function priorityScore(acc: Accum): number {
  if (acc.firstAttempts < MIN_SAMPLE) return 0;
  const firstAccuracy = (acc.firstCorrect / acc.firstAttempts) * 100;
  const gap = Math.max(0, TARGET_ACCURACY - firstAccuracy);
  const confidence = Math.min(1, acc.firstAttempts / CONFIDENCE_SATURATION);
  const recentMissRate = acc.recentFirst > 0 ? acc.recentFirstMiss / acc.recentFirst : 0;
  const recencyBoost = 1 + recentMissRate; // 1x .. 2x
  return Math.round(gap * confidence * recencyBoost);
}

function buildDimension(
  flags: FirstAttemptFlag[],
  recentCutoff: number,
  keysFor: (flag: FirstAttemptFlag) => Array<{ key: string; label: string }>,
): DimensionStat[] {
  const map = new Map<string, { label: string; acc: Accum }>();
  for (const flag of flags) {
    for (const { key, label } of keysFor(flag)) {
      let entry = map.get(key);
      if (!entry) {
        entry = { label, acc: emptyAccum() };
        map.set(key, entry);
      }
      addToAccum(entry.acc, flag, recentCutoff);
    }
  }
  return Array.from(map.entries())
    .map(([key, { label, acc }]) => finalizeStat(key, label, acc))
    .sort((a, b) => b.firstAttempts - a.firstAttempts);
}

/**
 * Core reducer. `now` is injectable for deterministic tests.
 */
export function computeStudentAnalytics(
  rows: AttemptRow[],
  resolve: QuestionResolver,
  now: number = Date.now(),
): StudentAnalytics {
  const flags = flagFirstAttempts(rows);
  const recentCutoff = now - 14 * DAY_MS;

  // Overall totals.
  let firstAttempts = 0;
  let firstCorrect = 0;
  let repeatAttempts = 0;
  let repeatCorrect = 0;
  const questions = new Set<string>();
  for (const { row, isFirst } of flags) {
    questions.add(row.qid);
    if (isFirst) {
      firstAttempts += 1;
      if (row.correct) firstCorrect += 1;
    } else {
      repeatAttempts += 1;
      if (row.correct) repeatCorrect += 1;
    }
  }

  const byType = buildDimension(flags, recentCutoff, ({ row }) => [
    { key: row.qtype || "Unknown", label: row.qtype || "Unknown" },
  ]);
  const byDifficulty = buildDimension(flags, recentCutoff, ({ row }) =>
    Number.isFinite(row.level)
      ? [{ key: String(row.level), label: `Difficulty ${row.level}` }]
      : [],
  ).sort((a, b) => Number(a.key) - Number(b.key));
  const byReasoning = buildDimension(flags, recentCutoff, ({ row }) => {
    const meta = resolve(row.qid);
    return (meta?.reasoningType ?? []).map((r) => ({ key: r, label: r }));
  });
  const byFeature = buildDimension(flags, recentCutoff, ({ row }) => {
    const meta = resolve(row.qid);
    return (meta?.questionFeatures ?? []).map((f) => ({ key: f, label: f }));
  });

  // Priorities: weighted weakness over question types (primary diagnostic axis).
  const priorityMap = new Map<string, { label: string; acc: Accum }>();
  for (const flag of flags) {
    const key = flag.row.qtype || "Unknown";
    let entry = priorityMap.get(key);
    if (!entry) {
      entry = { label: key, acc: emptyAccum() };
      priorityMap.set(key, entry);
    }
    addToAccum(entry.acc, flag, recentCutoff);
  }
  const priorities: PriorityRow[] = Array.from(priorityMap.entries())
    .map(([key, { label, acc }]) => {
      const stat = finalizeStat(key, label, acc);
      const recentMissRate = acc.recentFirst > 0 ? acc.recentFirstMiss / acc.recentFirst : 0;
      return { ...stat, score: priorityScore(acc), recentMissRate };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);

  // Accuracy trend (first attempts) bucketed by day.
  const trendMap = new Map<string, { correct: number; total: number }>();
  for (const { row, isFirst } of flags) {
    if (!isFirst) continue;
    const key = dayKey(row.timestamp_iso);
    if (!key) continue;
    const b = trendMap.get(key) ?? { correct: 0, total: 0 };
    b.total += 1;
    if (row.correct) b.correct += 1;
    trendMap.set(key, b);
  }
  const accuracyTrend: TrendPoint[] = Array.from(trendMap.entries())
    .map(([date, { correct, total }]) => ({
      date,
      accuracy: total > 0 ? (correct / total) * 100 : 0,
      count: total,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // trendDelta: last-7d vs prior-7d first-attempt accuracy.
  const cut7 = now - 7 * DAY_MS;
  const cut14 = now - 14 * DAY_MS;
  let last7c = 0;
  let last7t = 0;
  let prev7c = 0;
  let prev7t = 0;
  for (const { row, isFirst } of flags) {
    if (!isFirst || !row.timestamp_iso) continue;
    const ts = Date.parse(row.timestamp_iso);
    if (Number.isNaN(ts)) continue;
    if (ts >= cut7) {
      last7t += 1;
      if (row.correct) last7c += 1;
    } else if (ts >= cut14) {
      prev7t += 1;
      if (row.correct) prev7c += 1;
    }
  }
  const trendDelta =
    last7t >= MIN_SAMPLE && prev7t >= MIN_SAMPLE
      ? (last7c / last7t) * 100 - (prev7c / prev7t) * 100
      : null;

  // Volume by day for the last 30 days (all attempts, since volume is effort).
  const volMap = new Map<string, number>();
  for (const { row } of flags) {
    const key = dayKey(row.timestamp_iso);
    if (!key) continue;
    volMap.set(key, (volMap.get(key) ?? 0) + 1);
  }
  const volumeByDay: VolumePoint[] = [];
  const start = new Date(now - 29 * DAY_MS);
  for (let i = 0; i < 30; i += 1) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    volumeByDay.push({ date: key, attempts: volMap.get(key) ?? 0 });
  }

  return {
    totalAttempts: firstAttempts + repeatAttempts,
    totalQuestions: questions.size,
    firstAttemptAccuracy: firstAttempts > 0 ? (firstCorrect / firstAttempts) * 100 : null,
    repeatAccuracy: repeatAttempts > 0 ? (repeatCorrect / repeatAttempts) * 100 : null,
    trendDelta,
    accuracyTrend,
    volumeByDay,
    byType,
    byDifficulty,
    byReasoning,
    byFeature,
    priorities,
    hasData: flags.length > 0,
  };
}
