#!/usr/bin/env node
/**
 * Verifies that the generated RC search and finder-address indexes exactly
 * represent the current RC question bank and reject duplicate identities.
 * Run after the RC search and finder address generators, or on its own to
 * detect stale checked-in artifacts.
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
const metadataByPassage = new Map();
const expectedById = new Map();
const expectedByAddress = new Map();
const expectedPassages = new Map();
const address = (row) => `PT${row.pt}S${row.section}P${row.setNumber}Q${row.position}`;
const recordError = (label, details) => failures.push(`${label}: ${details}`);

for (const test of rcIndex.preptests ?? []) {
  for (const passage of test.passages ?? []) {
    const id = Number(passage.passageId);
    if (metadataByPassage.has(id)) {
      recordError('rc-index.json', `duplicate passage ${id}`);
      continue;
    }
    metadataByPassage.set(id, {
      pt: Number(test.preptest),
      section: Number(passage.section),
      setNumber: Number(passage.setNumber),
      questionIds: passage.questionIds ?? [],
      title: passage.title ?? null,
    });
    const passageKey = `PT${Number(test.preptest)}S${Number(passage.section)}P${Number(passage.setNumber)}`;
    if (expectedPassages.has(passageKey)) recordError('rc-index.json', `duplicate official passage address ${passageKey}`);
    else expectedPassages.set(passageKey, { id, title: passage.title ?? null, questionIds: passage.questionIds ?? [] });
  }
}

const bankQuestionIds = new Map();
const indexQuestionIds = new Map();
for (const [passageId, meta] of metadataByPassage) {
  for (const idValue of meta.questionIds) {
    const id = Number(idValue);
    const row = { ...meta, passageId, position: null };
    if (indexQuestionIds.has(id)) {
      recordError('rc-index.json', `duplicate questionId ${id}`);
    } else {
      indexQuestionIds.set(id, row);
    }
  }
}

const sectionFiles = readdirSync(rcDir)
  .filter((file) => /^RC-PT\d+\.json$/i.test(file))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
for (const file of sectionFiles) {
  const data = readJson(join(rcDir, file));
  for (const passage of data.passages ?? []) {
    const passageId = Number(passage.passageId);
    const meta = metadataByPassage.get(passageId);
    if (!meta) {
      recordError(file, `passage ${passageId} is missing from rc-index.json`);
      continue;
    }
    const ptFromFile = Number(file.match(/\d+/)[0]);
    if (ptFromFile !== meta.pt) recordError(file, `passage ${passageId} belongs to PT${meta.pt}, not PT${ptFromFile}`);
    for (const question of passage.questions ?? []) {
      const id = Number(question.questionId);
      const row = {
        ...meta,
        passageId,
        position: Number(question.position),
        questionType: question.questionType ?? null,
        questionTypeFamily: question.questionTypeFamily ?? null,
        difficulty: question.difficulty ?? null,
        features: (question.features ?? []).map((feature) => feature.name),
        prompt: question.prompt ?? null,
      };
      const officialAddress = address(row);
      if (bankQuestionIds.has(id)) recordError(file, `duplicate questionId ${id} at ${officialAddress}; first at ${address(bankQuestionIds.get(id))}`);
      else bankQuestionIds.set(id, row);
      if (expectedByAddress.has(officialAddress)) recordError(file, `duplicate official address ${officialAddress}`);
      else expectedByAddress.set(officialAddress, id);
      expectedById.set(id, row);
    }
  }
}

function compareIdSets(label, observedIds) {
  const expectedIds = new Set(expectedById.keys());
  const observed = new Set(observedIds);
  const missing = [...expectedIds].filter((id) => !observed.has(id));
  const extra = [...observed].filter((id) => !expectedIds.has(id));
  if (missing.length || extra.length) {
    const format = (id) => `${id} (${expectedById.has(id) ? address(expectedById.get(id)) : 'unknown address'})`;
    recordError(label, `ID set mismatch; missing ${missing.length}: ${missing.slice(0, 12).map(format).join(', ') || 'none'}; extra ${extra.length}: ${extra.slice(0, 12).map(format).join(', ') || 'none'}`);
  }
}

compareIdSets('rc-index.json', indexQuestionIds.keys());
compareIdSets('rc-question-index.json', (searchIndex.questions ?? []).map((question) => Number(question.questionId)));

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
  const expected = expectedById.get(id);
  if (expected && (address(expected) !== key || expected.passageId !== Number(question.passageId))) {
    recordError('rc-question-index.json', `question ${id} address mismatch; expected ${address(expected)}, found ${key}`);
  }
  if (expected) {
    const fields = ['questionType', 'questionTypeFamily', 'difficulty', 'prompt'];
    for (const field of fields) {
      if ((question[field] ?? null) !== expected[field]) {
        recordError('rc-question-index.json', `question ${id} has stale ${field} at ${key}`);
      }
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
      const passageKey = `PT${Number(test.pt)}S${Number(section.section)}P${Number(passage.position)}`;
      const expectedPassage = expectedPassages.get(passageKey);
      outputPassages.add(passageKey);
      if (!expectedPassage) recordError('finder-address-index.json', `unexpected passage ${passageKey}`);
      else if (expectedPassage.id !== Number(passage.id) || expectedPassage.title !== (passage.title ?? null)) {
        recordError('finder-address-index.json', `stale passage metadata at ${passageKey}`);
      }
      for (const question of passage.questions ?? []) {
        const row = {
          pt: Number(test.pt), section: Number(section.section),
          setNumber: Number(passage.position), position: Number(question.number),
        };
        const key = address(row);
        const id = Number(question.id);
        if (outputAddressIds.has(id)) recordError('finder-address-index.json', `duplicate questionId ${id} at ${key}`);
        else outputAddressIds.set(id, key);
        if (expectedById.has(id) && address(expectedById.get(id)) !== key) {
          recordError('finder-address-index.json', `question ${id} address mismatch; expected ${address(expectedById.get(id))}, found ${key}`);
        }
      }
    }
  }
}
compareIdSets('finder-address-index.json', outputAddressIds.keys());
const missingPassages = [...expectedPassages.keys()].filter((key) => !outputPassages.has(key));
if (missingPassages.length) recordError('finder-address-index.json', `missing passage addresses: ${missingPassages.slice(0, 12).join(', ')}`);

const bankIds = new Set(bankQuestionIds.keys());
const indexedBankIds = new Set(indexQuestionIds.keys());
const bankMissing = [...bankIds].filter((id) => !indexedBankIds.has(id));
const indexExtra = [...indexedBankIds].filter((id) => !bankIds.has(id));
if (bankMissing.length || indexExtra.length) {
  const format = (id) => `${id} (${address(bankQuestionIds.get(id) ?? indexQuestionIds.get(id))})`;
  recordError('RC bank vs rc-index.json', `mismatch; missing ${bankMissing.length}: ${bankMissing.slice(0, 12).map(format).join(', ') || 'none'}; extra ${indexExtra.length}: ${indexExtra.slice(0, 12).map(format).join(', ') || 'none'}`);
}

if (failures.length) {
  console.error(`RC index verification failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `RC indexes verified: ${bankQuestionIds.size} unique bank questions, ` +
  `${searchIds.size} search records, ${outputAddressIds.size} finder addresses; ` +
  `ID and official-address sets match exactly.`,
);
