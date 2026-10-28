/** Disposable PostgreSQL only. No production connection string is accepted.
 * Uses Docker's local named test container; never removes user data/containers.
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../',import.meta.url));
const container='lsatu-assignment-sync-test-20261028';
function sql(script) {
 const result=spawnSync('docker',['exec','-i',container,'psql','-U','postgres','-d','assignment_sync','-v','ON_ERROR_STOP=1','-X','-q'],{input:script,encoding:'utf8',maxBuffer:8*1024*1024});
 if(result.status!==0) throw new Error(result.stderr||result.stdout||'PostgreSQL failed');
 return result.stdout;
}
const load=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migrations=['20261028140000_student_work_delivery.sql','20261028141000_student_work_mcp_writers.sql','20261028142000_reading_center_delivery_policy.sql','20261028143000_section_attempt_delivery_policy.sql'].map(n=>load('supabase/migrations/'+n));
for(const oldIndex of [false,true]) {
 sql([load('scripts/sql/student-work-baseline.sql'),oldIndex?"create unique index notifications_unique_unread_assignment on public.notifications(user_id,link) where type='assignment' and not read;":'',...migrations,load('scripts/sql/student-work-assertions.sql')].join('\n'));
 // A second schema application is a silent no-op for existing receipts/events.
 const stateQuery="select jsonb_build_object('receipts',(select count(*) from student_work_receipts),'events',(select count(*) from assignment_delivery_events),'notifications',(select count(*) from notifications),'control',(select to_jsonb(c) from assignment_delivery_control c),'grants',(select md5(string_agg(p.oid::regprocedure::text||':'||coalesce(p.proacl::text,'{}'),E'\\n' order by p.oid::regprocedure::text)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'));";
 const before=sql(stateQuery);
 for(const migration of migrations)sql(migration);
 const after=sql(stateQuery);
 if(before!==after)throw new Error(`Migration replay changed durable state: before=${before.trim()} after=${after.trim()}`);
 console.log(`PASS PostgreSQL baseline old-index=${oldIndex}: owner/RLS, source/mirror, gates, generation, receipts, group/schedule/recovery, seven-day flows, lifetime delivery and silent replay`);
}
