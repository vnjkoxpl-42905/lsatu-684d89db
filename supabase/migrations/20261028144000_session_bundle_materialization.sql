-- Atomic materialization preserves existing bundle parts even after posted-flag failures.
begin;
create or replace function public.materialize_session_bundle_part(
 p_draft_id uuid,p_student_id uuid,p_part text,p_title text,p_content_markdown text,p_notification_group_id uuid default null,p_expected_part jsonb default null
) returns jsonb language plpgsql security definer set search_path=public as $body$
declare actor uuid:=auth.uid();draft record;part jsonb;item public.classroom_items%rowtype;group_id uuid;
begin
 if actor is null or not public.has_role(actor,'admin') then raise exception 'Only administrators may publish session bundles' using errcode='42501';end if;
 if p_part not in ('session_note','homework','quiz') or p_part is null then raise exception 'Only student-facing session parts may be published' using errcode='22023';end if;
 -- Serialize all parts of one draft, making the homework group stable across
 -- concurrent callers as well as retries after a separate draft save fails.
 perform pg_advisory_xact_lock(hashtextextended('session-bundle:'||p_draft_id::text||':'||p_student_id::text,0));
 select id,student_id,draft_type,draft_json into draft from public.ai_ta_drafts where id=p_draft_id for update;
 if not found or draft.student_id is distinct from p_student_id or draft.draft_type is distinct from 'classroom_update_bundle' then
  raise exception 'Session bundle does not belong to this student' using errcode='42501';end if;
 select * into item from public.classroom_items c where c.student_id=p_student_id and c.source_table='ai_ta_drafts' and c.source_id=p_draft_id::text
 and c.metadata_json->>'bundle_part'=p_part order by c.created_at,c.id limit 1;
 if found then
  update public.ai_ta_drafts set draft_json=jsonb_set(coalesce(draft_json,'{}'),array['parts',p_part],coalesce(draft_json->'parts'->p_part,'{}')||jsonb_build_object('posted',true,'classroom_item_id',item.id)),status='posted',posted_at=coalesce(posted_at,now()) where id=p_draft_id;
  return jsonb_build_object('item',to_jsonb(item),'created',false);end if;
 part:=draft.draft_json->'parts'->p_part;
 if part is null or part->>'approved' is distinct from 'true' or part->>'include' is distinct from 'true' or part->>'audience' is distinct from 'student' then
  raise exception 'Approve and include the student-facing part before publishing' using errcode='22023';end if;
 if p_expected_part is null or (part-array['posted','classroom_item_id']) is distinct from (p_expected_part-array['posted','classroom_item_id']) then
  raise exception 'This session part changed. Refresh the draft before publishing.' using errcode='40001';end if;
 if length(trim(coalesce(p_title,''))) not between 1 and 200 or length(trim(coalesce(p_content_markdown,''))) not between 1 and 500000 then
  raise exception 'A title and non-empty session part are required' using errcode='22023';end if;
 if p_part='session_note' then group_id:=gen_random_uuid();else
  select c.notification_group_id into group_id from public.classroom_items c where c.student_id=p_student_id and c.source_table='ai_ta_drafts' and c.source_id=p_draft_id::text
  and c.metadata_json->>'bundle_part' in ('homework','quiz') and c.notification_policy='managed' and c.notification_group_id is not null
  order by c.created_at,c.id limit 1;
  group_id:=coalesce(group_id,p_notification_group_id,gen_random_uuid());
 end if;
 insert into public.classroom_items(student_id,created_by,type,title,content_markdown,source_table,source_id,status,visible_to_student,metadata_json,notification_policy,notification_group_id)
 values(p_student_id,actor,case when p_part='session_note' then 'session_recap' else 'homework' end,trim(p_title),p_content_markdown,
 'ai_ta_drafts',p_draft_id::text,'assigned',true,jsonb_build_object('bundle_part',p_part),case when p_part='session_note' then 'message' else 'managed' end,group_id)
 returning * into item;
 update public.ai_ta_drafts set draft_json=jsonb_set(coalesce(draft_json,'{}'),array['parts',p_part],coalesce(draft_json->'parts'->p_part,'{}')||jsonb_build_object('posted',true,'classroom_item_id',item.id)),status='posted',posted_at=coalesce(posted_at,now()) where id=p_draft_id;
 if p_part='session_note' then
  perform public.finalize_assignment_notification_group(group_id,'Session recap','Your session recap is ready.','/classroom/item/'||item.id::text);
 end if;
 return jsonb_build_object('item',to_jsonb(item),'created',true);
end $body$;
revoke all on function public.materialize_session_bundle_part(uuid,uuid,text,text,text,uuid,jsonb) from public,anon;
grant execute on function public.materialize_session_bundle_part(uuid,uuid,text,text,text,uuid,jsonb) to authenticated;

-- The durable bell is independent of these optional best-effort channels.
-- One publisher claims the group's Inbox/email attempt, including concurrent
-- publishers that each created a different part of the same draft.
alter table public.assignment_notification_groups add column if not exists optional_channels_claimed_at timestamptz;
create or replace function public.claim_assignment_notification_channels(p_group_id uuid)
returns boolean language plpgsql security definer set search_path=public as $body$
begin
 if not (coalesce(public.has_role(auth.uid(),'admin'),false) or coalesce(auth.role(),'')='service_role') then
  raise exception 'Only administrators may notify assignment channels' using errcode='42501';end if;
 update public.assignment_notification_groups g set optional_channels_claimed_at=now()
 where g.id=p_group_id and g.optional_channels_claimed_at is null and g.finalized_at is not null
 and exists(select 1 from public.notifications n where n.assignment_group_id=g.id and n.user_id=g.student_id and n.assignment_delivery_id is not null and n.assignment_superseded_at is null)
 and (g.kind='plan_publication' or exists(select 1 from public.assignment_delivery_events e where e.group_id=g.id and e.student_id=g.student_id and e.delivered_at is not null and e.cancelled_at is null
  and (public.student_work_state(e.source_table,e.source_id,g.student_id)->>'issuance')::integer=e.issuance
  and coalesce((public.student_work_state(e.source_table,e.source_id,g.student_id)->>'available')::boolean,false)));
 return found;
end $body$;
revoke all on function public.claim_assignment_notification_channels(uuid) from public,anon;
grant execute on function public.claim_assignment_notification_channels(uuid) to authenticated,service_role;
commit;
