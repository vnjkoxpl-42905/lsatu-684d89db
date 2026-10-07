#!/usr/bin/env node
// For every seeded guided drill x every level, report the measured cohort
// accuracy of the set a student would actually draw.
//
// This is the question the level control could never answer before: a drill
// tagged "advanced" can still serve questions three quarters of test takers
// get right, because the drill's own difficulty clamp applies BEFORE the
// student's band and can collapse the intersection to a single difficulty.
//
// Read-only. Emits scripts/out/drill-level-report.{json,md}.

import fs from 'node:fs';
import path from 'node:path';
import { loadBank, loadSeed, resolvePool } from '../lib/drill-pool.mjs';

const STATS = path.resolve('public/data/question-stats.json');
const OUT_JSON = path.resolve('scripts/out/drill-level-report.json');
const OUT_MD = path.resolve('scripts/out/drill-level-report.md');

// Mirrors LEVEL_BANDS in src/lib/studentLevel.ts. The overlap is deliberate:
// narrowing these collides with each drill's own clamp and empties pools.
const LEVEL_BANDS = {
  beginner: { min: 1, max: 3 },
  intermediate: { min: 2, max: 4 },
  advanced: { min: 3, max: 5 },
};

/** A set averaging at or above this is beginner-grade work whatever it is labelled. */
const BEGINNER_GRADE_PCT = 75;

function main() {
  const drills = loadSeed();
  const bank = loadBank();
  const stats = JSON.parse(fs.readFileSync(STATS, 'utf8')).q;

  const rows = [];
  for (const drill of drills) {
    const pool = resolvePool(drill.bank_filter, bank);
    const count = drill.bank_filter?.count ?? drill.question_count ?? null;

    for (const [level, band] of Object.entries(LEVEL_BANDS)) {
      const inBand = pool.filter((q) => q.difficulty >= band.min && q.difficulty <= band.max);
      const measured = inBand.map((q) => stats[q.qid]).filter(Boolean);
      const meanCorrectPct = measured.length
        ? Math.round((measured.reduce((a, s) => a + s.cp, 0) / measured.length) * 10) / 10
        : null;

      // The trap the drill leans on most at this level — useful for choosing
      // between two drills that look equivalent on difficulty alone.
      const trapCounts = new Map();
      for (const s of measured) if (s.tt) trapCounts.set(s.tt, (trapCounts.get(s.tt) ?? 0) + 1);
      const topTraps = [...trapCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

      rows.push({
        slug: drill.slug,
        title: drill.title,
        drillLevelTag: drill.level ?? null,
        clamp: [drill.bank_filter?.difficulty_min ?? null, drill.bank_filter?.difficulty_max ?? null],
        level,
        questionCount: count,
        poolSize: pool.length,
        inBand: inBand.length,
        measured: measured.length,
        meanCorrectPct,
        beginnerGrade: meanCorrectPct != null && meanCorrectPct >= BEGINNER_GRADE_PCT,
        zeroAtLevel: inBand.length === 0,
        shortOfCount: count != null && inBand.length > 0 && inBand.length < count,
        topTraps: topTraps.map(([tag, n]) => ({ tag, n })),
      });
    }
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify({ beginnerGradeThreshold: BEGINNER_GRADE_PCT, rows }, null, 2)}\n`);

  // Markdown, ordered worst-offender first: an "advanced" row serving
  // beginner-grade work is the thing this report exists to surface.
  const offenders = rows
    .filter((r) => r.level === 'advanced' && r.beginnerGrade)
    .sort((a, b) => b.meanCorrectPct - a.meanCorrectPct);
  const zero = rows.filter((r) => r.zeroAtLevel);

  const lines = [];
  lines.push('# Guided drills: what each level actually serves', '');
  lines.push(`Generated from \`public/data/question-stats.json\`. ${drills.length} drills x 3 levels.`, '');
  lines.push('Mean correct% is the measured LSAT Lab cohort accuracy of the in-band pool.');
  lines.push(`Lower is harder. A set at or above ${BEGINNER_GRADE_PCT}% is beginner-grade work.`, '');

  for (const level of Object.keys(LEVEL_BANDS)) {
    const at = rows.filter((r) => r.level === level && r.meanCorrectPct != null);
    const mean = Math.round((at.reduce((a, r) => a + r.meanCorrectPct, 0) / at.length) * 10) / 10;
    lines.push(`- **${level}** (difficulty ${LEVEL_BANDS[level].min}-${LEVEL_BANDS[level].max}): mean ${mean}% correct across ${at.length} drills`);
  }
  lines.push('');

  lines.push(`## Advanced drills serving beginner-grade work (${offenders.length})`, '');
  lines.push('| mean correct% | drill | drill tag | clamp | in band |');
  lines.push('|---|---|---|---|---|');
  for (const r of offenders) {
    lines.push(`| ${r.meanCorrectPct}% | \`${r.slug}\` | ${r.drillLevelTag ?? '—'} | ${r.clamp[0] ?? 1}-${r.clamp[1] ?? 5} | ${r.inBand} |`);
  }
  lines.push('');

  lines.push(`## Zero at level (${zero.length})`, '');
  lines.push('| drill | level | drill tag | clamp |');
  lines.push('|---|---|---|---|');
  for (const r of zero) {
    lines.push(`| \`${r.slug}\` | ${r.level} | ${r.drillLevelTag ?? '—'} | ${r.clamp[0] ?? 1}-${r.clamp[1] ?? 5} |`);
  }
  lines.push('');

  fs.writeFileSync(OUT_MD, `${lines.join('\n')}\n`);

  console.log(`wrote ${path.relative(process.cwd(), OUT_MD)}`);
  for (const level of Object.keys(LEVEL_BANDS)) {
    const at = rows.filter((r) => r.level === level && r.meanCorrectPct != null);
    const mean = (at.reduce((a, r) => a + r.meanCorrectPct, 0) / at.length).toFixed(1);
    const bg = rows.filter((r) => r.level === level && r.beginnerGrade).length;
    const z = rows.filter((r) => r.level === level && r.zeroAtLevel).length;
    console.log(`  ${level.padEnd(13)} mean ${mean}%   beginner-grade ${String(bg).padStart(3)}   zero-at-level ${String(z).padStart(3)}`);
  }
}

main();
