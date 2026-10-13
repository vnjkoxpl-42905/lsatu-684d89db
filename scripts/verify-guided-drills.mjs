#!/usr/bin/env node
// One command that proves the whole guided-drill path still works.
//
// The pieces are verified individually elsewhere; what this adds is that they
// are verified TOGETHER, in order, from a fixed input, on demand. The failure
// this exists to catch is the one no single spec sees: a template edit that
// keeps every unit test green and produces a drill file whose answers no
// longer match the bank.
//
// It builds a real artifact from a committed qid list, twice, and compares the
// hashes — byte-stability is what makes the manifest's hashes mean anything,
// and it cannot be asserted from one run.
//
// Read-only with respect to the database and Gmail. Nothing here assigns
// anything, and nothing here can send.
//
// Usage:
//   node scripts/verify-guided-drills.mjs           full run
//   node scripts/verify-guided-drills.mjs --fast    skip typecheck and the browser pass

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const FAST = process.argv.includes('--fast');

const SLUG = 'w2-07-necessary-assumption-first-taste';
const LEVEL = 'beginner';
const QIDS_FILE = 'scripts/fixtures/drill-verify-qids.txt';
const OUT_DIR = 'scripts/out/verify-run';
const RECIPIENT = 'contact@aspiringattorneys.com';

const results = [];
let failed = 0;

/**
 * A step may pass, fail, or skip. Skipping matters: this suite has to be
 * runnable from a detached worktree, where the explanation corpus that lives
 * beside the repo is not reachable. A step that cannot run must say so rather
 * than pass quietly (which would claim a check happened) or fail (which would
 * make a green run impossible in the one place it matters most, verifying a
 * commit in isolation).
 */
class Skipped extends Error {}

function step(label, fn) {
  process.stdout.write(`\n▸ ${label}\n`);
  const started = process.hrtime.bigint();
  let state = 'FAIL';
  let detail = '';
  try {
    detail = fn() ?? '';
    state = 'PASS';
  } catch (err) {
    detail = err.message;
    if (err instanceof Skipped) state = 'SKIP';
  }
  const ms = Number((process.hrtime.bigint() - started) / 1000000n);
  if (state === 'FAIL') failed++;
  results.push({ label, state, detail, ms });
  process.stdout.write(`  ${state}  ${label}${detail ? ` — ${detail}` : ''} (${ms}ms)\n`);
}

function run(cmd, args, { quiet = false } = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (!quiet) process.stdout.write(output.split('\n').map((l) => `    ${l}`).join('\n'));
  if (r.status !== 0) {
    const tail = output.trim().split('\n').slice(-4).join(' | ');
    throw new Error(tail || `${cmd} exited ${r.status}`);
  }
  return output;
}

const sha = (file) =>
  spawnSync('shasum', ['-a', '256', file], { encoding: 'utf8' }).stdout.split(' ')[0];

/* ------------------------------------------------------------------ steps -- */

if (!FAST) {
  step('typecheck', () => {
    run('npx', ['tsc', '--noEmit', '-p', 'tsconfig.app.json'], { quiet: true });
    return 'no type errors';
  });
}

step('unit specs', () => {
  const out = run(
    'npx',
    [
      'vitest',
      'run',
      'src/lib/guidedDrillLevel.test.ts',
      'src/lib/guidedDrillLevel.parity.test.ts',
      'src/lib/guidedDrillLevel.port.test.ts',
      'src/lib/questionSelectionSignals.test.ts',
      'src/lib/guidedDrillLaunch.test.ts',
      'src/lib/guidedDrillLaunch.parity.test.ts',
      'src/lib/assignWork.test.ts',
      'src/lib/__tests__/questionStatsBuilder.test.ts',
      'src/components/teacher/library/AssignWorkSheet.test.tsx',
    ],
    { quiet: true },
  );
  const m = /Tests\s+(\d+) passed/.exec(out);
  return m ? `${m[1]} passed` : 'passed';
});

step('question stats are current', () => {
  // The corpus lives beside the repo in the brain, not inside it. Resolve it
  // explicitly so this works from a worktree, and skip rather than guess when
  // it genuinely is not there.
  const candidates = [
    path.resolve('../../wiki/explanations'),
    '/Users/joshuaf/ai-os/wiki/explanations',
  ];
  const corpus = candidates.find((dir) => fs.existsSync(dir));
  if (!corpus) {
    throw new Skipped('explanation corpus not reachable from here');
  }
  const out = run('node', ['scripts/knowledge/build-question-stats.mjs', '--check', corpus], {
    quiet: true,
  });
  return out.trim().split('\n').pop();
});

step('answer keys match the LSAT Lab sidecar', () => {
  // The field the drill grades on is `correctAnswer` in the bank; the field
  // every explanation renders from is the sidecar's correct choice. They drifted
  // apart once — 190 questions marked students wrong for the right answer, for
  // four months, until a student reported it. This is the tripwire.
  const out = run('node', ['scripts/repair-correct-answers.mjs', '--check'], { quiet: true });
  return out.trim().split('\n').pop();
});

step('drill level report is current', () => {
  run('node', ['scripts/knowledge/report-drill-levels.mjs'], { quiet: true });
  const report = JSON.parse(fs.readFileSync('scripts/out/drill-level-report.json', 'utf8'));
  return `${report.rows.length} drill/level rows`;
});

step('a drill resolves to a set without a browser or a database', () => {
  const out = run(
    'node',
    ['scripts/resolve-drill-qids.mjs', '--slug', SLUG, '--level', LEVEL, '--count', '6',
     '--traps', 'Too Strong', '--seed', '42', '--json'],
    { quiet: true },
  );
  const r = JSON.parse(out);
  if (r.qids.length !== 6) throw new Error(`asked for 6, got ${r.qids.length}`);
  if (r.trapMatches !== 6) throw new Error(`trap targeting matched ${r.trapMatches} of 6`);
  return `${r.qids.length} questions, ${r.trapMatches} on target, mean ${r.meanCorrectPct}%`;
});

step('frozen set is describable', () => {
  const out = run('node', ['scripts/describe-qids.mjs', '--qids-file', QIDS_FILE], { quiet: true });
  if (/NOT IN BANK/.test(out)) throw new Error('a fixture qid is not in the bank');
  return out.trim().split('\n').find((l) => l.startsWith('Mean')) ?? 'described';
});

let manifestPath;

step('artifact builds, and builds identically twice', () => {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  const args = [
    'scripts/build-drill-artifact.mjs',
    '--slug', SLUG,
    '--level', LEVEL,
    '--qids-file', QIDS_FILE,
    '--student', 'Verification',
    '--assignment-id', '00000000-0000-0000-0000-000000000000',
    '--out-dir', OUT_DIR,
  ];
  run('node', args, { quiet: true });

  manifestPath = path.join(OUT_DIR, 'manifest.json');
  const first = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const htmlPath = first.files.html.path;
  const firstHash = sha(htmlPath);

  // Second run into the same place. A timestamp or a Map iteration order that
  // leaked into the markup shows up here and nowhere else.
  run('node', args, { quiet: true });
  const secondHash = sha(htmlPath);

  if (firstHash !== secondHash) {
    throw new Error(`html is not byte-stable: ${firstHash.slice(0, 12)} then ${secondHash.slice(0, 12)}`);
  }
  if (firstHash !== first.files.html.sha256) {
    throw new Error('manifest hash does not match the file it describes');
  }
  return `${first.qids.length} questions, html ${firstHash.slice(0, 12)}`;
});

if (!FAST) {
  step('artifact works as a file, storage on and storage blocked', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const out = run('node', ['scripts/verify-drill-artifact.mjs', manifest.files.html.path], { quiet: true });
    const m = /(\d+)\s+checks/.exec(out);
    if (/FAIL/.test(out)) throw new Error(out.trim().split('\n').filter((l) => /FAIL/.test(l)).join(' | '));
    return m ? `${m[1]} browser checks` : 'passed';
  });
}

step('pdf is selectable text, not a picture of it', () => {
  const out = run('python3', ['scripts/verify-drill-pdf.py', manifestPath], { quiet: true });
  if (/FAIL/.test(out)) throw new Error(out.trim().split('\n').filter((l) => /FAIL/.test(l)).join(' | '));
  return out.match(/has pages — (\d+ pages)/)?.[1] ?? 'passed';
});

step('email assembles and survives an independent parser', () => {
  run(
    'node',
    ['scripts/build-drill-email.mjs', '--manifest', manifestPath, '--to', RECIPIENT, '--timeframe', 'today'],
    { quiet: true },
  );
  const out = run('python3', ['scripts/verify-drill-email.py', manifestPath], { quiet: true });
  if (/FAIL/.test(out)) throw new Error(out.trim().split('\n').filter((l) => /FAIL/.test(l)).join(' | '));
  const bytes = fs.statSync(path.join(OUT_DIR, 'draft.eml')).size;
  return `${(bytes / 1024).toFixed(0)}KB draft`;
});

/* ----------------------------------------------------------------- report -- */

process.stdout.write(`\n${'-'.repeat(64)}\n`);
for (const r of results) {
  process.stdout.write(`${r.state}  ${r.label}${r.state === 'SKIP' ? ` (${r.detail})` : ''}\n`);
}
const skipped = results.filter((r) => r.state === 'SKIP').length;
process.stdout.write(
  `\n${failed === 0 ? 'ALL PASS' : `${failed} FAILED`} — ${results.length} steps${
    skipped ? `, ${skipped} skipped` : ''
  }${FAST ? ' (fast mode: typecheck and browser pass skipped)' : ''}\n`,
);
process.exit(failed === 0 ? 0 : 1);
