// Synthetic, independent PostgreSQL connections. Never connects to production.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { preservingDeployment } from './build-preserving-deployment.mjs';
const arg = name => process.argv[process.argv.indexOf(name)+1];
for (const flag of ['--pg-module','--port','--data-dir']) if (!process.argv.includes(flag)) throw new Error(`Required ${flag}`);
const {default:pg}=await import(pathToFileURL(resolve(arg('--pg-module'))).href);
const port=Number(arg('--port')); assert.ok(Number.isInteger(port)&&port>1024&&port<65536);
const clients=[]; let checks=0;
const check=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
const deny=async promise=>{await assert.rejects(promise,error=>error.code==='42501');checks++;};
const ids={admin:'10000000-0000-4000-8000-000000000001',secondAdmin:'10000000-0000-4000-8000-000000000002',student:'20000000-0000-4000-8000-000000000001',otherStudent:'20000000-0000-4000-8000-000000000002',assignment:'30000000-0000-4000-8000-000000000001',activity:'40000000-0000-4000-8000-000000000001'};
async function connect(database='postgres',actor=null,user='lsatu_test') {
  const c=new pg.Client({host:'127.0.0.1',port,database,user});await c.connect();clients.push(c);
  await c.query("set statement_timeout='15s'");
  if(actor){await c.query("select set_config('request.jwt.claim.sub',$1,false)",[actor]);await c.query('set role authenticated');}
  return c;
}
async function blocked(observer,c){for(let i=0;i<500;i++){if((await observer.query('select wait_event_type from pg_stat_activity where pid=$1',[c.processID])).rows[0]?.wait_event_type==='Lock'){checks++;return;}}throw new Error('Expected actual lock contention');}
const tables=['activity_assignments','activity_item_responses','activity_section_grades','classroom_items'];
try {
  const controller=await connect();
  const norm=p=>p.replaceAll('\\','/').replace(/\/$/,'').toLowerCase();
  const directory=(await controller.query('show data_directory')).rows[0].data_directory;
  assert.equal(norm(directory),norm(resolve(arg('--data-dir'))));assert.match(directory,/lsatu-pg-atomic-/);
  const database=`lsatu_activity_${Date.now()}_${randomUUID().slice(0,8)}`;
  await controller.query(`create database "${database}"`);
  const db=await connect(database);
  // Reuse the single-authority synthetic substrate, without executing its tests.
  const source=await readFile(new URL('./activity-revocation-sql.mjs',import.meta.url),'utf8');
  let setup=source.match(/await db\.exec\(`([\s\S]*?)`\);/)[1];
  for(const [name,value]of Object.entries(ids))setup=setup.replaceAll('${'+name+'}',value);
  setup=setup.replace('create role anon; create role authenticated;',()=>"do $$ begin if not exists(select from pg_roles where rolname='anon') then create role anon; end if; if not exists(select from pg_roles where rolname='authenticated') then create role authenticated; end if; end $$;");
  await db.query(setup);
  const orphan=randomUUID();
  await db.query("insert into public.classroom_items(id,student_id,source_table,source_id,type,visible_to_student,status,metadata_json) values($1,$2,'activity_assignments',$3,'activity',true,'assigned','{\"historical\":true}')",[orphan,ids.student,randomUUID()]);
  const sql=await readFile(new URL('../../docs/implementation-plans/artifacts/2026-09-30-activity-revocation.sql',import.meta.url),'utf8');
  await db.query(preservingDeployment(sql,tables));checks++;
  // The same wrapper rejects additive DDL accompanied by any old-row mutation.
  await assert.rejects(db.query(preservingDeployment("begin; alter table public.classroom_items add column synthetic_bad text; update public.classroom_items set status='changed'; commit;",tables)),/Original records changed/);checks++;
  await db.query('rollback');
  check((await db.query("select count(*)::int n from information_schema.columns where table_name='classroom_items' and column_name='synthetic_bad'")).rows[0].n,0);
  const role=`lsatu_activity_client_${randomUUID().replaceAll('-','')}`;
  await controller.query(`create role ${role} login nosuperuser nocreaterole nocreatedb nobypassrls noinherit`);await controller.query(`grant authenticated to ${role} with set true`);
  const teacher=await connect(database,ids.admin,role),teacher2=await connect(database,ids.secondAdmin,role),student=await connect(database,ids.student,role);
  const revoke=(c,id=ids.assignment)=>c.query('select public.revoke_activity_assignment($1,$2) receipt',[id,ids.student]).then(r=>r.rows[0].receipt);
  await teacher.query("update public.classroom_items set status='in_progress',metadata_json=metadata_json||'{\"edited\":true}' where id=$1",[orphan]);checks++;
  await deny(teacher.query('update public.classroom_items set source_id=$1 where id=$2',[randomUUID(),orphan]));
  await deny(teacher.query('update public.classroom_items set source_id=null where id=$1',[orphan]));
  await deny(teacher.query("update public.classroom_items set source_table=null,type='other' where id=$1",[orphan]));
  await teacher.query('update public.classroom_items set visible_to_student=false where id=$1',[orphan]);
  await deny(teacher.query('update public.classroom_items set visible_to_student=true where id=$1',[orphan]));
  await deny(teacher.query("insert into public.classroom_items(student_id,source_id,type,visible_to_student) values($1,$2,'activity',true)",[ids.student,randomUUID()]));
  await deny(teacher.query("insert into public.classroom_items(student_id,type,visible_to_student) values($1,'activity',true)",[ids.student]));
  // An accepted response holds SHARE until committed; revocation must wait.
  await student.query('begin');await student.query('insert into public.activity_item_responses(assignment_id,student_id,response_text) values($1,$2,$3)',[ids.assignment,ids.student,'race answer']);
  const waiting=revoke(teacher);waiting.catch(()=>{});await blocked(db,teacher);await student.query('commit');
  const first=await waiting;check(first.already_revoked,false);check(first.mirrors_hidden,2);
  await deny(student.query('insert into public.activity_item_responses(assignment_id,student_id,response_text) values($1,$2,$3)',[ids.assignment,ids.student,'denied']));
  check((await student.query('select count(*)::int n from public.activity_assignments')).rows[0].n,0);
  check((await db.query('select count(*)::int n from public.activity_item_responses')).rows[0].n,2);
  check((await db.query('select count(*)::int n from public.activity_section_grades')).rows[0].n,1);
  const replay=await revoke(teacher2);check(replay.already_revoked,true);check(replay.revoked_by,ids.admin);check(replay.mirrors_hidden,0);
  // Fresh source: concurrent revocations retain the first actor exactly once.
  const fresh=randomUUID();await db.query('insert into public.activity_assignments(id,student_id,assigned_by,status) values($1,$2,$3,$4)',[fresh,ids.student,ids.admin,'assigned']);
  await teacher.query('begin');const held=await revoke(teacher,fresh);
  const other=revoke(teacher2,fresh);other.catch(()=>{});await blocked(db,teacher2);await teacher.query('commit');
  const later=await other;check(held.already_revoked,false);check(later.already_revoked,true);check(later.revoked_by,held.revoked_by);
  // Source is locked by revocation first: a later response waits then is denied.
  const last=randomUUID();await db.query('insert into public.activity_assignments(id,student_id,assigned_by,status) values($1,$2,$3,$4)',[last,ids.student,ids.admin,'assigned']);
  await teacher.query('begin');await revoke(teacher,last);
  const insert=student.query('insert into public.activity_item_responses(assignment_id,student_id) values($1,$2)',[last,ids.student]);insert.catch(()=>{});await blocked(db,student);await teacher.query('commit');await deny(insert);
  check((await db.query('select count(*)::int n from public.activity_assignments')).rows[0].n,3);
  // Managed deployment role has auth USAGE/REFERENCES, without grant option.
  const managedDatabase=`${database}_acl`,migration=`lsatu_activity_migration_${randomUUID().replaceAll('-','')}`,authOwner=`lsatu_activity_auth_${randomUUID().replaceAll('-','')}`;
  await controller.query(`create database "${managedDatabase}"`);
  await controller.query(`create role ${migration} nosuperuser createrole createdb bypassrls`);
  await controller.query(`create role ${authOwner} nologin`);
  const managed=await connect(managedDatabase);await managed.query(setup);
  await managed.query(`alter schema public owner to ${migration}; alter schema auth owner to ${authOwner}; alter table auth.users owner to ${authOwner}; alter function auth.uid() owner to ${authOwner}; grant usage on schema auth to ${migration}; grant references on auth.users to ${migration};`);
  for(const table of tables)await managed.query(`alter table public.${table} owner to ${migration}`);
  await managed.query(`alter function public.has_role(uuid,text) owner to ${migration}; alter function public.guard_activity_assignment_immutables() owner to ${migration}; set role ${migration}`);
  check((await managed.query("select has_schema_privilege(current_user,'auth','USAGE WITH GRANT OPTION') allowed")).rows[0].allowed,false);
  await managed.query(preservingDeployment(sql,tables));checks++;
  await managed.query('reset role');
  const managedTeacher=await connect(managedDatabase,ids.admin,role);
  check((await managedTeacher.query('select public.activity_revocation_capability() c')).rows[0].c.version,1);
  const managedReceipt=(await managedTeacher.query('select public.revoke_activity_assignment($1,$2) receipt',[ids.assignment,ids.student])).rows[0].receipt;
  check(managedReceipt.revoked_by,ids.admin);check(managedReceipt.mirrors_hidden,2);
  console.log(JSON.stringify({checks,postgres:directory,database,productionWrites:false,preservedFixtures:true}));
} finally {for(const c of clients)await c.end();}
