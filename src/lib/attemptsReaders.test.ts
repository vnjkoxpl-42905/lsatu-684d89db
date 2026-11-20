import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Historic blind review rows sit in `attempts` with br_selected = true (audit
// F4). They are kept, not deleted, so every reader must exclude them. This
// fails when a new reader of `attempts` forgets to.
const WRITERS = new Set(['src/pages/Drill.tsx', 'src/components/drill/LRQuestionModal.tsx']);
// Readers that only list question ids or already exclude full-section rows.
const EXEMPT = new Set([
  'src/lib/sectionFreshness.ts',
  'src/lib/firstAnswerSources.ts',
  'src/components/teacher/bootcamps/hooks/useBootcampMetrics.ts',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p.replace(/\\/g, '/'));
  }
  return out;
}

describe('attempts readers', () => {
  it('exclude blind review rows', () => {
    const missing: string[] = [];
    for (const file of walk('src')) {
      if (WRITERS.has(file) || EXEMPT.has(file)) continue;
      const lines = readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (!/from\(\s*['"]attempts['"]\s*\)/.test(line)) return;
        const block = lines.slice(i, i + 4).join('\n');
        if (/\.insert\(/.test(block)) return;
        if (!block.includes(".not('br_selected', 'is', true)")) missing.push(`${file}:${i + 1}`);
      });
    }
    expect(missing).toEqual([]);
  });
});
