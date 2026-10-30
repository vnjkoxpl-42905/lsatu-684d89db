create function public.assert_true(value boolean,label text) returns void language plpgsql as $$begin if value is distinct from true then raise exception 'ASSERTION: %',label;end if;end$$;
create function public.expect_failure(command text,label text) returns void language plpgsql as $$begin begin execute command; exception when others then return;end;raise exception 'Expected failure: %',label;end$$;
select public.assert_true((select count(*)=5 from student_work_receipts),'evidence-only receipt backfill');
select public.assert_true(exists(select 1 from student_work_receipts where source_id='33000000-0000-0000-0000-000000000001' and read_at='2026-10-05 12:00Z'),'announcement read evidence preserved');
select public.assert_true(exists(select 1 from student_work_receipts where source_id='30000000-0000-0000-0000-000000000004' and read_at='2026-10-03 12:00Z'),'saved native started_at proves opened');
select public.assert_true(exists(select 1 from student_work_receipts where source_id='30000000-0000-0000-0000-000000000005' and read_at='2026-10-04 12:00Z'),'saved native completed_at proves opened');
select public.assert_true(not exists(select 1 from student_work_receipts where source_id='30000000-0000-0000-0000-000000000006'),'status alone never manufactures opened date');
select public.assert_true((select count(*)=0 from assignment_delivery_events),'no historical events');
select public.assert_true((select count(*)=14 from notifications),'no historical notifications');
select public.assert_true((select count(*)=11 from assignment_notification_legacy_links),'exact deployed legacy routes mapped without guessing retired/generic/inbox');
select public.assert_true((select count(*)=9 and bool_and(not n.read) from assignment_notification_legacy_links l join notifications n on n.id=l.notification_id where n.title like 'Legacy native %' or n.title like 'Legacy alias %'),'mapping alone leaves actual legacy alerts unread');
select public.assert_true((public.student_work_state('guided_drill_assignments','34000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001')->>'link')='/guided/34000000-0000-0000-0000-000000000001','source-only guided route is deployed route');
select public.assert_true((public.student_work_state('activity_assignments','34000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001')->>'link')='/activities/34000000-0000-0000-0000-000000000002','source-only activity route is deployed route');
select public.assert_true((public.student_work_state('classroom_items','35000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000001')->>'link')='/bootcamp/intro-to-lr','bootcamp source_id fallback is exact internal route');
select public.assert_true(exists(select 1 from assignment_notification_legacy_links l join notifications n on n.id=l.notification_id where n.title='Module A alert' and l.source_id='32000000-0000-0000-0000-000000000001'),'bootcamp target query selects exact module');
select public.assert_true(not exists(select 1 from pg_indexes where indexname='notifications_unique_unread_assignment'),'old unread uniqueness removed');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
-- Activation off accepts old cached teacher writes, but no auto delivery.
insert into classroom_items(id,student_id,type,title) values('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','note','Old client');
insert into classroom_items(id,student_id,type,title,notification_policy) values('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','note','Rollout work','auto');
select public.assert_true(public.release_assignment_notifications()=0,'off delivery stays off');
select public.assert_true((select count(*)=1 from assignment_delivery_events),'off event is retained');
select public.activate_assignment_delivery(repeat('a',40));
select public.assert_true((select count(*)=15 from notifications),'activation releases rollout event once');
select public.expect_failure($c$insert into classroom_items(student_id,type,title) values('20000000-0000-0000-0000-000000000001','note','Stale')$c$,'active old client gate');
select public.expect_failure($c$insert into homework_assignments(student_id) values('20000000-0000-0000-0000-000000000001')$c$,'active native source gate');
-- Explicit supported writer payloads, recap/announcement suppression.
insert into classroom_items(student_id,type,title,notification_policy,notification_group_id)
select '20000000-0000-0000-0000-000000000001',type,'writer '||type,'managed',gen_random_uuid()
from unnest(array['note','homework','drill','activity','bootcamp_module','practice_test','link','weekly_plan_task']) type;
insert into classroom_items(student_id,type,title) select '20000000-0000-0000-0000-000000000001',type,'Quiet '||type from unnest(array['session_recap','smartboard_recap','announcement']) type;
select public.assert_true((select bool_and(notification_policy='suppressed') from classroom_items where title like 'Quiet %'),'recaps suppressed through stale helper too');
-- Exact deployed edge style: PT source upsert then legacy alias mirror upsert.
select set_config('request.jwt.claim.sub','',false);
set role service_role;
insert into practice_test_assignments(id,student_id,pt) values('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',141)
on conflict(student_id,pt) do update set status='assigned';
insert into classroom_items(id,student_id,type,title,source_table,source_id) values('50000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','practice_test','PT 141','practice_test_assignments','practice_test:141');
select public.assert_true((select count(*)=1 from assignment_delivery_events where source_id='50000000-0000-0000-0000-000000000001'),'source plus PT alias one event');
insert into practice_test_assignments(student_id,pt) values('20000000-0000-0000-0000-000000000001',141) on conflict(student_id,pt) do update set status='assigned';
update classroom_items set title='PT 141' where id='50000000-0000-0000-0000-000000000002';
select public.assert_true((select issuance=1 from practice_test_assignments where pt=141),'PT replay no generation change');
update practice_test_assignments set status='archived' where pt=141;
insert into practice_test_assignments(student_id,pt) values('20000000-0000-0000-0000-000000000001',141) on conflict(student_id,pt) do update set status='assigned';
update classroom_items set status='assigned' where id='50000000-0000-0000-0000-000000000002';
select public.assert_true((select issuance=2 from practice_test_assignments where pt=141),'PT archived reactivation increments');
select public.assert_true((select issuance=2 from classroom_items where id='50000000-0000-0000-0000-000000000002'),'PT mirror inherits current issuance');
update practice_test_assignments set unlock_at=now()+interval '2 days' where pt=141;
insert into practice_test_assignments(student_id,pt,unlock_at) values('20000000-0000-0000-0000-000000000001',141,null)
 on conflict(student_id,pt) do update set status='assigned',unlock_at=excluded.unlock_at;
update classroom_items set unlock_at=null where id='50000000-0000-0000-0000-000000000002';
select public.assert_true((select unlock_at>now()+interval '1 day' from practice_test_assignments where pt=141),'omitted edge unlock retry preserves future schedule');
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
-- Current schedule wins over original event time.
update practice_test_assignments set unlock_at=now()+interval '1 day' where pt=141;
select public.release_assignment_notifications(500);
select public.assert_true(not exists(select 1 from assignment_delivery_events where source_id='50000000-0000-0000-0000-000000000001' and issuance=2 and delivered_at is not null),'later reschedule defers');
update practice_test_assignments set unlock_at=now()-interval '1 minute' where pt=141;
select public.release_assignment_notifications(500);
select public.assert_true(exists(select 1 from assignment_delivery_events where source_id='50000000-0000-0000-0000-000000000001' and issuance=2 and delivered_at is not null),'earlier schedule releases');
-- Lifetime event identity survives dismissal, reading and notification deletion.
delete from notifications where assignment_event_id in(select id from assignment_delivery_events where source_id='50000000-0000-0000-0000-000000000001');
select public.assert_true(public.release_assignment_notifications(500)=0,'deleted alerts never redeliver');
-- A hidden newer native mirror blocks an older visible source/mirror.
insert into classroom_items(student_id,type,title,source_table,source_id,visible_to_student,created_at) values('20000000-0000-0000-0000-000000000001','practice_test','Hidden PT','practice_test_assignments','50000000-0000-0000-0000-000000000001',false,now()+interval '1 second');
select public.assert_true(not (public.student_work_state('practice_test_assignments','50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001')->>'available')::boolean,'latest hidden mirror blocks source');
-- Three immediate items: one alert, item receipts independent from collection.
insert into classroom_items(id,student_id,type,title,notification_policy,notification_group_id)
select ('60000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'20000000-0000-0000-0000-000000000001',case when n=3 then 'homework' else 'note' end,'Bundle '||n,'managed','60000000-0000-0000-0000-999999999999' from generate_series(1,3)n;
select public.finalize_assignment_notification_group('60000000-0000-0000-0000-999999999999','Bundle',null,'/my-work/to-do');
select public.assert_true((select count(*)=1 from notifications where assignment_group_id='60000000-0000-0000-0000-999999999999'),'three item bundle one alert');
select public.assert_true((select assignment_event_id is null and link='/my-work/to-do?workGroup=60000000-0000-0000-0000-999999999999' from notifications where assignment_group_id='60000000-0000-0000-0000-999999999999'),'multi-member group retains collection route');
select public.expect_failure($c$insert into classroom_items(student_id,type,title,notification_policy,notification_group_id) values('20000000-0000-0000-0000-000000000002','note','Wrong group','managed','60000000-0000-0000-0000-999999999999')$c$,'group owner immutable');
-- Managed recovery minimum ten minutes and rollback deletion cancels pending.
insert into classroom_items(id,student_id,type,title,notification_policy,notification_group_id) values('61000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','note','Recovery','managed','61000000-0000-0000-0000-999999999999'),('61000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','note','Rolled back','managed','61000000-0000-0000-0000-999999999998');
select public.release_assignment_notifications(500);
select public.assert_true(not exists(select 1 from assignment_delivery_events where source_id='61000000-0000-0000-0000-000000000001' and delivered_at is not null),'fresh managed pending');
delete from classroom_items where id='61000000-0000-0000-0000-000000000002';
update assignment_delivery_events set created_at=now()-interval '11 minutes' where group_id in('61000000-0000-0000-0000-999999999999','61000000-0000-0000-0000-999999999998');
select public.release_assignment_notifications(500);
select public.assert_true(exists(select 1 from assignment_delivery_events where source_id='61000000-0000-0000-0000-000000000001' and delivered_at is not null),'aged managed recovers');
select public.assert_true((select assignment_event_id is not null and link='/classroom/item/61000000-0000-0000-0000-000000000001' from notifications where assignment_group_id='61000000-0000-0000-0000-999999999999'),'single member group routes directly with canonical event');
select public.assert_true(exists(select 1 from assignment_delivery_events where source_id='61000000-0000-0000-0000-000000000002' and cancelled_at is not null and delivered_at is null),'failed attempt deletion cancels');
-- Seven-day weekly plan: one generic publication, no task-specific pings.
insert into classroom_items(student_id,type,title,unlock_at,notification_policy,notification_group_id)
select '20000000-0000-0000-0000-000000000001','weekly_plan_task','SECRET future task '||n,now()+n*interval '1 day','suppressed','70000000-0000-0000-0000-999999999999' from generate_series(1,7)n;
select public.publish_assignment_plan_notification('70000000-0000-0000-0000-999999999999','20000000-0000-0000-0000-000000000001');
select public.publish_assignment_plan_notification('70000000-0000-0000-0000-999999999999','20000000-0000-0000-0000-000000000001');
select public.assert_true((select count(*)=1 and bool_and(body not like '%SECRET%') from notifications where assignment_group_id='70000000-0000-0000-0000-999999999999'),'weekly one generic durable summary');
select public.assert_true(public.claim_assignment_notification_channels('70000000-0000-0000-0000-999999999999'),'delivered generic plan can claim optional channels');
select public.assert_true(not public.claim_assignment_notification_channels('70000000-0000-0000-0000-999999999999'),'plan optional channels can only be claimed once');
-- Seven curriculum day bundles: no immediate future notifications; each day
-- unlock becomes its own single cohort when its current date is advanced.
do $$declare n integer;g uuid;begin for n in 1..7 loop
g:=('71000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid;
insert into classroom_items(student_id,type,title,unlock_at,notification_policy,notification_group_id) values('20000000-0000-0000-0000-000000000001','note','Day '||n,now()+n*interval '1 day','managed',g);
perform public.finalize_assignment_notification_group(g,'Day work',null,'/my-work/to-do');
end loop;end$$;
select public.assert_true(not exists(select 1 from notifications where assignment_group_id::text like '71000000%'),'seven future bundles silent');
update classroom_items set unlock_at=now()-interval '1 minute' where notification_group_id::text like '71000000%';
select public.release_assignment_notifications(500);
select public.assert_true((select count(*)=7 from notifications where assignment_group_id::text like '71000000%'),'seven independent day calls');
-- ReadingCenter old/new writer gate and scheduled delivery.
select public.expect_failure($c$select public.assign_reading_center('20000000-0000-0000-0000-000000000002')$c$,'old reading center writer gated');
select public.assign_reading_center('20000000-0000-0000-0000-000000000002',now()+interval '1 day','Reading Center','Read','managed','72000000-0000-0000-0000-999999999999');
select public.finalize_assignment_notification_group('72000000-0000-0000-0000-999999999999');
select public.assert_true(not exists(select 1 from notifications where assignment_group_id='72000000-0000-0000-0000-999999999999'),'reading center deferred');
insert into guided_drill_assignments(id,student_id,notification_policy) values('72500000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','auto');
insert into activity_assignments(id,student_id,notification_policy,unlock_at) values('72500000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','auto',now()+interval '1 day');
select public.release_assignment_notifications(500);
select public.assert_true((public.student_work_state('guided_drill_assignments','72500000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001')->>'available')::boolean,'source-only guided available');
select public.assert_true(not (public.student_work_state('activity_assignments','72500000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001')->>'available')::boolean,'source-only scheduled activity blocked');
-- The three SQL MCP definitions are the saved live bodies, now sharing the
-- durable delivery group path while preserving their real message channel.
insert into homework_sets(id,title,description,question_qids,class_id) values('73000000-0000-0000-0000-000000000001','MCP homework','Directions',array['q1'],'20000000-0000-0000-0000-000000000001');
select public.mcp_assign_homework_set('73000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','sql-mcp-homework-1',true);
select public.mcp_assign_homework_set('73000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','sql-mcp-homework-1',true);
select public.mcp_assign_passage_map_homework('20000000-0000-0000-0000-000000000001','MCP passage','<p>Passage</p>','{"version":"1","sections":[]}', '<p>Key</p>','sql-mcp-passage-1',false);
select public.mcp_post_classroom_note('20000000-0000-0000-0000-000000000001','MCP note','<p>Note</p>','sql-mcp-note-1',null,true);
select public.mcp_post_classroom_note('20000000-0000-0000-0000-000000000001','MCP note','<p>Note</p>','sql-mcp-note-1',null,true);
select public.assert_true((select count(*)=2 from messages),'MCP retry/p_notify preserve one message per notified write');
select public.assert_true(not exists(select 1 from assignment_delivery_events e join ta_assignments t on t.id=e.source_id where t.title='MCP passage'),'MCP suppressed write no event');
-- A backlog larger than the cron batch of future and inactive events must
-- never consume all slots before a newer currently-due event.
insert into classroom_items(student_id,type,title,unlock_at,notification_policy)
 select '20000000-0000-0000-0000-000000000001','note','Future backlog '||n,now()+interval '20 days','auto' from generate_series(1,125)n;
insert into classroom_items(id,student_id,type,title,notification_policy) values('74000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','note','Due after future backlog','auto');
select public.release_assignment_notifications(100);
select public.assert_true(exists(select 1 from assignment_delivery_events where source_id='74000000-0000-0000-0000-000000000001' and delivered_at is not null),'future backlog does not starve due work');
-- No duplicate collection parameter even if a cached new writer included it.
select public.assert_true(public.assignment_notification_group_link('/my-work/to-do?workGroup=old&view=all&workGroup=old#top','60000000-0000-0000-0000-999999999999')='/my-work/to-do?view=all&workGroup=60000000-0000-0000-0000-999999999999#top','collection link has exactly one workGroup');
insert into classroom_items(id,student_id,type,title,notification_policy) values('75000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','session_recap','New recap','suppressed');
insert into notifications(user_id,type,title,link) values('20000000-0000-0000-0000-000000000001','message','Recap message','/classroom/item/75000000-0000-0000-0000-000000000001'),('20000000-0000-0000-0000-000000000001','message','Conversation message','/inbox/90000000-0000-0000-0000-000000000001');
select public.assert_true(exists(select 1 from assignment_notification_legacy_links l join notifications n on n.id=l.notification_id where n.title='Recap message' and l.source_id='75000000-0000-0000-0000-000000000001'),'new message-channel recap mapped exactly');
select public.assert_true(not exists(select 1 from assignment_delivery_events where source_id='75000000-0000-0000-0000-000000000001'),'recap remains suppressed without extra assignment ping');
insert into activities(id,class_id,title,items,created_by,mode) values('76000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Section','[{"slug":"a"},{"slug":"b"}]','10000000-0000-0000-0000-000000000001','section');
-- Explicit message policy defers recap/announcement bells, without assignment pings.
insert into classroom_items(id,student_id,type,title,description,unlock_at,notification_policy,notification_group_id)
select ('78500000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'20000000-0000-0000-0000-000000000001',kind,'SECRET scheduled '||kind,'SECRET body '||kind,now()+interval '1 day','message',('78500000-0000-0000-9999-'||lpad(n::text,12,'0'))::uuid
from unnest(array['session_recap','smartboard_recap','announcement']) with ordinality as x(kind,n);
do $$declare n integer;begin for n in 1..3 loop
perform public.finalize_assignment_notification_group(('78500000-0000-0000-9999-'||lpad(n::text,12,'0'))::uuid,'SECRET message title','SECRET message body','/my-work/notes');
end loop;end$$;
select public.assert_true(not exists(select 1 from notifications where assignment_group_id::text like '78500000%'),'future message channel stays silent');
select public.assert_true(not public.claim_assignment_notification_channels('78500000-0000-0000-9999-000000000001'),'future message cannot claim optional channels');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',false);
set role authenticated;
select public.expect_failure($c$select public.claim_assignment_notification_channels('70000000-0000-0000-0000-999999999999')$c$,'student cannot claim assignment notification channels');
select public.expect_failure($c$select title,message from assignment_notification_groups where id::text like '78500000%'$c$,'future group payload is not directly selectable');
select public.expect_failure($c$select * from assignment_delivery_events$c$,'internal event queue not directly selectable');
select public.expect_failure($c$select * from assignment_notification_deliveries$c$,'internal deliveries not directly selectable');
select public.expect_failure($c$select * from assignment_notification_legacy_links$c$,'internal legacy mappings not directly selectable');
select public.expect_failure($c$select * from public.get_assignment_notification_group_items('78500000-0000-0000-9999-000000000001')$c$,'future undelivered message collection unavailable');
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
update classroom_items set unlock_at=now()-interval '1 minute' where id::text like '78500000%';
select public.release_assignment_notifications(500);
select public.assert_true((select count(*)=3 and bool_and(type='message') from notifications where assignment_group_id::text like '78500000%'),'unlock emits one message per recap or announcement and no assignment ping');
select public.release_assignment_notifications(500);
select public.assert_true((select count(*)=3 from notifications where assignment_group_id::text like '78500000%'),'message release retry exactly once');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',false);
set role authenticated;
select public.acknowledge_student_work('classroom_items','78500000-0000-0000-0000-000000000001',1);
select public.assert_true((select read from notifications where assignment_group_id='78500000-0000-0000-9999-000000000001'),'owned actual recap load clears deferred message alert');
select public.assert_true((select not read from notifications where title='Conversation message'),'deferred recap receipt leaves Inbox conversation unread');
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select public.expect_failure($c$insert into classroom_items(student_id,type,title,notification_policy,notification_group_id) values('20000000-0000-0000-0000-000000000001','note','Invalid message policy','message',gen_random_uuid())$c$,'message policy limited to recap and announcement');
select public.expect_failure($c$insert into ta_assignments(student_id,title,notification_policy,notification_group_id) values('20000000-0000-0000-0000-000000000001','Invalid native message','message',gen_random_uuid())$c$,'native assignments cannot use message policy');
-- Atomic session bundle parts survive lost posted flags and concurrent retries.
insert into ai_ta_drafts(id,student_id,created_by,draft_type,draft_json) values
 ('78600000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','classroom_update_bundle','{"parts":{"session_note":{"approved":true,"include":true,"audience":"student"},"homework":{"approved":true,"include":true,"audience":"student"},"quiz":{"approved":true,"include":true,"audience":"student"},"private_note":{"approved":true,"include":true,"audience":"admin"}}}'),
 ('78600000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','classroom_update_bundle','{"parts":{"homework":{"approved":true,"include":true,"audience":"student"}}}'),
 ('78600000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','classroom_update_bundle','{"parts":{"homework":{"approved":false,"include":true,"audience":"student"}}}');
do $body$declare first_result jsonb;retry_result jsonb;quiz_result jsonb;recap_result jsonb;begin
 first_result:=public.materialize_session_bundle_part('78600000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','homework','Original homework','Original body','78600000-0000-0000-9999-000000000001','{"approved":true,"include":true,"audience":"student"}'::jsonb);
 update ai_ta_drafts set draft_json=jsonb_set(draft_json,'{parts,private_note,body_markdown}','"Newer private edit"') where id='78600000-0000-0000-0000-000000000001';
 retry_result:=public.materialize_session_bundle_part('78600000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','homework','Edited homework','Edited body','78600000-0000-0000-9999-000000000002');
 perform public.assert_true((select draft_json->'parts'->'private_note'->>'body_markdown'='Newer private edit' and draft_json->'parts'->'homework'->>'posted'='true' and draft_json->'parts'->'homework'->>'classroom_item_id'=first_result->'item'->>'id' from ai_ta_drafts where id='78600000-0000-0000-0000-000000000001'),'atomic posted flags preserve newer unrelated authored parts');
 perform public.assert_true(first_result->'item'->>'class_id' is null,'publisher does not invent a student UUID as class scope');
 perform public.assert_true((first_result->>'created')::boolean and not (retry_result->>'created')::boolean and first_result->'item'=retry_result->'item','retry returns existing unchanged part after posted-flag failure');
 quiz_result:=public.materialize_session_bundle_part('78600000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','quiz','Quiz','Quiz body','78600000-0000-0000-9999-000000000002','{"approved":true,"include":true,"audience":"student"}'::jsonb);
 perform public.assert_true(quiz_result->'item'->>'notification_group_id'=first_result->'item'->>'notification_group_id','different parts retain one durable draft homework group');
 recap_result:=public.materialize_session_bundle_part('78600000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','session_note','Recap','Recap body',null,'{"approved":true,"include":true,"audience":"student"}'::jsonb);
 perform public.assert_true(recap_result->'item'->>'notification_policy'='message' and recap_result->'item'->>'notification_group_id' is distinct from first_result->'item'->>'notification_group_id','session recap has a separate durable message group');
 perform public.assert_true((select count(*)=1 and bool_and(type='message') from notifications where assignment_group_id=(recap_result->'item'->>'notification_group_id')::uuid),'committed recap has a durable bell even if client loses its RPC response');
end $body$;
select public.expect_failure($c$select public.materialize_session_bundle_part('78600000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','homework','Wrong student','body',null)$c$,'draft student mismatch rejected');
select public.expect_failure($c$select public.materialize_session_bundle_part('78600000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','private_note','Private','body',null)$c$,'private bundle part cannot be published');
select public.expect_failure($c$select public.materialize_session_bundle_part('78600000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','homework','Unapproved','body',null)$c$,'unapproved bundle part cannot be published');
select public.expect_failure($c$select public.materialize_session_bundle_part('78600000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','homework','Stale part','Stale body',null,'{"approved":true,"include":true,"audience":"student","body_markdown":"Old authored body"}'::jsonb)$c$,'stale authored part rejected before materialization');
-- Reusing one managed UUID after a real reissue must produce a fresh durable
-- delivery, retire only obsolete alerts, and retain old receipt generations.
insert into classroom_items(id,student_id,type,title,notification_policy,notification_group_id) values
 ('78000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','note','Reissue note','managed','78000000-0000-0000-0000-999999999999');
select public.finalize_assignment_notification_group('78000000-0000-0000-0000-999999999999');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',false);
select public.acknowledge_student_work('classroom_items','78000000-0000-0000-0000-000000000001',1);
select public.assert_true((select not read from notifications where assignment_group_id='70000000-0000-0000-0000-999999999999'),'unrelated document does not clear plan publication');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
insert into notifications(user_id,type,title,link) values('20000000-0000-0000-0000-000000000001','message','Old reissue document alert','/classroom/item/78000000-0000-0000-0000-000000000001');
insert into classroom_items(id,student_id,type,title,notification_policy) values('78000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','note','Other student unaffected','auto');
select public.release_assignment_notifications(500);
update classroom_items set status='archived' where id='78000000-0000-0000-0000-000000000001';
update classroom_items set status='assigned' where id='78000000-0000-0000-0000-000000000001';
select public.release_assignment_notifications(500);
select public.assert_true((select read and assignment_superseded_at is not null and assignment_superseded_by_issuance=2 from notifications where title='Old reissue document alert'),'old unread document alert is retired without deletion');
select public.assert_true(exists(select 1 from assignment_notification_legacy_links l join notifications n on n.id=l.notification_id where n.title='Old reissue document alert' and l.issuance=1),'stored historical mapping generation retained');
select public.assert_true((select count(*)=1 from notifications n join assignment_delivery_events e on e.id=n.assignment_event_id where e.source_id='78000000-0000-0000-0000-000000000001' and not n.read and e.issuance=2),'same group reissue has one current unread alert');
select public.assert_true(exists(select 1 from student_work_receipts where source_id='78000000-0000-0000-0000-000000000001' and issuance=1) and not exists(select 1 from student_work_receipts where source_id='78000000-0000-0000-0000-000000000001' and issuance=2),'old receipt preserved while new issuance unread');
select public.assert_true((select not n.read and n.assignment_superseded_at is null from notifications n join assignment_delivery_events e on e.id=n.assignment_event_id where e.source_id='78000000-0000-0000-0000-000000000002'),'other student alert unchanged');
insert into classroom_items(id,student_id,type,title,notification_policy) values('78200000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','note','Unread reissue keeps historical evidence','auto');
select public.release_assignment_notifications(500);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',false);
select public.acknowledge_student_work('classroom_items','78200000-0000-0000-0000-000000000001',1);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
update classroom_items set status='archived' where id='78200000-0000-0000-0000-000000000001';
update classroom_items set status='assigned' where id='78200000-0000-0000-0000-000000000001';
select public.release_assignment_notifications(500);
select public.assert_true(not exists(select 1 from student_work_receipts where source_id='78200000-0000-0000-0000-000000000001' and issuance=2),'old note read metadata cannot acknowledge a new generation');
insert into classroom_items(id,student_id,type,title,notification_policy) values('78300000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','note','Unread direct assignment reissue','auto');
select public.release_assignment_notifications(500);
update classroom_items set status='archived' where id='78300000-0000-0000-0000-000000000001';
update classroom_items set status='assigned' where id='78300000-0000-0000-0000-000000000001';
select public.release_assignment_notifications(500);
select public.assert_true((select n.read and n.assignment_superseded_by_issuance=2 from notifications n join assignment_delivery_events e on e.id=n.assignment_event_id where e.source_id='78300000-0000-0000-0000-000000000001' and e.issuance=1),'old unread direct assignment retired');
select public.assert_true((select count(*)=1 from notifications n join assignment_delivery_events e on e.id=n.assignment_event_id where e.source_id='78300000-0000-0000-0000-000000000001' and not n.read and e.issuance=2),'only current direct assignment alert remains unread');
-- A mixed group keeps its old alert while its other current member is unread.
insert into classroom_items(id,student_id,type,title,notification_policy,notification_group_id) values
 ('79000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','note','Mixed reissue A','managed','79000000-0000-0000-0000-999999999999'),
 ('79000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','homework','Mixed reissue B','managed','79000000-0000-0000-0000-999999999999');
select public.finalize_assignment_notification_group('79000000-0000-0000-0000-999999999999');
update classroom_items set status='archived' where id='79000000-0000-0000-0000-000000000001';
update classroom_items set status='assigned' where id='79000000-0000-0000-0000-000000000001';
select public.assert_true((select count(*)=1 and bool_and(not read) from notifications where assignment_group_id='79000000-0000-0000-0000-999999999999'),'other unread group member prevents premature alert retirement');
select public.release_assignment_notifications(500);
-- RLS / owner RPCs execute as the real authenticated role.
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',false);
set role authenticated;
select public.expect_failure($c$select public.materialize_session_bundle_part('78600000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','homework','Student publishing','body',null)$c$,'student cannot materialize session bundles');
select public.acknowledge_student_work('guided_drill_assignments','34000000-0000-0000-0000-000000000001',1);
select public.acknowledge_student_work('activity_assignments','34000000-0000-0000-0000-000000000002',1);
select public.acknowledge_student_work('classroom_items','35000000-0000-0000-0000-000000000001',1);
select public.acknowledge_student_work('classroom_items','35000000-0000-0000-0000-000000000002',1);
select public.acknowledge_student_work('classroom_items','35000000-0000-0000-0000-000000000003',1);
select public.acknowledge_student_work('classroom_items','35000000-0000-0000-0000-000000000004',1);
select public.acknowledge_student_work('classroom_items','35000000-0000-0000-0000-000000000005',1);
select public.acknowledge_student_work('homework_assignments','30000000-0000-0000-0000-000000000004',1);
reset role;
select public.assert_true((select count(*)=8 and bool_and(n.read) from assignment_notification_legacy_links l join notifications n on n.id=l.notification_id where (n.title like 'Legacy native %' or n.title like 'Legacy alias %') and n.title<>'Legacy native TA'),'actual loaded native and standalone legacy documents clear exact alerts');
set role authenticated;
select public.assert_true((select bool_and(not read) from notifications where title in ('Generic','Retired bootcamp','Legacy inbox')),'generic retired and Inbox destinations remain unmapped and untouched');
select public.assert_true(exists(select 1 from public.get_assignment_notification_links() l join notifications n on n.id=l.notification_id where n.title='Old reissue document alert' and l.source_id='78000000-0000-0000-0000-000000000001' and l.issuance=2),'historical alert navigation resolves current owned issuance');
select public.expect_failure($c$update notifications set assignment_superseded_at=now() where title='Old reissue document alert'$c$,'student cannot forge supersession audit');
select public.acknowledge_student_work('classroom_items','78000000-0000-0000-0000-000000000001',2);
reset role;
select public.assert_true(not exists(select 1 from notifications n join assignment_delivery_events e on e.id=n.assignment_event_id where e.source_id='78000000-0000-0000-0000-000000000001' and not n.read),'actual current load clears current alert');
set role authenticated;
select public.acknowledge_student_work('classroom_items','79000000-0000-0000-0000-000000000001',2);
select public.assert_true(exists(select 1 from notifications where assignment_group_id='79000000-0000-0000-0000-999999999999' and not read),'reading reissued group member leaves other unread member');
select public.acknowledge_student_work('classroom_items','79000000-0000-0000-0000-000000000002',1);
select public.assert_true(not exists(select 1 from notifications where assignment_group_id='79000000-0000-0000-0000-999999999999' and not read),'all current member receipts clear group despite obsolete old generation');
update ta_assignments set status='viewed' where id='30000000-0000-0000-0000-000000000001';
select public.acknowledge_student_work('ta_assignments','30000000-0000-0000-0000-000000000001',1);
select public.assert_true(exists(select 1 from public.get_student_work_access() where source_id='30000000-0000-0000-0000-000000000001' and available),'viewed TA remains available');
update ta_assignments set status='completed',completed_at=now() where id='30000000-0000-0000-0000-000000000001';
update guided_drill_assignments set status='read',read_card_at=now() where id='72500000-0000-0000-0000-000000000001';
select public.acknowledge_student_work('guided_drill_assignments','72500000-0000-0000-0000-000000000001',1);
update guided_drill_assignments set status='started' where id='72500000-0000-0000-0000-000000000001';
select public.assert_true(exists(select 1 from public.get_student_work_access() where source_id='72500000-0000-0000-0000-000000000001' and available),'started guided remains available');
update guided_drill_assignments set status='completed',completed_at=now() where id='72500000-0000-0000-0000-000000000001';
select public.assert_true((select issuance=1 from guided_drill_assignments where id='72500000-0000-0000-0000-000000000001'),'student progress completion never reissues');
select public.acknowledge_student_work('classroom_items','75000000-0000-0000-0000-000000000001',1);
select public.assert_true((select read from notifications where title='Recap message'),'successful recap load clears exact message bell');
select public.assert_true((select not read from notifications where title='Conversation message'),'recap load leaves conversation bell unread');
-- Exact preserved student-start SQL writers remain usable after activation.
do $$declare run uuid;focus uuid;begin
 run:=public.start_section_attempt('76000000-0000-0000-0000-000000000001');
 if not exists(select 1 from activity_assignments where id=run and notification_policy='suppressed') then raise exception 'section run not quiet';end if;
 perform public.acknowledge_student_work('activity_assignments',run,1);
 -- Retain an answered partial run exactly as the deployed function does.
 insert into activity_item_responses(assignment_id) values(run);
 focus:=public.start_section_focus_attempt(run,array['a']);
 if not exists(select 1 from activity_assignments where id=focus and notification_policy='suppressed') then raise exception 'focus run not quiet';end if;
 perform public.acknowledge_student_work('activity_assignments',focus,1);
 if exists(select 1 from notifications where link in('/activities/'||run::text,'/activities/'||focus::text)) then raise exception 'student initiated run generated alert';end if;
 if exists(select 1 from public.get_student_work_access() where source_id=run and available) then raise exception 'abandoned run still active';end if;
end$$;
select public.assert_true(not exists(select 1 from public.get_student_work_receipts() where source_id='72000000-0000-0000-0000-999999999999'),'owner receipts');
select public.expect_failure($c$update classroom_items set issuance=99 where id='60000000-0000-0000-0000-000000000001'$c$,'student issuance guard');
select public.expect_failure($c$update classroom_items set notification_policy='auto' where id='60000000-0000-0000-0000-000000000001'$c$,'student policy guard');
select public.expect_failure($c$update classroom_items set notification_group_id=gen_random_uuid() where id='60000000-0000-0000-0000-000000000001'$c$,'student group guard');
select public.expect_failure($c$update classroom_items set metadata_json='{"notification_policy":"auto"}' where id='60000000-0000-0000-0000-000000000001'$c$,'student metadata policy guard');
select public.expect_failure($c$update classroom_items set unlock_at=now()+interval '1 day' where id='60000000-0000-0000-0000-000000000001'$c$,'student unlock guard');
select public.expect_failure($c$update homework_assignments set notification_policy='auto' where student_id=auth.uid()$c$,'native homework policy guard');
select public.expect_failure($c$update ta_assignments set issuance=99 where student_id=auth.uid()$c$,'native TA issuance guard');
select public.expect_failure($c$update practice_test_assignments set notification_group_id=gen_random_uuid() where student_id=auth.uid()$c$,'native PT group guard');
select public.expect_failure($c$update guided_drill_assignments set notification_policy='suppressed' where student_id=auth.uid()$c$,'native guided policy guard');
select public.expect_failure($c$update activity_assignments set unlock_at=null where student_id=auth.uid()$c$,'native activity unlock guard');
select public.expect_failure($c$insert into student_work_receipts(student_id,source_table,source_id,issuance,first_opened_at,last_opened_at,read_at) values(auth.uid(),'classroom_items','60000000-0000-0000-0000-000000000002',1,now(),now(),now())$c$,'direct receipt insert forbidden');
select public.expect_failure($c$select public.acknowledge_student_work('classroom_items','60000000-0000-0000-0000-000000000001',99)$c$,'stale receipt rejected');
select public.acknowledge_student_work('classroom_items','60000000-0000-0000-0000-000000000001',1);
select public.assert_true((select not read from notifications where assignment_group_id='60000000-0000-0000-0000-999999999999'),'one read does not clear bundle');
select public.assert_true((select count(*)=3 and count(read_at)=1 from public.get_assignment_notification_group_items('60000000-0000-0000-0000-999999999999')),'explicit group shows exact notes plus receipts');
select public.assert_true((select count(*)=0 from public.get_assignment_notification_group_items('70000000-0000-0000-0000-999999999999')),'generic weekly summary reveals no future task titles');
select public.assert_true((select not read from notifications where assignment_group_id='70000000-0000-0000-0000-999999999999'),'plan publication remains unread until its collection opens');
select public.acknowledge_assignment_notification_group('70000000-0000-0000-0000-999999999999');
select public.assert_true((select read from notifications where assignment_group_id='70000000-0000-0000-0000-999999999999'),'explicit plan collection clears only its summary');
select public.acknowledge_assignment_notification_group('60000000-0000-0000-0000-999999999999');
select public.assert_true((select read from notifications where assignment_group_id='60000000-0000-0000-0000-999999999999'),'explicit group clears bell');
select public.assert_true((select count(*)=1 from public.get_student_work_receipts() where source_id::text like '60000000%'),'collection leaves other documents unread');
select public.acknowledge_student_work('classroom_items','30000000-0000-0000-0000-000000000002',1);
select public.assert_true((select metadata_json->>'kept'='yes' and status='assigned' and completed_at is null from classroom_items where id='30000000-0000-0000-0000-000000000002'),'receipt preserves metadata and completion');
select public.assert_true((select read from notifications where title='Old note'),'exact legacy clears after actual load');
select public.assert_true((select not read from notifications where title='Generic'),'generic summary unrelated');
reset role;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',false);
set role authenticated;
select public.expect_failure($c$select public.acknowledge_student_work('classroom_items','60000000-0000-0000-0000-000000000001',1)$c$,'cross-owner forbidden');
select public.expect_failure($c$select public.acknowledge_assignment_notification_group('60000000-0000-0000-0000-999999999999')$c$,'cross-owner group forbidden');
select public.expect_failure($c$select * from public.get_assignment_notification_group_items('60000000-0000-0000-0000-999999999999')$c$,'cross-owner group contents forbidden');
select public.expect_failure($c$select public.finalize_assignment_notification_group('60000000-0000-0000-0000-999999999999')$c$,'student finalization forbidden');
select public.assert_true((select count(*)=0 from public.get_student_work_receipts()),'cross-owner receipt hidden');
reset role;

-- Administrators can be assignment owners. Previewing another student's work
-- still cannot create receipts or clear their alerts. Completion stays separate.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
insert into classroom_items(id,student_id,type,title,status,notification_policy,metadata_json)
values('78700000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','note','Own administrator note','assigned','suppressed','{"kept":"yes"}');
set role authenticated;
select public.acknowledge_student_work('classroom_items','78700000-0000-0000-0000-000000000001',1);
select public.assert_true((select count(*)=1 from public.get_student_work_receipts() where source_id='78700000-0000-0000-0000-000000000001'),'administrator acknowledges their own assigned document');
select public.assert_true((select status='assigned' and completed_at is null and metadata_json->>'kept'='yes' and metadata_json->>'read_at' is not null from classroom_items where id='78700000-0000-0000-0000-000000000001'),'administrator owner read preserves completion and authored metadata');
select public.expect_failure($c$select public.acknowledge_student_work('classroom_items','60000000-0000-0000-0000-000000000001',1)$c$,'administrator preview cannot acknowledge another student');
reset role;
