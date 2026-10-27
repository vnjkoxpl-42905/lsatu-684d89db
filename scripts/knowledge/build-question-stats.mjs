#!/usr/bin/env node
// Build public/data/question-stats.json — a per-question index of what the
// LSAT Lab cohort actually did, keyed by the same qid the question bank uses.
//
// Why a static sidecar rather than a Postgres view:
//   - The draw path is synchronous and client-only. `countInBand` runs during
//     render in AssignWorkSheet; an RPC would make every selection function
//     async and put a round-trip inside a live count.
//   - Two consumers are not the app at all — the drill-artifact generator and
//     the vault skill both run as local Node with no JWT. A file is readable by
//     `fetch` in the browser and `readFileSync` in a script. The DB is not.
//
// Supabase (`lr_answer_choices`) stays the source of truth for *display*, one
// question at a time, via useLrExplanation. This file is a derived index for
// *selection*, which is a different job.
//
// The markdown corpus is parsed by parse-lr-explanations.mjs, unchanged. That
// parser already resolves the two traps in this data: `**Correct answer:** X`
// is authoritative over any `Correct` tag, and the three-style repetition of
// the choice block is collapsed to the first whole block.
//
// Usage:
//   node scripts/knowledge/build-question-stats.mjs [dir-of-PT101-140-md] [--check]
//
// The corpus dir defaults to ../../wiki/explanations — this repo lives at
// ~/ai-os/projects/lsatu and the vault root is ~/ai-os, a relationship
// CLAUDE.md states outright. Pass a dir to override.
//
// --check re-derives and exits non-zero if the committed sidecar is stale,
// matching the contract of build-guided-drills-local-seed.mjs --check.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseExplanationFile } from './parse-lr-explanations.mjs';

const DEFAULT_CORPUS_DIR = path.resolve('../../wiki/explanations');
const OUT_FILE = path.resolve('public/data/question-stats.json');
const REPORT_FILE = path.resolve('scripts/out/question-stats-report.json');
const BANK_DIR = path.resolve('public/data');

/**
 * Mean cohort accuracy at each labeled difficulty, measured over the 2,223
 * questions that joined bank labels to corpus percentages (r = -0.90).
 * Documented in ~/ai-os/references/guided-drill-difficulty-calibration.md.
 *
 * Used to invert a correct% back onto the 1-5 scale the bands are defined on,
 * so an empirical difficulty is directly comparable to a labeled one.
 */
const CALIBRATION = [
  { difficulty: 1, meanCorrectPct: 91.7 },
  { difficulty: 2, meanCorrectPct: 84.4 },
  { difficulty: 3, meanCorrectPct: 75.2 },
  { difficulty: 4, meanCorrectPct: 66.4 },
  { difficulty: 5, meanCorrectPct: 54.0 },
];

/** correctPct -> a point on the 1-5 scale. Piecewise-linear, clamped, monotone. */
export function empiricalDifficultyFromPct(correctPct) {
  const pts = CALIBRATION;
  if (correctPct >= pts[0].meanCorrectPct) return 1;
  if (correctPct <= pts[pts.length - 1].meanCorrectPct) return 5;
  for (let i = 0; i < pts.length - 1; i++) {
    const hi = pts[i];
    const lo = pts[i + 1];
    if (correctPct <= hi.meanCorrectPct && correctPct >= lo.meanCorrectPct) {
      const span = hi.meanCorrectPct - lo.meanCorrectPct;
      const t = span === 0 ? 0 : (hi.meanCorrectPct - correctPct) / span;
      return round2(hi.difficulty + t * (lo.difficulty - hi.difficulty));
    }
  }
  return 3;
}

/**
 * The base taxonomy of a raw choice tag: everything before the first colon.
 * The corpus carries ~1,162 distinct raw tags because most are
 * "Base: specific detail" ("Too Strong: must / ensure"). The base is the part
 * worth selecting on; the raw string is kept alongside for display.
 */
export function baseTrapTag(raw) {
  if (!raw) return null;
  const base = String(raw).split(':')[0].trim();
  if (!base) return null;
  // "Out of Scope" and "Out Of Scope" are the same trap.
  return base.replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const round2 = (n) => Math.round(n * 100) / 100;

function buildStats(corpusDir) {
  const questions = [];
  const skipped = [];
  const sources = [];

  const ingest = (file, label) => {
    const r = parseExplanationFile(fs.readFileSync(file, 'utf8'), path.basename(file));
    questions.push(...r.questions);
    skipped.push(...r.skipped.map((s) => ({ ...s, file: label })));
    sources.push({ file: label, parsed: r.questions.length, skipped: r.skipped.length });
  };

  // Corpus roots mirror ingest-lr-explanations.mjs exactly. Diverging here
  // would silently produce stats for a different question set than the DB.
  for (const f of fs.readdirSync(corpusDir).filter((f) => /^PT\d+-explanations\.md$/.test(f)).sort()) {
    ingest(path.join(corpusDir, f), `v2/${f}`);
  }
  const repoExplanations = path.resolve('Explanations');
  if (fs.existsSync(repoExplanations)) {
    const repoFiles = fs
      .readdirSync(repoExplanations)
      .filter((f) => /^PT\d+-explanations\.md$/.test(f))
      .filter((f) => {
        const pt = Number(/^PT(\d+)/.exec(f)[1]);
        return pt >= 141 && pt <= 159; // PT139/PT140 here are stale duplicates
      })
      .sort();
    for (const f of repoFiles) ingest(path.join(repoExplanations, f), `repo/${f}`);
    const s2 = path.join(repoExplanations, 'PT155-S2-explanations.md');
    if (fs.existsSync(s2)) ingest(s2, 'repo/PT155-S2-explanations.md');
  }

  const q = {};
  const statSkips = [];

  for (const question of questions) {
    const { qid, correctChoice, choices } = question;
    if (!correctChoice || choices.length < 5) {
      statSkips.push({ id: qid, reason: 'no correct choice or fewer than 5 choices' });
      continue;
    }

    const pcts = {};
    let sum = 0;
    let missing = false;
    for (const c of choices) {
      if (!Number.isFinite(c.percent)) { missing = true; break; }
      pcts[c.letter] = c.percent;
      sum += c.percent;
    }
    if (missing) {
      statSkips.push({ id: qid, reason: 'a choice carries no percentage' });
      continue;
    }
    // Rounding in the source means the five never sum to exactly 100. Anything
    // outside 95-105 is a transcription fault, not rounding — record it as a
    // skip rather than publishing a number nobody can trust.
    if (sum < 95 || sum > 105) {
      statSkips.push({ id: qid, reason: `choice percentages sum to ${sum}, outside 95-105` });
      continue;
    }

    const correct = choices.find((c) => c.letter === correctChoice);
    if (!correct) {
      statSkips.push({ id: qid, reason: `correct choice ${correctChoice} not among parsed choices` });
      continue;
    }
    const correctPct = correct.percent;

    const wrong = choices.filter((c) => c.letter !== correctChoice);
    let topTrap = null;
    for (const c of wrong) if (!topTrap || c.percent > topTrap.percent) topTrap = c;

    const wrongMass = 100 - correctPct;

    q[qid] = {
      c: correctChoice,
      cp: correctPct,
      ed: empiricalDifficultyFromPct(correctPct),
      tl: topTrap ? topTrap.letter : null,
      tt: topTrap ? baseTrapTag(topTrap.tag) : null,
      ttr: topTrap && topTrap.tag ? topTrap.tag : null,
      tp: topTrap ? topTrap.percent : 0,
      // Trap spread: the top trap's share of the WRONG mass, not of the whole.
      // A question where 39% wrong sits on one choice is a different teaching
      // object from one where it is spread evenly across four, and that cannot
      // be recovered later from an artifact already emailed.
      ts: wrongMass > 0 && topTrap ? round2(topTrap.percent / wrongMass) : 0,
      p: pcts,
    };
  }

  return { q, sources, parseSkips: skipped, statSkips };
}

/** Every qid the question bank knows, so coverage is a real number. */
function bankQids() {
  const ids = new Set();
  let withFeatures = 0;
  const files = fs.readdirSync(BANK_DIR).filter((f) => /-LR\.json$/.test(f));
  for (const f of files) {
    let arr;
    try { arr = JSON.parse(fs.readFileSync(path.join(BANK_DIR, f), 'utf8')); } catch { continue; }
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      ids.add(`${item.practiceTest}-S${item.sectionNumber}-Q${item.questionNumber}`);
      if (Array.isArray(item.questionFeatures) && item.questionFeatures.length) withFeatures++;
    }
  }
  return { ids, withFeatures, files: files.length };
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const corpusDir = args.find((a) => !a.startsWith('--')) ?? DEFAULT_CORPUS_DIR;
  if (!fs.existsSync(corpusDir)) {
    console.error(`corpus dir not found: ${corpusDir}`);
    console.error('pass the directory holding PT101-PT140-explanations.md');
    process.exit(1);
  }

  const { q, sources, parseSkips, statSkips } = buildStats(corpusDir);
  const bank = bankQids();

  const qids = Object.keys(q);
  const inBank = qids.filter((id) => bank.ids.has(id));
  const notInBank = qids.filter((id) => !bank.ids.has(id));
  const bankUncovered = [...bank.ids].filter((id) => !q[id]);

  const payload = {
    // No timestamp in the payload: the artifact generator hashes files derived
    // from this one, and a hash that changes on every run proves nothing.
    calibration: Object.fromEntries(CALIBRATION.map((c) => [c.difficulty, c.meanCorrectPct])),
    coverage: {
      statsQuestions: qids.length,
      bankQuestions: bank.ids.size,
      bankWithFeatures: bank.withFeatures,
      statsAndBank: inBank.length,
      statsNotInBank: notInBank.length,
      bankWithoutStats: bankUncovered.length,
    },
    q,
  };

  const json = `${JSON.stringify(payload, null, 0)}\n`;
  const sha = crypto.createHash('sha256').update(json).digest('hex');

  if (check) {
    const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : '';
    if (current !== json) {
      console.error('question-stats.json is stale — re-run build-question-stats.mjs');
      process.exit(1);
    }
    console.log(`question-stats.json is current (${qids.length} questions, sha ${sha.slice(0, 12)})`);
    return;
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, json);
  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(
    REPORT_FILE,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sha256: sha,
        sources,
        coverage: payload.coverage,
        parseSkips,
        statSkips,
        statsNotInBankSample: notInBank.slice(0, 20),
        bankWithoutStatsSample: bankUncovered.slice(0, 20),
      },
      null,
      2,
    )}\n`,
  );

  console.log(`wrote ${path.relative(process.cwd(), OUT_FILE)}`);
  console.log(`  questions with stats : ${qids.length}`);
  console.log(`  bank questions       : ${bank.ids.size}`);
  console.log(`  stats ∩ bank         : ${inBank.length}`);
  console.log(`  stats not in bank    : ${notInBank.length}`);
  console.log(`  bank without stats   : ${bankUncovered.length}`);
  console.log(`  parse skips          : ${parseSkips.length}`);
  console.log(`  stat skips           : ${statSkips.length}`);
  console.log(`  report               : ${path.relative(process.cwd(), REPORT_FILE)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
