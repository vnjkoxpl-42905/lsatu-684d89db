-- Local draft. Additive follow-up to applied 0029. This does not enable AI.
begin;

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
 'Trusted receipt identity. Advance with each grading prompt/model/guard change; old request IDs conflict and old first attempts cannot authorize disclosure under a new revision.';

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
 if p_attempt=2 and not exists(select 1 from public.activity_ai_receipts_v1 r
  where r.owner_id=p_owner and r.source_kind=p_kind and r.source_id=p_source
   and r.item_order=p_order and r.attempt_no=1 and r.state='completed'
   and (r.canonical_payload-'studentResponse'-'attemptNo'-'firstAttemptConfirmed')=
       (canonical-'studentResponse'-'attemptNo'-'firstAttemptConfirmed')
   and (p_kind='preview' or exists(select 1 from public.activity_item_responses a
    where a.assignment_id=p_source and a.student_id=p_owner and a.item_order=p_order and a.attempt_no=1
     and a.response_text=r.canonical_payload->>'studentResponse' and a.verdict=r.result->>'verdict')))
 then return null; end if;
 if length(canonical::text)>64000 then return null; end if;
 return canonical;
end $$;
revoke all on function public.activity_ai_source_v1(uuid,text,uuid,integer,text,integer) from public, anon, authenticated, service_role;
commit;
