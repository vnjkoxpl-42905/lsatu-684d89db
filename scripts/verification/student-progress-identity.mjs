import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const flag = process.argv.indexOf('--pglite-module');
if (flag < 0) throw new Error('Pass --pglite-module');
const { PGlite } = await import(pathToFileURL(resolve(process.argv[flag + 1])).href);
const db = new PGlite();
const own = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const admin = '10000000-0000-4000-8000-000000000003';
let checks = 0;
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
async function actor(id, role = 'authenticated') {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(`SET ROLE ${role}`);
}
async function lookup(id) {
  return (await db.query('SELECT public.get_student_progress_user_id($1) AS id', [id])).rows[0].id;
}
try {
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
    CREATE TYPE public.app_role AS ENUM ('admin','student');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql STABLE AS
      $$ SELECT $1='${admin}'::uuid AND $2='admin'::public.app_role $$;
    CREATE TABLE public.students(class_id text PRIMARY KEY,user_id uuid);
    INSERT INTO public.students VALUES('${own}','${own}'),('${other}','${other}');
    ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
    GRANT SELECT ON public.students TO authenticated;
    CREATE POLICY own ON public.students FOR SELECT TO authenticated USING(user_id=auth.uid());`);
  const before = (await db.query('SELECT * FROM public.students ORDER BY class_id')).rows;
  const artifact = await readFile(new URL('../../docs/implementation-plans/artifacts/2026-09-30-student-progress-identity.sql', import.meta.url), 'utf8');
  await db.exec(artifact);
  await actor(own);
  check(await lookup(own), own);
  await assert.rejects(lookup(other), error => error.code === '42501'); checks++;
  await assert.rejects(lookup('missing'), error => error.code === '42501'); checks++;
  await actor(admin);
  check((await db.query('SELECT * FROM public.students WHERE class_id=$1',[other])).rows.length, 0);
  check(await lookup(other), other);
  check(await lookup('missing'), null);
  await actor('', 'authenticated');
  await assert.rejects(lookup(own), error => error.code === '42501'); checks++;
  await actor('', 'anon');
  await assert.rejects(lookup(own), error => error.code === '42501'); checks++;
  await db.exec('RESET ROLE');
  check((await db.query('SELECT * FROM public.students ORDER BY class_id')).rows, before);
  await db.exec('BEGIN');
  await db.query('UPDATE public.students SET class_id=$1 WHERE user_id=$2',['moved',other]);
  await db.query('UPDATE public.students SET class_id=$1 WHERE user_id=$2',[other,own]);
  await actor(admin);
  await db.exec('SAVEPOINT denied_admin_alias');
  await assert.rejects(lookup(other), error => error.code === '42501'); checks++;
  await db.exec('ROLLBACK TO SAVEPOINT denied_admin_alias');
  await actor(own);
  await db.exec('SAVEPOINT denied_self_alias');
  await assert.rejects(lookup(other), error => error.code === '42501'); checks++;
  await db.exec('ROLLBACK TO SAVEPOINT denied_self_alias');
  await db.exec('RESET ROLE; ROLLBACK');
  check((await db.query('SELECT * FROM public.students ORDER BY class_id')).rows, before);
  await db.exec(artifact);
  check((await db.query('SELECT * FROM public.students ORDER BY class_id')).rows, before);
  console.log(JSON.stringify({ passed: checks, recordsPreserved: true, replaySafe: true }));
} finally { await db.close(); }
