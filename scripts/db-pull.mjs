#!/usr/bin/env node
/**
 * db-pull.mjs — read a table out of the live database, and only read it.
 *
 * Read-only by construction: it speaks PostgREST over HTTP GET, so there is no
 * statement to get wrong and no way for this to write, drop or migrate
 * anything. That is the point. Arbitrary SQL against production is available
 * through the Lovable MCP connector, but that tool cannot distinguish a SELECT
 * from a DROP, so it stays gated and deliberately awkward. Pulling rows for an
 * audit should not require opening that door.
 *
 * Needs a service-role key, because RLS hides every row from the anon key and
 * an empty result is indistinguishable from an empty table. Set it in
 * ~/ai-os/.env (which is git-ignored and already holds every other credential):
 *
 *   SUPABASE_SERVICE_ROLE_KEY=<the service_role key from the Supabase dashboard,
 *                              Project Settings -> API. It is a long JWT
 *                              starting "eyJ", not the short anon key.>
 *
 * Usage:
 *   node scripts/db-pull.mjs attempts > /tmp/attempts.json
 *   node scripts/db-pull.mjs attempts id,user_id,pt,section,qnum,selected_answer,correct
 *
 * Pairs with the grading auditor:
 *   node scripts/db-pull.mjs attempts > /tmp/attempts.json
 *   node scripts/audit-attempt-grading.mjs /tmp/attempts.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');

function readEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = {
  ...readEnv(path.resolve(REPO, '../../.env')),
  ...readEnv(path.join(REPO, '.env')),
};

const table = process.argv[2];
const columns = process.argv[3] ?? '*';
if (!table) {
  console.error('usage: node scripts/db-pull.mjs <table> [columns]');
  process.exit(2);
}

const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error('db-pull: VITE_SUPABASE_URL is not set in projects/lsatu/.env');
  process.exit(2);
}
if (!key) {
  console.error(
    'db-pull: SUPABASE_SERVICE_ROLE_KEY is not set.\n' +
      '  Add it to ~/ai-os/.env (git-ignored). Supabase dashboard -> Project Settings -> API\n' +
      '  -> service_role. Without it RLS returns zero rows and an empty table and a hidden\n' +
      '  one look identical, so this refuses to guess rather than reporting a false empty.',
  );
  process.exit(2);
}

// Page through: PostgREST caps a response, and a silently truncated pull is the
// failure mode that makes an audit say "all clear" over rows it never saw.
const PAGE = 1000;
const rows = [];
for (let from = 0; ; from += PAGE) {
  const res = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(columns)}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Range: `${from}-${from + PAGE - 1}`,
      Prefer: 'count=exact',
    },
  });
  if (!res.ok) {
    console.error(`db-pull: ${res.status} ${res.statusText}\n${(await res.text()).slice(0, 400)}`);
    process.exit(1);
  }
  const batch = await res.json();
  rows.push(...batch);
  if (batch.length < PAGE) break;
}

process.stderr.write(`db-pull: ${rows.length} row(s) from ${table}\n`);
process.stdout.write(JSON.stringify({ rows }, null, 2));
