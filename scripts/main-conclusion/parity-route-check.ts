/**
 * Phase H.3 — greppable verification:
 *   Every entries[].route in CONTENT_PARITY_MAP.json must be defined in src/routes.tsx.
 *
 * Reads the parity map + the routes.tsx file as text; reports any missing routes.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MAP_PATH = resolve(ROOT, 'docs/parity/CONTENT_PARITY_MAP.json');
const ROUTES_PATH = resolve(ROOT, 'src/routes.tsx');

const map = JSON.parse(readFileSync(MAP_PATH, 'utf-8'));
const routes = readFileSync(ROUTES_PATH, 'utf-8');

const entries = Array.isArray(map.entries) ? map.entries : Object.values(map);
const allRoutes = new Set<string>();
const skipped: string[] = [];
for (const e of entries as any[]) {
  if (typeof e.route !== 'string') continue;
  // Filter out non-URL entries (parity map sometimes carries descriptive labels for cross-cutting behaviors).
  const r = e.route.trim();
  if (!r.startsWith('/')) {
    skipped.push(r);
    continue;
  }
  if (r.includes('(') || r.includes(' ')) {
    skipped.push(r);
    continue;
  }
  allRoutes.add(r);
}
if (skipped.length > 0) {
  console.log(`[parity-route-check] info: skipped ${skipped.length} non-URL parity entries (cross-cutting behaviors).`);
}

// Routes wired in routes.tsx are matched as either path: 'foo' or path: '/foo'.
const routesWired = new Set<string>();
const pathRe = /path:\s*['"]([^'"]+)['"]/g;
let m: RegExpExecArray | null;
while ((m = pathRe.exec(routes)) !== null) {
  let p = m[1]!;
  if (!p.startsWith('/')) p = '/' + p;
  routesWired.add(p);
}
// Also accept the implicit root.
routesWired.add('/');

// :param routes need wildcard-matching against the parity map; treat any /lessons/:lessonId-style as covering /lessons/<anything>.
function isCovered(target: string): boolean {
  if (routesWired.has(target)) return true;
  for (const wired of routesWired) {
    if (wired.includes(':')) {
      const re = new RegExp('^' + wired.replace(/:[^/]+/g, '[^/]+') + '$');
      if (re.test(target)) return true;
    }
  }
  return false;
}

const missing: string[] = [];
for (const r of allRoutes) {
  if (!isCovered(r)) missing.push(r);
}

if (missing.length === 0) {
  console.log(`[parity-route-check] ✓ all ${allRoutes.size} routes wired in routes.tsx`);
  process.exit(0);
} else {
  console.error(`[parity-route-check] ✗ ${missing.length} routes missing from routes.tsx:`);
  for (const r of missing) console.error('  -', r);
  process.exit(1);
}
