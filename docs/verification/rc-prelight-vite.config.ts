import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import fs from 'node:fs';
const root=path.resolve(__dirname,'../..');
const file=JSON.parse(fs.readFileSync(path.join(root,'public/data/rc/RC-PT140.json'),'utf8'));
const passages=file.passages;
const index=passages.map((p:any,i:number)=>({...p,preptest:140,section:p.section??4,setNumber:p.setNumber??i+1,frameworks:p.frameworks??[],questionCount:p.questions?.length??0,questionIds:(p.questions??[]).map((q:any)=>q.questionId),firstWords:p.text?.slice(0,90)??''}));
export default defineConfig({root,plugins:[{name:'historical-readonly-fixture',enforce:'pre',load(id){const key=id.replaceAll('\\','/');if(key.endsWith('/src/contexts/AuthContext.tsx'))return 'export const useAuth=()=>({user:{id:"historical-visual-fixture"}});';if(key.endsWith('/src/features/rc/lib/rcBank.ts'))return 'const passages='+JSON.stringify(passages)+';export async function loadAllIndexPassages(){return '+JSON.stringify(index)+';}export async function loadPassages(ids){return ids.map(id=>passages.find(p=>p.passageId===id)).filter(Boolean);}';if(key.endsWith('/src/features/rc/api/rcProgress.ts'))return 'export async function getQuestionHistory(){return new Map();}export async function listSessions(){return [];}export async function getSession(){return null;}export async function getSessionAttempts(){return [];}export async function createSession(){throw new Error("Historical visual reference only. No drill was created.");}export async function deleteSession(){throw new Error("Historical visual reference only.");}';}},react()],resolve:{alias:{'@':path.join(root,'src')}},server:{host:'127.0.0.1',port:8098,strictPort:true}});
