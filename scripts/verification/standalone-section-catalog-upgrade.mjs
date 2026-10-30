import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setupSql,owner} from './timed-pt-writer-fixtures.mjs';
import {preservingDeployment} from './build-preserving-deployment.mjs';
const modulePath=process.argv[process.argv.indexOf('--pglite-module')+1];
if(!globalThis.standaloneCatalogTestDb&&(!modulePath||!process.argv.includes('--pglite-module')))throw new Error('Pass --pglite-module absolute PGlite path');
const db=globalThis.standaloneCatalogTestDb ?? new (await import(pathToFileURL(resolve(modulePath)).href)).PGlite();let checks=0;
const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
const denied=async(fn,code)=>{await assert.rejects(fn,e=>!code||e.code===code);checks++;};
const artifact=name=>readFile(new URL('../../docs/implementation-plans/artifacts/'+name,import.meta.url),'utf8');
const admin=()=>db.exec(globalThis.standaloneCatalogAdminSql??'reset role');
const auth=async()=>{await admin();await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated');};
const rpc=async(name,c)=>(await db.query(`select public.${name}($1::jsonb) result`,[JSON.stringify(c)])).rows[0].result;
const creation=(pt,section,kind)=>({workKind:'standalone-section',workId:randomUUID(),commandId:randomUUID(),deviceId:'catalog-device',expectedRevision:0,writerEpoch:0,operation:'create',payload:{pt,section,kind,pace:'untimed'}});
const cmd=(s,operation,payload={})=>({workKind:'standalone-section',workId:s.id,commandId:randomUUID(),deviceId:'catalog-device',expectedRevision:Number(s.revision),writerEpoch:Number(s.writer_epoch),operation,payload});
const tables=['practice_test_runs','attempts','bootcamp_kv','section_history','rc_drill_sessions','rc_attempts','wrong_answer_journal','profiles','user_roles','practice_test_assignments','timed_pt_configuration_v1','timed_content_manifests_v1','timed_pt_receipts_v1','timed_pt_lr_bindings_v1','timed_section_configuration_v1','timed_section_sittings_v1','timed_section_receipts_v1','timed_section_source_bindings_v1','review_episodes_v1','review_episode_events_v1','intro_lr_attempts'];
try {
 await db.exec(globalThis.standaloneCatalogTestDb?setupSql.replace('create role authenticated; create role anon;',''):setupSql);await db.exec('alter table public.profiles add column has_drill_access boolean not null default false');
 await db.query('update public.profiles set has_drill_access=true where class_id=$1',[owner]);
 for(const name of ['2026-09-30-timed-pt-control-foundation.sql','2026-09-30-timed-pt-writer.sql','2026-09-30-standalone-timed-control-foundation.sql','2026-09-30-standalone-timed-writer.sql'])await db.exec(await artifact(name));
 const review=await artifact('2026-09-30-review-episodes.sql');
 await db.exec(review.slice(review.indexOf('CREATE TABLE'),review.indexOf('CREATE INDEX')));
 const episode=randomUUID();await db.query("insert into public.review_episodes_v1(id,student_id,actor_id,source_kind,source_id,question_id,reason) values($1,$2,$2,'intro_lr_attempts','retained-source','retained-question','missed')",[episode,owner]);
 await db.query("insert into public.review_episode_events_v1(id,episode_id,actor_id,kind,payload) values($1,$2,$3,'reflection','{\"reflection\":\"retained\",\"optional\":null}')",[randomUUID(),episode,owner]);
 const intro=await readFile(new URL('../../supabase/migrations/20260611080153_e6d62e7f-e9a9-4508-8555-6072c280614e.sql',import.meta.url),'utf8');
 await db.exec(intro.slice(intro.indexOf('CREATE TABLE'),intro.indexOf('CREATE INDEX')));
 await db.query("insert into public.intro_lr_attempts(user_id,drill_id,question_id,mode,selected_answer,correct,time_ms) values($1,'retained','same-question','drill',null,false,null),($1,'retained','same-question','drill',null,false,null)",[owner]);
 const old=JSON.parse(await artifact('timed-content-manifest-v1.generated.json'));
 const catalog=JSON.parse(await artifact('timed-section-all-sections-v2.generated.json'));
 check(catalog.sections.length,236);check(catalog.sections.filter(s=>s.definition.kind==='lr').length,156);check(catalog.sections.filter(s=>s.definition.kind==='rc').length,80);
 for(const test of old.blueprints) {
  await db.query('insert into public.timed_content_manifests_v1 values($1,$2,$3)',[old.manifestSha256,test.pt,JSON.stringify(test)]);
  for(const leg of test.legs)check(catalog.sections.find(s=>s.pt===test.pt&&s.definition.kind===leg.kind&&s.definition.section===leg.section).definition,leg);
 }
 check(catalog.sections.filter(s=>!old.blueprints.some(t=>t.pt===s.pt&&t.legs.some(l=>l.kind===s.definition.kind&&l.section===s.definition.section))).length,59);
 for(const source of catalog.provenance)check(createHash('sha256').update(await readFile(resolve(source.path))).digest('hex'),source.sha256);
 await db.query('update public.timed_pt_configuration_v1 set enabled=true,manifest_sha256=$1,lease_ms=45000',[old.manifestSha256]);
 await db.query('update public.timed_section_configuration_v1 set enabled=true,manifest_sha256=$1',[old.manifestSha256]);
 const existing=[];
 await auth();
 for(const kind of ['lr','rc']) {
  const leg=old.blueprints[0].legs.find(l=>l.kind===kind);const create=creation(old.blueprints[0].pt,leg.section,kind);
  let r=await rpc('create_timed_section_v1',create);r=await rpc('commit_timed_section_v1',cmd(r.sitting,'start'));r=await rpc('commit_timed_section_v1',cmd(r.sitting,'pause'));
  existing.push({create,sitting:r.sitting});
 }
 await denied(()=>rpc('create_timed_section_v1',creation(101,4,'rc')),'PT422');
 await denied(()=>rpc('create_timed_section_v1',creation(118,3,'lr')),'PT422');
 await admin();
 await db.query("insert into public.bootcamp_kv values($1,'practice_sessions','untouched-legacy',$2,clock_timestamp())",[owner,JSON.stringify({status:'completed',note:null,queue:['x','x']})]);
 const definitions=(await db.query("select proname,pg_get_functiondef(p.oid) definition,proacl::text acl,proowner from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like '%timed_pt%' order by proname")).rows;
 const policies=(await db.query('select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies order by schemaname,tablename,policyname')).rows;
 const membership=(await db.query("select * from pg_auth_members where roleid=(select oid from pg_roles where rolname='timed_section_executor') order by oid")).rows;
 const schemaAcl=(await db.query("select nspacl::text acl from pg_namespace where nspname='public'")).rows;
 const preflight=(await db.query(await artifact('2026-09-30-standalone-catalog-preflight.sql'))).rows[0].preservation_snapshot;
 check(preflight.standaloneCatalogExists,false);
 const saved={};for(const table of tables)saved[table]=(await db.query(`select to_jsonb(t) value from public.${table} t order by to_jsonb(t)::text`)).rows;
 const staged=process.argv.includes('--staged');
 const batchManifest=staged?JSON.parse(await artifact('standalone-catalog-seed-batches-v2/batch-manifest.json')):null;
 const upgraded=await db.exec(staged?await readFile(batchManifest.schemaOutput,'utf8'):preservingDeployment([await artifact('2026-09-30-standalone-section-catalog-upgrade.sql'),await artifact('timed-section-all-sections-v2.generated.sql')],tables));
 if(staged) {
  check(createHash('sha256').update(await readFile(batchManifest.schemaOutput)).digest('hex'),batchManifest.schemaSha256);
  check((await db.query('select count(*)::integer count from public.timed_section_content_manifests_v1')).rows[0].count,177);
  check((await db.query('select manifest_sha256 from public.timed_section_configuration_v1')).rows[0].manifest_sha256,old.manifestSha256);
  const statements=[];
  for(const batch of batchManifest.batches) {
   const sql=await artifact('standalone-catalog-seed-batches-v2/'+batch.name);
   check(createHash('sha256').update(sql).digest('hex'),batch.sha256);check(Buffer.byteLength(sql),batch.bytes);check(batch.bytes<=48000,true);
   const parts=sql.match(/do \$catalog\$[\s\S]*?end \$catalog\$;/g);check(parts.length,batch.sections);statements.push(...parts);
   await db.exec(sql);await db.exec(sql);
  }
  check(statements.length,236);
  check(statements.join('\n'),(await artifact('timed-section-all-sections-v2.generated.sql')).match(/do \$catalog\$[\s\S]*?end \$catalog\$;/g).join('\n'));
 }
 check(upgraded.flatMap(r=>r.rows??[]).filter(r=>r.original_values_preserved).length,21);
 for(const table of tables)check((await db.query(`select to_jsonb(t) value from public.${table} t order by to_jsonb(t)::text`)).rows,saved[table]);
 check((await db.query("select proname,pg_get_functiondef(p.oid) definition,proacl::text acl,proowner from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like '%timed_pt%' order by proname")).rows,definitions);
 const afterPolicies=(await db.query('select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies order by schemaname,tablename,policyname')).rows;
 check(policies.every(p=>afterPolicies.some(a=>JSON.stringify(a)===JSON.stringify(p))),true);
 check((await db.query("select * from pg_auth_members where roleid=(select oid from pg_roles where rolname='timed_section_executor') order by oid")).rows,membership);
 check((await db.query("select nspacl::text acl from pg_namespace where nspname='public'")).rows,schemaAcl);
 const post=await db.exec(await artifact('2026-09-30-standalone-catalog-postinstall.sql'));
 const postRows=post.flatMap(r=>r.rows??[]);
 check(postRows.find(r=>r.preservation_snapshot).preservation_snapshot,{...preflight,standaloneCatalogExists:true});
 const evidence=postRows.find(r=>r.catalog_install_evidence).catalog_install_evidence;
 check(evidence.fullCatalogSections,236);check(evidence.fullCatalogKinds,{lr:156,rc:80});
 check(evidence.allOldDefinitionsCopied,true);check(evidence.allSittingFrozenDefinitionsMatch,true);
 check(evidence.ordinaryCatalogSelect,false);check(evidence.ordinaryCatalogInsert,false);check(evidence.executorCatalogInsert,false);
 check((await db.query('select count(*)::integer count from public.timed_section_content_manifests_v1')).rows[0].count,413);
 const catalogBefore=(await db.query('select to_jsonb(m) value from public.timed_section_content_manifests_v1 m order by manifest_sha256,pt,kind,section')).rows;
 await db.exec(await artifact('timed-section-all-sections-v2.generated.sql'));
 check((await db.query('select to_jsonb(m) value from public.timed_section_content_manifests_v1 m order by manifest_sha256,pt,kind,section')).rows,catalogBefore);
 // A conflicting immutable version aborts its seed transaction. The deliberately
 // conflicting row lives only inside this test transaction and is rolled back.
 const conflictHash='e'.repeat(64);const conflict=catalog.sections.at(-1);
 await db.exec('begin');
 await db.query('insert into public.timed_section_content_manifests_v1 values($1,$2,$3,$4,$5)',[conflictHash,conflict.pt,conflict.definition.kind,conflict.definition.section,JSON.stringify({...conflict.definition,qids:conflict.definition.qids.map(q=>q+'-conflict')})]);
 await db.exec('savepoint catalog_conflict');
 const conflictingSeed=(await artifact(staged?'standalone-catalog-seed-batches-v2/'+batchManifest.batches.at(-1).name:'timed-section-all-sections-v2.generated.sql')).replace(/\bbegin;/i,'').replace(/commit;\s*$/i,'').replaceAll(catalog.manifestSha256,conflictHash);
 await denied(()=>db.exec(conflictingSeed),'P0001');await db.exec('rollback to savepoint catalog_conflict');
 check((await db.query('select count(*)::integer count from public.timed_section_content_manifests_v1 where manifest_sha256=$1',[conflictHash])).rows[0].count,1);await db.exec('rollback');
 check((await db.query('select to_jsonb(m) value from public.timed_section_content_manifests_v1 m order by manifest_sha256,pt,kind,section')).rows,catalogBefore);
 // Exact reviewed activation is TEST-only here; production selection belongs to
 // the parent. Guards must abort before changing either configuration or records.
 const activation=await artifact('2026-09-30-standalone-catalog-activation.sql');
 const rejectedActivation=async sql=>{await denied(()=>db.exec(sql),'P0001');await db.exec('rollback');};
 await rejectedActivation(activation); // PT lease45000 differs from reviewed30000.
 await db.query('update public.timed_pt_configuration_v1 set lease_ms=30000');
 await db.query('update public.timed_section_configuration_v1 set enabled=false');await rejectedActivation(activation);
 await db.query('update public.timed_section_configuration_v1 set enabled=true');
 await rejectedActivation(activation.replace("expected_digest constant text := '86e8ed3eef6936e488684e07fcd68017'","expected_digest constant text := '00000000000000000000000000000000'"));
 await rejectedActivation(activation.replace('if count_sections<>236','if count_sections<>237'));
 await db.query('update public.timed_section_configuration_v1 set manifest_sha256=$1',['f'.repeat(64)]);await rejectedActivation(activation);
 await db.query('update public.timed_section_configuration_v1 set manifest_sha256=$1',[old.manifestSha256]);
 const beforeActivation={};for(const table of tables)beforeActivation[table]=(await db.query(`select to_jsonb(t) value from public.${table} t order by to_jsonb(t)::text`)).rows;
 await db.exec(activation);
 for(const table of tables.filter(name=>name!=='timed_section_configuration_v1'))check((await db.query(`select to_jsonb(t) value from public.${table} t order by to_jsonb(t)::text`)).rows,beforeActivation[table]);
 check((await db.query('select to_jsonb(c) value from public.timed_section_configuration_v1 c')).rows,[{value:{...beforeActivation.timed_section_configuration_v1[0].value,manifest_sha256:catalog.manifestSha256}}]);
 await rejectedActivation(activation); // Stale CAS/repeated selection fails closed.
 await auth();
 const beforeOrdinary=(await db.query('select count(*)::integer count from public.timed_section_sittings_v1')).rows;
 check((await db.query('select public.timed_section_capability_v1() result')).rows[0].result.enabled,true);
 for(const previous of existing)check((await db.query('select public.read_timed_section_v1($1) result',[previous.sitting.id])).rows[0].result.sitting,previous.sitting);
 check((await db.query('select count(*)::integer count from public.timed_section_sittings_v1')).rows,beforeOrdinary);
 for(const previous of existing) {
  const replay=await rpc('create_timed_section_v1',previous.create);check(replay.replayed,true);check(replay.sitting,previous.sitting);
  const resume=await rpc('commit_timed_section_v1',cmd(previous.sitting,'resume'));check(resume.sitting.manifest_sha256,old.manifestSha256);check(resume.sitting.frozen_source,previous.sitting.frozen_source);
  await rpc('commit_timed_section_v1',cmd(resume.sitting,'pause'));
 }
 for(const [pt,section,kind] of [[118,3,'lr'],[101,4,'rc']]) {
  let r=await rpc('create_timed_section_v1',creation(pt,section,kind));const frozen=catalog.sections.find(s=>s.pt===pt&&s.definition.section===section).definition;
  check(r.sitting.frozen_source,frozen);r=await rpc('commit_timed_section_v1',cmd(r.sitting,'start'));check(r.sitting.phase,'running');
  const payload=kind==='lr'?{answerKeys:frozen.qids.map(qid=>({qid,correctAnswer:'A'})),analysis:{}}:{analysis:{}};
  r=await rpc('commit_timed_section_v1',cmd(r.sitting,'close',payload));check(r.sitting.phase,'complete');check(r.sitting.result.total,frozen.questionCount);
  if(kind==='lr') {
   await admin();const native=(await db.query('select data from public.bootcamp_kv where record_id=$1',[`timed-section::${r.sitting.id}`])).rows[0].data;
   check(native.question_queue,frozen.qids);
   // Served positions are dense; canonical question identities preserve the removed gap.
   check(frozen.questions.some((q,i)=>q.qnum!==i+1),true);
   const history=(await db.query('select to_jsonb(h) value from public.section_history h where timed_section_sitting_id=$1',[r.sitting.id])).rows[0].value;
   check(history.questions_json.map(q=>q.qid),frozen.qids);
   check(history.questions_json.map(q=>q.qnum),Array.from({length:frozen.questionCount},(_,i)=>i+1));await auth();
  } else {await admin();check((await db.query('select count(*)::integer count from public.rc_attempts where session_id=(select rc_session_id from public.timed_section_source_bindings_v1 where sitting_id=$1)',[r.sitting.id])).rows[0].count,frozen.questionCount);await auth();}
 }
 await denied(()=>rpc('create_timed_section_v1',creation(101,4,'lr')),'PT422');
 check((await db.query("select pg_has_role('authenticated','timed_section_executor','SET') allowed")).rows[0].allowed,false);
 await denied(()=>db.query("insert into public.timed_section_content_manifests_v1 values($1,999,'lr',1,'{}')",['f'.repeat(64)]),'42501');
 await admin();await denied(()=>db.exec("update public.timed_section_content_manifests_v1 set definition=definition"),'42501');
 await denied(()=>db.query("insert into public.timed_section_content_manifests_v1 values($1,999,'lr',1,'{}')",['f'.repeat(64)]),'23514');
 await denied(()=>db.exec('set role authenticated; update public.timed_section_sittings_v1 set frozen_source=\'{}\''),'42501');await admin();
 check((await db.query('select count(*)::integer count from public.practice_test_runs')).rows[0].count,0);
 console.log(JSON.stringify({checks,sections:236,newlySupported:59,preservedTables:21,oldResume:true,oldReceiptReplay:true,prepTestUnchanged:true,staged,batches:batchManifest?.batches.length??0,deployed:false}));
}finally{await db.close();}
