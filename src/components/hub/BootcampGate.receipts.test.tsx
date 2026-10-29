import React from 'react';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({ack:vi.fn(),permissions:{is_admin:false,has_classroom_access:true,loading:false},assigned:true,items:{data:[] as any[],rawData:[] as any[],isLoading:false,isError:false}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'student-one'},authReady:true})}));
vi.mock('@/hooks/useUserPermissions',()=>({useUserPermissions:()=>mocks.permissions}));
vi.mock('@tanstack/react-query',()=>({useQuery:()=>({data:mocks.assigned,isLoading:false})}));
vi.mock('@/hooks/useClassroomItems',()=>({useClassroomItems:()=>mocks.items}));
vi.mock('@/hooks/useStudentWorkState',()=>({useLoadedStudentWorkAcknowledgment:mocks.ack}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
import BootcampGate from './BootcampGate';
const oldId='00000000-0000-4000-8000-000000000001';const newId='00000000-0000-4000-8000-000000000002';
const row=(id:string)=>({id,student_id:'student-one',type:'bootcamp_module',status:'assigned',visible_to_student:true,unlock_at:null,issuance:1,source_table:'bootcamps',source_id:'/bootcamp/conditionals',title:'Conditionals',description:null,content_html:null,content_markdown:null,created_at:id===oldId?'2026-10-27T12:00:00Z':'2026-10-28T12:00:00Z',metadata_json:{bootcamp_id:'conditionals',edition:1},workIdentity:{sourceTable:'classroom_items',sourceId:id,issuance:1}});
function Lesson(){const location=useLocation();return <><p>Loaded lesson</p><output>{location.search}</output></>;}
function mount(search=''){return render(<MemoryRouter initialEntries={[`/bootcamp/conditionals${search}`]}><BootcampGate routePath='/bootcamp/conditionals'><Lesson/></BootcampGate></MemoryRouter>);}
beforeEach(()=>{vi.clearAllMocks();mocks.permissions={is_admin:false,has_classroom_access:true,loading:false};mocks.assigned=true;mocks.items={data:[],rawData:[],isLoading:false,isError:false};});afterEach(cleanup);
describe('bootcamp receipts do not change assignment authorization',()=>{
 it('acknowledges an administrators actually owned assignment without requiring a student permission query',()=>{mocks.permissions={is_admin:true,has_classroom_access:false,loading:false};mocks.assigned=false;mocks.items.data=[row(newId)];mount();expect(screen.getByText('Loaded lesson')).toBeInTheDocument();expect(mocks.ack).toHaveBeenLastCalledWith(expect.objectContaining({sourceId:newId,studentId:'student-one',ready:true}));});
 it('does not acknowledge an administrator author preview without an owned assignment',()=>{mocks.permissions={is_admin:true,has_classroom_access:false,loading:false};mocks.assigned=false;mount();expect(screen.getByText('Loaded lesson')).toBeInTheDocument();expect(mocks.ack).toHaveBeenLastCalledWith(expect.objectContaining({ready:false}));});
 it('does not acknowledge another students assignment during administrator preview',()=>{mocks.permissions={is_admin:true,has_classroom_access:true,loading:false};mocks.items.data=[{...row(newId),student_id:'another-student'}];mount();expect(screen.getByText('Loaded lesson')).toBeInTheDocument();expect(mocks.ack).toHaveBeenLastCalledWith(expect.objectContaining({studentId:'another-student',ready:false}));});
 it.each(['pending','failed'])('keeps assigned content open when receipt projection is %s',state=>{mocks.items.isLoading=state==='pending';mocks.items.isError=state==='failed';mount();expect(screen.getByText('Loaded lesson')).toBeInTheDocument();expect(screen.queryByText('Not assigned yet')).toBeNull();expect(mocks.ack).toHaveBeenLastCalledWith(expect.objectContaining({ready:false}));});
 it('rewrites an older identical current alias to the deterministic presented identity',async()=>{mocks.items={data:[row(newId)],rawData:[row(oldId),row(newId)],isLoading:false,isError:false};mount(`?workSource=classroom_items&workId=${oldId}&workIssuance=1`);await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent(`workId=${newId}`));expect(screen.getByText('Loaded lesson')).toBeInTheDocument();expect(mocks.ack).toHaveBeenLastCalledWith(expect.objectContaining({sourceId:newId,ready:true}));});
 it('does not reinterpret another edition or an older issuance as equivalent',()=>{mocks.items={data:[{...row(newId),metadata_json:{bootcamp_id:'conditionals',edition:2}}],rawData:[row(oldId),row(newId)],isLoading:false,isError:false};mount(`?workSource=classroom_items&workId=${oldId}&workIssuance=1`);expect(screen.getByRole('status')).toHaveTextContent(`workId=${oldId}`);expect(mocks.ack).toHaveBeenLastCalledWith(expect.objectContaining({ready:false}));});
});
