import { describe, expect, it, vi } from 'vitest';
import { readAllRosterPages, readAllAuthUsers, rosterRoleMap } from '../../supabase/functions/_shared/adminRoster';
import { readFileSync } from 'node:fs';
describe('complete admin roster reads', () => {
  it('reads beyond a short server-capped page without skipping identities', async () => {
    const all = ['a','b','c','d','e'].map(class_id => ({class_id}));
    const offsets:number[]=[];
    const rows = await readAllRosterPages(async(offset,size)=>{offsets.push(offset);return {data:all.slice(offset,offset+Math.min(size,2))};},r=>r.class_id);
    expect(rows).toEqual(all); expect(offsets).toEqual([0,2,4,5]);
  });
  it('fails instead of returning an apparently complete partial roster', async () => {
    const read=vi.fn().mockResolvedValueOnce({data:[{id:'a'}]}).mockResolvedValueOnce({data:null,error:new Error('read failed')});
    await expect(readAllRosterPages(read,(r:{id:string})=>r.id)).rejects.toThrow('completely');
    await expect(readAllRosterPages(async()=>({data:null}),()=> 'x')).rejects.toThrow('unavailable');
  });
  it('paginates authentication users to the actual empty page', async () => {
    const all=['a','b','c','d','e'].map(id=>({id,email:id+'@example.invalid'}));const pages:number[]=[];
    const users=await readAllAuthUsers(async(page,size)=>{pages.push(page);return {data:{users:all.slice((page-1)*size,page*size)}};},2);
    expect(users).toEqual(all);expect(pages).toEqual([1,2,3,4]);
  });
  it('rejects auth page errors and repeated pages rather than truncating or looping', async()=>{
    await expect(readAllAuthUsers(async()=>({data:null,error:Error('auth')}))).rejects.toThrow('completely');
    await expect(readAllAuthUsers(async()=>({data:{users:[{id:'same'}]}}))).rejects.toThrow('did not advance');
    await expect(readAllRosterPages(async()=>({data:[{id:'same'}]}),r=>r.id)).rejects.toThrow('did not advance');
  });
  it('does not hide an admin when another role follows it',()=>{
    expect(rosterRoleMap([{user_id:'a',role:'admin'},{user_id:'a',role:'teacher'}]).get('a')).toBe('admin');
    expect(rosterRoleMap([{user_id:'a',role:'user'},{user_id:'a',role:'admin'}]).get('a')).toBe('admin');
  });
  it('keeps both authenticated GET response branches on complete loaders',()=>{
    const source=readFileSync('supabase/functions/admin-manage-users/index.ts','utf8');
    const get=source.slice(source.indexOf('if (req.method === "GET")'),source.indexOf('if (req.method === "POST")'));
    expect(get.match(/await loadCompleteRoster/g)).toHaveLength(2);
    expect(get).not.toContain('listUsers({ perPage: 1000 })');
    expect(source.indexOf('await verifyAdmin(req)')).toBeLessThan(source.indexOf('if (req.method === "GET")'));
    expect(get).toContain('return jsonRes(result)'); expect(get).toContain('total_users:');
  });
});
