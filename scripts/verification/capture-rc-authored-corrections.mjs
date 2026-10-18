import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { captureAuthoredCorrections } from '../rc-authored-corrections.mjs';

const destination = 'scripts/rc-authored-corrections.json';
const previous = JSON.parse(readFileSync(destination, 'utf8'));
const baselineCommit = process.argv[2] ?? previous.baselineCommit;
if (!/^[a-f0-9]{40}$/.test(baselineCommit ?? '')) throw new Error('An explicit full baseline commit SHA is required.');
const files = readdirSync('public/data/rc').filter(file => /^RC-PT\d+\.json$/.test(file)).sort();
const before = files.map(file => JSON.parse(execFileSync('git', ['show', `${baselineCommit}:public/data/rc/${file}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })));
const after = files.map(file => JSON.parse(readFileSync(`public/data/rc/${file}`, 'utf8')));
// This validates every changed field before replacing the overlay. It does not
// rewrite bank content, approve prose, or infer a new baseline from moving main.
const captured = captureAuthoredCorrections(before, after);
writeFileSync(destination, JSON.stringify({ ...captured, baselineCommit }, null, 2) + '\n');
console.log(JSON.stringify({ baselineCommit, corrections: captured.corrections.length, destination }));
