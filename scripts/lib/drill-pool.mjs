// The question bank and a drill's pool, for local Node tooling.
//
// Pulled out of report-drill-levels.mjs so the report, the qid resolver and
// anything else agree by construction rather than by two people remembering
// to edit both. Mirrors resolveGuidedDrillPool in src/lib/guidedDrills.ts.

import fs from 'node:fs';
import path from 'node:path';

const BANK_DIR = path.resolve('public/data');
const STATS = path.resolve('public/data/question-stats.json');
const SEED = path.resolve('data/guided-drills/_seed.json');

/** Every LR question the local bank files know, keyed by qid. */
export function loadBank() {
  const byQid = new Map();
  for (const file of fs.readdirSync(BANK_DIR).filter((n) => /-LR\.json$/.test(n))) {
    let arr;
    try {
      arr = JSON.parse(fs.readFileSync(path.join(BANK_DIR, file), 'utf8'));
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

export function loadSeed() {
  return JSON.parse(fs.readFileSync(SEED, 'utf8'));
}

/**
 * Cohort stats hydrated into the shape resolveLeveledDrillQids expects.
 * The sidecar's keys are abbreviated; this mirrors hydrate() in
 * src/lib/questionStats.ts.
 */
export function loadStats() {
  if (!fs.existsSync(STATS)) return new Map();
  const payload = JSON.parse(fs.readFileSync(STATS, 'utf8'));
  const map = new Map();
  for (const [qid, raw] of Object.entries(payload.q ?? {})) {
    map.set(qid, {
      correctChoice: raw.c,
      correctPct: raw.cp,
      empiricalDifficulty: raw.ed,
      topTrapLetter: raw.tl,
      topTrapTag: raw.tt,
      topTrapTagRaw: raw.ttr,
      topTrapPct: raw.tp,
      trapSpread: raw.ts,
      choicePcts: raw.p,
    });
  }
  return map;
}

/** Mirrors resolveGuidedDrillPool in src/lib/guidedDrills.ts. */
export function resolvePool(bankFilter, bank) {
  const f = bankFilter ?? {};
  const qtypes = new Set((f.qtypes || []).map((s) => s.toLowerCase()));
  const features = new Set((f.features || []).map((s) => s.toLowerCase()));
  const reasoning = new Set((f.reasoning_types || []).map((s) => s.toLowerCase()));
  const dmin = f.difficulty_min ?? null;
  const dmax = f.difficulty_max ?? null;

  const out = [];
  for (const [qid, q] of bank) {
    if (qtypes.size && !qtypes.has((q.questionType || '').toLowerCase())) continue;
    if (features.size && !(q.questionFeatures || []).some((x) => features.has((x || '').toLowerCase())))
      continue;
    if (reasoning.size && !(q.reasoningType || []).some((x) => reasoning.has((x || '').toLowerCase())))
      continue;
    const d = q.questionDifficulty;
    if (!Number.isFinite(d)) continue;
    if (dmin != null && d < dmin) continue;
    if (dmax != null && d > dmax) continue;
    out.push({ qid, difficulty: d, type: q.questionType });
  }
  return out;
}
