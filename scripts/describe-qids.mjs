#!/usr/bin/env node
// Describe a frozen question set well enough to approve it.
//
// The assign sheet reports a count and an average; the assignment row holds
// bare identifiers. Neither tells a teacher what is actually in the set they
// are about to email — which questions, of what type, at what labeled
// difficulty, and how much of the cohort got each one right.
//
// Read-only, local, and deliberately separate from the generator: this runs
// BEFORE anything is built, on the list read back from the database, so the
// approval is about the real set rather than a set that might be redrawn.
//
// Usage:
//   node scripts/describe-qids.mjs --qids PT104-S2-Q14,PT112-S3-Q7
//   node scripts/describe-qids.mjs --qids-file <path>   newline or comma separated
//   node scripts/describe-qids.mjs --qids ... --json

import fs from 'node:fs';
import path from 'node:path';

const BANK_DIR = path.resolve('public/data');
const STATS = path.resolve('public/data/question-stats.json');

/** A set at or above this is beginner-grade work whatever it is labelled. */
const BEGINNER_GRADE_PCT = 75;

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

const raw = args['qids-file']
  ? fs.readFileSync(path.resolve(args['qids-file']), 'utf8')
  : (args.qids ?? '');
const qids = raw
  .split(/[\s,]+/)
  .map((s) => s.trim())
  .filter(Boolean);

if (qids.length === 0) {
  console.error('usage: describe-qids.mjs --qids PT104-S2-Q14,… | --qids-file <path>');
  process.exit(1);
}

function loadBank() {
  const byQid = new Map();
  for (const f of fs.readdirSync(BANK_DIR).filter((n) => /-LR\.json$/.test(n))) {
    let arr;
    try {
      arr = JSON.parse(fs.readFileSync(path.join(BANK_DIR, f), 'utf8'));
    } catch {
      continue;
    }
    if (!Array.isArray(arr)) continue;
    for (const q of arr) {
      byQid.set(`${q.practiceTest}-S${q.sectionNumber}-Q${q.questionNumber}`, q);
    }
  }
  return byQid;
}

const bank = loadBank();
// The sidecar's keys are abbreviated to keep the payload small; the mapping
// here mirrors hydrate() in src/lib/questionStats.ts.
const stats = fs.existsSync(STATS) ? JSON.parse(fs.readFileSync(STATS, 'utf8')) : { q: {} };
const statByQid = stats.q ?? {};

const rows = qids.map((qid) => {
  const q = bank.get(qid);
  const s = statByQid[qid];
  return {
    qid,
    inBank: Boolean(q),
    type: q?.questionType ?? null,
    // The raw bank calls it questionDifficulty; questionLoader renames it to
    // difficulty on the way into the app. This reads the raw file.
    difficulty: q?.questionDifficulty ?? null,
    correctPct: s?.cp ?? null,
    topTrapTag: s?.tt ?? null,
    topTrapPct: s?.tp ?? null,
  };
});

const measured = rows.filter((r) => r.correctPct != null);
const mean =
  measured.length > 0
    ? Math.round((measured.reduce((a, r) => a + r.correctPct, 0) / measured.length) * 10) / 10
    : null;

const missing = rows.filter((r) => !r.inBank).map((r) => r.qid);

const trapCounts = new Map();
for (const r of rows) {
  if (r.topTrapTag) trapCounts.set(r.topTrapTag, (trapCounts.get(r.topTrapTag) ?? 0) + 1);
}
const topTraps = [...trapCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([tag, count]) => ({ tag, count }));

if (args.json) {
  console.log(
    JSON.stringify(
      { qids, rows, mean, measured: measured.length, total: rows.length, missing, topTraps },
      null,
      2,
    ),
  );
  process.exit(missing.length > 0 ? 1 : 0);
}

const pct = (v) => (v == null ? '—' : `${v}%`);

console.log(`| # | question | type | difficulty | cohort correct | top trap |`);
console.log(`|---|---|---|---|---|---|`);
rows.forEach((r, i) => {
  const trap =
    r.topTrapTag && r.topTrapPct != null ? `${r.topTrapTag} ${r.topTrapPct}%` : r.topTrapTag ?? '—';
  console.log(
    `| ${i + 1} | ${r.qid}${r.inBank ? '' : ' **(not in bank)**'} | ${r.type ?? '—'} | ${
      r.difficulty ?? '—'
    } | ${pct(r.correctPct)} | ${trap} |`,
  );
});

console.log('');
console.log(
  mean == null
    ? `Mean cohort accuracy: no measured questions (0 of ${rows.length}).`
    : `Mean cohort accuracy: ${mean}% across ${measured.length} of ${rows.length} measured.${
        mean >= BEGINNER_GRADE_PCT
          ? ' **Beginner-grade** (75%+): expected at the beginner band, a problem at advanced.'
          : ''
      }`,
);
if (topTraps.length > 0) {
  console.log(`Traps: ${topTraps.map((t) => `${t.tag} (${t.count})`).join(', ')}`);
}
if (missing.length > 0) {
  console.log(`\nNOT IN BANK: ${missing.join(', ')} — do not build an artifact from this list.`);
  process.exit(1);
}
