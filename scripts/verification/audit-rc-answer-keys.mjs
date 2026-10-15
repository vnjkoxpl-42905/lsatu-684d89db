// Read-only comparison with published LSAT Lab credits; never changes the bank.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { questionIdentity } from '../rc-answer-keys.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
export function publishedCredit(html) {
  const visible = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  const dom = new JSDOM(visible);
  try {
    const keys = [...new Set([...dom.window.document.querySelectorAll('li')].filter(li =>
      [...li.querySelectorAll('span')].some(span => span.textContent.trim() === 'Correct'))
      .map(li => [...li.querySelectorAll('span[aria-hidden="true"]')].find(span => /^[A-E]$/.test(span.textContent.trim()))?.textContent.trim())
      .filter(Boolean))];
    const prose = [...new Set([...visible.matchAll(/Answer ([A-E]) is correct\./g)].map(m => m[1]))];
    if (keys.length !== 1 || prose.some(key => key !== keys[0])) throw new Error(`Expected one consistent visible credited answer, labels=${keys.join(',') || 'none'} prose=${prose.join(',') || 'none'}`);
    return keys[0];
  } finally { dom.window.close(); }
}
export function bankRows(dir = resolve(root, 'public/data/rc')) {
  return readdirSync(dir).filter(f => /^RC-PT\d+\.json$/.test(f)).flatMap(file => {
    const bank = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
    return bank.passages.flatMap(p => p.questions.map(q => ({ questionId: q.questionId, preptest: bank.preptest,
      section: p.section, passage: p.setNumber, position: q.position, bankCredit: q.correctAnswer,
      identitySha256: questionIdentity(bank.preptest, p, q),
      questionSha256: createHash('sha256').update(JSON.stringify(q)).digest('hex') })));
  });
}
async function run() {
  const recovered = new Set(readFileSync(resolve(root, 'scripts/rc-source/recovered/questions.ndjson'), 'utf8')
    .trim().split(/\r?\n/).map(line => JSON.parse(line).question_id));
  const output = process.argv[2];
  if (!output) throw new Error('Provide an output JSON path. This audit never mutates bank data.');
  const retry = process.argv.includes('--retry-unverified');
  const report = retry ? JSON.parse(readFileSync(output, 'utf8')) : { observedAt: new Date().toISOString(), authority: 'Published LSAT Lab credited answers; not an LSAC-issued key certification', records: [] };
  const retryIds = new Set(report.records.filter(r => r.error).map(r => r.questionId));
  const all = bankRows();
  const rows = all.filter(row => !retry || retryIds.has(row.questionId)).sort((a, b) => Number(recovered.has(b.questionId)) - Number(recovered.has(a.questionId)));
  if (retry) report.records = report.records.filter(row => !retryIds.has(row.questionId));
  let offset = 0;
  let stopped = false;
  const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  const worker = async () => {
    while (!stopped && offset < rows.length) {
      const row = rows[offset++];
      const address = `PT${row.preptest}-S${row.section}-P${row.passage}-Q${row.position}`;
      const url = `https://www.lsatlab.com/lsat-explanations/${address}/`;
      const record = { ...row, recovered: recovered.has(row.questionId), address, sourceUrl: url };
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        record.httpStatus = response.status;
        if ([401, 403, 429].includes(response.status)) { stopped = true; throw new Error(`Access/rate limit ${response.status}; audit stopped`); }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        if (!new URL(response.url).pathname.startsWith(`/lsat-explanations/${address}/`)) throw new Error('Official-address redirect mismatch');
        record.sourceUrl = response.url;
        record.sourceSha256 = createHash('sha256').update(html).digest('hex');
        record.publishedCredit = publishedCredit(html);
        record.matches = record.publishedCredit === row.bankCredit;
      } catch (error) { record.error = String(error.message); }
      report.records.push(record);
      if (report.records.length % 50 === 0) { save(); console.log(`${report.records.length}/${all.length} checked`); }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  report.completedAt = new Date().toISOString();
  report.totalBankQuestions = all.length;
  report.summary = { checked: report.records.length, recovered: report.records.filter(r => r.recovered).length,
    disagreements: report.records.filter(r => r.matches === false).length, unverified: report.records.filter(r => r.error).length, stopped };
  report.records.sort((a, b) => a.questionId - b.questionId);
  save();
  console.log(JSON.stringify(report.summary));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await run();
