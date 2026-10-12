// Ordinary admin/test-student JWT proof on dedicated, explicitly labelled QA rows.
// No notifications, grading, deletes, or changes to pre-existing assignments.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const parseEnv = text => Object.fromEntries(text.split(/\r?\n/).flatMap(line => {
  const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (!match) return [];
  return [[match[1],match[2].replace(/^(["'])(.*)\1$/,'$2')]];
}));
const [credentialPath,evidencePath]=process.argv.slice(2);
if (!credentialPath || !evidencePath) throw new Error('Pass credentials path and evidence output path');
const credentials=parseEnv(await readFile(resolve(credentialPath),'utf8'));
const env=parseEnv(await readFile(resolve('.env'),'utf8'));
const key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert.ok(key);
if (!key.startsWith('sb_publishable_')) assert.equal(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role,'anon');
async function login(prefix) {
  const client=createClient(env.VITE_SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.auth.signInWithPassword({email:credentials[`${prefix}_EMAIL`],password:credentials[`${prefix}_PASSWORD`]});
  if (error || !data.user) throw new Error('Ordinary authentication failed');
  return {client,id:data.user.id};
}
const evidence={date:'2026-09-30',ordinaryJwt:true,fixtureIds:{},checks:[],notifications:0,gradingRequests:0,deletes:0,preExistingRowsModified:0};
try {
  const student=await login('LSATPREP_TESTER'), admin=await login('LSATPREP_ADMIN');
  assert.notEqual(student.id,admin.id);
  const role=await admin.client.from('user_roles').select('role').eq('user_id',admin.id);
  assert.ifError(role.error);assert.ok(role.data.some(row=>row.role==='admin'));
  const studentRole=await student.client.from('user_roles').select('role').eq('user_id',student.id);
  assert.ifError(studentRole.error);assert.ok(!studentRole.data.some(row=>row.role==='admin'));
  const capability=await admin.client.rpc('activity_revocation_capability');
  assert.ifError(capability.error);assert.equal(capability.data.version,1);assert.equal(capability.data.source_preserving,true);
  const deniedCapability=await student.client.rpc('activity_revocation_capability');
  assert.equal(deniedCapability.error?.code,'42501');evidence.checks.push('admin capability; student capability denied');
  const existing=await admin.client.from('activity_assignments').select('class_id').eq('student_id',student.id).limit(1).single();
  assert.ifError(existing.error);assert.ok(existing.data.class_id);
  const id=randomUUID(),mirrorId=randomUUID(),responseId=randomUUID();
  evidence.fixtureIds={assignment:id,mirror:mirrorId,response:responseId};
  // Persist identities before the first write, so an interrupted run remains attributable.
  await writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');
  const issued={id,student_id:student.id,assigned_by:admin.id,class_id:existing.data.class_id,title:'[Verification only] Activity source revocation 2026-09-30',items:[{order:1,prompt:'Synthetic preservation check. No grading required.'}],item_format:'free-text',status:'assigned'};
  const insert=await admin.client.from('activity_assignments').insert(issued).select('*').single();
  assert.ifError(insert.error);evidence.checks.push('admin issued dedicated source with own attribution');
  const mirror={id:mirrorId,student_id:student.id,created_by:admin.id,class_id:existing.data.class_id,type:'activity',title:issued.title,source_table:'activity_assignments',source_id:id,status:'assigned',visible_to_student:true,metadata_json:{verification_only:true}};
  const mirrored=await admin.client.from('classroom_items').insert(mirror).select('id').single();
  assert.ifError(mirrored.error);
  const visible=await student.client.from('activity_assignments').select('id').eq('id',id).single();assert.ifError(visible.error);
  const response={id:responseId,assignment_id:id,student_id:student.id,item_order:1,response_text:'Synthetic preservation check; not graded.',attempt_no:1};
  const saved=await student.client.from('activity_item_responses').insert(response).select('*').single();assert.ifError(saved.error);
  evidence.checks.push('student owned source read and direct saved response');
  if (process.argv.includes('--prepare-ui-fixture')) {
    evidence.preparedForUi=true;evidence.passed=true;
  } else {
  const studentRevoke=await student.client.rpc('revoke_activity_assignment',{p_assignment_id:id,p_student_id:student.id});
  assert.equal(studentRevoke.error?.code,'42501');evidence.checks.push('student revoke denied');
  const wrongSubject=await admin.client.rpc('revoke_activity_assignment',{p_assignment_id:id,p_student_id:admin.id});
  assert.equal(wrongSubject.error?.code,'P0002');evidence.checks.push('admin stale/wrong selected subject denied');
  const revoke=await admin.client.rpc('revoke_activity_assignment',{p_assignment_id:id,p_student_id:student.id});assert.ifError(revoke.error);
  assert.equal(revoke.data.revoked_by,admin.id);assert.equal(revoke.data.performed_by,admin.id);assert.equal(revoke.data.mirrors_hidden,1);
  const replay=await admin.client.rpc('revoke_activity_assignment',{p_assignment_id:id,p_student_id:student.id});assert.ifError(replay.error);
  assert.equal(replay.data.already_revoked,true);assert.equal(replay.data.revoked_at,revoke.data.revoked_at);assert.equal(replay.data.revoked_by,admin.id);
  evidence.checks.push('atomic source/mirror revoke and idempotent attributed receipt');
  const retained=await admin.client.from('activity_assignments').select('*').eq('id',id).single();assert.ifError(retained.error);
  for(const [field,value] of Object.entries(insert.data)) if(!['revoked_at','revoked_by'].includes(field)) assert.deepEqual(retained.data[field],value,`preserved ${field}`);
  const savedAgain=await admin.client.from('activity_item_responses').select('*').eq('id',responseId).single();assert.ifError(savedAgain.error);assert.deepEqual(savedAgain.data,saved.data);
  const hidden=await admin.client.from('classroom_items').select('visible_to_student,metadata_json').eq('id',mirrorId).single();assert.ifError(hidden.error);assert.equal(hidden.data.visible_to_student,false);assert.deepEqual(hidden.data.metadata_json,mirror.metadata_json);
  evidence.checks.push('source snapshot, progress, original actor, response and mirror metadata preserved');
  const unavailable=await student.client.from('activity_assignments').select('id').eq('id',id);assert.ifError(unavailable.error);assert.equal(unavailable.data.length,0);
  const hiddenStudent=await student.client.from('classroom_items').select('id').eq('id',mirrorId);assert.ifError(hiddenStudent.error);assert.equal(hiddenStudent.data.length,0);
  const deniedUpdate=await student.client.from('activity_assignments').update({status:'completed'}).eq('id',id).select('id');assert.ifError(deniedUpdate.error);assert.equal(deniedUpdate.data.length,0);
  const deniedInsert=await student.client.from('activity_item_responses').insert({...response,id:randomUUID(),attempt_no:2});assert.equal(deniedInsert.error?.code,'42501');
  const deniedUnhide=await admin.client.from('classroom_items').update({visible_to_student:true}).eq('id',mirrorId);assert.equal(deniedUnhide.error?.code,'42501');
  evidence.checks.push('revoked direct reads/update/response insert and mirror resurrection denied');
  evidence.receipt={revoked_at:revoke.data.revoked_at,mirrors_hidden:revoke.data.mirrors_hidden};evidence.passed=true;
  }
} catch(error) {
  evidence.passed=false;evidence.failure=error instanceof Error?error.message:String(error);
  process.exitCode=1;
} finally {
  await writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence));
}
