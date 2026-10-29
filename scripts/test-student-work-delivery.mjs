/** Disposable PostgreSQL only. No production connection string is accepted.
 * Uses Docker's local named test container; never removes user data/containers.
 */
import { readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../',import.meta.url));
const container='lsatu-assignment-sync-test-20261028';
function sql(script) {
 const result=spawnSync('docker',['exec','-i',container,'psql','-U','postgres','-d','assignment_sync','-v','ON_ERROR_STOP=1','-X','-q'],{input:script,encoding:'utf8',maxBuffer:8*1024*1024});
 if(result.status!==0) throw new Error(result.stderr||result.stdout||'PostgreSQL failed');
 return result.stdout;
}

function parallelSql(script) {
 return new Promise((resolve,reject)=>{
  const child=spawn('docker',['exec','-i',container,'psql','-U','postgres','-d','assignment_sync','-v','ON_ERROR_STOP=1','-X','-q','-t','-A']);
  let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
  child.on('error',reject);child.on('close',status=>status===0?resolve(stdout):reject(new Error(stderr||stdout||'Concurrent PostgreSQL failed')));child.stdin.end(script);
 });
}
const load=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migrations=['20261028140000_student_work_delivery.sql','20261028141000_student_work_mcp_writers.sql','20261028142000_reading_center_delivery_policy.sql','20261028143000_section_attempt_delivery_policy.sql','20261028144000_session_bundle_materialization.sql','20261028145000_student_work_owner_acknowledgment.sql'].map(n=>load('supabase/migrations/'+n));
for(const oldIndex of [false,true]) {
 sql([load('scripts/sql/student-work-baseline.sql'),oldIndex?"create unique index notifications_unique_unread_assignment on public.notifications(user_id,link) where type='assignment' and not read;":'',...migrations,load('scripts/sql/student-work-assertions.sql')].join('\n'));
 // Independent PostgreSQL sessions prove simultaneous publication materializes
 // exactly one item/event and both clients observe the same persisted identity.
 const race=await Promise.all([1,2].map(n=>parallelSql(`begin;set request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';select public.materialize_session_bundle_part('78600000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','homework','Concurrent title ${n}','Concurrent body ${n}',('78600000-0000-0000-9998-00000000000' || ${n}::text)::uuid,'{"approved":true,"include":true,"audience":"student"}'::jsonb);select pg_sleep(0.2);commit;`)));
 const results=race.map(output=>JSON.parse(output.split('\n').find(line=>line.trim().startsWith('{'))));
 if(results.filter(result=>result.created).length!==1||results[0].item.id!==results[1].item.id||results[0].item.notification_group_id!==results[1].item.notification_group_id)throw new Error('Concurrent session bundle retry duplicated or changed identity');
 sql(`select public.assert_true((select count(*)=1 from classroom_items where source_table='ai_ta_drafts' and source_id='78600000-0000-0000-0000-000000000002' and metadata_json->>'bundle_part'='homework'),'concurrent session bundle one preserved item');select public.assert_true((select count(*)=1 from assignment_delivery_events where source_id='${results[0].item.id}'),'concurrent session bundle one durable event');`);
 // Two different parts racing also share the persisted homework group and
 // patch only their own posted markers, without losing each other's result.
 sql(`insert into ai_ta_drafts(id,student_id,created_by,draft_type,draft_json) values('78600000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','classroom_update_bundle','{"parts":{"homework":{"approved":true,"include":true,"audience":"student"},"quiz":{"approved":true,"include":true,"audience":"student"}}}');`);
 const differentParts=await Promise.all(['homework','quiz'].map((part,n)=>parallelSql(`begin;set request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';select public.materialize_session_bundle_part('78600000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','${part}','Concurrent ${part}','Concurrent content',('78600000-0000-0000-9997-00000000000'||${n+1}::text)::uuid,'{"approved":true,"include":true,"audience":"student"}'::jsonb);select pg_sleep(0.2);commit;`)));
 const distinctResults=differentParts.map(output=>JSON.parse(output.split('\n').find(line=>line.trim().startsWith('{'))));
 if(distinctResults.filter(result=>result.created).length!==2||distinctResults[0].item.notification_group_id!==distinctResults[1].item.notification_group_id)throw new Error('Concurrent different session parts lost their stable homework group');
 sql(`select public.assert_true((select draft_json->'parts'->'homework'->>'posted'='true' and draft_json->'parts'->'quiz'->>'posted'='true' from ai_ta_drafts where id='78600000-0000-0000-0000-000000000004'),'concurrent different parts retain both atomic posted flags');`);
 // One optional Inbox/email attempt wins even if two publishers each created
 // a distinct part in this group. The durable bell does not depend on it.
 sql(`set request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';select public.finalize_assignment_notification_group('78600000-0000-0000-9999-000000000001');`);
 const claims=await Promise.all([1,2].map(()=>parallelSql(`set request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';select public.claim_assignment_notification_channels('78600000-0000-0000-9999-000000000001');`)));
 if(claims.filter(result=>result.trim()==='t').length!==1||claims.filter(result=>result.trim()==='f').length!==1)throw new Error('Concurrent optional channel claim must have exactly one winner');
 // A second schema application is a silent no-op for existing receipts/events.
 const stateQuery="select jsonb_build_object('receipts',(select count(*) from student_work_receipts),'events',(select count(*) from assignment_delivery_events),'notifications',(select count(*) from notifications),'control',(select to_jsonb(c) from assignment_delivery_control c),'grants',(select md5(string_agg(p.oid::regprocedure::text||':'||coalesce(p.proacl::text,'{}'),E'\\n' order by p.oid::regprocedure::text)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'));";
 const before=sql(stateQuery);
 for(const migration of migrations)sql(migration);
 const after=sql(stateQuery);
 if(before!==after)throw new Error(`Migration replay changed durable state: before=${before.trim()} after=${after.trim()}`);
 console.log(`PASS PostgreSQL baseline old-index=${oldIndex}: owner/RLS, source/mirror, gates, generation, receipts, group/schedule/recovery, seven-day flows, lifetime delivery and silent replay`);
}
