import {
  FULL_DIFFICULTY_RANGE,
  bandMidpoint,
  isInBand,
  levelBand,
  type DifficultyBand,
  type StudentLevel,
} from '@/lib/studentLevel';
import type { LRQuestion } from '@/lib/questionLoader';
import type { QuestionStat } from '@/lib/questionStats';

/**
 * Pick the questions a specific student sees when they open a guided drill.
 *
 * The drill defines a pool (its bank_filter, already applied by the caller).
 * The student's level decides which end of that pool they get. One causation
 * drill therefore serves a beginner and an advanced student with different
 * questions, which is the whole point.
 *
 * Pure on purpose: no supabase, no question bank singleton, injectable rng.
 * The wrapper in guidedDrills.ts supplies the pool.
 */

/** Why the resolution is not a clean in-band draw. Never blocks an assign. */
export type LeveledDrillWarning =
  /** The drill's pool has nothing at this level, so every question is out of band. */
  | 'out_of_level'
  /** Some in-band questions, but not enough to fill the drill. */
  | 'partially_out_of_level'
  /** The drill pins an exact question list, so the level was not applied. */
  | 'pinned_level_not_applied'
  /** The pool is empty: the drill's own filter matches nothing. */
  | 'empty';

export interface LeveledDrillInput {
  /** The drill's pool, already filtered by its bank_filter. */
  pool: LRQuestion[];
  /** The drill's question_count, or a per-assignment override. */
  questionCount?: number | null;
  /** guided_drills.question_qids — an authored, exact list. */
  drillQids?: string[] | null;
  /** guided_drill_assignments.question_qids — a per-student pin. Wins. */
  assignmentQids?: string[] | null;
  /** Every qid the bank actually knows, so a stale pin cannot break a drill. */
  knownQids?: Set<string>;
  /** null means no level applies: reproduce the pre-level behaviour exactly. */
  level: StudentLevel | null;
  /** Injectable for deterministic tests. Defaults to Math.random. */
  rng?: () => number;
}

export interface LeveledDrillResolution {
  qids: string[];
  /** 'pinned' when an exact list was used, 'pool' when questions were drawn. */
  source: 'pinned' | 'pool';
  level: StudentLevel | null;
  band: DifficultyBand | null;
  poolCount: number;
  /** How many of the pool sit inside the student's band. */
  inBandCount: number;
  /** How many of the returned questions had to come from outside the band. */
  outOfBandUsed: number;
  warning: LeveledDrillWarning | null;
}

/**
 * Fisher-Yates. The existing runtime used `sort(() => Math.random() - 0.5)`,
 * which is a biased shuffle and not seedable; this is neither.
 */
function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Drop unknown and duplicate qids, preserving the authored order. */
function cleanQids(qids: readonly string[], knownQids?: Set<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const qid of qids) {
    if (!qid || seen.has(qid)) continue;
    if (knownQids && knownQids.size > 0 && !knownQids.has(qid)) continue;
    seen.add(qid);
    out.push(qid);
  }
  return out;
}

export function resolveLeveledDrillQids(input: LeveledDrillInput): LeveledDrillResolution {
  const {
    pool,
    questionCount,
    drillQids,
    assignmentQids,
    knownQids,
    level,
    rng = Math.random,
  } = input;

  const band = level ? levelBand(level) : null;

  // 1. An exact list always wins, in full and in authored order.
  //
  // It is deliberately NOT filtered by the band. Filtering a pinned list is the
  // only way this function could return a two-question drill, and a silently
  // short drill is worse than an off-level one. If a pinned set needs a level
  // variant, that is two drills, not a subset of one.
  //
  // (No seeded drill pins a list today: apply-guided-drill-taxonomy.mjs strips
  // question_qids on purpose, because drills are re-attemptable pools. This
  // branch exists for hand-pinned assignments.)
  const pinned = cleanQids(assignmentQids ?? drillQids ?? [], knownQids);
  if (pinned.length > 0) {
    const anyOutOfBand =
      band != null &&
      pool.some((q) => pinned.includes(q.qid) && !isInBand(q.difficulty, band));
    return {
      qids: pinned,
      source: 'pinned',
      level,
      band,
      poolCount: pool.length,
      inBandCount: band ? pool.filter((q) => isInBand(q.difficulty, band)).length : pool.length,
      outOfBandUsed: 0,
      warning: band && anyOutOfBand ? 'pinned_level_not_applied' : null,
    };
  }

  // 2. Draw from the pool. `want` reproduces the existing runtime rule.
  const want = questionCount ?? Math.min(pool.length, 10);

  if (pool.length === 0) {
    return {
      qids: [],
      source: 'pool',
      level,
      band,
      poolCount: 0,
      inBandCount: 0,
      outOfBandUsed: 0,
      warning: 'empty',
    };
  }

  // No level: byte-identical to the behaviour before levels existed.
  if (!band) {
    return {
      qids: shuffle(pool, rng).slice(0, want).map((q) => q.qid),
      source: 'pool',
      level: null,
      band: null,
      poolCount: pool.length,
      inBandCount: pool.length,
      outOfBandUsed: 0,
      warning: null,
    };
  }

  // Rank, do not filter. The band decides preference order, never eligibility,
  // so the drill is always the length it was meant to be:
  //   qids.length === min(want, pool.length), at every level.
  // An empty or short drill is impossible by construction rather than by
  // fallback, which matters because a two-question drill reads as a bug to the
  // student and there is no way for them to tell it was a levelling decision.
  const inBand: LRQuestion[] = [];
  const outOfBand: LRQuestion[] = [];
  for (const q of pool) {
    (isInBand(q.difficulty, band) ? inBand : outOfBand).push(q);
  }

  const picked = shuffle(inBand, rng).slice(0, want);

  let outOfBandUsed = 0;
  if (picked.length < want) {
    // Top up with the nearest-miss questions first, so a beginner short on
    // level-3s gets level-4s before level-5s. Non-finite difficulties sort last.
    const mid = bandMidpoint(band);
    const distance = (q: LRQuestion) =>
      typeof q.difficulty === 'number' && Number.isFinite(q.difficulty)
        ? Math.abs(q.difficulty - mid)
        : Number.POSITIVE_INFINITY;
    const ranked = shuffle(outOfBand, rng).sort((a, b) => distance(a) - distance(b));
    const topUp = ranked.slice(0, want - picked.length);
    outOfBandUsed = topUp.length;
    picked.push(...topUp);
  }

  let warning: LeveledDrillWarning | null = null;
  if (inBand.length === 0) warning = 'out_of_level';
  else if (outOfBandUsed > 0) warning = 'partially_out_of_level';

  return {
    qids: picked.map((q) => q.qid),
    source: 'pool',
    level,
    band,
    poolCount: pool.length,
    inBandCount: inBand.length,
    outOfBandUsed,
    warning,
  };
}

/**
 * How many of a pool sit at a level. Used by the assign sheet to show
 * "6 of 6 at level" before the teacher commits, without drawing anything.
 */
export function countInBand(pool: LRQuestion[], level: StudentLevel | null): number {
  if (!level) return pool.length;
  const band = levelBand(level);
  return pool.filter((q) => isInBand(q.difficulty, band)).length;
}

/** The effective difficulty range for a level, for display. */
export function effectiveBand(level: StudentLevel | null): DifficultyBand {
  return level ? levelBand(level) : FULL_DIFFICULTY_RANGE;
}

/** What a pool actually serves at a level, in cohort terms. */
export interface PoolSummary {
  /** How many of the pool sit in the band. Same number countInBand returns. */
  inBand: number;
  /** Of those, how many have measured cohort data. */
  measured: number;
  /**
   * Mean share of the cohort that got the in-band questions right, or null
   * when nothing in band is measured. LOWER IS HARDER.
   */
  meanCorrectPct: number | null;
  /** The traps this drill leans on at this level, most common first. */
  topTraps: ReadonlyArray<{ tag: string; count: number }>;
}

/**
 * Beginner-grade threshold. A set whose measured accuracy is at or above this
 * is work most test takers already do correctly, whatever level it was
 * assigned at.
 *
 * The number is not arbitrary: difficulty 3 sits at 75.2% cohort accuracy, so
 * "at or above 75" is precisely "no harder than the easiest question an
 * advanced band can contain".
 */
export const BEGINNER_GRADE_PCT = 75;

/**
 * Summarise what a student at `level` would actually be served from `pool`.
 *
 * Exists because "6 of 6 at level" is silent about the thing that matters. A
 * drill tagged `beginner` is clamped to difficulty 1-3; give it to an advanced
 * student (band 3-5) and the intersection is difficulty 3 alone — a full drill
 * of that band's easiest questions, reported as a healthy in-band count. 26 of
 * the 108 seeded drills behave that way. This function is what makes it
 * visible before the assign, in the same numbers the skill logs afterwards.
 *
 * Pure and synchronous, like everything else in this module: the caller passes
 * the stats map in. Missing stats reduce `measured`, never the mean.
 */
export function summarizePool(
  pool: LRQuestion[],
  level: StudentLevel | null,
  stats: ReadonlyMap<string, QuestionStat> | null | undefined,
): PoolSummary {
  const band = level ? levelBand(level) : null;
  const inBand = band ? pool.filter((q) => isInBand(q.difficulty, band)) : pool;

  if (!stats || stats.size === 0) {
    return { inBand: inBand.length, measured: 0, meanCorrectPct: null, topTraps: [] };
  }

  let total = 0;
  let measured = 0;
  const trapCounts = new Map<string, number>();
  for (const q of inBand) {
    const stat = stats.get(q.qid);
    if (!stat) continue;
    measured += 1;
    total += stat.correctPct;
    if (stat.topTrapTag) trapCounts.set(stat.topTrapTag, (trapCounts.get(stat.topTrapTag) ?? 0) + 1);
  }

  const topTraps = [...trapCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, count }));

  return {
    inBand: inBand.length,
    measured,
    meanCorrectPct: measured > 0 ? Math.round((total / measured) * 10) / 10 : null,
    topTraps,
  };
}
