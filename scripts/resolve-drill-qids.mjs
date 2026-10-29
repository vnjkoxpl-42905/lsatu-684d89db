#!/usr/bin/env node
// Draw the questions a student would get, without a browser and without the
// database.
//
// This is the half of the assign flow that needs the question bank and none of
// the credentials, so it lives here and stays pure. The brain's assign_drill.py
// shells out to it and does the writing.
//
// The draw itself is scripts/lib/drill-level.mjs, a port of the app's resolver
// guarded by guidedDrillLevel.port.test.ts, so the set produced here is the set
// the teacher UI would have produced.
//
// Usage:
//   node scripts/resolve-drill-qids.mjs --slug <slug> --level beginner
//     --count 15                 question count; omit for the drill's own
//     --traps "Too Strong,Out Of Scope"
//     --trap-weight 0.5          default 0.5 when traps are given, else 0
//     --seed 12345               deterministic draw, for reproducing one
//     --json                     machine-readable, nothing else on stdout

import { loadBank, loadSeed, loadStats, resolvePool } from './lib/drill-pool.mjs';
import { resolveLeveledDrillQids } from './lib/drill-level.mjs';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') out.json = true;
    else if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.slug) {
  console.error('usage: resolve-drill-qids.mjs --slug <slug> [--level <band>] [--count n] [--traps "a,b"]');
  process.exit(1);
}

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const level = args.level && args.level !== 'none' ? args.level : null;
if (level && !LEVELS.includes(level)) {
  console.error(`--level must be one of ${LEVELS.join(', ')} or none`);
  process.exit(1);
}

const drill = loadSeed().find((d) => d.slug === args.slug);
if (!drill) {
  console.error(`no seeded drill with slug "${args.slug}"`);
  process.exit(1);
}

const traps = (args.traps ?? '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);
const trapWeight = args['trap-weight'] != null ? Number(args['trap-weight']) : traps.length ? 0.5 : 0;

// Deterministic only when asked. The default draw is random on purpose: two
// students at the same level should not get an identical set, and neither
// should a re-attempt.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = args.seed != null ? mulberry32(Number(args.seed)) : Math.random;

const bank = loadBank();
const pool = resolvePool(drill.bank_filter, bank);
const stats = loadStats();
const questionCount = args.count != null ? Number(args.count) : (drill.bank_filter?.count ?? drill.question_count ?? null);

const result = resolveLeveledDrillQids({
  pool,
  questionCount,
  drillQids: drill.question_qids ?? null,
  knownQids: new Set(bank.keys()),
  level,
  rng,
  // Stats are always passed, targeting is not. With trapWeight at 0 the stats
  // are inert for selection and used only to report what was drawn, which is
  // the number Gate 1 is actually looking at. Anything else means a run
  // without trap targets silently has no accuracy line.
  stats,
  targetTrapTags: traps,
  trapWeight,
});

// Reported alongside the draw because it is the number that decides whether
// this drill is pitched right, and the caller should not have to join it back
// to the level report by hand.
const payload = {
  slug: drill.slug,
  title: drill.title,
  drillLevelTag: drill.level ?? null,
  clamp: [drill.bank_filter?.difficulty_min ?? null, drill.bank_filter?.difficulty_max ?? null],
  level,
  questionCount,
  traps,
  trapWeight,
  qids: result.qids,
  poolCount: result.poolCount,
  inBandCount: result.inBandCount,
  outOfBandUsed: result.outOfBandUsed,
  warning: result.warning,
  meanCorrectPct: result.meanCorrectPct,
  measured: result.statsCoverage?.measured ?? 0,
  trapMatches: result.trapMatches,
  beginnerGrade: result.meanCorrectPct != null && result.meanCorrectPct >= 75,
};

if (args.json) {
  process.stdout.write(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const types = new Map(pool.map((p) => [p.qid, p.type]));
console.log(`${payload.title}  (${payload.slug})`);
console.log(
  `${payload.level ?? 'no level'} · drill tag ${payload.drillLevelTag ?? 'none'} · clamp ${payload.clamp[0] ?? '-'}-${payload.clamp[1] ?? '-'} · ${payload.inBandCount} of ${payload.poolCount} at level`,
);
console.log('');
payload.qids.forEach((qid, i) => {
  const stat = stats.get(qid);
  console.log(
    `  ${String(i + 1).padStart(2)}. ${qid.padEnd(14)} ${(types.get(qid) ?? '').padEnd(26)} ${
      stat ? `${stat.correctPct}%  ${stat.topTrapTag ?? ''}` : 'no cohort data'
    }`,
  );
});
console.log('');
console.log(
  payload.meanCorrectPct == null
    ? 'No measured questions in this set.'
    : `Mean cohort accuracy ${payload.meanCorrectPct}% across ${payload.measured} of ${payload.qids.length}.${
        payload.beginnerGrade ? '  BEGINNER-GRADE (75%+).' : ''
      }`,
);
if (payload.traps.length) console.log(`Trap matches: ${payload.trapMatches} of ${payload.qids.length} for ${payload.traps.join(', ')}`);
if (payload.warning) console.log(`Warning: ${payload.warning}`);
