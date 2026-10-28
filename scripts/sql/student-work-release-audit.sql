-- Read-only. Run before migration, after phase one, and after activation as
-- applicable. The first query works against the pre-migration baseline too.
with owners as (
 select student_id from public.classroom_items union select student_id from public.homework_assignments
 union select student_id from public.ta_assignments union select student_id from public.guided_drill_assignments
 union select student_id from public.activity_assignments union select student_id from public.practice_test_assignments
 union select user_id from public.notifications
)
select o.student_id,
 (select count(*) from public.classroom_items c where c.student_id=o.student_id) as classroom_rows,
 (select count(*) from public.classroom_items c where c.student_id=o.student_id and c.completed_at is not null) as dated_completions,
 (select count(*) from public.notifications n where n.user_id=o.student_id) as notification_rows,
 (select count(*) from public.notifications n where n.user_id=o.student_id and not n.read) as unread_notifications
from owners o order by o.student_id;

select enabled,verified_frontend_sha,activated_at from public.assignment_delivery_control;
with raw_identities as (
 select 'classroom_items'::text source_table,id,student_id,type category from public.classroom_items
 union all select 'homework_assignments',id,student_id,'homework' from public.homework_assignments
 union all select 'ta_assignments',id,student_id,'homework' from public.ta_assignments
 union all select 'guided_drill_assignments',id,student_id,'drill' from public.guided_drill_assignments
 union all select 'activity_assignments',id,student_id,'activity' from public.activity_assignments
 union all select 'practice_test_assignments',id,student_id,'practice_test' from public.practice_test_assignments
), projected as (
 select i.student_id,i.category,public.student_work_state(i.source_table,i.id,i.student_id) state from raw_identities i
), canonical as (
 select distinct on(student_id,state->>'source_table',state->>'source_id',state->>'issuance') student_id,category,state
 from projected where state is not null
 order by student_id,state->>'source_table',state->>'source_id',state->>'issuance',category
)
select c.student_id,c.category,count(*) canonical_work,
 count(*) filter(where (c.state->>'available')::boolean) available_work,
 count(*) filter(where not (c.state->>'available')::boolean) blocked_or_future_work,
 count(*) filter(where (c.state->>'available')::boolean and r.read_at is not null) read_available_work,
 count(*) filter(where (c.state->>'available')::boolean and r.read_at is null) unread_available_work
from canonical c left join public.student_work_receipts r on r.student_id=c.student_id
 and r.source_table=c.state->>'source_table' and r.source_id=(c.state->>'source_id')::uuid and r.issuance=(c.state->>'issuance')::integer
group by c.student_id,c.category order by c.student_id,c.category;

select (select count(*) from public.student_work_receipts) as receipt_rows,
 (select count(*) from public.assignment_delivery_events) as event_rows,
 (select count(*) from public.assignment_delivery_events where delivered_at is not null) as delivered_events,
 (select count(*) from public.assignment_delivery_events where delivered_at is null and cancelled_at is null) as pending_events,
 (select count(*) from public.assignment_notification_legacy_links) as mapped_legacy_alerts,
 (select count(*) from public.notifications n where n.type='assignment' and n.assignment_delivery_id is null and not exists(select 1 from public.assignment_notification_legacy_links l where l.notification_id=n.id)) as unmappable_legacy_alerts;

select e.student_id,e.source_table,e.policy,count(*) as events,
 count(*) filter(where e.delivered_at is not null) as delivered,
 count(*) filter(where e.cancelled_at is not null) as cancelled,
 count(*) filter(where e.delivered_at is null and e.cancelled_at is null and coalesce((public.student_work_state(e.source_table,e.source_id,e.student_id)->>'available')::boolean,false)) as currently_eligible_pending
from public.assignment_delivery_events e group by e.student_id,e.source_table,e.policy order by e.student_id,e.source_table,e.policy;

select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname='public'
and indexname in ('notifications_unique_unread_assignment','notifications_assignment_delivery_unique','assignment_delivery_events_student_id_source_table_source_id_issuance_key');

select event_object_table,trigger_name,action_timing,event_manipulation from information_schema.triggers
where trigger_name in ('a_student_work_identity','z_student_work_event','notifications_assignment_identity_guard') order by event_object_table,trigger_name,event_manipulation;

-- Only after the public bundle and merged full SHA are verified:
-- select public.activate_assignment_delivery('<verified full 40-character SHA>');
-- Then read enabled + verified_frontend_sha above and read cron.job below.
-- select jobid,jobname,schedule,command,active from cron.job where jobname='student-work-delivery-v1';
-- To prove the cached-client rejection without creating student work, use a
-- transaction + SAVEPOINT against an existing admin test fixture in disposable
-- PostgreSQL. Never add fictitious production student assignments for proof.
