// Bulk-loads the parsed PT101-PT140 LR explanation corpus into the lr_* tables.
//
//   node scripts/knowledge/ingest-lr-explanations.mjs <dir-of-md-files>
//
// Inserts are ON CONFLICT DO NOTHING, so re-running is safe but does not
// overwrite rows already loaded.
// Strategy: parse every file in memory, write one TSV per target table, COPY
// each into an UNLOGGED staging table, then upsert into the real tables inside
// a single transaction. Re-running is idempotent (natural keys: qid, letter,
// style, position).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseExplanationFile } from './parse-lr-explanations.mjs';

const srcDir = process.argv[2];
if (!srcDir) {
  console.error('usage: ingest-lr-explanations.mjs <dir-of-md-files>');
  process.exit(1);
}

const files = fs.readdirSync(srcDir).filter((f) => /^PT\d+-explanations\.md$/.test(f)).sort();

const questions = [];
const skipped = [];
for (const f of files) {
  const r = parseExplanationFile(fs.readFileSync(path.join(srcDir, f), 'utf8'), f);
  questions.push(...r.questions);
  skipped.push(...r.skipped);
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

const qRows = [];
const cRows = [];
const eRows = [];
const sRows = [];
const nRows = [];

for (const q of questions) {
  const correct = q.choices.find((c) => c.tag && /^Correct\b/i.test(c.tag));
  qRows.push(
    row(q.qid, q.preptest, q.section, q.questionNumber, q.questionType, q.stimulus, q.prompt, q.sourceNote, q.isExplained, correct ? correct.letter : null),
  );
  for (const c of q.choices) {
    cRows.push(row(q.qid, c.letter, c.text, c.tag, !!(c.tag && /^Correct\b/i.test(c.tag)), c.percent));
  }
  for (const e of q.explanations) {
    eRows.push(row(q.qid, e.style));
    e.steps.forEach((s, i) => sRows.push(row(q.qid, e.style, i, s.label, s.text)));
    for (const n of e.choiceProse) nRows.push(row(q.qid, e.style, n.letter, n.prose));
  }
}

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

const sql = `
BEGIN;
CREATE TEMP TABLE stg_q (qid text, preptest int, section int, question_number int, question_type text, stimulus text, prompt text, source_note text, is_explained boolean, correct_choice text);
CREATE TEMP TABLE stg_c (qid text, letter text, choice_text text, tag text, is_correct boolean, student_percent int);
CREATE TEMP TABLE stg_e (qid text, style text);
CREATE TEMP TABLE stg_s (qid text, style text, position int, label text, body text);
CREATE TEMP TABLE stg_n (qid text, style text, letter text, body text);

\\copy stg_q FROM '${files_.q}'
\\copy stg_c FROM '${files_.c}'
\\copy stg_e FROM '${files_.e}'
\\copy stg_s FROM '${files_.s}'
\\copy stg_n FROM '${files_.n}'

INSERT INTO public.lr_preptests (preptest)
SELECT DISTINCT preptest FROM stg_q
ON CONFLICT (preptest) DO NOTHING;

INSERT INTO public.lr_sections (preptest, section)
SELECT DISTINCT preptest, section FROM stg_q
ON CONFLICT (preptest, section) DO NOTHING;

INSERT INTO public.lr_questions (section_id, qid, preptest, section, question_number, question_type, stimulus, prompt, source_note, is_explained, correct_choice)
SELECT sec.id, q.qid, q.preptest, q.section, q.question_number, q.question_type, q.stimulus, q.prompt, q.source_note, q.is_explained, q.correct_choice
FROM stg_q q JOIN public.lr_sections sec ON sec.preptest = q.preptest AND sec.section = q.section
ON CONFLICT (qid) DO NOTHING;

INSERT INTO public.lr_answer_choices (question_id, letter, choice_text, tag, is_correct, student_percent)
SELECT lq.id, c.letter, c.choice_text, c.tag, c.is_correct, c.student_percent
FROM stg_c c JOIN public.lr_questions lq ON lq.qid = c.qid
ON CONFLICT (question_id, letter) DO NOTHING;

INSERT INTO public.lr_explanations (question_id, style)
SELECT lq.id, e.style FROM stg_e e JOIN public.lr_questions lq ON lq.qid = e.qid
ON CONFLICT (question_id, style) DO NOTHING;

INSERT INTO public.lr_explanation_steps (explanation_id, position, label, body)
SELECT ex.id, s.position, s.label, s.body
FROM stg_s s JOIN public.lr_questions lq ON lq.qid = s.qid
JOIN public.lr_explanations ex ON ex.question_id = lq.id AND ex.style = s.style
ON CONFLICT (explanation_id, position) DO NOTHING;

INSERT INTO public.lr_explanation_choice_notes (explanation_id, letter, body)
SELECT ex.id, n.letter, n.body
FROM stg_n n JOIN public.lr_questions lq ON lq.qid = n.qid
JOIN public.lr_explanations ex ON ex.question_id = lq.id AND ex.style = n.style
ON CONFLICT (explanation_id, letter) DO NOTHING;

COMMIT;
`;

const sqlPath = path.join(tmp, 'load.sql');
fs.writeFileSync(sqlPath, sql);

console.log(
  `parsed ${questions.length} questions / ${cRows.length} choices / ${eRows.length} explanations / ${sRows.length} steps / ${nRows.length} choice notes (${skipped.length} skipped)`,
);

const out = execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-f', sqlPath], { encoding: 'utf8' });
console.log(out);

fs.writeFileSync(
  path.join(process.cwd(), 'scripts/out/lr-explanations-ingest-report.json'),
  JSON.stringify({ files: files.length, questions: questions.length, skipped }, null, 2),
);
console.log('report written to scripts/out/lr-explanations-ingest-report.json');
