// Real components with explicit synthetic read/write adapters. No production auth or data.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baseline = process.argv.includes('--baseline');
const baselinePaths = ['src/pages/MyWorkNotesPage.tsx', 'src/pages/myWorkNotes.css', 'src/lib/destinationAccess.ts', 'src/components/classroom/ClassroomRouteViews.tsx'];
const replacements = {
  'src/contexts/AuthContext.tsx': `export const useAuth = () => ({user:{id:'local-student'}, session:null}); export const AuthProvider = ({children}) => children;`,
  'src/hooks/useUserPermissions.ts': `export const useUserPermissions = () => ({loading:false,is_admin:false,has_classroom_access:true,has_chat_access:true}); export const useIsAdmin = () => false;`,
  'src/hooks/useReadingCenterAccess.ts': `export const useReadingCenterAccess = () => ({allowed:false,isPending:false});`,
  'src/hooks/useClassroomMotion.ts': `export const useClassroomMotion = () => {};`,
  'src/hooks/useClassroomItems.ts': `import {useQuery} from '@tanstack/react-query'; export const useClassroomItems = () => useQuery({queryKey:['classroom-items','local-student'],queryFn:async()=>{if(window.__fixtureError)throw new Error('Local fixture load failure');return [...window.__notesFixture]},retry:false,staleTime:0}); export const useStudentClassroomItems = useClassroomItems;`,
  'src/integrations/supabase/client.ts': `export const supabase={from(){throw new Error('Unexpected production data call blocked by local preview')},auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};`,
  'src/lib/markNoteRead.ts': `export const isReadInMetadata = item => item.status==='completed'||!!item.metadata_json?.read_at; export async function markNoteRead(item){const note=window.__notesFixture.find(n=>n.id===item.id);if(note&&!isReadInMetadata(note))note.metadata_json={...note.metadata_json,read_at:new Date().toISOString()}} export async function clearNoteNotifications(){}`,
  'src/lib/journalService.ts': `let pages=[];export const listPages=async()=>[...pages];export const createPage=async(input)=>{const note={...input,id:'local-personal-'+Date.now(),user_id:'local-student',type:'doc',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};pages.push(note);return note};export const updateMyNotePage=async(id,title,body)=>{const note=pages.find(n=>n.id===id);Object.assign(note,{title,body,updated_at:new Date().toISOString()});return note};`,
};
const fixturePlugin = {name:'my-work-local-fixtures',enforce:'pre',load(id){const local=id.replaceAll('\\','/').split('?')[0].slice(root.replaceAll('\\','/').length+1);if(replacements[local])return replacements[local];if(baseline&&baselinePaths.includes(local))return execFileSync('git',['show','eaf82e506bbeb3b5e86f1310f98bad3e818b926a:'+local],{cwd:root,encoding:'utf8'});}};
const port = baseline ? 8144 : 8143;
const server = await createServer({root,configFile:false,plugins:[fixturePlugin,react()],resolve:{alias:{'@':resolve(root,'src')},dedupe:['react','react-dom']},server:{host:'127.0.0.1',port,strictPort:true},define:{__BUILD_SHA__:JSON.stringify('local-notes-verification'),__BUILD_TIME__:JSON.stringify('2026-10-26')}});
await server.listen();
console.log(`${baseline?'Baseline':'Current'} My Work fixture: http://127.0.0.1:${port}/scripts/verification/my-work-preview.html`);
