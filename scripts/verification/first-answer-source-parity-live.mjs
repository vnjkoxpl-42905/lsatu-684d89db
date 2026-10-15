// Ordinary-JWT read-only source reconciliation. Stores counts/hashes, never raw answers or credentials.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
function env(text) { return Object.fromEntries(text.split(/\r?\n/).flatMap(line => {
  const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/); if(!match)return [];
  let value=match[2];if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);return [[match[1],value]];
})); }
if(!process.argv[2])throw new Error('Provide central credential env path.');
const credentials=env(await readFile(resolve(process.argv[2]),'utf8')), config=env(await readFile(resolve('.env'),'utf8'));
if(!config.VITE_SUPABASE_URL||!config.VITE_SUPABASE_PUBLISHABLE_KEY)throw new Error('Missing public app configuration.');
async function login(prefix) {
  const client=createClient(config.VITE_SUPABASE_URL,config.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.auth.signInWithPassword({email:credentials[`${prefix}_EMAIL`],password:credentials[`${prefix}_PASSWORD`]});
  if(error||!data.user)throw new Error(`${prefix} ordinary session could not be established.`);return {client,owner:data.user.id};
}
const student=await login('LSATPREP_TESTER'), teacher=await login('LSATPREP_ADMIN');
if(student.owner===teacher.owner)throw new Error('Distinct sessions required.');
const identity=await teacher.client.rpc('get_student_progress_user_id',{p_class_id:student.owner});
if(identity.error||identity.data!==student.owner)throw new Error('Canonical selected-student identity was not acknowledged.');
const sources={
  attempts:'id,user_id,qid,qtype,mode,correct,selected_answer,timestamp_iso',
  section_history:'id,user_id,mode,completed_at,practice_test_run_id,questions_json',
  rc_attempts:'id,user_id,session_id,passage_id,question_id,selected,is_correct,created_at',
  rc_drill_sessions:'id,user_id,status,completed_at,excluded_from_analytics,practice_test_run_id,timed_section_sitting_id',
  practice_test_runs:'id,user_id,status,completed_at',
};
async function readSources(client) { return Object.fromEntries(await Promise.all(Object.entries(sources).map(async ([table,columns])=>{
  const rows=[];
  for(let offset=0;;offset+=500){const result=await client.from(table).select(columns).eq('user_id',student.owner).order('id').range(offset,offset+499);if(result.error)throw new Error(`${table} source read failed.`);rows.push(...(result.data??[]));if((result.data??[]).length<500)break;}
  if(rows.some(row=>row.user_id!==student.owner))throw new Error(`${table} returned an unexpected subject.`);
  return [table,{count:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')}];
}))); }
const studentSources=await readSources(student.client), teacherSources=await readSources(teacher.client);
const checks=Object.fromEntries(Object.keys(sources).map(table=>[table,studentSources[table].count===teacherSources[table].count&&studentSources[table].sha256===teacherSources[table].sha256]));
const evidence={checkedAt:new Date().toISOString(),readOnly:true,ordinaryJwt:true,canonicalIdentityAcknowledged:true,studentSources,teacherSources,matchingSources:checks,
  limits:['One designated QA account sample; no other student population claim.','Matching raw source populations feed the same first-answer reducer; this probe does not assert browser rendering.','No source rows or identity mappings were modified.','Concurrent legitimate source writes can produce unequal snapshots; rerun after work is submitted if necessary.']};
await writeFile(resolve('docs/agent/verification/2026-09-30-first-answer-source-parity-live.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({status:Object.values(checks).every(Boolean)?'passed':'unequal snapshots',readOnly:true,ordinaryJwt:true,matchingSources:checks,sourceCounts:Object.fromEntries(Object.entries(studentSources).map(([table,value])=>[table,value.count]))}));
if(Object.values(checks).some(value=>!value))process.exitCode=1;
