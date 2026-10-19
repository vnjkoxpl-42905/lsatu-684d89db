import { supabase } from "@/integrations/supabase/client";
import type { AttemptRow } from "./attempts";
const table = (name: string): any => (supabase as any).from(name);
export interface PassageProgressRow {
  attempt_id: string; student_id: string; passage_id: number; passage_position: number;
  active_ms: number; completed: boolean; completed_at: string | null; created_at: string; updated_at: string;
}
export interface PassageCompletion {
  passageId: number; completed: true; lastCompletedAt: string; lastActiveMs: number | null;
  bestActiveMs: number | null; completedAttempts: number; legacyOnly: boolean;
}
export interface SavePassageProgressInput { studentId: string; attemptId: string; passageId: number; passagePosition: number; activeMs: number; completed: boolean }
function matches(row: PassageProgressRow | null, input: SavePassageProgressInput): row is PassageProgressRow {
  return !!row && row.student_id===input.studentId && row.attempt_id===input.attemptId && row.passage_id===input.passageId && row.passage_position===input.passagePosition
    && Number.isSafeInteger(Number(row.active_ms)) && Number(row.active_ms)>=0 && (row.completed || Number(row.active_ms)>=input.activeMs) && (!input.completed || row.completed);
}
/** First completed duration wins. Stale/repeated saves return authoritative monotonic state. */
export async function savePassageProgress(input: SavePassageProgressInput): Promise<PassageProgressRow> {
  if (!Number.isSafeInteger(input.activeMs) || input.activeMs<0 || !Number.isInteger(input.passageId) || input.passageId<1 || !Number.isInteger(input.passagePosition) || input.passagePosition<1 || input.passagePosition>4) throw new Error("Passage progress could not be saved because its timing or identity is invalid.");
  let failure: unknown;
  try {
    const { data, error } = await (supabase as any).rpc("save_rc_recall_passage_progress", { p_attempt_id:input.attemptId,p_passage_id:input.passageId,p_passage_position:input.passagePosition,p_active_ms:input.activeMs,p_completed:input.completed });
    const row = (Array.isArray(data) ? data[0] : data) as PassageProgressRow | null;
    if (!error && matches(row,input)) return { ...row, active_ms:Number(row.active_ms) };
    failure = error ?? new Error("The saved passage progress could not be confirmed.");
  } catch(error) { failure=error; }
  // The write may have committed before its response was lost. Read the same key;
  // never create another row or claim completion without server confirmation.
  const { data, error } = await table("rc_recall_passage_progress").select("*").eq("student_id",input.studentId).eq("attempt_id",input.attemptId).eq("passage_position",input.passagePosition).maybeSingle();
  if (!error && matches(data,input)) return { ...data,active_ms:Number(data.active_ms) };
  throw failure;
}
/** Owner-scoped, fully paginated. An absent new table is an error, not empty history. */
export async function loadPassageProgress(studentId: string, attemptIds?: string[]): Promise<PassageProgressRow[]> {
  if (attemptIds?.length===0) return [];
  const rows: PassageProgressRow[]=[];
  const groups = attemptIds ? Array.from({length:Math.ceil(attemptIds.length/100)},(_,i)=>attemptIds.slice(i*100,i*100+100)) : [undefined];
  for (const ids of groups) for(let offset=0;;offset+=1000){
    let query=table("rc_recall_passage_progress").select("*").eq("student_id",studentId).order("attempt_id").order("passage_position").range(offset,offset+999);
    if(ids)query=query.in("attempt_id",ids);
    const {data,error}=await query; if(error)throw error;
    rows.push(...(data??[]).map((row:PassageProgressRow)=>({...row,active_ms:Number(row.active_ms)})));
    if((data?.length??0)<1000)break;
  }
  return rows;
}

type CompletionAttempt = Pick<AttemptRow,"id"|"student_id"|"passage_ids"|"completed"|"finished_at">;
/** Explicit completed passages count even when their full-section attempt is unfinished. */
export function summarizePassageProgress(attempts: CompletionAttempt[],progress:PassageProgressRow[]): Map<number,PassageCompletion> {
  const known=new Map(attempts.map(a=>[a.id,a]));
  const samples=new Map<string,{passageId:number;attemptId:string;date:string;activeMs:number|null}>();
  for(const row of progress){
    const attempt=known.get(row.attempt_id);
    if(!row.completed||!row.completed_at||!Number.isSafeInteger(row.active_ms)||row.active_ms<0)continue;
    if(attempt&&(attempt.student_id!==row.student_id||attempt.passage_ids[row.passage_position-1]!==row.passage_id))continue;
    samples.set(`${row.attempt_id}:${row.passage_id}`,{passageId:row.passage_id,attemptId:row.attempt_id,date:row.completed_at,activeMs:row.active_ms});
  }
  for(const attempt of attempts){
    if(!attempt.completed||!attempt.finished_at)continue;
    for(const passageId of attempt.passage_ids){const key=`${attempt.id}:${passageId}`;if(!samples.has(key))samples.set(key,{passageId,attemptId:attempt.id,date:attempt.finished_at,activeMs:null});}
  }
  const groups=new Map<number,Array<{date:string;activeMs:number|null}>>();
  for(const sample of samples.values()){const list=groups.get(sample.passageId)??[];list.push(sample);groups.set(sample.passageId,list);}
  const result=new Map<number,PassageCompletion>();
  for(const [passageId,list] of groups){list.sort((a,b)=>b.date.localeCompare(a.date));const timed=list.flatMap(s=>s.activeMs===null?[]:[s.activeMs]);result.set(passageId,{passageId,completed:true,lastCompletedAt:list[0].date,lastActiveMs:list[0].activeMs,bestActiveMs:timed.length?Math.min(...timed):null,completedAttempts:list.length,legacyOnly:timed.length===0});}
  return result;
}
/** Picker badges cover every attempt, independent of the history panel's 25-row pages. */
export async function loadPassageCompletions(studentId:string):Promise<Map<number,PassageCompletion>>{
  const progress=await loadPassageProgress(studentId);
  const attempts:CompletionAttempt[]=[];
  for(let offset=0;;offset+=1000){
    const {data,error}=await table("rc_recall_attempts").select("id,student_id,passage_ids,completed,finished_at").eq("student_id",studentId).eq("completed",true).order("id").range(offset,offset+999);
    if(error)throw error;attempts.push(...(data??[]));if((data?.length??0)<1000)break;
  }
  return summarizePassageProgress(attempts,progress);
}
