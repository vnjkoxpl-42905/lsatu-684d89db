#!/usr/bin/env node
/**
 * Derives public/data/rc/rc-question-index.json from the already-built RC bank
 * (rc-index.json + RC-PT<n>.json). The search page needs per-question metadata
 * (type, family, features, prompt) without loading all 59 PrepTest files; this
 * emits one flat record per drillable question.
 *
 * Only questions present in the bank are indexed — those all carry a written
 * explanation and answer choices, so every search result can be drilled.
 *
 * Usage: node scripts/build-rc-search-index.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RC_DIR = new URL('../public/data/rc/', import.meta.url).pathname;

const index = JSON.parse(readFileSync(join(RC_DIR, 'rc-index.json'), 'utf8'));

// passageId -> index row, for PT/section/set stamping and cross-checking.
const passageMeta = new Map();
for (const pt of index.preptests) {
  for (const p of pt.passages) {
    passageMeta.set(p.passageId, {
      preptest: pt.preptest,
      section: p.section,
      setNumber: p.setNumber,
      questionIds: p.questionIds,
    });
  }
}

const entries = [];
const seen = new Set();

const files = readdirSync(RC_DIR)
  .filter((f) => /^RC-PT\d+\.json$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

for (const file of files) {
  const data = JSON.parse(readFileSync(join(RC_DIR, file), 'utf8'));
  for (const passage of data.passages) {
    const meta = passageMeta.get(passage.passageId);
    if (!meta) throw new Error(`${file}: passage ${passage.passageId} missing from rc-index.json`);
    for (const q of passage.questions) {
      if (seen.has(q.questionId)) throw new Error(`${file}: duplicate questionId ${q.questionId}`);
      seen.add(q.questionId);
      entries.push({
        questionId: q.questionId,
        passageId: passage.passageId,
        preptest: meta.preptest,
        section: meta.section,
        setNumber: meta.setNumber,
        position: q.position,
        questionType: q.questionType,
        questionTypeFamily: q.questionTypeFamily,
        difficulty: q.difficulty ?? null,
        features: (q.features ?? []).map((f) => f.name),
        prompt: q.prompt ?? null,
      });
    }
  }
}

// Cross-check: the index's questionIds and the emitted set must agree exactly,
// so the hub and the search page can never disagree about what is drillable.
const indexIds = new Set();
for (const { questionIds } of passageMeta.values()) {
  for (const id of questionIds) indexIds.add(id);
}
const missing = [...indexIds].filter((id) => !seen.has(id));
const extra = [...seen].filter((id) => !indexIds.has(id));
if (missing.length || extra.length) {
  throw new Error(
    `question-id mismatch vs rc-index.json: missing=${missing.slice(0, 5)} extra=${extra.slice(0, 5)}`,
  );
}

entries.sort((a, b) => a.questionId - b.questionId);

const out = { questionCount: entries.length, questions: entries };
const target = join(RC_DIR, 'rc-question-index.json');
writeFileSync(target, JSON.stringify(out));
console.log(`rc-search-index: wrote ${entries.length} questions to ${target}`);
