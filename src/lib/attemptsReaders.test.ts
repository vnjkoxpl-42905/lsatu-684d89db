import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Historic blind review rows sit in `attempts` with br_selected = true (audit
// F4). Every reader query in `src/` must wrap its query with the shared
// `excludeBlindReviewAttempts` helper from `@/lib/attemptsFilter` rather than
// exempting files wholesale (F9). Only explicit `.insert(` writes are exempt on
// a per-query basis.

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p.replace(/\\/g, '/'));
  }
  return out;
}

function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

describe('attempts readers', () => {
  it('exclude blind review rows via the shared attemptsFilter helper on every non-insert query', () => {
    const violations: string[] = [];
    for (const file of walk('src')) {
      const text = readFileSync(file, 'utf8');
      const lines = text.split(/\r?\n/);
      const importsHelper = /from\s+['"]@\/lib\/attemptsFilter['"]/.test(text)
        || /from\s+['"]\.\/attemptsFilter['"]/.test(text);

      lines.forEach((line, i) => {
        if (isCommentLine(line)) return;
        if (!/\.from\(\s*['"]attempts['"]\s*\)/.test(line)) return;

        // Check if this specific query chain is an .insert( write.
        const forward = lines.slice(i, i + 4).join('\n');
        if (/\.insert\(/.test(forward)) return;

        // Otherwise this specific read query must use excludeBlindReviewAttempts(...).
        const around = lines.slice(Math.max(0, i - 3), i + 7).join('\n');
        if (!importsHelper || !around.includes('excludeBlindReviewAttempts(')) {
          violations.push(`${file}:${i + 1}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });
});
