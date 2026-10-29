import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { buildTimedManifest, canonicalJson, manifestOutputs } from '../../scripts/knowledge/build-timed-manifest';
import { buildPracticeTests } from './practiceTest';
import { buildRcSections, type RcIndexPassageWithPt } from '@/features/rc/lib/rcSections';
import type { QuestionManifest } from './questionLoader';

const ROOT = process.cwd();
const manifest = buildTimedManifest(ROOT);
const json = (path: string) => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'));

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'lsatu-timed-manifest-'));
  const paths = ['src/lib/practiceTest.ts', 'src/lib/questionLoader.ts', 'src/lib/dialogue.ts',
    'src/features/rc/lib/rcSections.ts', 'src/features/rc/lib/rcTypes.ts', 'scripts/knowledge/build-timed-manifest.ts',
    'public/data/PT101-S2-LR.json', 'public/data/PT101-S3-LR.json'];
  for (const path of paths) {
    mkdirSync(resolve(root, path, '..'), { recursive: true });
    writeFileSync(resolve(root, path), readFileSync(resolve(ROOT, path)));
  }
  const test = json('public/data/rc/rc-index.json').preptests.find(test => test.preptest === 101);
  test.passages = test.passages.filter(passage => passage.section === 1);
  const full = json('public/data/rc/RC-PT101.json');
  full.passages = full.passages.filter(passage => passage.section === 1);
  mkdirSync(resolve(root, 'public/data/rc'), { recursive: true });
  writeFileSync(resolve(root, 'public/data/rc/rc-index.json'), JSON.stringify({ preptests: [test] }));
  writeFileSync(resolve(root, 'public/data/rc/RC-PT101.json'), JSON.stringify(full));
  return root;
}

interface FixtureQuestion { questionNumber: number; sectionNumber: number; stimulus: string; questionId: number; choices: { letter: string; text: string }[] }
interface FixturePassage { preptest: number; questions: FixtureQuestion[]; questionIds: number[] }
interface FixtureFile { passages: FixturePassage[]; preptests: { passages: FixturePassage[] }[] }

function edit<T>(root: string, path: string, change: (value: T) => void) {
  const absolute = resolve(root, path);
  const value = JSON.parse(readFileSync(absolute, 'utf8'));
  change(value);
  writeFileSync(absolute, JSON.stringify(value));
}

describe('server-owned frozen timed content', () => {
  it('uses the runtime offer rules and exact rendered LR counts', () => {
    const sections = readdirSync(resolve(ROOT, 'public/data')).flatMap(filename => {
      const match = /^PT(\d+)-S(\d+)-LR\.json$/.exec(filename);
      if (!match) return [];
      const count = json(`public/data/${filename}`).filter(row => row.status !== 'removed').length;
      return [{ pt: Number(match[1]), section: Number(match[2]), count, filename }];
    });
    const passages = json('public/data/rc/rc-index.json').preptests.flatMap(test => test.passages.map(p => ({ ...p, preptest: test.preptest }))) as RcIndexPassageWithPt[];
    const runtime = buildPracticeTests({ sections } as QuestionManifest, buildRcSections(passages));
    expect(manifest.blueprints.map(({ breakAfterLeg: _breakAfterLeg, breakSeconds: _breakSeconds, legs, ...test }) => ({ ...test,
      legs: legs.map(({ qids: _qids, questions: _questions, passages: _passages, ...leg }) => leg) }))).toEqual(runtime);
    expect(manifest.blueprints).toHaveLength(59);
  });
  it('freezes PT118 scored order and removed numbering exactly', () => {
    const test = manifest.blueprints.find(test => test.pt === 118)!;
    expect(test.legs.map(leg => [leg.kind, leg.section, leg.questionCount])).toEqual([['lr', 1, 25], ['rc', 2, 27], ['lr', 4, 25]]);
    expect(test.legs[0].qids).not.toContain('PT118-S1-Q5');
    expect(test.legs[0].qids).toContain('PT118-S1-Q26');
    expect(test.breakAfterLeg).toBe(2); expect(test.breakSeconds).toBe(600);
  });
  it('pins exact passage ownership and question order rather than just counts', () => {
    const index = json('public/data/rc/rc-index.json');
    for (const test of manifest.blueprints) for (const leg of test.legs.filter(leg => leg.kind === 'rc')) {
      const indexed = index.preptests.find(pt => pt.preptest === test.pt);
      const expected = leg.passageIds!.flatMap(id => indexed.passages.find(p => p.passageId === id).questionIds);
      expect(leg.qids).toEqual(expected.map(String));
      for (const question of leg.questions) expect(leg.passageIds).toContain(question.passageId);
    }
  });
  it('reproduces checked-in artifacts byte for byte, with no question or answer payload', () => {
    const outputs = manifestOutputs(ROOT);
    expect(outputs.manifest.manifestSha256).toBe(manifest.manifestSha256);
    expect(readFileSync(resolve(ROOT, 'docs/implementation-plans/artifacts/timed-content-manifest-v1.generated.json'), 'utf8')).toBe(outputs.json);
    expect(readFileSync(resolve(ROOT, 'docs/implementation-plans/artifacts/timed-content-manifest-v1.generated.sql'), 'utf8')).toBe(outputs.sql);
    expect(outputs.json).not.toMatch(/"(stimulus|prompt|correctAnswer|answerChoices|explanationBlocks|text)":/);
    expect(outputs.sql).not.toMatch(/CREATE TABLE|GRANT|UPDATE public|DELETE FROM|DROP /);
    expect(outputs.sql).toContain('Immutable timed manifest conflict');
  });
  it('changes content identity when an actual question changes', () => {
    const root = fixture();
    const before = buildTimedManifest(root);
    edit<FixtureQuestion[]>(root, 'public/data/PT101-S2-LR.json', rows => { rows[0].stimulus += ' A changed claim.'; });
    const after = buildTimedManifest(root);
    expect(after.manifestSha256).not.toBe(before.manifestSha256);
    expect(after.blueprints[0].legs[1].questions[0].contentSha256).not.toBe(before.blueprints[0].legs[1].questions[0].contentSha256);
  });
  it.each(['lrDuplicate', 'lrWrongSource', 'rcDuplicate', 'rcWrongPassage', 'rcIndexMismatch', 'rcMissingChoice'])('rejects invalid canonical source rather than seeding it (%s)', defect => {
    const root = fixture();
    if (defect === 'lrDuplicate') edit<FixtureQuestion[]>(root, 'public/data/PT101-S2-LR.json', rows => { rows[1].questionNumber = rows[0].questionNumber; });
    if (defect === 'lrWrongSource') edit<FixtureQuestion[]>(root, 'public/data/PT101-S2-LR.json', rows => { rows[0].sectionNumber = 3; });
    if (defect === 'rcDuplicate') edit<FixtureFile>(root, 'public/data/rc/RC-PT101.json', file => { file.passages[1].questions[0].questionId = file.passages[0].questions[0].questionId; });
    if (defect === 'rcWrongPassage') edit<FixtureFile>(root, 'public/data/rc/RC-PT101.json', file => { file.passages[0].preptest = 102; });
    if (defect === 'rcIndexMismatch') edit<FixtureFile>(root, 'public/data/rc/rc-index.json', file => { file.preptests[0].passages[0].questionIds[0] = 999999; });
    if (defect === 'rcMissingChoice') edit<FixtureFile>(root, 'public/data/rc/RC-PT101.json', file => { file.passages[0].questions[0].choices.pop(); });
    expect(() => buildTimedManifest(root)).toThrow();
  });
  it('serializes object keys canonically without rearranging a frozen queue', () => {
    expect(canonicalJson({ b: [2, 1], a: { d: 1, c: 2 } })).toBe('{"a":{"c":2,"d":1},"b":[2,1]}');
  });
});
