-- SELECT ONLY. Save exact output before phase one, immediately after phase
-- one, and after idempotent read-only audit. Compare rows/digests exactly.
-- New nullable delivery fields are excluded; all authored data, metadata,
-- statuses, completion dates and original schedules remain in the digest.
with source_rows as (
 select 'classroom_items'::text source_table,to_jsonb(t) row from public.classroom_items t
 union all select 'homework_assignments',to_jsonb(t) from public.homework_assignments t
 union all select 'ta_assignments',to_jsonb(t) from public.ta_assignments t
 union all select 'guided_drill_assignments',to_jsonb(t) from public.guided_drill_assignments t
 union all select 'activity_assignments',to_jsonb(t) from public.activity_assignments t
 union all select 'practice_test_assignments',to_jsonb(t) from public.practice_test_assignments t
), normalized as (
 select source_table,row->>'student_id' student_id,row->>'id' id,
 jsonb_strip_nulls(row-array['issuance','notification_policy','notification_group_id']) preserved_row
 from source_rows
)
select student_id,source_table,count(*) row_count,
 count(*) filter(where preserved_row->>'status'='completed') completed_rows,
 count(*) filter(where preserved_row->>'completed_at' is not null) dated_completions,
 md5(string_agg(preserved_row::text,E'\n' order by id)) authored_status_schedule_digest
from normalized group by student_id,source_table order by student_id,source_table;

select user_id student_id,count(*) notification_rows,count(*) filter(where read) read_rows,
 md5(string_agg((jsonb_build_object('id',id,'user_id',user_id,'type',type,'title',title,'body',body,'link',link,'read',read,'created_at',created_at))::text,E'\n' order by id)) notification_history_digest
from public.notifications group by user_id order by user_id;

select count(*) message_rows,md5(string_agg(to_jsonb(m)::text,E'\n' order by m.id)) message_history_digest from public.messages m;
