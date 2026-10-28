// Node port of the level-aware question draw.
//
// Sibling of drill-launch.mjs and the same bargain: the app's version is
// TypeScript reached through Vite's aliases, and local Node tooling cannot
// import it, so this is a hand port. A port that drifts is worse than none —
// a drill assigned from the terminal would quietly hold different questions
// from one assigned through the teacher UI. guidedDrillLevel.parity.test.ts
// runs both over the same pools and fails on the first divergence.
//
// Ported from:
//   src/lib/studentLevel.ts          bands
//   src/lib/guidedDrillLevel.ts      resolveLeveledDrillQids
//   src/lib/questionSelectionSignals.ts   trap targeting
//
// Change one, change the other.

export const LEVEL_BANDS = {
  beginner: { min: 1, max: 3 },
  intermediate: { min: 2, max: 4 },
  advanced: { min: 3, max: 5 },
};

export function levelBand(level) {
  return LEVEL_BANDS[level];
}

export function bandMidpoint(band) {
  return (band.min + band.max) / 2;
}

export function isInBand(difficulty, band) {
  if (typeof difficulty !== 'number' || !Number.isFinite(difficulty)) return false;
  return difficulty >= band.min && difficulty <= band.max;
}

/* ------------------------------------------------ selection signals port -- */

const DIFFICULTY_ANCHORS = [
  { difficulty: 1, correctPct: 91.7 },
  { difficulty: 2, correctPct: 84.4 },
  { difficulty: 3, correctPct: 75.2 },
  { difficulty: 4, correctPct: 66.4 },
  { difficulty: 5, correctPct: 54.0 },
];

export function empiricalDifficulty(correctPct) {
  if (correctPct == null || !Number.isFinite(correctPct)) return null;
  const first = DIFFICULTY_ANCHORS[0];
  const last = DIFFICULTY_ANCHORS[DIFFICULTY_ANCHORS.length - 1];
  if (correctPct >= first.correctPct) return first.difficulty;
  if (correctPct <= last.correctPct) return last.difficulty;
  for (let i = 0; i < DIFFICULTY_ANCHORS.length - 1; i++) {
    const hi = DIFFICULTY_ANCHORS[i];
    const lo = DIFFICULTY_ANCHORS[i + 1];
    if (correctPct <= hi.correctPct && correctPct >= lo.correctPct) {
      const span = hi.correctPct - lo.correctPct;
      const t = span === 0 ? 0 : (hi.correctPct - correctPct) / span;
      return hi.difficulty + t * (lo.difficulty - hi.difficulty);
    }
  }
  return null;
}

export function effectiveDifficulty(labeled, stat, weight = 0.5) {
  const label = typeof labeled === 'number' && Number.isFinite(labeled) ? labeled : null;
  if (weight <= 0) return label;
  const empirical = empiricalDifficulty(stat?.correctPct);
  if (empirical == null) return label;
  if (label == null) return empirical;
  const w = Math.min(1, weight);
  return label * (1 - w) + empirical * w;
}

export function isInBandFractional(difficulty, band) {
  if (difficulty == null || !Number.isFinite(difficulty)) return false;
  return difficulty >= band.min - 0.5 && difficulty < band.max + 0.5;
}

export function normalizeTrapTag(tag) {
  if (!tag) return null;
  const base = String(tag).split(/[;:]/)[0].trim().replace(/\s+/g, ' ').toLowerCase();
  return base.length > 0 ? base : null;
}

export function trapScore(stat, targets) {
  if (!stat || !targets || targets.length === 0) return 0;
  const wanted = new Set(targets.map(normalizeTrapTag).filter(Boolean));
  if (wanted.size === 0) return 0;
  const tag = normalizeTrapTag(stat.topTrapTag);
  if (!tag || !wanted.has(tag)) return 0;
  const spread = stat.trapSpread;
  if (spread == null || !Number.isFinite(spread)) return 1;
  return Math.max(0, Math.min(1, spread));
}

/* --------------------------------------------------------------- the draw -- */

function shuffle(items, rng) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function cleanQids(qids, knownQids) {
  const seen = new Set();
  const out = [];
  for (const qid of qids) {
    if (!qid || seen.has(qid)) continue;
    if (knownQids && knownQids.size > 0 && !knownQids.has(qid)) continue;
    seen.add(qid);
    out.push(qid);
  }
  return out;
}

function describeSet(qids, stats, targets) {
  if (!stats || stats.size === 0) {
    return { statsCoverage: null, meanCorrectPct: null, trapMatches: 0 };
  }
  let measured = 0;
  let total = 0;
  let trapMatches = 0;
  for (const qid of qids) {
    const stat = stats.get(qid);
    if (!stat) continue;
    measured += 1;
    total += stat.correctPct;
    if (trapScore(stat, targets) > 0) trapMatches += 1;
  }
  return {
    statsCoverage: { measured, total: qids.length },
    meanCorrectPct: measured > 0 ? Math.round((total / measured) * 10) / 10 : null,
    trapMatches,
  };
}

export function resolveLeveledDrillQids(input) {
  const {
    pool,
    questionCount,
    drillQids,
    assignmentQids,
    knownQids,
    level,
    rng = Math.random,
    stats = null,
    empiricalWeight = 0,
    targetTrapTags = null,
    trapWeight = 0,
  } = input;

  const band = level ? levelBand(level) : null;

  const pinned = cleanQids(assignmentQids ?? drillQids ?? [], knownQids);
  if (pinned.length > 0) {
    const anyOutOfBand =
      band != null && pool.some((q) => pinned.includes(q.qid) && !isInBand(q.difficulty, band));
    return {
      qids: pinned,
      source: 'pinned',
      level,
      band,
      poolCount: pool.length,
      inBandCount: band ? pool.filter((q) => isInBand(q.difficulty, band)).length : pool.length,
      outOfBandUsed: 0,
      warning: band && anyOutOfBand ? 'pinned_level_not_applied' : null,
      ...describeSet(pinned, stats, targetTrapTags),
    };
  }

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
      statsCoverage: null,
      meanCorrectPct: null,
      trapMatches: 0,
    };
  }

  if (!band) {
    const qids = shuffle(pool, rng)
      .slice(0, want)
      .map((q) => q.qid);
    return {
      qids,
      source: 'pool',
      level: null,
      band: null,
      poolCount: pool.length,
      inBandCount: pool.length,
      outOfBandUsed: 0,
      warning: null,
      ...describeSet(qids, stats, targetTrapTags),
    };
  }

  const useEmpirical = empiricalWeight > 0 && stats != null && stats.size > 0;
  const gradeOf = (q) =>
    useEmpirical ? effectiveDifficulty(q.difficulty, stats.get(q.qid), empiricalWeight) : q.difficulty;

  const inBand = [];
  const outOfBand = [];
  for (const q of pool) {
    const grade = gradeOf(q);
    const eligible = useEmpirical ? isInBandFractional(grade, band) : isInBand(q.difficulty, band);
    (eligible ? inBand : outOfBand).push(q);
  }

  const rankByTrap = trapWeight > 0 && stats != null && (targetTrapTags?.length ?? 0) > 0;
  const ordered = rankByTrap
    ? inBand
        .map((q) => ({
          q,
          key: trapWeight * trapScore(stats.get(q.qid), targetTrapTags) + (1 - trapWeight) * rng(),
        }))
        .sort((a, b) => b.key - a.key)
        .map((entry) => entry.q)
    : shuffle(inBand, rng);

  const picked = ordered.slice(0, want);

  let outOfBandUsed = 0;
  if (picked.length < want) {
    const mid = bandMidpoint(band);
    const distance = (q) => {
      const grade = gradeOf(q);
      return typeof grade === 'number' && Number.isFinite(grade)
        ? Math.abs(grade - mid)
        : Number.POSITIVE_INFINITY;
    };
    const ranked = shuffle(outOfBand, rng).sort((a, b) => distance(a) - distance(b));
    const topUp = ranked.slice(0, want - picked.length);
    outOfBandUsed = topUp.length;
    picked.push(...topUp);
  }

  let warning = null;
  if (inBand.length === 0) warning = 'out_of_level';
  else if (outOfBandUsed > 0) warning = 'partially_out_of_level';

  const qids = picked.map((q) => q.qid);
  return {
    qids,
    source: 'pool',
    level,
    band,
    poolCount: pool.length,
    inBandCount: inBand.length,
    outOfBandUsed,
    warning,
    ...describeSet(qids, stats, targetTrapTags),
  };
}
