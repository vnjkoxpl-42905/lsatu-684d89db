import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_FLAG_KEYS, tierFlags, type ManagedUser } from './adminUsers';
const { invoke, getUser } = vi.hoisted(() => ({ invoke: vi.fn(), getUser: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke }, auth: { getUser } } }));
import { addHomeBookingCredits, clearPendingHomeTopUps, getPendingHomeTopUp, prepareHomeTopUp, safeHomeBookingUrl, saveHomeAccess, loadHomeBooking, createHomeBooking, revokeHomeBooking, resolvePendingHomeTopUp, discardUnreadableHomeTopUp, reactivateHomeBooking } from './teacherHomeActions';
const actor='11111111-1111-4111-8111-111111111111', student='22222222-2222-4222-8222-222222222222', passId='33333333-3333-4333-8333-333333333333';
const person = { class_id:student, role:'student', archived_at:null, access_tier:null, ...Object.fromEntries(ALL_FLAG_KEYS.map(k=>[k,false])) } as ManagedUser;
const pass={id:passId,student_id:student,total_credits:7,used_credits:0,credits_remaining:7,status:'active',booking_url:'https://lsatprep.study/book/sample-abc',session_length_minutes:70,expires_at:null};
beforeEach(()=>{ vi.clearAllMocks(); sessionStorage.clear(); getUser.mockResolvedValue({data:{user:{id:actor}}}); });
describe('Home access has no compatibility write fallback',()=>{
 it('requires exact complete verified row and one call',async()=>{
  invoke.mockResolvedValue({data:{profile:{...person,access_tier:'tier_3',...tierFlags('tier_3')}},error:null});
  await expect(saveHomeAccess(person,'tier_3')).resolves.toMatchObject({access_tier:'tier_3'});
  expect(invoke).toHaveBeenCalledTimes(1); expect(invoke.mock.calls[0][1].body.action).toBe('set_home_tier');
 });
 it.each([{error:new Error('Unknown action'),data:null},{error:null,data:{}},{error:null,data:{profile:{class_id:student,access_tier:'tier_1'}}},{error:null,data:{profile:{...person,class_id:actor,access_tier:'tier_1',...tierFlags('tier_1')}}}])('rejects old, partial and wrong target responses',async response=>{
  invoke.mockResolvedValue(response); await expect(saveHomeAccess(person,'tier_1')).rejects.toThrow(); expect(invoke).toHaveBeenCalledTimes(1);
 });
 it('blocks archived and admin before mutation',async()=>{
  await expect(saveHomeAccess({...person,archived_at:'2026-10-01'},'tier_1')).rejects.toThrow();
  await expect(saveHomeAccess({...person,role:'admin'},'tier_1')).rejects.toThrow(); expect(invoke).not.toHaveBeenCalled();
 });
 it('sends all existing flags and preserves unedited custom draft',async()=>{
  const draft={has_drill_access:false,has_practice_access:true,has_classroom_access:false,has_chat_access:true,has_schedule_access:false};
  invoke.mockResolvedValue({data:{profile:{...person,access_tier:'tier_2',...draft,has_journal_access:true,has_flagged_access:true,has_analytics_access:true}},error:null});
  await saveHomeAccess(person,'tier_2',draft);
  expect(invoke.mock.calls[0][1].body.flags).toEqual(draft); expect(Object.keys(invoke.mock.calls[0][1].body.expected_flags)).toHaveLength(13);
 });
});
describe('Home booking operation identity',()=>{
 it('reload/retry reuses saved UUID and refuses changed amount or target',()=>{
  const p=prepareHomeTopUp(actor,student,passId,5); expect(getPendingHomeTopUp(actor)).toEqual(p); expect(prepareHomeTopUp(actor,student,passId,5)).toEqual(p);
  expect(()=>prepareHomeTopUp(actor,student,passId,4)).toThrow(); expect(()=>prepareHomeTopUp(actor,actor,passId,5)).toThrow();
 });
 it('retains unknown outcome, then validates receipt and current balance before clearing',async()=>{
  const p=prepareHomeTopUp(actor,student,passId,5); invoke.mockResolvedValueOnce({error:new Error('timeout'),data:null});
  await expect(addHomeBookingCredits(p)).rejects.toThrow(); expect(getPendingHomeTopUp(actor)).toEqual(p);
  invoke.mockResolvedValueOnce({data:{receipt:{operation_key:p.operationKey,owner_id:actor,student_id:student,pass_id:passId,delta:5,total_credits:7,used_credits:0},pass:{...pass,total_credits:12,credits_remaining:12}},error:null});
  expect((await addHomeBookingCredits(p)).pass.credits_remaining).toBe(12); expect(getPendingHomeTopUp(actor)).toBeNull();
 });
 it('rejects changed receipt and changed actor with pending identity intact',async()=>{
  const p=prepareHomeTopUp(actor,student,passId,5); invoke.mockResolvedValue({data:{receipt:{operation_key:p.operationKey,owner_id:actor,student_id:student,pass_id:passId,delta:4},pass},error:null});
  await expect(addHomeBookingCredits(p)).rejects.toThrow(); expect(getPendingHomeTopUp(actor)).toEqual(p);
  getUser.mockResolvedValue({data:{user:{id:student}}}); await expect(addHomeBookingCredits(p)).rejects.toThrow('Account changed');
 });
 it('clears actor-scoped pending operations on signout',()=>{ prepareHomeTopUp(actor,student,passId,5);clearPendingHomeTopUps();expect(getPendingHomeTopUp(actor)).toBeNull(); });
 it.each(['https://evil.example/book/a','javascript:alert(1)','https://lsatprep.study/book/a?x=1','https://lsatprep.study/book/a#x','https://lsatprep.study/teacher'])('rejects unsafe booking URL %s',url=>{expect(()=>safeHomeBookingUrl(url)).toThrow();});
});

describe('Home booking status and explicit creation/revoke',()=>{
 it('rejects unknown or incomplete server status rather than showing no pass',async()=>{invoke.mockResolvedValue({data:{},error:null});await expect(loadHomeBooking(student)).rejects.toThrow('unavailable');});
 it('validates create terms and verifies named returned pass',async()=>{
  await expect(createHomeBooking(student,5,{sessionMinutes:1,expiresAt:null})).rejects.toThrow();expect(invoke).not.toHaveBeenCalled();
  invoke.mockResolvedValue({data:{pass,created:true},error:null});await expect(createHomeBooking(student,5,{sessionMinutes:80,expiresAt:null})).resolves.toEqual(pass);
  expect(invoke.mock.calls[0][1].body).toMatchObject({action:'home_create',student_id:student,credits:5,session_minutes:80,expires_at:null});
 });
 it('requires confirmed revoke and verifies final status',async()=>{
  await expect(revokeHomeBooking(student,passId,false)).rejects.toThrow('Confirm');expect(invoke).not.toHaveBeenCalled();
  invoke.mockResolvedValue({data:{pass},error:null});await expect(revokeHomeBooking(student,passId,true)).rejects.toThrow('Revocation');
  invoke.mockResolvedValue({data:{pass:{...pass,status:'revoked'}},error:null});await expect(revokeHomeBooking(student,passId,true)).resolves.toMatchObject({status:'revoked'});
 });
});

describe('Reviewed booking edge cases',()=>{
 it('does not report an existing pass as newly granted',async()=>{invoke.mockResolvedValue({data:{pass,created:false},error:null});await expect(createHomeBooking(student,5)).rejects.toThrow('pass_exists');});
 it('resolves unknown outcomes without another add even when pass is revoked',async()=>{
  const p=prepareHomeTopUp(actor,student,passId,5);
  invoke.mockResolvedValue({data:{receipt:null,not_applied:true,operation_key:p.operationKey,owner_id:actor,student_id:student,pass_id:passId,delta:5,pass:{...pass,status:'revoked'}},error:null});
  expect((await resolvePendingHomeTopUp(p)).receipt).toBeNull();expect(getPendingHomeTopUp(actor)).toBeNull();expect(invoke.mock.calls[0][1].body.action).toBe('home_resolve_add');
 });
 it('keeps the retry identity on an unverified resolution',async()=>{
  const p=prepareHomeTopUp(actor,student,passId,5);invoke.mockResolvedValue({data:{receipt:null,not_applied:true,operation_key:p.operationKey,owner_id:actor,student_id:student,pass_id:passId,delta:4,pass},error:null});
  await expect(resolvePendingHomeTopUp(p)).rejects.toThrow();expect(getPendingHomeTopUp(actor)).toEqual(p);
 });
 it('malformed pending data fails visibly without silently forgetting an unknown outcome',()=>{
  sessionStorage.setItem('teacher-home-topup:'+actor,'{broken');expect(()=>getPendingHomeTopUp(actor)).toThrow('unreadable');expect(sessionStorage.getItem('teacher-home-topup:'+actor)).toBe('{broken');
 });
});

it('requires explicit fresh-read recovery and retains unreadable source for inspection',async()=>{
 const key='teacher-home-topup:'+actor;sessionStorage.setItem(key,'{broken');
 await expect(discardUnreadableHomeTopUp(actor,student,false)).rejects.toThrow('Review');expect(invoke).not.toHaveBeenCalled();
 invoke.mockResolvedValue({data:{pass},error:null});await expect(discardUnreadableHomeTopUp(actor,student,true)).resolves.toEqual(pass);
 expect(invoke.mock.calls[0][1].body.action).toBe('home_get');expect(sessionStorage.getItem(key)).toBeNull();expect(sessionStorage.getItem('teacher-home-topup:quarantine:'+actor)).toBe('{broken');
});

describe('Expired link recovery',()=>{
 it('requires explicit reactivation and verifies preserved named link and usable status',async()=>{
  await expect(reactivateHomeBooking(student,passId,false)).rejects.toThrow('Confirm');expect(invoke).not.toHaveBeenCalled();
  invoke.mockResolvedValue({data:{pass},error:null});await expect(reactivateHomeBooking(student,passId,true)).resolves.toMatchObject({id:passId,total_credits:7,status:'active',expires_at:null});
  expect(invoke.mock.calls[0][1].body).toMatchObject({action:'home_reactivate',student_id:student,pass_id:passId,confirmed:true});
 });
 it('rejects still-expired response',async()=>{invoke.mockResolvedValue({data:{pass:{...pass,status:'expired',expires_at:'2020-01-01'}},error:null});await expect(reactivateHomeBooking(student,passId,true)).rejects.toThrow('not verified');});
});
