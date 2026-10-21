import { UserSettingsProvider } from "../../src/contexts/UserSettingsContext";
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { RcHubSurface } from '../../src/features/rc/components/RcHubSurface';
import { buildStandaloneDrillHistory } from '../../src/lib/standaloneDrillHistory';
import type { RcDrillSession, RcAttempt } from '../../src/features/rc/lib/rcTypes';
import { RcSavedSetsPanel } from '../../src/features/rc/components/RcSavedSetsPanel';
import AssignedWorkPanel from '../../src/components/mainhub/AssignedWorkPanel';
import { RcPracticeLanding, RcPracticeResume } from '../../src/features/rc/components/RcPracticeLanding';
import '../../src/index.css';
import '../../src/components/classroom/classroom.css';
import { Button } from '../../src/components/ui/button';
import { SectionToggle } from '../../src/components/drill/SectionToggle';
import QuestionJump from '../../src/components/questionfinder/QuestionJump';
import RcQuestionPreview from '../../src/features/rc/pages/RcQuestionPreview';

const params = new URLSearchParams(location.search);
const previewTheme = params.get('theme') === 'dark' ? 'dark' : 'light';
document.documentElement.classList.remove('dark', 'light');
document.documentElement.classList.add(previewTheme);
if (!params.has('landing') && !params.has('savedView') && !params.has('saved') && !params.has('builder')) params.set('landing', '1');
function LaunchReadback() {
  const navigate = useNavigate();
  const saved = (window as any).__rcBuilderLaunch;
  return <section className="rc-page rc-embedded"><h1>Demo launch verified</h1><p>No real session was created. These are the exact settings sent by the builder.</p><button className="rc-chip" onClick={()=>navigate(-1)}>Back to builder</button><pre>{JSON.stringify(saved, null, 2)}</pre></section>;
}
function LookupReadback() {
  const route=useLocation();
  return <><aside style={{padding:16,fontSize:13,overflowWrap:'anywhere'}}>Synthetic lookup target: {route.pathname+route.search}. This is the actual preview screen with fixture account, passage, exposure, and session adapters.</aside><RcQuestionPreview/></>;
}
function PracticeFixture() {
  const navigate=useNavigate();
  const session: RcDrillSession={id:'synthetic-resume',userId:'synthetic-rc-builder-owner',passageIds:[1188],status:'in_progress',startedAt:'2026-10-20T08:00:00Z',completedAt:null,excludedFromAnalytics:false,config:{source:'manual',reveal:'end_of_set',timing:{mode:'unlimited'}}};
  const attempts: RcAttempt[]=[{id:'synthetic-answer',userId:session.userId,sessionId:session.id,passageId:1188,questionId:9000,isFirstAttempt:true,isCorrect:true,selected:'A',timeMs:30000,flagged:false,eliminations:[],createdAt:'2026-10-20T08:01:00Z'}];
  const item=buildStandaloneDrillHistory([], [session],new Map([[session.id,attempts]]),null,new Map([[1188,{preptest:140,section:3,setNumber:1,title:'Marine ecosystems'}]]))[0];
  return <RcPracticeResume title={item.title} detail={item.detail} onResume={()=>navigate(item.continueTo)}/>;
}
function Workspace() {
  const route=useLocation(); const navigate=useNavigate(); const query=new URLSearchParams(route.search);
  const view=query.get('view')||'create';
  const builder=query.has('builder')||query.has('saved');
  const choose=(mode:string)=>navigate('/practice/drills?section=rc&view=create&builder='+mode);
  const setView=(next:string)=>navigate('/practice/drills?section=rc&view='+next);
  return <div className="classroom-root classroom-root-drill classroom-root-destination rc-preview-root" style={{minHeight:'100vh',padding:24,background:'var(--classroom-drill-page)'}}><div className="student-destination w-full min-w-0 flex-1"><header className="student-destination-heading"><div><h1>Practice</h1><p>Build drills and practice under test conditions.</p></div></header><nav className="student-destination-tabs" aria-label="Practice sections"><span className="student-destination-tab student-destination-tab-active">Drills</span><span className="student-destination-tab">Practice Exams</span></nav><div className="student-destination-content"><div className="rc-practice-workspace drill-observatory-root @container relative h-full w-full overflow-y-auto bg-transparent px-0 py-0 pb-12" data-section="rc"><div className="drill-observatory-canvas relative mx-auto flex w-full max-w-[71.25rem] flex-col gap-5"><nav aria-label="Drills" className="drill-view-tabs flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3"><div className="drill-destination-tabs flex flex-wrap gap-2">{[['create','Create'],['in-progress','In progress'],['completed','Completed'],['saved','Saved sets']].map(([key,label])=><Button key={key} size="sm" variant={view===key?'default':'ghost'} aria-current={view===key?'page':undefined} onClick={()=>setView(key)}>{label}</Button>)}</div><SectionToggle section="rc" onChange={()=>{}}/></nav><div className={`drill-observatory-tools${builder ? ' rc-builder-question-shortcut' : ''}`}><QuestionJump bank="rc" returnTo={route.pathname+route.search} triggerLabel="Find a passage or question"/></div>{view==='saved'?<section className="rc-page rc-embedded rc-saved-workspace"><h1>Saved RC drills</h1><RcSavedSetsPanel /></section>:view!=='create'?<section className="rc-page rc-embedded rc-saved-workspace"><h1>{view==='completed'?'Completed drills':'Drills in progress'}</h1><PracticeFixture /></section>:builder?<section className="rc-create-workspace rounded-xl border border-border bg-card p-5 sm:p-7" aria-label="RC drill setup"><button className="rc-chip mb-4" onClick={()=>navigate(-1)}>Back to RC practice</button><RcHubSurface embedded showHistory={false} openPickerOnEntry={query.get("builder")==="manual"}/></section>:<RcPracticeLanding onChooseAutomatic={()=>choose('automatic')} onChooseManual={()=>choose('manual')} practice={<PracticeFixture/>} assigned={<AssignedWorkPanel scope="rc" drillReturnTo="/practice/drills?section=rc&view=create"/>}/>}</div></div></div></div></div>;
}
const initial=new URLSearchParams({section:'rc',view:params.has('savedView')?'saved':'create'});
if(params.has('saved')) initial.set('saved',params.get('saved')!);
if(params.has('builder')||params.has('fail')||params.has('hidden')) initial.set('builder',params.get('builder')||'automatic');
createRoot(document.getElementById('root')!).render(<><aside style={{padding:8,fontSize:13}}>Local RC builder verification. Actual classroom/drill host wrapper; fixture account/backend. Profile saves are synthetic and reset on reload. Scenario: {params.get('fail')||'ready'}{params.has('hidden')?' / hidden results':''}</aside><UserSettingsProvider><MemoryRouter initialEntries={initial.has('builder')||initial.has('saved') ? ['/practice/drills?section=rc&view=create','/practice/drills?'+initial] : ['/practice/drills?'+initial]} initialIndex={initial.has('builder')||initial.has('saved') ? 1 : 0}><Routes><Route path="/practice/drills" element={<Workspace/>}/><Route path="/rc/drill" element={<LaunchReadback/>}/><Route path="/rc/preview" element={<LookupReadback/>}/></Routes></MemoryRouter></UserSettingsProvider></>);
