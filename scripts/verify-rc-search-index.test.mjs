import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const verifier = join(repoRoot, 'scripts', 'verify-rc-search-index.mjs');

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'rc-index-check-'));
  const rcDir = join(root, 'public', 'data', 'rc');
  mkdirSync(rcDir, { recursive: true });
  writeFileSync(join(rcDir, 'rc-index.json'), JSON.stringify({
    preptests: [{ preptest: 1, passages: [
      { passageId: 10, section: 2, setNumber: 1, title: 'Passage A', questionIds: [100] },
      { passageId: 11, section: 2, setNumber: 2, title: 'Passage B', questionIds: [101] },
    ] }],
  }));
  writeFileSync(join(rcDir, 'RC-PT1.json'), JSON.stringify({
    passages: [
      { passageId: 10, preptest: 1, section: 2, setNumber: 1, title: 'Passage A', questions: [{ questionId: 100, position: 1, features: [] }] },
      { passageId: 11, preptest: 1, section: 2, setNumber: 2, title: 'Passage B', questions: [{ questionId: 101, position: 1, features: [] }] },
    ],
  }));
  writeFileSync(join(rcDir, 'rc-question-index.json'), JSON.stringify({
    questions: [
      { questionId: 100, passageId: 10, preptest: 1, section: 2, setNumber: 1, position: 1, features: [] },
      { questionId: 101, passageId: 11, preptest: 1, section: 2, setNumber: 2, position: 1, features: [] },
    ],
  }));
  writeFileSync(join(root, 'public', 'data', 'finder-address-index.json'), JSON.stringify({
    tests: [{ pt: 1, sections: [{ section: 2, rc: [
      { id: 10, position: 1, title: 'Passage A', questions: [{ id: 100, number: 1 }] },
      { id: 11, position: 2, title: 'Passage B', questions: [{ id: 101, number: 1 }] },
    ] }] }],
  }));
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [verifier], {
    encoding: 'utf8',
    env: { ...process.env, RC_INDEX_ROOT: root },
  });
}

test('accepts complete, unique bank/search/address outputs', () => {
  const root = fixture();
  try {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /2 unique bank questions, 2 search records, 2 finder addresses/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('current bank indexes PT140S4 Q3 and Q17 at their official addresses', () => {
  const result = run(repoRoot);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /2150 unique bank questions, 2150 search records, 2150 finder addresses/);
  const addressIndex = JSON.parse(readFileSync(join(repoRoot, 'public', 'data', 'finder-address-index.json'), 'utf8'));
  const section = addressIndex.tests.find((testRow) => testRow.pt === 140)?.sections.find((sectionRow) => sectionRow.section === 4);
  const numbers = section?.rc.flatMap((passage) => passage.questions.map((question) => question.number)) ?? [];
  assert.equal(numbers.length, 27);
  assert.ok(numbers.includes(3));
  assert.ok(numbers.includes(17));
});

test('rejects stale outputs with actionable official addresses', () => {
  const root = fixture();
  try {
    writeFileSync(join(root, 'public', 'data', 'rc', 'rc-question-index.json'), JSON.stringify({ questions: [] }));
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /missing 2: 100 \(PT1S2P1Q1\), 101 \(PT1S2P2Q1\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects duplicate IDs and duplicate official addresses', () => {
  const root = fixture();
  try {
    const searchPath = join(root, 'public', 'data', 'rc', 'rc-question-index.json');
    writeFileSync(searchPath, JSON.stringify({ questions: [
      { questionId: 100, passageId: 10, preptest: 1, section: 2, setNumber: 1, position: 1 },
      { questionId: 100, passageId: 10, preptest: 1, section: 2, setNumber: 1, position: 1 },
    ] }));
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /duplicate questionId 100 at PT1S2P1Q1/);
    assert.match(result.stderr, /duplicate address PT1S2P1Q1/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects duplicate finder passage addresses', () => {
  const root = fixture();
  try {
    const addressPath = join(root, 'public', 'data', 'finder-address-index.json');
    const index = JSON.parse(readFileSync(addressPath, 'utf8'));
    index.tests[0].sections[0].rc.push({ ...index.tests[0].sections[0].rc[0] });
    writeFileSync(addressPath, JSON.stringify(index));
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /duplicate passage address PT1S2P1/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects rc-index section and set-number disagreements with the passage bank', () => {
  for (const [field, value, expected] of [
    ['section', 3, /passage 10 has section=3; bank has 2 at PT1S2P1/],
    ['setNumber', 3, /passage 11 has setNumber=3; bank has 2 at PT1S2P2/],
  ]) {
    const root = fixture();
    try {
      const indexPath = join(root, 'public', 'data', 'rc', 'rc-index.json');
      const index = JSON.parse(readFileSync(indexPath, 'utf8'));
      index.preptests[0].passages[field === 'section' ? 0 : 1][field] = value;
      writeFileSync(indexPath, JSON.stringify(index));
      const result = run(root);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, expected);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test('rejects rc-index question IDs assigned to the wrong passage', () => {
  const root = fixture();
  try {
    const indexPath = join(root, 'public', 'data', 'rc', 'rc-index.json');
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    index.preptests[0].passages[0].questionIds = [101];
    index.preptests[0].passages[1].questionIds = [100];
    writeFileSync(indexPath, JSON.stringify(index));
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /questionId 101 is assigned to passage 10; bank assigns it to passage 11 at PT1S2P2/);
    assert.match(result.stderr, /questionId 100 is assigned to passage 11; bank assigns it to passage 10 at PT1S2P1/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
