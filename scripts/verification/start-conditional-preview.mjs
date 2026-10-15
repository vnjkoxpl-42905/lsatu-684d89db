import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const required = [
  'src/dev/ConditionalOpeningPreview.tsx',
  'src/bootcamps/conditionals/components/OpeningActivityPractice.tsx',
  'node_modules/typescript/bin/tsc',
  'node_modules/vite/bin/vite.js',
];
let activeChild;
let stopping = false;

function runNode(entry, args) {
  return new Promise((resolveExit, reject) => {
    activeChild = spawn(process.execPath, [resolve(root, entry), ...args], {
      cwd: root,
      stdio: 'inherit',
      shell: false,
    });
    activeChild.once('error', reject);
    activeChild.once('exit', (code, signal) => {
      activeChild = undefined;
      resolveExit(stopping ? 130 : code ?? (signal ? 1 : 0));
    });
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopping = true;
    if (activeChild) activeChild.kill(signal);
    else process.exitCode = 130;
  });
}

async function main() {
  const unknown = process.argv.slice(2).filter(arg => arg !== '--check');
  if (unknown.length) throw new Error(`Unknown arguments: ${unknown.join(' ')}`);
  const missing = required.filter(file => !existsSync(resolve(root, file)));
  if (missing.length) throw new Error(`Preview cannot start. Missing files:\n${missing.join('\n')}`);

  console.log('Checking the complete app before starting Conditional Bootcamp...');
  const checked = await runNode('node_modules/typescript/bin/tsc', ['--noEmit', '-p', 'tsconfig.app.json']);
  if (checked !== 0) {
    console.error('Preview was not started because the app typecheck failed or was interrupted.');
    process.exitCode = checked;
    return;
  }
  if (stopping) return;
  if (process.argv.includes('--check')) {
    console.log('Conditional preview preflight passed. No server started.');
    return;
  }

  console.log('Local lesson harness: http://127.0.0.1:8097/dev/conditional-opening-preview');
  console.log('Proper local LSAT U route: http://127.0.0.1:8097/bootcamp/conditionals/lessons');
  console.log('The harness has no account persistence. The proper route requires sign-in and bootcamp access.');
  console.log('Starting on port 8097 only; an occupied port fails instead of switching URLs.');
  process.exitCode = await runNode('node_modules/vite/bin/vite.js', ['--host', '127.0.0.1', '--port', '8097', '--strictPort']);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
