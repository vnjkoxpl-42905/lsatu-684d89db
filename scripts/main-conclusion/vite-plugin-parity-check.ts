/**
 * vite-plugin-parity-check
 *
 * Catches drift between hand-authored content (lessons + calibration) and the
 * generated manifest as Joshua edits files in dev. Drift surfaces in the Vite
 * error overlay instead of waiting for the next CI run.
 *
 * Triggers on changes to:
 *   - src/data/lessons.generated.json
 *   - src/data/calibration.generated.json
 *   - src/data/manifest.generated.json
 *   - src/data/named-tools.generated.json
 *   - src/data/references.generated.json
 *
 * Validates:
 *   - Every lesson named-tool callout references an NT- id present in the manifest.
 *   - Every lesson reference callout references an MC-REF- id present in the manifest.
 *   - Every lesson has at least one `sources[]` entry.
 *   - Every calibration item has a non-empty trait_target.
 *
 * Cold-start cost target: <500ms (single sync read of 5 small JSON files + a Set walk).
 */

import type { Plugin, ViteDevServer } from 'vite';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface ParityIssue {
  file: string;
  message: string;
}

const WATCHED = [
  'src/data/lessons.generated.json',
  'src/data/calibration.generated.json',
  'src/data/manifest.generated.json',
  'src/data/named-tools.generated.json',
  'src/data/references.generated.json',
];

function readJsonSafe<T = unknown>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return null;
  }
}

export function parityCheck(opts: { root?: string } = {}): Plugin {
  const root = opts.root ?? process.cwd();
  let server: ViteDevServer | undefined;

  function runCheck(): ParityIssue[] {
    const issues: ParityIssue[] = [];
    const manifest = readJsonSafe<{ entries: Array<{ id: string }> }>(
      join(root, 'src/data/manifest.generated.json'),
    );
    const namedTools = readJsonSafe<Array<{ id: string }>>(
      join(root, 'src/data/named-tools.generated.json'),
    );
    const refs = readJsonSafe<Array<{ id: string }>>(
      join(root, 'src/data/references.generated.json'),
    );
    const lessons = readJsonSafe<Array<any>>(
      join(root, 'src/data/lessons.generated.json'),
    );
    const calibrationRaw = readJsonSafe<any>(
      join(root, 'src/data/calibration.generated.json'),
    );
    const calibration: any[] | null = Array.isArray(calibrationRaw)
      ? calibrationRaw
      : Array.isArray(calibrationRaw?.items)
        ? calibrationRaw.items
        : null;

    if (!manifest) {
      issues.push({ file: 'manifest', message: 'manifest.generated.json missing — run `npm run import`' });
      return issues;
    }

    const manifestIds = new Set(manifest.entries.map((e) => e.id));
    const ntIds = new Set((namedTools ?? []).map((n) => n.id));
    const refIds = new Set((refs ?? []).map((r) => r.id));

    if (lessons) {
      for (const lesson of lessons) {
        const lid = lesson.id ?? '<unknown lesson>';
        for (const cb of lesson.named_tool_callouts ?? []) {
          if (!ntIds.has(cb.tool_id) || !manifestIds.has(cb.tool_id)) {
            issues.push({ file: 'lessons.generated.json', message: `${lid} → unknown named-tool '${cb.tool_id}'` });
          }
        }
        for (const rc of lesson.reference_callouts ?? []) {
          if (!refIds.has(rc.reference_id) || !manifestIds.has(rc.reference_id)) {
            issues.push({ file: 'lessons.generated.json', message: `${lid} → unknown reference '${rc.reference_id}'` });
          }
        }
        if (!Array.isArray(lesson.sources) || lesson.sources.length === 0) {
          issues.push({ file: 'lessons.generated.json', message: `${lid} → empty sources[]` });
        }
      }
    }

    if (calibration) {
      const allowedTraits = new Set(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T-Concession', 'cluster-decomposition']);
      for (const item of calibration) {
        const cid = item.id ?? '<unknown calibration>';
        if (!item.trait_target || !allowedTraits.has(item.trait_target)) {
          issues.push({ file: 'calibration.generated.json', message: `${cid} → invalid trait_target '${item.trait_target}'` });
        }
      }
    }

    return issues;
  }

  function reportIssues(issues: ParityIssue[]) {
    if (issues.length === 0) {
      // eslint-disable-next-line no-console
      console.log('\x1b[32m[parity-check] ✓ no drift\x1b[0m');
      // Clear any previous overlay error
      server?.ws.send({ type: 'error', err: null as any });
      return;
    }
    const summary = issues.map((i) => `  • [${i.file}] ${i.message}`).join('\n');
    const msg = `Parity drift (${issues.length}):\n${summary}`;
    // eslint-disable-next-line no-console
    console.error(`\x1b[31m[parity-check]\x1b[0m ${msg}`);
    server?.ws.send({
      type: 'error',
      err: {
        message: msg,
        stack: '',
        plugin: 'vite-plugin-parity-check',
        id: 'src/data/lessons.generated.json',
      },
    });
  }

  return {
    name: 'vite-plugin-parity-check',
    configureServer(s) {
      server = s;
      // Initial run, deferred so it doesn't block cold start measurably.
      setTimeout(() => reportIssues(runCheck()), 0);
    },
    handleHotUpdate(ctx) {
      const rel = ctx.file.replace(root + '/', '');
      if (WATCHED.includes(rel)) {
        reportIssues(runCheck());
      }
      return undefined;
    },
    buildStart() {
      // Run at production build start too — fail the build on drift.
      const issues = runCheck();
      if (issues.length > 0) {
        const msg = issues.map((i) => `[${i.file}] ${i.message}`).join('\n');
        this.error(`Parity drift (${issues.length}):\n${msg}`);
      }
    },
  };
}
