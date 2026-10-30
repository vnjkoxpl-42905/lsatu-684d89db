import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const flag = process.argv.indexOf('--pglite-module');
const modulePath = flag >= 0 ? process.argv[flag + 1] : process.env.PGLITE_MODULE;
if (!modulePath) throw new Error('Pass --pglite-module /absolute/path/to/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(resolve(modulePath)).href);
const db = new PGlite();
const owner = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
let checks = 0;
const denied = async (sql, args = []) => { await assert.rejects(db.query(sql,args), sql); checks++; };
const executor = () => db.exec('set role timed_pt_executor');
const authenticated = async (id) => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  await db.exec('set role authenticated');
};
const insertProtected = (id, patch = {}) => {
  const row = {
    id, user_id: owner, pt: 140, pace: 'standard', section_seconds: 2100,
    legs: [{kind:'lr',section:1,questionCount:2},{kind:'rc',section:2,questionCount:2},{kind:'lr',section:3,questionCount:2}],
    current_leg: 0, break_after_leg: 2, break_taken: false, status: 'in-progress', revision: 0,
    timed_contract_version: 1, timed_writer_epoch: 1, timed_phase: 'ready', timed_elapsed_ms: 0,
    timed_clock_leg: null, timed_lease_ms: 45000,
    ...patch,
  };
  row.timed_frozen_legs ??= row.legs;
  const columns = Object.keys(row);
  return db.query(`insert into public.practice_test_runs(${columns.join(',')}) values(${columns.map((_,i)=>'$'+(i+1)).join(',')})`,
    columns.map(key => Array.isArray(row[key]) ? JSON.stringify(row[key]) : row[key]));
};

try {
  await db.exec(`
    create role authenticated; create role anon;
    create schema auth; create table auth.users(id uuid primary key);
    insert into auth.users values('${owner}'),('${other}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated,anon;
    grant execute on function auth.uid() to authenticated,anon;
    create table public.practice_test_runs(
      id text primary key,user_id uuid not null references auth.users(id),pt integer not null,pace text not null,
      legs jsonb not null,current_leg integer not null default 0,break_after_leg integer not null,
      break_taken boolean not null default false,status text not null,revision integer not null default 0,
      section_seconds integer,active_device_id text,completed_at timestamptz,
      created_at timestamptz not null default now(),unique(id,user_id)
    );
    alter table public.practice_test_runs enable row level security;
    grant select,insert,update,delete on public.practice_test_runs to authenticated;
    create policy pt_runs_owner_select on public.practice_test_runs for select using(user_id=auth.uid());
    create policy pt_runs_owner_insert on public.practice_test_runs for insert with check(user_id=auth.uid());
    create policy pt_runs_owner_update on public.practice_test_runs for update using(user_id=auth.uid()) with check(user_id=auth.uid());
  `);
  await db.exec(await readFile(new URL('../../docs/implementation-plans/artifacts/2026-09-30-timed-pt-control-foundation.sql',import.meta.url),'utf8'));
  assert.equal((await db.query("select has_schema_privilege('timed_pt_executor','auth','USAGE') as allowed")).rows[0].allowed,false); checks++;
  assert.equal((await db.query("select has_function_privilege('authenticated','public.timed_pt_actor_v1()','EXECUTE') as allowed")).rows[0].allowed,false); checks++;
  await authenticated(owner);
  await db.query(`insert into public.practice_test_runs(id,user_id,pt,pace,legs,break_after_leg,status)
    values('legacy',$1,140,'standard','[]',2,'in-progress')`,[owner]);
  await db.query("update public.practice_test_runs set revision=1 where id='legacy'");
  checks += 2;
  await denied("insert into public.practice_test_runs(id,user_id,pt,pace,legs,break_after_leg,status,timed_contract_version) values('forged',$1,140,'standard','[]',2,'in-progress',1)",[owner]);
  // A PGlite superuser session cannot prove a deployed authenticator's SET ROLE
  // behavior. Check the actual membership boundary; real JWT acceptance is later.
  assert.equal((await db.query("select pg_has_role('authenticated','timed_pt_executor','MEMBER') as allowed")).rows[0].allowed,false); checks++;
  await db.exec('reset role');
  await db.query("delete from public.practice_test_runs where id='legacy'");
  assert.equal((await db.query("select id from public.practice_test_runs where id='legacy'")).rows.length,0); checks++;
  await executor();
  await insertProtected('protected'); checks++;
  await denied("update public.practice_test_runs set timed_contract_version=null where id='protected'");
  await denied("update public.practice_test_runs set user_id=$1,revision=1 where id='protected'",[other]);
  await denied("update public.practice_test_runs set timed_frozen_legs='[]',revision=1 where id='protected'");
  await denied("update public.practice_test_runs set timed_phase='leg-running',timed_clock_leg=0,revision=1 where id='protected'");
  await db.query(`update public.practice_test_runs set timed_phase='leg-running',timed_clock_leg=0,revision=1,
    timed_running_anchor='2026-09-30T10:00:00Z',timed_lease_expires_at='2026-09-30T10:00:45Z' where id='protected'`);
  checks++;
  await denied("update public.practice_test_runs set timed_elapsed_ms=-1,revision=2 where id='protected'");
  await db.query("update public.practice_test_runs set timed_elapsed_ms=1000,revision=2 where id='protected'"); checks++;
  await denied("update public.practice_test_runs set timed_elapsed_ms=999,revision=3 where id='protected'");
  await denied("update public.practice_test_runs set timed_writer_epoch=0,revision=3 where id='protected'");
  await denied("update public.practice_test_runs set revision=2 where id='protected'");
  await db.query(`insert into public.timed_pt_lr_bindings_v1(owner_id,run_id,leg_index,namespace,record_id,source_key,frozen_qids)
    values($1,'protected',0,'practice_sessions','record-1','drill::practice-test::protected::leg-0',array['q1','q2'])`,[owner]); checks++;
  await denied(`insert into public.timed_pt_lr_bindings_v1(owner_id,run_id,leg_index,namespace,record_id,source_key,frozen_qids)
    values($1,'protected',1,'practice_sessions','record-2','drill::practice-test::protected::leg-1',array['q1','q2'])`,[owner]);
  await denied(`insert into public.timed_pt_lr_bindings_v1(owner_id,run_id,leg_index,namespace,record_id,source_key,frozen_qids)
    values($1,'protected',2,'practice_sessions','record-3','drill::practice-test::another::leg-2',array['q1','q2'])`,[owner]);
  await denied(`insert into public.timed_pt_lr_bindings_v1(owner_id,run_id,leg_index,namespace,record_id,source_key,frozen_qids)
    values($1,'protected',2,'practice_sessions','record-3','drill::practice-test::protected::leg-2',array['q1'])`,[owner]);
  await denied("update public.timed_pt_lr_bindings_v1 set record_id='moved'");
  const command = '20000000-0000-4000-8000-000000000001';
  const receiptInsert = `insert into public.timed_pt_receipts_v1(owner_id,work_kind,work_id,command_id,canonical_command,committed_revision,committed_result)
    values($1,'practice-test','protected',$2,$3,2,'{"accepted":true}')`;
  await db.query(receiptInsert,[owner,command,JSON.stringify({expectedRevision:1,writerEpoch:1,deviceId:'device-a',operation:'checkpoint',payload:{qid:'q1',selected:'A'}})]); checks++;
  const hash = (await db.query('select command_hash from public.timed_pt_receipts_v1')).rows[0].command_hash;
  assert.match(hash,/^[a-f0-9]{64}$/); checks++;
  const reversed = {payload:{selected:'A',qid:'q1'},operation:'checkpoint',deviceId:'device-a',writerEpoch:1,expectedRevision:1};
  const sameHash = (await db.query("select encode(sha256(convert_to($1::jsonb::text,'UTF8')),'hex') as hash",[JSON.stringify(reversed)])).rows[0].hash;
  assert.equal(sameHash,hash); checks++;
  await denied(receiptInsert,[owner,command,'{"changed":true}']);
  await denied("update public.timed_pt_receipts_v1 set committed_revision=3");
  await authenticated(owner);
  assert.equal((await db.query('select count(*)::int as n from public.timed_pt_receipts_v1')).rows[0].n,1); checks++;
  await denied("update public.practice_test_runs set timed_contract_version=null,timed_writer_epoch=null,timed_phase=null,timed_elapsed_ms=null,timed_clock_leg=null,timed_lease_ms=null,timed_frozen_legs=null,timed_running_anchor=null,timed_lease_expires_at=null where id='protected'");
  await db.query("select set_config('timed.writer','true',false)");
  await denied("update public.practice_test_runs set revision=3 where id='protected'");
  await denied(receiptInsert,[owner,'20000000-0000-4000-8000-000000000002','{}']);
  await authenticated(other);
  assert.equal((await db.query('select count(*)::int as n from public.timed_pt_receipts_v1')).rows[0].n,0); checks++;
  await db.exec('reset role'); await executor();
  await db.query(`update public.practice_test_runs set status='abandoned',timed_phase='abandoned',timed_clock_leg=null,
    timed_running_anchor=null,timed_lease_expires_at=null,revision=3 where id='protected'`); checks++;
  await denied("update public.practice_test_runs set status='in-progress',timed_phase='ready',revision=4 where id='protected'");
  await db.exec('reset role');
  // A superuser bypasses RLS but does not bypass the dedicated-role trigger.
  await denied("update public.practice_test_runs set revision=4 where id='protected'");
  console.log(`Timed PT phase-1 SQL compiled and passed ${checks} isolated foundation assertions. No public writer or live data.`);
} catch (error) {
  console.error(`Timed PT foundation verification failed: ${error.message}`);
  process.exitCode = 1;
} finally { await db.close(); }
