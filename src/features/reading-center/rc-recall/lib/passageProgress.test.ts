import {beforeEach,describe,expect,it,vi} from "vitest";
const state=vi.hoisted(()=>({rpc:vi.fn(),pages:{} as Record<string,unknown[]>,queries:[] as any[],reconcile:null as any}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{rpc:state.rpc,from:(name:string)=>{
 const query={name,filters:[] as any[],range:null as any,ids:null as any};
 const builder:any={select:()=>builder,eq:(...args:any[])=>{query.filters.push(args);return builder;},order:()=>builder,range:(...args:any[])=>{query.range=args;return builder;},in:(_name:string,ids:string[])=>{query.ids=ids;return builder;},maybeSingle:async()=>{state.queries.push(query);return state.reconcile;},then:(resolve:any,reject:any)=>{state.queries.push(query);return Promise.resolve(state.pages[name]?.shift()??{data:[],error:null}).then(resolve,reject);}};
 return builder;
}}}));
import {loadPassageCompletions,loadPassageProgress,savePassageProgress,summarizePassageProgress,type PassageProgressRow} from "./passageProgress";
const row=(overrides:Partial<PassageProgressRow>={}):PassageProgressRow=>({attempt_id:"attempt",student_id:"owner",passage_id:15,passage_position:1,active_ms:3000,completed:true,completed_at:"2026-10-18T12:00:00Z",created_at:"2026-10-18T11:00:00Z",updated_at:"2026-10-18T12:00:00Z",...overrides});
const input={studentId:"owner",attemptId:"attempt",passageId:15,passagePosition:1,activeMs:3000,completed:true};
beforeEach(()=>{state.rpc.mockReset();state.pages={};state.queries=[];state.reconcile={data:null,error:null};});
describe("saved passage timing",()=>{
 it("saves the exact passage identity and returns the first frozen completion duration",async()=>{
  state.rpc.mockResolvedValue({data:row(),error:null});
  expect(await savePassageProgress({...input,activeMs:5000})).toEqual(row());
  expect(state.rpc).toHaveBeenCalledWith("save_rc_recall_passage_progress",{p_attempt_id:"attempt",p_passage_id:15,p_passage_position:1,p_active_ms:5000,p_completed:true});
 });
 it("reconciles a committed write after its response was lost",async()=>{
  state.rpc.mockRejectedValue(new TypeError("network"));state.reconcile={data:row(),error:null};
  expect((await savePassageProgress(input)).completed).toBe(true);
  expect(state.queries[0].filters).toEqual([["student_id","owner"],["attempt_id","attempt"],["passage_position",1]]);
 });
 it("does not report another account or passage as the saved result",async()=>{
  state.rpc.mockResolvedValue({data:row({student_id:"other"}),error:null});state.reconcile={data:row({passage_id:16}),error:null};
  await expect(savePassageProgress(input)).rejects.toThrow("could not be confirmed");
 });
 it("requires acknowledged monotonic time and completion, not an earlier incomplete row",async()=>{
  state.rpc.mockResolvedValue({data:row({completed:false,completed_at:null,active_ms:2000}),error:null});
  await expect(savePassageProgress(input)).rejects.toThrow();
  await expect(savePassageProgress({...input,activeMs:-1})).rejects.toThrow("invalid");
 });
 it("paginates owner-filtered progress and supports an empty attempt selection",async()=>{
  state.pages.rc_recall_passage_progress=[{data:Array.from({length:1000},()=>row()),error:null},{data:[row({attempt_id:"older"})],error:null}];
  expect(await loadPassageProgress("owner")).toHaveLength(1001);
  expect(state.queries.map(q=>q.range)).toEqual([[0,999],[1000,1999]]);
  expect(state.queries.every(q=>q.filters.some(([k,v]:string[])=>k==="student_id"&&v==="owner"))).toBe(true);
  state.queries=[];expect(await loadPassageProgress("owner",[])).toEqual([]);expect(state.queries).toHaveLength(0);
 });
 it("does not turn a missing migration into empty completion history",async()=>{
  state.pages.rc_recall_passage_progress=[{data:null,error:{code:"PGRST205",message:"missing table"}}];
  await expect(loadPassageCompletions("owner")).rejects.toMatchObject({code:"PGRST205"});
 });
});
describe("completion badges and honest timing",()=>{
 it("recognizes completed passages inside unfinished four-passage work",()=>{
  const attempts=[{id:"attempt",student_id:"owner",passage_ids:[14,15,16,18],completed:false,finished_at:null}];
  const summary=summarizePassageProgress(attempts,[row({passage_id:14}),row({passage_id:15,passage_position:2,completed:false,completed_at:null})]);
  expect(summary.get(14)).toMatchObject({completed:true,lastActiveMs:3000});expect(summary.has(15)).toBe(false);
 });
 it("retains known old completion without inventing passage time from section totals",()=>{
  const summary=summarizePassageProgress([{id:"legacy",student_id:"owner",passage_ids:[14,15,16,18],completed:true,finished_at:"2026-10-18T13:00:00Z"}],[]);
  expect(summary.size).toBe(4);expect(summary.get(15)).toMatchObject({completed:true,lastActiveMs:null,bestActiveMs:null,legacyOnly:true});
 });
 it("uses explicit rows once and keeps the last completion distinct from best known time",()=>{
  const summary=summarizePassageProgress([{id:"attempt",student_id:"owner",passage_ids:[15],completed:true,finished_at:"2026-10-18T12:00:00Z"},{id:"legacy",student_id:"owner",passage_ids:[15],completed:true,finished_at:"2026-10-18T14:00:00Z"}],[row(),row({attempt_id:"second",active_ms:2000,completed_at:"2026-10-18T13:00:00Z"})]);
  expect(summary.get(15)).toMatchObject({completedAttempts:3,lastCompletedAt:"2026-10-18T14:00:00Z",lastActiveMs:null,bestActiveMs:2000,legacyOnly:false});
 });
 it("refuses progress mismatching a known attempt selection",()=>{
  expect(summarizePassageProgress([{id:"attempt",student_id:"owner",passage_ids:[16],completed:false,finished_at:null}],[row()]).size).toBe(0);
 });
 it("loads old completed attempts beyond the history panel and API page cap",async()=>{
  state.pages.rc_recall_passage_progress=[{data:[],error:null}];
  state.pages.rc_recall_attempts=[{data:Array.from({length:1000},(_,i)=>({id:"a"+i,student_id:"owner",passage_ids:[14],completed:true,finished_at:"2026-10-18T12:00:00Z"})),error:null},{data:[{id:"older",student_id:"owner",passage_ids:[999],completed:true,finished_at:"2026-10-17T12:00:00Z"}],error:null}];
  const summary=await loadPassageCompletions("owner");expect(summary.has(999)).toBe(true);
  const queries=state.queries.filter(q=>q.name==="rc_recall_attempts");expect(queries.map(q=>q.range)).toEqual([[0,999],[1000,1999]]);expect(queries[0].filters).toContainEqual(["completed",true]);
 });
});
