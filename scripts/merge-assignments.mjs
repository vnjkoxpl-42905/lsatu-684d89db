#!/usr/bin/env node
// Merges scripts/out/parts/part-*.json into scripts/out/feature-assignments.json.
// Guarantees every untagged worklist qid appears exactly once (missing -> []),
// and flags any duplicate or unknown qids.
//
// Usage: node scripts/merge-assignments.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'out');
const PARTS_DIR = path.join(OUT_DIR, 'parts');

const worklist = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'feature-worklist.json'), 'utf8'));
const validQids = new Set(worklist.map((q) => q.qid));

const parts = fs.readdirSync(PARTS_DIR).filter((f) => /^part-.*\.json$/.test(f)).sort();
const byQid = new Map();
const dupes = [];
const unknown = [];

for (const p of parts) {
  const rows = JSON.parse(fs.readFileSync(path.join(PARTS_DIR, p), 'utf8'));
  for (const r of rows) {
    if (!validQids.has(r.qid)) { unknown.push(`${p}: ${r.qid}`); continue; }
    if (byQid.has(r.qid)) { dupes.push(`${r.qid} (in ${p})`); continue; }
    byQid.set(r.qid, Array.isArray(r.features) ? r.features : []);
  }
}

// Ensure every untagged question is represented (unclassified -> []).
const merged = worklist.map((q) => ({ qid: q.qid, features: byQid.get(q.qid) || [] }));

fs.writeFileSync(path.join(OUT_DIR, 'feature-assignments.json'), JSON.stringify(merged, null, 2) + '\n');

const classified = [...byQid.values()].filter((f) => f.length > 0).length;
const blank = merged.length - classified;
console.log('=== merge-assignments ===');
console.log(`Parts merged:        ${parts.length}`);
console.log(`Worklist questions:  ${worklist.length}`);
console.log(`Classified (>=1 tag):${classified}`);
console.log(`Blank:               ${blank}`);
console.log(`Covered by a part:   ${byQid.size} / ${worklist.length}`);
if (dupes.length) console.log(`DUPLICATE qids (${dupes.length}):\n  ` + dupes.join('\n  '));
if (unknown.length) console.log(`UNKNOWN qids (${unknown.length}):\n  ` + unknown.join('\n  '));
