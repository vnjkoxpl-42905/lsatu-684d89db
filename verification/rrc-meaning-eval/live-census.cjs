// Existing authenticated admin-only census. No database writes or student regrades.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..');
const EXPECTED_BUILD = '2026-10-16-grounded-meaning-5';
const IDS = ['PT105_S2_Q1', 'PT105_S2_Q2', 'PT105_S2_Q3'];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function env(file) {
  if (!fs.existsSync(file)) return {};
  const result = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) result[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2');
  }
  return result;
}
async function main() {
  const args = process.argv.slice(2);
  if (!['--probe', '--census', '--controls'].includes(args[0]) || (args[0] === '--controls' ? args.length !== 3 || args[1] !== '--baseline' : args.length !== 1)) throw Error('Use --probe, --census, or --controls --baseline <valid reference receipt directory>.');
  const mode = args[0].slice(2);
  if (mode === 'controls') {
    const baseline = JSON.parse(fs.readFileSync(path.resolve(args[2], 'census-response.json'), 'utf8'));
    if (baseline.build !== EXPECTED_BUILD || baseline.rows?.length !== 3 || baseline.rows.some(row => !IDS.includes(row.slug) || typeof row.percent !== 'number' || row.error)) throw Error('Controls require three valid reference results from this same deployed build.');
  }
  const config = { ...env(path.join(os.homedir(), 'dev/ai-os/.env')), ...env(path.join(ROOT, '.env')) };
  if (!config.VITE_SUPABASE_URL || !config.VITE_SUPABASE_PUBLISHABLE_KEY || !config.LSATPREP_ADMIN_EMAIL || !config.LSATPREP_ADMIN_PASSWORD) throw Error('Existing administrator configuration is incomplete.');
  const headers = { apikey: config.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' };
  const login = await fetch(config.VITE_SUPABASE_URL + '/auth/v1/token?grant_type=password', { method: 'POST', headers, signal: AbortSignal.timeout(20000), body: JSON.stringify({ email: config.LSATPREP_ADMIN_EMAIL, password: config.LSATPREP_ADMIN_PASSWORD }) });
  const auth = await login.json();
  if (!login.ok || !auth.access_token) throw Error('Existing administrator sign-in failed; HTTP ' + login.status);
  const authorized = { ...headers, Authorization: 'Bearer ' + auth.access_token };
  const call = async census => {
    const response = await fetch(config.VITE_SUPABASE_URL + '/functions/v1/grade-rrc-section', { method: 'POST', headers: authorized, signal: AbortSignal.timeout(mode === 'probe' ? 30000 : 180000), body: JSON.stringify({ census }) });
    const data = await response.json();
    if (!response.ok) throw Error('Admin census returned HTTP ' + response.status + '; response suppressed to protect diagnostics. No retry.');
    return data;
  };
  const folder = path.join(__dirname, new Date().toISOString().replace(/[:.]/g, '-') + '-live-' + mode);
  fs.mkdirSync(folder, { recursive: true });
  const probe = await call({ sourceSection: 'PT105.S2', items: [{ slug: '__build_probe_no_transcript__', chunks: [] }] });
  fs.writeFileSync(path.join(folder, 'build-probe.json'), JSON.stringify(probe, null, 2) + '\n');
  if (!Array.isArray(probe.rows) || probe.rows.length !== 1 || probe.rows[0].skipped !== 'no model run transcript') throw Error('Build probe did not return the required no-transcript skip; stopped.');
  if (mode === 'probe') {
    console.log(JSON.stringify({ mode, providerCalls: 0, build: probe.build, judge: probe.judge, receipt: path.relative(ROOT, folder) }, null, 2));
    return;
  }
  if (probe.build !== EXPECTED_BUILD) throw Error('Deployment not ready: build ' + probe.build + '. Three-question census was NOT invoked.');
  const sourcePath = path.join(ROOT, 'src/features/activity-centre/content/read-recall-colour-pt105-s2.json');
  const bytes = fs.readFileSync(sourcePath);
  const source = JSON.parse(bytes.toString());
  if (source.source_section !== 'PT105.S2') throw Error('Wrong source section; no grading invoked.');
  const items = IDS.map(slug => {
    const item = source.items.find(row => row.slug === slug);
    if (!item?.chunks?.length) throw Error('Missing source question ' + slug);
    return { slug, chunks: JSON.parse(JSON.stringify(item.chunks)), the_read: item.the_read };
  });
  const alteredClaims = [];
  if (mode === 'controls') {
    const mutations = [
      { slug: IDS[0], oldDetail: 'The tunnel is underwater.', newDetail: 'The only access tunnel is above ground.', oldText: 'The cave is accessible only through an underwater tunnel.', newText: 'The cave is accessible only through an above-ground tunnel.' },
      { slug: IDS[1], oldDetail: 'Marketing vaccines is expected to be less profitable.', newDetail: 'Marketing vaccines is expected to be more profitable.', oldText: 'since the marketing of vaccines promised to be less profitable than the marketing of any other pharmaceutical product.', newText: 'since the marketing of vaccines promised to be more profitable than the marketing of any other pharmaceutical product.' },
      { slug: IDS[2], oldDetail: 'That option would disrupt work.', newDetail: 'That option would not disrupt work.', oldText: "which would disrupt our employees' work, or else at night, which would entail much higher installation charges.", newText: "which would not disrupt our employees' work, or else at night, which would entail much higher installation charges." },
    ];
    for (const mutation of mutations) {
      const item = items.find(row => row.slug === mutation.slug);
      const chunk = item.chunks.find(row => row.text === mutation.oldText);
      const detail = item.chunks.flatMap(row => row.details).find(row => row.text === mutation.oldDetail);
      if (!chunk || !detail) throw Error('Control mutation does not match original key; no census invoked.');
      chunk.text = mutation.newText;
      detail.text = mutation.newDetail;
      alteredClaims.push(mutation);
    }
  }
  const payload = { sourceSection: 'PT105.S2', items };
  fs.writeFileSync(path.join(folder, 'request-payload.json'), JSON.stringify({ classification: mode === 'controls' ? 'SYNTHETIC ALTERED KEYS. Not real stimuli or student answers.' : 'Original authored reference questions', census: payload, alteredClaims }, null, 2) + '\n');
  const query = new URLSearchParams({ select: 'slug,source_section,status,transcript_text', source_section: 'eq.PT105.S2', status: 'eq.active', slug: 'in.(' + IDS.join(',') + ')' });
  const referenceResponse = await fetch(config.VITE_SUPABASE_URL + '/rest/v1/model_runs?' + query, { headers: authorized, signal: AbortSignal.timeout(20000) });
  if (!referenceResponse.ok) throw Error('Reference preflight read failed; no census invoked.');
  const references = await referenceResponse.json();
  const provenance = IDS.map(slug => {
    const rows = references.filter(row => row.slug === slug);
    if (rows.length !== 1 || !rows[0].transcript_text?.trim()) throw Error('Expected exactly one active transcript for ' + slug + '; no census invoked.');
    const text = rows[0].transcript_text;
    return { slug, transcriptSha256: sha(text), transcriptCharacters: text.length, transcriptWords: text.trim().split(/\s+/).length, sourceSection: rows[0].source_section, status: rows[0].status, provenance: 'Read-only preflight snapshot of saved active model_runs.transcript_text, fetched immediately before census; server independently reads the same table.' };
  });
  fs.writeFileSync(path.join(folder, 'reference-transcripts.json'), JSON.stringify(references, null, 2) + '\n');
  fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify({ mode, expectedBuild: EXPECTED_BUILD, sourceFile: path.relative(ROOT, sourcePath), sourceSha256: sha(bytes), payloadSha256: sha(JSON.stringify(payload)), questionSlugs: IDS, referenceTranscripts: provenance, questionLimit: 3, noRetry: true, writesStudentGrades: false, requestedStudentRegrade: false, notes: ['Exactly three reference questions submitted; each server judge may use its configured fallback if the gateway fails.', 'The server chooses saved active model-run transcripts; no caller transcript replacement.', 'Owner designates these recordings 10/10. Detail percentage and separate CLIR are reported as returned, not overridden.', 'No independently verified script-to-audio alignment or direct listening is implied.'] }, null, 2) + '\n');
  const result = await call(payload);
  fs.writeFileSync(path.join(folder, 'census-response.json'), JSON.stringify(result, null, 2) + '\n');
  if (result.build !== EXPECTED_BUILD) throw Error('Build changed between probe and census. Receipt retained; do not retry automatically.');
  if (!Array.isArray(result.rows) || result.rows.length !== 3 || result.rows.some(row => !IDS.includes(row.slug))) throw Error('Unexpected question set returned. Receipt retained; do not retry.');
  if (mode === 'controls') {
    const checks = result.rows.map(row => {
      const target = alteredClaims.find(mutation => mutation.slug === row.slug).newDetail;
      const evidence = Object.values(row.detail_evidence ?? {}).find(detail => detail.text === target);
      return { slug: row.slug, target, targetFound: !!evidence, targetCarried: evidence?.carried, targetMaterial: evidence?.material, meaningPercent: row.meaning_percent, decoysCarried: row.decoysCarried, passed: evidence?.carried === false && evidence?.material === true && typeof row.meaning_percent === 'number' && row.meaning_percent < 100 && row.decoysCarried === 0 };
    });
    fs.writeFileSync(path.join(folder, 'control-checks.json'), JSON.stringify(checks, null, 2) + '\n');
  }
  const normalize = value => value.normalize('NFKC').toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const evidenceAudit = result.rows.map(row => {
    const transcript = references.find(ref => ref.slug === row.slug).transcript_text;
    const words = ' ' + normalize(transcript) + ' ';
    return { slug: row.slug, scored: typeof row.percent === 'number', error: row.error, details: Object.entries(row.detail_evidence ?? {}).map(([id, detail]) => ({ id: Number(id), ...detail, quoteInReferenceTranscript: detail.evidence.trim() ? words.includes(' ' + normalize(detail.evidence) + ' ') : null })) };
  });
  fs.writeFileSync(path.join(folder, 'evidence-audit.json'), JSON.stringify({ limitation: 'Quote check uses saved full-transcript snapshot; production parser independently requires student-only evidence against its verbatim-read-stripped transcript. A matching substring does not prove semantic justification.', rows: evidenceAudit }, null, 2) + '\n');
  // Local deterministic inspection only; this child process makes no network calls.
  execFileSync(process.execPath, [path.join(ROOT, 'node_modules/vite-node/vite-node.mjs'), path.join(__dirname, 'inspect-census.ts'), '--', '--receipt', folder], { cwd: ROOT, encoding: 'utf8', timeout: 90000, stdio: ['ignore', 'pipe', 'pipe'] });
  const summary = { mode, build: result.build, judge: result.judge, questionsSubmitted: 3, questionsScored: result.rows.filter(row => typeof row.percent === 'number').length, rows: result.rows.map(row => ({ slug: row.slug, percent: row.percent, carried: row.carried, total: row.total, band: row.band, meaning_percent: row.meaning_percent, meaning_carried: row.meaning_carried, meaning_total: row.meaning_total, meaning_key_version: row.meaning_key_version, meaning_key_status: row.meaning_key_status, incidental_misses: row.incidental_misses, reciting: row.reciting, listing: row.listing, coloured: row.coloured, colour_specific: row.colour_specific, colourSpecific: row.colourSpecific, missed: row.missed, detail_evidence: row.detail_evidence, readGiven: row.readGiven, readMatches: row.readMatches, read_reason: row.read_reason, decoysCarried: row.decoysCarried, unjudged: row.unjudged, skipped: row.skipped, error: row.error, audit: row.audit, outputAudit: row.outputAudit })), receipt: path.relative(ROOT, folder) };
  fs.writeFileSync(path.join(folder, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Census stopped; no retry.'); process.exitCode = 1; });
