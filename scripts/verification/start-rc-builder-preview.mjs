// Local-only real-component harness. All account adapters are synthetic.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const shared = `
const scenario = new URLSearchParams(location.search);
export const fail = name => { if (scenario.get('fail') === name) throw new Error('Synthetic ' + name + ' request failed'); };
export const owner = 'synthetic-rc-builder-owner';
export const passages = ['Marine ecosystems','The history of public libraries','Judicial interpretation','Painting and perspective'].map((title,i) => ({passageId:1188+i,preptest:140+i,section:3,setNumber:i+1,title,topic:['Natural Science','Humanities','Law','Arts'][i],format:'Standard',frameworks:[],difficulty:i%3+1,firstWords:'Researchers have often considered',text:'Researchers have often considered how evidence changes our understanding. A recent comparison suggests that explanations depend on the conditions of observation.\\n\\nThis synthetic passage is provided only for interface verification.',summaries:{standard:null,brief:null,anotherWay:null},questions:Array.from({length:i+3},(_,q)=>({questionId:9000+i*10+q,position:q+1,prompt:'Which statement is best supported by the passage?',questionType:'Inference',questionTypeFamily:'Inference',difficulty:2,correctAnswer:'A',features:[],choices:['A','B','C','D','E'].map(letter=>({letter,text:'Synthetic choice '+letter,correct:letter==='A',explanation:'Hidden synthetic explanation',tag:null,percent:null,responseCount:null})),hasWrittenExplanation:true,explanationBlocks:[]}))}));
export const filters={topics:[],formats:[],frameworks:[],families:[],difficulties:[],status:'fresh',preptestMin:101,preptestMax:148};
export const recipe={kind:'rc-builder',version:1,mode:'recipe',config:{reveal:'end_of_set',timing:{mode:'unlimited'}},filters,count:2,passageIds:[],questionIds:[]};
export const rows=[{id:'settings',userId:owner,name:'Weekly practice settings',payload:recipe,problem:null},{id:'passages',userId:owner,name:'Exact science and history',payload:{...recipe,mode:'fixed',passageIds:[1188,1189],questionIds:passages.slice(0,2).flatMap(p=>p.questions.map(q=>q.questionId))},problem:null}];
export const sessions=new Map(); export const exposures=new Map();
`;
const modules = {
  shared,
[REDACTED CREDENTIAL]
  auth: `export const useAuth=()=>({user:{id:'synthetic-rc-builder-owner'},authReady:true});`,
  settings: `export const useUserSettings=()=>({settings:{defaultTimingMode:'35'},profileTimingMode:'35',profileTimingStatus:'ready',updateSettings:async()=>{},saveProfileTiming:async()=>{}});`,
  cloud: `export const supabase=new Proxy({}, {get(){throw new Error('Production backend disabled in RC builder harness');}});`,
  bank: `import {passages,fail} from 'rc-preview:shared'; export const loadAllIndexPassages=async()=>{fail('index');return passages.map(p=>({...p,questionCount:p.questions.length,questionIds:p.questions.map(q=>q.questionId)}))}; export const loadPassages=async ids=>{fail('preview');return ids.map(id=>passages.find(p=>p.passageId===id))};`,
  progress: `import {fail,sessions,owner} from 'rc-preview:shared'; export const getRcHistorySnapshot=async()=>{fail('history');return {history:new Map(),displayHistory:new Map(),hasHiddenGradedResults:new URLSearchParams(location.search).has('hidden')}}; export const getSession=async id=>sessions.get(id)||null; export const listSessions=async()=>[];export const getSessionAttempts=async()=>[]; export const abandonSession=async()=>{};export const createSession=async(config,ids,options)=>{fail('start');const row={id:options.id,userId:owner,passageIds:[...ids],config:structuredClone(config),status:'in_progress'};sessions.set(row.id,row);window.__rcBuilderLaunch=row;return row};`,
  exposure: `import {exposures} from 'rc-preview:shared'; export const getRcExposureHistory=async()=>exposures;export const createRcExposureRequest=(actorId,passageId,source)=>({id:crypto.randomUUID(),actorId,passageId,source});export const isRcExposureRequest=()=>true;export const recordRcPassageExposure=async request=>{exposures.set(request.passageId,request)};`,
  saved: `import {rows} from 'rc-preview:shared';export const listRcSavedSets=async()=>rows;export const getRcSavedSet=async(owner,id)=>rows.find(r=>r.id===id)||{problem:'Synthetic saved item unavailable'};export const saveRcSet=async(owner,name,payload,id)=>{const row={id,userId:owner,name,payload,problem:null};rows.push(row);return row};export const renameRcSet=async(owner,id,name)=>{rows.find(r=>r.id===id).name=name};`,
};
const server=await createServer({root,configFile:false,envFile:false,resolve:{alias:{'@':resolve(root,'src')},dedupe:['react','react-dom']},plugins:[{name:'isolated-rc-builder',enforce:'pre',resolveId(source){if(source.startsWith('rc-preview:'))return '\0'+source;if(source.endsWith('/hooks/useAssignedTodoFeed'))return '\0rc-preview:assigned';if(source.endsWith('/contexts/UserSettingsContext'))return '\0rc-preview:settings';if(source.endsWith('/contexts/AuthContext'))return '\0rc-preview:auth';if(source.endsWith('/integrations/supabase/client'))return '\0rc-preview:cloud';const names={'../lib/rcBank':'bank','../api/rcProgress':'progress','../api/rcExposure':'exposure','../api/rcSavedSets':'saved'};if(names[source])return '\0rc-preview:'+names[source];},load(id){if(id.startsWith('\0rc-preview:'))return modules[id.slice('\0rc-preview:'.length)];}},react()],server:{host:'127.0.0.1',port:8118,strictPort:true}});
await server.listen(); console.log('RC builder preview: http://127.0.0.1:8118/docs/verification/rc-builder-preview.html');
