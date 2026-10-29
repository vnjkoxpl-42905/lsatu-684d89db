// Local-only synthetic UI harness. The production client is replaced before module evaluation.
import {createServer} from 'vite';
import {execFileSync} from 'node:child_process';
import react from '@vitejs/plugin-react-swc';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const baseline=process.argv.includes('--baseline');
const baselinePaths=['src/components/classroom/home/home.css','src/components/classroom/home/teacher/TeacherHomeView.tsx','src/components/classroom/home/teacher/PostSessionWork.tsx'];
const block={name:'teacher-home-no-production',enforce:'pre',load(id){const relative=id.replaceAll('\\','/').split('?')[0].slice(root.replaceAll('\\','/').length+1);if(baseline&&baselinePaths.includes(relative))return execFileSync('git',['show','HEAD:'+relative],{cwd:root,encoding:'utf8'});if(id.replaceAll('\\','/').split('?')[0]===resolve(root,'src/lib/publicBookingApi.ts').replaceAll('\\','/'))return 'export class PublicBookingError extends Error {constructor(code,status,definitiveRefusal=false){super(code);this.code=code;this.status=status;this.definitiveRefusal=definitiveRefusal}};export const createPublicBookingApi=()=>{throw new Error("Production booking blocked in synthetic Teacher Home preview")};';if(id.replaceAll('\\','/').split('?')[0]===resolve(root,'src/integrations/supabase/client.ts').replaceAll('\\','/'))return 'const blocked=()=>{throw new Error("Production access blocked in synthetic Teacher Home preview")};export const supabase={from:blocked,rpc:blocked,functions:{invoke:blocked},auth:{getSession:blocked,getUser:blocked}};';}};
const server=await createServer({root,cacheDir:resolve(root,baseline?'.taste-skill/teacher-vite-baseline':'.taste-skill/teacher-vite-current'),optimizeDeps:{entries:['scripts/verification/teacher-home-preview.html']},configFile:false,plugins:[block,react()],resolve:{alias:{'@':resolve(root,'src')},dedupe:['react','react-dom']},define:{__BUILD_SHA__:JSON.stringify('local-teacher-quality'),__BUILD_TIME__:JSON.stringify('2026-10-28')},server:{host:'127.0.0.1',port:baseline?8153:8154,strictPort:true}});
await server.listen();console.log('Teacher Home synthetic preview: http://127.0.0.1:'+(baseline?8153:8154)+'/scripts/verification/teacher-home-preview.html?scenario=populated');
