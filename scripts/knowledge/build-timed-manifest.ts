import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { buildPracticeTests } from '../../src/lib/practiceTest';
import { normalizeQType, type QuestionManifest } from '../../src/lib/questionLoader';
import { buildRcSections, type RcIndexPassageWithPt } from '../../src/features/rc/lib/rcSections';

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const letters = ['A', 'B', 'C', 'D', 'E'];
const ensure = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const integer = (value: unknown) => Number.isInteger(value) && Number(value) > 0;

export function buildTimedManifest(root: string) {
  const sources: { path: string; sha256: string }[] = [];
  function source(path: string) {
    const bytes = readFileSync(resolve(root, path));
    sources.push({ path, sha256: hash(bytes) });
    return bytes.toString('utf8');
  }
  // Hash the runtime rules alongside the exact editable bank files. The
  // compiled merged LR bank is deliberately not an authority.
  for (const path of ['src/lib/practiceTest.ts', 'src/lib/questionLoader.ts', 'src/lib/dialogue.ts',
    'src/features/rc/lib/rcSections.ts', 'src/features/rc/lib/rcTypes.ts', 'scripts/knowledge/build-timed-manifest.ts']) source(path);
  const lrSections = new Map<string, { pt: number; section: number; questions: Record<string, unknown>[] }>();
  const sectionManifest: QuestionManifest['sections'] = [];
  const lrFiles = readdirSync(resolve(root, 'public/data')).filter(file => /^PT\d+-S\d+-LR\.json$/.test(file)).sort();
  ensure(lrFiles.length > 0, 'No canonical LR sections found');
  for (const file of lrFiles) {
    const match = /^PT(\d+)-S(\d+)-LR\.json$/.exec(file)!;
    const pt = Number(match[1]); const section = Number(match[2]);
    const rows = JSON.parse(source(`public/data/${file}`));
    ensure(Array.isArray(rows), `${file}: expected question array`);
    const questions: Record<string, unknown>[] = [];
    const positions = new Set<number>();
    for (const row of rows) {
      ensure(integer(row.questionNumber) && !positions.has(row.questionNumber), `${file}: invalid or duplicate question number`);
      positions.add(row.questionNumber);
      ensure(row.practiceTest === `PT${pt}` && row.sectionNumber === section, `${file}: question source identity mismatch`);
      if (row.status === 'removed') continue;
      ensure(typeof row.questionStem === 'string' && row.questionStem.trim() &&
        letters.every(letter => typeof row.answerChoices?.[letter] === 'string' && row.answerChoices[letter].trim()) &&
        letters.includes(row.correctAnswer), `${file}: unanswerable question ${row.questionNumber}`);
      const level = row.questionDifficulty || row.Question_Difficulty || 3;
      ensure(integer(level) && level <= 5, `${file}: invalid difficulty`);
      questions.push({ qid: `PT${pt}-S${section}-Q${row.questionNumber}`, qnum: row.questionNumber,
        qtype: normalizeQType(row.questionType || '', row.questionStem), level,
        contentSha256: hash(canonicalJson({ stimulus: row.stimulus ?? '', stem: row.questionStem, choices: row.answerChoices })) });
    }
    questions.sort((a, b) => Number(a.qnum) - Number(b.qnum));
    lrSections.set(`${pt}:${section}`, { pt, section, questions });
    sectionManifest.push({ pt, section, count: questions.length, filename: file });
  }

  const rcIndex = JSON.parse(source('public/data/rc/rc-index.json'));
  const rcFiles = new Map<number, Map<number, Record<string, unknown>>>();
  const passageIds = new Set<number>(); const questionIds = new Set<number>();
  const indexPassages: RcIndexPassageWithPt[] = [];
  for (const test of rcIndex.preptests) {
    ensure(integer(test.preptest) && !rcFiles.has(test.preptest), 'Invalid or duplicate RC PrepTest identity');
    const file = JSON.parse(source(`public/data/rc/RC-PT${test.preptest}.json`));
    ensure(file.preptest === test.preptest && Array.isArray(file.passages), 'RC file identity mismatch');
    const passages = new Map<number, Record<string, unknown>>();
    for (const passage of file.passages) {
      ensure(integer(passage.passageId) && !passageIds.has(passage.passageId) && passage.preptest === test.preptest, 'Invalid or duplicate RC passage identity');
      passageIds.add(passage.passageId);
      ensure(integer(passage.section) && integer(passage.setNumber) && passage.setNumber <= 4 &&
        typeof passage.text === 'string' && passage.text.trim() && Array.isArray(passage.questions), 'Invalid RC passage content');
      const positions = new Set<number>();
      const questions = [...passage.questions].sort((a, b) => a.position - b.position).map(question => {
        ensure(integer(question.questionId) && !questionIds.has(question.questionId) && integer(question.position) &&
          !positions.has(question.position), 'Invalid or duplicate RC question identity');
        questionIds.add(question.questionId); positions.add(question.position);
        ensure(typeof question.prompt === 'string' && question.prompt.trim() && letters.includes(question.correctAnswer) &&
          Array.isArray(question.choices) && question.choices.length === 5 &&
          letters.every(letter => question.choices.filter(choice => choice.letter === letter && typeof choice.text === 'string' && choice.text.trim()).length === 1), 'Unanswerable RC question');
        return { qid: String(question.questionId), questionId: question.questionId, passageId: passage.passageId,
          qnum: question.position, contentSha256: hash(canonicalJson({ text: passage.text, prompt: question.prompt,
            choices: question.choices.map(choice => ({ letter: choice.letter, text: choice.text })).sort((a, b) => a.letter.localeCompare(b.letter)) })) };
      });
      passages.set(passage.passageId, { passageId: passage.passageId, section: passage.section, setNumber: passage.setNumber,
        contentSha256: hash(passage.text), questions });
    }
    ensure(test.passages.length === passages.size, 'RC index/file passage membership mismatch');
    for (const indexed of test.passages) {
      const full = passages.get(indexed.passageId);
      ensure(full && full.section === indexed.section && full.setNumber === indexed.setNumber, 'RC index/source attribution mismatch');
      const questions = full.questions as { questionId: number }[];
      ensure(indexed.questionCount === questions.length && canonicalJson(indexed.questionIds) === canonicalJson(questions.map(question => question.questionId)), 'RC index/source question roster mismatch');
      indexPassages.push({ ...indexed, preptest: test.preptest });
    }
    rcFiles.set(test.preptest, passages);
  }
  const blueprints = buildPracticeTests({ sections: sectionManifest } as QuestionManifest, buildRcSections(indexPassages)).map(test => {
    const legs = test.legs.map(leg => {
      let questions: Record<string, unknown>[];
      let passages: Record<string, unknown>[] | undefined;
      if (leg.kind === 'lr') questions = lrSections.get(`${test.pt}:${leg.section}`)!.questions;
      else {
        passages = leg.passageIds!.map(id => rcFiles.get(test.pt)!.get(id)!);
        ensure(new Set(passages.map(p => p.setNumber)).size === 4, 'Duplicate RC passage positions');
        questions = passages.flatMap(p => p.questions as Record<string, unknown>[]);
      }
      ensure(questions.length === leg.questionCount && new Set(questions.map(q => q.qid)).size === questions.length, 'Frozen leg queue/count mismatch');
      return { ...leg, qids: questions.map(question => question.qid), questions,
        ...(passages ? { passages: passages.map(({ questions: _questions, ...metadata }) => metadata) } : {}) };
    });
    return { ...test, breakAfterLeg: 2, breakSeconds: 600, legs };
  });
  ensure(blueprints.length > 0, 'No eligible PrepTests');
  sources.sort((a, b) => a.path.localeCompare(b.path));
  for (const source of sources) ensure(hash(readFileSync(resolve(root, source.path))) === source.sha256,
    `Canonical source changed during generation: ${source.path}`);
  const body = { schemaVersion: 1, provenance: sources, blueprints };
  return { ...body, manifestSha256: hash(canonicalJson(body)) };
}

export function manifestSeedSql(manifest: ReturnType<typeof buildTimedManifest>): string {
  // Values are only fixed JSON/hash/numbers from validated canonical content.
  // Each seed verifies immutable conflicts instead of replacing old versions.
  return '-- Generated server-owned timed content. Inactive until reviewed privileged installation.\nBEGIN;\n' +
    manifest.blueprints.map(blueprint => {
      const literal = canonicalJson(blueprint).split("'").join("''");
      return `DO $manifest$ DECLARE expected jsonb := '${literal}'::jsonb; BEGIN\n` +
        `INSERT INTO public.timed_content_manifests_v1(manifest_sha256,pt,blueprint) VALUES ('${manifest.manifestSha256}',${blueprint.pt},expected) ON CONFLICT (manifest_sha256,pt) DO NOTHING;\n` +
        `IF NOT EXISTS (SELECT 1 FROM public.timed_content_manifests_v1 WHERE manifest_sha256='${manifest.manifestSha256}' AND pt=${blueprint.pt} AND blueprint=expected) THEN RAISE EXCEPTION 'Immutable timed manifest conflict'; END IF; END $manifest$;`;
    }).join('\n') + '\nCOMMIT;\n';
}

export function manifestOutputs(root: string) {
  const manifest = buildTimedManifest(root);
  return { manifest, json: canonicalJson(manifest) + '\n', sql: manifestSeedSql(manifest) };
}

if (process.argv.some(argument => /(^|[\\/])build-timed-manifest\.ts$/.test(argument))) {
  const root = process.cwd();
  const { manifest, json, sql } = manifestOutputs(root);
  const directory = resolve(root, 'docs/implementation-plans/artifacts');
  const outputs = [['timed-content-manifest-v1.generated.json', json], ['timed-content-manifest-v1.generated.sql', sql]];
  if (process.argv.includes('--check')) {
    for (const [name, content] of outputs) ensure(existsSync(resolve(directory, name)) && readFileSync(resolve(directory, name), 'utf8') === content, `Stale timed manifest: ${name}`);
  } else {
    mkdirSync(directory, { recursive: true });
    for (const [name, content] of outputs) {
      const path = resolve(directory, name);
      const before = existsSync(path) ? readFileSync(path, 'utf8') : null;
      ensure((existsSync(path) ? readFileSync(path, 'utf8') : null) === before, `Concurrent generator change: ${relative(root, path)}`);
      writeFileSync(path, content);
    }
  }
  console.log(JSON.stringify({ manifestSha256: manifest.manifestSha256, prepTests: manifest.blueprints.length,
    legs: manifest.blueprints.reduce((count, test) => count + test.legs.length, 0), sources: manifest.provenance.length, check: process.argv.includes('--check') }));
}
