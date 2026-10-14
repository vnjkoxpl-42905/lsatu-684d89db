alter function public.activity_ai_source_v1(uuid,text,uuid,integer,text,integer) rename to activity_ai_source_base_v1;
revoke all on function public.activity_ai_source_base_v1(uuid,text,uuid,integer,text,integer) from public, anon, authenticated;

create function public.activity_ai_source_v1(p_owner uuid,p_kind text,p_source uuid,p_order integer,p_response text,p_attempt integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare canonical jsonb; key jsonb;
begin
 canonical:=public.activity_ai_source_base_v1(p_owner,p_kind,p_source,p_order,p_response,p_attempt);
 if canonical is null then return null; end if;
 if p_kind='assignment' then
  select v->'answer_key' into key from public.activity_assignments a, jsonb_array_elements(a.items) v
   where a.id=p_source and a.student_id=p_owner and v->>'order'=p_order::text limit 1;
 else
  select v->'answer_key' into key from public.activities a, jsonb_array_elements(a.items) v
   where a.id=p_source and a.created_by=p_owner and v->>'order'=p_order::text limit 1;
 end if;
 if key is not null and key<>'null'::jsonb then
  if jsonb_typeof(key) is distinct from 'object' or jsonb_typeof(key->'relationships') is distinct from 'array' or length(key::text)>16000 then return null; end if;
  canonical:=canonical||jsonb_build_object('answerKey',key);
 end if;
 if length(canonical::text)>64000 then return null; end if;
 return canonical;
end $$;
revoke all on function public.activity_ai_source_v1(uuid,text,uuid,integer,text,integer) from public, anon, authenticated;