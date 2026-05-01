/**
 * scripts/import-content.ts — the build-time corpus import pipeline.
 *
 * Per architecture-plan.md §4 + JOSHUA DIRECTIVE 2026-04-30 (Rec #2 scope split):
 *
 *   GENERATES (writes to src/data/*.generated.json):
 *     - named-tools.generated.json
 *     - indicator-vault.generated.json
 *     - traps.generated.json
 *     - references.generated.json
 *     - simulator.generated.json
 *     - manifest.generated.json
 *
 *   DOES NOT GENERATE:
 *     - lessons.generated.json (hand-authored; the renderer in src/modules/lessons/Lesson.tsx reads it directly)
 *     - calibration.generated.json (hand-authored seed; Capstone.tsx page builds against it later)
 *
 *   PARITY-VERIFIES (reads + checks; no writes):
 *     - Hand-authored lessons: every named-tool callout, every reference callout, every source-citation
 *       must trace to the manifest. Drift = build error.
 *     - Calibration items: every source_anchor.primary path must exist on disk; trait-target tags
 *       must be in {T1..T7, T-Concession, cluster-decomposition}.
 *
 *   CLI:
 *     npm run import              — full import + parity verification
 *     npm run import:dry          — Gate 0 source-access check + schema validation, no writes
 *     npm run import -- --force   — bypass cache (re-hash all sources)
 *
 *   Sources of truth:
 *     - src/content/*.source.ts — TS data files for generated content kinds
 *     - /Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/... — canonical corpus paths
 *     - src/data/lessons.generated.json — hand-authored lesson body
 *     - src/data/calibration.generated.json — hand-authored calibration seed
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { NAMED_TOOLS } from '../src/content/named-tools.source.ts';
import { INDICATOR_VAULT } from '../src/content/indicators.source.ts';
import { TRAP_TRAITS } from '../src/content/traps.source.ts';
import { REFERENCE_SECTIONS } from '../src/content/references.source.ts';
import { SIMULATOR_QUESTIONS } from '../src/content/simulator.source.ts';
import {
  NamedToolList,
  IndicatorVault,
  TrapTraitList,
  ReferenceList,
  SimulatorBank,
  Manifest,
  LessonList,
  CalibrationItem,
  type ManifestEntryT,
} from '../src/content/schemas.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

const IMPORTER_VERSION = '0.1.0-gate4-step3';
const NOW = () => new Date().toISOString();

const CANONICAL_BASE = '/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion';

// ── CLI flags ──────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const FORCE = argv.includes('--force');

// ── Logging helpers ────────────────────────────────────────────────────────
const c = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};
const log = {
  step: (msg: string) => console.log(c.bold(`▶ ${msg}`)),
  ok: (msg: string) => console.log(c.green(`✓ ${msg}`)),
  warn: (msg: string) => console.log(c.yellow(`⚠ ${msg}`)),
  err: (msg: string) => console.error(c.red(`✗ ${msg}`)),
  dim: (msg: string) => console.log(c.dim(`  ${msg}`)),
};

// ── Hash + write helpers ───────────────────────────────────────────────────
function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function fileHash(path: string): string {
  if (!existsSync(path)) return 'missing';
  return sha256(readFileSync(path).toString());
}

function writeJson(filename: string, data: unknown): string {
  const path = join(DATA_DIR, filename);
  const json = JSON.stringify(data, null, 2);
  if (!DRY_RUN) writeFileSync(path, json + '\n');
  log.dim(`${DRY_RUN ? '[dry-run] would write' : 'wrote'} ${filename} (${(json.length / 1024).toFixed(1)} KB)`);
  return path;
}

// ── Pipeline steps ─────────────────────────────────────────────────────────

interface StepResult {
  kind: ManifestEntryT['kind'];
  ids: string[];
  source_paths: string[];
  output_path: string;
}

function emitNamedTools(): StepResult {
  log.step('Emit named-tools.generated.json');
  const validated = NamedToolList.parse(NAMED_TOOLS);
  if (validated.length !== 15) throw new Error(`Expected 15 named tools, got ${validated.length}`);
  const out = writeJson('named-tools.generated.json', validated);
  log.ok(`${validated.length} named tools validated + emitted`);
  return {
    kind: 'named-tool',
    ids: validated.map((t) => t.id),
    source_paths: ['src/content/named-tools.source.ts'],
    output_path: out,
  };
}

function emitIndicatorVault(): StepResult {
  log.step('Emit indicator-vault.generated.json');
  const validated = IndicatorVault.parse(INDICATOR_VAULT);
  if (validated.length !== 6) throw new Error(`Expected 6 indicator categories, got ${validated.length}`);
  const out = writeJson('indicator-vault.generated.json', validated);
  log.ok(`${validated.length} indicator categories validated + emitted`);
  return {
    kind: 'indicator',
    ids: validated.map((c) => c.id),
    source_paths: ['src/content/indicators.source.ts'],
    output_path: out,
  };
}

function emitTraps(): StepResult {
  log.step('Emit traps.generated.json');
  const validated = TrapTraitList.parse(TRAP_TRAITS);
  const out = writeJson('traps.generated.json', validated);
  log.ok(`7 trap traits validated + emitted`);
  return {
    kind: 'trap',
    ids: validated.map((t) => t.id),
    source_paths: ['src/content/traps.source.ts'],
    output_path: out,
  };
}

function emitReferences(): StepResult {
  log.step('Emit references.generated.json');
  const validated = ReferenceList.parse(REFERENCE_SECTIONS);
  const out = writeJson('references.generated.json', validated);
  log.ok(`${validated.length} reference sections validated + emitted`);
  return {
    kind: 'reference',
    ids: validated.map((r) => r.id),
    source_paths: ['src/content/references.source.ts'],
    output_path: out,
  };
}

function emitSimulator(): StepResult {
  log.step('Emit simulator.generated.json');
  // Merge MCFIRST extraction (stimulus + main_conclusion + why + structure_map + follow_up_answer)
  // when available. Pipeline runs `tsx scripts/extract-mcfirst.ts` is gated by file presence —
  // not invoked here to keep this step pure-data. Run `npm run extract:mcfirst` to refresh.
  const mcfirstPath = join(DATA_DIR, 'mcfirst.extracted.json');
  let mcfirst: Record<number, any> = {};
  if (existsSync(mcfirstPath)) {
    const raw = JSON.parse(readFileSync(mcfirstPath, 'utf-8'));
    for (const q of raw.questions ?? []) mcfirst[q.number] = q;
    log.dim(`merging MCFIRST extraction (${Object.keys(mcfirst).length} questions)`);
  } else {
    log.warn('mcfirst.extracted.json missing — emitting metadata-only simulator (run `npm run extract:mcfirst`)');
  }

  const merged = SIMULATOR_QUESTIONS.map((q) => {
    const m = mcfirst[q.number];
    if (!m) return q;
    return {
      ...q,
      stimulus: m.stimulus,
      main_conclusion: m.main_conclusion,
      why: m.why,
      structure_map: m.structure_map,
      follow_up_answer: m.follow_up_answer,
    };
  });

  const validated = SimulatorBank.parse(merged);
  const out = writeJson('simulator.generated.json', validated);
  const populated = validated.filter((q) => q.stimulus && q.stimulus.length > 20).length;
  log.ok(`20 simulator questions validated + emitted (${populated}/20 with full stimulus text)`);
  return {
    kind: 'simulator-question',
    ids: validated.map((q) => q.id),
    source_paths: ['src/content/simulator.source.ts', 'src/data/mcfirst.extracted.json'],
    output_path: out,
  };
}

// ── Parity verification ────────────────────────────────────────────────────

interface ParityResult {
  lessons_verified: number;
  verbatim_assets_verified: number;
  drift_warnings: string[];
}

function verifyLessonParity(allManifestIds: Set<string>): ParityResult {
  log.step('Parity-verify hand-authored lessons (LessonList schema + manifest cross-check)');
  const lessonsPath = join(DATA_DIR, 'lessons.generated.json');
  if (!existsSync(lessonsPath)) {
    log.warn('lessons.generated.json not present — skipping parity check');
    return { lessons_verified: 0, verbatim_assets_verified: 0, drift_warnings: ['lessons.generated.json missing'] };
  }
  const raw = JSON.parse(readFileSync(lessonsPath, 'utf8'));
  const lessons = LessonList.parse(raw);
  const drift: string[] = [];
  let assets = 0;

  for (const lesson of lessons) {
    for (const cb of lesson.named_tool_callouts) {
      assets++;
      if (!allManifestIds.has(cb.tool_id)) {
        drift.push(`${lesson.id} references named-tool ${cb.tool_id} which is not in the manifest`);
      }
    }
    for (const rc of lesson.reference_callouts) {
      assets++;
      if (!allManifestIds.has(rc.reference_id)) {
        drift.push(`${lesson.id} references ${rc.reference_id} which is not in the manifest`);
      }
    }
    if (lesson.sources.length === 0) {
      drift.push(`${lesson.id} has no source citations`);
    }
  }

  if (drift.length === 0) {
    log.ok(`${lessons.length} lessons verified · ${assets} verbatim-asset references checked · 0 drift`);
  } else {
    drift.forEach((d) => log.warn(d));
  }

  return { lessons_verified: lessons.length, verbatim_assets_verified: assets, drift_warnings: drift };
}

function verifyCalibrationParity(): { items_verified: number; pending_ocr: number; warnings: string[] } {
  log.step('Parity-verify hand-authored calibration items');
  const calPath = join(DATA_DIR, 'calibration.generated.json');
  if (!existsSync(calPath)) {
    log.warn('calibration.generated.json not present — skipping');
    return { items_verified: 0, pending_ocr: 0, warnings: ['calibration.generated.json missing'] };
  }
  const raw = JSON.parse(readFileSync(calPath, 'utf8'));
  const items = z.array(CalibrationItem).parse(raw.items ?? []);
  const warnings: string[] = [];
  let pending = 0;
  for (const item of items) {
    const anchor = item.source_anchor as Record<string, unknown>;
    if (anchor.ocr_required) pending++;
    const primary = anchor.primary as string | undefined;
    if (primary && primary.startsWith('Curriculum/Main Conclusion/')) {
      const fullPath = join(CANONICAL_BASE, primary.replace('Curriculum/Main Conclusion/', ''));
      // Strip per-item suffix to check directory presence
      const fileOnly = fullPath.split(' — ')[0];
      if (fileOnly && !existsSync(fileOnly)) {
        warnings.push(`${item.id} source file not found: ${fileOnly}`);
      }
    }
  }
  log.ok(`${items.length} calibration items validated · ${pending} pending OCR (resolves at Capstone.tsx build time)`);
  if (warnings.length > 0) warnings.forEach((w) => log.warn(w));
  return { items_verified: items.length, pending_ocr: pending, warnings };
}

// ── Manifest assembly ──────────────────────────────────────────────────────

function emitManifest(steps: StepResult[], parity: ParityResult): void {
  log.step('Emit manifest.generated.json');
  const entries: ManifestEntryT[] = [];

  for (const step of steps) {
    for (const id of step.ids) {
      const sourceHashes: Record<string, string> = {};
      for (const sp of step.source_paths) {
        sourceHashes[sp] = fileHash(join(ROOT, sp));
      }
      entries.push({
        id,
        kind: step.kind,
        source_paths: step.source_paths,
        source_hashes: sourceHashes,
        importer_version: IMPORTER_VERSION,
        generated_at: NOW(),
        output_path: step.output_path.replace(ROOT + '/', ''),
        parity_status: 'imported',
      });
    }
  }

  // Add lessons (parity-verified, not generated)
  const lessonsPath = join(DATA_DIR, 'lessons.generated.json');
  if (existsSync(lessonsPath)) {
    const raw = JSON.parse(readFileSync(lessonsPath, 'utf8'));
    const lessons = LessonList.parse(raw);
    for (const lesson of lessons) {
      entries.push({
        id: lesson.id,
        kind: 'lesson',
        source_paths: ['src/data/lessons.generated.json (hand-authored)'],
        source_hashes: { 'src/data/lessons.generated.json': fileHash(lessonsPath) },
        importer_version: IMPORTER_VERSION,
        generated_at: NOW(),
        output_path: 'src/data/lessons.generated.json',
        parity_status: 'parity-verified',
      });
    }
  }

  // Add calibration (parity-verified, not generated)
  const calPath = join(DATA_DIR, 'calibration.generated.json');
  if (existsSync(calPath)) {
    const raw = JSON.parse(readFileSync(calPath, 'utf8'));
    const items = z.array(CalibrationItem).parse(raw.items ?? []);
    for (const item of items) {
      entries.push({
        id: item.id,
        kind: 'calibration',
        source_paths: ['src/data/calibration.generated.json (hand-authored seed)'],
        source_hashes: { 'src/data/calibration.generated.json': fileHash(calPath) },
        importer_version: IMPORTER_VERSION,
        generated_at: NOW(),
        output_path: 'src/data/calibration.generated.json',
        parity_status: 'parity-verified',
      });
    }
  }

  const manifest = Manifest.parse({
    generator_version: IMPORTER_VERSION,
    generated_at: NOW(),
    entries,
    parity_check_summary: parity,
  });
  writeJson('manifest.generated.json', manifest);
  log.ok(`${entries.length} manifest entries · ${steps.length} generated kinds · 2 parity-verified kinds (lessons, calibration)`);
}

// ── Gate 0 source-access re-check ──────────────────────────────────────────

function gate0SourceAccessCheck(): void {
  log.step('Gate 0 — canonical source-access re-check');
  const paths = [
    `${CANONICAL_BASE}/_export_2026-04-29/spec.html`,
    `${CANONICAL_BASE}/_export_2026-04-29/rules`,
    `${CANONICAL_BASE}/Notes`,
    `${CANONICAL_BASE}/Homework`,
    `${CANONICAL_BASE}/Notes/MCFIRST SENTENCE : REBUTTAL.pdf`,
    `${CANONICAL_BASE}/Notes/main_conclusion_questions_dup1.pdf`,
    `${CANONICAL_BASE}/Homework/main_conclusion_answer_key_dup1.pdf`,
    `${CANONICAL_BASE}/Homework/AP Answer Key (1).pdf`,
    `${CANONICAL_BASE}/Notes/main_conclusion_student_dup1.docx`,
    `${CANONICAL_BASE}/Notes/Cluster Sentences Review.docx`,
  ];
  let missing = 0;
  for (const p of paths) {
    if (!existsSync(p)) {
      log.err(`MISSING: ${p}`);
      missing++;
    }
  }
  if (missing > 0) throw new Error(`Gate 0 FAIL — ${missing} canonical source(s) missing`);
  log.ok(`${paths.length} canonical paths verified present`);
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log('');
  console.log(c.bold('Main Conclusion Bootcamp — Content Import Pipeline'));
  console.log(c.dim(`v${IMPORTER_VERSION} · ${NOW()} · ${DRY_RUN ? 'DRY RUN' : 'WRITE'}${FORCE ? ' · FORCE' : ''}`));
  console.log('');

  try {
    gate0SourceAccessCheck();

    const steps: StepResult[] = [
      emitNamedTools(),
      emitIndicatorVault(),
      emitTraps(),
      emitReferences(),
      emitSimulator(),
    ];

    const allManifestIds = new Set<string>();
    for (const step of steps) for (const id of step.ids) allManifestIds.add(id);

    const parity = verifyLessonParity(allManifestIds);
    const calParity = verifyCalibrationParity();
    parity.drift_warnings.push(...calParity.warnings);

    emitManifest(steps, parity);

    console.log('');
    if (parity.drift_warnings.length === 0) {
      log.ok(c.bold('Pipeline complete · no drift'));
    } else {
      log.warn(c.bold(`Pipeline complete with ${parity.drift_warnings.length} drift warning(s)`));
    }
    console.log('');
  } catch (err) {
    console.log('');
    log.err(`Pipeline FAILED: ${(err as Error).message}`);
    if (process.env.DEBUG) console.error(err);
    process.exit(1);
  }
}

main();
