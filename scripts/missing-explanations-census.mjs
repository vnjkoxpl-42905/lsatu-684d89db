#!/usr/bin/env node
/**
 * missing-explanations-census.mjs — every bank question with no authored
 * written explanation, keyed PrepTest / Section / Question.
 *
 * Read-only by construction, the same PostgREST GET path as db-pull.mjs, with
 * the same service key from ~/ai-os/.env (git-ignored). Pages every table at
 * 1000 rows until a short page and refuses to write anything if a query fails
 * or a table's row count disagrees with its `count=exact` header, because a
 * census that silently saw half a table is worse than none.
 *
 * "No authored explanation" means exactly one predicate, shared with the app:
 * `hasAuthoredProse` in scripts/explanation-prose.mjs (mirrored in
 * src/hooks/useLrExplanation.ts and held to one fixture set by
 * src/lib/explanationProse.fixtures.test.ts). Reasons are only what the data
 * proves:
 *   not ingested       no `lr_questions` row for the address
 *   no authored prose  a row exists, nothing passes the predicate
 * Nothing in the schema records a video, so there is no "video only" label;
 * the 14 known video-only questions (PT143, PT146 per the 2026-08-03
 * migration) are a subset of "no authored prose".
 *
 * Usage:
 *   node scripts/missing-explanations-census.mjs
 *   node scripts/missing-explanations-census.mjs --out /path/to/report.md
 *
 * Default output: ../../wiki/explanations/MISSING-EXPLANATIONS.md (the vault),
 * never the app repo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasAuthoredProse } from './explanation-prose.mjs';

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

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT =
  outIdx >= 0 && args[outIdx + 1]
    ? path.resolve(args[outIdx + 1])
    : path.resolve(REPO, '../../wiki/explanations/MISSING-EXPLANATIONS.md');

const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url) {
  console.error('census: VITE_SUPABASE_URL is not set in projects/lsatu/.env');
  process.exit(2);
}
if (!key) {
  console.error(
    'census: SUPABASE_SERVICE_ROLE_KEY is not set.\n' +
      '  Add it to ~/ai-os/.env (git-ignored). Supabase dashboard -> Project Settings -> API\n' +
      '  -> service_role. Without it RLS returns zero rows and the census would call every\n' +
      '  question "not ingested", so this refuses to run rather than lie.',
  );
  process.exit(2);
}

/** Pull a whole table, 1000 rows a page, and prove the count. */
async function pullAll(table, columns) {
  const PAGE = 1000;
  const rows = [];
  let expected = null;
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
      throw new Error(`${table}: ${res.status} ${res.statusText}\n${(await res.text()).slice(0, 400)}`);
    }
    const range = res.headers.get('content-range') ?? '';
    const total = Number(range.split('/')[1]);
    if (Number.isFinite(total)) expected = total;
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  if (expected == null) throw new Error(`${table}: no exact count in Content-Range; refusing to trust the pull`);
  if (rows.length !== expected) {
    throw new Error(`${table}: pulled ${rows.length} rows but the server counts ${expected}`);
  }
  process.stderr.write(`census: ${rows.length} row(s) from ${table}\n`);
  return rows;
}

/** The bank: public/data/PT*-LR.json, one file per section. */
function readBank() {
  const dir = path.join(REPO, 'public', 'data');
  const files = fs.readdirSync(dir).filter((f) => /^PT\d+-S\d+-LR\.json$/.test(f)).sort();
  const questions = [];
  for (const file of files) {
    const rows = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    for (const q of rows) {
      questions.push({
        pt: Number(q.practiceTest),
        section: Number(q.sectionNumber),
        qnum: Number(q.questionNumber),
        qtype: q.questionType ?? '',
      });
    }
  }
  process.stderr.write(`census: ${questions.length} bank question(s) in ${files.length} file(s)\n`);
  return questions;
}

const bank = readBank();

let questions;
let explanations;
let steps;
let notes;
try {
  [questions, explanations, steps, notes] = await Promise.all([
    pullAll('lr_questions', 'id,preptest,section,question_number'),
    pullAll('lr_explanations', 'id,question_id,style'),
    pullAll('lr_explanation_steps', 'explanation_id,body'),
    pullAll('lr_explanation_choice_notes', 'explanation_id,body'),
  ]);
} catch (e) {
  console.error(`census: aborted, nothing written.\n${e instanceof Error ? e.message : e}`);
  process.exit(1);
}

const address = (pt, section, qnum) => `PT${pt}-S${section}-Q${qnum}`;

const stepsByExplanation = new Map();
for (const row of steps) {
  if (!stepsByExplanation.has(row.explanation_id)) stepsByExplanation.set(row.explanation_id, []);
  stepsByExplanation.get(row.explanation_id).push({ body: row.body });
}
const notesByExplanation = new Map();
for (const row of notes) {
  if (!notesByExplanation.has(row.explanation_id)) notesByExplanation.set(row.explanation_id, []);
  notesByExplanation.get(row.explanation_id).push({ body: row.body });
}
const stylesByQuestion = new Map();
for (const row of explanations) {
  if (!stylesByQuestion.has(row.question_id)) stylesByQuestion.set(row.question_id, []);
  stylesByQuestion.get(row.question_id).push({
    steps: stepsByExplanation.get(row.id) ?? [],
    notes: notesByExplanation.get(row.id) ?? [],
  });
}
const ingested = new Map();
for (const row of questions) {
  ingested.set(address(row.preptest, row.section, row.question_number), row.id);
}

const missing = [];
let withProse = 0;
let ingestedCount = 0;
for (const q of bank) {
  const id = ingested.get(address(q.pt, q.section, q.qnum));
  if (!id) {
    missing.push({ ...q, reason: 'not ingested' });
    continue;
  }
  ingestedCount += 1;
  if (hasAuthoredProse(stylesByQuestion.get(id) ?? [])) {
    withProse += 1;
  } else {
    missing.push({ ...q, reason: 'no authored prose' });
  }
}
missing.sort((a, b) => a.pt - b.pt || a.section - b.section || a.qnum - b.qnum);

const notIngested = missing.filter((m) => m.reason === 'not ingested').length;
const noProse = missing.filter((m) => m.reason === 'no authored prose').length;
const today = new Date().toISOString().slice(0, 10);

const lines = [];
lines.push('# Questions with no authored explanation');
lines.push('');
lines.push(`_Generated ${today} by \`scripts/missing-explanations-census.mjs\` in the LSAT U repo. Read-only pull of \`lr_questions\`, \`lr_explanations\`, \`lr_explanation_steps\`, \`lr_explanation_choice_notes\` against the bank in \`public/data/PT*-LR.json\`. Re-run the script to refresh; do not hand-edit._`);
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`| | Count |`);
lines.push(`|---|---|`);
lines.push(`| Bank questions | ${bank.length} |`);
lines.push(`| Ingested (\`lr_questions\` row exists) | ${ingestedCount} |`);
lines.push(`| With authored prose | ${withProse} |`);
lines.push(`| Missing: not ingested | ${notIngested} |`);
lines.push(`| Missing: no authored prose | ${noProse} |`);
lines.push(`| Missing, total | ${missing.length} |`);
lines.push('');
lines.push('"Authored prose" is one predicate shared with the app (`scripts/explanation-prose.mjs`, mirrored in `src/hooks/useLrExplanation.ts`): a breakdown step or a choice note whose body is non-empty after trim. Tags and student percentages never count. Nothing in the schema records a video, so there is no video column here; the 14 known video-only questions (PT143, PT146, per the 2026-08-03 migration) fall under "no authored prose".');
lines.push('');

let currentPt = null;
for (const m of missing) {
  if (m.pt !== currentPt) {
    currentPt = m.pt;
    lines.push(`## PrepTest ${m.pt}`);
    lines.push('');
    lines.push('| PT | S | Q | Question type | Reason |');
    lines.push('|---|---|---|---|---|');
  }
  lines.push(`| ${m.pt} | ${m.section} | ${m.qnum} | ${m.qtype} | ${m.reason} |`);
  const next = missing[missing.indexOf(m) + 1];
  if (!next || next.pt !== m.pt) lines.push('');
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
process.stderr.write(`census: wrote ${missing.length} missing question(s) to ${OUT}\n`);
