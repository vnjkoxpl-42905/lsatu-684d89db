import React from 'react';
import { ClassroomMotionContent } from '../../src/components/classroom/shell/ClassroomMotionContent';
import '../../src/styles/classroom-motion.css';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import RcPlayer from '../../src/features/rc/pages/RcPlayer';
import { RcHubSurface } from '../../src/features/rc/components/RcHubSurface';
import { buildStandaloneDrillHistory } from '../../src/lib/standaloneDrillHistory';
import { getSessionAttempts, listSessions } from '../../src/features/rc/api/rcProgress';
import { loadPassages } from '../../src/features/rc/lib/rcBank';
import { RcSavedSetsPanel } from '../../src/features/rc/components/RcSavedSetsPanel';
import AssignedWorkPanel from '../../src/components/mainhub/AssignedWorkPanel';
import { RcPracticeLanding, RcPracticeResume } from '../../src/features/rc/components/RcPracticeLanding';
import '../../src/index.css';
import '../../src/components/classroom/classroom.css';
import { Button } from '../../src/components/ui/button';
import { SectionToggle } from '../../src/components/drill/SectionToggle';

const params = new URLSearchParams(location.search);
document.documentElement.classList.toggle('dark', params.has('dark'));
document.documentElement.classList.toggle('light', !params.has('dark'));
if (params.has('docked')) document.getElementById('root')!.style.maxWidth = '720px';
function CompletedFixture() { const navigate=useNavigate(); return <section className="rc-page"><h1>Synthetic drill completed</h1><p>The real player saved this synthetic attempt. Results-page presentation is outside this fixture.</p><button type="button" onClick={()=>navigate('/practice/drills?section=rc&view=create')}>Return to RC practice</button></section>; }
function PracticeFixture() {
  const navigate=useNavigate();
  const [item,setItem]=React.useState<ReturnType<typeof buildStandaloneDrillHistory>[number] | null>(null);
  const [status,setStatus]=React.useState('Loading synthetic session history…');
  React.useEffect(()=>{let current=true;void(async()=>{try{
    const sessions=(await listSessions()).filter(session=>session.status==='in_progress').sort((a,b)=>b.startedAt.localeCompare(a.startedAt));
    const session=sessions[0];
    if(!session){if(current)setStatus('No synthetic drill in progress. Start a drill to verify save and resume.');return;}
    const [attempts,passages]=await Promise.all([getSessionAttempts(session.id),loadPassages(session.passageIds)]);
    const metadata=new Map(passages.map(passage=>[passage.passageId,{preptest:passage.preptest,section:passage.section,setNumber:passage.setNumber,title:passage.title}]));
    const row=buildStandaloneDrillHistory([], [session],new Map([[session.id,attempts]]),null,metadata)[0];
    if(current){setItem(row??null);setStatus(row?'':'This synthetic session could not be summarized.');}
  }catch{if(current)setStatus('Synthetic resume details could not be loaded. No progress is assumed.');}})();return()=>{current=false;};},[]);
  if(!item)return <p role="status" className="rc-field-hint">{status}</p>;
  return <RcPracticeResume title={item.title} detail={item.detail} onResume={()=>navigate(item.continueTo)}/>;
}
function Workspace() {
  const route=useLocation(); const navigate=useNavigate(); const query=new URLSearchParams(route.search);
  const view=query.get('view')||'create';
  const builder=query.has('builder')||query.has('saved');
  const choose=(mode:string)=>navigate('/practice/drills?section=rc&view=create&builder='+mode);
  const setView=(next:string)=>navigate('/practice/drills?section=rc&view='+next);
  return <React.Suspense fallback={null}><ClassroomMotionContent><div className="classroom-root classroom-root-drill classroom-root-destination rc-practice-workspace" style={{minHeight:'100vh',padding:24}}><div className="student-destination w-full min-w-0 flex-1"><header data-motion-skip className="student-destination-heading"><div><h1>Practice</h1><p>Build drills and practice under test conditions.</p></div></header><nav data-motion-skip className="student-destination-tabs" aria-label="Practice sections"><span className="student-destination-tab student-destination-tab-active">Drills</span><span className="student-destination-tab">Practice Exams</span></nav><div className="student-destination-content"><div className="drill-observatory-root @container relative h-full w-full overflow-y-auto bg-transparent px-0 py-0 pb-12" data-section="rc"><div className="drill-observatory-canvas relative mx-auto flex w-full max-w-[71.25rem] flex-col gap-5"><nav data-motion-skip aria-label="Drills" className="drill-view-tabs flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3"><div className="drill-destination-tabs flex flex-wrap gap-2">{[['create','Create'],['in-progress','In progress'],['completed','Completed'],['saved','Saved sets']].map(([key,label])=><Button key={key} size="sm" variant={view===key?'default':'ghost'} aria-current={view===key?'page':undefined} onClick={()=>setView(key)}>{label}</Button>)}</div><SectionToggle section="rc" onChange={()=>{}}/></nav><div className="drill-observatory-tools"><Button type="button" className="rounded-full">Open a question</Button></div>{view==='saved'?<section data-motion-enter className="rc-page rc-embedded rc-saved-workspace"><h1>Saved RC drills</h1><RcSavedSetsPanel /></section>:view!=='create'?<section data-motion-enter className="rc-page rc-embedded rc-saved-workspace"><h1>{view==='completed'?'Completed drills':'Drills in progress'}</h1><PracticeFixture /></section>:builder?<section data-motion-enter className="rc-create-workspace rounded-xl border border-border bg-card p-5 sm:p-7" aria-label="RC drill setup"><button className="rc-practice-back" onClick={()=>navigate(-1)}>Back to RC practice</button><RcHubSurface embedded showHistory={false} openPickerOnEntry={query.get('builder')==='manual'}/></section>:<RcPracticeLanding onChooseAutomatic={()=>choose('automatic')} onChooseManual={()=>choose('manual')} practice={<PracticeFixture/>} assigned={<AssignedWorkPanel drillReturnTo="/practice/drills?section=rc&view=create"/>}/>}</div></div></div></div></div></ClassroomMotionContent></React.Suspense>;
}
const initial=new URLSearchParams({section:'rc',view:params.has('savedView')?'saved':'create'});
if(params.has('saved')) initial.set('saved',params.get('saved')!);
if(params.has('builder')||params.has('fail')||params.has('hidden')) initial.set('builder',params.get('builder')||'automatic');
createRoot(document.getElementById('root')!).render(<><aside style={{padding:8,fontSize:13}}>Local synthetic verification. No production backend. Scenario: {params.get('fail')||'ready'}{params.has('hidden')?' / hidden results':''}</aside><MemoryRouter initialEntries={initial.has('builder')||initial.has('saved') ? ['/practice/drills?section=rc&view=create','/practice/drills?'+initial] : ['/practice/drills?'+initial]} initialIndex={initial.has('builder')||initial.has('saved') ? 1 : 0}><Routes><Route path="/practice/drills" element={<Workspace/>}/><Route path="/rc/drill" element={<RcPlayer/>}/><Route path="/rc" element={<Navigate to="/practice/drills?section=rc&view=create" replace/>}/><Route path="/rc/results/:sessionId" element={<CompletedFixture/>}/></Routes></MemoryRouter></>);
