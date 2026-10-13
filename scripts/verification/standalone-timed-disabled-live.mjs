// Read-only ordinary JWT acceptance for the installed, disabled section contract.
// No mutating RPC, configuration change, record write or global sign-out.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const parseEnv=text=>Object.fromEntries(text.split(/\r?\n/).flatMap(line=>{
 const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);if(!match)return[];
 let value=match[2];if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
 return[[match[1],value]];
}));
const credentialPath=process.argv[2];if(!credentialPath)throw new Error('Usage: standalone-timed-disabled-live.mjs <central-env-path>');
const credentials=parseEnv(await readFile(resolve(credentialPath),'utf8'));
const config=parseEnv(await readFile(resolve('.env'),'utf8'));
if(!config.VITE_SUPABASE_URL||!config.VITE_SUPABASE_PUBLISHABLE_KEY)throw new Error('Public app configuration unavailable');
const client=()=>createClient(config.VITE_SUPABASE_URL,config.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const login=async prefix=>{
 const email=credentials[prefix+'_EMAIL'],password=credentials[prefix+'_PASSWORD'];if(!email||!password)throw new Error('Required '+prefix+' credentials unavailable');
 const c=client();const r=await c.auth.signInWithPassword({email,password});if(r.error||!r.data.user)throw new Error(prefix+' authentication failed');
 return{client:c,id:r.data.user.id};
};
const student=await login('LSATPREP_TESTER'),teacher=await login('LSATPREP_ADMIN');
if(student.id===teacher.id)throw new Error('Distinct accounts required');
const role=await teacher.client.from('user_roles').select('role').eq('user_id',teacher.id);
if(role.error||!role.data?.some(r=>r.role==='admin'))throw new Error('Administrator role not acknowledged');
const checks={},permissionReadOutcomes={};
for(const[name,session]of[['student',student],['admin',teacher]]){
 const cap=await session.client.rpc('timed_section_capability_v1');
 checks[name+'DisabledCapability']=!cap.error&&cap.data?.contractVersion===1&&cap.data?.workKind==='standalone-section'&&cap.data?.enabled===false&&cap.data?.stage==='writer-installed';
 checks[name+'DeclaredSource']=!cap.error&&JSON.stringify(cap.data?.sources)===JSON.stringify(['manual-canonical']);
 for(const table of ['timed_section_sittings_v1','timed_section_receipts_v1','timed_section_source_bindings_v1']){
  const result=await session.client.from(table).select(table==='timed_section_sittings_v1'?'id':'sitting_id').limit(1);
  checks[name+'EmptyOwnedRead_'+table]=!result.error&&Array.isArray(result.data)&&result.data.length===0;
 }
 const privateConfig=await session.client.from('timed_section_configuration_v1').select('enabled').limit(1);
 permissionReadOutcomes[name+'PrivateConfiguration']={errorCode:privateConfig.error?.code??null,rowCount:Array.isArray(privateConfig.data)?privateConfig.data.length:null};
 checks[name+'PrivateConfigurationNotExposed']=privateConfig.error?.code==='42501'||(!privateConfig.error&&Array.isArray(privateConfig.data)&&privateConfig.data.length===0);
 const unavailable=await session.client.rpc('read_timed_section_v1',{p_work_id:randomUUID()});
 checks[name+'UnavailableSittingDenied']=unavailable.error?.code==='PT401';
}
const anonymous=client();const anonymousCap=await anonymous.rpc('timed_section_capability_v1');
checks.anonymousCapabilityDenied=Boolean(anonymousCap.error);
const anonymousRead=await anonymous.from('timed_section_sittings_v1').select('id').limit(1);
permissionReadOutcomes.anonymousSource={errorCode:anonymousRead.error?.code??null,rowCount:Array.isArray(anonymousRead.data)?anonymousRead.data.length:null};
checks.anonymousSourceNoRowsExposed=anonymousRead.error?.code==='42501'||(!anonymousRead.error&&Array.isArray(anonymousRead.data)&&anonymousRead.data.length===0);
const output=JSON.stringify({checkedAt:new Date().toISOString(),readOnly:true,ordinaryJwt:true,configurationChanged:false,recordsWritten:false,
 scope:'disabled-contract-only; no existing foreign section fixture, mutating RPC, live timer or adoption claim',permissionReadOutcomes,checks},null,2);
if(process.argv.includes('--output'))await writeFile(resolve(process.argv[process.argv.indexOf('--output')+1]),output+'\n');
console.log(output);
if(Object.values(checks).some(value=>!value))process.exitCode=1;
