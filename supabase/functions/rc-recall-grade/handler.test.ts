import { handleRcGradeRequest } from "./handler.ts";

const attemptId = "85703227-ea03-4454-9bac-94c52903dd01", recapId = "5ab25ffc-0d30-465f-80d6-f33605052eb2";
function assert(value: unknown, message: string) { if (!value) throw new Error(message); }

Deno.test("RC grade endpoint authenticates, gates ownership/access/finalization, and status has no provider calls", async () => {
  const prior = globalThis.fetch;
  const envNames = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const previous = envNames.map(name => Deno.env.get(name));
  Deno.env.set("SUPABASE_URL", "https://rc-grading-test.invalid");
  Deno.env.set("SUPABASE_ANON_KEY", "test-key"); Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  let entitled = true, owned = true, finished = true, spoken = false;
  const calls: string[] = [];
  globalThis.fetch = async (request: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof request === "string" ? request : request instanceof URL ? request.href : request.url);
    calls.push(url.pathname);
    assert(url.origin === "https://rc-grading-test.invalid", "A provider or production network request was attempted");
    const response = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
    if (url.pathname === "/auth/v1/user") return response({ id: "owner", aud: "authenticated", role: "authenticated" });
    if (url.pathname === "/rest/v1/rpc/has_reading_center_access") return response(entitled);
    if (url.pathname === "/rest/v1/rc_recall_attempts") {
      assert(url.searchParams.get("student_id") === "eq.owner", "Owner scope missing");
      return response(owned ? { id: attemptId, student_id: "owner", completed: finished, finished_at: finished ? "2026-10-18T00:00:00Z" : null } : null);
    }
    if (url.pathname === "/rest/v1/rc_recall_recaps") return response([{ id: recapId, passage_position: 1, recap_key: "p1-para1-recall", kind: "recall", voice: spoken ? "spoken" : "silent", recording_state: spoken ? "saved" : "not_recorded", object_path: spoken ? "owner/path" : null }]);
    if (url.pathname === "/rest/v1/rc_recall_grades") return response([]);
    throw new Error("Unexpected endpoint: " + url.pathname);
  };
  const request = (body: unknown = { attemptId }, auth = true) => handleRcGradeRequest(new Request("https://rc-grading-test.invalid/functions/v1/rc-recall-grade", { method: "POST", headers: auth ? { Authorization: "Bearer test-user-token" } : {}, body: JSON.stringify(body) }));
  try {
    assert((await request(undefined, false)).status === 401, "Anonymous request allowed");
    assert((await request({ attemptId, sourceText: "forged" })).status === 400, "Client source accepted");
    entitled = false; assert((await request()).status === 403, "Missing entitlement allowed"); entitled = true;
    owned = false; assert((await request()).status === 404, "Another account's attempt allowed"); owned = true;
    finished = false; assert((await request()).status === 409, "Unfinished attempt graded"); finished = true;
    const silent = await (await request()).json(); assert(silent.items[0].status === "ungradable", "Silent recall received a grade");
    spoken = true; const status = await (await request()).json(); assert(status.items[0].status === "ungraded", "Status call began grading");
    assert(calls.every(path => !path.includes("storage")), "Status call accessed audio");
    assert((await request({ attemptId, recapId: "86c45b99-2722-45c2-b52c-2817fd173641" })).status === 404, "Unknown recap accepted");
  } finally {
    globalThis.fetch = prior;
    envNames.forEach((name, index) => previous[index] === undefined ? Deno.env.delete(name) : Deno.env.set(name, previous[index]!));
  }
});

Deno.test("continuous audio transcribes once and judges only exact recall windows", async () => {
 const original = globalThis.fetch;
 const names = ["SUPABASE_URL","SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","DEEPGRAM_API_KEY","LOVABLE_API_KEY"];
 const previous = names.map(n => Deno.env.get(n));
 names.forEach(n => Deno.env.set(n,n === "SUPABASE_URL" ? "https://rc-grading-test.invalid" : "synthetic-test-key"));
 const captureId = "11111111-1111-4111-8111-111111111111", recap2 = "22222222-2222-4222-8222-222222222222";
 const path = `owner/${attemptId}/capture-${captureId}-test.webm`;
 const capture = { id:captureId,attempt_id:attemptId,student_id:"owner",recording_state:"saved",object_path:path,duration_ms:10000 };
 const recaps = [
  {id:recapId,passage_position:1,recap_key:"p1-para1-recall",kind:"recall",voice:"spoken",recording_state:"saved",capture_id:captureId,recall_start_ms:2000,recall_end_ms:4000},
  {id:recap2,passage_position:1,recap_key:"p1-para2-recall",kind:"recall",voice:"spoken",recording_state:"saved",capture_id:captureId,recall_start_ms:6000,recall_end_ms:8000},
 ];
 const grades: any[] = []; let captureTranscript: any = {status:"processing",lease_until:new Date(Date.now()+60000).toISOString(),tries:1}; let asrCalls=0,judgeCalls=0;
 const word=(text:string,start:number,end:number)=>({word:text,punctuated_word:text,start,end,confidence:0.99});
 const words=[word("READING",0,1),word("Some",2.1,2.5),word("artists",2.5,3),word("may",3,3.4),word("disagree.",3.4,3.8),word("CHECKING",4.5,5),word("Other",6.1,6.4),word("painters",6.4,6.9),word("need",6.9,7.2),word("help.",7.2,7.7),word("CHECKING",8.5,9)];
 const response=(body:unknown,status=200)=>Promise.resolve(new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}}));
 globalThis.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=new URL(typeof input==="string"?input:input instanceof URL?input.href:input.url);
  const body=typeof init?.body==="string"?JSON.parse(init.body):null;
  if(url.hostname==="lsatprep.study")return response({preptest:140,passages:[{passageId:16,preptest:140,section:4,text:"Some artists may disagree.\n\nOther painters need help."}]});
  if(url.hostname==="api.deepgram.com"){asrCalls++;assert(body.url.includes("/storage/v1/"),"ASR didn't receive signed recording URL");return response({metadata:{duration:10},results:{channels:[{alternatives:[{transcript:"Whole recording",confidence:0.99,words}]}]}});}
  if(url.hostname==="ai.gateway.lovable.dev"){
   judgeCalls++;const payload=JSON.parse(body.messages[1].content);assert(!/READING|CHECKING/.test(payload.transcript),"Read/check audio leaked into judging");
   const expected=judgeCalls===1?"Some artists may disagree.":"Other painters need help.";
   assert(payload.transcript===expected,"Wrong recall window selected");
   return response({choices:[{message:{content:JSON.stringify({summary:"Meaning preserved.",details:[{sourceId:"s1",recallQuote:expected,status:"kept",explanation:"The complete sentence meaning is preserved."}],relationships:[],nextStep:"Keep the same qualification when you hide the paragraph and recall it again."})}}],usage:{prompt_tokens:100,completion_tokens:100}});
  }
  assert(url.origin==="https://rc-grading-test.invalid","Unexpected real network request");
  if(url.pathname==="/auth/v1/user")return response({id:"owner",aud:"authenticated",role:"authenticated"});
  if(url.pathname.endsWith("/rpc/has_reading_center_access"))return response(true);
  if(url.pathname.endsWith("/rc_recall_attempts"))return response({id:attemptId,student_id:"owner",mode:"rc_recall",preptest:140,section:4,passage_ids:[16],finished_at:"2026-10-18",completed:true});
  if(url.pathname.endsWith("/rc_recall_recaps"))return response(recaps);
  if(url.pathname.endsWith("/rc_recall_captures"))return response(capture);
  if(url.pathname.includes("/storage/v1/object/sign/"))return init?.method==="POST"?response({signedURL:"/object/sign/rc-recall-recordings/fixture?token=synthetic"}):new Response(new Uint8Array([1,2,3]));
  if(url.pathname.endsWith("/rc_recall_capture_transcripts")){
   if(init?.method==="POST"){captureTranscript={...body};return response(captureTranscript,201);}
   if(init?.method==="PATCH"){Object.assign(captureTranscript,body);return response(captureTranscript);}
   return response(captureTranscript);
  }
  if(url.pathname.endsWith("/rc_recall_grades")){
   if(init?.method==="POST"){const row={id:crypto.randomUUID(),...body};grades.push(row);return response(row,201);}
   if(init?.method==="PATCH"){const row=grades.find(g=>"eq."+g.id===url.searchParams.get("id"));Object.assign(row,body);return response(row);}
   return response(grades);
  }
  throw new Error("Unexpected test path: "+url.pathname);
 };
 try{
  // Busy shared transcription must not exhaust a different paragraph's retries.
  for(let count=0;count<3;count++){
   const r=await handleRcGradeRequest(new Request("https://rc-grading-test.invalid/functions/v1/rc-recall-grade",{method:"POST",headers:{Authorization:"Bearer synthetic"},body:JSON.stringify({attemptId,recapId})}));
   const value=await r.json();assert(value.items?.[0]?.status==="failed"&&value.items[0].retryable,"Busy capture became permanently ungradable");
   assert(grades[0].tries===0,"Busy shared ASR consumed a paragraph retry");
  }
  captureTranscript=null;
  for(const id of [recapId,recap2]){
   const r=await handleRcGradeRequest(new Request("https://rc-grading-test.invalid/functions/v1/rc-recall-grade",{method:"POST",headers:{Authorization:"Bearer synthetic"},body:JSON.stringify({attemptId,recapId:id})}));
   const value=await r.json();assert(r.status===200&&value.items?.[0]?.status==="ready",JSON.stringify(value));assert(value.items[0].grade.assessment.coverage.percent===100,"Meaning points not calculated");
  }
  assert(asrCalls===1,"Shared capture was transcribed more than once");assert(judgeCalls===2,"Expected one judge call per recall");
  assert(grades[0].tries===1,"First real judge attempt used the wrong retry count");
 }finally{globalThis.fetch=original;names.forEach((n,i)=>previous[i]===undefined?Deno.env.delete(n):Deno.env.set(n,previous[i]!));}
});
