-- Structured relationship keys: validate the complete trusted key and its
-- pair-grading rules, keep them in canonical receipt identity, and bind a
-- second attempt to a first attempt graded under the identical key.
create or replace function public.activity_ai_answer_key_valid_v1(key jsonb)
returns boolean language sql immutable set search_path=pg_catalog,public as $$
 select jsonb_typeof(key)='object' and length(key::text)<=16000
  and jsonb_typeof(key->'relationships')='array' and jsonb_array_length(key->'relationships') between 1 and 3
  and (select count(distinct r->>'type')=count(*) from jsonb_array_elements(key->'relationships') r)
  and not exists(select 1 from jsonb_array_elements(key->'relationships') r where
    jsonb_typeof(r) is distinct from 'object'
    or coalesce(r->>'type','') not in ('conditional','causal','comparative')
    or jsonb_typeof(r->'indicators') is distinct from 'array' or jsonb_array_length(r->'indicators')<1
    or exists(select 1 from jsonb_array_elements(r->'indicators') i where jsonb_typeof(i) is distinct from 'string' or length(btrim(i#>>'{}'))<1 or length(i#>>'{}')>200)
    or jsonb_typeof(r->'connects') is distinct from 'string' or length(btrim(r->>'connects'))<1 or length(r->>'connects')>2000
    or jsonb_typeof(r->'why') is distinct from 'string' or length(btrim(r->>'why'))<1 or length(r->>'why')>2000
    or (r ? 'required_parts' and (jsonb_typeof(r->'required_parts') is distinct from 'array' or jsonb_array_length(r->'required_parts')<1
      or exists(select 1 from jsonb_array_elements(r->'required_parts') p where jsonb_typeof(p) is distinct from 'array' or jsonb_array_length(p)<2
        or exists(select 1 from jsonb_array_elements(p) x where jsonb_typeof(x) is distinct from 'string' or length(btrim(x#>>'{}'))<1 or length(x#>>'{}')>200)))))
  and jsonb_typeof(key->'traps')='array'
  and not exists(select 1 from jsonb_array_elements(key->'traps') t where jsonb_typeof(t) is distinct from 'string' or length(btrim(t#>>'{}'))<1 or length(t#>>'{}')>2000)
  and (key->'context_benchmark' is null or key->'context_benchmark'='null'::jsonb
    or (jsonb_typeof(key->'context_benchmark')='string' and length(btrim(key->>'context_benchmark'))>=1 and length(key->>'context_benchmark')<=2000));
$$;
revoke all on function public.activity_ai_answer_key_valid_v1(jsonb) from public, anon, authenticated;

create or replace function public.activity_ai_source_v1(p_owner uuid,p_kind text,p_source uuid,p_order integer,p_response text,p_attempt integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare canonical jsonb; key jsonb; rules jsonb;
begin
 canonical:=public.activity_ai_source_base_v1(p_owner,p_kind,p_source,p_order,p_response,p_attempt);
 if canonical is null then return null; end if;
 -- Read the key from the same authorized source the base just locked: the
 -- student's own assignment snapshot, never the current activity definition.
 if p_kind='assignment' then
  select v->'answer_key' into key from public.activity_assignments a, jsonb_array_elements(a.items) v
   where a.id=p_source and a.student_id=p_owner and v->>'order'=p_order::text limit 1;
 else
  select v->'answer_key' into key from public.activities a, jsonb_array_elements(a.items) v
   where a.id=p_source and a.created_by=p_owner and v->>'order'=p_order::text limit 1;
 end if;
 rules:=canonical->'coach'->'grading_rubric';
 if rules is not null and rules<>'null'::jsonb then
  if jsonb_typeof(rules) is distinct from 'array' or jsonb_array_length(rules) not between 1 and 50
   or exists(select 1 from jsonb_array_elements(rules) v where jsonb_typeof(v) is distinct from 'string' or length(btrim(v#>>'{}'))<1 or length(v#>>'{}')>4000)
  then return null; end if;
 end if;
 if key is not null and key<>'null'::jsonb then
  if not public.activity_ai_answer_key_valid_v1(key) then return null; end if;
  if rules is null or rules='null'::jsonb then return null; end if;
  canonical:=canonical||jsonb_build_object('answerKey',key);
 else
  key:=null;
 end if;
 -- Second attempt: one completed first attempt must match every graded
 -- field, including the exact key (absent for legacy items).
 if p_attempt=2 and not exists(select 1 from public.activity_ai_receipts_v1 r where r.owner_id=p_owner and r.source_kind=p_kind
   and r.source_id=p_source and r.item_order=p_order and r.attempt_no=1 and r.state='completed'
   and r.canonical_payload->'statement' is not distinct from canonical->'statement'
   and r.canonical_payload->'creditedAnswers' is not distinct from canonical->'creditedAnswers'
   and r.canonical_payload->'explanation' is not distinct from canonical->'explanation'
   and r.canonical_payload->'category' is not distinct from canonical->'category'
   and r.canonical_payload->'coach' is not distinct from canonical->'coach'
   and r.canonical_payload->'answerKey' is not distinct from key
   and (p_kind='preview' or exists(select 1 from public.activity_item_responses a where a.assignment_id=p_source and a.student_id=p_owner
     and a.item_order=p_order and a.attempt_no=1 and a.response_text=r.canonical_payload->>'studentResponse' and a.verdict=r.result->>'verdict'))) then
  return null;
 end if;
 if length(canonical::text)>64000 then return null; end if;
 return canonical;
end $$;
revoke all on function public.activity_ai_source_v1(uuid,text,uuid,integer,text,integer) from public, anon, authenticated;
