// Local-only real-component harness. All account adapters are synthetic.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const shared = `
const scenario = new URLSearchParams(location.search);
const failures=new Set();
export const operations=[]; window.__rcPreviewOperations=operations;
export const fail = (name,id='read') => { operations.push({name,id}); const selected=scenario.get('fail'); if(selected===name || selected===name+'-once' && !failures.has(name)){failures.add(name);throw new Error('Synthetic ' + name + ' request failed');} };
export const owner = 'synthetic-rc-builder-owner';
export const passages = ['Marine ecosystems','The history of public libraries','Judicial interpretation','Painting and perspective'].map((title,i) => ({passageId:1188+i,preptest:140+i,section:3,setNumber:i+1,title,topic:['Natural Science','Humanities','Law','Arts'][i],format:'Standard',frameworks:[],difficulty:i%3+1,firstWords:'Researchers have often considered',text:'Researchers have often considered how evidence changes our understanding. A recent comparison suggests that explanations depend on the conditions of observation.\\n\\nThis synthetic passage is provided only for interface verification.',summaries:{standard:null,brief:null,anotherWay:null},questions:Array.from({length:i+3},(_,q)=>({questionId:9000+i*10+q,position:q+1,prompt:'Which statement is best supported by the passage?',questionType:'Inference',questionTypeFamily:'Inference',difficulty:2,correctAnswer:'A',features:[],choices:['A','B','C','D','E'].map(letter=>({letter,text:'Synthetic choice '+letter,correct:letter==='A',explanation:'Hidden synthetic explanation',tag:null,percent:null,responseCount:null})),hasWrittenExplanation:true,explanationBlocks:[]}))}));
export const filters={topics:[],formats:[],frameworks:[],families:[],difficulties:[],status:'fresh',preptestMin:101,preptestMax:148};
export const recipe={kind:'rc-builder',version:1,mode:'recipe',config:{reveal:'end_of_set',timing:{mode:'unlimited'}},filters,count:2,passageIds:[],questionIds:[]};
export const rows=[{id:'settings',userId:owner,name:'Weekly practice settings',payload:recipe,problem:null},{id:'passages',userId:owner,name:'Exact science and history',payload:{...recipe,mode:'fixed',passageIds:[1188,1189],questionIds:passages.slice(0,2).flatMap(p=>p.questions.map(q=>q.questionId))},problem:null}];
export const sessions=new Map(); export const exposures=new Set(); export const attempts=new Map(); export const annotations=new Map(); export const learning=new Map();
`;
const modules = {
  shared,
  assigned: `export const useAssignedTodoFeed=()=>({rows:[{key:'synthetic-assigned-1',kind:'guided',refId:'fixture-main-point',sourceTable:'guided_drill_assignments',title:'RC: Explain the author’s main point',subtitle:'Assigned by Joshua',status:'assigned',createdAt:'2026-10-20',dueAt:null,route:'/guided/fixture-main-point'},{key:'synthetic-assigned-2',kind:'guided',refId:'fixture-comparative',sourceTable:'guided_drill_assignments',title:'Comparative passages: Identify the disagreement',subtitle:'Assigned by Joshua',status:'in_progress',createdAt:'2026-10-19',dueAt:null,route:'/guided/fixture-comparative'}],loading:false,failed:false,evidenceWarnings:[],retry:()=>{}});export const routeWithReturnTo=(route,from)=>route+'?returnTo='+encodeURIComponent(from);`,
  auth: `export const useAuth=()=>({user:{id:'synthetic-rc-builder-owner'},authReady:true});`,
  settings: `export const useUserSettings=()=>({settings:{defaultTimingMode:'35'},profileTimingMode:'35',profileTimingStatus:'ready',updateSettings:async()=>{},saveProfileTiming:async()=>{}});`,
  cloud: `export const supabase=new Proxy({}, {get(){throw new Error('Production backend disabled in RC builder harness');}});`,
  // ?bank=real reads the static RC bank in public/ (metadata index and passages); accounts stay synthetic.
  bank: `import {passages,fail} from 'rc-preview:shared'; const realBank=new URLSearchParams(location.search).get('bank')==='real'; const bank=()=>import('/src/features/rc/lib/rcBank.ts?fixture-original'); export const loadAllIndexPassages=async()=>{fail('index');if(realBank)return (await bank()).loadAllIndexPassages();return passages.map(p=>({...p,questionCount:p.questions.length,questionIds:p.questions.map(q=>q.questionId)}))}; export const loadPassages=async ids=>{fail('preview');if(realBank)return (await bank()).loadPassages(ids);return ids.map(id=>passages.find(p=>p.passageId===id))};export const loadPassage=async id=>(await loadPassages([id]))[0]??null;`,
  progress: `import {fail,sessions,owner,attempts,annotations} from 'rc-preview:shared';
export const getRcHistorySnapshot=async()=>{fail('history');return {history:new Map(),displayHistory:new Map(),hasHiddenGradedResults:new URLSearchParams(location.search).has('hidden')}};
export const getSession=async id=>sessions.get(id)||null; export const listSessions=async()=>[...sessions.values()]; export const getSessionAttempts=async id=>[...(attempts.get(id)||[])];
export const abandonSession=async id=>{sessions.get(id).status='abandoned'};
export const createSession=async(config,ids,options={})=>{const id=options.id||crypto.randomUUID();fail('start',id);const row=sessions.get(id)||{id,userId:owner,passageIds:[...ids],config:structuredClone(config),status:'in_progress',startedAt:new Date().toISOString(),completedAt:null,excludedFromAnalytics:false};sessions.set(id,row);window.__rcBuilderLaunch=row;fail('start-reply',id);return row};
export const recordAttempt=async attempt=>{fail('answer',attempt.id);const rows=attempts.get(attempt.sessionId)||[];const index=rows.findIndex(row=>row.id===attempt.id);if(index<0)rows.push(structuredClone(attempt));else rows[index]=structuredClone(attempt);attempts.set(attempt.sessionId,rows);return structuredClone(attempt)};
export const completeSession=async id=>{fail('complete',id);Object.assign(sessions.get(id),{status:'completed',completedAt:new Date().toISOString()})};
export const saveSessionClock=async(id,seconds,index,drafts)=>{fail('clock',id);const row=sessions.get(id);row.config={...row.config,clockElapsedSeconds:seconds,...(index!==undefined?{currentQuestionIndex:index}:{}),...(drafts?{draftAnswers:drafts.answers??drafts}: {})}};
export const loadAnnotations=async ids=>new Map(ids.map(id=>[id,annotations.get(id)||[]])); export const saveAnnotationsNow=async(id,marks)=>{annotations.set(id,structuredClone(marks))};
export const setAttemptFlag=async(id,qid,flagged)=>{for(const row of attempts.get(id)||[])if(row.questionId===qid)row.flagged=flagged};`,
  exposure: `import {exposures,fail} from 'rc-preview:shared'; export const getRcExposureHistory=async()=>new Set(exposures);export const createRcExposureRequest=(actorId,passageId,source)=>({id:crypto.randomUUID(),actorId,passageId,source});export const isRcExposureRequest=value=>!!value&&typeof value.id==='string'&&typeof value.actorId==='string'&&Number.isSafeInteger(value.passageId)&&['builder-preview','player'].includes(value.source);export const recordRcPassageExposure=async request=>{fail(request.source==='builder-preview'?'exposure':'player-exposure',request.id);exposures.add(request.passageId)};`,
  saved: `import {rows,fail} from 'rc-preview:shared';export const listRcSavedSets=async()=>rows;export const getRcSavedSet=async(owner,id)=>rows.find(r=>r.id===id)||{problem:'Synthetic saved item unavailable'};export const saveRcSet=async(owner,name,payload,id)=>{fail('save',id);const row={id,userId:owner,name,payload:structuredClone(payload),problem:null};const index=rows.findIndex(row=>row.id===id);if(index<0)rows.push(row);else rows[index]=row;fail('save-reply',id);return row};export const renameRcSet=async(owner,id,name)=>{rows.find(r=>r.id===id).name=name};`,
  learning: `export * from '/src/features/rc/lib/rcLearning.ts?fixture-original';import {learning,fail} from 'rc-preview:shared';export const getRcLearningEvents=async(actor,id)=>learning.get(id)||[];export const recordRcLearningEvent=async event=>{fail('learning',event.id);const rows=learning.get(event.sessionId)||[];if(!rows.some(row=>row.id===event.id))rows.push(event);learning.set(event.sessionId,rows);return event};`,
  database: `export const rcDb=new Proxy({}, {get(){throw new Error('Production RC database disabled in preview')}});export const RC_SESSIONS_TABLE='rc_drill_sessions';export const RC_ATTEMPTS_TABLE='rc_attempts';export const RC_ANNOTATIONS_TABLE='rc_annotations';`,
  protected: `export const assertRcParentReleased=async(session,actor)=>{if(session.userId!==actor||session.config.practiceTestRunId||session.config.timedSectionSittingId)throw new Error('Protected sessions are unavailable in this synthetic fixture')};`,
};
const server=await createServer({root,configFile:false,envFile:false,resolve:{alias:{'@':resolve(root,'src')},dedupe:['react','react-dom']},plugins:[{name:'isolated-rc-builder',enforce:'pre',resolveId(source){
if(source.startsWith('rc-preview:'))return '\0'+source;
if(source.includes('?fixture-original'))return;
if(source.endsWith('/hooks/useAssignedTodoFeed'))return '\0rc-preview:assigned';
if(source.endsWith('/contexts/UserSettingsContext'))return '\0rc-preview:settings';
if(source.endsWith('/contexts/AuthContext'))return '\0rc-preview:auth';
if(source.endsWith('/integrations/supabase/client'))return '\0rc-preview:cloud';
const names={rcBank:'bank',rcProgress:'progress',rcExposure:'exposure',rcSavedSets:'saved',rcLearning:'learning','rcSupabase.types':'database',rcProtectedRelease:'protected'};
const basename=source.split('/').at(-1)?.replace(/\.(?:ts|tsx)$/,'');
if(names[basename])return '\0rc-preview:'+names[basename];
},load(id){if(id.startsWith('\0rc-preview:'))return modules[id.slice('\0rc-preview:'.length)];}},react()],server:{host:'127.0.0.1',port:8120,strictPort:true}});
await server.listen(); console.log('RC builder preview: http://127.0.0.1:8120/docs/verification/rc-builder-preview.html?builder=automatic&bank=real (add &dark, &docked, &fail=exposure-once|save-once|start-once|start-reply-once)');
