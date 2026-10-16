import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

// This verifier only connects to the retained, explicitly owned local cluster.
// Each invocation creates a fresh database and keeps it for inspection.
const modulePath = process.env.PG_MODULE ?? 'C:/Users/Joshu/AppData/Local/Temp/lsatu-db-validation/node_modules/pg/lib/index.js';
const { default: pg } = await import(pathToFileURL(modulePath).href);
const connection = { host: '127.0.0.1', port: 55437, user: 'lsatu_test' };
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const database = `activity_ai_${suffix}`;
const installer = `activity_installer_${suffix}`;
const ordinary = `activity_ordinary_${suffix}`;
const root = new pg.Client({ ...connection, database: 'postgres' });
await root.connect();
for (const role of ['anon', 'authenticated', 'service_role']) {
  if (!(await root.query('select 1 from pg_roles where rolname=$1', [role])).rowCount) await root.query(`create role ${role} nologin nosuperuser nocreaterole nocreatedb nobypassrls`);
}
await root.query(`create role ${installer} nologin nosuperuser nocreaterole nocreatedb bypassrls`);
await root.query(`create role ${ordinary} login nosuperuser nocreaterole nocreatedb nobypassrls`);
await root.query(`grant authenticated to ${ordinary}`);
await root.query(`create database ${database} owner ${installer}`);
await root.end();
const db = new pg.Client({ ...connection, database }); await db.connect();
await db.query(`set role ${installer}`);
await db.query(`create table profiles(class_id text primary key,archived_at timestamptz,has_activity_access boolean);
create table user_roles(user_id uuid,role text);
create table activities(id uuid primary key,created_by uuid,item_format text,items jsonb,instructions jsonb);
create table activity_assignments(id uuid primary key,student_id uuid,item_format text,items jsonb,instructions jsonb,status text,revoked_at timestamptz);
create table activity_item_responses(id uuid primary key,assignment_id uuid,student_id uuid,item_order integer,response_text text,verdict text,attempt_no integer);`);
const owner = randomUUID(), other = randomUUID(), assignment = randomUUID(), foreign = randomUUID();
const item = { order: 1, prompt: 'Only if the vent opens, the greenhouse cools.', credited_answers: ['If it cools, the vent opens.'], explanation: 'Keep the necessary condition.', category: 'conditional' };
await db.query('insert into profiles values($1,null,false),($2,null,false)', [owner, other]);
for (const [id, who] of [[assignment, owner], [foreign, other]]) await db.query('insert into activity_assignments values($1,$2,\'free-text\',$3,$4,\'assigned\',null)', [id, who, JSON.stringify([item]), JSON.stringify({ coach: { drill: 'Conditional rephrase', rubric: ['Keep direction.'] } })]);
const snapshotSql = `select jsonb_build_object('profiles',(select jsonb_agg(to_jsonb(t) order by class_id) from profiles t),'roles',(select jsonb_agg(to_jsonb(t)) from user_roles t),'activities',(select jsonb_agg(to_jsonb(t)) from activities t),'assignments',(select jsonb_agg(to_jsonb(t) order by id) from activity_assignments t),'responses',(select jsonb_agg(to_jsonb(t)) from activity_item_responses t)) value`;
const original = (await db.query(snapshotSql)).rows[0].value;
await db.query(await readFile(new URL('../../supabase/migrations/20261001120000_activity_ai_admission_v1.sql', import.meta.url), 'utf8'));
assert.deepEqual((await db.query(snapshotSql)).rows[0].value, original);
assert.equal((await db.query('select current_user')).rows[0].current_user, installer);
await db.query('update activity_ai_configuration_v1 set enabled=true');
await db.query('reset role');
let checks = 2;
const eq = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
const clients = await Promise.all(Array.from({ length: 4 }, async () => {
  const client = new pg.Client({ ...connection, database }); await client.connect(); await client.query('set role service_role'); return client;
}));
async function begin(client, response, who = owner, source = assignment, id = randomUUID()) {
  return (await client.query('select begin_activity_ai_request_v1($1,$2,\'assignment\',$3,1,$4,1) value', [who, id, source, response])).rows[0].value;
}
async function dispatch(client, receipt) {
  return (await client.query('select dispatch_activity_ai_request_v1($1,$2,$3) value', [owner, receipt.requestId, receipt.claimId])).rows[0].value;
}
async function finish(client, receipt) {
  return (await client.query('select finish_activity_ai_request_v1($1,$2,$3,$4,null) value', [owner, receipt.requestId, receipt.claimId, JSON.stringify({ verdict: 'correct', feedback: 'Saved.' })])).rows[0].value;
}
const admissions = await Promise.all(clients.map(client => begin(client, 'Same semantic answer')));
eq(admissions.map(r => r.status).sort(), ['in_flight', 'in_flight', 'in_flight', 'reserved']);
eq(new Set(admissions.map(r => r.receiptId)).size, 1);
eq((await db.query('select sum(admissions)::int n from activity_ai_budget_buckets_v1')).rows[0].n, 3);
eq((await db.query('select count(*)::int n from activity_ai_request_keys_v1')).rows[0].n, 4);
const receipt = admissions.find(r => r.status === 'reserved');
const dispatched = await Promise.all(clients.map(client => dispatch(client, receipt)));
eq(dispatched.map(r => r.status).sort(), ['dispatched', 'in_flight', 'in_flight', 'in_flight']);
eq(dispatched.find(r => r.status === 'dispatched').payload, receipt.payload);
const finished = await Promise.all(clients.map(client => finish(client, receipt)));
eq(finished.map(r => r.status).sort(), ['cached', 'cached', 'cached', 'completed']);
eq((await begin(clients[0], 'Same semantic answer')).status, 'cached');
// Race actor concurrency 3: four independent intents admit exactly three.
const concurrent = await Promise.all(clients.map((client, i) => begin(client, `Distinct answer ${i}`)));
eq(concurrent.map(r => r.status).sort(), ['denied', 'reserved', 'reserved', 'reserved']);
eq(concurrent.find(r => r.status === 'denied').code, 'concurrency_limited');
eq((await db.query('select sum(admissions)::int n from activity_ai_budget_buckets_v1')).rows[0].n, 12);
const reclaimTarget = concurrent.find(r => r.status === 'reserved');
await db.query('update activity_ai_receipts_v1 set lease_expires_at=clock_timestamp()-interval \'1 second\' where id=$1', [reclaimTarget.receiptId]);
const reclaimed = await Promise.all(clients.map(client => begin(client, reclaimTarget.payload.studentResponse)));
eq(reclaimed.map(r => r.status).sort(), ['in_flight', 'in_flight', 'in_flight', 'reserved']);
const nextClaim = reclaimed.find(r => r.status === 'reserved'); assert.notEqual(nextClaim.claimId, reclaimTarget.claimId); checks++;
eq((await dispatch(clients[0], reclaimTarget)).code, 'claim_conflict');
eq((await db.query('select sum(admissions)::int n from activity_ai_budget_buckets_v1')).rows[0].n, 12);
await dispatch(clients[0], nextClaim);
await db.query('update activity_ai_receipts_v1 set lease_expires_at=clock_timestamp()-interval \'1 second\' where id=$1', [nextClaim.receiptId]);
const unknown = await Promise.all(clients.map(client => begin(client, nextClaim.payload.studentResponse)));
eq(unknown.every(r => r.status === 'uncertain'), true);
eq((await dispatch(clients[0], nextClaim)).status, 'uncertain');
eq((await db.query('select sum(admissions)::int n from activity_ai_budget_buckets_v1')).rows[0].n, 12);
// Global daily capacity race across distinct owners. Existing counter is four.
await db.query('update activity_ai_configuration_v1 set actor_concurrency=10,global_day=5');
const global = await Promise.all([begin(clients[0], 'Global A'), begin(clients[1], 'Global B', other, foreign)]);
eq(global.map(r => r.status).sort(), ['denied', 'reserved']); eq(global.find(r => r.status === 'denied').code, 'rate_limited');
eq((await db.query("select admissions from activity_ai_budget_buckets_v1 where kind='global-day'")).rows[0].admissions, 5);
const caller = new pg.Client({ ...connection, user: ordinary, database }); await caller.connect();
await caller.query('set role authenticated');
for (const sql of ['select * from activity_ai_receipts_v1', `select begin_activity_ai_request_v1('${owner}','${randomUUID()}','assignment','${assignment}',1,'answer',1)`, 'set role service_role', `set role ${installer}`]) {
  await assert.rejects(caller.query(sql), /permission denied/); checks++;
}
await caller.query('reset role'); await caller.end();
for (const table of ['activity_ai_configuration_v1', 'activity_ai_receipts_v1', 'activity_ai_request_keys_v1', 'activity_ai_budget_buckets_v1']) {
  await assert.rejects(clients[0].query(`select * from ${table}`), /permission denied/); checks++;
}
eq((await db.query(snapshotSql)).rows[0].value, original);
eq((await db.query(`select count(*)::int n from pg_proc where proname in ('begin_activity_ai_request_v1','dispatch_activity_ai_request_v1','finish_activity_ai_request_v1') and pg_get_userbyid(proowner)=$1`, [installer])).rows[0].n, 3);
for (const client of clients) await client.end(); await db.end();
console.log(`Activity AI real PostgreSQL: ${checks} race/role/preservation assertions passed. Retained database ${database}; installer ${installer}; ordinary login ${ordinary}. No live writes, no AI calls.`);
