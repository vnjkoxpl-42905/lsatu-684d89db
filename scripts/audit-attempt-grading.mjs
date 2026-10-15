#!/usr/bin/env node
/**
 * audit-attempt-grading.mjs — does what students were TOLD match what is TRUE?
 *
 * The bank tripwire (repair-correct-answers.mjs --check, wired into
 * verify:drills) catches a wrong answer key sitting in the files. It cannot
 * catch the damage already written: every `attempts` row graded while the key
 * was wrong keeps its wrong verdict forever, because `correct` is computed once
 * at attempt time and never revisited. That is how 14 rows across 8 students
 * survived the 2026-08-20 repair and had to be corrected by hand.
 *
 * This audits the stored verdicts against the repaired bank, so the data-level
 * version of that drift is a number rather than a student's email.
 *
 * There is no service-role key on this machine and the anon key returns nothing
 * under RLS, so this does not connect on its own. Pull the rows through the
 * Lovable MCP connector (project 53b9a6f2-aba7-4ae4-8dd1-fa5b8aab4d76):
 *
 *   select id, user_id, pt, section, qnum, selected_answer, correct,
 *          timestamp_iso
 *   from attempts;
 *
 * then save the tool's JSON ({rows:[...]}, or a bare array) and run:
 *
 *   node scripts/audit-attempt-grading.mjs <attempts.json>
 *
 * Exits non-zero when any stored verdict disagrees with the bank, and prints
 * the ids so the correction is a copy-paste rather than a re-derivation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

const input = process.argv[2];
if (!input) {
  console.error('usage: node scripts/audit-attempt-grading.mjs <attempts.json>');
  process.exit(2);
}

/** True answer for every question the bank knows, keyed pt-section-qnum. */
function loadKeys() {
  const keys = new Map();
  for (const file of fs.readdirSync(DATA_DIR).filter((f) => /-LR\.json$/.test(f))) {
    let arr;
    try {
      arr = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
    } catch {
      continue;
    }
    if (!Array.isArray(arr)) continue;
    for (const q of arr) {
      const pt = String(q.practiceTest ?? '').replace(/^PT/, '');
      keys.set(`${pt}-${q.sectionNumber}-${q.questionNumber}`, q.correctAnswer);
    }
  }
  return keys;
}

const payload = JSON.parse(fs.readFileSync(input, 'utf8'));
const rows = Array.isArray(payload) ? payload : (payload.rows ?? []);
const keys = loadKeys();

const mismatches = [];
let checked = 0;
let unknown = 0;

for (const r of rows) {
  const truth = keys.get(`${r.pt}-${r.section}-${r.qnum}`);
  // A question the bank does not carry (RC, a retired import) is not evidence
  // of bad grading — count it and move on rather than calling it a mismatch.
  if (!truth) {
    unknown++;
    continue;
  }
  checked++;
  const shouldBe = r.selected_answer === truth;
  if (r.correct !== shouldBe) {
    mismatches.push({
      id: r.id,
      user: r.user_id,
      q: `PT${r.pt}-S${r.section}-Q${r.qnum}`,
      picked: r.selected_answer,
      told: r.correct,
      truth,
      shouldBe,
      when: r.timestamp_iso,
    });
  }
}

for (const m of mismatches) {
  console.log(
    `  ${m.q.padEnd(14)} ${String(m.user).slice(0, 8)}  picked ${m.picked}  ` +
      `told ${String(m.told).padEnd(5)} -> ${String(m.shouldBe).padEnd(5)} (key ${m.truth})  ` +
      `${m.when ?? ''}  ${m.id}`,
  );
}

const wronglyPunished = mismatches.filter((m) => m.shouldBe).length;
console.log(
  `audit-attempt-grading: ${rows.length} rows in, ${checked} checked, ${unknown} not in the bank, ` +
    `${mismatches.length} mis-graded (${wronglyPunished} marked wrong that were right, ` +
    `${mismatches.length - wronglyPunished} marked right that were wrong).`,
);

if (mismatches.length > 0) {
  console.error(
    'audit-attempt-grading: stored verdicts disagree with the bank. These rows need ' +
      '`correct` recomputed as (selected_answer = key); record the change under wiki/data-fixes/.',
  );
  process.exit(1);
}
