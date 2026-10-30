// Disposable PostgreSQL execution. Supply an externally installed PGlite entry;
// this adds no application dependency and never connects to the live database.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
const owner = '00000000-0000-4000-8000-000000000001';
const student = '00000000-0000-4000-8000-000000000002';
const other = '00000000-0000-4000-8000-000000000003';
const studentTwo = '00000000-0000-4000-8000-000000000004';
let checks = 0;
async function denied(sql) {
  await assert.rejects(db.query(sql), error => error.code === '42501' || error.message === 'task_not_found');
  checks++;
}
try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create type public.app_role as enum ('admin','student');
    create table public.user_roles(user_id uuid references auth.users(id),role public.app_role);
    create table public.profiles(class_id uuid primary key references auth.users(id),display_name text,archived_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function public.has_role(_id uuid,_role public.app_role) returns boolean language sql stable security definer as $$select exists(select 1 from public.user_roles where user_id=_id and role=_role)$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    insert into auth.users values ('${owner}'),('${student}'),('${other}'),('${studentTwo}');
    insert into public.user_roles values ('${owner}','admin'),('${student}','student'),('${other}','admin');
    insert into public.profiles values ('${owner}','Teacher',null),('${student}','Test student',null),('${other}','Other admin',null),('${studentTwo}','Second student',null);
  `);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261027190000_teacher_post_session.sql', import.meta.url), 'utf8'));
  checks++;
  const acceptance = readFileSync(new URL('../ops/teacher-post-session-acceptance.sql', import.meta.url), 'utf8')
    .replaceAll(":'owner_uuid'", `'${owner}'`).replaceAll(":'student_uuid'", `'${student}'`);
  await db.exec(acceptance);
  checks++;
  await db.exec(`
    insert into teacher_post_session_settings(owner_id,calendar_id,enabled,activation_cutoff,covered_through)
      values('${owner}','teacher@example.com',true,now()-interval '1 day',now()-interval '1 day');
    insert into teacher_post_session_tasks(owner_id,calendar_id,event_id,student_id,student_name,source_title,starts_at,ends_at,source_state,match_state,source_updated_at)
      values('${owner}','teacher@example.com','test-instance','${student}','Test student','Session',now()-interval '2 hours',now()-interval '1 hour','ended','matched',now());
  `);

  // Import is atomic and dry-run reports slug conflicts before changing the root.
  const importFolders = async (root, folders, dryRun=false) => (await db.query(
    'select teacher_post_session_import_folders($1,$2,$3,$4::jsonb,$5) result',
    [owner,'teacher@example.com',root,JSON.stringify(folders),dryRun],
  )).rows[0].result;
  const folder={student_id:student,local_slug:'test-student',folder_id:'folder_abcdefghij',aliases:['student@example.com']};
  let imported=await importFolders('root_abcdefghij',[folder]);
  assert.equal(imported.linked.length,1);checks++;
  await db.query('update teacher_student_folders set aliases=array[$1,$2] where owner_id=$3 and student_id=$4',['student@example.com','verified-alias@example.com',owner,student]);
  await importFolders('root_abcdefghij',[{...folder,aliases:['new-live-email@example.com']}]);
  const aliases=(await db.query('select aliases from teacher_student_folders where student_id=$1',[student])).rows[0].aliases;
  assert.deepEqual([...aliases].sort(),['student@example.com','verified-alias@example.com','new-live-email@example.com'].sort());checks++;
  const conflict={student_id:studentTwo,local_slug:folder.local_slug,folder_id:'other_abcdefghij',aliases:['second@example.com']};
  for(const dryRun of [true,false]) {
    const result=await importFolders('changed_root_abcdefghij',[conflict],dryRun);
    assert.equal(result.linked.length,0);assert.equal(result.unresolved.length,1);checks++;
    assert.equal((await db.query('select drive_root_id from teacher_post_session_settings where owner_id=$1',[owner])).rows[0].drive_root_id,'root_abcdefghij');checks++;
  }
  imported=await importFolders('changed_root_abcdefghij',[folder,{...conflict,student_id:studentTwo}],true);
  assert.equal(imported.linked.length,0);assert.equal(imported.unresolved.length,2);checks++;
  // An unexpected SQL error after settings update must roll back the entire import.
  await assert.rejects(importFolders('should_rollback_abcdefghij',[{...folder,aliases:'invalid-array'}]));
  assert.equal((await db.query('select drive_root_id from teacher_post_session_settings where owner_id=$1',[owner])).rows[0].drive_root_id,'root_abcdefghij');checks++;
  const lease=(await db.query('select teacher_post_session_claim($1) result',[owner])).rows[0].result.lease_token;
  const previousRevision=(await db.query('select revision from teacher_post_session_tasks where event_id=$1',['test-instance'])).rows[0].revision;
  const source={source_title:'Session',source_state:'ended',source_updated_at:new Date().toISOString()};
  await db.query('select teacher_post_session_source($1,$2,$3,$4::jsonb)',[owner,lease,'test-instance',JSON.stringify(source)]);
  assert.equal((await db.query('select revision from teacher_post_session_tasks where event_id=$1',['test-instance'])).rows[0].revision,previousRevision);checks++;
  const moved={...source,starts_at:new Date(Date.now()-3*3600000).toISOString(),ends_at:new Date(Date.now()-2*3600000).toISOString(),source_state:'rescheduled'};
  await db.query('select teacher_post_session_source($1,$2,$3,$4::jsonb)',[owner,lease,'test-instance',JSON.stringify(moved)]);
  const history=(await db.query("select detail from teacher_post_session_events where action='source_rescheduled'")).rows;
  assert.equal(history.length,1);assert.ok(history[0].detail.previous_ends_at);checks++;
  await db.query('select teacher_post_session_source($1,$2,$3,$4::jsonb)',[owner,lease,'test-instance',JSON.stringify({...moved,source_state:'ended'})]);
  assert.equal((await db.query("select count(*)::integer total from teacher_post_session_events where action='source_rescheduled'")).rows[0].total,1);checks++;

  // A late pre-lease error from an older run cannot hide a newer successful sync.
  await db.exec(`update teacher_post_session_settings set last_success_at=now(),last_attempt_at=now(),last_error=null where owner_id='${owner}'`);
  await db.query("select teacher_post_session_attempt($1,now()-interval '1 hour','sync_failed_retry_pending')",[owner]);
  assert.equal((await db.query('select last_error from teacher_post_session_settings where owner_id=$1',[owner])).rows[0].last_error,null);checks++;
  await db.query("update teacher_post_session_settings set last_error='sync_failed_retry_pending' where owner_id=$1",[owner]);
  await db.query('select teacher_post_session_attempt($1,now())',[owner]);
  assert.equal((await db.query('select last_error from teacher_post_session_settings where owner_id=$1',[owner])).rows[0].last_error,'sync_failed_retry_pending');checks++;
  const cursor=(await db.query('select covered_through from teacher_post_session_settings where owner_id=$1',[owner])).rows[0].covered_through;
  await db.query('select teacher_post_session_finish($1,$2,$3,$3,now(),false)',[owner,lease,cursor]);
  assert.equal((await db.query('select last_error from teacher_post_session_settings where owner_id=$1',[owner])).rows[0].last_error,null);checks++;
  const task = (await db.query('select id from teacher_post_session_tasks')).rows[0].id;
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${student}',false);`);
  for (const table of ['teacher_post_session_settings', 'teacher_student_folders', 'teacher_post_session_tasks', 'teacher_post_session_events']) {
    const columns=table==='teacher_post_session_settings'?'owner_id,enabled,last_attempt_at,last_error':'*';
    assert.equal((await db.query(`select ${columns} from ${table}`)).rows.length, 0); checks++;
  }
  await denied('select teacher_post_session_home()');
  await denied(`select teacher_post_session_update('${task}',1,'handle')`);
  await denied(`select teacher_worker_consume(gen_random_uuid())`);
  await denied(`select teacher_post_session_attempt('${owner}',now(),'sync_failed_retry_pending')`);
  await denied(`select teacher_post_session_import_folders('${owner}','teacher@example.com','root_abcdefghij','[]'::jsonb,true)`);
  await denied(`update teacher_post_session_tasks set handled_at=now()`);
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false);`);
  assert.equal((await db.query('select * from teacher_post_session_tasks')).rows.length, 0); checks++;
  await denied(`select teacher_post_session_update('${task}',1,'handle')`);
  await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false);`);
  assert.equal((await db.query('select * from teacher_post_session_tasks')).rows.length, 1); checks++;
  await denied('select * from teacher_post_session_settings');
  await denied('select lease_token,lease_until from teacher_post_session_settings');
  assert.equal((await db.query('select owner_id,enabled,last_attempt_at from teacher_post_session_settings')).rows.length,1);checks++;
  const handled = (await db.query(`select teacher_post_session_update('${task}',1,'handle') result`)).rows[0].result;
  assert.ok(handled.handled_at); checks++;
  await denied(`update teacher_post_session_tasks set handled_at=null`);
  await denied(`select teacher_post_session_claim('${owner}')`);
  await db.exec('reset role; set role anon;');
  await denied('select teacher_post_session_home()');
  await denied('select * from teacher_post_session_tasks');
  await db.exec('reset role');
  const demotionLease=(await db.query('select teacher_post_session_claim($1) result',[owner])).rows[0].result.lease_token;
  const ticket=(await db.query("insert into teacher_worker_tickets(owner_id,worker,expires_at) values($1,'teacher-post-session-sync',now()+interval '1 minute') returning id",[owner])).rows[0].id;
  await db.query("update user_roles set role='student' where user_id=$1 and role='admin'",[owner]);
  assert.equal((await db.query('select teacher_worker_consume($1) owner',[ticket])).rows[0].owner,null);checks++;
  assert.equal((await db.query('select used_at from teacher_worker_tickets where id=$1',[ticket])).rows[0].used_at,null);checks++;
  await assert.rejects(db.query('select teacher_post_session_renew($1,$2)',[owner,demotionLease]),error=>error.message==='lease_lost');checks++;
  await db.query("update teacher_post_session_settings set lease_until=now()-interval '1 second' where owner_id=$1",[owner]);
  assert.equal((await db.query('select teacher_post_session_claim($1) claim',[owner])).rows[0].claim,null);checks++;
  await db.query("update user_roles set role='admin' where user_id=$1",[owner]);
  assert.equal((await db.query('select teacher_worker_consume($1) owner',[ticket])).rows[0].owner,owner);checks++;
  console.log(JSON.stringify({ result: 'PASS', checks, engine: 'PGlite disposable PostgreSQL', live_database: false }));
} finally {
  await db.close();
}
