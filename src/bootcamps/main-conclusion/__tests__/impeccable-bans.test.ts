/**
 * Impeccable bans — automated guards
 *
 * Each rule in MEMORY.md should have a test. Tests in this file walk every
 * source file under `src/bootcamps/main-conclusion/` (excluding tests
 * themselves) and assert the absolute bans hold.
 *
 * Add a new test here whenever a new ban lands in MEMORY.md.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      // Skip test directories — they may include sample strings showing the bans.
      if (name === '__tests__') continue;
      out.push(...walk(path, exts));
      continue;
    }
    if (exts.some((e) => name.endsWith(e))) out.push(path);
  }
  return out;
}

const SOURCE_FILES = walk(ROOT, ['.ts', '.tsx']);
const TSX_FILES = SOURCE_FILES.filter((f) => f.endsWith('.tsx'));

describe('impeccable bans — automated guards', () => {
  it('side-stripe ban: no `border-l-[2-9]` or `border-r-[2-9]` anywhere in the bootcamp', () => {
    const SIDE_STRIPE = /border-[lr]-[2-9]/;
    const hits: Array<{ file: string; line: number; text: string }> = [];
    for (const file of TSX_FILES) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (SIDE_STRIPE.test(line) && !/impeccable-allow:\s*side-stripe/.test(line)) {
          hits.push({ file: file.replace(ROOT, ''), line: i + 1, text: line.trim() });
        }
      });
    }
    expect(hits, JSON.stringify(hits, null, 2)).toEqual([]);
  });

  it('em-dash ban in computed copy: no `—` in lib/runner.ts string literals', () => {
    const path = join(ROOT, 'lib', 'runner.ts');
    const src = readFileSync(path, 'utf8');
    // Strip block + line comments before checking — em dashes in comments are fine.
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(stripped).not.toMatch(/—/);
  });

  it('submission-reset parity: every attempt primitive declaring setSubmitted has a reset path', () => {
    const PRIMITIVE_NAMES = /(Picker|Tagger|Labeler)\.tsx$/;
    const offenders: string[] = [];
    for (const file of TSX_FILES.filter((f) => PRIMITIVE_NAMES.test(f))) {
      const src = readFileSync(file, 'utf8');
      if (/setSubmitted\(\s*true\s*\)/.test(src)) {
        // Reset path: a function named `reset` OR a call to `setSubmitted(false)`.
        const hasReset = /function\s+reset\s*\(/.test(src) || /setSubmitted\(\s*false\s*\)/.test(src);
        if (!hasReset) offenders.push(file.replace(ROOT, ''));
      }
    }
    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });
});
