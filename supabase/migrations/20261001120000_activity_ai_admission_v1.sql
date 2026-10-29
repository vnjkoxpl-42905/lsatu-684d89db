-- Additive, inactive Activity AI admission. No existing source records change.
begin;
create table public.activity_ai_configuration_v1(
 singleton boolean primary key default true check(singleton), enabled boolean not null default false,
 actor_minute integer not null default 60 check(actor_minute between 1 and 600),
 actor_day integer not null default 600 check(actor_day between 1 and 6000),
 global_day integer not null default 6000 check(global_day between 1 and 60000),
 actor_concurrency integer not null default 3 check(actor_concurrency between 1 and 10),
 lease_seconds integer not null default 30 check(lease_seconds=30)
);
insert into public.activity_ai_configuration_v1(singleton) values(true);
create table public.activity_ai_receipts_v1(
 id uuid primary key, owner_id uuid not null, source_kind text not null check(source_kind in ('assignment','preview')),
 source_id uuid not null, item_order integer not null check(item_order>0), attempt_no integer not null check(attempt_no between 1 and 2),
 canonical_payload jsonb not null check(jsonb_typeof(canonical_payload)='object'),
 payload_sha256 text not null check(payload_sha256 ~ '^[0-9a-f]{64}$'),
 state text not null check(state in ('reserved','dispatched','completed','failed','uncertain')),
 claim_id uuid not null, lease_expires_at timestamptz not null,
 result jsonb, failure_category text check(failure_category in ('provider_error','timeout','malformed_result','transport_error','cancelled','access_revoked','source_changed','uncertain')),
 admitted_at timestamptz not null default clock_timestamp(), dispatched_at timestamptz, finished_at timestamptz,
 unique(owner_id,payload_sha256),unique(id,owner_id),
 check((state='completed')=(result is not null)), check(state<>'completed' or failure_category is null)
);
create table public.activity_ai_request_keys_v1(
 request_id uuid primary key, owner_id uuid not null, receipt_id uuid not null,
 payload_sha256 text not null, created_at timestamptz not null default clock_timestamp(),
 foreign key(receipt_id,owner_id) references public.activity_ai_receipts_v1(id,owner_id)
);
create table public.activity_ai_budget_buckets_v1(
 kind text not null check(kind in ('actor-minute','actor-day','global-day')), actor_key text not null,
 bucket_start timestamptz not null, admissions integer not null check(admissions>=0),primary key(kind,actor_key,bucket_start)
);
create index activity_ai_owner_pending_v1 on public.activity_ai_receipts_v1(owner_id,state,lease_expires_at);
alter table public.activity_ai_configuration_v1 enable row level security;
alter table public.activity_ai_receipts_v1 enable row level security;
alter table public.activity_ai_request_keys_v1 enable row level security;
alter table public.activity_ai_budget_buckets_v1 enable row level security;
revoke all on public.activity_ai_configuration_v1,public.activity_ai_receipts_v1,public.activity_ai_request_keys_v1,public.activity_ai_budget_buckets_v1 from public,anon,authenticated,service_role;

-- Source locks synchronize archive, assignment revocation and admin edits with
-- admission/dispatch. Missing deployed revocation/archive columns fail closed.
create function public.activity_ai_source_v1(p_owner uuid,p_kind text,p_source uuid,p_order integer,p_response text,p_attempt integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare profile jsonb; source jsonb; item jsonb; matches integer; canonical jsonb; first_confirmed boolean; trusted_ideas jsonb; trusted_coach jsonb;
begin
 select to_jsonb(p) into profile from public.profiles p where p.class_id=p_owner::text for share;
 if profile is null or not profile ? 'archived_at' or profile->>'archived_at' is not null then return null; end if;
 if p_kind='assignment' then
  select to_jsonb(a) into source from public.activity_assignments a where a.id=p_source and a.student_id=p_owner for share;
  if source is null or not source ? 'revoked_at' or source->>'revoked_at' is not null
    or source->>'status' is null or source->>'status' not in ('assigned','in_progress','completed') then return null; end if;
 elsif p_kind='preview' then
  perform 1 from public.user_roles where user_id=p_owner and role::text='admin' for share;
  if not found then return null; end if;
  select to_jsonb(a) into source from public.activities a where a.id=p_source and a.created_by=p_owner for share;
  if source is null then return null; end if;
 else return null; end if;
 if source->>'item_format' is null or source->>'item_format' not in ('free-text','variation','mcq') or jsonb_typeof(source->'items') is distinct from 'array' then return null; end if;
 trusted_coach:=source->'instructions'->'coach';
 -- Only absent/null briefs may use the original legacy negation rubric.
 -- A supplied malformed brief must never silently change the skill graded.
 if trusted_coach is not null and trusted_coach<>'null'::jsonb then
  if jsonb_typeof(trusted_coach) is distinct from 'object'
    or jsonb_typeof(trusted_coach->'drill') is distinct from 'string'
    or length(btrim(trusted_coach->>'drill'))<1 or length(trusted_coach->>'drill')>1000
    or jsonb_typeof(trusted_coach->'rubric') is distinct from 'array' then return null; end if;
  if jsonb_array_length(trusted_coach->'rubric') not between 1 and 50
    or exists(select 1 from jsonb_array_elements(trusted_coach->'rubric') v where jsonb_typeof(v) is distinct from 'string'
      or length(btrim(v#>>'{}'))<1 or length(v#>>'{}')>4000)
    or (trusted_coach ? 'partial_rule' and (jsonb_typeof(trusted_coach->'partial_rule') is distinct from 'string'
      or length(trusted_coach->>'partial_rule')>4000))
    or length(trusted_coach::text)>24000 then return null; end if;
 end if;
 if exists(select 1 from jsonb_array_elements(source->'items') v where jsonb_typeof(v) is distinct from 'object'
   or jsonb_typeof(v->'order') is distinct from 'number' or coalesce(v->>'order','') !~ '^[1-9][0-9]{0,8}$') then return null; end if;
 select count(*) into matches from jsonb_array_elements(source->'items') v where v->>'order'=p_order::text;
 if matches<>1 then return null; end if;
 select v into item from jsonb_array_elements(source->'items') v where v->>'order'=p_order::text;
 if jsonb_typeof(item->'prompt') is distinct from 'string' or length(btrim(item->>'prompt'))<1 or length(item->>'prompt')>12000
  or jsonb_typeof(item->'credited_answers') is distinct from 'array' or jsonb_array_length(item->'credited_answers') not between 1 and 20
  or exists(select 1 from jsonb_array_elements(item->'credited_answers') v where jsonb_typeof(v)<>'string' or length(btrim(v#>>'{}'))<1 or length(v#>>'{}')>4000)
  or length((item->'credited_answers')::text)>20000 or length(coalesce(item->>'explanation',''))>12000
  or length(coalesce(source->'instructions'->'coach','{}'::jsonb)::text)>24000 then return null; end if;
 first_confirmed:=false;
 if p_attempt=2 then
  select exists(select 1 from public.activity_ai_receipts_v1 r where r.owner_id=p_owner and r.source_kind=p_kind
   and r.source_id=p_source and r.item_order=p_order and r.attempt_no=1 and r.state='completed'
   and r.canonical_payload->>'statement' is not distinct from item->>'prompt'
   and r.canonical_payload->'creditedAnswers' is not distinct from item->'credited_answers'
   and r.canonical_payload->>'explanation' is not distinct from coalesce(item->>'explanation','')
   and r.canonical_payload->>'category' is not distinct from item->>'category'
   and r.canonical_payload->'coach' is not distinct from coalesce(source->'instructions'->'coach','null'::jsonb)
   and (p_kind='preview' or exists(select 1 from public.activity_item_responses a where a.assignment_id=p_source and a.student_id=p_owner
     and a.item_order=p_order and a.attempt_no=1 and a.response_text=r.canonical_payload->>'studentResponse' and a.verdict=r.result->>'verdict')))
  into first_confirmed;
  if not first_confirmed then return null; end if;
 end if;
 canonical:=jsonb_build_object('statement',item->>'prompt','creditedAnswers',item->'credited_answers',
  'explanation',coalesce(item->>'explanation',''),'category',item->>'category','coach',source->'instructions'->'coach',
  'studentResponse',p_response,'attemptNo',p_attempt,'sourceKind',p_kind,'sourceId',p_source,'itemOrder',p_order,
  'firstAttemptConfirmed',first_confirmed);
 -- Press checklists are authored in the trusted explanation (same numbered
 -- separators as parsePress). Never accept an independent client checklist.
 trusted_ideas:=item->'ideas';
 if trusted_ideas is null and position('the big ideas' in lower(coalesce(item->>'explanation','')))>0 then
  select jsonb_agg(jsonb_build_object('n',m[1]::integer,'text',regexp_replace(btrim(m[2]),'[[:space:]]*[.]$','')) order by m[1]::integer)
   into trusted_ideas from regexp_matches(regexp_replace(item->>'explanation','[.][[:space:]]*Named traps:.*$','','i'),'[(]([0-9])[)][[:space:]]*([^·]+?)(?=[[:space:]]*·|$)','g') m;
 end if;
 if trusted_ideas is not null then
  if jsonb_typeof(trusted_ideas) is distinct from 'array' or jsonb_array_length(trusted_ideas) not between 1 and 100
   or exists(select 1 from jsonb_array_elements(trusted_ideas) idea where jsonb_typeof(idea) is distinct from 'object'
     or jsonb_typeof(idea->'n') is distinct from 'number' or coalesce(idea->>'n','') !~ '^[1-9][0-9]{0,5}$' or jsonb_typeof(idea->'text') is distinct from 'string'
     or length(btrim(idea->>'text'))<1 or length(idea->>'text')>2000)
   or (select count(*) from jsonb_array_elements(trusted_ideas))<>(select count(distinct idea->>'n') from jsonb_array_elements(trusted_ideas) idea) then return null; end if;
  canonical:=canonical||jsonb_build_object('ideas',trusted_ideas);
 end if;
 if length(canonical::text)>64000 then return null; end if;
 return canonical;
end $$;

create function public.activity_ai_reply_v1(p_request uuid,p_receipt public.activity_ai_receipts_v1,p_status text,p_http integer,p_code text)
returns jsonb language sql set search_path=pg_catalog,public as $$
 select jsonb_strip_nulls(jsonb_build_object('ok',p_status in ('reserved','cached','dispatched','completed'),
  'status',p_status,'httpStatus',p_http,'code',p_code,'requestId',p_request,'receiptId',p_receipt.id,
  'claimId',case when p_status='reserved' then p_receipt.claim_id end,
  'leaseExpiresAt',case when p_status in ('reserved','in_flight') then p_receipt.lease_expires_at end,
  'payload',case when p_status in ('reserved','dispatched') then p_receipt.canonical_payload end,
  'result',case when p_status in ('cached','completed') then p_receipt.result end,
  'retryAfterSeconds',case when p_status='in_flight' then greatest(1,ceil(extract(epoch from p_receipt.lease_expires_at-clock_timestamp())))::integer end));
$$;

create function public.begin_activity_ai_request_v1(p_owner_id uuid,p_request_id uuid,p_source_kind text,p_source_id uuid,p_item_order integer,p_student_response text,p_attempt_no integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.activity_ai_receipts_v1; k public.activity_ai_request_keys_v1; c public.activity_ai_configuration_v1;
 payload jsonb; digest text; at_time timestamptz; minute_start timestamptz; day_start timestamptz; active_count integer;
begin
 if p_owner_id is null or p_request_id is null or p_source_id is null or p_item_order is null or p_item_order<1
  or p_source_kind is null or p_source_kind not in ('assignment','preview') or p_attempt_no is null or p_attempt_no not between 1 and 2
  or p_student_response is null or length(btrim(p_student_response))<1 or length(p_student_response)>10000 or octet_length(p_student_response)>40000 then
  return public.activity_ai_reply_v1(p_request_id,r,'denied',422,'invalid_request'); end if;
 perform pg_advisory_xact_lock(hashtextextended('activity-ai-global-v1',0));
 perform pg_advisory_xact_lock(hashtextextended('activity-ai-owner-v1:'||p_owner_id::text,0));
 payload:=public.activity_ai_source_v1(p_owner_id,p_source_kind,p_source_id,p_item_order,p_student_response,p_attempt_no);
 if payload is null then return public.activity_ai_reply_v1(p_request_id,r,'denied',403,'source_unavailable'); end if;
 digest:=encode(sha256(convert_to(payload::text,'UTF8')),'hex');
 select * into k from public.activity_ai_request_keys_v1 where request_id=p_request_id;
 if found then
  if k.owner_id<>p_owner_id or k.payload_sha256<>digest then return public.activity_ai_reply_v1(p_request_id,r,'denied',409,'request_conflict'); end if;
  select * into r from public.activity_ai_receipts_v1 where id=k.receipt_id for update;
 else
  select * into r from public.activity_ai_receipts_v1 where owner_id=p_owner_id and payload_sha256=digest for update;
  if found then insert into public.activity_ai_request_keys_v1 values(p_request_id,p_owner_id,r.id,digest,clock_timestamp()); end if;
 end if;
 if r.id is not null and r.canonical_payload<>payload then return public.activity_ai_reply_v1(p_request_id,r,'denied',409,'request_conflict'); end if;
 if r.state='completed' then return public.activity_ai_reply_v1(p_request_id,r,'cached',200,'cached'); end if;
 if r.state='failed' then return public.activity_ai_reply_v1(p_request_id,r,'failed',502,'request_failed'); end if;
 at_time:=clock_timestamp();
 if r.state in ('dispatched','uncertain') then
  if r.state='dispatched' and r.lease_expires_at<=at_time then update public.activity_ai_receipts_v1 set state='uncertain' where id=r.id returning * into r; end if;
  return public.activity_ai_reply_v1(p_request_id,r,case when r.state='uncertain' then 'uncertain' else 'in_flight' end,409,case when r.state='uncertain' then 'dispatch_uncertain' else 'request_in_flight' end);
 end if;
 if r.state='reserved' and r.lease_expires_at>at_time then return public.activity_ai_reply_v1(p_request_id,r,'in_flight',409,'request_in_flight'); end if;
 select * into c from public.activity_ai_configuration_v1 where singleton for share;
 if not coalesce(c.enabled,false) then return public.activity_ai_reply_v1(p_request_id,r,'denied',503,'contract_disabled'); end if;
 -- Unknown dispatched outcomes count against concurrency until explicitly
 -- finished by the original claim; they never expire into an automatic retry.
 update public.activity_ai_receipts_v1 set state='uncertain' where owner_id=p_owner_id and state='dispatched' and lease_expires_at<=at_time;
 select count(*) into active_count from public.activity_ai_receipts_v1 where owner_id=p_owner_id
  and (state in ('dispatched','uncertain') or (state='reserved' and lease_expires_at>at_time));
 if active_count>=c.actor_concurrency then return public.activity_ai_reply_v1(p_request_id,r,'denied',429,'concurrency_limited'); end if;
 if r.id is not null then
  update public.activity_ai_receipts_v1 set claim_id=gen_random_uuid(),lease_expires_at=at_time+interval '30 seconds' where id=r.id returning * into r;
  return public.activity_ai_reply_v1(p_request_id,r,'reserved',200,'reserved');
 end if;
 minute_start:=date_trunc('minute',at_time at time zone 'UTC') at time zone 'UTC';
 day_start:=date_trunc('day',at_time at time zone 'UTC') at time zone 'UTC';
 if coalesce((select admissions from public.activity_ai_budget_buckets_v1 where kind='actor-minute' and actor_key=p_owner_id::text and bucket_start=minute_start),0)>=c.actor_minute
  or coalesce((select admissions from public.activity_ai_budget_buckets_v1 where kind='actor-day' and actor_key=p_owner_id::text and bucket_start=day_start),0)>=c.actor_day
  or coalesce((select admissions from public.activity_ai_budget_buckets_v1 where kind='global-day' and actor_key='global' and bucket_start=day_start),0)>=c.global_day then
  return public.activity_ai_reply_v1(p_request_id,r,'denied',429,'rate_limited'); end if;
 insert into public.activity_ai_budget_buckets_v1 values('actor-minute',p_owner_id::text,minute_start,1),('actor-day',p_owner_id::text,day_start,1),('global-day','global',day_start,1)
 on conflict(kind,actor_key,bucket_start) do update set admissions=activity_ai_budget_buckets_v1.admissions+1;
 insert into public.activity_ai_receipts_v1(id,owner_id,source_kind,source_id,item_order,attempt_no,canonical_payload,payload_sha256,state,claim_id,lease_expires_at,admitted_at)
 values(p_request_id,p_owner_id,p_source_kind,p_source_id,p_item_order,p_attempt_no,payload,digest,'reserved',gen_random_uuid(),at_time+interval '30 seconds',at_time) returning * into r;
 insert into public.activity_ai_request_keys_v1 values(p_request_id,p_owner_id,r.id,digest,at_time);
 return public.activity_ai_reply_v1(p_request_id,r,'reserved',200,'reserved');
end $$;

create function public.dispatch_activity_ai_request_v1(p_owner_id uuid,p_request_id uuid,p_claim_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.activity_ai_receipts_v1; payload jsonb; c public.activity_ai_configuration_v1;
begin
 perform pg_advisory_xact_lock(hashtextextended('activity-ai-global-v1',0));
 perform pg_advisory_xact_lock(hashtextextended('activity-ai-owner-v1:'||coalesce(p_owner_id::text,''),0));
 select r1.* into r from public.activity_ai_request_keys_v1 k join public.activity_ai_receipts_v1 r1 on r1.id=k.receipt_id
 where k.request_id=p_request_id and k.owner_id=p_owner_id for update of r1;
 if r.id is null or p_claim_id is null or r.claim_id<>p_claim_id then return public.activity_ai_reply_v1(p_request_id,r,'denied',409,'claim_conflict'); end if;
 payload:=public.activity_ai_source_v1(r.owner_id,r.source_kind,r.source_id,r.item_order,r.canonical_payload->>'studentResponse',r.attempt_no);
 if payload is null then return public.activity_ai_reply_v1(p_request_id,r,'denied',403,'source_unavailable'); end if;
 if payload<>r.canonical_payload then return public.activity_ai_reply_v1(p_request_id,r,'denied',409,'source_changed'); end if;
 if r.state='completed' then return public.activity_ai_reply_v1(p_request_id,r,'cached',200,'cached'); end if;
 if r.state in ('dispatched','uncertain') then
  if r.state='dispatched' and r.lease_expires_at<=clock_timestamp() then update public.activity_ai_receipts_v1 set state='uncertain' where id=r.id returning * into r; end if;
  return public.activity_ai_reply_v1(p_request_id,r,case when r.state='uncertain' then 'uncertain' else 'in_flight' end,409,'dispatch_not_repeatable'); end if;
 if r.state<>'reserved' or r.lease_expires_at<=clock_timestamp() then return public.activity_ai_reply_v1(p_request_id,r,'denied',409,'claim_expired'); end if;
 select * into c from public.activity_ai_configuration_v1 where singleton for share;
 if not coalesce(c.enabled,false) then return public.activity_ai_reply_v1(p_request_id,r,'denied',503,'contract_disabled'); end if;
 update public.activity_ai_receipts_v1 set state='dispatched',dispatched_at=clock_timestamp(),lease_expires_at=clock_timestamp()+interval '30 seconds'
 where id=r.id and state='reserved' and claim_id=p_claim_id returning * into r;
 return public.activity_ai_reply_v1(p_request_id,r,'dispatched',200,'dispatched');
end $$;

create function public.finish_activity_ai_request_v1(p_owner_id uuid,p_request_id uuid,p_claim_id uuid,p_result jsonb default null,p_failure_category text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.activity_ai_receipts_v1; payload jsonb; clean jsonb; coverage jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('activity-ai-global-v1',0));
 perform pg_advisory_xact_lock(hashtextextended('activity-ai-owner-v1:'||coalesce(p_owner_id::text,''),0));
 select r1.* into r from public.activity_ai_request_keys_v1 k join public.activity_ai_receipts_v1 r1 on r1.id=k.receipt_id
 where k.request_id=p_request_id and k.owner_id=p_owner_id for update of r1;
 if r.id is null or p_claim_id is null or r.claim_id<>p_claim_id then return public.activity_ai_reply_v1(p_request_id,r,'denied',409,'claim_conflict'); end if;
 if r.state='completed' then
  payload:=public.activity_ai_source_v1(r.owner_id,r.source_kind,r.source_id,r.item_order,r.canonical_payload->>'studentResponse',r.attempt_no);
  if payload is null then return public.activity_ai_reply_v1(p_request_id,r,'denied',403,'source_unavailable'); end if;
  if payload<>r.canonical_payload then return public.activity_ai_reply_v1(p_request_id,r,'denied',409,'source_changed'); end if;
  if p_failure_category is null and p_result=r.result then return public.activity_ai_reply_v1(p_request_id,r,'cached',200,'cached'); end if;
  return public.activity_ai_reply_v1(p_request_id,r,'denied',409,'finish_conflict'); end if;
 if r.state='failed' then return public.activity_ai_reply_v1(p_request_id,r,'failed',502,'request_failed'); end if;
 if r.state not in ('dispatched','uncertain') then return public.activity_ai_reply_v1(p_request_id,r,'denied',409,'not_dispatched'); end if;
 payload:=public.activity_ai_source_v1(r.owner_id,r.source_kind,r.source_id,r.item_order,r.canonical_payload->>'studentResponse',r.attempt_no);
 if payload is null then p_result:=null;p_failure_category:='access_revoked';
 elsif payload<>r.canonical_payload then p_result:=null;p_failure_category:='source_changed'; end if;
 if p_failure_category is not null then
  if p_result is not null or p_failure_category not in ('provider_error','timeout','malformed_result','transport_error','cancelled','access_revoked','source_changed','uncertain') then
   return public.activity_ai_reply_v1(p_request_id,r,'denied',422,'invalid_finish'); end if;
  update public.activity_ai_receipts_v1 set state=case when p_failure_category='uncertain' then 'uncertain' else 'failed' end,
   failure_category=p_failure_category,finished_at=case when p_failure_category='uncertain' then null else clock_timestamp() end where id=r.id returning * into r;
  return public.activity_ai_reply_v1(p_request_id,r,case when r.state='uncertain' then 'uncertain' else 'failed' end,502,case when r.state='uncertain' then 'dispatch_uncertain' else 'request_failed' end); end if;
 if jsonb_typeof(p_result) is distinct from 'object' or p_result->>'verdict' is null or p_result->>'verdict' not in ('correct','partial','incorrect')
  or jsonb_typeof(p_result->'feedback') is distinct from 'string' or length(btrim(p_result->>'feedback'))<1 or length(p_result->>'feedback')>2000
  or exists(select 1 from jsonb_object_keys(p_result) key where key not in ('verdict','feedback','covered')) then
  return public.activity_ai_reply_v1(p_request_id,r,'denied',422,'invalid_result'); end if;
 clean:=jsonb_build_object('verdict',p_result->>'verdict','feedback',p_result->>'feedback');
 if p_result ? 'covered' then
  if jsonb_typeof(p_result->'covered') is distinct from 'array' or jsonb_array_length(p_result->'covered')>100
    or exists(select 1 from jsonb_array_elements(p_result->'covered') v where jsonb_typeof(v)<>'number' or v::text !~ '^[1-9][0-9]{0,5}$')
    or jsonb_typeof(r.canonical_payload->'ideas') is distinct from 'array'
    or exists(select 1 from jsonb_array_elements(p_result->'covered') v where not exists(select 1 from jsonb_array_elements(r.canonical_payload->'ideas') idea where idea->'n'=v)) then
   return public.activity_ai_reply_v1(p_request_id,r,'denied',422,'invalid_coverage'); end if;
  -- Retain the validated envelope exactly, making identical finish retries
  -- replayable even if a service caller supplied repeated checklist numbers.
  clean:=clean||jsonb_build_object('covered',p_result->'covered');
 end if;
 update public.activity_ai_receipts_v1 set state='completed',result=clean,failure_category=null,finished_at=clock_timestamp() where id=r.id returning * into r;
 return public.activity_ai_reply_v1(p_request_id,r,'completed',200,'completed');
end $$;

revoke all on function public.activity_ai_source_v1(uuid,text,uuid,integer,text,integer),public.activity_ai_reply_v1(uuid,public.activity_ai_receipts_v1,text,integer,text),
public.begin_activity_ai_request_v1(uuid,uuid,text,uuid,integer,text,integer),public.dispatch_activity_ai_request_v1(uuid,uuid,uuid),public.finish_activity_ai_request_v1(uuid,uuid,uuid,jsonb,text)
from public,anon,authenticated,service_role;
grant execute on function public.begin_activity_ai_request_v1(uuid,uuid,text,uuid,integer,text,integer),public.dispatch_activity_ai_request_v1(uuid,uuid,uuid),public.finish_activity_ai_request_v1(uuid,uuid,uuid,jsonb,text) to service_role;
commit;
