// Real PostgreSQL, separate authenticated connections, synthetic fixtures only.
// Refuses any server whose data directory is not the explicitly named test cluster.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { setupSql, owner, other, blueprint, manifestHash, createCommand, commandFor } from './timed-pt-writer-fixtures.mjs';

const argument = name => process.argv[process.argv.indexOf(name) + 1];
for (const flag of ['--pg-module', '--port', '--data-dir']) if (!process.argv.includes(flag)) throw new Error(`Required ${flag}`);
const port = Number(argument('--port'));
assert.ok(Number.isInteger(port) && port > 1024 && port < 65536);
const { default: pg } = await import(pathToFileURL(resolve(argument('--pg-module'))).href);
const settings = { host: '127.0.0.1', port, user: 'lsatu_test', database: 'postgres', application_name: 'lsatu-timed-synthetic-verification' };
const clients = [];
async function connection(database = 'postgres', actor = null, user = settings.user) {
  const client = new pg.Client({ ...settings, database, user });
  await client.connect(); clients.push(client);
  await client.query("set statement_timeout='15s'");
  if (actor) {
    await client.query("select set_config('request.jwt.claim.sub',$1,false)", [actor]);
    await client.query('set role authenticated');
  }
  return client;
}
const normalize = value => value.replaceAll('\\', '/').replace(/\/$/, '').toLowerCase();
let assertions = 0;
const check = (actual, expected) => { assert.deepEqual(actual, expected); assertions++; };
const commit = async (client, command) => (await client.query('select public.commit_timed_work_v1($1::jsonb) as result', [JSON.stringify(command)])).rows[0].result;
const create = async (client, command) => (await client.query('select public.create_timed_practice_test_v1($1::jsonb) as result', [JSON.stringify(command)])).rows[0].result;
const answer = (qid, selected = 'A') => ({ currentIndex: 1, answers: [{ qid, selected, correct: false, timeMs: 700 }] });
const rejectCode = async (promise, codes) => {
  await assert.rejects(promise, error => codes.includes(error.code)); assertions++;
};
async function waitForLock(observer, client) {
  const pid = client.processID;
  for (let attempt = 0; attempt < 500; attempt++) {
    const result = await observer.query('select wait_event_type from pg_stat_activity where pid=$1', [pid]);
    if (result.rows[0]?.wait_event_type === 'Lock') return;
  }
  throw new Error('Expected an independently blocked PostgreSQL connection');
}
try {
  const controller = await connection();
  const directory = (await controller.query('show data_directory')).rows[0].data_directory;
  assert.equal(normalize(directory), normalize(resolve(argument('--data-dir'))));
  assert.ok(/lsatu-pg-atomic-/.test(directory), 'Use a dedicated synthetic test cluster');
  const database = `lsatu_timed_${Date.now()}_${randomUUID().slice(0, 8)}`;
  await controller.query(`create database "${database}"`);
  const admin = await connection(database);
  // Roles are cluster-wide; reuse only inside this verified dedicated cluster.
  await admin.query(setupSql.replace('create role authenticated; create role anon;', () =>
    "do $$ begin if not exists(select from pg_roles where rolname='authenticated') then create role authenticated; end if; if not exists(select from pg_roles where rolname='anon') then create role anon; end if; end $$;"));
  for (const name of ['2026-09-30-timed-pt-control-foundation.sql', '2026-09-30-timed-pt-writer.sql']) {
    await admin.query(await readFile(new URL(`../../docs/implementation-plans/artifacts/${name}`, import.meta.url), 'utf8'));
  }
  await admin.query('insert into public.timed_content_manifests_v1 values($1,140,$2::jsonb)', [manifestHash, JSON.stringify(blueprint)]);
  await admin.query('update public.timed_pt_configuration_v1 set enabled=true,manifest_sha256=$1,lease_ms=45000', [manifestHash]);
  const ordinaryRole = `lsatu_client_${randomUUID().replaceAll('-', '')}`;
  await controller.query(`create role ${ordinaryRole} login nosuperuser nocreaterole nocreatedb nobypassrls noinherit`);
  await controller.query(`grant authenticated to ${ordinaryRole} with set true`);
  const a = await connection(database, owner, ordinaryRole), b = await connection(database, owner, ordinaryRole), foreign = await connection(database, other, ordinaryRole);
  await rejectCode(a.query('set role timed_pt_executor'), ['42501']);

  // Missing-row creation and the receipt are serialized, including a lost reply.
  const envelope = createCommand('concurrent-create', randomUUID());
  const creations = await Promise.all([create(a, envelope), create(b, envelope)]);
  check(creations.filter(result => result.replayed).length, 1);
  check((await admin.query('select count(*)::int as n from public.timed_pt_receipts_v1')).rows[0].n, 1);
  let state = (await commit(a, commandFor(creations[0].parent, 'start-leg', {}, randomUUID()))).parent;

  // Two distinct commands at the same revision cannot both acknowledge choices.
  const contenders = await Promise.allSettled([
    commit(a, commandFor(state, 'checkpoint', answer('PT140-S1-Q1'), randomUUID())),
    commit(b, commandFor(state, 'checkpoint', answer('PT140-S1-Q2', 'B'), randomUUID())),
  ]);
  check(contenders.filter(result => result.status === 'fulfilled').length, 1);
  check(contenders.filter(result => result.status === 'rejected' && result.reason.code === 'PT409').length, 1);
  const winner = contenders.find(result => result.status === 'fulfilled').value;
  state = winner.parent;
  check(winner.checkpoint.record.attempts.length, 1);
  const oldCommand = winner.receipt.command;
  const pause = await commit(a, commandFor(state, 'pause', {}, randomUUID()));
  state = pause.parent;
  const replay = await commit(b, oldCommand);
  check(replay.replayed, true); check(replay.parent.revision, state.revision);
  await rejectCode(commit(a, { ...oldCommand, payload: answer('PT140-S1-Q2', 'E') }), ['PT412']);

  // The takeover holds the parent lock while a real old writer waits.
  await b.query('begin');
  await b.query('select id from public.practice_test_runs where id=$1 for update', [state.id]);
  const delayedWrite = commit(a, commandFor(state, 'checkpoint', answer('PT140-S1-Q2'), randomUUID()));
  delayedWrite.catch(() => {});
  await waitForLock(admin, a);
  const takeover = await commit(b, commandFor(state, 'claim', {}, randomUUID(), 'device-b'));
  await b.query('commit');
  await rejectCode(delayedWrite, ['PT409', 'PT410']);
  check(takeover.parent.timed_writer_epoch, state.timed_writer_epoch + 1);
  check(takeover.checkpoint.record.attempts.length, 1);
  state = takeover.parent;

  // An in-flight checkpoint waits for the actual entitlement row being revoked.
  state = (await commit(b, commandFor(state, 'resume', {}, randomUUID(), 'device-b'))).parent;
  await admin.query('begin');
  await admin.query('update public.profiles set has_practice_access=false where class_id=$1', [owner]);
  const revokedWrite = commit(b, commandFor(state, 'checkpoint', answer('PT140-S1-Q2'), randomUUID(), 'device-b'));
  revokedWrite.catch(() => {});
  await waitForLock(controller, b);
  await admin.query('commit');
  await rejectCode(revokedWrite, ['PT401']);
  check((await admin.query('select revision from public.practice_test_runs where id=$1', [state.id])).rows[0].revision, state.revision);
  check((await admin.query("select jsonb_array_length(data->'attempts') as n from public.bootcamp_kv where user_id=$1", [owner])).rows[0].n, 1);
  // A previously committed receipt remains acknowledgeable after revocation.
  check((await commit(b, oldCommand)).replayed, true);
  await rejectCode(commit(foreign, commandFor(state, 'claim', {}, randomUUID(), 'foreign-device')), ['PT401', 'PT409']);

  // Failure after mandatory LR projections rolls back answers, WAJ and parent.
  await admin.query('update public.profiles set has_practice_access=true where class_id=$1', [owner]);
  const keys = { answerKeys: blueprint.legs[0].questions.map(q => ({ qid: q.qid, correctAnswer: 'A' })) };
  await admin.query("create function public.fixture_closeout_failure() returns trigger language plpgsql as $$ begin raise exception 'Synthetic mandatory closeout failure'; end $$");
  await admin.query('create trigger fixture_closeout_failure before insert on public.section_history for each row execute function public.fixture_closeout_failure()');
  await rejectCode(commit(b, commandFor(state, 'close-leg', keys, randomUUID(), 'device-b')), ['P0001']);
  check((await admin.query('select count(*)::int as n from public.attempts')).rows[0].n, 0);
  check((await admin.query('select count(*)::int as n from public.wrong_answer_journal')).rows[0].n, 0);
  check((await admin.query('select revision from public.practice_test_runs where id=$1', [state.id])).rows[0].revision, state.revision);
  await admin.query('drop trigger fixture_closeout_failure on public.section_history');
  state = (await commit(b, commandFor(state, 'close-leg', keys, randomUUID(), 'device-b'))).parent;
  check(state.current_leg, 1);
  check((await admin.query('select count(*)::int as n from public.section_history')).rows[0].n, 1);
  check((await admin.query('select count(*)::int as n from public.wrong_answer_journal')).rows[0].n, 2);

  // RC first answers, blanks and parent closeout use the same transaction.
  state = (await commit(b, commandFor(state, 'start-leg', {}, randomUUID(), 'device-b'))).parent;
  const rcAttempt = { attemptId: randomUUID(), questionId: 1001, passageId: 101, selected: 'A', isCorrect: true, timeMs: 300 };
  const rcCommand = commandFor(state, 'checkpoint', { currentIndex: 1, answers: [rcAttempt] }, randomUUID(), 'device-b');
  state = (await commit(b, rcCommand)).parent;
  const rcReplay = await commit(b, rcCommand);
  check(rcReplay.replayed, true); check(rcReplay.checkpoint.attempts.length, 1);
  await rejectCode(commit(b, commandFor(state, 'checkpoint', { currentIndex: 1, answers: [{ ...rcAttempt, attemptId: randomUUID() }] }, randomUUID(), 'device-b')), ['PT409']);
  state = (await commit(b, commandFor(state, 'close-leg', {}, randomUUID(), 'device-b'))).parent;
  check(state.current_leg, 2); check(state.legs[1].correct, 1); check(state.legs[1].answered, 1);
  check((await admin.query('select count(*)::int as n from public.rc_attempts')).rows[0].n, 2);

  // An unreceived pause cannot stop server time instantly: claim caps the
  // unsettled interval at the acknowledged lease, then pauses the break.
  state = (await commit(b, commandFor(state, 'start-break', {}, randomUUID(), 'device-b'))).parent;
  const heartbeat = await commit(b, commandFor(state, 'heartbeat', {}, randomUUID(), 'device-b'));
  check(heartbeat.parent.timed_phase, 'break-running');
  assert.ok(Date.parse(heartbeat.parent.timed_lease_expires_at) >= Date.parse(state.timed_lease_expires_at)); assertions++;
  state = heartbeat.parent;
  await admin.query('set role timed_pt_executor');
  state = (await admin.query("update public.practice_test_runs set timed_running_anchor=clock_timestamp()-interval '60 seconds',timed_lease_expires_at=clock_timestamp()-interval '15 seconds',revision=revision+1 where id=$1 returning to_jsonb(practice_test_runs) as parent", [state.id])).rows[0].parent;
  await admin.query('reset role');
  await rejectCode(commit(b, commandFor(state, 'heartbeat', {}, randomUUID(), 'device-b')), ['PT410']);
  const recovered = await commit(a, commandFor(state, 'claim', {}, randomUUID(), 'device-c'));
  check(recovered.parent.timed_phase, 'break-paused');
  assert.ok(recovered.parent.timed_elapsed_ms >= Number(state.timed_elapsed_ms) + 44999 && recovered.parent.timed_elapsed_ms <= Number(state.timed_elapsed_ms) + 45001); assertions++;
  state = (await commit(a, commandFor(recovered.parent, 'finish-break', {}, randomUUID(), 'device-c'))).parent;
  check(state.break_taken, true);
  state = (await commit(a, commandFor(state, 'start-leg', {}, randomUUID(), 'device-c'))).parent;
  state = (await commit(a, commandFor(state, 'close-leg', { answerKeys: blueprint.legs[2].questions.map(q => ({ qid: q.qid, correctAnswer: 'A' })) }, randomUUID(), 'device-c'))).parent;
  check(state.status, 'complete'); check(state.raw_total, 6); check(state.raw_correct, 1);
  check(state.score_source, 'estimate');
  await rejectCode(commit(a, commandFor(state, 'claim', {}, randomUUID(), 'device-c')), ['PT409']);

  // Repeat in-flight entitlement revocation for each alternative grant path.
  await admin.query('update public.profiles set has_practice_access=false where class_id=$1', [owner]);
  for (const grant of ['role', 'assignment']) {
    if (grant === 'role') await admin.query("insert into public.user_roles(user_id,role) values($1,'admin')", [owner]);
    else await admin.query("insert into public.practice_test_assignments(student_id,pt,status) values($1,140,'assigned')", [owner]);
    let granted = (await create(a, createCommand(`grant-${grant}`, randomUUID()))).parent;
    granted = (await commit(a, commandFor(granted, 'start-leg', {}, randomUUID()))).parent;
    await admin.query('begin');
    if (grant === 'role') await admin.query("update public.user_roles set role='student' where user_id=$1", [owner]);
    else await admin.query("update public.practice_test_assignments set status='archived' where student_id=$1", [owner]);
    const waiting = commit(a, commandFor(granted, 'checkpoint', answer('PT140-S1-Q1'), randomUUID()));
    waiting.catch(() => {});
    await waitForLock(controller, a);
    await admin.query('commit');
    await rejectCode(waiting, ['PT401']);
    check((await admin.query('select revision from public.practice_test_runs where id=$1', [granted.id])).rows[0].revision, granted.revision);
  }

  console.log(JSON.stringify({ assertions, database, server: '127.0.0.1', port, syntheticOnly: true, productionWrites: false }));
} finally {
  // Preserve the synthetic database for diagnostics; no user records are removed.
  await Promise.allSettled(clients.map(client => client.end()));
}
