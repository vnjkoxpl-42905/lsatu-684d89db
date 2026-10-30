#!/usr/bin/env node
// Read-only LR bank formatting audit.
// Finds likely PDF hard-wrap newlines that should be normalized at load time.
// Run: `node scripts/audit-question-formatting.mjs`
// CSV: `node scripts/audit-question-formatting.mjs --csv`

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const LOADER_PATH = path.join(REPO, 'src/lib/questionLoader.ts');
const DATA_DIR = path.join(REPO, 'public/data');
const CSV = process.argv.includes('--csv');

function getLoadedQuestionFiles() {
  const loader = fs.readFileSync(LOADER_PATH, 'utf8');
  const match = loader.match(/const JSON_FILES = \[([\s\S]*?)\];/);
  if (!match) throw new Error('Could not find JSON_FILES in src/lib/questionLoader.ts');

  return [...match[1].matchAll(/['"]\/data\/([^'"]+\.json)['"]/g)].map((item) => item[1]);
}

function fieldHasHardWrap(text) {
  return typeof text === 'string' && /[a-z,;:—–-]\n[ a-z]/.test(text);
}

function questionId(file, question) {
  const fileMatch = file.match(/^PT(\d+)-S(\d+)-LR\.json$/);
  const pt = String(question.prepTest ?? question.practiceTest ?? `PT${fileMatch?.[1] ?? 'unknown'}`).replace(/^PT/i, '');
  const section = question.section ?? question.sectionNumber ?? fileMatch?.[2] ?? 'unknown';
  const qnum = question.questionNumber ?? question.qnum ?? 'unknown';
  return `PT${pt}-S${section}-Q${qnum}`;
}

function preview(text) {
  return text.replace(/\n/g, '⏎').replace(/[ \t]{2,}/g, ' ').slice(0, 180);
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

const findings = [];
for (const file of getLoadedQuestionFiles()) {
  const fullPath = path.join(DATA_DIR, file);
  const doc = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const questions = Array.isArray(doc) ? doc : doc.questions ?? [];

  for (const question of questions) {
    const fields = [
      ['stimulus', question.stimulus],
      ['questionStem', question.questionStem],
      ...Object.entries(question.answerChoices ?? {}).map(([key, value]) => [`answerChoices.${key}`, value]),
    ];

    for (const [field, value] of fields) {
      if (!fieldHasHardWrap(value)) continue;
      findings.push({
        qid: questionId(file, question),
        file,
        field,
        preview: preview(value),
      });
    }
  }
}

if (CSV) {
  console.log(['qid', 'file', 'field', 'preview'].map(csvCell).join(','));
  for (const row of findings) {
    console.log([row.qid, row.file, row.field, row.preview].map(csvCell).join(','));
  }
} else {
  const byFile = new Map();
  for (const row of findings) byFile.set(row.file, (byFile.get(row.file) ?? 0) + 1);

  console.log(`Suspicious hard-wrap fields: ${findings.length}`);
  console.log(`Affected questions: ${new Set(findings.map((row) => row.qid)).size}`);
  console.log(`Affected files: ${byFile.size}`);
  console.log('\nTop files:');
  for (const [file, count] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`${String(count).padStart(4)}  ${file}`);
  }

  console.log('\nFindings:');
  for (const row of findings) {
    console.log(`${row.qid}\t${row.field}\t${row.file}\t${row.preview}`);
  }
}
