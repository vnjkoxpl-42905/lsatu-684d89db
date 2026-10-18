#!/usr/bin/env node
import { applySourceCorrection } from './rc-source-correction.mjs';
/**
 * Build the static RC question bank served from public/data/rc/.
 *
 * Reads the extracted LSAT Lab RC bundle at scripts/rc-source/data/ and writes
 * one JSON file per PrepTest (RC-PT<n>.json) plus rc-index.json.
 *
 * Run: node scripts/build-rc-bank.mjs
 *
 * The script re-reads its own output and asserts the expected totals. It exits
 * non-zero on any validation failure; it never warns and continues.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { applyCorrections, resolveCredit } from './rc-answer-keys.mjs';
import { applyAuthoredCorrections } from './rc-authored-corrections.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'scripts/rc-source/data');
const OUT = join(ROOT, 'public/data/rc');
const REPORT = join(ROOT, 'scripts/rc-source/conversion-report.txt');

const BASE_EXPECTED = { passages: 320, questions: 2150, choices: 8010, explained: 1602 };

const fail = (msg) => {
  console.error(`\nFAIL: ${msg}\n`);
  process.exit(1);
};

const readCsv = (name) =>
  parse(readFileSync(join(SRC, name)), { columns: true, skip_empty_lines: true });

const readNdjson = (name) =>
  readFileSync(join(SRC, name), 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

const nullable = (v) => (v === undefined || v === null || v === '' ? null : v);
const bool = (v) => v === 't';
const num = (v) => (nullable(v) === null ? null : Number(v));

// ---------------------------------------------------------------- load source
const passagesCsv = readCsv('passages.csv');
const questionsCsv = readCsv('questions.csv');
const choicesCsv = readCsv('answer_choices.csv');
const featuresCsv = readCsv('question_features.csv');
const frameworksCsv = readCsv('passage_frameworks.csv');
const taxonomyCsv = readCsv('taxonomy.csv');
const passageTexts = readNdjson('passage_texts.ndjson');
const explanations = readNdjson('question_explanations.ndjson');

/**
 * The recovery overlay, when one has been pulled.
 *
 * The original extract fetched answer choices only for questions carrying a
 * written explanation, so 548 real questions arrived with no choices at all and
 * could not be published. scripts/rc-recovery-sink.mjs collects them from the
 * same authenticated API; this merges them back in.
 *
 * They stay honestly unexplained: `hasWrittenExplanation` false, no explanation
 * blocks, and the review layer's tutor fallback is what a student meets. What
 * they gain is a prompt and five choices, which is all it takes to answer one.
 * Absent the file this is a no-op and the build is byte-identical to before.
 */
const RECOVERED = join(ROOT, 'scripts/rc-source/recovered/questions.ndjson');
const recovered = existsSync(RECOVERED)
  ? readFileSync(RECOVERED, 'utf8')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l))
  : [];
const recoveredById = new Map(recovered.map((r) => [Number(r.question_id), r]));

// Recovering a question adds five choices and nothing else: it was always
// counted in questions.csv, and it stays unexplained.
const EXPECTED = {
  ...BASE_EXPECTED,
  choices: BASE_EXPECTED.choices + recovered.length * 5,
};

const srcCounts = {
  'passages.csv': passagesCsv.length,
  'questions.csv': questionsCsv.length,
  'answer_choices.csv': choicesCsv.length,
  'question_features.csv': featuresCsv.length,
  'passage_frameworks.csv': frameworksCsv.length,
  'taxonomy.csv': taxonomyCsv.length,
  'passage_texts.ndjson': passageTexts.length,
  'question_explanations.ndjson': explanations.length,
};

// closed vocabularies, straight from taxonomy.csv
const vocab = {
  passage_topic: new Set(),
  passage_format: new Set(),
  framework: new Set(),
  question_type: new Set(),
  question_feature: new Set(),
};
for (const row of taxonomyCsv) vocab[row.kind]?.add(row.name);

// ------------------------------------------------------------------ index src
const textById = new Map(passageTexts.map((p) => [p.passage_id, p]));
const explById = new Map(explanations.map((e) => [e.question_id, e]));

const frameworksByPassage = new Map();
for (const r of frameworksCsv) {
  const id = Number(r.passage_id);
  if (!frameworksByPassage.has(id)) frameworksByPassage.set(id, []);
  frameworksByPassage.get(id).push(r.framework);
}

const featuresByQuestion = new Map();
for (const r of featuresCsv) {
  const id = Number(r.question_id);
  if (!featuresByQuestion.has(id)) featuresByQuestion.set(id, []);
  featuresByQuestion.get(id).push({ name: r.feature, group: nullable(r.feature_group) });
}

const choicesByQuestion = new Map();
for (const r of choicesCsv) {
  const id = Number(r.question_id);
  if (!choicesByQuestion.has(id)) choicesByQuestion.set(id, []);
  choicesByQuestion.get(id).push({
    letter: r.letter,
    text: r.text,
    tag: nullable(r.tag),
    percent: num(r.percent),
    responseCount: num(r.response_count),
    correct: bool(r.correct),
    explanation: nullable(r.explanation),
  });
}

// A recovered question has no row in answer_choices.csv, so its five choices are
// added rather than overwriting anything. Tag and explanation stay null, which
// is the truth: LSAT Lab has no authored prose for these.
for (const r of recovered) {
  const id = Number(r.question_id);
  if (choicesByQuestion.has(id)) continue; // never shadow the original extract
  choicesByQuestion.set(
    id,
    (r.answers ?? []).map((a) => ({
      letter: a.letter,
      text: a.text,
      tag: null,
      percent: a.percent ?? null,
      responseCount: a.response_count ?? null,
      correct: !!a.correct,
      explanation: null,
    })),
  );
}

const questionsByPassage = new Map();
for (const r of questionsCsv) {
  const pid = Number(r.passage_id);
  if (!questionsByPassage.has(pid)) questionsByPassage.set(pid, []);
  questionsByPassage.get(pid).push(r);
}

// ---------------------------------------------------------------- build model
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const excluded = []; // questions dropped for lacking exactly one correct choice
let nullPromptCount = 0;

const byPreptest = new Map();

for (const p of passagesCsv) {
  const passageId = Number(p.passage_id);
  const preptest = Number(p.preptest);
  const txt = textById.get(passageId);
  if (!txt || !txt.text) fail(`passage ${passageId} has no text`);

  const questions = [];
  for (const q of (questionsByPassage.get(passageId) ?? []).sort(
    (a, b) => Number(a.position) - Number(b.position),
  )) {
    const questionId = Number(q.question_id);
    const raw = choicesByQuestion.get(questionId) ?? [];
    const choices = LETTERS.map((l) => raw.find((c) => c.letter === l)).filter(Boolean);
    const correctChoices = choices.filter((c) => c.correct);

    if (raw.length === 0 && !recoveredById.has(questionId)) {
      excluded.push({
        questionId,
        passageId,
        reason: `choices=${choices.length} correct=${correctChoices.length}`,
      });
      continue;
    }

    // Do not silently drop malformed recovered/authored questions or hide
    // duplicate letters by selecting only the first matching choice.
    resolveCredit(questionId, raw);

    const expl = explById.get(questionId);
    const hasWritten = bool(q.has_written_explanation);
    // An explicit recovered key must never be silently ignored. Conflicting
    // source fields are rejected before writing generated bank files.
    const rec = recoveredById.get(questionId);
    const correctAnswer = resolveCredit(questionId, choices, nullable(expl?.correct_answer), nullable(rec?.correctanswer));
    // The prompt normally rides on the explanation record, which a recovered
    // question does not have; its questiontext comes from the API instead.
    const prompt = nullable(expl?.prompt) ?? nullable(rec?.questiontext) ?? null;
    if (prompt === null) nullPromptCount += 1;

    questions.push({
      questionId,
      position: Number(q.position),
      questionType: q.question_type,
      questionTypeFamily: q.question_type_family,
      difficulty: num(q.difficulty),
      prompt,
      correctAnswer,
      hasWrittenExplanation: hasWritten,
      explanationBlocks: expl?.explanation_blocks ?? null,
      totalResponses: expl?.total_responses ?? rec?.total_responses ?? null,
      features: featuresByQuestion.get(questionId) ?? [],
      choices,
    });
  }

  const passage = {
    passageId,
    preptest,
    section: Number(p.section),
    setNumber: Number(p.set_number),
    title: nullable(p.title),
    topic: nullable(p.topic),
    format: nullable(p.format),
    frameworks: frameworksByPassage.get(passageId) ?? [],
    difficulty: num(p.difficulty),
    text: txt.text,
    summaries: {
      standard: nullable(txt.summary_standard),
      brief: nullable(txt.summary_brief),
      anotherWay: nullable(txt.summary_another_way),
    },
    questions,
  };

  if (!byPreptest.has(preptest)) byPreptest.set(preptest, []);
  byPreptest.get(preptest).push(passage);
}

// ------------------------------------------------------------------- write out
// Keep immutable recovery captures intact; apply only address/text-bound,
// independently documented corrections before any generated output is written.
for (const passages of byPreptest.values()) passages.sort((a, b) => a.section - b.section || a.setNumber - b.setNumber);
applyCorrections([...byPreptest].map(([preptest, passages]) => ({ preptest, passages })),
  JSON.parse(readFileSync(join(ROOT, 'src/features/rc/lib/rcAnswerKeyCorrections.json'), 'utf8')));
// Validate both overlays on a clone before either touches generated banks.
const correctedBanks = [...byPreptest].map(([preptest, passages]) => ({ preptest, passages }));
const checkedBanks = structuredClone(correctedBanks);
applySourceCorrection(checkedBanks);
applyAuthoredCorrections(checkedBanks, JSON.parse(readFileSync(join(ROOT, 'scripts/rc-authored-corrections.json'), 'utf8')));
applySourceCorrection(correctedBanks);
applyAuthoredCorrections(correctedBanks,
  JSON.parse(readFileSync(join(ROOT, 'scripts/rc-authored-corrections.json'), 'utf8')));
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) {
  if (f.startsWith('RC-PT') || f === 'rc-index.json') {
    // stale output from a previous run would poison validation
    writeFileSync(join(OUT, f), '');
  }
}

const firstWords = (text) => {
  const words = text.replace(/[*_#>]/g, '').trim().split(/\s+/).slice(0, 8);
  return `${words.join(' ')}…`;
};

const indexEntries = [];
for (const preptest of [...byPreptest.keys()].sort((a, b) => a - b)) {
  const passages = byPreptest
    .get(preptest)
    .sort((a, b) => a.section - b.section || a.setNumber - b.setNumber);

  writeFileSync(join(OUT, `RC-PT${preptest}.json`), JSON.stringify({ preptest, passages }));

  indexEntries.push({
    preptest,
    passageCount: passages.length,
    questionCount: passages.reduce((n, p) => n + p.questions.length, 0),
    passages: passages.map((p) => ({
      passageId: p.passageId,
      section: p.section,
      setNumber: p.setNumber,
      title: p.title,
      topic: p.topic,
      format: p.format,
      frameworks: p.frameworks,
      difficulty: p.difficulty,
      questionCount: p.questions.length,
      explainedCount: p.questions.filter((q) => q.hasWrittenExplanation).length,
      // The hub rolls a student's per-question history up to passage level for
      // its status filters, and must do it without loading any per-PT file.
      questionIds: p.questions.map((q) => q.questionId),
      firstWords: firstWords(p.text),
    })),
  });
}
writeFileSync(join(OUT, 'rc-index.json'), JSON.stringify({ preptests: indexEntries }));

// -------------------------------------------------- validate by re-reading out
const written = readdirSync(OUT).filter((f) => f.startsWith('RC-PT'));
const files = written.map((f) => JSON.parse(readFileSync(join(OUT, f), 'utf8')));
const allPassages = files.flatMap((f) => f.passages);
const allQuestions = allPassages.flatMap((p) => p.questions);
const allChoices = allQuestions.flatMap((q) => q.choices);
const explained = allQuestions.filter(
  (q) => Array.isArray(q.explanationBlocks) && q.explanationBlocks.length > 0,
);

const assert = (cond, msg) => {
  if (!cond) fail(msg);
};

assert(allPassages.length === EXPECTED.passages, `passages ${allPassages.length} != 320`);
assert(
  allQuestions.length + excluded.length === EXPECTED.questions,
  `questions ${allQuestions.length} + excluded ${excluded.length} != 2150`,
);
// Every retained question carries 5 choices, and the bundle's 8,010 choice rows
// all belong to retained questions (the excluded ones have none at all).
assert(allChoices.length === EXPECTED.choices, `choices ${allChoices.length} != 8010`);
// 1,602 questions carry an authored explanation record; 1,242 of those actually
// carry prose blocks (the rest are tag-only, e.g. all of PT159).
const withExplanationRecord = allQuestions.filter((q) => q.hasWrittenExplanation);
assert(
  withExplanationRecord.length === EXPECTED.explained,
  `questions with an explanation record ${withExplanationRecord.length} != 1602`,
);

for (const p of allPassages) {
  assert(typeof p.text === 'string' && p.text.length > 0, `passage ${p.passageId} empty text`);
  if (p.topic !== null) assert(vocab.passage_topic.has(p.topic), `bad topic ${p.topic}`);
  if (p.format !== null) assert(vocab.passage_format.has(p.format), `bad format ${p.format}`);
  for (const fw of p.frameworks) assert(vocab.framework.has(fw), `bad framework ${fw}`);
}
for (const q of allQuestions) {
  assert(q.choices.length === 5, `question ${q.questionId} has ${q.choices.length} choices`);
  assert(
    q.choices.filter((c) => c.correct).length === 1,
    `question ${q.questionId} correct-choice count != 1`,
  );
  assert(
    q.choices.some((c) => c.letter === q.correctAnswer && c.correct),
    `question ${q.questionId} correctAnswer ${q.correctAnswer} disagrees with choices`,
  );
  assert(vocab.question_type.has(q.questionType), `bad question type ${q.questionType}`);
  for (const f of q.features) assert(vocab.question_feature.has(f.name), `bad feature ${f.name}`);
}

// ----------------------------------------------------------------- the report
const pad = (s, n) => String(s).padEnd(n);
const lines = [];
lines.push('RC bank conversion report');
lines.push(`generated: ${new Date().toISOString()}`);
lines.push('');
lines.push('source rows read');
for (const [k, v] of Object.entries(srcCounts)) lines.push(`  ${pad(k, 30)} ${v}`);
lines.push('');
lines.push('written output');
lines.push(`  ${pad('per-preptest files', 30)} ${written.length}`);
lines.push(`  ${pad('passages', 30)} ${allPassages.length} / ${EXPECTED.passages}`);
lines.push(`  ${pad('questions', 30)} ${allQuestions.length} / ${EXPECTED.questions}`);
lines.push(`  ${pad('answer choices', 30)} ${allChoices.length} / ${EXPECTED.choices}`);
lines.push(
  `  ${pad('with explanation record', 30)} ${withExplanationRecord.length} / ${EXPECTED.explained}`,
);
lines.push(`  ${pad('with prose explanation blocks', 30)} ${explained.length}`);
lines.push(
  `  ${pad('tag-only (record, no blocks)', 30)} ${withExplanationRecord.length - explained.length}`,
);
lines.push('');
lines.push('authored gaps carried through (not backfilled)');
lines.push(`  ${pad('passages with null format', 30)} ${allPassages.filter((p) => !p.format).length}`);
lines.push(
  `  ${pad('passages with no framework', 30)} ${allPassages.filter((p) => p.frameworks.length === 0).length}`,
);
lines.push(
  `  ${pad('passages Brief summary', 30)} ${allPassages.filter((p) => p.summaries.brief).length}`,
);
lines.push(
  `  ${pad('passages Another Way summary', 30)} ${allPassages.filter((p) => p.summaries.anotherWay).length}`,
);
lines.push(
  `  ${pad('questions with no feature', 30)} ${allQuestions.filter((q) => q.features.length === 0).length}`,
);
lines.push(
  `  ${pad('questions no written expl.', 30)} ${allQuestions.filter((q) => !q.hasWrittenExplanation).length}`,
);
lines.push(`  ${pad('questions with null prompt', 30)} ${nullPromptCount}`);
lines.push(
  `  ${pad('choices with null tag', 30)} ${allChoices.filter((c) => c.tag === null).length}`,
);
lines.push('');
lines.push(`excluded questions (no single credited choice): ${excluded.length}`);
const byReason = new Map();
for (const e of excluded) byReason.set(e.reason, (byReason.get(e.reason) ?? 0) + 1);
for (const [reason, n] of byReason) lines.push(`  ${pad(reason, 30)} ${n}`);
lines.push('  question ids:');
for (let i = 0; i < excluded.length; i += 12) {
  lines.push(`    ${excluded.slice(i, i + 12).map((e) => e.questionId).join(' ')}`);
}
lines.push('');
lines.push('passages left with zero drillable questions');
const emptyPassages = allPassages.filter((p) => p.questions.length === 0);
lines.push(`  ${pad('count', 30)} ${emptyPassages.length}`);
for (const p of emptyPassages) {
  lines.push(`    PT${p.preptest} S${p.section} P${p.setNumber} — ${p.title} (id ${p.passageId})`);
}

const report = lines.join('\n');
writeFileSync(REPORT, `${report}\n`);
console.log(report);
console.log('\nOK — all validations passed.');
