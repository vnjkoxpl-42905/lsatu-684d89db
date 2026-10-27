// Real components with explicit synthetic read/write adapters. No production auth or data.
import { createServer, build, preview } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baseline = process.argv.includes('--baseline');
const buildOnly = process.argv.includes('--build-only');
const productionFixture = process.argv.includes('--build') || buildOnly;
const baselinePaths = ['src/pages/MyWorkNotesPage.tsx', 'src/pages/myWorkNotes.css', 'src/lib/destinationAccess.ts', 'src/components/classroom/ClassroomRouteViews.tsx'];
const replacements = {
  'src/contexts/AuthContext.tsx': `export const useAuth = () => ({user:{id:'local-student'}, session:null}); export const AuthProvider = ({children}) => children;`,
  'src/hooks/useUserPermissions.ts': `export const useUserPermissions = () => ({loading:false,is_admin:false,has_classroom_access:true,has_chat_access:true}); export const useIsAdmin = () => false;`,
  'src/hooks/useReadingCenterAccess.ts': `export const useReadingCenterAccess = () => ({allowed:false,isPending:false});`,
  'src/hooks/useAssignedTodoFeed.ts': `export {routeWithReturnTo} from '/src/hooks/useAssignedTodoFeed.ts?fixture-original'; export const useAssignedTodoFeed=()=>({rows:window.__workFixture??[],loading:false,failed:false,retry(){}});`,
  'src/components/classroom/PrescribedWeek.tsx': `export default function PrescribedWeek(){return null;}`,
  'src/hooks/useClassroomMotion.ts': `export const useClassroomMotion = () => {};`,
  'src/hooks/useClassroomItems.ts': `import {useQuery} from '@tanstack/react-query'; export const useClassroomItems = () => useQuery({queryKey:['classroom-items','local-student'],queryFn:async()=>{if(window.__fixtureLoading)return new Promise(()=>{});if(window.__fixtureError)throw new Error('Local fixture load failure');return [...window.__notesFixture]},retry:false,staleTime:0}); export const useStudentClassroomItems = useClassroomItems;`,
  'src/integrations/supabase/client.ts': `export const supabase={from(){throw new Error('Unexpected production data call blocked by local preview')},auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};`,
  'src/lib/markNoteRead.ts': `export const isReadInMetadata = item => item.status==='completed'||!!item.metadata_json?.read_at; export async function markNoteRead(item){const note=window.__notesFixture.find(n=>n.id===item.id);if(note&&!isReadInMetadata(note))note.metadata_json={...note.metadata_json,read_at:new Date().toISOString()};return note;} export async function clearNoteNotifications(){}`,
  'src/lib/journalService.ts': `let reads=0;export const listPages=async()=>{reads++;if(window.__personalLoadError)throw new Error('Synthetic personal notes load failure');if(window.__personalLoading)return new Promise(()=>{});return (window.__personalNotesFixture??[]).map(note=>({...note,updated_at:window.__personalConflict&&reads>1?'2026-10-27T15:00:00Z':note.updated_at}))};export const createPage=async(input)=>{if(window.__personalSaveError)throw new Error('Your note could not be saved. This synthetic failure keeps your draft.');const note={...input,id:'local-personal-'+Date.now(),user_id:'local-student',type:'doc',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};window.__personalNotesFixture.push(note);return note};export const updateMyNotePage=async(id,title,body)=>{if(window.__personalSaveError)throw new Error('Your note could not be saved. This synthetic failure keeps your draft.');const note=window.__personalNotesFixture.find(n=>n.id===id);Object.assign(note,{title,body,updated_at:new Date().toISOString()});return note};`,

};
const fixturePlugin = {name:'my-work-local-fixtures',enforce:'pre',load(id){if(id.includes('fixture-original'))return;const local=id.replaceAll('\\','/').split('?')[0].slice(root.replaceAll('\\','/').length+1);if(replacements[local])return replacements[local];if(baseline&&baselinePaths.includes(local))return execFileSync('git',['show','eaf82e506bbeb3b5e86f1310f98bad3e818b926a:'+local],{cwd:root,encoding:'utf8'});}};
const port = productionFixture ? 8151 : baseline ? 8144 : process.argv.includes('--organization') ? 8150 : 8143;
const config = { root, configFile: false, plugins: [fixturePlugin, react()], resolve: { alias: { '@': resolve(root, 'src') }, dedupe: ['react', 'react-dom'] }, define: { __BUILD_SHA__: JSON.stringify('local-notes-verification'), __BUILD_TIME__: JSON.stringify('2026-10-27') } };
if (productionFixture) {
  const outDir = resolve(root, '.taste-skill/preview-dist');
  await build({ ...config, build: { outDir, emptyOutDir: false, minify: 'esbuild', rollupOptions: { input: resolve(root, 'scripts/verification/my-work-preview.html') } } });
  if (!buildOnly) await preview({ root, configFile: false, build: { outDir }, preview: { host: '127.0.0.1', port, strictPort: true } });
} else {
  const server = await createServer({ ...config, server: { host: '127.0.0.1', port, strictPort: true } });
  await server.listen();
}
console.log(`${productionFixture ? 'Built' : baseline ? 'Baseline' : 'Current'} My Work fixture: http://127.0.0.1:${port}/scripts/verification/my-work-preview.html`);
console.log('Scenarios: archive, archive-empty, archive-error, archive-loading, personal-list, personal-empty, personal-editor, personal-new, personal-save-error, personal-conflict, personal-storage-warning, personal-error, personal-loading, reader, reader-missing, reader-error. Append ?scenario=<name>.');
