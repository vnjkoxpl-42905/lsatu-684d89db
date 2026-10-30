-- Acceptance only. Every temporary grant and data write is rolled back.
-- IDs were matched live to configured admin/tester accounts on 2026-10-13.
-- Run only against Lovable Cloud atrcqxpmqrynmtvvyjju.
begin;
create temp table rc_security_results (name text, passed boolean);
grant select,insert on rc_security_results to authenticated,anon;
create or replace function pg_temp.rc_assert(p_name text,p_passed boolean)
returns void language plpgsql as $$ begin
  if p_passed is distinct from true then raise exception 'RC security failed: %',p_name; end if;
  insert into rc_security_results values(p_name,true);
end; $$;
create or replace function pg_temp.rc_blocked(p_sql text)
returns boolean language plpgsql as $$ declare n int; begin
  execute p_sql; get diagnostics n=row_count; return n=0;
exception when insufficient_privilege then return true;
end; $$;

set local role anon;
select pg_temp.rc_assert('anonymous passage API denied',pg_temp.rc_blocked('select * from public.reading_center_passages'));
select pg_temp.rc_assert('anonymous access RPC denied',pg_temp.rc_blocked('select public.has_reading_center_access()'));
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','d763bfe6-d710-4c4b-90ff-4b3a20929211',true);
select set_config('request.jwt.claims','{"sub":"d763bfe6-d710-4c4b-90ff-4b3a20929211","role":"authenticated"}',true);
select pg_temp.rc_assert('tester claim applied',auth.uid()='d763bfe6-d710-4c4b-90ff-4b3a20929211'::uuid);
select pg_temp.rc_assert('unassigned access false',not public.has_reading_center_access());
select pg_temp.rc_assert('unassigned passages empty',(select count(*)=0 from public.reading_center_passages));
select pg_temp.rc_assert('unassigned preference write denied',pg_temp.rc_blocked($q$insert into public.reading_center_preferences(user_id) values(auth.uid()) on conflict(user_id) do update set wpm=300$q$));
select pg_temp.rc_assert('student grant RPC denied',pg_temp.rc_blocked($q$select public.assign_reading_center(auth.uid())$q$));
reset role;

-- Teacher grants are atomic and duplicate calls must reuse the same launcher.
set local role authenticated;
select set_config('request.jwt.claim.sub','5ff160ef-016e-4ab5-aab1-55c7a2ad888f',true);
select set_config('request.jwt.claims','{"sub":"5ff160ef-016e-4ab5-aab1-55c7a2ad888f","role":"authenticated"}',true);
select pg_temp.rc_assert('admin access without grant',public.has_reading_center_access());
do $$ declare a jsonb; b jsonb; begin
  a:=public.assign_reading_center('d763bfe6-d710-4c4b-90ff-4b3a20929211');
  b:=public.assign_reading_center('d763bfe6-d710-4c4b-90ff-4b3a20929211');
  perform pg_temp.rc_assert('duplicate assignment same item and reused flag',
    a#>>'{item,id}'=b#>>'{item,id}' and (a->>'reused')::boolean=false and (b->>'reused')::boolean=true);
  perform pg_temp.rc_assert('exactly one student launcher',(
    select count(*)=1 from public.classroom_items where student_id='d763bfe6-d710-4c4b-90ff-4b3a20929211'
      and source_table='reading_center' and source_id='library' and visible_to_student));
end; $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','d763bfe6-d710-4c4b-90ff-4b3a20929211',true);
select set_config('request.jwt.claims','{"sub":"d763bfe6-d710-4c4b-90ff-4b3a20929211","role":"authenticated"}',true);
select pg_temp.rc_assert('assigned access true',public.has_reading_center_access());
select pg_temp.rc_assert('assigned sees published seed',(select count(*)>0 from public.reading_center_passages where slug='living-in-a-rational-society'));
insert into public.reading_center_preferences(user_id,wpm) values(auth.uid(),321) on conflict(user_id) do update set wpm=321;
select pg_temp.rc_assert('own preference write persisted for reload',(select wpm=321 from public.reading_center_preferences where user_id=auth.uid()));
select pg_temp.rc_assert('foreign preference write denied',pg_temp.rc_blocked($q$insert into public.reading_center_preferences(user_id,wpm) values('8a534390-b553-4ec2-95dd-1fe610945d3c',321) on conflict(user_id) do update set wpm=321$q$));
insert into public.reading_center_passages(owner_id,slug,title,body,word_count)
values(auth.uid(),'rc-security-private-20261013','Private security fixture','Private text',2);
select pg_temp.rc_assert('own imported passage readable',(select count(*)=1 from public.reading_center_passages where slug='rc-security-private-20261013'));
select pg_temp.rc_assert('student cannot mutate grant source',pg_temp.rc_blocked($q$update public.classroom_items set source_id='forged' where student_id=auth.uid() and source_table='reading_center'$q$));
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','8a534390-b553-4ec2-95dd-1fe610945d3c',true);
select set_config('request.jwt.claims','{"sub":"8a534390-b553-4ec2-95dd-1fe610945d3c","role":"authenticated"}',true);
select pg_temp.rc_assert('wrong student has no tool access',not public.has_reading_center_access());
select pg_temp.rc_assert('wrong student cannot see launcher',(select count(*)=0 from public.classroom_items where source_table='reading_center'));
select pg_temp.rc_assert('wrong student cannot read private passage',(select count(*)=0 from public.reading_center_passages where slug='rc-security-private-20261013'));
reset role;

-- Give the second student an entitlement too; private ownership still applies.
set local role authenticated;
select set_config('request.jwt.claim.sub','5ff160ef-016e-4ab5-aab1-55c7a2ad888f',true);
select set_config('request.jwt.claims','{"sub":"5ff160ef-016e-4ab5-aab1-55c7a2ad888f","role":"authenticated"}',true);
select public.assign_reading_center('8a534390-b553-4ec2-95dd-1fe610945d3c');
select public.revoke_reading_center('d763bfe6-d710-4c4b-90ff-4b3a20929211');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','8a534390-b553-4ec2-95dd-1fe610945d3c',true);
select set_config('request.jwt.claims','{"sub":"8a534390-b553-4ec2-95dd-1fe610945d3c","role":"authenticated"}',true);
select pg_temp.rc_assert('other assigned student still cannot read private passage',public.has_reading_center_access() and
  (select count(*)=0 from public.reading_center_passages where slug='rc-security-private-20261013'));
select pg_temp.rc_assert('other assigned student cannot read foreign preferences',(select count(*)=0 from public.reading_center_preferences where user_id='d763bfe6-d710-4c4b-90ff-4b3a20929211'));
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','d763bfe6-d710-4c4b-90ff-4b3a20929211',true);
select set_config('request.jwt.claims','{"sub":"d763bfe6-d710-4c4b-90ff-4b3a20929211","role":"authenticated"}',true);
select pg_temp.rc_assert('revoked access false',not public.has_reading_center_access());
select pg_temp.rc_assert('revoked preference write denied',pg_temp.rc_blocked('update public.reading_center_preferences set wpm=333 where user_id=auth.uid()'));
select pg_temp.rc_assert('revoked cannot restore archived grant',pg_temp.rc_blocked($q$update public.classroom_items set status='assigned',visible_to_student=true where student_id=auth.uid() and source_table='reading_center'$q$));
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','5ff160ef-016e-4ab5-aab1-55c7a2ad888f',true);
select set_config('request.jwt.claims','{"sub":"5ff160ef-016e-4ab5-aab1-55c7a2ad888f","role":"authenticated"}',true);
select public.assign_reading_center('d763bfe6-d710-4c4b-90ff-4b3a20929211',now()+interval '1 day');
insert into public.classroom_items(student_id,created_by,type,title,source_table,source_id,status,visible_to_student)
values('d763bfe6-d710-4c4b-90ff-4b3a20929211',auth.uid(),'note','Security fixture','rc_security_probe','metadata','assigned',true);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','d763bfe6-d710-4c4b-90ff-4b3a20929211',true);
select set_config('request.jwt.claims','{"sub":"d763bfe6-d710-4c4b-90ff-4b3a20929211","role":"authenticated"}',true);
select pg_temp.rc_assert('scheduled access false before unlock',not public.has_reading_center_access());
select pg_temp.rc_assert('scheduled passages empty',(select count(*)=0 from public.reading_center_passages));
select pg_temp.rc_assert('student cannot change scheduled unlock',pg_temp.rc_blocked('update public.classroom_items set unlock_at=null where student_id=auth.uid() and source_table=''reading_center'''));
update public.classroom_items set metadata_json='{"assigned_route":"/reading-center","kind":"reading_center","source_table":"reading_center","source_id":"library"}'::jsonb
where student_id=auth.uid() and source_table='rc_security_probe';
select pg_temp.rc_assert('editable metadata cannot create entitlement',not public.has_reading_center_access());
select pg_temp.rc_assert('ordinary item cannot forge immutable grant fields',pg_temp.rc_blocked($q$update public.classroom_items set type='activity',source_table='reading_center',source_id='library' where student_id=auth.uid() and source_table='rc_security_probe'$q$));
reset role;

-- Any failed assertion raises before this point. Receipt count is 30.
select pg_temp.rc_assert('all expected assertions executed',(select count(*)=29 from rc_security_results));
rollback;
select '30 live SQL assertions passed; all test writes rolled back' as result,
  (select count(*) from public.classroom_items where source_table='reading_center') as remaining_assignments,
  (select count(*) from public.reading_center_passages where slug='rc-security-private-20261013') as remaining_private_fixtures;
