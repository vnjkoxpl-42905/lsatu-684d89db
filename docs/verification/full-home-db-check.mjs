// Executes actual migrations in disposable PostgreSQL. No live connection.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {PGlite}=await import(pathToFileURL(process.argv[2]).href);
const db=new PGlite();
const owner='00000000-0000-4000-8000-000000000001',student='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
let checks=0;
const query=async(sql,args=[]) => (await db.query(sql,args)).rows;
const rpc=async(sql,args=[]) => (await query(sql,args))[0].result;
const check=(value,expected)=>{assert.deepEqual(value,expected);checks++;};
try {
 await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;
 create table auth.users(id uuid primary key,email text);create type public.app_role as enum('admin','student');
 create table user_roles(user_id uuid,role app_role);create table profiles(class_id uuid primary key,display_name text,archived_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function has_role(_id uuid,_role app_role) returns boolean language sql stable security definer as $$select exists(select 1 from user_roles where user_id=_id and role=_role)$$;
 grant usage on schema public,auth to anon,authenticated,service_role;
 insert into auth.users values('${owner}','teacher@example.com'),('${student}','student@example.com'),('${other}','other@example.com');
 insert into profiles values('${owner}','Teacher',null),('${student}','Student',null),('${other}','Other admin',null);
 insert into user_roles values('${owner}','admin'),('${student}','student'),('${other}','admin');
 create table stripe_payments(id uuid primary key default gen_random_uuid(),paid_at timestamptz default now(),status text,product text,currency text,amount_cents integer,amount_refunded_cents integer default 0,student_id uuid,payer_name text,email text,match_state text,grant_state text,granted_credits integer,source text,offer_id uuid,livemode boolean default true);
 create table section_history(id uuid primary key default gen_random_uuid(),class_id uuid,pt integer,section integer,mode text,initial_score integer,initial_total integer,br_used boolean,br_score integer,completed_at timestamptz);
 `);
 for(const name of ['20261027190000_teacher_post_session.sql','20261028100000_teacher_home_desk.sql']) await db.exec(readFileSync(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8'));
 checks++;
 await db.exec(`insert into teacher_post_session_settings(owner_id,calendar_id,enabled) values('${owner}','teacher@example.com',false);
 insert into teacher_post_session_tasks(owner_id,calendar_id,event_id,student_id,student_name,source_title,starts_at,ends_at,source_state,match_state,source_updated_at)
 select '${owner}','teacher@example.com','event-'||i,'${student}','Student','Session',now()-interval '2 hours'-i*interval '1 hour',now()-interval '1 hour'-i*interval '1 hour','ended','matched',now() from generate_series(1,145)i;
 set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);`);
 let home=await rpc('select teacher_post_session_home() result');check(home.tasks.length,2);check(home.total,145);check(home.handled,[]);
 const first=await rpc('select teacher_post_session_page() result');check(first.items.length,20);check(first.total,145);assert.ok(first.next_cursor);checks++;
 const second=await rpc('select teacher_post_session_page(false,$1) result',[first.next_cursor]);check(second.items.length,20);
 const all=[...first.items,...second.items];let cursor=second.next_cursor;
 while(cursor){const page=await rpc('select teacher_post_session_page(false,$1) result',[cursor]);assert.ok(page.items.length<=20);checks++;all.push(...page.items);cursor=page.next_cursor;}
 check(new Set(all.map(t=>t.id)).size,145);
 let manual=await rpc("select teacher_home_manual_update(_title=>'Review next steps',_student_id=>$1,_blocker=>'Waiting for transcript') result",[student]);
 check(manual.student_name,'Student');check(manual.revision,1);
 await assert.rejects(rpc("select teacher_home_manual_update($1,0,'handle') result",[manual.id]),/stale_revision/);checks++;
 manual=await rpc("select teacher_home_manual_update($1,1,'handle') result",[manual.id]);assert.ok(manual.handled_at);checks++;
 manual=await rpc("select teacher_home_manual_update($1,2,'reopen') result",[manual.id]);check(manual.handled_at,null);
 const counts=(await rpc('select teacher_home_manual_tasks() result')).student_counts;check(Number(counts.find(c=>c.student_id===student).total),146);
 const operation='00000000-0000-4000-8000-000000000099';
 const created=await rpc("select teacher_home_manual_update(_title=>'Retry-safe task',_operation_key=>$1) result",[operation]);
 const replayed=await rpc("select teacher_home_manual_update(_title=>'Retry-safe task',_operation_key=>$1) result",[operation]);check(replayed.id,created.id);
 await assert.rejects(rpc("select teacher_home_manual_update(_title=>'Different task',_operation_key=>$1) result",[operation]),/conflict/);checks++;
 const task=first.items[0];let changed=await rpc("select teacher_post_session_update($1,$2,'recap_posted',null,true) result",[task.id,task.revision]);check(changed.recap_posted,true);check(changed.recap_done,false);
 const label=await rpc("select teacher_home_label('consultation-event','consultation') result");check(label.revision,1);
 await assert.rejects(rpc("select teacher_home_label('consultation-event','general',0) result"),/stale_revision/);checks++;
 await db.exec('reset role');
 await db.exec(`insert into teacher_home_manual(owner_id,title,student_id,created_at,handled_at)
 select '${owner}','Handled '||i,'${student}',now()-i*interval '1 minute',now()-i*interval '1 minute' from generate_series(1,125)i;
 update teacher_post_session_tasks set handled_at=now()-substring(event_id from 7)::integer*interval '1 minute' where substring(event_id from 7)::integer<=125;
 set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);`);
 const history=await rpc('select teacher_post_session_page(true) result');check(history.total,125);check(history.items.length,20);
 assert.ok(new Date(history.items[0].handled_at)>=new Date(history.items[19].handled_at));checks++;
 const h2=await rpc('select teacher_post_session_page(true,$1) result',[history.next_cursor]);check(new Set([...history.items,...h2.items].map(t=>t.id)).size,40);
 check((await rpc('select teacher_post_session_home() result')).handled,[]);
 const mh=await rpc('select teacher_home_manual_tasks(true) result');check(mh.total,125);check(mh.items.length,20);
 await db.exec('reset role');
 await db.exec(`insert into stripe_payments(status,product,currency,amount_cents,match_state,grant_state,source)
 select 'succeeded','Package','cad',10000,'unmatched','none','webhook' from generate_series(1,7);
 insert into stripe_payments(status,product,currency,amount_cents,match_state,grant_state,source)
 select 'succeeded','Package','usd',10000,'matched','granted','webhook' from generate_series(1,2500);
 insert into stripe_payments(status,match_state,grant_state,source) values('succeeded','unmatched','granted','webhook'),('succeeded','ignored','awaiting','webhook'),('refunded','unmatched','awaiting','webhook'),('succeeded','unmatched','none','backfill');
 insert into section_history(class_id,pt,section,mode,initial_score,initial_total,br_used,br_score,completed_at) select '${student}',100,1,'timed',20,25,false,24,now()-i*interval '1 hour' from generate_series(1,8)i;
 set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);`);
 const payments=await rpc('select teacher_home_payments() result');check(payments.recent.length,3);check(payments.attention.length,3);check(payments.attention_count,7);
 const p2=await rpc('select teacher_home_payments($1) result',[payments.next_cursor]);check(p2.attention.length,3);
 const p3=await rpc('select teacher_home_payments($1) result',[p2.next_cursor]);check(p3.attention.length,1);check(p3.next_cursor,null);
 const results=await rpc('select teacher_home_results() result');check(results.length,3);check(results[0].br_score,null);
 await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
 await assert.rejects(rpc('select teacher_post_session_home() result'),/forbidden/);checks++;
 check((await query('select * from teacher_home_manual')).length,0);
 await db.exec(`select set_config('request.jwt.claim.sub','${student}',false)`);
 for(const call of ['teacher_home_results()','teacher_home_payments()','teacher_home_manual_tasks()']){await assert.rejects(rpc('select '+call+' result'),/forbidden/);checks++;}
 await assert.rejects(db.exec("insert into teacher_home_manual(owner_id,title) values('"+student+"','No')"));checks++;
 console.log(JSON.stringify({ok:true,checks}));
} finally {await db.close();}
