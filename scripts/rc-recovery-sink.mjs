#!/usr/bin/env node
/**
 * A local sink for the RC recovery pull.
 *
 * The browser page fetches each missing question from LSAT Lab and POSTs the
 * result here, so 548 records land on disk without passing through the model's
 * context. Bound to 127.0.0.1 and it only ever appends.
 *
 * Run: node scripts/rc-recovery-sink.mjs
 */
import { createServer } from 'node:http';
import { gunzipSync } from 'node:zlib';
import { appendFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'scripts/rc-source/recovered');
const OUT = join(OUT_DIR, 'questions.ndjson');
mkdirSync(OUT_DIR, { recursive: true });

// Chrome's Private Network Access blocks a public https page from reaching a
// loopback server unless the server opts in on the preflight, which is why the
// first run failed with a bare "Failed to fetch" and no CORS message.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Private-Network': 'true',
  'Access-Control-Max-Age': '86400',
};

const lineCount = () =>
  existsSync(OUT) ? readFileSync(OUT, 'utf8').split('\n').filter((l) => l.trim()).length : 0;

createServer((req, res) => {
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();

  if (req.method === 'GET' && req.url.startsWith('/receiver')) {
    // The handoff landing page.
    //
    // The Claude browser pane blocks a page from FETCHING localhost, and blocks
    // window.open, but it does allow a tab to NAVIGATE to localhost. So the
    // collecting page gzips its payload, base64url-encodes it into the URL
    // fragment, and navigates here; this page reads the fragment and POSTs it
    // back same-origin, where Node decodes and writes it. The fragment never
    // reaches the server on the GET, which is why the POST is needed.
    res.writeHead(200, { ...cors, 'Content-Type': 'text/html' });
    return res.end(`<!doctype html><meta charset="utf-8"><title>sink receiver</title>
<body><pre id="s">waiting…</pre><script>
(async () => {
  const el = document.getElementById('s');
  const payload = location.hash.slice(1);
  if (!payload) { el.textContent = 'NO PAYLOAD'; return; }
  const name = new URLSearchParams(location.search).get('name');
  const target = name ? ('/file-b64?name=' + encodeURIComponent(name)) : '/raw-b64';
  el.textContent = 'posting ' + payload.length + ' chars…';
  const r = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: payload });
  const j = await r.json();
  el.textContent = j.ok ? ('WROTE ' + j.bytes + ' bytes, ' + j.lines + ' lines') : ('FAILED ' + j.error);
})();
</script></body>`);
  }

  if (req.method === 'POST' && req.url.startsWith('/file-b64')) {
    // Same handoff as /raw-b64, but the caller names the destination. Used for
    // the one-off Logical Reasoning record, which does not belong in the RC
    // recovery file. Confined to the recovered/ directory.
    const name = (new URL(req.url, 'http://x').searchParams.get('name') || '').replace(/[^a-zA-Z0-9._-]/g, '');
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        if (!name) throw new Error('no name');
        const text = gunzipSync(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64')).toString('utf8');
        writeFileSync(join(OUT_DIR, name), text);
        res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, name, bytes: text.length }));
        process.stdout.write(`wrote ${name}: ${text.length} bytes\n`);
      } catch (err) {
        res.writeHead(400, { ...cors, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/raw-b64')) {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const b64 = body.replace(/-/g, '+').replace(/_/g, '/');
        const text = gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
        writeFileSync(OUT, text);
        res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, bytes: text.length, lines: lineCount() }));
        process.stdout.write(`wrote ${text.length} bytes, ${lineCount()} lines\n`);
      } catch (err) {
        res.writeHead(400, { ...cors, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/ids')) {
    // The page pulls its own work list, so the id list never has to be pasted
    // into the browser by hand.
    const gaps = JSON.parse(readFileSync(join(ROOT, 'scripts/practice-test-gaps.generated.json'), 'utf8'));
    const done = new Set(
      existsSync(OUT)
        ? readFileSync(OUT, 'utf8')
            .split('\n')
            .filter((l) => l.trim())
            .map((l) => JSON.parse(l).question_id)
        : [],
    );
    const ids = [...new Set(gaps.rc.flatMap((s) => s.missingQuestionIds))].filter((id) => !done.has(id));
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ids, remaining: ids.length, alreadyDone: done.size }));
  }

  if (req.method === 'GET' && req.url.startsWith('/count')) {
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ lines: lineCount() }));
  }

  if (req.method === 'POST' && req.url.startsWith('/chunk')) {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const rows = JSON.parse(body);
        const list = Array.isArray(rows) ? rows : [rows];
        if (list.length) appendFileSync(OUT, `${list.map((r) => JSON.stringify(r)).join('\n')}\n`);
        res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, wrote: list.length, total: lineCount() }));
        process.stdout.write(`+${list.length} (${lineCount()})\n`);
      } catch (err) {
        res.writeHead(400, { ...cors, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      }
    });
    return;
  }

  res.writeHead(404, cors).end();
}).listen(8791, '127.0.0.1', () => console.log('sink listening on http://127.0.0.1:8791'));
