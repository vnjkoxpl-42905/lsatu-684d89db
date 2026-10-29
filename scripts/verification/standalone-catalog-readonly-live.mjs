// Ordinary JWT reads only. No creation/commit/configuration/source write RPCs.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const parseEnv=text=>Object.fromEntries(text.split(/\r?\n/).flatMap(line=>{
 const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);if(!match)return[];
 let value=match[2];if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
 return[[match[1],value]];
}));
if(!process.argv[2])throw new Error('Usage: standalone-catalog-readonly-live.mjs central-env-path [--output result-path]');
const secrets=parseEnv(await readFile(resolve(process.argv[2]),'utf8'));
const config=parseEnv(await readFile(resolve('.env'),'utf8'));
if(!config.VITE_SUPABASE_URL||!config.VITE_SUPABASE_PUBLISHABLE_KEY)throw new Error('Public app configuration unavailable');
const create=()=>createClient(config.VITE_SUPABASE_URL,config.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function login(prefix){
 if(!secrets[prefix+'_EMAIL']||!secrets[prefix+'_PASSWORD'])throw new Error(prefix+' credentials unavailable');
 const client=create();const response=await client.auth.signInWithPassword({email:secrets[prefix+'_EMAIL'],password:secrets[prefix+'_PASSWORD']});
 if(response.error||!response.data.user)throw new Error(prefix+' authentication failed');
 return{client,id:response.data.user.id};
}
const student=await login('LSATPREP_TESTER');const teacher=await login('LSATPREP_ADMIN');
if(student.id===teacher.id)throw new Error('Distinct fixture accounts required');
const checks={};const ownedCounts={};
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
async function snapshot(session,table){
 const order=table==='timed_section_receipts_v1'?'command_id':table==='timed_section_source_bindings_v1'?'sitting_id':'id';
 const response=await session.client.from(table).select('*').order(order);
 if(response.error||!Array.isArray(response.data))throw new Error('Owned '+table+' read failed');return response.data;
}
const tables=['timed_section_sittings_v1','timed_section_receipts_v1','timed_section_source_bindings_v1'];
let studentSitting;
for(const [name,session] of [['student',student],['admin',teacher]]){
 const before={};for(const table of tables)before[table]=await snapshot(session,table);
 const sittings=before.timed_section_sittings_v1;ownedCounts[name]=sittings.length;
 checks[name+'OwnedScope']=sittings.every(s=>s.owner_id===session.id);
 if(name==='student'){checks.studentExistingFixture=sittings.length>0;studentSitting=sittings[0]?.id;}
 const capability=await session.client.rpc('timed_section_capability_v1');
 checks[name+'EnabledCapability']=!capability.error&&capability.data?.contractVersion===1&&capability.data?.workKind==='standalone-section'&&capability.data?.enabled===true;
 checks[name+'ManualSource']=!capability.error&&JSON.stringify(capability.data?.sources)===JSON.stringify(['manual-canonical']);
 for(const sitting of sittings){
  const response=await session.client.rpc('read_timed_section_v1',{p_work_id:sitting.id});
  checks[name+'ExactRead_'+sitting.kind]=Boolean((checks[name+'ExactRead_'+sitting.kind]??true)&&!response.error&&canonical(response.data?.sitting)===canonical(sitting));
 }
 for(const table of ['timed_section_content_manifests_v1','timed_section_configuration_v1']){
  const response=await session.client.from(table).select('*').limit(1);
  checks[name+'Private_'+table]=response.error?.code==='42501'||(!response.error&&Array.isArray(response.data)&&response.data.length===0);
 }
 const missing=await session.client.rpc('read_timed_section_v1',{p_work_id:randomUUID()});checks[name+'MissingDenied']=missing.error?.code==='PT401';
 for(const table of tables)checks[name+'ReadPreserves_'+table]=JSON.stringify(await snapshot(session,table))===JSON.stringify(before[table]);
}
if(studentSitting){const foreign=await teacher.client.rpc('read_timed_section_v1',{p_work_id:studentSitting});checks.foreignSittingDenied=foreign.error?.code==='PT401';}
const anonymous=create();checks.anonymousCapabilityDenied=Boolean((await anonymous.rpc('timed_section_capability_v1')).error);
const output=JSON.stringify({checkedAt:new Date().toISOString(),ordinaryJwt:true,readOnly:true,recordsWritten:false,configurationChanged:false,
 scope:'ordinary capability and exact owned sitting read; catalog hash independently verified by managed read-only SQL',ownedCounts,checks},null,2);
if(process.argv.includes('--output'))await writeFile(resolve(process.argv[process.argv.indexOf('--output')+1]),output+'\n');
console.log(output);if(Object.values(checks).some(value=>!value))process.exitCode=1;
