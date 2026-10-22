import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * A shebang plus CRLF makes a script unimportable, and nothing says so.
 *
 * `questionStatsBuilder.test.ts` sat broken on main with
 * `SyntaxError: Invalid or unexpected token` pointed at its own line 4 — a
 * comment. Its whole 17-test suite never ran. A previous investigation cleared
 * the test file and was right to: it was byte-identical to origin/main, valid
 * UTF-8, and `node --check` passed on both of its imports. The problem was in
 * `scripts/knowledge/build-question-stats.mjs`, which the reported position
 * never pointed at.
 *
 * Isolated 2026-09-09 in a clean checkout, one variable at a time. CRLF on the
 * test file alone passes. CRLF on that one import fails. The same file with the
 * same CRLF and its `#!/usr/bin/env node` removed passes. Both halves are
 * needed, which is why the 1,796 CRLF files under src/ are fine — nothing
 * strips a shebang from them.
 *
 * `.gitattributes` keeps `scripts/**` LF on checkout. This is the part that
 * speaks up when a tool rewrites a file anyway: git normalises on add under
 * `core.autocrlf=input`, so a CRLF working copy still reads as clean and
 * nothing else in the repo would notice.
 *
 * Reads the files rather than importing them, so it still runs when the thing
 * it is checking is exactly what is broken.
 */

const SCRIPTS = path.resolve(__dirname, '../../../scripts');

function walk(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(mjs|cjs|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('a script a test can import', () => {
  it('never combines a shebang with CRLF line endings', () => {
    const broken = walk(SCRIPTS)
      .filter((file) => {
        const source = fs.readFileSync(file);
        return source.subarray(0, 2).toString() === '#!' && source.includes('\r\n');
      })
      .map((file) => path.relative(path.dirname(SCRIPTS), file).replace(/\\/g, '/'));

    // If this fails, convert the listed files to LF. Nothing about their
    // contents is wrong.
    expect(broken).toEqual([]);
  });

  it('still has the two that questionStatsBuilder imports', () => {
    // A rename would make the check above vacuously true.
    for (const name of ['build-question-stats.mjs', 'parse-lr-explanations.mjs']) {
      expect(fs.existsSync(path.join(SCRIPTS, 'knowledge', name))).toBe(true);
    }
  });
});
