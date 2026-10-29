// Reproducible read-only baseline execution against the preserved redacted live snapshot.
const fs = require('node:fs');
const crypto = require('node:crypto');
const vm = require('node:vm');
const cp = require('node:child_process');
const ts = require('typescript');
const revision = '29cf18a8d0fb0ef0c1106f8b976f26db13b9a3c4';
const source = cp.execFileSync('git', ['show', `${revision}:src/lib/firstAnswerProgress.ts`], { encoding: 'utf8' });
const raw = fs.readFileSync('src/lib/__fixtures__/progress-live-20261028.json');
const fixture = JSON.parse(raw);
const moduleObject = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
  { module: moduleObject, exports: moduleObject.exports, require, Map, Set, Date });
const api = moduleObject.exports;
const ownerId = fixture.lrAttempts[0].user_id;
const runs = api.completedPracticeTestIds(fixture.practiceTests, ownerId);
const answers = [...api.adaptLrAttempts(fixture.lrAttempts, ownerId), ...api.adaptLrSections(fixture.lrSections, ownerId, runs), ...api.adaptRcAttempts(fixture.rcAttempts, fixture.rcSessions, ownerId, runs)];
const coverage = { includedSources: ['lr_attempts', 'lr_section_history', 'rc_attempts'], missingSources: [], excludedRows: {} };
const first = new Map();
for (const row of api.orderedDistinctAnswers(answers)) if (!first.has(row.questionKey)) first.set(row.questionKey, row.attemptId);
const output = { revision, sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), rawSha256: crypto.createHash('sha256').update(raw).digest('hex'), ownerId,
  answers, firstIdentities: [...first], progress: api.projectFirstAnswerProgress({ answers, coverage, window: 'all', asOf: fixture.asOf }) };
fs.writeFileSync('src/lib/__fixtures__/progress-live-baseline-20261028.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ revision, answerCount: answers.length, firstCount: first.size, sourceSha256: output.sourceSha256, rawSha256: output.rawSha256 }));
