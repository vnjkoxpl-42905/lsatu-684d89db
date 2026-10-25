import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { applySourceCorrection, sourceCorrection } from '../rc-source-correction.mjs';
import { captureAuthoredCorrections } from '../rc-authored-corrections.mjs';

const destination = 'scripts/rc-authored-corrections.json';
const previous = JSON.parse(readFileSync(destination, 'utf8'));
const baselineCommit = process.argv[2] ?? previous.baselineCommit;
if (!/^[a-f0-9]{40}$/.test(baselineCommit ?? '')) throw new Error('An explicit full baseline commit SHA is required.');
const files = readdirSync('public/data/rc').filter(file => /^RC-PT\d+\.json$/.test(file)).sort();
const baselineFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', baselineCommit, 'public/data/rc'], { encoding: 'utf8' })
  .split(/\r?\n/).filter(file => /^public\/data\/rc\/RC-PT\d+\.json$/.test(file))
  .map(file => file.slice('public/data/rc/'.length)).sort();
if (JSON.stringify(files) !== JSON.stringify(baselineFiles)) throw new Error('RC bank file membership differs from the pinned baseline; overlay was not written.');
const before = files.map(file => JSON.parse(execFileSync('git', ['show', `${baselineCommit}:public/data/rc/${file}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })));
const after = files.map(file => JSON.parse(readFileSync(`public/data/rc/${file}`, 'utf8')));
// This validates every changed field before replacing the overlay. It does not
// rewrite bank content, approve prose, or infer a new baseline from moving main.
if (baselineCommit !== sourceCorrection.baselineCommit) throw new Error('Official source correction requires its pinned baseline.');
// Only a deliberately applied, exact reviewed candidate may be normalized.
const sourceBank = after.find(bank => bank.preptest === 156);
if (sourceBank?.passages?.[4]?.questions?.[1]?.prompt === sourceCorrection.after) {
  applySourceCorrection(before);
  applySourceCorrection(after);
}
const captured = captureAuthoredCorrections(before, after);
writeFileSync(destination, JSON.stringify({ ...captured, baselineCommit }, null, 2) + '\n');
console.log(JSON.stringify({ baselineCommit, corrections: captured.corrections.length, destination }));
