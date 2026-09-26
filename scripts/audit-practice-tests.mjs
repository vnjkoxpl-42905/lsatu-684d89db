#!/usr/bin/env node
/**
 * Audits every practice test the Testing Centre offers, question by question.
 *
 * A practice test is only worth sitting if it runs from beginning to end. This
 * script answers one question for each test on the page: is every official
 * question actually there, and if not, exactly which ones are missing.
 *
 * Where the expected roster comes from, per section kind:
 *
 *   RC  scripts/rc-source/data/questions.csv — the LSAT Lab extract's own
 *       question table. It lists every question in the section, including the
 *       ones the bank could not publish, so the expected roster is EXACT.
 *
 *   LR  no equivalent source table exists; the bank files were transcribed.
 *       The roster is therefore the highest question number present, which is a
 *       LOWER BOUND: it catches numbering gaps but cannot see a truncated tail.
 *       Every LR line says which it is rather than implying certainty.
 *
 * PT118's modern PDF identifies S3 as unscored, so its scored sitting uses S1
 * and S4. The offer rules below mirror buildPracticeTests() and buildRcSections(). They
 * are duplicated because this script is plain Node and those are TypeScript;
 * practiceTest.audit.test.ts asserts the two agree, so drift fails CI.
 *
 * Usage:
 *   node scripts/audit-practice-tests.mjs              # report, exit 1 if incomplete
 *   node scripts/audit-practice-tests.mjs --summary    # totals only
 *   node scripts/audit-practice-tests.mjs --json FILE  # write the recovery work list
 *   node scripts/audit-practice-tests.mjs --report-only # never exit non-zero
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'public/data');
const RC_DATA = join(DATA, 'rc');
const RC_SOURCE = join(ROOT, 'scripts/rc-source/data/questions.csv');

/** Mirrors LR_FULL_SECTION_MIN_QUESTIONS in src/lib/practiceTest.ts. */
const LR_FULL_SECTION_MIN_QUESTIONS = 24;
/** Mirrors RC_SECTION_PASSAGE_COUNT in src/features/rc/lib/rcSections.ts. */
const RC_SECTION_PASSAGE_COUNT = 4;
// Explicit official modern-test positions, verified against the PT118 PDF.
const OFFICIAL_LR_ROSTERS = new Map([
  ['118:1', { lastPosition: 26, removed: [5] }],
  ['118:3', { lastPosition: 25, removed: [22] }],
]);

function fingerprint(q) {
  const choices = q.answerChoices ?? {};
  return [q.stimulus, q.questionStem, ...'ABCDE'.split('').map((letter) => choices[letter])]
    .map((part) => String(part ?? '').trim().replace(/\s+/g, ' '))
    .join('\u0000');
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const flagValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

/** Missing numbers in 1..expected, given what is published. */
function gaps(published, expected) {
  const have = new Set(published);
  const out = [];
  for (const n of expected) if (!have.has(n)) out.push(n);
  return out.sort((a, b) => a - b);
}

/** "1-4, 7, 11-13" — a run-length view, because a bare list of 27 is unreadable. */
function ranges(nums) {
  if (nums.length === 0) return '';
  const out = [];
  let start = nums[0];
  let prev = nums[0];
  for (const n of nums.slice(1)) {
    if (n === prev + 1) { prev = n; continue; }
    out.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = n;
  }
  out.push(start === prev ? `${start}` : `${start}-${prev}`);
  return out.join(', ');
}

/* ------------------------------------------------------------------ LR bank */

function loadLrSections() {
  const sections = [];
  for (const file of readdirSync(DATA).sort()) {
    const m = /^PT(\d+)-S(\d+)-LR\.json$/.exec(file);
    if (!m) continue;
    const questions = JSON.parse(readFileSync(join(DATA, file), 'utf8'));
    const pt = Number(m[1]);
    const section = Number(m[2]);
    const officialRoster = OFFICIAL_LR_ROSTERS.get(`${pt}:${section}`);
    const officialRemoved = officialRoster?.removed ?? [];
    const removed = questions.filter((q) => q.status === 'removed');
    const active = questions.filter((q) => q.status !== 'removed');
    const published = active
      .map((q) => Number(q.questionNumber))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    const highest = published.length ? published[published.length - 1] : 0;
    // Lower bound: we can see holes, not a missing tail.
    const expected = Array.from({ length: officialRoster?.lastPosition ?? highest }, (_, i) => i + 1)
      .filter((n) => !officialRemoved.includes(n));
    const duplicates = published.filter((n, i) => i > 0 && n === published[i - 1]);
    const seen = new Map();
    const duplicateContent = [];
    for (const q of active) {
      const key = fingerprint(q);
      if (seen.has(key)) duplicateContent.push([seen.get(key), Number(q.questionNumber)]);
      else seen.set(key, Number(q.questionNumber));
    }
    sections.push({
      kind: 'lr',
      pt,
      section,
      file,
      count: active.length,
      published,
      expected,
      missing: gaps(published, expected),
      duplicates: [...new Set(duplicates)],
      duplicateContent,
      removed: removed.map((q) => Number(q.questionNumber)),
      invalidRemoved: removed.map((q) => Number(q.questionNumber)).filter((n) => !officialRemoved.includes(n)),
      missingRemoved: officialRemoved.filter((n) => !removed.some((q) => Number(q.questionNumber) === n)),
      liveAtRemoved: published.filter((n) => officialRemoved.includes(n)),
      unexpectedLive: officialRoster ? published.filter((n) => n < 1 || n > officialRoster.lastPosition) : [],
      rosterExact: !!officialRoster,
    });
  }
  return sections;
}

/* ------------------------------------------------------------------ RC bank */

/** The expected roster per RC section, from the extract's own question table. */
function loadRcRoster() {
  if (!existsSync(RC_SOURCE)) return null;
  const rows = parse(readFileSync(RC_SOURCE), { columns: true, skip_empty_lines: true });
  const roster = new Map();
  for (const r of rows) {
    const key = `${Number(r.preptest)}:${Number(r.section)}`;
    const list = roster.get(key) ?? [];
    list.push({ questionId: Number(r.question_id), position: Number(r.position) });
    roster.set(key, list);
  }
  for (const list of roster.values()) list.sort((a, b) => a.position - b.position);
  return roster;
}

function loadRcSections(roster) {
  const sections = [];
  for (const file of readdirSync(RC_DATA).sort()) {
    if (!/^RC-PT\d+\.json$/.test(file)) continue;
    const parsed = JSON.parse(readFileSync(join(RC_DATA, file), 'utf8'));
    const bySection = new Map();
    for (const p of parsed.passages) {
      const list = bySection.get(p.section) ?? [];
      list.push(p);
      bySection.set(p.section, list);
    }
    for (const [section, passages] of [...bySection].sort((a, b) => a[0] - b[0])) {
      const pt = parsed.preptest;
      const published = passages
        .flatMap((p) => (p.questions ?? []).map((q) => Number(q.position)))
        .sort((a, b) => a - b);
      const rosterRows = roster?.get(`${pt}:${section}`) ?? null;
      const rosterExact = !!rosterRows;
      const expected = rosterRows
        ? rosterRows.map((r) => r.position)
        : Array.from({ length: published.at(-1) ?? 0 }, (_, i) => i + 1);
      const missing = gaps(published, expected);
      const missingIds = rosterRows
        ? rosterRows.filter((r) => missing.includes(r.position)).map((r) => r.questionId)
        : [];
      const duplicates = published.filter((n, i) => i > 0 && n === published[i - 1]);
      sections.push({
        kind: 'rc',
        pt,
        section,
        file,
        passageCount: passages.length,
        passageIds: [...passages].sort((a, b) => a.setNumber - b.setNumber).map((p) => p.passageId),
        emptyPassages: passages.filter((p) => (p.questions ?? []).length === 0).length,
        count: published.length,
        published,
        expected,
        missing,
        missingIds,
        duplicates: [...new Set(duplicates)],
        rosterExact,
      });
    }
  }
  return sections;
}

/* ------------------------------------------------- what the page offers */

/**
 * Rebuild the Testing Centre's offer list. Mirrors buildPracticeTests(): two
 * full LR sections and one four-passage RC section with no empty passage. PT118
 * uses S1 and S4 because S3 is unscored; other tests use the lowest-numbered
 * two LR sections where a third exists. Legs remain in section order.
 */
function buildOffers(lrSections, rcSections) {
  const lrByPt = new Map();
  for (const s of lrSections) {
    if (s.count < LR_FULL_SECTION_MIN_QUESTIONS) continue;
    const list = lrByPt.get(s.pt) ?? [];
    list.push(s);
    lrByPt.set(s.pt, list);
  }

  const rcByPt = new Map();
  for (const s of rcSections) {
    if (s.passageCount !== RC_SECTION_PASSAGE_COUNT) continue;
    if (s.emptyPassages > 0) continue;
    const existing = rcByPt.get(s.pt);
    if (
      !existing ||
      s.count > existing.count ||
      (s.count === existing.count && s.section < existing.section)
    ) {
      rcByPt.set(s.pt, s);
    }
  }

  const offers = [];
  for (const [pt, lrList] of lrByPt) {
    const rc = rcByPt.get(pt);
    if (!rc) continue;
    const lr = pt === 118
      ? lrList.filter((s) => s.section === 1 || s.section === 4).sort((a, b) => a.section - b.section)
      : [...lrList].sort((a, b) => a.section - b.section).slice(0, 2);
    if (lr.length < 2) continue;
    const legs = [...lr, rc].sort((a, b) => a.section - b.section);
    offers.push({
      pt,
      legs,
      questionCount: legs.reduce((n, l) => n + l.count, 0),
      expectedCount: legs.reduce((n, l) => n + l.expected.length, 0),
      missingCount: legs.reduce((n, l) => n + l.missing.length + (l.missingRemoved?.length ?? 0) + (l.liveAtRemoved?.length ?? 0) + (l.invalidRemoved?.length ?? 0) + (l.unexpectedLive?.length ?? 0) + l.duplicates.length + (l.duplicateContent?.length ?? 0), 0),
    });
  }
  return offers.sort((a, b) => a.pt - b.pt);
}

/* ----------------------------------------------------------------- report */

const roster = loadRcRoster();
const lrSections = loadLrSections();
const rcSections = loadRcSections(roster);
const offers = buildOffers(lrSections, rcSections);

if (!roster) {
  console.log(
    'NOTE: scripts/rc-source/data/questions.csv is absent, so RC rosters fall back\n' +
      '      to the highest published position. Missing tails will not be seen.\n',
  );
}

const complete = offers.filter((o) => o.missingCount === 0);
const incomplete = offers.filter((o) => o.missingCount > 0);

if (!flag('--summary')) {
  console.log('Practice tests the Testing Centre offers, question by question');
  console.log('='.repeat(78));
  console.log('\u2020 the expected count is the highest question number present, so it is a');
  console.log('  lower bound: a gap is real, a missing tail cannot be seen. PT118 LR');
  console.log('  removed positions and RC source-table rosters are exact.');
  console.log('');
  for (const o of offers) {
    const status = o.missingCount === 0 ? 'COMPLETE' : `SHORT ${o.missingCount}`;
    console.log(
      `PrepTest ${o.pt}  ${o.questionCount}/${o.expectedCount} questions  [${status}]`,
    );
    for (const leg of o.legs) {
      // A dagger, not a sentence: the caveat is the same on every LR line, so
      // it is stated once in the legend and marked here.
      const kind = `${leg.kind === 'lr' ? 'LR' : 'RC'}${leg.rosterExact ? ' ' : '\u2020'}`;
      const head = `  S${leg.section} ${kind} ${leg.count}/${leg.expected.length}`;
      console.log(
        leg.missing.length === 0 ? `${head}  complete` : `${head}  missing ${ranges(leg.missing)}`,
      );
      if (leg.duplicates.length) {
        console.log(`        DUPLICATE question numbers: ${ranges(leg.duplicates)}`);
      }
      if (leg.removed?.length) console.log(`        Officially removed: ${ranges(leg.removed)}`);
      if (leg.missingRemoved?.length) console.log(`        MISSING removed markers: ${ranges(leg.missingRemoved)}`);
      if (leg.liveAtRemoved?.length) console.log(`        LIVE at removed positions: ${ranges(leg.liveAtRemoved)}`);
      if (leg.invalidRemoved?.length) console.log(`        INVALID removed positions: ${ranges(leg.invalidRemoved)}`);
      if (leg.unexpectedLive?.length) console.log(`        UNEXPECTED live positions: ${ranges(leg.unexpectedLive)}`);
      if (leg.duplicateContent?.length) console.log(`        DUPLICATE content: ${leg.duplicateContent.map(([a, b]) => `${a}/${b}`).join(', ')}`);
    }
    console.log('');
  }
}

const notOffered = [];
const lrPts = new Set(lrSections.map((s) => s.pt));
for (const pt of [...lrPts].sort((a, b) => a - b)) {
  if (!offers.some((o) => o.pt === pt)) notOffered.push(pt);
}

console.log('Summary');
console.log('='.repeat(78));
console.log(`  PrepTests offered as a full sitting   ${offers.length}`);
console.log(`  ...complete from beginning to end     ${complete.length}`);
console.log(`  ...with a completeness defect        ${incomplete.length}`);
if (notOffered.length) {
  console.log(`  PrepTests with LR but no sittable RC  ${notOffered.length} (${notOffered.join(', ')})`);
}
const totalMissing = offers.reduce((n, o) => n + o.missingCount, 0);
console.log(`  Completeness defects across offers   ${totalMissing}`);
console.log('');

const lrBad = lrSections.filter((s) => s.missing.length || s.duplicates.length || s.duplicateContent.length || s.missingRemoved.length || s.liveAtRemoved.length || s.invalidRemoved.length || s.unexpectedLive.length);
console.log(`  LR sections in the bank               ${lrSections.length}`);
  console.log(`  ...with an integrity defect         ${lrBad.length}`);
for (const s of lrBad) {
  console.log(`      ${s.file}  missing ${ranges(s.missing) || 'none'}${s.duplicates.length ? `  duplicates ${ranges(s.duplicates)}` : ''}${s.duplicateContent.length ? `  duplicate content ${s.duplicateContent.map(([a, b]) => `${a}/${b}`).join(', ')}` : ''}${s.missingRemoved.length ? `  missing removed marker ${ranges(s.missingRemoved)}` : ''}${s.liveAtRemoved.length ? `  live at removed position ${ranges(s.liveAtRemoved)}` : ''}${s.invalidRemoved.length ? `  invalid removed position ${ranges(s.invalidRemoved)}` : ''}${s.unexpectedLive.length ? `  unexpected live position ${ranges(s.unexpectedLive)}` : ''}`);
}
const rcBad = rcSections.filter((s) => s.missing.length);
console.log(`  RC sections in the bank               ${rcSections.length}`);
console.log(`  ...with at least one missing question ${rcBad.length}`);
const rcMissingTotal = rcSections.reduce((n, s) => n + s.missing.length, 0);
console.log(`  RC questions absent from the bank     ${rcMissingTotal}`);
console.log('');

const jsonPath = flagValue('--json');
if (jsonPath) {
  const work = {
    generatedFrom: 'scripts/audit-practice-tests.mjs',
    rcRosterExact: !!roster,
    rc: rcSections
      .filter((s) => s.missing.length)
      .map((s) => ({
        preptest: s.pt,
        section: s.section,
        passageIds: s.passageIds,
        publishedCount: s.count,
        expectedCount: s.expected.length,
        missingPositions: s.missing,
        missingQuestionIds: s.missingIds,
      })),
    lr: lrSections
      .filter((s) => s.missing.length || s.duplicates.length || s.duplicateContent.length || s.missingRemoved.length || s.liveAtRemoved.length || s.invalidRemoved.length || s.unexpectedLive.length)
      .map((s) => ({ preptest: s.pt, section: s.section, missingPositions: s.missing,
        officialRemovedPositions: OFFICIAL_LR_ROSTERS.get(`${s.pt}:${s.section}`)?.removed ?? [],
        missingRemovedMarkers: s.missingRemoved, liveAtRemovedPositions: s.liveAtRemoved,
        invalidRemovedPositions: s.invalidRemoved, unexpectedLivePositions: s.unexpectedLive,
        duplicateNumbers: s.duplicates,
        duplicateContentPositions: s.duplicateContent })),
  };
  writeFileSync(jsonPath, `${JSON.stringify(work, null, 2)}\n`);
  console.log(`Recovery work list written to ${jsonPath}`);
  console.log('');
}

if (incomplete.length && !flag('--report-only')) {
  console.error(
    `FAIL: ${incomplete.length} of ${offers.length} offered practice tests cannot be sat end to end.`,
  );
  process.exit(1);
}
