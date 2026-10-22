import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const modulePath = process.env.PGLITE_MODULE ?? 'C:/Users/Joshu/AppData/Local/Temp/lsatu-db-validation/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
let checks = 0;
function eq(actual, expected) { assert.deepEqual(actual, expected); checks++; }
const owner = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const admin = '10000000-0000-4000-8000-000000000003';
const assignment = '20000000-0000-4000-8000-000000000001';
const foreign = '20000000-0000-4000-8000-000000000002';
const preview = '20000000-0000-4000-8000-000000000003';
const item = { order: 1, prompt: 'Only if the vent opens, the greenhouse cools.', credited_answers: ['If it cools, the vent opens.'], explanation: 'the big ideas: (1) first idea · (2) second idea. Named traps: reverse', category: 'conditional' };
await db.exec(`create role anon; create role authenticated; create role service_role;
create table public.profiles(class_id text primary key,archived_at timestamptz,has_activity_access boolean);
create table public.user_roles(user_id uuid,role text);
create table public.activities(id uuid primary key,created_by uuid,item_format text,items jsonb,instructions jsonb);
create table public.activity_assignments(id uuid primary key,student_id uuid,item_format text,items jsonb,instructions jsonb,status text,revoked_at timestamptz);
create table public.activity_item_responses(id uuid primary key,assignment_id uuid,student_id uuid,item_order integer,response_text text,verdict text,attempt_no integer);
grant usage on schema public to anon,authenticated,service_role;`);
await db.query('insert into profiles values($1,null,false),($2,null,false),($3,null,false)', [owner, other, admin]);
await db.query('insert into user_roles values($1,\'admin\')', [admin]);
const instructions = { coach: { drill: 'Conditional rephrase', rubric: ['Preserve only-if direction.'] } };
for (const [id, who] of [[assignment, owner], [foreign, other]]) {
  await db.query('insert into activity_assignments values($1,$2,\'free-text\',$3,$4,\'assigned\',null)', [id, who, JSON.stringify([item]), JSON.stringify(instructions)]);
}
await db.query('insert into activities values($1,$2,\'free-text\',$3,$4)', [preview, admin, JSON.stringify([item]), JSON.stringify(instructions)]);
const sourceTables = ['profiles', 'user_roles', 'activities', 'activity_assignments', 'activity_item_responses'];
async function snapshot() {
  const result = {};
  for (const table of sourceTables) result[table] = (await db.query(`select coalesce(jsonb_agg(v order by v::text),'[]') data from (select to_jsonb(t) v from ${table} t) x`)).rows[0].data;
  return result;
}
let baseline = await snapshot();
await db.exec(await readFile(new URL('../../supabase/migrations/20261001120000_activity_ai_admission_v1.sql', import.meta.url), 'utf8'));
eq(await snapshot(), baseline);
async function rpc(name, values) {
  await db.exec('set role service_role');
  try { return (await db.query(`select public.${name}(${values.map((_, i) => '$' + (i + 1)).join(',')}) value`, values)).rows[0].value; }
  finally { await db.exec('reset role'); }
}
const begin = (response = 'If it cools, the vent opens.', overrides = {}) => rpc('begin_activity_ai_request_v1', [overrides.owner ?? owner, overrides.id ?? randomUUID(), overrides.kind ?? 'assignment', overrides.source ?? assignment, overrides.order ?? 1, response, overrides.attempt ?? 1]);
const dispatch = (r, who = owner) => rpc('dispatch_activity_ai_request_v1', [who, r.requestId, r.claimId]);
const finish = (r, result, failure = null, who = owner) => rpc('finish_activity_ai_request_v1', [who, r.requestId, r.claimId, result === null ? null : JSON.stringify(result), failure]);
const state = async r => (await db.query('select state from activity_ai_receipts_v1 where id=$1', [r.receiptId])).rows[0].state;
const budget = async () => (await db.query('select coalesce(sum(admissions),0)::int n from activity_ai_budget_buckets_v1')).rows[0].n;
async function expire(r) { await db.query('update activity_ai_receipts_v1 set lease_expires_at=clock_timestamp()-interval \'1 second\' where id=$1', [r.receiptId]); }
async function denied(sql, role) {
  await db.exec(`set role ${role}`);
  try { await assert.rejects(db.exec(sql), /permission denied/); checks++; }
  finally { await db.exec('reset role'); }
}
for (const role of ['anon', 'authenticated']) {
  for (const table of ['activity_ai_configuration_v1', 'activity_ai_receipts_v1', 'activity_ai_request_keys_v1', 'activity_ai_budget_buckets_v1']) await denied(`select * from ${table}`, role);
  await denied(`select begin_activity_ai_request_v1('${owner}','${randomUUID()}','assignment','${assignment}',1,'answer',1)`, role);
  await denied(`select dispatch_activity_ai_request_v1('${owner}','${randomUUID()}','${randomUUID()}')`, role);
  await denied(`select finish_activity_ai_request_v1('${owner}','${randomUUID()}','${randomUUID()}',null,'uncertain')`, role);
}
await denied('select * from activity_ai_receipts_v1', 'service_role');
eq((await begin()).code, 'contract_disabled'); eq(await budget(), 0);
await db.exec('update activity_ai_configuration_v1 set enabled=true,actor_concurrency=10');
const beforeCoachTests = await snapshot();
const beforeCoachBudget = await budget();
for (const coach of ['bad', [], {}, { drill: '', rubric: ['Preserve direction.'] }, { drill: 'Conditional', rubric: 'not an array' }, { drill: 'Conditional', rubric: [] }, { drill: 'Conditional', rubric: [null] }, { drill: 'Conditional', rubric: [' '] }, { drill: 'Conditional', rubric: ['x'.repeat(4001)] }, { drill: 'x'.repeat(1001), rubric: ['Rule'] }, { drill: 'Conditional', rubric: ['Rule'], partial_rule: null }, { drill: 'Conditional', rubric: ['Rule'], partial_rule: 'x'.repeat(4001) }]) {
  await db.query('update activity_assignments set instructions=$2 where id=$1', [assignment, JSON.stringify({ coach })]);
  eq((await begin('Invalid present coach')).code, 'source_unavailable');
}
await db.query('update activity_assignments set instructions=$2 where id=$1', [assignment, JSON.stringify(instructions)]);
eq(await budget(), beforeCoachBudget); eq(await snapshot(), beforeCoachTests);
// Legacy absent/null briefs are valid sources; disabled gate proves they reach
// admission without creating a receipt or consuming a budget.
await db.exec('update activity_ai_configuration_v1 set enabled=false');
for (const legacyInstructions of [{}, { coach: null }]) {
  await db.query('update activity_assignments set instructions=$2 where id=$1', [assignment, JSON.stringify(legacyInstructions)]);
  eq((await begin('Legacy brief')).code, 'contract_disabled');
}
await db.query('update activity_assignments set instructions=$2 where id=$1', [assignment, JSON.stringify(instructions)]);
await db.exec('update activity_ai_configuration_v1 set enabled=true');
eq(await snapshot(), beforeCoachTests); eq(await budget(), beforeCoachBudget);
eq((await begin('answer', { source: foreign })).code, 'source_unavailable');
eq((await begin('answer', { kind: 'preview', source: preview })).code, 'source_unavailable');
eq((await begin('answer', { owner: other, kind: 'preview', source: preview })).code, 'source_unavailable');
eq((await begin('', {})).code, 'invalid_request');
eq((await begin('x'.repeat(10001))).code, 'invalid_request');
eq((await begin('x' + ' '.repeat(10000))).code, 'invalid_request');
eq((await begin('answer', { attempt: 2 })).code, 'source_unavailable');
eq((await begin('answer', { attempt: 3 })).code, 'invalid_request');
eq((await begin('answer', { order: 0 })).code, 'invalid_request');
const first = await begin(); eq(first.status, 'reserved'); eq(first.payload.statement, item.prompt); eq(first.payload.creditedAnswers, item.credited_answers);
eq(first.payload.ideas, [{ n: 1, text: 'first idea' }, { n: 2, text: 'second idea' }]); eq(first.payload.firstAttemptConfirmed, false); eq(await budget(), 3);
const alias = await begin(); eq(alias.status, 'in_flight'); eq(alias.receiptId, first.receiptId); eq(await budget(), 3);
eq((await begin('different', { id: first.requestId })).code, 'request_conflict');
eq((await finish(first, { verdict: 'correct', feedback: 'Good.' })).code, 'not_dispatched');
eq((await dispatch(first, other)).code, 'claim_conflict');
const dispatchedFirst = await dispatch(first); eq(dispatchedFirst.status, 'dispatched'); eq(dispatchedFirst.payload, first.payload); eq((await dispatch(first)).status, 'in_flight');
for (const invalid of [{ feedback: 'Good.' }, { verdict: 'invented', feedback: 'Good.' }, { verdict: 'correct', feedback: ' ' }, { verdict: 'correct', feedback: 'x' + ' '.repeat(2000) }, { verdict: 'correct', feedback: 'Good.', extra: true }]) eq((await finish(first, invalid)).code, 'invalid_result');
for (const covered of [[3], ['1'], [0], null]) eq((await finish(first, { verdict: 'correct', feedback: 'Good.', covered })).code, 'invalid_coverage');
eq(await state(first), 'dispatched');
const result = { verdict: 'correct', feedback: 'Good.', covered: [] };
eq((await finish(first, result)).status, 'completed'); eq((await finish(first, result)).status, 'cached');
eq((await finish(first, { ...result, feedback: 'Different.' })).code, 'finish_conflict');
eq((await begin()).status, 'cached'); eq(await budget(), 3);
eq((await begin('Second try', { attempt: 2 })).code, 'source_unavailable');
await db.query('insert into activity_item_responses values($1,$2,$3,1,\'forged\',\'correct\',1)', [randomUUID(), assignment, owner]);
eq((await begin('Forged history', { attempt: 2 })).code, 'source_unavailable');
await db.query('insert into activity_item_responses values($1,$2,$3,1,$4,\'correct\',1)', [randomUUID(), assignment, owner, first.payload.studentResponse]);
baseline = await snapshot();
const second = await begin('Second try', { attempt: 2 }); eq(second.status, 'reserved'); eq(second.payload.firstAttemptConfirmed, true);
eq((await dispatch(second)).status, 'dispatched'); eq((await finish(second, null, 'provider_error')).status, 'failed'); eq((await begin('Second try', { attempt: 2 })).status, 'failed');
const uncertain = await begin('Uncertain answer'); await dispatch(uncertain);
eq((await finish(uncertain, null, 'uncertain')).status, 'uncertain'); eq(await state(uncertain), 'uncertain');
await expire(uncertain); eq((await begin('Uncertain answer')).status, 'uncertain'); eq((await dispatch(uncertain)).status, 'uncertain');
eq((await finish(uncertain, { verdict: 'partial', feedback: 'Known late result.' })).status, 'completed');
const expiredDispatch = await begin('Expired dispatch'); await dispatch(expiredDispatch); await expire(expiredDispatch);
eq((await begin('Expired dispatch')).status, 'uncertain'); eq((await dispatch(expiredDispatch)).status, 'uncertain');
const reclaim = await begin('Reserved only'); const priorBudget = await budget(); await expire(reclaim);
const reclaimed = await begin('Reserved only', { id: reclaim.requestId }); eq(reclaimed.status, 'reserved'); assert.notEqual(reclaimed.claimId, reclaim.claimId); checks++; eq(await budget(), priorBudget);
eq((await dispatch(reclaim)).code, 'claim_conflict'); await dispatch(reclaimed); await finish(reclaimed, null, 'cancelled');
const maxResponse = await begin('x'.repeat(10000)); eq(maxResponse.status, 'reserved');
await dispatch(maxResponse); await finish(maxResponse, null, 'cancelled');
eq(await snapshot(), baseline);
// All deliberate source edits below are setup for revoked/changed/duplicate guards.
const revoked = await begin('Revoked after admission');
await db.query('update activity_assignments set revoked_at=clock_timestamp() where id=$1', [assignment]);
eq((await dispatch(revoked)).code, 'source_unavailable'); eq((await begin()).code, 'source_unavailable');
eq((await dispatch(first)).code, 'source_unavailable'); eq((await finish(first, result)).code, 'source_unavailable');
await db.query('update activity_assignments set revoked_at=null where id=$1', [assignment]);
const changed = await begin('Changed after admission');
await db.query('update activity_assignments set items=$2 where id=$1', [assignment, JSON.stringify([{ ...item, prompt: 'Changed prompt' }])]);
eq((await dispatch(changed)).code, 'source_changed');
eq((await begin('Second against changed item', { attempt: 2 })).code, 'source_unavailable');
await db.query('update activity_assignments set items=$2 where id=$1', [assignment, JSON.stringify([item, item])]);
eq((await begin('Duplicate order')).code, 'source_unavailable');
await db.query('update activity_assignments set items=$2 where id=$1', [assignment, JSON.stringify([item, { ...item, order: '1' }])]);
eq((await begin('Duplicate string order')).code, 'source_unavailable');
await db.query('update activity_assignments set items=$2 where id=$1', [assignment, JSON.stringify([item])]);
for (const invalidItem of [{ ...item, credited_answers: {} }, { ...item, credited_answers: null }, { ...item, credited_answers: [null] }, { ...item, ideas: {} }, { ...item, ideas: [{ n: '1', text: 'Idea' }] }]) {
  await db.query('update activity_assignments set items=$2 where id=$1', [assignment, JSON.stringify([invalidItem])]);
  eq((await begin('Malformed trusted item')).code, 'source_unavailable');
}
await db.query('update activity_assignments set items=$2,item_format=null where id=$1', [assignment, JSON.stringify([item])]);
eq((await begin('Missing format')).code, 'source_unavailable');
await db.query('update activity_assignments set item_format=\'free-text\',status=null where id=$1', [assignment]);
eq((await begin('Missing status')).code, 'source_unavailable');
await db.query('update activity_assignments set status=\'assigned\' where id=$1', [assignment]);
await db.query('update profiles set archived_at=clock_timestamp() where class_id=$1', [owner]);
eq((await begin()).code, 'source_unavailable');
await db.query('update profiles set archived_at=null where class_id=$1', [owner]);
// Conservative configurable quota gates never debit denied requests.
await db.exec('update activity_ai_configuration_v1 set actor_concurrency=1');
const beforeDenied = await budget(); eq((await begin('Concurrency blocked')).code, 'concurrency_limited'); eq(await budget(), beforeDenied);
await db.exec('update activity_ai_configuration_v1 set actor_concurrency=10,global_day=1');
eq((await begin('Global blocked', { owner: admin, kind: 'preview', source: preview })).code, 'rate_limited'); eq(await budget(), beforeDenied);
await db.exec('update activity_ai_configuration_v1 set global_day=6000,actor_minute=1');
eq((await begin('Minute blocked')).code, 'rate_limited'); eq(await budget(), beforeDenied);
await db.exec('update activity_ai_configuration_v1 set actor_minute=60,actor_day=1');
eq((await begin('Day blocked')).code, 'rate_limited'); eq(await budget(), beforeDenied);
await assert.rejects(db.exec('update activity_ai_configuration_v1 set actor_day=0'), /check constraint/); checks++;
await db.exec('update activity_ai_configuration_v1 set enabled=false');
eq((await begin()).status, 'cached'); eq(await budget(), beforeDenied);
eq(await snapshot(), baseline);
await db.close();
console.log(`Activity AI admission: ${checks} isolated SQL assertions passed; no AI calls or live writes.`);
