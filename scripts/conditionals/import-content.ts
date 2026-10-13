import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { foundationUnits } from '../../src/bootcamps/conditionals/content/foundations.source';
import { applicationUnits } from '../../src/bootcamps/conditionals/content/applications.source';
import { validateConditionalContent } from '../../src/bootcamps/conditionals/content/validate';

const units = [...foundationUnits, ...applicationUnits];
const errors = validateConditionalContent(units);
if (errors.length) throw new Error(`Conditional content validation failed:\n${errors.join('\n')}`);
const directory = resolve('src/bootcamps/conditionals/data');
const output = JSON.stringify(units, null, 2) + '\n';
const destination = resolve(directory, 'curriculum.generated.json');
if (process.argv.includes('--check')) {
  if (readFileSync(destination, 'utf8').replace(/\r\n/g, '\n') !== output) {
    throw new Error('Conditional curriculum bundle is stale. Run npm run content:conditionals.');
  }
} else {
  mkdirSync(directory, { recursive: true });
  writeFileSync(destination, output);
}
process.stdout.write(`Generated ${units.length} lessons and ${units.reduce((count, unit) => count + Object.values(unit.drills).flat().length, 0)} practice questions.\n`);
