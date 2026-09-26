/**
 * Builds the Question jump's address index.
 *
 * The three dropdowns on Classroom Home need to know which PrepTests, sections,
 * and question numbers exist — and nothing else. Populating them from the real
 * banks would cost the home page ~700 KB (the LR bank is 160 files, the RC
 * question index alone is 536 KB) on the page a student opens most, which is
 * exactly why `useQuestionFinderBanks` refuses to load until the finder opens.
 *
 * So this ships the addresses on their own: a few KB of numbers, no question
 * text. Picking an address still routes into the real bank, which loads then.
 *
 * Source of truth is `JSON_FILES` in src/lib/questionLoader.ts, not a glob over
 * public/data — a stray file in that directory that the loader does not serve
 * would otherwise become a dropdown option that dead-ends.
 *
 *   node scripts/build-finder-address-index.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public/data/finder-address-index.json");

const loaderSource = readFileSync(resolve(root, "src/lib/questionLoader.ts"), "utf8");
const listMatch = loaderSource.match(/const JSON_FILES = \[([\s\S]*?)\n\];/);
if (!listMatch) throw new Error("Could not find JSON_FILES in src/lib/questionLoader.ts");
const lrFiles = [...listMatch[1].matchAll(/'(\/data\/[^']+)'/g)].map((m) => m[1]);
if (lrFiles.length === 0) throw new Error("JSON_FILES parsed to an empty list");

/** pt -> section -> { lr: [qnum...], rc: [{ id, position, title }...] }
 *
 *  LR carries only question numbers: its qid is `PT{pt}-S{section}-Q{qnum}`,
 *  built the same way in `questionLoader.hashQid`, so storing it would be
 *  duplicating a formula. RC has no such formula — a passage is reached by its
 *  own id — so the ids ship. */
const tests = new Map();

function section(pt, sec) {
  if (!tests.has(pt)) tests.set(pt, new Map());
  const sections = tests.get(pt);
  if (!sections.has(sec)) sections.set(sec, { lr: [], rc: [] });
  return sections.get(sec);
}

for (const file of lrFiles) {
  const questions = JSON.parse(readFileSync(resolve(root, "public", file.replace(/^\//, "")), "utf8"));
  for (const q of questions) {
    if (q.status === 'removed') continue;
    const pt = Number(String(q.practiceTest ?? "").replace(/^PT/i, ""));
    const sec = Number(q.sectionNumber);
    const qnum = Number(q.questionNumber);
    if (!Number.isFinite(pt) || !Number.isFinite(sec) || !Number.isFinite(qnum)) continue;
    section(pt, sec).lr.push(qnum);
  }
}

const rcIndex = JSON.parse(readFileSync(resolve(root, "public/data/rc/rc-index.json"), "utf8"));
const rcQuestionIndex = JSON.parse(
  readFileSync(resolve(root, "public/data/rc/rc-question-index.json"), "utf8"),
);
const rcQuestionsByPassage = new Map();
for (const question of rcQuestionIndex.questions ?? []) {
  const rows = rcQuestionsByPassage.get(question.passageId) ?? [];
  rows.push(question);
  rcQuestionsByPassage.set(question.passageId, rows);
}
for (const entry of rcIndex.preptests ?? []) {
  const pt = Number(entry.preptest);
  if (!Number.isFinite(pt)) continue;
  const bySection = new Map();
  for (const passage of entry.passages ?? []) {
    const rows = bySection.get(passage.section) ?? [];
    rows.push(passage);
    bySection.set(passage.section, rows);
  }
  for (const [rawSection, passages] of bySection) {
    const sec = Number(rawSection);
    if (!Number.isFinite(sec)) continue;
    for (const passage of [...passages].sort((a, b) => a.setNumber - b.setNumber)) {
      const questions = [...(rcQuestionsByPassage.get(passage.passageId) ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((question) => ({
          id: Number(question.questionId),
          number: Number(question.position),
        }));
      section(pt, sec).rc.push({
        id: Number(passage.passageId),
        position: Number(passage.setNumber),
        title: passage.title ?? null,
        questions,
      });
    }
  }
}

const payload = {
  generatedBy: "scripts/build-finder-address-index.mjs",
  tests: [...tests.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([pt, sections]) => ({
      pt,
      sections: [...sections.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([sec, body]) => ({
          section: sec,
          lr: [...new Set(body.lr)].sort((a, b) => a - b),
          rc: body.rc.sort((a, b) => a.position - b.position),
        })),
    })),
};

writeFileSync(out, JSON.stringify(payload));
const bytes = readFileSync(out).length;
console.log(
  `finder-address-index.json: ${payload.tests.length} PrepTests, ` +
    `${payload.tests.reduce((n, t) => n + t.sections.length, 0)} sections, ` +
    `${payload.tests.reduce((n, t) => n + t.sections.reduce((m, s) => m + s.rc.length, 0), 0)} RC passages, ` +
    `${(bytes / 1024).toFixed(1)} KB`,
);
