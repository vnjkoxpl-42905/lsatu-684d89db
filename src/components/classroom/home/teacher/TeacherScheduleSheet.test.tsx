import * as React from 'react';
import { describe,it,expect,vi,afterEach } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup,act } from '@testing-library/react';
import { TeacherScheduleSheet } from './TeacherScheduleSheet';
import type { ManagedUser } from '@/lib/adminUsers';
vi.mock('@/components/booking/CalendlyBookingCard',()=>({default:({api,bookingFor,onConfirmationChange}:any)=><div><span>Card for {bookingFor.name}</span><button onClick={()=>onConfirmationChange(true)}>Choose time</button><button onClick={()=>onConfirmationChange(false)}>Cancel confirmation</button><button onClick={()=>api.book('2026-11-20T12:00:00Z','key')}>Book</button></div>}));
const ada={class_id:'a',display_name:'Ada',email:'ada@example.invalid',role:'student'} as ManagedUser;
const bea={...ada,class_id:'b',display_name:'Bea'};
const pass=(id:string)=>({id:'pass-'+id,student_id:id,status:'active',credits_remaining:2,total_credits:2,used_credits:0,session_length_minutes:70,expires_at:null,booking_url:'https://lsatprep.study/book/'+id});
function services(){return {readPending:vi.fn(()=>null),createApi:vi.fn(()=>({loadInfo:vi.fn(),loadSlots:vi.fn(),book:vi.fn()}))} as any;}
afterEach(cleanup);
describe('teacher scheduling target isolation',()=>{
 it('does not write on open, selection or close',async()=>{const svc=services(),load=vi.fn(async(id:string)=>pass(id)),close=vi.fn();render(<TeacherScheduleSheet open actorId="owner" students={[bea,ada,ada]} services={svc} load={load} onClose={close}/>);expect(load).not.toHaveBeenCalled();expect(screen.getAllByRole('option').map(x=>x.textContent)).toEqual(['Choose a student','Ada · ada@example.invalid','Bea · ada@example.invalid']);fireEvent.change(screen.getByLabelText('Student'),{target:{value:'a'}});await screen.findByText('Card for Ada');expect(svc.createApi).toHaveBeenCalledWith({actorId:'owner',studentId:'a',passId:'pass-a',slug:'a'},expect.any(Function));fireEvent.click(screen.getAllByRole('button',{name:'Close'})[0]);expect(close).toHaveBeenCalledOnce();expect(svc.createApi.mock.results[0].value.book).not.toHaveBeenCalled();});
 it('ignores an old student response after a newer selection',async()=>{let resolveA:any;const load=vi.fn((id:string)=>id==='a'?new Promise<any>(r=>resolveA=r):Promise.resolve(pass(id)));const svc=services();render(<TeacherScheduleSheet open actorId="owner" students={[ada,bea]} services={svc} load={load} onClose={vi.fn()}/>);fireEvent.change(screen.getByLabelText('Student'),{target:{value:'a'}});fireEvent.change(screen.getByLabelText('Student'),{target:{value:'b'}});await screen.findByText('Card for Bea');resolveA(pass('a'));await waitFor(()=>expect(svc.createApi).toHaveBeenCalledTimes(1));expect(screen.queryByText('Card for Ada')).toBeNull();});
 it('locks the student and dismissal during confirmation',async()=>{const close=vi.fn();render(<TeacherScheduleSheet open actorId="owner" students={[ada]} services={services()} load={async id=>pass(id)} onClose={close}/>);fireEvent.change(screen.getByLabelText('Student'),{target:{value:'a'}});await screen.findByText('Card for Ada');fireEvent.click(screen.getByText('Choose time'));expect(screen.getByLabelText('Student')).toBeDisabled();fireEvent.click(screen.getAllByRole('button',{name:'Close'})[0]);expect(close).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Cancel confirmation'));expect(screen.getByLabelText('Student')).toBeEnabled();});
 it('rejects a mismatched pass and shows no card',async()=>{render(<TeacherScheduleSheet open actorId="owner" students={[ada]} services={services()} load={async()=>pass('wrong')} onClose={vi.fn()}/>);fireEvent.change(screen.getByLabelText('Student'),{target:{value:'a'}});await screen.findByText('The booking pass does not match this student.');expect(screen.queryByText('Card for Ada')).toBeNull();});
 it('keeps changed-pass recovery read-only and requires a fresh check before discard',async()=>{
   const saved={actorId:'owner',studentId:'a',passId:'old-pass',slug:'old',startAt:'2026-11-20T12:00:00Z',idempotencyKey:'key',baselineIDs:[]};
   const api={checkPending:vi.fn(async()=>false),retryPending:vi.fn(),discardPending:vi.fn(async()=>{svc.readPending.mockReturnValue(null);})};
   const svc={readPending:vi.fn(()=>saved),createApi:vi.fn(()=>api)} as any;
   render(<TeacherScheduleSheet open actorId="owner" students={[ada]} services={svc} load={async()=>pass('a')} onClose={vi.fn()}/>);
   await screen.findByText('The saved request does not match the current booking pass. Keep it for review.');
   expect(screen.queryByText('Card for Ada')).toBeNull();expect(screen.getByText('Retry same booking')).toBeDisabled();
   expect(svc.createApi).toHaveBeenCalledWith(saved,expect.any(Function),true);
   fireEvent.click(screen.getByText('Check booking'));await screen.findByText('No new matching booking was verified.');
   fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByText('Discard pending request'));
   await waitFor(()=>expect(api.discardPending).toHaveBeenCalledWith(true));expect(api.retryPending).not.toHaveBeenCalled();
 });

 it("requires a new check when the recovery API changes after loading",async()=>{
 const saved={actorId:"owner",studentId:"a",passId:"pass-a",slug:"a",startAt:"2026-11-20T12:00:00Z",idempotencyKey:"key",baselineIDs:[]};
 let resolveLoad:any; const load=()=>new Promise<any>(r=>{resolveLoad=r;});
 const recoveryApi={checkPending:vi.fn(async()=>false),discardPending:vi.fn()};
 const currentApi={checkPending:vi.fn(async()=>false),discardPending:vi.fn()};
 const svc={readPending:()=>saved,createApi:vi.fn((_target:any,_change:any,readOnly:boolean)=>readOnly?recoveryApi:currentApi)} as any;
 render(<TeacherScheduleSheet open actorId="owner" students={[ada]} services={svc} load={load} onClose={vi.fn()}/>);
 fireEvent.click(await screen.findByText("Check booking")); await screen.findByText("Discard pending request");
 await act(async()=>{resolveLoad(pass("a"));});
 await waitFor(()=>expect(screen.queryByText("Discard pending request")).toBeNull());
 fireEvent.click(screen.getByText("Check booking")); await screen.findByText("Discard pending request");
 expect(currentApi.checkPending).toHaveBeenCalledOnce(); expect(recoveryApi.discardPending).not.toHaveBeenCalled();
 });

});
