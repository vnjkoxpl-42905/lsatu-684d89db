import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const ledgers = ['101-120', '121-140', '141-159'].map(range => `docs/verification/rc-t09-systematic-${range}.md`);
const banks = readdirSync('public/data/rc').filter(file => /^RC-PT\d+\.json$/.test(file))
  .map(file => JSON.parse(readFileSync(`public/data/rc/${file}`, 'utf8'))).sort((a, b) => a.preptest - b.preptest);
const completed = new Map();
const errors = [];
for (const ledger of ledgers) for (const line of readFileSync(ledger, 'utf8').split('\n')) {
  if (!/^\|\s*\d{3}\s*\|/.test(line)) continue;
  const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
  const pt = Number(cells[0]);
  const ids = cells[1].split(',').map(value => Number(value.trim())).sort((a, b) => a - b);
  const questions = Number(cells[2]);
  const bank = banks.find(item => item.preptest === pt);
  if (!bank || completed.has(pt)) { errors.push(`${ledger}: unknown or duplicate PT${pt}`); continue; }
  const expectedIds = bank.passages.map(passage => passage.passageId).sort((a, b) => a - b);
  const expectedQuestions = bank.passages.reduce((sum, passage) => sum + passage.questions.length, 0);
  if (JSON.stringify(ids) !== JSON.stringify(expectedIds) || questions !== expectedQuestions) {
    errors.push(`${ledger}: PT${pt} declared IDs/count do not cover its complete bank`); continue;
  }
  completed.set(pt, { pt, passages: ids.length, questions, ledger });
}
const missing = banks.filter(bank => !completed.has(bank.preptest)).map(bank => bank.preptest);
const values = [...completed.values()].sort((a, b) => a.pt - b.pt);
const totals = values.reduce((sum, item) => ({ passages: sum.passages + item.passages, questions: sum.questions + item.questions }), { passages: 0, questions: 0 });
const report = ['# Recorded systematic RC review coverage', '',
  'This validates reviewer ledger addresses/counts against the bank. It cannot prove reasoning quality or independently establish that reading occurred. Completed rows are reviewer attestations; unlisted PrepTests remain open.', '',
  `Completed PrepTests: ${values.length}/${banks.length}; passages: ${totals.passages}/320; questions: ${totals.questions}/2150.`, '',
  `Open PrepTests: ${missing.join(', ') || 'none'}.`, '', `Ledger consistency errors: ${errors.length}.`, '',
  ...errors.map(error => `- ${error}`), '', '| PT | Passages | Questions | Ledger |', '|---|---:|---:|---|',
  ...values.map(item => `| ${item.pt} | ${item.passages} | ${item.questions} | ${item.ledger.split('/').at(-1)} |`), ''].join('\n');
writeFileSync('docs/verification/rc-systematic-review-coverage.md', report);
console.log(JSON.stringify({ completed: values.length, ...totals, missing, errors }));
if (errors.length) process.exitCode = 1;
