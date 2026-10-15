// Controlled browser replay of the real results component. No account or backend.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { chromium, expect } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = resolve(root, 'scripts/verification/rc-key-browser');
const bank = JSON.parse(readFileSync(resolve(root, 'public/data/rc/RC-PT159.json'), 'utf8'));
const passage = bank.passages.find(value => value.passageId === 1756);
assert.equal(passage.questions.find(question => question.questionId === 10733).correctAnswer, 'D');
const session = { id: 'controlled-replay', userId: 'synthetic-owner', passageIds: [1756], status: 'completed',
  excludedFromAnalytics: false, startedAt: '2026-10-01T00:00:00Z', completedAt: '2026-10-01T00:10:00Z',
  config: { reveal: 'end_of_set', source: 'manual', timing: { mode: 'unlimited' },
    timedSectionSittingId: '10000000-0000-4000-8000-000000000001', clockElapsedSeconds: 60 } };
const attempts = [{ id: 'synthetic-attempt', userId: 'synthetic-owner', sessionId: session.id, questionId: 10733,
  passageId: 1756, selected: 'B', isCorrect: true, isFirstAttempt: true, timeMs: 1000, flagged: false, eliminations: [] }];
const modules = {
  '\0rc-key-fixture-progress': `const writes = window.__rcKeyReplayWrites = [];
    export const getSession = async () => (${JSON.stringify(session)});
    export const getSessionAttempts = async () => ${JSON.stringify(attempts)};
    const forbidden = (name) => () => { writes.push(name); throw new Error('Forbidden fixture write: ' + name); };
    export const createSession = forbidden('createSession');
    export const setSessionExcluded = forbidden('setSessionExcluded');`,
  '\0rc-key-fixture-bank': `export const loadPassages = async () => ${JSON.stringify([passage])};`,
  '\0rc-key-fixture-client': `export const supabase = new Proxy({}, { get() { throw new Error('No backend in controlled replay'); } });`,
  '\0rc-key-fixture-auth': `export const useAuth = () => ({ user: { id: 'synthetic-owner' }, authReady: true });`,
};
const fixture = `import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RcResults from '/src/features/rc/pages/RcResults.tsx';
import '/src/index.css';
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/rc/results/controlled-replay']}>
  <Routes><Route path='/rc/results/:sessionId' element={<RcResults />} /></Routes>
</MemoryRouter>);`;
const server = await createServer({ root, configFile: false, envFile: false, envDir: false,
  logLevel: 'error', resolve: { alias: { '@': resolve(root, 'src') } },
  server: { host: '127.0.0.1', port: 0, strictPort: false },
  plugins: [
    { name: 'explicit-rc-key-replay-adapters', enforce: 'pre',
      resolveId(source, importer) {
        if (source.endsWith('/integrations/supabase/client')) return '\0rc-key-fixture-client';
        if (source.endsWith('/contexts/AuthContext')) return '\0rc-key-fixture-auth';
        if (!importer?.replaceAll('\\', '/').endsWith('/features/rc/pages/RcResults.tsx')) return;
        if (source === '../api/rcProgress') return '\0rc-key-fixture-progress';
        if (source === '../lib/rcBank') return '\0rc-key-fixture-bank';
      },
      load(id) { return modules[id]; },
      configureServer(vite) {
        vite.middlewares.use(async (request, response, next) => {
          if (request.url !== '/controlled-replay') return next();
          response.setHeader('Content-Type', 'text/html');
          response.end(await vite.transformIndexHtml(request.url, '<!doctype html><html><head><meta charset="utf-8"><title>Controlled RC key replay</title></head><body><div id="root"></div><script type="module" src="/rc-key-browser-entry.tsx"></script></body></html>'));
        });
      },
    },
    { name: 'rc-key-replay-entry', resolveId(source) { if (source === '/rc-key-browser-entry.tsx') return '\0rc-key-browser-entry.tsx'; },
      load(id) { if (id === '\0rc-key-browser-entry.tsx') return fixture; } },
    react(),
  ],
});
let browser; let replayPage;
try {
  await server.listen();
  console.log('Fixture server ready');
  const address = server.httpServer.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const executablePath = [process.env.RC_KEY_REPLAY_BROWSER, chromium.executablePath(),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(value => value && existsSync(value));
  assert.ok(executablePath, 'No existing browser binary found; install is not automatic.');
  browser = await chromium.launch({ executablePath, headless: true });
  console.log('Isolated browser ready');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  replayPage = page;
  const external = []; const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error('Replay page error:', error.message); });
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    external.push(route.request().url()); return route.abort();
  });
  await page.goto(`${origin}/controlled-replay`, { timeout: 60000 });
  console.log('Replay page loaded');
  const notice = page.getByRole('status');
  await expect(notice).toContainText('This report preserves the recorded score and shows the current credited answer.');
  await expect(page.getByText('17%', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exclude from analytics' })).toBeDisabled();
  assert.deepEqual(await page.evaluate(() => window.__rcKeyReplayWrites), []);
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  mkdirSync(output, { recursive: true });
  await page.screenshot({ path: resolve(output, 'results.png'), fullPage: true });
  const receipt = { observedAt: new Date().toISOString(), evidenceKind: 'isolated controlled replay, not live-account acceptance',
    browserExecutable: executablePath, viewport: { width: 1280, height: 720 }, component: 'RcResults',
    fixture: { questionId: 10733, currentKey: 'D', savedSelected: 'B', savedIsCorrect: true, savedScore: '1/6', percent: 17 },
    notice: await notice.innerText(), backendWrites: [], externalRequests: external, pageErrors: errors, screenshot: 'results.png' };
  writeFileSync(resolve(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) { console.error(error); if (replayPage) console.error('Replay DOM:', (await replayPage.locator('body').innerText()).slice(0, 2000)); process.exitCode = 1; }
finally {
  await browser?.close();
  await Promise.race([server.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
}
