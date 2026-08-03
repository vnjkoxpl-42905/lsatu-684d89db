// Bulk-loads the authored LR explanation corpus into the lr_* tables.
//
//   node scripts/knowledge/ingest-lr-explanations.mjs <dir-of-v2-md-files>
//
// Sources:
//   1. <dir>/PT1NN-explanations.md          (PT101-PT140 v2 corpus)
//   2. Explanations/PT1NN-explanations.md   (PT141-PT159, in-repo)
//      - PT139/PT140 there are stale duplicates and are skipped
//      - PT155-S2-explanations.md holds a section that exists nowhere else and
//        is loaded explicitly, since the filename filter above only matches
//        PT<n>-explanations.md
//
// Every file now uses the standard layout; the legacy "## Question N" parser
// is no longer reachable from here.
//
// Strategy: parse everything in memory, COPY into temp staging tables, then
// UPSERT into the real tables in one transaction. Idempotent: re-running
// updates rows in place on (preptest, section, question_number).
//
// Two write paths, same staging + upsert SQL:
//
//   (a) psql        - the default. Streams TSV via \copy. Needs a direct
//                     connection (DATABASE_URL or PGHOST/...), which we do not
//                     currently have: Lovable's org owns the Supabase project.
//   (b) EMIT_SQL=1  - writes self-contained .sql chunks to scripts/out/lr-sql/
//                     that paste into the Supabase SQL editor. No \copy, no
//                     psql. Each chunk is its own transaction covering a whole
//                     set of questions, so chunks can be pasted in any order,
//                     re-pasted, or stopped partway without corrupting state.
//                     Conflict keys are (preptest, section, question_number)
//                     for questions, (question_id, letter) for choices,
//                     (question_id, style) for explanations, and steps/notes
//                     are deleted-then-reinserted per qid.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseExplanationFile } from './parse-lr-explanations.mjs';

const srcDir = process.argv[2];
if (!srcDir) {
  console.error('usage: ingest-lr-explanations.mjs <dir-of-v2-md-files>');
  process.exit(1);
}
const repoExplanations = path.resolve('Explanations');

const questions = [];
const skipped = [];
const sources = [];

const ingestStandard = (file, label) => {
  const r = parseExplanationFile(fs.readFileSync(file, 'utf8'), path.basename(file));
  questions.push(...r.questions);
  skipped.push(...r.skipped.map((s) => ({ ...s, file: label })));
  sources.push({ file: label, parsed: r.questions.length, skipped: r.skipped.length });
};

// --- batch 1: the v2 zip (PT101-PT140) ---
for (const f of fs.readdirSync(srcDir).filter((f) => /^PT\d+-explanations\.md$/.test(f)).sort()) {
  ingestStandard(path.join(srcDir, f), `v2/${f}`);
}

// --- batch 2: in-repo PT141-PT159 ---
if (fs.existsSync(repoExplanations)) {
  const repoFiles = fs
    .readdirSync(repoExplanations)
    .filter((f) => /^PT\d+-explanations\.md$/.test(f))
    .filter((f) => {
      const pt = Number(/^PT(\d+)/.exec(f)[1]);
      return pt >= 141 && pt <= 159; // PT139/PT140 here are stale duplicates
    })
    .sort();
  for (const f of repoFiles) ingestStandard(path.join(repoExplanations, f), `repo/${f}`);

  // PT155 section 2 exists nowhere else. It was reformatted from the older
  // "## Question N" layout into the standard one on 2026-08-03, which also
  // moved its tags and percentages onto the choice line where the standard
  // parser can see them (they previously loaded as NULL). It now goes through
  // the standard parser like every other file.
  const s2 = path.join(repoExplanations, 'PT155-S2-explanations.md');
  if (fs.existsSync(s2)) ingestStandard(s2, 'repo/PT155-S2-explanations.md');
}

// Guard against a duplicate (preptest, section, question_number) across files.
const seen = new Map();
const deduped = [];
for (const q of questions) {
  if (seen.has(q.qid)) {
    skipped.push({ id: q.qid, reason: `duplicate question id (already parsed from another file)` });
    continue;
  }
  seen.set(q.qid, true);
  deduped.push(q);
}

// ---------- build TSV payloads ----------
const esc = (v) => {
  if (v === null || v === undefined) return '\\N';
  return String(v)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
};
const row = (...cells) => cells.map(esc).join('\t');

// A SQL string literal. standard_conforming_strings is on, so backslashes are
// literal and doubling the single quote is the whole escape. NULs cannot live
// in a Postgres text value at all, so they are dropped rather than smuggled in.
const lit = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  return `'${String(v).replace(/\0/g, '').replace(/'/g, "''")}'`;
};
const tuple = (...cells) => `(${cells.map(lit).join(', ')})`;

const qRows = [];
const cRows = [];
const eRows = [];
const sRows = [];
const nRows = [];

// The same five payloads again, grouped per question and rendered as SQL tuples,
// so the emit path can cut chunks without ever splitting a question's rows
// across two transactions.
const groups = [];

for (const q of deduped) {
  const cells = [
    q.qid,
    q.preptest,
    q.section,
    q.questionNumber,
    q.questionType,
    q.stimulus,
    q.prompt,
    q.sourceNote,
    q.isExplained,
    q.correctChoice,
  ];
  qRows.push(row(...cells));
  const g = { qid: q.qid, q: tuple(...cells), c: [], e: [], s: [], n: [] };

  for (const c of q.choices) {
    const cc = [q.qid, c.letter, c.text, c.tag, !!c.isCorrect, c.percent];
    cRows.push(row(...cc));
    g.c.push(tuple(...cc));
  }
  for (const e of q.explanations) {
    eRows.push(row(q.qid, e.style));
    g.e.push(tuple(q.qid, e.style));
    e.steps.forEach((s, i) => {
      sRows.push(row(q.qid, e.style, i, s.label, s.text));
      g.s.push(tuple(q.qid, e.style, i, s.label, s.text));
    });
    for (const n of e.choiceProse) {
      nRows.push(row(q.qid, e.style, n.letter, n.prose));
      g.n.push(tuple(q.qid, e.style, n.letter, n.prose));
    }
  }
  groups.push(g);
}

// Staging DDL and the upsert body are shared verbatim by both write paths, so
// a pasted chunk and a psql run cannot drift apart. ON COMMIT DROP keeps the
// SQL editor's session clean between pastes.
const STAGING_DDL = `CREATE TEMP TABLE stg_q (qid text, preptest int, section int, question_number int, question_type text, stimulus text, prompt text, source_note text, is_explained boolean, correct_choice text) ON COMMIT DROP;
CREATE TEMP TABLE stg_c (qid text, letter text, choice_text text, tag text, is_correct boolean, student_percent int) ON COMMIT DROP;
CREATE TEMP TABLE stg_e (qid text, style text) ON COMMIT DROP;
CREATE TEMP TABLE stg_s (qid text, style text, position int, label text, body text) ON COMMIT DROP;
CREATE TEMP TABLE stg_n (qid text, style text, letter text, body text) ON COMMIT DROP;`;

const UPSERT_SQL = `INSERT INTO public.lr_preptests (preptest)
SELECT DISTINCT preptest FROM stg_q
ON CONFLICT (preptest) DO NOTHING;

INSERT INTO public.lr_sections (preptest, section)
SELECT DISTINCT preptest, section FROM stg_q
ON CONFLICT (preptest, section) DO NOTHING;

INSERT INTO public.lr_questions (section_id, qid, preptest, section, question_number, question_type, stimulus, prompt, source_note, is_explained, correct_choice)
SELECT sec.id, q.qid, q.preptest, q.section, q.question_number, q.question_type, q.stimulus, q.prompt, q.source_note, q.is_explained, q.correct_choice
FROM stg_q q JOIN public.lr_sections sec ON sec.preptest = q.preptest AND sec.section = q.section
ON CONFLICT (preptest, section, question_number) DO UPDATE SET
  qid = EXCLUDED.qid,
  question_type = EXCLUDED.question_type,
  stimulus = EXCLUDED.stimulus,
  prompt = EXCLUDED.prompt,
  source_note = EXCLUDED.source_note,
  is_explained = EXCLUDED.is_explained,
  correct_choice = EXCLUDED.correct_choice,
  updated_at = now();

INSERT INTO public.lr_answer_choices (question_id, letter, choice_text, tag, is_correct, student_percent)
SELECT lq.id, c.letter, c.choice_text, c.tag, c.is_correct, c.student_percent
FROM stg_c c JOIN public.lr_questions lq ON lq.qid = c.qid
ON CONFLICT (question_id, letter) DO UPDATE SET
  choice_text = EXCLUDED.choice_text,
  tag = EXCLUDED.tag,
  is_correct = EXCLUDED.is_correct,
  student_percent = EXCLUDED.student_percent,
  updated_at = now();

INSERT INTO public.lr_explanations (question_id, style)
SELECT lq.id, e.style FROM stg_e e JOIN public.lr_questions lq ON lq.qid = e.qid
ON CONFLICT (question_id, style) DO UPDATE SET updated_at = now();

-- Rebuild the body of every explanation we just staged so re-running can
-- never leave a stale step or choice note behind.
DELETE FROM public.lr_explanation_steps st
USING public.lr_explanations ex, public.lr_questions lq
WHERE st.explanation_id = ex.id AND ex.question_id = lq.id
  AND lq.qid IN (SELECT qid FROM stg_q);

DELETE FROM public.lr_explanation_choice_notes cn
USING public.lr_explanations ex, public.lr_questions lq
WHERE cn.explanation_id = ex.id AND ex.question_id = lq.id
  AND lq.qid IN (SELECT qid FROM stg_q);

INSERT INTO public.lr_explanation_steps (explanation_id, position, label, body)
SELECT ex.id, s.position, s.label, s.body
FROM stg_s s JOIN public.lr_questions lq ON lq.qid = s.qid
JOIN public.lr_explanations ex ON ex.question_id = lq.id AND ex.style = s.style
ON CONFLICT (explanation_id, position) DO UPDATE SET label = EXCLUDED.label, body = EXCLUDED.body;

INSERT INTO public.lr_explanation_choice_notes (explanation_id, letter, body)
SELECT ex.id, n.letter, n.body
FROM stg_n n JOIN public.lr_questions lq ON lq.qid = n.qid
JOIN public.lr_explanations ex ON ex.question_id = lq.id AND ex.style = n.style
ON CONFLICT (explanation_id, letter) DO UPDATE SET body = EXCLUDED.body;`;

console.log(
  `parsed ${deduped.length} questions / ${cRows.length} choices / ${eRows.length} explanations / ${sRows.length} steps / ${nRows.length} choice notes (${skipped.length} skipped)`,
);

if (process.env.DRY_RUN === '1') {
  console.log(JSON.stringify({ sources, skipped }, null, 2));
  process.exit(0);
}

// ---------- path (b): emit pasteable SQL ----------
if (process.env.EMIT_SQL === '1') {
  const outDir = path.resolve(process.env.EMIT_SQL_DIR || 'scripts/out/lr-sql');
  // Chunk budget in bytes of VALUES payload. The Supabase SQL editor chokes on
  // very large pastes, so this stays well under a megabyte by default.
  const budget = Number(process.env.SQL_CHUNK_BYTES || 400_000);

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  // Cut on question boundaries: a question always lands whole in one chunk.
  const chunks = [];
  let cur = [];
  let curBytes = 0;
  for (const g of groups) {
    const size = Buffer.byteLength(
      [g.q, ...g.c, ...g.e, ...g.s, ...g.n].join(','),
      'utf8',
    );
    if (cur.length && curBytes + size > budget) {
      chunks.push(cur);
      cur = [];
      curBytes = 0;
    }
    cur.push(g);
    curBytes += size;
  }
  if (cur.length) chunks.push(cur);

  const values = (table, cols, rows) =>
    rows.length ? `INSERT INTO ${table} (${cols}) VALUES\n${rows.join(',\n')};\n` : '';

  const pad = (n) => String(n).padStart(3, '0');
  const manifest = [];

  chunks.forEach((chunk, i) => {
    const n = i + 1;
    const name = `${pad(n)}-lr-explanations.sql`;
    const body = [
      `-- lr explanations corpus, chunk ${n} of ${chunks.length}`,
      `-- ${chunk.length} questions: ${chunk[0].qid} .. ${chunk[chunk.length - 1].qid}`,
      '-- Generated by scripts/knowledge/ingest-lr-explanations.mjs (EMIT_SQL=1).',
      '-- Self-contained and idempotent. Paste whole into the Supabase SQL editor.',
      '-- Chunks are independent: order does not matter and re-pasting is safe.',
      '',
      'BEGIN;',
      STAGING_DDL,
      '',
      values('stg_q', 'qid, preptest, section, question_number, question_type, stimulus, prompt, source_note, is_explained, correct_choice', chunk.map((g) => g.q)),
      values('stg_c', 'qid, letter, choice_text, tag, is_correct, student_percent', chunk.flatMap((g) => g.c)),
      values('stg_e', 'qid, style', chunk.flatMap((g) => g.e)),
      values('stg_s', 'qid, style, position, label, body', chunk.flatMap((g) => g.s)),
      values('stg_n', 'qid, style, letter, body', chunk.flatMap((g) => g.n)),
      UPSERT_SQL,
      '',
      'COMMIT;',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(outDir, name), body, 'utf8');
    manifest.push({
      file: name,
      questions: chunk.length,
      firstQid: chunk[0].qid,
      lastQid: chunk[chunk.length - 1].qid,
      bytes: Buffer.byteLength(body, 'utf8'),
      md5: crypto.createHash('md5').update(body, 'utf8').digest('hex'),
    });
  });

  // Schema prerequisite, emitted from the migration itself so the two cannot
  // drift. Video-only questions carry a NULL stimulus and prompt, which the
  // original NOT NULL columns reject, so this must be pasted before chunk 001.
  const migration = path.resolve(
    'supabase/migrations/20260803211500_lr_questions_nullable_stimulus_prompt.sql',
  );
  if (!fs.existsSync(migration)) {
    console.error(`missing schema migration: ${migration}`);
    process.exit(1);
  }
  fs.writeFileSync(
    path.join(outDir, '000-schema.sql'),
    `-- Paste this FIRST, before chunk 001. Copied verbatim from\n-- ${path.relative(process.cwd(), migration)}\n\n${fs.readFileSync(migration, 'utf8')}`,
    'utf8',
  );

  // Run this last to confirm the whole corpus landed.
  const verify = `-- Run after every chunk has been pasted. Expect:
--   questions ${deduped.length} / choices ${cRows.length} / explanations ${eRows.length} / steps ${sRows.length} / choice_notes ${nRows.length}
SELECT
  (SELECT count(*) FROM public.lr_questions)                 AS questions,
  (SELECT count(*) FROM public.lr_answer_choices)            AS choices,
  (SELECT count(*) FROM public.lr_explanations)              AS explanations,
  (SELECT count(*) FROM public.lr_explanation_steps)         AS steps,
  (SELECT count(*) FROM public.lr_explanation_choice_notes)  AS choice_notes;
`;
  fs.writeFileSync(path.join(outDir, '999-verify.sql'), verify, 'utf8');

  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    `${JSON.stringify(
      {
        generatedFrom: srcDir,
        chunkBudgetBytes: budget,
        totals: {
          questions: deduped.length,
          choices: cRows.length,
          explanations: eRows.length,
          steps: sRows.length,
          choiceNotes: nRows.length,
        },
        chunks: manifest,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const biggest = Math.max(...manifest.map((m) => m.bytes));
  console.log(
    `emitted ${chunks.length} chunks to ${outDir} (largest ${(biggest / 1024).toFixed(0)} KB) + 999-verify.sql + manifest.json`,
  );
  console.log(
    'Paste each chunk into the Supabase SQL editor in order, then run 999-verify.sql.',
  );
  console.log(
    'If you copy via the clipboard, set LANG=en_US.UTF-8 and check the md5 in manifest.json round-trips.',
  );
  process.exit(0);
}

// ---------- path (a): psql ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lrx-'));
const write = (name, rows) => {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, rows.length ? `${rows.join('\n')}\n` : '');
  return p;
};
const files_ = {
  q: write('q.tsv', qRows),
  c: write('c.tsv', cRows),
  e: write('e.tsv', eRows),
  s: write('s.tsv', sRows),
  n: write('n.tsv', nRows),
};

const sqlPath = path.join(tmp, 'load.sql');
fs.writeFileSync(
  sqlPath,
  [
    'BEGIN;',
    STAGING_DDL,
    '',
    `\\copy stg_q FROM '${files_.q}'`,
    `\\copy stg_c FROM '${files_.c}'`,
    `\\copy stg_e FROM '${files_.e}'`,
    `\\copy stg_s FROM '${files_.s}'`,
    `\\copy stg_n FROM '${files_.n}'`,
    '',
    UPSERT_SQL,
    '',
    'COMMIT;',
    '',
  ].join('\n'),
);

// Connect via DATABASE_URL when it is set, so a single env var is enough.
// Without it psql falls back to the standard PGHOST/PGUSER/... variables,
// which is how this ran previously.
const dbUrl = process.env.DATABASE_URL;
const psqlArgs = ['-v', 'ON_ERROR_STOP=1', '-f', sqlPath];
const out = execFileSync('psql', dbUrl ? [dbUrl, ...psqlArgs] : psqlArgs, { encoding: 'utf8' });
console.log(out);

fs.mkdirSync(path.resolve('scripts/out'), { recursive: true });
fs.writeFileSync(
  path.join(process.cwd(), 'scripts/out/lr-explanations-ingest-report.json'),
  JSON.stringify({ sources, questions: deduped.length, skipped }, null, 2),
);
console.log('report written to scripts/out/lr-explanations-ingest-report.json');
