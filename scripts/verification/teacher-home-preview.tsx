// Real presentational Teacher Home, synthetic account/data only. No production auth.
import '../../src/index.css';
import '../../src/components/classroom/classroom.css';
import '../../src/components/classroom/home/home.css';
import React from 'react';
import {Toaster} from 'sonner';
import {makeTeacherSchedulingServices} from '../../src/lib/teacherSchedulingApi';
import type {BookingApi,UpcomingBooking} from '../../src/components/booking/CalendlyBookingCard';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {TeacherHomeView} from '../../src/components/classroom/home/teacher/TeacherHomeView';
import {ALL_FLAG_KEYS, tierFlags, withDerivedAccess, type ManagedUser} from '../../src/lib/adminUsers';
import type {DeskActions} from '../../src/components/classroom/home/teacher/teachingDeskModel';
import type {HomeBookingPass, PendingHomeTopUp, HomeCreditReceipt} from '../../src/lib/teacherHomeActions';
import type {TeacherHomeModel} from '../../src/components/classroom/home/teacher/teacherHomeModel';
const previewParams=new URLSearchParams(location.search);
const scenario=previewParams.get('scenario')||'populated';
// Preview document only; never reads or writes production theme preferences.
document.documentElement.classList.toggle('dark',previewParams.get('theme')==='dark');
const now=new Date();
const fixtureTimeZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
const day=(offset:number,hour=15)=>{const date=new Date(now);date.setDate(now.getDate()+offset);date.setHours(hour,0,0,0);return date.toISOString()};
const students=['Lydia Park','Celia Moreno','Zoë Adams'].map((name,i)=>({id:'10000000-0000-4000-8000-00000000000'+i,name,activityLabel:i?'Active this week':'Active today',route:'/teacher/students/10000000-0000-4000-8000-00000000000'+i}));

// In-memory action adapter. Nothing is persisted, sent, or written to production.
const fixtureActor='20000000-0000-4000-8000-000000000001';
const managedStudents:ManagedUser[]=students.map((student,i)=>({...Object.fromEntries(ALL_FLAG_KEYS.map(key=>[key,false])),...tierFlags('tier_2'),class_id:student.id,email:['lydia','celia','zoe'][i]+'@example.invalid',display_name:student.name,role:'student',last_seen_at:now.toISOString(),archived_at:null,archived_reason:null,access_tier:'tier_2'} as ManagedUser));
const passes=new Map<string,HomeBookingPass>([[students[0].id,{id:'30000000-0000-4000-8000-000000000001',student_id:students[0].id,total_credits:6,used_credits:2,credits_remaining:4,status:'active',booking_url:'https://lsatprep.study/book/SYNTHETIC_LOCAL_LYDIA',session_length_minutes:70,expires_at:null}]]);
const pending=new Map<string,PendingHomeTopUp>();
const receipts=new Map<string,HomeCreditReceipt>();
const actionLog:{action:string;studentId:string;amount?:number}[]=[];
const clone=<T,>(value:T):T=>structuredClone(value);
function changed(action:string,studentId:string,amount?:number){actionLog.push({action,studentId,...(amount===undefined?{}:{amount})});window.dispatchEvent(new Event('synthetic-desk-change'));}
function known(studentId:string){if(!managedStudents.some(person=>person.class_id===studentId))throw new Error('Unknown synthetic student');}
function checkedPass(studentId:string,passId:string){known(studentId);const pass=passes.get(studentId);if(!pass||pass.id!==passId)throw new Error('Synthetic pass identity changed');return pass;}
function amountCheck(amount:number){if(!Number.isInteger(amount)||amount<1||amount>50)throw new Error('Choose 1 to 50 sessions');}
const fixtureActions:DeskActions={
 async loadHomeBooking(studentId){known(studentId);return clone(passes.get(studentId)??null);},
 getPendingHomeTopUp(actorId){if(actorId!==fixtureActor)throw new Error('Unknown synthetic actor');return clone(pending.get(actorId)??null);},
 prepareHomeTopUp(actorId,studentId,passId,amount){if(actorId!==fixtureActor)throw new Error('Unknown synthetic actor');checkedPass(studentId,passId);amountCheck(amount);const prior=pending.get(actorId);if(prior){if(prior.studentId!==studentId||prior.passId!==passId||prior.amount!==amount)throw new Error('Resolve pending simulation first');return clone(prior);}const operation={actorId,studentId,passId,amount,operationKey:crypto.randomUUID()};pending.set(actorId,operation);return clone(operation);},
 async addHomeBookingCredits(operation){if(operation.actorId!==fixtureActor)throw new Error('Unknown synthetic actor');const pass=checkedPass(operation.studentId,operation.passId);const prior=receipts.get(operation.operationKey);if(prior)return {receipt:clone(prior),pass:clone(pass)};const saved=pending.get(operation.actorId);if(!saved||JSON.stringify(saved)!==JSON.stringify(operation))throw new Error('Synthetic pending operation changed');amountCheck(operation.amount);if(pass.status==='revoked')throw new Error('Booking link revoked');pass.total_credits+=operation.amount;pass.credits_remaining=pass.total_credits-pass.used_credits;if(pass.status==='exhausted')pass.status='active';const receipt={operation_key:operation.operationKey,owner_id:fixtureActor,student_id:operation.studentId,pass_id:operation.passId,delta:operation.amount,total_credits:pass.total_credits,used_credits:pass.used_credits};receipts.set(operation.operationKey,receipt);pending.delete(operation.actorId);changed('Simulated add sessions',operation.studentId,operation.amount);return {receipt:clone(receipt),pass:clone(pass)};},
 async resolvePendingHomeTopUp(operation){const saved=pending.get(operation.actorId);if(operation.actorId!==fixtureActor||!saved||JSON.stringify(saved)!==JSON.stringify(operation))throw new Error('Synthetic pending operation changed');const pass=checkedPass(operation.studentId,operation.passId);pending.delete(operation.actorId);return {receipt:clone(receipts.get(operation.operationKey)??null),pass:clone(pass)};},
 async discardUnreadableHomeTopUp(){throw new Error('No unreadable pending data in this in-memory fixture');},
 async createHomeBooking(studentId,credits,options={sessionMinutes:70,expiresAt:null}){known(studentId);amountCheck(credits);if(passes.has(studentId))throw new Error('pass_exists: Existing booking link loaded. Review and confirm Add sessions.');if(!Number.isInteger(options.sessionMinutes)||options.sessionMinutes<15||options.sessionMinutes>480)throw new Error('Invalid session length');const pass={id:crypto.randomUUID(),student_id:studentId,total_credits:credits,used_credits:0,credits_remaining:credits,status:'active',booking_url:'https://lsatprep.study/book/SYNTHETIC_LOCAL_'+studentId,session_length_minutes:options.sessionMinutes,expires_at:options.expiresAt};passes.set(studentId,pass);changed('Simulated create booking link',studentId,credits);return clone(pass);},
 async revokeHomeBooking(studentId,passId,confirmed){if(!confirmed)throw new Error('Confirm simulated revoke');const pass=checkedPass(studentId,passId);pass.status='revoked';changed('Simulated revoke booking link',studentId);return clone(pass);},
 async reactivateHomeBooking(studentId,passId,confirmed){if(!confirmed)throw new Error('Confirm simulated reactivation');const pass=checkedPass(studentId,passId);if(pass.status==='revoked')throw new Error('A revoked link cannot be reactivated');pass.expires_at=null;pass.status=pass.credits_remaining?'active':'exhausted';changed('Simulated remove expiry',studentId);return clone(pass);},
 async saveHomeAccess(person,tier,draft){known(person.class_id);const current=managedStudents.find(row=>row.class_id===person.class_id)!;if(current.role==='admin'||current.archived_at)throw new Error('Synthetic account ineligible');const flags=tier==='tier_2'?withDerivedAccess(draft??{}):tierFlags(tier);Object.assign(current,flags,{access_tier:tier});changed('Simulated save access',person.class_id);return clone(current);},
};

// Same scheduling wrapper as production, with memory storage and a non-network BookingApi.
const bookingMemory=new Map<string,string>();
const booked=new Map<string,UpcomingBooking[]>();
const bookedKeys=new Map<string,string>();
const bookingRequests:{studentId:string;key:string;startAt:string}[]=[];
const bookingFault=previewParams.get('booking');
let lostReplySent=false;
const fixtureScheduling=makeTeacherSchedulingServices({
 storage:{getItem:key=>bookingMemory.get(key)??null,setItem:(key,value)=>{bookingMemory.set(key,value);},removeItem:key=>{bookingMemory.delete(key);}},
 verifyActor:async actorId=>actorId===fixtureActor,
 loadHistory:async pending=>{const id=bookedKeys.get(pending.idempotencyKey);return id?(booked.get(pending.studentId)??[]).filter(row=>row.id===id).map(row=>({...row,booking_pass_id:pending.passId,idempotency_key:pending.idempotencyKey,student_id:pending.studentId})):[];},
 createRawApi(slug):BookingApi {
  const selected=[...passes.values()].find(pass=>new URL(pass.booking_url!).pathname.split('/').pop()===slug);
  if(!selected)throw new Error('Unknown synthetic booking link');
  const studentId=selected.student_id;
  const passView=()=>{const p=passes.get(studentId)!;return {credits_remaining:p.credits_remaining,total_credits:p.total_credits,session_length_minutes:p.session_length_minutes,status:p.status};};
  return {
   async loadInfo(){return {pass:clone(passView()),bookings:clone(booked.get(studentId)??[])};},
   async loadSlots(){const p=passes.get(studentId)!;const used=new Set((booked.get(studentId)??[]).map(row=>row.start_at));return {pass:clone(passView()),slots:p.status==='active'&&p.credits_remaining>0?[1,2,4].flatMap(offset=>[10,14,16].map(hour=>{const start_at=day(offset,hour);return {start_at,end_at:new Date(Date.parse(start_at)+p.session_length_minutes*60000).toISOString()};})).filter(slot=>!used.has(slot.start_at)):[]};},
   async book(startAt,key){
    bookingRequests.push({studentId,key,startAt});
    if(bookedKeys.has(key))return;
    if(bookingFault==='unknown')throw new TypeError('Synthetic unconfirmed network request');
    const p=passes.get(studentId)!;if(p.status!=='active'||p.credits_remaining<1)throw new Error('no_credits');
    if((booked.get(studentId)??[]).some(row=>row.start_at===startAt))throw new Error('slot_conflict');
    const row:UpcomingBooking={source:'redemption',id:crypto.randomUUID(),start_at:startAt,status:'booked',meet_url:null};
    booked.set(studentId,[...(booked.get(studentId)??[]),row]);bookedKeys.set(key,row.id);p.used_credits++;p.credits_remaining=p.total_credits-p.used_credits;if(!p.credits_remaining)p.status='exhausted';
    const student=students.find(s=>s.id===studentId)!;
    const event={id:row.id,title:student.name+' · LSAT session',starts_at:startAt,ends_at:new Date(Date.parse(startAt)+p.session_length_minutes*60000).toISOString(),status:'confirmed',calendar_url:'https://calendar.google.com/calendar/u/0/r',student_id:studentId,student_name:student.name};
    populated.agenda.data.events.push(event);changed('Simulated book session',studentId,-1);
    if(bookingFault==='lost-response'&&!lostReplySent){lostReplySent=true;throw new TypeError('Synthetic lost success response');}
   },
  };
 },
});

// Read-only observable evidence for local browser checks. No operation methods exposed.
Object.defineProperty(window,'__syntheticTeacherAudit',{get:()=>clone({mutations:actionLog,passes:[...passes.values()],students:managedStudents,receipts:[...receipts.values()]})});

const task=(i:number)=>({id:'synthetic-session-'+i,revision:1,student_id:students[i].id,student_name:students[i].name,source_title:'LSAT session',starts_at:day(-1,i+13),ends_at:day(-1,i+14),source_state:'ended' as const,match_state:'matched' as const,transcript_doc_id:null,transcript_source:null,transcript_status:'waiting' as const,drive_folder_url:null,local_slug:null,recap_done:i===0,recap_posted:false,notes_done:false,work_assigned:false,handled_at:null,blocker:i===1?'Waiting for the session transcript':null});
const payment={id:'synthetic-payment',student_id:null,payer_name:'Alex Rivera',email:'alex@example.invalid',amount_cents:24000,currency:'cad',paid_at:day(-1),status:'succeeded',grant_state:'awaiting',match_state:'unmatched',source:'webhook',granted_credits:null};
const ready=(data:any)=>({state:'ready' as const,data});
const emptyDesk={actorId:fixtureActor,actions:fixtureActions,schedulingServices:fixtureScheduling,refreshAccess:()=>window.dispatchEvent(new Event('synthetic-desk-change')),manual:ready({items:[],total:0,next_cursor:null}),agenda:ready({events:[],next_cursor:null,fetched_at:now.toISOString(),time_zone:fixtureTimeZone}),email:ready({threads:[],count:0,fetched_at:now.toISOString(),enquiries_configured:true}),payments:ready({recent:[],attention:[],total:0,attention_total:0}),results:ready([]),access:ready(managedStudents)};
const populated={...emptyDesk,manual:ready({items:[{id:'synthetic-manual',revision:1,title:'Prepare assumption examples for the next session',student_id:students[0].id,student_name:students[0].name,blocker:null,kind:'manual',handled_at:null,created_at:day(-1)}],total:1,next_cursor:null}),agenda:ready({events:[0,1,3].map((offset,i)=>({id:'synthetic-event-'+i,title:students[i].name+' · LSAT session',starts_at:day(offset,i+15),ends_at:day(offset,i+16),status:'confirmed',calendar_url:'https://calendar.google.com/calendar/u/0/r',student_id:students[i].id,student_name:students[i].name})),next_cursor:null,fetched_at:now.toISOString(),time_zone:fixtureTimeZone}),email:ready({threads:[{id:'synthetic-email',subject:'A question about our next session',sender:'Lydia Park',snippet:'Which passage should I prepare?',received_at:day(0,9),url:'https://mail.google.com/mail/u/0/#inbox',kind:'student'}],count:1,fetched_at:now.toISOString(),enquiries_configured:true}),payments:ready({recent:[{...payment,grant_state:'granted',granted_credits:4}],attention:[payment],total:1,attention_total:1}),results:ready([{id:'synthetic-result',student_id:students[1].id,student_name:students[1].name,title:'PT156 · Full test',score:164,completed_at:day(-2)}])};
const state=['loading','error','setup'].includes(scenario)?scenario:null;
const desk=state?Object.fromEntries(Object.entries(emptyDesk).map(([key,value])=>[key,['actorId','actions','refreshAccess','schedulingServices'].includes(key)?value:{state,retry:()=>window.dispatchEvent(new CustomEvent('fixture-action',{detail:'Retry '+key}))}])):scenario==='empty'?emptyDesk:populated;
const model:TeacherHomeModel={greeting:'Good afternoon',displayName:'Joshua',dateline:new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(now),desk:desk as any,postSession:state?{state:state as any,retry:()=>{}}:{state:'ready',data:{settings:{enabled:true,activation_cutoff:day(-7),last_success_at:now.toISOString(),last_error:null,drive_root_url:null,catching_up:false},tasks:scenario==='empty'?[]:[task(0),task(1)],handled:[],total:scenario==='empty'?0:2,handled_total:0}},unread:{state:state==='loading'?'loading':state==='error'?'error':'ready',total:scenario==='empty'?0:2,rows:scenario==='empty'||state?[]:[{id:'synthetic-conversation',name:'Celia Moreno',initial:'C',snippet:'Could we go through question 12 together?',timeLabel:'10:42 am',receivedAt:day(0,10),hasAttachments:false,route:'/teacher/inbox/synthetic'}]},roster:{state:state==='loading'?'loading':state==='error'?'error':'ready',total:students.length,recent:students,all:students},sessions:{state:'ready',rows:[]}};
function Fixture(){const [action,setAction]=React.useState('');const [,refresh]=React.useReducer(n=>n+1,0);React.useEffect(()=>{const update=()=>refresh();window.addEventListener('synthetic-desk-change',update);return()=>window.removeEventListener('synthetic-desk-change',update);},[]);return <div className="classroom-root classroom-root-home teacher-fixture"><aside className="classroom-sidebar"><div className="teacher-fixture-rail"><small>SYNTHETIC LOCAL SHELL</small><b>LSAT U</b><small>CLASSROOM</small>{['Home','My Work','Practice','Review','Progress','Library','Reading Center'].map(label=><button key={label} className={label==='Home'?'active':''} onClick={()=>setAction(label)}>{label}</button>)}<small>TEACHING</small><button onClick={()=>setAction('Teacher Workspace')}>Teacher Workspace</button><button onClick={()=>setAction('Students')}>Students</button></div></aside><main className="classroom-stage"><div className="classroom-column"><div className="classroom-motion-root"><p className="teacher-fixture-banner" role="note">Local synthetic demo. Account, credit and booking changes are simulated in memory only. Reload resets all changes. Booking URLs are fictional; do not open or share them.</p><Toaster/><TeacherHomeView model={model} onOpen={setAction} onRetryInbox={()=>setAction('Retry inbox')} onRetryRoster={()=>setAction('Retry roster')}/><footer className="teacher-fixture-footer"><span>Local synthetic preview · No production data or writes · </span>{['populated','empty','loading','error','setup'].map(name=><a key={name} href={'?scenario='+name}>{name} </a>)}<output aria-live="polite">Simulated mutations: {actionLog.length}. Booking requests: {bookingRequests.length}. {action?'Local navigation: '+action:''}</output></footer></div></div></main></div>}
const style=document.createElement('style');style.textContent='.teacher-fixture{min-height:100dvh}.teacher-fixture-rail{height:calc(100dvh - 16px);width:100%;border:1px solid var(--classroom-line);border-radius:7px;padding:24px 18px;display:flex;flex-direction:column;gap:4px}.teacher-fixture-rail>b{font-size:14px;margin:0 8px 18px}.teacher-fixture-rail>small{font-size:10px;letter-spacing:.1em;margin:20px 8px 8px;color:var(--classroom-meta-text)}.teacher-fixture-rail button{text-align:left;padding:10px 12px;border-radius:6px;font-size:13px}.teacher-fixture-rail .active{background:var(--classroom-ink);color:var(--classroom-surface)}.teacher-fixture-banner{font-size:12px;padding:12px 0;border-bottom:1px solid var(--classroom-line);margin:0 0 20px;color:var(--classroom-meta-text)}.teacher-fixture-footer{font-size:11px;border-top:1px solid var(--classroom-line);margin-top:32px;padding-top:16px;color:var(--classroom-meta-text)}.teacher-fixture-footer a{text-decoration:underline;margin-right:8px}.teacher-fixture-footer output{display:block;margin-top:10px}';document.head.append(style);
document.title='Teaching desk · '+scenario+' · Local synthetic preview';
createRoot(document.getElementById('root')!).render(<MemoryRouter><Fixture/></MemoryRouter>);
