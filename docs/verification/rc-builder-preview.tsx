import React from 'react';
import {RcPracticeLanding as BaselineLanding,RcPracticeResume as BaselineResume} from 'rc-preview:baselineLanding.tsx';
import baselineCss from 'rc-preview:baselineCss';
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
import QuestionJump from '../../src/components/questionfinder/QuestionJump';
import { SectionToggle } from '../../src/components/drill/SectionToggle';

document.documentElement.classList.remove('dark');
document.documentElement.classList.add('light');
const params = new URLSearchParams(location.search);
const baseline=params.has('baseline');
if(baseline){document.querySelectorAll<HTMLStyleElement>('style[data-vite-dev-id]').forEach(node=>{if(node.dataset.viteDevId?.replaceAll('\\','/').endsWith('/src/features/rc/rc.css'))node.remove();});const style=document.createElement('style');style.textContent=baselineCss;document.head.append(style);}
function LaunchReadback() {
  const saved = (window as any).__rcBuilderLaunch;
  return <section className="rc-page rc-embedded"><h1>Verified launch</h1><pre>{JSON.stringify(saved, null, 2)}</pre></section>;
}
function PracticeFixture() {
  const navigate=useNavigate();
  const session: RcDrillSession={id:'synthetic-resume',userId:'synthetic-rc-builder-owner',passageIds:[1188],status:'in_progress',startedAt:'2026-10-20T08:00:00Z',completedAt:null,excludedFromAnalytics:false,config:{source:'manual',reveal:'end_of_set',timing:{mode:'unlimited'}}};
  const attempts: RcAttempt[]=[{id:'synthetic-answer',userId:session.userId,sessionId:session.id,passageId:1188,questionId:9000,isFirstAttempt:true,isCorrect:true,selected:'A',timeMs:30000,flagged:false,eliminations:[],createdAt:'2026-10-20T08:01:00Z'}];
  const item=buildStandaloneDrillHistory([], [session],new Map([[session.id,attempts]]),null,new Map([[1188,{preptest:140,section:3,setNumber:1,title:'Marine ecosystems'}]]))[0];
  if(params.has('empty')) return <p className="rc-practice-note">No RC drill in progress. Build a drill above or view your completed drills.</p>;
  if(params.get('fail')==='resume') return <div role="alert"><p>Your RC drill could not be loaded.</p><button className="rc-practice-link" type="button">Retry RC drills</button></div>;
  if(baseline) return <BaselineResume title={item.title} detail={item.detail} onResume={()=>navigate(item.continueTo)}/>;
  return <RcPracticeResume title="Marine ecosystems" source="PT 140 · S3 · P1" detail={item.detail} onResume={()=>navigate(item.continueTo)}/>;
}
function Workspace() {
  const route=useLocation(); const navigate=useNavigate(); const query=new URLSearchParams(route.search);
  const view=query.get('view')||'create';
  const builder=query.has('builder')||query.has('saved');
  const landing=view==='create'&&!builder;
  const Landing=baseline?BaselineLanding:RcPracticeLanding;
  const choose=(mode:string)=>navigate('/practice/drills?section=rc&view=create&builder='+mode);
  const setView=(next:string)=>navigate('/practice/drills?section=rc&view='+next);
  return <div className="classroom-root classroom-root-drill classroom-root-destination" style={{minHeight:'100vh',padding:24,background:'#fdf8f3',maxWidth:params.has('panel')?Number(params.get('panel')):undefined}}><div className="student-destination w-full min-w-0 flex-1"><header className="student-destination-heading"><div><h1>Practice</h1><p>Choose deliberate practice or a timed exam.</p></div></header><nav className="student-destination-tabs" aria-label="Practice sections"><span className="student-destination-tab student-destination-tab-active">Drills</span><span className="student-destination-tab">Practice Exams</span></nav><div className="student-destination-content"><div className={"drill-observatory-root @container relative h-full w-full overflow-y-auto bg-transparent px-0 py-0 pb-12"+(landing&&!baseline?" rc-practice-page":"")} data-section="rc"><div className="drill-observatory-canvas relative mx-auto flex w-full max-w-[71.25rem] flex-col gap-5"><nav aria-label="Drills" className="drill-view-tabs flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3"><div className="drill-destination-tabs flex flex-wrap gap-2">{[['create','Create'],['in-progress','In progress'],['completed','Completed'],['saved','Saved sets']].map(([key,label])=><Button key={key} size="sm" variant={view===key?'default':'ghost'} aria-current={view===key?'page':undefined} onClick={()=>setView(key)}>{label}</Button>)}</div>{landing&&!baseline?<div className="rc-practice-nav-actions"><QuestionJump returnTo={route.pathname+route.search} tone="light" bank="rc" withSearch={false}/><SectionToggle section="rc" onChange={()=>{}}/></div>:<SectionToggle section="rc" onChange={()=>{}}/>}</nav>{(!landing||baseline)&&<div className="drill-observatory-tools"><QuestionJump returnTo={route.pathname+route.search} tone="light" bank="rc" withSearch={false}/></div>}{view==='saved'?<section className="rc-page rc-embedded rc-saved-workspace"><h1>Saved RC drills</h1><RcSavedSetsPanel /></section>:view!=='create'?<section className="rc-page rc-embedded rc-saved-workspace"><h1>{view==='completed'?'Completed drills':'Drills in progress'}</h1><PracticeFixture /></section>:builder?<section className="rc-create-workspace rounded-xl border border-border bg-card p-5 sm:p-7" aria-label="RC drill setup"><button className="rc-chip mb-4" onClick={()=>navigate(-1)}>Back to RC practice</button><RcHubSurface embedded showHistory={false}/></section>:<Landing onChooseAutomatic={()=>choose('automatic')} onChooseManual={()=>choose('manual')} practice={<><PracticeFixture/><button type="button" className="rc-practice-link" onClick={()=>setView('completed')}>View completed RC drills <span aria-hidden="true">→</span></button></>} assigned={<AssignedWorkPanel drillReturnTo="/practice/drills?section=rc&view=create"/>}/>}</div></div></div></div></div>;
}
const initial=new URLSearchParams({section:'rc',view:params.has('savedView')?'saved':'create'});
if(params.has('saved')) initial.set('saved',params.get('saved')!);
if(params.has('builder')||(params.has('fail')&&!['assignments','resume'].includes(params.get('fail')!))||params.has('hidden')) initial.set('builder',params.get('builder')||'automatic');
createRoot(document.getElementById('root')!).render(<><aside style={{padding:8,fontSize:13}}>Local synthetic verification. No production backend. Scenario: {params.get('fail')||'ready'}{params.has('hidden')?' / hidden results':''}</aside><MemoryRouter initialEntries={initial.has('builder')||initial.has('saved') ? ['/practice/drills?section=rc&view=create','/practice/drills?'+initial] : ['/practice/drills?'+initial]} initialIndex={initial.has('builder')||initial.has('saved') ? 1 : 0}><Routes><Route path="/practice/drills" element={<Workspace/>}/><Route path="/rc/drill" element={<LaunchReadback/>}/></Routes></MemoryRouter></>);
