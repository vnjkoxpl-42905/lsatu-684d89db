-- Local draft. Additive follow-up to applied 0029. This does not enable AI.

-- Preserve the existing shape rules, but make their NULL/error outcomes false.
alter function public.activity_ai_answer_key_valid_v1(jsonb) rename to activity_ai_answer_key_shape_v1;
revoke all on function public.activity_ai_answer_key_shape_v1(jsonb) from public, anon, authenticated, service_role;
create function public.activity_ai_answer_key_valid_v1(key jsonb)
returns boolean language plpgsql immutable set search_path=pg_catalog,public as $$
begin
 return coalesce(public.activity_ai_answer_key_shape_v1(key),false);
exception when invalid_parameter_value then
 -- jsonb_array_length/elements on a malformed non-array must deny admission.
 return false;
end $$;
revoke all on function public.activity_ai_answer_key_valid_v1(jsonb) from public, anon, authenticated, service_role;

alter table public.activity_ai_configuration_v1
 add column grader_revision text not null default 'activity-coach-v2-20261013'
  check(length(btrim(grader_revision)) between 1 and 200),
 add column allowed_activity_ids uuid[] default null
  check(allowed_activity_ids is null or array_position(allowed_activity_ids,null) is null);
comment on column public.activity_ai_configuration_v1.allowed_activity_ids is
 'NULL preserves legacy scope; empty array denies all sources. To limit a future activation to Spot the Relationship, set only its verified activities.id values. This column never enables AI.';
comment on column public.activity_ai_configuration_v1.grader_revision is
 'Trusted receipt identity. Advance with each grading prompt/model/guard change. Completed first attempts remain valid only for an identical trusted question/key/rubric.';

alter function public.activity_ai_source_v1(uuid,text,uuid,integer,text,integer) rename to activity_ai_source_keyed_v1;
revoke all on function public.activity_ai_source_keyed_v1(uuid,text,uuid,integer,text,integer) from public, anon, authenticated, service_role;
create function public.activity_ai_source_v1(p_owner uuid,p_kind text,p_source uuid,p_order integer,p_response text,p_attempt integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare canonical jsonb; revision text; allowed uuid[]; activity uuid;
begin
 -- This preserves source ownership, archive/revocation checks, source locks,
 -- complete key/rubric validation and the existing saved-first-attempt check.
 canonical:=public.activity_ai_source_keyed_v1(p_owner,p_kind,p_source,p_order,p_response,p_attempt);
 if canonical is null then return null; end if;
 select grader_revision,allowed_activity_ids into revision,allowed
  from public.activity_ai_configuration_v1 where singleton for share;
 if revision is null then return null; end if;
 if allowed is not null then
  if p_kind='assignment' then
   select activity_id into activity from public.activity_assignments
    where id=p_source and student_id=p_owner;
  else
   activity:=p_source;
  end if;
  -- An unlinked historical/custom assignment cannot bypass a restricted scope.
  if activity is null or not (activity=any(allowed)) then return null; end if;
 end if;
 canonical:=canonical||jsonb_build_object('graderRevision',revision);
 -- A prompt/guard revision alone does not erase a completed learning attempt.
 -- The keyed wrapper still requires the identical trusted question/key/rubric
 -- and, for assignments, the saved first response/verdict. A key change denies
 -- attempt 2 exactly as before; a revision change only invalidates its cache.
 if length(canonical::text)>64000 then return null; end if;
 return canonical;
end $$;
revoke all on function public.activity_ai_source_v1(uuid,text,uuid,integer,text,integer) from public, anon, authenticated, service_role;

-- Permission to replace a saved request ID is explicit and narrowly scoped.
-- Only terminal receipts whose complete payload changed solely by revision
-- qualify. Lost/in-flight/uncertain outcomes never authorize a paid retry.
alter function public.begin_activity_ai_request_v1(uuid,uuid,text,uuid,integer,text,integer)
 rename to begin_activity_ai_request_base_v1;
revoke all on function public.begin_activity_ai_request_base_v1(uuid,uuid,text,uuid,integer,text,integer)
 from public, anon, authenticated, service_role;
create function public.begin_activity_ai_request_v1(p_owner_id uuid,p_request_id uuid,p_source_kind text,p_source_id uuid,p_item_order integer,p_student_response text,p_attempt_no integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.activity_ai_receipts_v1; payload jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('activity-ai-global-v1',0));
 perform pg_advisory_xact_lock(hashtextextended('activity-ai-owner-v1:'||coalesce(p_owner_id::text,''),0));
 select r1.* into r from public.activity_ai_request_keys_v1 k
  join public.activity_ai_receipts_v1 r1 on r1.id=k.receipt_id
  where k.request_id=p_request_id and k.owner_id=p_owner_id for update of r1;
 if r.id is not null and r.state in ('completed','failed') then
  payload:=public.activity_ai_source_v1(p_owner_id,p_source_kind,p_source_id,p_item_order,p_student_response,p_attempt_no);
  if payload is not null and r.canonical_payload->'graderRevision' is distinct from payload->'graderRevision'
   and (r.canonical_payload-'graderRevision')=(payload-'graderRevision') then
   return public.activity_ai_reply_v1(p_request_id,r,'denied',409,'grader_revision_changed');
  end if;
 end if;
 return public.begin_activity_ai_request_base_v1(p_owner_id,p_request_id,p_source_kind,p_source_id,p_item_order,p_student_response,p_attempt_no);
end $$;
revoke all on function public.begin_activity_ai_request_v1(uuid,uuid,text,uuid,integer,text,integer)
 from public, anon, authenticated, service_role;
grant execute on function public.begin_activity_ai_request_v1(uuid,uuid,text,uuid,integer,text,integer) to service_role;
