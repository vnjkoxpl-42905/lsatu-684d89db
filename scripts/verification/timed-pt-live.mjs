// Ordinary authenticated v1 acceptance on explicitly labelled, newly created QA parents.
// Does not deploy/activate, delete, grade with AI, send notifications, or adopt legacy work.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
if (args.includes('--self-check')) {
  function fake(values, options = {}) {
    let calls = 0;
    return { from() { return { select() { return this; }, eq() { return this; }, order() { return this; }, async range(start, end) {
      calls++;
      const data = values.slice(start, Math.min(end + 1, start + 17));
      if (options.duplicate && calls > 1) data[0] = values[0];
      return { error: null, data, count: options.noCount ? null : values.length + (options.changed && calls > 1 ? 1 : 0) };
    } }; } };
  }
  const items = Array.from({ length: 205 }, (_, index) => ({ id: String(index).padStart(4, '0') }));
  assert.deepEqual(await rows(fake(items), 'attempts', 'user_id', 'synthetic'), items);
  assert.deepEqual(await rows(fake([]), 'attempts', 'user_id', 'synthetic'), []);
  await assert.rejects(() => rows(fake(items, { noCount: true }), 'attempts', 'user_id', 'synthetic'));
  await assert.rejects(() => rows(fake(items, { changed: true }), 'attempts', 'user_id', 'synthetic'));
  await assert.rejects(() => rows(fake(items, { duplicate: true }), 'attempts', 'user_id', 'synthetic'));
  const kv = items.map(item => ({ table_name: 'practice_sessions', record_id: item.id }));
  assert.deepEqual(await rows(fake(kv), 'bootcamp_kv', 'user_id', 'synthetic'), kv);
  console.log('Six offline preservation pagination assertions passed; no authentication or network requests.');
  process.exit(0);
}
if (!args.includes('--execute')) {
  console.log('Prepared only. Execute after capability activation: node scripts/verification/timed-pt-live.mjs <central-credentials.env> <evidence.json> --execute');
  process.exit(0);
}
const [credentialPath, evidencePath] = args.filter(value => !value.startsWith('--'));
assert.ok(credentialPath && evidencePath, 'Provide credentials and evidence paths');
const parseEnv = text => Object.fromEntries(text.split(/\r?\n/).flatMap(line => {
  const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  return match ? [[match[1], match[2].replace(/^(["'])(.*)\1$/, '$2')]] : [];
}));
const credentials = parseEnv(await readFile(resolve(credentialPath), 'utf8'));
const env = parseEnv(await readFile(resolve('.env'), 'utf8'));
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert.ok(key && env.VITE_SUPABASE_URL, 'Public application connection required');
if (!key.startsWith('sb_publishable_')) assert.equal(JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role, 'anon', 'Only public application key permitted');
const artifact = JSON.parse(await readFile('docs/implementation-plans/artifacts/timed-content-manifest-v1.generated.json', 'utf8'));
const bank = JSON.parse(await readFile('public/data/_bank.generated.json', 'utf8'));
const lrKeys = new Map(bank.flatMap(section => section.questions.map(q => [`${q.practiceTest}-S${q.sectionNumber}-Q${q.questionNumber}`, q.correctAnswer])));
const evidence = { date: new Date().toISOString().slice(0, 10), ordinaryJwt: true, fixtureLabel: '[Verification only] Timed PrepTest atomic v1', fixtureIds: {}, checks: [], profileRestored: null, notifications: 0, gradingRequests: 0, deletes: 0, preExistingRowsModified: 0, passed: false };
let student, second, admin, originalFlag, flagChanged = false, stage = 'authentication';
const check = label => evidence.checks.push(label);
const saveEvidence = () => writeFile(resolve(evidencePath), JSON.stringify(evidence, null, 2) + '\n');
async function login(prefix) {
  const client = createClient(env.VITE_SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: credentials[`${prefix}_EMAIL`], password: credentials[`${prefix}_PASSWORD`] });
  assert.ok(!error && data.user, 'Ordinary password authentication failed');
  return { client, id: data.user.id };
}
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function rows(client, table, field, value) {
  const collected = [], identities = new Set();
  let total = null;
  while (total === null || collected.length < total) {
    let query = client.from(table).select('*', { count: 'exact' }).eq(field, value);
    query = table === 'bootcamp_kv' ? query.order('table_name').order('record_id') : query.order('id');
    const response = await query.range(collected.length, collected.length + 99);
    assert.ok(!response.error, `Read failed for ${table}: ${response.error?.code ?? ''}`);
    assert.equal(typeof response.count, 'number', `Exact paginated ${table} count required`);
    if (total === null) total = response.count;
    assert.equal(response.count, total, `Concurrent ${table} changes during preservation snapshot`);
    assert.ok(response.data.length > 0 || collected.length === total, `Incomplete ${table} page`);
    for (const row of response.data) {
      const identity = table === 'bootcamp_kv' ? `${row.table_name}::${row.record_id}` : row.id;
      assert.ok(identity && !identities.has(identity), `Duplicate or missing ${table} identity`);
      identities.add(identity); collected.push(row);
    }
    assert.ok(collected.length <= total, `Unexpected ${table} pagination count`);
  }
  assert.equal(collected.length, total, `Complete ${table} baseline required`);
  return collected;
}
async function rpc(client, command, expectedError) {
  const name = command.operation === 'create' ? 'create_timed_practice_test_v1' : 'commit_timed_work_v1';
  const response = await client.rpc(name, { p_command: command });
  if (expectedError) { assert.equal(response.error?.code, expectedError, `Expected ${expectedError} for ${command.operation}`); return null; }
  assert.ok(!response.error, `${command.operation} rejected: ${response.error?.code ?? ''}`);
  const result = response.data;
  assert.equal(result.receipt.commandId, command.commandId);
  assert.deepEqual(result.receipt.command, command);
  assert.equal(result.receipt.ownerId, (await client.auth.getUser()).data.user.id);
  assert.equal(result.receipt.workId, command.workId);
  assert.equal(result.parent.id, command.workId);
  assert.equal(result.parent.timed_contract_version, 1);
  assert.ok(result.parent.revision >= result.receipt.committedRevision);
  assert.ok(Number.isFinite(Date.parse(result.serverTime)));
  return result;
}
async function read(client, id, expectedError) {
  const response = await client.rpc('read_timed_practice_test_v1', { p_work_id: id });
  if (expectedError) { assert.equal(response.error?.code, expectedError, 'Owner-only read denial'); return null; }
  assert.ok(!response.error, `Protected read rejected: ${response.error?.code ?? ''}`);
  assert.equal(response.data.parent.id, id);
  return response.data;
}
function command(parent, operation, payload = {}, deviceId = evidence.deviceB, commandId = randomUUID()) {
  return { workKind: 'practice-test', workId: parent.id, commandId, deviceId, expectedRevision: parent.revision, writerEpoch: parent.timed_writer_epoch, operation, payload };
}
function creation(id, pt, deviceId) { return { workKind: 'practice-test', workId: id, commandId: randomUUID(), deviceId, expectedRevision: 0, writerEpoch: 0, operation: 'create', payload: { pt, pace: 'standard', sectionSeconds: 2100 } }; }
async function deniedDirect(client, table, values, field, value) {
  const response = await client.from(table).update(values).eq(field, value).select('*');
  assert.ok(response.error?.code === '42501' || (!response.error && response.data.length === 0), `Protected raw ${table} write must be denied`);
}
try {
  student = await login('LSATPREP_TESTER'); second = await login('LSATPREP_TESTER'); admin = await login('LSATPREP_ADMIN');
  assert.equal(student.id, second.id); assert.notEqual(student.id, admin.id);
  assert.ok(!(await rows(student.client, 'user_roles', 'user_id', student.id)).some(row => row.role === 'admin'));
  assert.ok((await rows(admin.client, 'user_roles', 'user_id', admin.id)).some(row => row.role === 'admin'));
  stage = 'capability';
  const cap = await student.client.rpc('timed_practice_test_capability_v1');
  assert.ok(!cap.error && cap.data.enabled === true && cap.data.contractVersion === 1 && cap.data.workKind === 'practice-test', 'Root must enable reviewed capability before execution');
  for (const op of ['read', 'create', 'claim', 'start-leg', 'checkpoint', 'heartbeat', 'pause', 'resume', 'close-leg', 'start-break', 'finish-break', 'abandon']) assert.ok(cap.data.operations.includes(op), `Missing ${op}`);
  check('ordinary student/admin actors; active exact v1 capability');
  // Snapshot existing work and reject occupied content before any writes. Mandatory WAJ is keyed by owner/qid.
  stage = 'preservation preflight';
  const filters = { practice_test_runs: 'user_id', attempts: 'user_id', bootcamp_kv: 'user_id', section_history: 'user_id', rc_drill_sessions: 'user_id', rc_attempts: 'user_id', wrong_answer_journal: 'class_id' };
  const baseline = {};
  for (const [table, field] of Object.entries(filters)) baseline[table] = await rows(admin.client, table, field, student.id);
  const assignments = await rows(admin.client, 'practice_test_assignments', 'student_id', student.id);
  const occupiedQids = new Set([...baseline.attempts, ...baseline.wrong_answer_journal].map(row => row.qid));
  const occupiedPts = new Set([...baseline.practice_test_runs, ...baseline.section_history, ...assignments].map(row => row.pt));
  const blueprint = artifact.blueprints.find(test => test.legs[0].kind === 'lr' && test.legs.some(leg => leg.kind === 'rc') && !occupiedPts.has(test.pt) && test.legs.filter(leg => leg.kind === 'lr').every(leg => leg.qids.every(qid => !occupiedQids.has(qid))));
  assert.ok(blueprint, 'No untouched real PrepTest content is available for tester QA; no writes performed');
  for (const leg of blueprint.legs.filter(value => value.kind === 'lr')) for (const qid of leg.qids) assert.match(lrKeys.get(qid) ?? '', /^[A-E]$/, 'Frozen LR content must have a local client-derived answer key');
  const rcBank = JSON.parse(await readFile(`public/data/rc/RC-PT${blueprint.pt}.json`, 'utf8'));
  const rcKeys = new Map(rcBank.passages.flatMap(passage => passage.questions.map(q => [q.questionId, q.correctAnswer])));
  const profile = await admin.client.from('profiles').select('class_id,has_practice_access').eq('class_id', student.id).single();
  assert.ok(!profile.error && typeof profile.data.has_practice_access === 'boolean', 'Tester profile must be readable');
  originalFlag = profile.data.has_practice_access;
  assert.equal(originalFlag, true, 'Tester needs an existing practice grant; probe never grants new access');
  evidence.fixtureIds = { studentParent: `qa-timed-v1-${randomUUID()}`, adminParent: `qa-timed-v1-${randomUUID()}` };
  evidence.deviceA = `qa-device-a-${randomUUID()}`; evidence.deviceB = `qa-device-b-${randomUUID()}`;
  evidence.pt = blueprint.pt; evidence.manifestSha256 = artifact.manifestSha256; evidence.originalPracticeFlag = originalFlag;
  evidence.preExistingSnapshots = Object.fromEntries(Object.entries(baseline).map(([table, values]) => [table, { count: values.length, sha256: hash(values) }]));
  await saveEvidence();
  stage = 'dedicated creation and cross-owner denial';
  let current = await rpc(student.client, creation(evidence.fixtureIds.studentParent, blueprint.pt, evidence.deviceA));
  assert.equal(current.parent.timed_manifest_sha256, artifact.manifestSha256); assert.deepEqual(current.parent.timed_manifest, blueprint);
  const adminWork = await rpc(admin.client, creation(evidence.fixtureIds.adminParent, blueprint.pt, `qa-admin-${randomUUID()}`));
  await read(student.client, adminWork.parent.id, 'PT401');
  await rpc(student.client, command(adminWork.parent, 'abandon'), 'PT401');
  console.log(JSON.stringify({ fixtureIds: evidence.fixtureIds, adminParentReady: true }));
  check('two dedicated QA parents; student read/command cross-owner denied; admin QA retained ready for root UI proof');
  stage = 'start/checkpoint discarded response and replay';
  current = await rpc(student.client, command(current.parent, 'start-leg', {}, evidence.deviceA));
  const firstLeg = current.parent.timed_manifest.legs[0], firstQid = firstLeg.qids[0];
  const wrong = lrKeys.get(firstQid) === 'A' ? 'B' : 'A';
  const firstAnswer = { qid: firstQid, selected: wrong, correct: false, timeMs: 100, flagged: false };
  const retained = command(current.parent, 'checkpoint', { currentIndex: 1, answers: [firstAnswer] }, evidence.deviceA);
  // Commit, deliberately discard the returned authority, then recover through independent account read.
  // This is lost-application-reply evidence, not a claim that the TCP request was physically interrupted.
  await rpc(student.client, retained);
  current = await read(second.client, current.parent.id);
  current = await rpc(student.client, command(current.parent, 'heartbeat', {}, evidence.deviceA));
  const replay = await rpc(second.client, retained);
  assert.equal(replay.replayed, true); assert.deepEqual(replay.parent, current.parent);
  assert.ok(replay.parent.revision > replay.receipt.committedRevision);
  await rpc(student.client, { ...retained, payload: { ...retained.payload, currentIndex: 0 } }, 'PT412');
  assert.equal(replay.checkpoint.record.attempts.length, 1);
  check('discarded application reply; exact UUID/envelope replay returns current authority; changed payload PT412');
  stage = 'live lease and expired takeover';
  await rpc(second.client, command(current.parent, 'claim', {}, evidence.deviceB), 'PT409');
  const remaining = Date.parse(current.parent.timed_lease_expires_at) - Date.parse(current.serverTime);
  assert.ok(remaining > 0 && remaining <= 35000, 'Acceptance expects reviewed lease at most 35 seconds');
  await wait(remaining + 1200);
  await rpc(student.client, command(current.parent, 'heartbeat', {}, evidence.deviceA), 'PT410');
  const beforeClaim = current.parent;
  current = await rpc(second.client, command(current.parent, 'claim'));
  assert.equal(current.parent.timed_phase, 'leg-paused'); assert.equal(current.parent.timed_writer_epoch, beforeClaim.timed_writer_epoch + 1);
  assert.ok(current.parent.timed_elapsed_ms <= beforeClaim.timed_elapsed_ms + remaining + 50, 'Server settles no further than acknowledged lease');
  const oldReceiptAfterClaim = await rpc(student.client, retained);
  assert.equal(oldReceiptAfterClaim.replayed, true); assert.deepEqual(oldReceiptAfterClaim.parent, current.parent);
  assert.ok(oldReceiptAfterClaim.parent.timed_writer_epoch > retained.writerEpoch);
  await rpc(student.client, { ...command(current.parent, 'resume', {}, evidence.deviceA), writerEpoch: beforeClaim.timed_writer_epoch }, 'PT409');
  current = await rpc(second.client, command(current.parent, 'resume'));
  const concurrent = await Promise.all([student.client, second.client].map(client => client.rpc('commit_timed_work_v1', { p_command: command(current.parent, 'heartbeat') })));
  assert.equal(concurrent.filter(value => !value.error).length, 1); assert.equal(concurrent.find(value => value.error)?.error.code, 'PT409');
  current = concurrent.find(value => !value.error).data;
  check('live foreign claim denied; real expired lease PT410; takeover epoch increments; stale epoch and concurrent CAS denied');
  stage = 'tester-only access revocation';
  flagChanged = true; // Set before request so even a lost admin reply causes an exact restore attempt.
  const revoked = await admin.client.from('profiles').update({ has_practice_access: false }).eq('class_id', student.id).select('has_practice_access').single();
  assert.ok(!revoked.error && revoked.data.has_practice_access === false, 'Tester-only grant revoke failed');
  await rpc(second.client, command(current.parent, 'pause'), 'PT401');
  const preservedRead = await read(second.client, current.parent.id); assert.deepEqual(preservedRead.parent, current.parent);
  const restored = await admin.client.from('profiles').update({ has_practice_access: originalFlag }).eq('class_id', student.id).select('has_practice_access').single();
  assert.ok(!restored.error && restored.data.has_practice_access === originalFlag, 'Tester grant restore failed'); flagChanged = false; evidence.profileRestored = true;
  check('tester-only access revoke denies writes and preserves owner history; exact original flag restored');
  stage = 'official frozen legs and mandatory closeout';
  for (let index = 0; index < blueprint.legs.length; index++) {
    if (index !== 0) current = await rpc(second.client, command(current.parent, 'start-leg'));
    const leg = current.parent.timed_manifest.legs[index]; assert.equal(current.parent.current_leg, index);
    if (leg.kind === 'lr') {
      const qid = leg.qids[0], correctAnswer = lrKeys.get(qid);
      const answer = { qid, selected: correctAnswer === 'A' ? 'B' : 'A', correct: false, timeMs: index === 0 ? 200 : 100, flagged: true };
      current = await rpc(second.client, command(current.parent, 'checkpoint', { currentIndex: 1, answers: [answer], questionStates: [{ qid: leg.qids[1], timeMs: 75, flagged: true, eliminations: ['E'] }] }));
      const reloaded = await read(second.client, current.parent.id);
      assert.ok(reloaded.checkpoint.record.question_states.some(value => value.qid === leg.qids[1] && value.flagged));
      const binding = reloaded.checkpoint.record;
      await deniedDirect(student.client, 'bootcamp_kv', { data: { ...binding, status: 'completed' } }, 'record_id', binding.id);
      await rpc(second.client, command(current.parent, 'close-leg', { answerKeys: [] }), 'PT422');
      current = await rpc(second.client, command(current.parent, 'close-leg', { answerKeys: leg.qids.map(qid => ({ qid, correctAnswer: lrKeys.get(qid) })), analysis: { verification_only: true } }));
      const histories = await rows(student.client, 'section_history', 'practice_test_run_id', current.parent.id);
      const history = histories.find(row => row.practice_test_leg === index);
      assert.ok(history && history.initial_total === leg.questionCount && history.unanswered_count === leg.questionCount - 1);
      const attempts = await rows(student.client, 'attempts', 'timed_pt_run_id', current.parent.id);
      assert.equal(attempts.filter(row => row.timed_pt_leg === index).length, 1);
      const waj = await rows(admin.client, 'wrong_answer_journal', 'class_id', student.id);
      assert.ok(leg.qids.every(qid => waj.some(row => row.qid === qid && row.history_json.length === 1)));
      check(`LR leg ${index}: saved unanswered states; legacy KV blocked; mandatory full-key/history/attempt/WAJ closeout`);
    } else {
      const q = leg.questions[0], key = rcKeys.get(q.questionId); assert.match(key ?? '', /^[A-E]$/);
      const answer = { attemptId: randomUUID(), questionId: q.questionId, passageId: q.passageId, selected: key === 'A' ? 'B' : 'A', isCorrect: false, timeMs: 100, flagged: false, eliminations: [] };
      current = await rpc(second.client, command(current.parent, 'checkpoint', { currentIndex: 0, answers: [answer] }));
      const changed = { ...answer, selected: key, isCorrect: true, timeMs: 200, flagged: true, eliminations: [key === 'A' ? 'B' : 'A'] };
      current = await rpc(second.client, command(current.parent, 'checkpoint', { currentIndex: 1, answers: [changed] }));
      const reloaded = await read(second.client, current.parent.id);
      assert.equal(reloaded.checkpoint.attempts.find(value => value.id === answer.attemptId).selected, key);
      await deniedDirect(student.client, 'rc_attempts', { selected: answer.selected }, 'id', answer.attemptId);
      const sessionId = reloaded.checkpoint.session.id;
      current = await rpc(second.client, command(current.parent, 'close-leg', { analysis: { verification_only: true } }));
      const attempts = await rows(student.client, 'rc_attempts', 'session_id', sessionId);
      assert.equal(attempts.length, leg.questionCount); assert.equal(attempts.filter(value => value.selected !== null).length, 1);
      const sessions = await rows(student.client, 'rc_drill_sessions', 'id', sessionId);
      assert.equal(sessions[0].status, 'completed'); assert.equal(sessions[0].config.analysis.verification_only, true);
      check(`RC leg ${index}: mutable choice stable UUID; reload; raw attempt blocked; blanks and analysis closeout`);
    }
    if (current.parent.current_leg === current.parent.break_after_leg && !current.parent.break_taken) {
      stage = 'break pause and replay';
      current = await rpc(second.client, command(current.parent, 'start-break'));
      const pause = command(current.parent, 'pause');
      await rpc(second.client, pause); current = await read(second.client, current.parent.id);
      const pauseReplay = await rpc(second.client, pause); assert.equal(pauseReplay.replayed, true); assert.deepEqual(pauseReplay.parent, current.parent);
      assert.equal(current.parent.timed_phase, 'break-paused'); assert.equal(current.parent.timed_lease_expires_at, null);
      current = await rpc(second.client, command(current.parent, 'resume'));
      current = await rpc(second.client, command(current.parent, 'heartbeat'));
      current = await rpc(second.client, command(current.parent, 'finish-break'));
      assert.equal(current.parent.break_taken, true); check('server break pause, retained same-command retry, resume/heartbeat/finish');
    }
  }
  stage = 'confirmed completion and terminal barriers';
  assert.equal(current.parent.status, 'complete'); assert.ok(current.parent.completed_at); assert.equal(current.parent.current_leg, blueprint.legs.length);
  assert.equal(current.parent.raw_correct, 1); assert.equal(current.parent.raw_total, blueprint.questionCount); assert.ok(current.parent.scaled_score >= 120);
  await rpc(second.client, command(current.parent, 'heartbeat'), 'PT409');
  await deniedDirect(student.client, 'practice_test_runs', { status: 'in-progress' }, 'id', current.parent.id);
  assert.deepEqual((await read(second.client, current.parent.id)).parent, current.parent);
  check('confirmed parent completion, official aggregates, terminal command/direct-write denial');
  stage = 'original work preservation';
  for (const [table, field] of Object.entries(filters)) {
    const after = await rows(admin.client, table, field, student.id);
    for (const original of baseline[table]) {
      const saved = table === 'bootcamp_kv' ? after.find(row => row.table_name === original.table_name && row.record_id === original.record_id) : after.find(row => row.id === original.id);
      assert.deepEqual(saved, original, `Pre-existing ${table} row must remain identical`);
    }
  }
  check('all snapshotted original student work rows unchanged; QA parents retained; no deletes/notifications/AI grading');
  evidence.final = { revision: current.parent.revision, epoch: current.parent.timed_writer_epoch, status: current.parent.status, completedAt: current.parent.completed_at, rawCorrect: current.parent.raw_correct, rawTotal: current.parent.raw_total, scaledScore: current.parent.scaled_score };
  evidence.passed = true;
} catch (error) {
  evidence.passed = false;
  // Assertions name stages/contracts, never credentials, JWTs, or RPC headers.
  evidence.failure = { stage, message: error instanceof Error ? error.message.split('\n')[0] : 'Acceptance failed' };
  process.exitCode = 1;
} finally {
  if (flagChanged && admin && student && typeof originalFlag === 'boolean') {
    try {
      const result = await admin.client.from('profiles').update({ has_practice_access: originalFlag }).eq('class_id', student.id).select('has_practice_access').single();
      evidence.profileRestored = !result.error && result.data?.has_practice_access === originalFlag;
    } catch { evidence.profileRestored = false; }
    if (!evidence.profileRestored) { evidence.passed = false; evidence.restorationFailure = 'Exact tester practice flag restore was not confirmed'; process.exitCode = 1; }
  }
  await saveEvidence();
  console.log(JSON.stringify(evidence));
}
