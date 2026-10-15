// Separate ordinary connections, only the explicitly verified isolated cluster.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setupSql, owner, other, blueprint, manifestHash } from './timed-pt-writer-fixtures.mjs';
const arg=name=>process.argv[process.argv.indexOf(name)+1];
for(const name of ['--pg-module','--port','--data-dir']) if(!process.argv.includes(name)) throw new Error('Required '+name);
const port=Number(arg('--port'));assert.ok(Number.isInteger(port)&&port>1024&&port<65536);
const {default:pg}=await import(pathToFileURL(resolve(arg('--pg-module'))).href);
const clients=[];let checks=0;
const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
const denied=async(promise,code)=>{await assert.rejects(promise,e=>!code||e.code===code);checks++;};
const connect=async(database='postgres',actor=null,user='lsatu_test')=>{
 const c=new pg.Client({host:'127.0.0.1',port,user,database,application_name:'lsatu-standalone-isolated-verification'});
 await c.connect();clients.push(c);await c.query("set statement_timeout='15s'");
 if(actor){await c.query("select set_config('request.jwt.claim.sub',$1,false)",[actor]);await c.query('set role authenticated');}return c;
};
const normalize=v=>v.replaceAll('\\','/').replace(/\/$/,'').toLowerCase();
const create=()=>({workKind:'standalone-section',workId:randomUUID(),commandId:randomUUID(),deviceId:'device-a',expectedRevision:0,writerEpoch:0,operation:'create',payload:{kind:'lr',pt:140,section:1,pace:'standard'}});
const envelope=(s,operation,payload={},device='device-a')=>({workKind:'standalone-section',workId:s.id,commandId:randomUUID(),deviceId:device,expectedRevision:Number(s.revision),writerEpoch:Number(s.writer_epoch),operation,payload});
const rpc=async(c,name,command)=>(await c.query(`select public.${name}($1::jsonb) result`,[JSON.stringify(command)])).rows[0].result;
const commit=(c,command)=>rpc(c,'commit_timed_section_v1',command);
const read=async(c,id)=>(await c.query('select public.read_timed_section_v1($1) result',[id])).rows[0].result;
const waitLock=async(observer,client)=>{
 for(let n=0;n<500;n++){const s=await observer.query('select wait_event_type from pg_stat_activity where pid=$1',[client.processID]);if(s.rows[0]?.wait_event_type==='Lock')return;}
 throw new Error('Expected an independently blocked PostgreSQL connection');
};
try{
 const controller=await connect();const dir=(await controller.query('show data_directory')).rows[0].data_directory;
 assert.equal(normalize(dir),normalize(resolve(arg('--data-dir'))));assert.ok(/lsatu-pg-atomic-/.test(dir));
 const database='lsatu_section_'+Date.now()+'_'+randomUUID().slice(0,8);await controller.query(`create database "${database}"`);
 const admin=await connect(database);
 await admin.query(setupSql.replace('create role authenticated; create role anon;',()=>"do $$begin if not exists(select from pg_roles where rolname='authenticated') then create role authenticated; end if; if not exists(select from pg_roles where rolname='anon') then create role anon; end if; end$$;"));
 await admin.query('alter table public.profiles add column has_drill_access boolean not null default false');
 await admin.query('update public.profiles set has_drill_access=true where class_id=$1',[owner]);
 for(const name of ['2026-09-30-timed-pt-control-foundation.sql','2026-09-30-timed-pt-writer.sql','2026-09-30-standalone-timed-control-foundation.sql','2026-09-30-standalone-timed-writer.sql']){
  let sql=await readFile(new URL('../../docs/implementation-plans/artifacts/'+name,import.meta.url),'utf8');
  await admin.query(sql);
 }
 await admin.query('insert into public.timed_content_manifests_v1 values($1,140,$2)',[manifestHash,JSON.stringify(blueprint)]);
 await admin.query('update public.timed_section_configuration_v1 set enabled=true,manifest_sha256=$1',[manifestHash]);
 const login='lsatu_section_client_'+randomUUID().replaceAll('-','');
 await controller.query(`create role ${login} login nosuperuser nocreaterole nocreatedb nobypassrls noinherit`);
 await controller.query(`grant authenticated to ${login} with set true`);
 const a=await connect(database,owner,login),b=await connect(database,owner,login),foreign=await connect(database,other,login);
 await denied(a.query('set role timed_section_executor'),'42501');
 await denied(a.query('select public.timed_pt_actor_v1()'),'42501');
 const creation=create();const created=await Promise.all([rpc(a,'create_timed_section_v1',creation),rpc(b,'create_timed_section_v1',creation)]);
 check(created.filter(r=>r.replayed).length,1);
 check((await admin.query('select count(*)::int n from public.timed_section_receipts_v1')).rows[0].n,1);
 let state=(await commit(a,envelope(created[0].sitting,'start'))).sitting;
 const picks=[{qid:'PT140-S1-Q1',selected:'A',correct:false,timeMs:700},{qid:'PT140-S1-Q2',selected:'B',correct:false,timeMs:700}];
 const contenders=await Promise.allSettled(picks.map((answer,index)=>commit(index?a:b,envelope(state,'checkpoint',{currentIndex:index,answers:[answer]}))));
 check(contenders.filter(r=>r.status==='fulfilled').length,1);check(contenders.filter(r=>r.status==='rejected'&&r.reason.code==='PT409').length,1);
 const winner=contenders.find(r=>r.status==='fulfilled').value;state=winner.sitting;
 check(winner.child.record.attempts.length,1);
 const lostReply=winner.receipt.command;state=(await commit(a,envelope(state,'pause'))).sitting;
 const recovered=await commit(b,lostReply);check(recovered.replayed,true);check(recovered.sitting.revision,state.revision);
 await denied(commit(a,{...lostReply,payload:{...lostReply.payload,currentIndex:1-lostReply.payload.currentIndex}}),'PT412');
 const race=await Promise.allSettled([commit(a,envelope(state,'resume')),commit(b,envelope(state,'claim',{},'device-b'))]);
 check(race.filter(r=>r.status==='fulfilled').length,1);check(race.filter(r=>r.status==='rejected'&&r.reason.code==='PT409').length,1);
 state=race.find(r=>r.status==='fulfilled').value.sitting;
 const writer=state.device_id;
 if(state.phase==='running') state=(await commit(a,envelope(state,'pause',{},writer))).sitting;
 state=(await commit(a,envelope(state,'claim',{},'device-b'))).sitting;
 await denied(commit(a,envelope(state,'resume',{},'device-a')),'PT409');
 // Save obtains a share lock on the real grant; concurrent revocation waits.
 await a.query('begin');const resumed=await commit(a,envelope(state,'resume',{},'device-b'));state=resumed.sitting;
 const revocation=admin.query('update public.profiles set has_drill_access=false where class_id=$1',[owner]);
 await waitLock(controller,admin);check((await controller.query('select wait_event_type from pg_stat_activity where pid=$1',[admin.processID])).rows[0].wait_event_type,'Lock');
 await a.query('commit');await revocation;
 await denied(commit(b,envelope(state,'heartbeat',{},'device-b')),'PT401');
 check((await commit(b,lostReply)).sitting.revision,state.revision);
 await admin.query('update public.profiles set has_drill_access=true where class_id=$1',[owner]);
 // Revocation obtains the row first; the new write waits and then fails.
 await admin.query('begin');await admin.query('update public.profiles set has_drill_access=false where class_id=$1',[owner]);
 const afterRevoke=commit(b,envelope(state,'heartbeat',{},'device-b')).then(v=>({ok:true,value:v}),e=>({ok:false,code:e.code}));
 await waitLock(controller,b);await admin.query('commit');check((await afterRevoke).code,'PT401');
 check((await admin.query('select revision from public.timed_section_sittings_v1 where id=$1',[state.id])).rows[0].revision,String(state.revision));
 await admin.query('update public.profiles set has_drill_access=true where class_id=$1',[owner]);
 // Read blocks behind an uncommitted checkpoint and returns the matching child.
 await a.query('begin');const positioned=await commit(a,envelope(state,'checkpoint',{currentIndex:1,answers:[]},'device-b'));state=positioned.sitting;
 const concurrentRead=read(b,state.id);await waitLock(controller,b);await a.query('commit');
 const consistent=await concurrentRead;check(consistent.sitting.revision,state.revision);check(consistent.child.record.current_index,1);
 await denied(read(foreign,state.id),'PT401');check((await foreign.query('select count(*)::int n from public.timed_section_sittings_v1')).rows[0].n,0);
 await denied(b.query("update public.bootcamp_kv set data='{}' where record_id=$1",[consistent.child.record.id]),'42501');
 state=(await commit(a,envelope(state,'pause',{},'device-b'))).sitting;
 const close=envelope(state,'close',{answerKeys:blueprint.legs[0].qids.map(qid=>({qid,correctAnswer:'A'})),analysis:{}},'device-b');
 const closed=await Promise.all([commit(a,close),commit(b,close)]);check(closed.filter(r=>r.replayed).length,1);check(closed[0].sitting.completed_at,closed[1].sitting.completed_at);
 check((await admin.query('select count(*)::int n from public.section_history where timed_section_sitting_id=$1',[state.id])).rows[0].n,1);
 check((await admin.query('select count(*)::int n from public.practice_test_runs')).rows[0].n,0);
 check((await admin.query("select pg_has_role($1,'timed_section_executor','MEMBER') allowed",[login])).rows[0].allowed,false);
 check((await admin.query("select rolcanlogin,rolsuper,rolbypassrls from pg_roles where rolname='timed_section_executor'")).rows[0],{rolcanlogin:false,rolsuper:false,rolbypassrls:false});
 console.log(JSON.stringify({status:'passed',checks,database,scope:'real-PG-ordinary-connections-section-races',deployed:false}));
}finally{await Promise.allSettled(clients.map(c=>c.end()));}
