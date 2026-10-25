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
const artifact = await readFile(new URL('../../docs/implementation-plans/artifacts/2026-09-30-attempt-insert-owner-policy-proposal.sql', import.meta.url), 'utf8');
let checks = 0;
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
async function actor() {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  await db.exec('set role authenticated');
}
async function insert(id, classId, userId) {
  return db.query('insert into public.attempts(id,class_id,user_id) values($1,$2,$3)', [id, classId, userId]);
}
async function denied(id, classId, userId) {
  await assert.rejects(insert(id, classId, userId), error => error.code === '42501' && /row-level security/i.test(error.message));
  checks++;
}
try {
  await db.exec(`
    create role authenticated; create role timed_pt_executor nologin;
    create schema auth; create table auth.users(id uuid primary key);
    insert into auth.users values('${owner}'),('${other}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated,timed_pt_executor;
    grant execute on function auth.uid() to authenticated,timed_pt_executor;
    create table public.attempts(id uuid primary key,class_id text not null,user_id uuid references auth.users(id));
    alter table public.attempts enable row level security;
    grant insert,select,update on public.attempts to authenticated,timed_pt_executor;
    create policy "Students can insert own attempts" on public.attempts for insert to authenticated
      with check(class_id=auth.uid()::text);
    create policy own_read on public.attempts for select to authenticated using(class_id=auth.uid()::text);
    create policy timed_lr_attempt_executor on public.attempts for all to timed_pt_executor using(true) with check(true);
    insert into public.attempts values('20000000-0000-4000-8000-000000000001','${owner}',null),
      ('20000000-0000-4000-8000-000000000002','${owner}','${other}');
  `);
  const before = (await db.query('select * from public.attempts order by id')).rows;
  await actor();
  await db.exec('begin');
  await insert('30000000-0000-4000-8000-000000000001', owner, other);
  check((await db.query('select count(*)::integer as n from public.attempts')).rows[0].n, 3);
  await db.exec('rollback; reset role');
  await db.exec(artifact);
  check((await db.query('select * from public.attempts order by id')).rows, before);
  await actor();
  await insert('30000000-0000-4000-8000-000000000002', owner, owner);
  await insert('30000000-0000-4000-8000-000000000003', owner, null);
  check((await db.query('select count(*)::integer as n from public.attempts')).rows[0].n, 4);
  await denied('30000000-0000-4000-8000-000000000004', other, other);
  await denied('30000000-0000-4000-8000-000000000005', owner, other);
  await denied('30000000-0000-4000-8000-000000000006', other, owner);
  check((await db.query('update public.attempts set user_id=$1 where id=$2 returning id',
    [other, '30000000-0000-4000-8000-000000000002'])).rows, []);
  check((await db.query('select user_id from public.attempts where id=$1',
    ['30000000-0000-4000-8000-000000000002'])).rows[0].user_id, owner);
  await db.exec('reset role; set role timed_pt_executor');
  await insert('30000000-0000-4000-8000-000000000007', other, other);
  check((await db.query('select count(*)::integer as n from public.attempts')).rows[0].n, 5);
  await db.exec('reset role');
  check((await db.query("select with_check from pg_policies where tablename='attempts' and policyname='timed_lr_attempt_executor'")).rows[0].with_check, 'true');
  await assert.rejects(db.exec(artifact), /reviewed baseline/);
  checks++;
  await db.exec('rollback');
  check((await db.query('select * from public.attempts where id=any($1::uuid[]) order by id', [before.map(row => row.id)])).rows, before);
  console.log(`PASS attempt INSERT owner policy: ${checks} isolated checks; no managed writes`);
} finally { await db.close(); }
