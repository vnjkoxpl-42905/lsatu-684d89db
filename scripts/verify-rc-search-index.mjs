#!/usr/bin/env node
/**
 * Verifies that RC indexes exactly represent the RC passage bank. Expected
 * official addresses and question ownership come from RC-PT<n>.json; rc-index
 * is checked as a derived index, never used as the address authority.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.RC_INDEX_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..');
const rcDir = join(root, 'public', 'data', 'rc');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const rcIndex = readJson(join(rcDir, 'rc-index.json'));
const searchIndex = readJson(join(rcDir, 'rc-question-index.json'));
const addressIndex = readJson(join(root, 'public', 'data', 'finder-address-index.json'));

const failures = [];
const bankPassages = new Map();
const bankQuestions = new Map();
const bankAddresses = new Map();
const indexPassages = new Map();
const indexQuestionOwners = new Map();
const address = (row) => `PT${row.pt}S${row.section}P${row.setNumber}Q${row.position}`;
const passageAddress = (row) => `PT${row.pt}S${row.section}P${row.setNumber}`;
const recordError = (label, details) => failures.push(`${label}: ${details}`);

const sectionFiles = readdirSync(rcDir)
  .filter((file) => /^RC-PT\d+\.json$/i.test(file))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

// The passage bank owns official addresses, titles, question order, and each
// question's passage identity. All derived indexes are compared to this map.
for (const file of sectionFiles) {
  const data = readJson(join(rcDir, file));
  const ptFromFile = Number(file.match(/\d+/)[0]);
  for (const passage of data.passages ?? []) {
    const passageId = Number(passage.passageId);
    const row = {
      id: passageId,
      pt: Number(passage.preptest ?? ptFromFile),
      section: Number(passage.section),
      setNumber: Number(passage.setNumber),
      title: passage.title ?? null,
      questionIds: [],
    };
    if (row.pt !== ptFromFile) recordError(file, `passage ${passageId} declares PT${row.pt}, but is stored in RC-PT${ptFromFile}.json`);
    if (bankPassages.has(passageId)) {
      recordError(file, `duplicate passageId ${passageId}; first at ${passageAddress(bankPassages.get(passageId))}`);
      continue;
    }
    bankPassages.set(passageId, row);
    const passageKey = passageAddress(row);
    if (bankAddresses.has(passageKey)) recordError(file, `duplicate official passage address ${passageKey}`);
    else bankAddresses.set(passageKey, passageId);

    for (const question of passage.questions ?? []) {
      const id = Number(question.questionId);
      const questionRow = {
        ...row,
        position: Number(question.position),
        questionType: question.questionType ?? null,
        questionTypeFamily: question.questionTypeFamily ?? null,
        difficulty: question.difficulty ?? null,
        features: (question.features ?? []).map((feature) => feature.name),
        prompt: question.prompt ?? null,
      };
      row.questionIds.push(id);
      if (bankQuestions.has(id)) {
        recordError(file, `duplicate questionId ${id} at ${address(questionRow)}; first at ${address(bankQuestions.get(id))}`);
      } else {
        bankQuestions.set(id, questionRow);
      }
      const questionAddress = address(questionRow);
      if (bankAddresses.has(questionAddress)) recordError(file, `duplicate official address ${questionAddress}`);
      else bankAddresses.set(questionAddress, id);
    }
  }
}

// Verify the grouped address index against the bank, including passage
// metadata and exact per-passage question ownership/order.
for (const test of rcIndex.preptests ?? []) {
  for (const passage of test.passages ?? []) {
    const passageId = Number(passage.passageId);
    const indexed = {
      id: passageId,
      pt: Number(test.preptest),
      section: Number(passage.section),
      setNumber: Number(passage.setNumber),
      title: passage.title ?? null,
      questionIds: (passage.questionIds ?? []).map(Number),
    };
    const bank = bankPassages.get(passageId);
    if (indexPassages.has(passageId)) recordError('rc-index.json', `duplicate passageId ${passageId}`);
    else indexPassages.set(passageId, indexed);

    if (!bank) {
      recordError('rc-index.json', `unexpected passage ${passageId} at ${passageAddress(indexed)}`);
      continue;
    }
    for (const field of ['pt', 'section', 'setNumber', 'title']) {
      if (indexed[field] !== bank[field]) {
        recordError('rc-index.json', `passage ${passageId} has ${field}=${String(indexed[field])}; bank has ${String(bank[field])} at ${passageAddress(bank)}`);
      }
    }
    const bankIds = bank.questionIds;
    const indexIds = indexed.questionIds;
    for (const id of indexIds) {
      if (indexQuestionOwners.has(id)) {
        const firstOwner = indexQuestionOwners.get(id);
        recordError('rc-index.json', `questionId ${id} is assigned more than once, to passages ${firstOwner} and ${passageId}`);
      } else {
        indexQuestionOwners.set(id, passageId);
      }
      const bankOwner = bankQuestions.get(id)?.id;
      if (bankOwner === undefined) recordError('rc-index.json', `passage ${passageId} claims unknown questionId ${id}`);
      else if (bankOwner !== passageId) {
        const expected = bankPassages.get(bankOwner);
        recordError('rc-index.json', `questionId ${id} is assigned to passage ${passageId}; bank assigns it to passage ${bankOwner} at ${passageAddress(expected)}`);
      }
    }
    if (JSON.stringify(indexIds) !== JSON.stringify(bankIds)) {
      const indexedSet = new Set(indexIds);
      const bankSet = new Set(bankIds);
      const missing = bankIds.filter((id) => !indexedSet.has(id));
      const extra = indexIds.filter((id) => !bankSet.has(id));
      recordError('rc-index.json', `passage ${passageId} question list disagrees with bank at ${passageAddress(bank)}; missing ${missing.join(', ') || 'none'}; extra ${extra.join(', ') || 'none'}; order must match bank`);
    }
  }
}

for (const [passageId, bank] of bankPassages) {
  if (!indexPassages.has(passageId)) recordError('rc-index.json', `missing passage ${passageId} at ${passageAddress(bank)}`);
}

function compareIdSets(label, expectedIds, observedIds, expectedRows = bankQuestions) {
  const expected = new Set(expectedIds);
  const observed = new Set(observedIds);
  const missing = [...expected].filter((id) => !observed.has(id));
  const extra = [...observed].filter((id) => !expected.has(id));
  if (missing.length || extra.length) {
    const format = (id) => `${id} (${expectedRows.has(id) ? address(expectedRows.get(id)) : 'unknown address'})`;
    recordError(label, `ID set mismatch; missing ${missing.length}: ${missing.slice(0, 12).map(format).join(', ') || 'none'}; extra ${extra.length}: ${extra.slice(0, 12).map(format).join(', ') || 'none'}`);
  }
}

compareIdSets('rc-index.json', bankQuestions.keys(), indexQuestionOwners.keys());
compareIdSets('rc-question-index.json', bankQuestions.keys(), (searchIndex.questions ?? []).map((question) => Number(question.questionId)));

const searchIds = new Set();
const searchAddresses = new Map();
for (const question of searchIndex.questions ?? []) {
  const id = Number(question.questionId);
  const row = {
    pt: Number(question.preptest), section: Number(question.section),
    setNumber: Number(question.setNumber), position: Number(question.position),
  };
  const key = address(row);
  if (searchIds.has(id)) recordError('rc-question-index.json', `duplicate questionId ${id} at ${key}`);
  searchIds.add(id);
  if (searchAddresses.has(key)) recordError('rc-question-index.json', `duplicate address ${key}`);
  searchAddresses.set(key, id);
  const expected = bankQuestions.get(id);
  if (expected && (address(expected) !== key || expected.id !== Number(question.passageId))) {
    recordError('rc-question-index.json', `question ${id} address/owner mismatch; expected passage ${expected.id} at ${address(expected)}, found passage ${Number(question.passageId)} at ${key}`);
  }
  if (expected) {
    for (const field of ['questionType', 'questionTypeFamily', 'difficulty', 'prompt']) {
      if ((question[field] ?? null) !== expected[field]) recordError('rc-question-index.json', `question ${id} has stale ${field} at ${key}`);
    }
    if (JSON.stringify(question.features ?? []) !== JSON.stringify(expected.features)) {
      recordError('rc-question-index.json', `question ${id} has stale features at ${key}`);
    }
  }
}

const outputAddressIds = new Map();
const outputPassages = new Set();
for (const test of addressIndex.tests ?? []) {
  for (const section of test.sections ?? []) {
    for (const passage of section.rc ?? []) {
      const row = {
        pt: Number(test.pt), section: Number(section.section), setNumber: Number(passage.position),
      };
      const key = passageAddress(row);
      const expectedPassageId = bankAddresses.get(key);
      if (outputPassages.has(key)) recordError('finder-address-index.json', `duplicate passage address ${key}`);
      outputPassages.add(key);
      if (expectedPassageId === undefined) recordError('finder-address-index.json', `unexpected passage ${key}`);
      else {
        const expectedPassage = bankPassages.get(expectedPassageId);
        if (expectedPassage.id !== Number(passage.id) || expectedPassage.title !== (passage.title ?? null)) {
          recordError('finder-address-index.json', `stale passage metadata at ${key}`);
        }
      }
      for (const question of passage.questions ?? []) {
        const questionRow = { ...row, position: Number(question.number) };
        const questionKey = address(questionRow);
        const id = Number(question.id);
        if (outputAddressIds.has(id)) recordError('finder-address-index.json', `duplicate questionId ${id} at ${questionKey}`);
        else outputAddressIds.set(id, questionKey);
        const expected = bankQuestions.get(id);
        if (expected && address(expected) !== questionKey) {
          recordError('finder-address-index.json', `question ${id} address mismatch; expected ${address(expected)}, found ${questionKey}`);
        }
      }
    }
  }
}
compareIdSets('finder-address-index.json', bankQuestions.keys(), outputAddressIds.keys());
const missingPassages = [...bankPassages.values()]
  .map(passageAddress)
  .filter((key) => !outputPassages.has(key));
if (missingPassages.length) recordError('finder-address-index.json', `missing passage addresses: ${missingPassages.slice(0, 12).join(', ')}`);

if (failures.length) {
  console.error(`RC index verification failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `RC indexes verified: ${bankQuestions.size} unique bank questions, ` +
  `${searchIds.size} search records, ${outputAddressIds.size} finder addresses; ` +
  `ID, owner, and official-address sets match exactly.`,
);
