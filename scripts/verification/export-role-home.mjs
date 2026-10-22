#!/usr/bin/env node
/** Portable, fixture-only dashboard review exports. No application files are changed. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { build } from 'vite';
import react from '@vitejs/plugin-react-swc';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE = path.join(ROOT, 'docs/verification/role-home-preview.tsx');
const CACHE = path.join(ROOT, 'node_modules/.cache/lsatu-role-export');
const ROLES = ['student', 'teacher'];
const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${name} requires a value`);
  return args[i + 1];
};
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const OUT = path.resolve(argValue('--out', path.join(os.homedir(), 'Downloads', `LSAT-U-Dashboard-Handoff-${day}`)));
const PROMPTS = path.resolve(argValue('--prompts-dir', path.join(ROOT, 'docs/verification/role-home-handoff')));
if (args.includes('--help')) {
  console.log('node scripts/verification/export-role-home.mjs [--out PATH] [--prompts-dir PATH]\nBuilds two standalone fixture-only HTML files, prompts and a check report. Existing generated output names are replaced; other files are preserved. Fonts are cached after the first run.');
  process.exit(0);
}
const escapeHtml = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const hash = (s) => createHash('sha256').update(s).digest('hex');
const normalize = (s) => s.replaceAll('\\', '/').split('?')[0];
await fs.mkdir(CACHE, { recursive: true });
await fs.mkdir(path.join(CACHE, 'empty-env'), { recursive: true });
await fs.mkdir(OUT, { recursive: true });

async function cachedAsset(name, url, text = false) {
  const cachePath = path.join(CACHE, name);
  try { return await fs.readFile(cachePath, text ? 'utf8' : undefined); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36' },
  });
  if (!response.ok) throw new Error(`Asset download failed (${response.status}): ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`Empty asset: ${url}`);
  await fs.writeFile(cachePath, bytes);
  return text ? bytes.toString('utf8') : bytes;
}

async function embeddedFonts() {
  const outfit = await fs.readFile(path.join(ROOT, 'src/features/rc/assets/outfit-latin.woff2'));
  const url = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&display=swap';
  const source = await cachedAsset('fraunces-latin-v2.css', url, true);
  const faces = [...source.matchAll(/\/\* latin \*\/\s*(@font-face\s*\{[^}]+\})/g)].map((m) => m[1]);
  if (faces.length !== 2) throw new Error('Expected normal and italic Latin Fraunces font faces; refusing a silently substituted export.');
  const inlined = [];
  for (const [index, face] of faces.entries()) {
    const remote = face.match(/url\(([^)]+)\)/)?.[1]?.replaceAll(/["']/g, '');
    if (!remote?.startsWith('https://fonts.gstatic.com/')) throw new Error('Unexpected font asset origin');
    const bytes = await cachedAsset(`fraunces-${index}.woff2`, remote);
    inlined.push(face.replace(/url\([^)]+\)/, `url(data:font/woff2;base64,${bytes.toString('base64')})`));
  }
  const licenses = {};
  for (const font of ['outfit', 'fraunces']) {
    licenses[font] = await cachedAsset(`${font}-OFL.txt`, `https://raw.githubusercontent.com/google/fonts/main/ofl/${font}/OFL.txt`, true);
  }
  return {
    css: `@font-face{font-family:Outfit;font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${outfit.toString('base64')}) format('woff2')}\n${inlined.join('\n')}`,
    licenses,
  };
}

// Nothing imported by a fixture can reach a real backend or a saved session.
const CLIENT_STUB = `
const unavailable = () => { throw new Error('Offline dashboard review: backend access is disabled.'); };
const auth = { onAuthStateChange: () => ({data:{subscription:{unsubscribe(){}}}}), getSession: async () => ({data:{session:null},error:null}), getUser: async () => ({data:{user:null},error:null}) };
export const supabase = new Proxy({auth}, {get(target,key){ return key in target ? target[key] : unavailable; }});
`;

function exportPlugin() {
  return {
    name: 'portable-role-home-boundary', enforce: 'pre',
    load(id) {
      if (normalize(id) === normalize(path.join(ROOT, 'src/integrations/supabase/client.ts'))) return CLIENT_STUB;
    },
    transform(code, id) {
      if (normalize(id) !== normalize(FIXTURE)) return;
      const expected = [
        'const params = new URLSearchParams(location.search);',
        'history.replaceState(null, "", `?${next}`);',
      ];
      for (const token of expected) if (!code.includes(token)) throw new Error(`Fixture contract changed: missing ${token}. Update the exporter rather than creating a partial snapshot.`);
      return code
        .replace(expected[0], "const params = new URLSearchParams({role:document.documentElement.dataset.dashboardExport === 'student' ? 'student' : 'teacher',state:'full',width:'fluid',theme:'light'});")
        .replace(expected[1], '/* Portable file: keep state in memory without changing a file:// URL. */')
        .replace('SAMPLE DATA · local verification', '{role.toUpperCase()} · OFFLINE SAMPLE DATA');
    },
  };
}

const reviewCss = `
[aria-label="Preview controls"] label:first-of-type,[aria-label="Preview controls"] label:nth-of-type(3){display:none!important}
[aria-label="Preview controls"]{position:relative!important;box-shadow:none!important}
[aria-label="Preview controls"] select{color:#252b26;background:#f7f4ee;border:1px solid #8b9089;border-radius:5px;padding:3px 6px}
.portable-review{font:14px/1.6 Outfit,system-ui,sans-serif;background:#f7f4ee;color:#252b26;border-top:1px solid #c8c9c0;padding:20px max(20px,calc((100vw - 1140px)/2));}
.portable-review summary{cursor:pointer;font-weight:600}.portable-review pre{font:13px/1.65 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-width:1050px}.portable-review button{font:inherit;border:1px solid #93988f;border-radius:7px;padding:7px 13px;margin:12px 0;background:#fff;color:#252b26;cursor:pointer}.portable-review button:focus-visible{outline:2px solid #252b26;outline-offset:3px}.portable-review small{display:block}.portable-review noscript{display:block}
`;

function assertPortable(html, role) {
  const checks = {
    document: html.startsWith('<!doctype html>'),
    roleLabel: html.includes(`data-dashboard-export="${role}"`) && html.includes('OFFLINE SAMPLE DATA'),
    bundledScripts: /<script>/.test(html) && !/<script[^>]+src\s*=/i.test(html),
    bundledStyles: /<style>/.test(html) && !/<link[^>]+(?:href|rel)\s*=/i.test(html),
    networkBlocked: html.includes("connect-src 'none'") && html.includes("default-src 'none'"),
    embeddedFonts: (html.match(/data:font\/woff2;base64,/g) ?? []).length >= 3,
    noBackendConfig: !/VITE_SUPABASE|https?:\/\/[^\s"'<>]*supabase\.(?:co|in)|eyJ[a-zA-Z0-9_-]{30,}\.[a-zA-Z0-9_-]+\./.test(html),
    noLocalServerDependency: !/(?:https?:)?\/\/(?:127\.0\.0\.1|localhost):\d+/.test(html),
    handoffIncluded: html.includes('id="handoff-prompt"'),
    noExternalCssAssets: !/url\(\s*["']?(?:https?:|\/\/|\/assets\/)/i.test(html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? ''),
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) throw new Error(`${role} export failed checks: ${failed.join(', ')}`);
  return checks;
}

let revision = 'unavailable';
let dirty = true;
try {
  revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  dirty = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim().length > 0;
} catch { /* Metadata remains explicitly unavailable. */ }
const fonts = await embeddedFonts();
const report = { generatedAt: new Date().toISOString(), sourceRevision: revision, includesUncommittedChanges: dirty, fixturesOnly: true, browserReview: 'Not performed by this script. See REVIEW.md if supplied by the reviewer.', outputs: {} };

const prompts = Object.fromEntries(await Promise.all(ROLES.map(async (role) => [role, await fs.readFile(path.join(PROMPTS, `${role}-handoff.md`), 'utf8')])));
// Both documents reuse one compiled bundle; the HTML data attribute fixes the role.
  const result = await build({
    root: ROOT, configFile: false, envDir: path.join(CACHE, 'empty-env'), logLevel: 'warn',
    plugins: [exportPlugin(), react()],
    resolve: { alias: { '@': path.join(ROOT, 'src') }, dedupe: ['react', 'react-dom'] },
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      write: false, minify: 'esbuild', sourcemap: false, cssCodeSplit: false,
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      lib: { entry: FIXTURE, name: 'PortableRoleHome', formats: ['iife'] },
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => r.output);
  const chunks = outputs.filter((item) => item.type === 'chunk');
  if (chunks.length !== 1 || chunks[0].imports.length || chunks[0].dynamicImports.length) throw new Error('Expected exactly one self-contained JavaScript bundle');
  const cssAssets = outputs.filter((item) => item.type === 'asset' && item.fileName.endsWith('.css'));
  const unsupported = outputs.filter((item) => item.type === 'asset' && !item.fileName.endsWith('.css'));
  if (unsupported.length) throw new Error(`Unembedded assets: ${unsupported.map((a) => a.fileName).join(', ')}`);
  // Unused decorative URL backgrounds must not create file:// or network reads.
  const css = cssAssets.map((a) => String(a.source)).join('\n').replace(/url\((?!["']?data:)[^)]+\)/g, 'none');
  const js = chunks[0].code.replace(/<\/script/gi, '<\\/script');
for (const role of ROLES) {
  const prompt = prompts[role];
  const metadata = { ...report, role, sourceComponents: role === 'teacher' ? ['src/components/classroom/home/teacher/TeacherHomeView.tsx'] : ['src/components/classroom/home/ClassroomHomeView.tsx'], fixture: 'docs/verification/role-home-preview.tsx', boundary: 'Production presentation components; local sample callbacks; no production account or backend.' };
  const html = `<!doctype html>
<!-- HANDOFF PROMPT (also available as ${role}-handoff.md):\n${prompt.replaceAll('--', '−−')}\nEND HANDOFF PROMPT -->
<html lang="en" data-dashboard-export="${role}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'; media-src data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'"><title>LSAT U | ${role === 'student' ? 'Student' : 'Teacher'} dashboard | offline review</title><style>${fonts.css}\n${css}\n${reviewCss}</style></head>
<body><div id="root"></div><noscript>This interactive dashboard needs JavaScript. Its handoff prompt remains readable below.</noscript>
<section class="portable-review" aria-label="Review handoff"><details><summary>Review handoff, source and limitations</summary><p>This is an offline sample, not a live account. Navigation is logged in the preview toolbar. Completion and read changes reset when reloaded. Other app pages, question-bank search and backend persistence are outside this file.</p><button type="button" id="copy-handoff">Copy handoff prompt</button><small id="copy-status" role="status"></small><pre id="handoff-prompt">${escapeHtml(prompt)}</pre><details><summary>Source metadata</summary><pre>${escapeHtml(JSON.stringify(metadata, null, 2))}</pre></details><details><summary>Embedded font licenses</summary><pre>${escapeHtml(Object.entries(fonts.licenses).map(([name, license]) => `${name}\n${license}`).join('\n\n'))}</pre></details></details></section>
<script>${js}</script><script>document.getElementById('copy-handoff').addEventListener('click',async function(){const text=document.getElementById('handoff-prompt').textContent;try{await navigator.clipboard.writeText(text);document.getElementById('copy-status').textContent='Copied.'}catch{const range=document.createRange();range.selectNodeContents(document.getElementById('handoff-prompt'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);document.getElementById('copy-status').textContent='Select and copy the highlighted prompt.'}});</script></body></html>`;
  const checks = assertPortable(html, role);
  await fs.writeFile(path.join(OUT, `${role}-dashboard.html`), html);
  await fs.writeFile(path.join(OUT, `${role}-handoff.md`), prompt);
  report.outputs[role] = { file: `${role}-dashboard.html`, bytes: Buffer.byteLength(html), sha256: hash(html), checks };
  console.log(`${role}: ${Buffer.byteLength(html).toLocaleString()} bytes, portable checks passed`);
}
await fs.writeFile(path.join(OUT, 'auto-checks.json'), JSON.stringify(report, null, 2) + '\n');
await fs.writeFile(path.join(OUT, 'README.md'), `# LSAT U dashboard review files\n\nOpen student-dashboard.html or teacher-dashboard.html directly in a browser. No server or login is needed. Upload the matching HTML, handoff Markdown and screenshot (if present) to another model. HTML preserves the interactive design; Markdown gives the review instructions; PNG provides an immediate visual for models that cannot render HTML.\n\nThese exports contain only typed fictional fixtures, not real student account data. They render production Home components but do not include the authenticated sidebar, other pages, backend persistence or the full question bank. State and Theme controls exercise the available sample states. Navigation logs its destination; it does not launch a drill or send an assignment.\n\nRegenerate from the repository:\n\n\`\`\`powershell\nnode scripts/verification/export-role-home.mjs --out "${OUT.replaceAll('\\', '/')}"\n\`\`\`\n\nThe script replaces only its named generated files and preserves unrelated files. Fonts are cached after the first run; subsequent runs work without font downloads. No source components or backend records are modified. Source revision: ${revision}, uncommitted work included: ${dirty}. Automatic checks are in auto-checks.json. Browser/reviewer findings, when supplied separately, are in REVIEW.md.\n`);
console.log(`Export complete: ${OUT}`);
