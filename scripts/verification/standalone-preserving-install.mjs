// Execute the exact combined preserving wrapper in a managed-role simulation.
// Existing records, functions, policies and active PT configuration are retained.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setupSql,owner,other,blueprint,manifestHash,createCommand,commandFor} from './timed-pt-writer-fixtures.mjs';
import {preservingDeployment} from './build-preserving-deployment.mjs';
const arg=name=>process.argv[process.argv.indexOf(name)+1];
for(const flag of ['--pg-module','--port','--data-dir'])if(!process.argv.includes(flag))throw new Error('Required '+flag);
const port=Number(arg('--port'));assert.ok(Number.isInteger(port)&&port>1024&&port<65536);
const{default:pg}=await import(pathToFileURL(resolve(arg('--pg-module'))).href);
const clients=[];let checks=0;
const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
const connect=async(user='lsatu_test',database='postgres')=>{const c=new pg.Client({host:'127.0.0.1',port,user,database,application_name:'lsatu-standalone-preserving-install'});await c.connect();clients.push(c);await c.query("set statement_timeout='60s'");return c;};
const normalized=p=>p.replaceAll('\\','/').replace(/\/$/,'').toLowerCase();
const names=['practice_test_runs','attempts','bootcamp_kv','section_history','rc_drill_sessions','rc_attempts','wrong_answer_journal','profiles','user_roles','practice_test_assignments',
 'timed_pt_configuration_v1','timed_content_manifests_v1','timed_pt_receipts_v1','timed_pt_lr_bindings_v1'];
const measure=async(c,name,columns)=>{
 const row=(await c.query(`select count(*)::text row_count,md5(coalesce(string_agg(row_hash,'' order by row_hash),'')) digest
 from(select md5((select jsonb_object_agg(key,value) from jsonb_each(to_jsonb(t)) where key=any($1))::text) row_hash from public.${name} t) measured`,[columns])).rows[0];
 return{table_name:name,...row};
};
const functions=async c=>(await c.query(`select p.oid::text oid,p.oid::regprocedure::text signature,pg_get_functiondef(p.oid) definition,r.rolname owner
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='public' and p.prokind='f' order by p.oid`)).rows;
const functionAcl=async(c,oids)=>(await c.query(`select p.oid::text oid,p.proname,case when a.grantee=0 then 'PUBLIC' else r.rolname end grantee,a.privilege_type,a.is_grantable
 from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a left join pg_roles r on r.oid=a.grantee
 where p.oid=any($1::oid[]) order by p.oid,grantee,a.privilege_type,a.is_grantable`,[oids])).rows;
try{
 // The wrapper accepts valid versioned identifiers and rejects injection forms.
 const small='begin;\nselect 1;\ncommit;';
 check(preservingDeployment(small,['timed_pt_configuration_v1']).includes('public.timed_pt_configuration_v1'),true);
 for(const invalid of ['x;drop_table','public.profiles','profiles--','1table','"profiles"']){assert.throws(()=>preservingDeployment(small,[invalid]),/Invalid preservation tables/);checks++;}
 const controller=await connect();const directory=(await controller.query('show data_directory')).rows[0].data_directory;
 assert.equal(normalized(directory),normalized(resolve(arg('--data-dir'))));assert.match(directory,/lsatu-pg-atomic-/);
 const suffix=randomUUID().replaceAll('-','');const migration='lsatu_preserve_section_migration_'+suffix;const database='lsatu_preserve_section_'+suffix;
 await controller.query(`create role ${migration} login nosuperuser createrole createdb bypassrls`);
 await controller.query(`grant timed_pt_executor,timed_section_executor to ${migration} with admin true,set false,inherit false`);
 await controller.query(`create database ${database} owner ${migration}`);
 const viaSetRole=process.argv.includes('--set-role-installer');
 const deployer=await connect(viaSetRole?'lsatu_test':migration,database);
 if(viaSetRole)await deployer.query(`set role ${migration}`);
 await deployer.query(setupSql.replace('create role authenticated; create role anon;',()=>''));
 await deployer.query('alter table public.profiles add column has_drill_access boolean not null default false');
 await deployer.query('update public.profiles set has_drill_access=true where class_id=$1',[owner]);
 // Legacy examples include repeated logical attempts, null owners/answers and
 // historical completed rows with null timestamps; installation must not repair them.
 await deployer.query(`insert into public.practice_test_runs(id,user_id,pt,pace,legs,break_after_leg,status) values
 ('legacy-1',$1,140,'standard','[]',2,'in_progress'),('legacy-2',$1,141,'untimed','[]',2,'complete');`,[owner]);
 await deployer.query(`insert into public.bootcamp_kv(user_id,table_name,record_id,data) values
 ($1,'practice_sessions','legacy-1','{"answers":["A","A",null],"completion":null}'),($1,'drill_runs','legacy-2','{"nested":{"unknown":null},"status":"completed"}')`,[owner]);
 await deployer.query(`insert into public.attempts(user_id,class_id,qid,pt,section,qnum,qtype,level,correct,time_ms,mode,selected_answer) values
 ($1::uuid,$1::text,'legacy-q',140,1,1,'Flaw',3,false,100,'full-section','B'),
 ($1::uuid,$1::text,'legacy-q',140,1,1,'Flaw',3,false,100,'full-section','B'),
 (null,$1::text,'legacy-null',140,1,2,'Flaw',3,false,0,'full-section',null)`,[owner]);
 await deployer.query(`insert into public.section_history(user_id,class_id,pt,section,questions_json,analysis_json,completed_at) values
 ($1::uuid,$1::text,140,1,'[{"selected":null}]',null,null),(null,$1::text,140,1,'[{"selected":null}]',null,null)`,[owner]);
 const legacyRc=randomUUID();
 await deployer.query(`insert into public.rc_drill_sessions(id,user_id,config,passage_ids,status,completed_at) values($1,$2,'{"legacy":null,"repeat":[1,1]}','{101}','completed',null)`,[legacyRc,owner]);
 await deployer.query(`insert into public.rc_attempts(session_id,user_id,question_id,passage_id,selected,is_correct,is_first_attempt) values
 ($1,$2,1001,101,null,null,true),($1,$2,1001,101,null,null,false)`,[legacyRc,owner]);
 await deployer.query(`insert into public.wrong_answer_journal(class_id,qid,history_json) values($1,'legacy-q','[{"result":0},{"result":0},{"result":null}]')`,[owner]);
 await deployer.query(`insert into public.user_roles(user_id,role) values($1,'student'),($1,'student')`,[owner]);
 await deployer.query(`insert into public.practice_test_assignments(student_id,pt,status,unlock_at) values($1,140,'assigned',null),($2,141,'archived',null)`,[owner,other]);
 const authOwner='lsatu_preserve_section_auth_'+suffix;await controller.query(`create role ${authOwner} nologin nosuperuser nocreaterole nocreatedb nobypassrls`);
 const schemaController=await connect('lsatu_test',database);
 await schemaController.query(`alter schema auth owner to ${authOwner};alter function auth.uid() owner to ${authOwner};alter table auth.users owner to ${authOwner};grant usage on schema auth to ${migration},authenticated,anon;grant references on auth.users to ${migration}`);
 for(const name of ['2026-09-30-timed-pt-control-foundation.sql','2026-09-30-timed-pt-writer.sql','2026-09-30-timed-pt-checkpoint-metadata-upgrade.sql']){
  await deployer.query(await readFile(new URL('../../docs/implementation-plans/artifacts/'+name,import.meta.url),'utf8'));
  if(viaSetRole)await deployer.query(`set role ${migration}`);
 }
 await deployer.query('insert into public.timed_content_manifests_v1 values($1,140,$2),($3,140,$2)',[manifestHash,JSON.stringify(blueprint),'b'.repeat(64)]);
 await deployer.query('update public.timed_pt_configuration_v1 set enabled=true,manifest_sha256=$1,lease_ms=45000',[manifestHash]);
 const login='lsatu_preserve_section_client_'+suffix;await controller.query(`create role ${login} login nosuperuser nocreaterole nocreatedb nobypassrls noinherit;grant authenticated to ${login} with set true`);
 const student=await connect(login,database);await student.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await student.query('set role authenticated');
 const create=createCommand('already-protected-pt',randomUUID());const created=(await student.query('select public.create_timed_practice_test_v1($1::jsonb) result',[JSON.stringify(create)])).rows[0].result;
 const started=(await student.query('select public.commit_timed_work_v1($1::jsonb) result',[JSON.stringify(commandFor(created.parent,'start-leg',{},randomUUID()))])).rows[0].result;
 await student.query('select public.commit_timed_work_v1($1::jsonb)',[JSON.stringify(commandFor(started.parent,'checkpoint',{currentIndex:1,answers:[{qid:'PT140-S1-Q1',selected:'C',correct:false,timeMs:999}]},randomUUID()))]);
 const before=[];const columns=new Map();
 for(const name of names){const cols=(await deployer.query("select attname from pg_attribute where attrelid=$1::regclass and attnum>0 and not attisdropped order by attnum",['public.'+name])).rows.map(r=>r.attname);columns.set(name,cols);before.push(await measure(deployer,name,cols));}
 check(before.every(r=>Number(r.row_count)>0),true);
 const functionBefore=await functions(deployer);const oids=functionBefore.map(f=>f.oid);const aclBefore=await functionAcl(deployer,oids);
 const policyBefore=(await deployer.query('select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies order by schemaname,tablename,policyname')).rows;
 const configurationBefore=(await deployer.query('select to_jsonb(c) value from public.timed_pt_configuration_v1 c')).rows;
 check(configurationBefore[0].value.enabled,true);
 const artifacts=await Promise.all(['2026-09-30-standalone-timed-control-foundation.sql','2026-09-30-standalone-timed-writer.sql'].map(name=>readFile(new URL('../../docs/implementation-plans/artifacts/'+name,import.meta.url),'utf8')));
 const combined=preservingDeployment(artifacts,names);
 const combinedHash=createHash('sha256').update(combined).digest('hex');
 if(process.argv.includes('--sql-output'))await writeFile(resolve(arg('--sql-output')),combined);
 const originalRole=(await deployer.query('select current_user role')).rows[0].role;
 const membershipBefore=(await deployer.query("select pg_has_role(current_user,'timed_section_executor','SET') section_set,pg_has_role(current_user,'timed_pt_executor','SET') pt_set")).rows;
 const results=await deployer.query(combined);
 check((await deployer.query('select current_user role')).rows[0].role,originalRole);
 const report=results.find(r=>r.fields?.some(f=>f.name==='original_values_preserved')).rows;
 check(report.length,names.length);check(report.every(r=>r.original_values_preserved),true);
 const after=[];for(const name of names)after.push(await measure(deployer,name,columns.get(name)));
 check(after,before);
 const functionAfter=await functions(deployer);for(const f of functionBefore)check(functionAfter.find(a=>a.oid===f.oid),f);
 const aclAfter=await functionAcl(deployer,oids);
 check(aclBefore.every(old=>aclAfter.some(current=>JSON.stringify(current)===JSON.stringify(old))),true);
 const addedAcl=aclAfter.filter(current=>!aclBefore.some(old=>JSON.stringify(old)===JSON.stringify(current)));
 const allowedAcl=['timed_pt_actor_v1','timed_pt_check_keys_v1','timed_pt_parent_protected_v1'];
 check(addedAcl.every(r=>allowedAcl.includes(r.proname)&&r.grantee==='timed_section_executor'&&r.privilege_type==='EXECUTE'&&!r.is_grantable),true);
 for(const signature of ['timed_pt_actor_v1()','timed_pt_check_keys_v1(jsonb,text[])','timed_pt_parent_protected_v1(text)'])
  check((await deployer.query('select has_function_privilege($1,$2,$3) allowed',['timed_section_executor','public.'+signature,'EXECUTE'])).rows[0].allowed,true);
 const policyAfter=(await deployer.query('select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies order by schemaname,tablename,policyname')).rows;
 check(policyBefore.every(old=>policyAfter.some(current=>JSON.stringify(current)===JSON.stringify(old))),true);
 check((await deployer.query('select to_jsonb(c) value from public.timed_pt_configuration_v1 c')).rows,configurationBefore);
 check((await deployer.query('select enabled,manifest_sha256,lease_ms from public.timed_section_configuration_v1')).rows,[{enabled:false,manifest_sha256:null,lease_ms:30000}]);
 check((await deployer.query('select count(*)::int n from public.timed_section_sittings_v1')).rows[0].n,0);
 check((await deployer.query("select pg_has_role(current_user,'timed_section_executor','SET') section_set,pg_has_role(current_user,'timed_pt_executor','SET') pt_set")).rows,membershipBefore);
 check(membershipBefore[0].section_set,false);
 await assert.rejects(student.query('set role timed_section_executor'),e=>e.code==='42501');checks++;
 check((await student.query('select public.timed_section_capability_v1() result')).rows[0].result.enabled,false);
 console.log(JSON.stringify({status:'passed',checks,database,combinedSha256:combinedHash,combinedTransaction:true,managedNonSuperuser:true,
  originalValuesPreserved:after,oldFunctionsPreserved:functionBefore.length,oldPoliciesPreserved:policyBefore.length,
  permittedAddedFunctionAcl:addedAcl.map(r=>r.proname),activatedPtConfigurationPreserved:true,standaloneDisabled:true,ordinaryExecutorDenied:true,initialEffectiveRolePreserved:true,viaSetRole,productionWrites:false}));
}finally{await Promise.allSettled(clients.map(c=>c.end()));}
