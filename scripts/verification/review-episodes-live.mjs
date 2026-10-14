// Authorized designated QA account writes only. Source attempts/flags are read-only.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).flatMap(line => {
    const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/); if(!match) return [];
    let value=match[2]; if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'"))) value=value.slice(1,-1);
    return [[match[1],value]];
  }));
}
const envPath=process.argv[2]; if(!envPath) throw new Error('Provide central credential env path.');
const credentials=parseEnv(await readFile(resolve(envPath),'utf8'));
const config=parseEnv(await readFile(resolve('.env'),'utf8'));
if(!config.VITE_SUPABASE_URL||!config.VITE_SUPABASE_PUBLISHABLE_KEY) throw new Error('Missing public configuration.');
const client=()=>createClient(config.VITE_SUPABASE_URL,config.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function login(prefix) {
  const instance=client(); const {data,error}=await instance.auth.signInWithPassword({email:credentials[`${prefix}_EMAIL`],password:credentials[`${prefix}_PASSWORD`]});
  if(error||!data.user) throw new Error(`${prefix} authentication failed.`); return {client:instance,owner:data.user.id};
}
const student=await login('LSATPREP_TESTER'), teacher=await login('LSATPREP_ADMIN');
if(student.owner===teacher.owner) throw new Error('Distinct QA accounts required.');
const sourceId='d5fd27c6-dec0-47ca-b7fd-32ba008c854e';
async function sourceSnapshot() {
  const attempt=await teacher.client.from('intro_lr_attempts').select('*').eq('id',sourceId).eq('user_id',student.owner).single();
  const flags=await teacher.client.from('flagged_questions').select('*').eq('user_id',student.owner).order('id');
  if(attempt.error||flags.error||!attempt.data||attempt.data.correct!==false) throw new Error('Genuine owned incorrect source or flags could not be verified.');
  return {digest:createHash('sha256').update(JSON.stringify({attempt:attempt.data,flags:flags.data})).digest('hex'),flagCount:flags.data.length};
}
const before=await sourceSnapshot(), checks={};
async function rpc(instance,name,args){return instance.rpc(name,args);}
const openArgs={p_student:student.owner,p_source:'intro_lr_attempts',p_source_id:sourceId,p_reason:'missed',p_selection_reason:null};
async function denied(label,instance,name,args){const result=await rpc(instance,name,args);checks[label]=Boolean(result.error);if(!checks[label])throw new Error(`${label} was not denied.`);}
async function success(label,instance,name,args){const result=await rpc(instance,name,args);if(result.error||!result.data)throw new Error(`${label} was not acknowledged.`);checks[label]=true;return result.data;}
await denied('studentCannotSelectAsTeacher',student.client,'open_review_episode_v1',{...openArgs,p_reason:'teacher_selected',p_selection_reason:'Unauthorized selection'});
await denied('studentCannotOpenForeignSubject',student.client,'open_review_episode_v1',{...openArgs,p_student:teacher.owner});
await denied('teacherCannotOpenStudentMiss',teacher.client,'open_review_episode_v1',openArgs);
await denied('teacherReasonRequired',teacher.client,'open_review_episode_v1',{...openArgs,p_reason:'teacher_selected',p_selection_reason:' '});
await denied('anonymousDenied',client(),'read_review_episodes_v1',{p_student:student.owner});
const episode=await success('studentOwnedMissOpened',student.client,'open_review_episode_v1',openArgs);
const replay=await success('episodeOpenRetryAcknowledged',student.client,'open_review_episode_v1',openArgs);
checks.episodeRetrySameIdentity=replay.id===episode.id;
const existing=await success('studentReadAcknowledged',student.client,'read_review_episodes_v1',{p_student:student.owner});
if(existing.events.some(event=>event.episode_id===episode.id&&event.kind==='complete')) throw new Error('QA episode is already complete; retained unchanged. Use another genuinely saved attempt for a future lifecycle run.');
const selected=await success('teacherSelectionAcknowledged',teacher.client,'open_review_episode_v1',{...openArgs,p_reason:'teacher_selected',p_selection_reason:'Explain why your saved answer missed the conclusion and justify the credited answer.'});
checks.teacherSelectionExactSubject=selected.student_id===student.owner&&selected.actor_id===teacher.owner&&selected.source_id===sourceId;
const blindId=randomUUID(), revealId=randomUUID(), completeId=randomUUID();
const blindArgs={p_episode:episode.id,p_event:blindId,p_kind:'blind_answer',p_payload:{answer:'QA review answer recorded after earlier source feedback; not a historical blind response.'}};
await denied('teacherCannotWriteStudentReview',teacher.client,'append_review_event_v1',blindArgs);
const blind=await success('studentReviewAnswerSaved',student.client,'append_review_event_v1',blindArgs);
const blindRetry=await success('stableEventRetryAcknowledged',student.client,'append_review_event_v1',blindArgs);
checks.stableEventExactReplay=JSON.stringify(blind)===JSON.stringify(blindRetry);
await denied('eventIdentityConflictDenied',student.client,'append_review_event_v1',{...blindArgs,p_payload:{answer:'different'}});
await success('distinctRevealSaved',student.client,'append_review_event_v1',{p_episode:episode.id,p_event:revealId,p_kind:'reveal',p_payload:{}});
await denied('blindAfterRevealDenied',student.client,'append_review_event_v1',{...blindArgs,p_event:randomUUID()});
await denied('missingDiagnosesDenied',student.client,'append_review_event_v1',{p_episode:episode.id,p_event:completeId,p_kind:'complete',p_payload:{}});
const completionArgs={p_episode:episode.id,p_event:completeId,p_kind:'complete',p_payload:{error_diagnosis:'QA save-contract verification: the saved selection was incorrect; this does not assert the student’s actual reasoning.',right_answer_diagnosis:'QA save-contract verification: compare the credited conclusion with its premises; this does not assert completed pedagogical understanding.'}};
await success('diagnosedCompletionAcknowledged',student.client,'append_review_event_v1',completionArgs);
await success('completionRetryAcknowledged',student.client,'append_review_event_v1',completionArgs);
await denied('terminalEpisodeRejectsNewWork',student.client,'append_review_event_v1',{p_episode:episode.id,p_event:randomUUID(),p_kind:'reflection',p_payload:{text:'late QA event'}});
const agreement=await success('teacherQueueReadAcknowledged',teacher.client,'read_review_episodes_v1',{p_student:student.owner});
const studentRead=await success('studentFinalReadAcknowledged',student.client,'read_review_episodes_v1',{p_student:student.owner});
checks.studentTeacherEpisodeAgreement=JSON.stringify(agreement)===JSON.stringify(studentRead);
const after=await sourceSnapshot();checks.originalAttemptAndFlagsUnchanged=before.digest===after.digest&&before.flagCount===after.flagCount;
if(Object.values(checks).some(value=>!value))throw new Error('Review acceptance assertion failed.');
const evidence={checkedAt:new Date().toISOString(),ordinaryJwt:true,designatedQaOnly:true,sourceId,episodeId:episode.id,teacherSelectionId:selected.id,sourceDigestBefore:before.digest,sourceDigestAfter:after.digest,flagsBefore:before.flagCount,flagsAfter:after.flagCount,checks,limitations:['QA text is explicitly labelled; it is not evidence of student reasoning mastery.','No old attempt or flag was modified or deleted.','This probe adds review records only; UI verification remains separate.']};
await writeFile(resolve('docs/agent/verification/2026-09-30-review-episodes-live.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({status:'passed',ordinaryJwt:true,checks:Object.keys(checks).length,sourceUnchanged:checks.originalAttemptAndFlagsUnchanged,episodeId:episode.id,teacherSelectionId:selected.id}));
