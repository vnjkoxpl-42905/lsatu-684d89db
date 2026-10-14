// Isolated PostgreSQL (PGlite) proof that the structured answer key is part of
// receipt identity. Runs the real admission migration, the answer-key wrapper
// and its successor against throwaway fixtures. No managed database, no model.
//   PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/verification/activity-ai-answer-key-identity.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite(); let checks = 0;
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const owner = '10000000-0000-4000-8000-000000000001', source = '20000000-0000-4000-8000-000000000001';
await db.exec(`create role anon; create role authenticated; create role service_role;
create table profiles(class_id text primary key,archived_at timestamptz);
create table user_roles(user_id uuid,role text);
create table activities(id uuid primary key,created_by uuid,item_format text,items jsonb,instructions jsonb);
create table activity_assignments(id uuid primary key,student_id uuid,item_format text,items jsonb,instructions jsonb,status text,revoked_at timestamptz);
create table activity_item_responses(id uuid primary key,assignment_id uuid,student_id uuid,item_order integer,response_text text,verdict text,attempt_no integer);
grant usage on schema public to service_role;`);
const key = (ind) => ({ relationships: [{ type: 'comparative', indicators: [ind], required_parts: [['stronger', 'than']], connects: 'east reading -> west reading', why: 'Compares two readings.' }], traps: ['Quoting stronger alone'], context_benchmark: null });
const coach = { drill: 'relationship drill', rubric: ['Legacy rule.'], partial_rule: 'Partial.', grading_rubric: ['Grade each pair.'] };
const item = (k, extra = {}) => ({ order: 1, prompt: 'The tremor registered stronger on the eastern array than on the western.', credited_answers: ['comparative, "stronger than"'], explanation: 'One comparison.', ...(k === undefined ? {} : { answer_key: k }), ...extra });
const setItem = async (k, c = coach) => db.query('update activity_assignments set items=$1, instructions=$2 where id=$3', [JSON.stringify([item(k)]), JSON.stringify({ coach: c }), source]);
await db.query('insert into profiles values($1,null)', [owner]);
await db.query("insert into activity_assignments values($1,$2,'free-text','[]','{}','assigned',null)", [source, owner]);
await setItem(key('stronger than'));
for (const f of ['supabase/migrations/20261001120000_activity_ai_admission_v1.sql', 'drizzle/migrations/0028_activity_ai_source_answer_key.sql', 'drizzle/migrations/0029_activity_ai_answer_key_identity.sql'])
  await db.exec(await readFile(new URL('../../' + f, import.meta.url), 'utf8'));
await db.exec('update activity_ai_configuration_v1 set enabled=true,actor_concurrency=10');
const call = async (name, n, values) => { const keys = values;
  await db.exec('set role service_role');
  try { return (await db.query(`select ${name}(${keys.map((_, i) => '$' + (i + 1)).join(',')}) value`, values)).rows[0].value; } finally { await db.exec('reset role'); }
};
const begin = (rid, text, attempt = 1) => call('begin_activity_ai_request_v1', 7, [owner, rid, 'assignment', source, 1, text, attempt]);
const dispatch = (rid, claim) => call('dispatch_activity_ai_request_v1', 3, [owner, rid, claim]);
const finish = (rid, claim) => call('finish_activity_ai_request_v1', 5, [owner, rid, claim, JSON.stringify({ verdict: 'partial', feedback: 'Look again.' }), null]);
const run = async (text, attempt = 1) => { const rid = randomUUID(); const b = await begin(rid, text, attempt); return { rid, b }; };

// 1. The payload carries the complete key, including required parts.
let { rid, b } = await run('comparative, "stronger"');
eq(b.status, 'reserved'); const { context_benchmark: _cb, ...shown } = key('stronger than'); eq(b.payload.answerKey, shown, 'reply strips only null fields'); eq((await db.query('select canonical_payload->\'answerKey\' k from activity_ai_receipts_v1 where id=$1', [rid])).rows[0].k, key('stronger than')); eq(b.payload.coach.grading_rubric, ['Grade each pair.']);
// 2. Key-only change between dispatch and finish: finish refuses to complete.
eq((await dispatch(rid, b.claimId)).status, 'dispatched');
await setItem(key('stronger … than'));
let f = await finish(rid, b.claimId); eq([f.status, f.code], ['failed', 'request_failed']);
eq((await db.query('select failure_category from activity_ai_receipts_v1 where id=$1', [rid])).rows[0].failure_category, 'source_changed');
// 3. Same answer under the new key is a new identity, graded fresh, then cached.
({ rid, b } = await run('comparative, "stronger"')); eq(b.status, 'reserved');
eq((await dispatch(rid, b.claimId)).status, 'dispatched'); eq((await finish(rid, b.claimId)).status, 'completed');
eq((await run('comparative, "stronger"')).b.status, 'cached');
// 4. A key-only change invalidates that cached judgment.
await setItem(key('stronger  than'));
({ rid, b } = await run('comparative, "stronger"')); eq(b.status, 'reserved', 'stale cache must not be reused');
// 5. Key-only change between begin and dispatch: dispatch refuses.
await setItem(key('STRONGER THAN'));
eq((await dispatch(rid, b.claimId)).code, 'source_changed');
// 6. Second attempt must follow a first attempt graded under the identical key.
await setItem(key('stronger … than'));
await db.query("insert into activity_item_responses values($1,$2,$3,1,'comparative, \"stronger\"','partial',1)", [randomUUID(), source, owner]);
await setItem(key('stronger than!'));
eq((await run('comparative, "stronger than"', 2)).b.code, 'source_unavailable', 'attempt 2 under a changed key');
await setItem(key('stronger … than'));
eq((await run('comparative, "stronger than"', 2)).b.status, 'reserved', 'attempt 2 under the confirmed key');
// 7. Malformed upgraded keys and keys without pair rules never admit.
for (const bad of [{ relationships: [] }, { relationships: [{ type: 'bogus', indicators: ['x'], connects: 'a', why: 'b' }], traps: [] },
  { ...key('x'), relationships: [{ ...key('x').relationships[0], required_parts: [['only-one']] }] }, { ...key('x'), traps: 'none' }, 'string-key']) {
  await setItem(bad); eq((await run('anything ' + randomUUID())).b.code, 'source_unavailable');
}
await setItem(key('stronger than'), { ...coach, grading_rubric: undefined }); eq((await run('no rules ' + randomUUID())).b.code, 'source_unavailable');
await setItem(key('stronger than'), { ...coach, grading_rubric: [''] }); eq((await run('bad rules ' + randomUUID())).b.code, 'source_unavailable');
// 8. Legacy items without a key keep working and carry no answerKey.
await setItem(undefined, { drill: 'negation drill', rubric: ['Weakest contradiction.'] });
({ b } = await run('legacy ' + randomUUID())); eq(b.status, 'reserved'); eq('answerKey' in b.payload, false);
await db.close();
console.log(`Answer-key identity: ${checks} assertions passed on isolated PGlite fixtures.`);
