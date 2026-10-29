-- Additive only. No existing record is rewritten, removed or backfilled.
begin;
set local lock_timeout='3s';
set local statement_timeout='45s';
create function public.preserve_bootcamp_module_progress_v1() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
declare field text; before_values jsonb; next_values jsonb; merged_values jsonb;
begin
  if OLD.table_name<>'module_progress' and NEW.table_name<>'module_progress' then return NEW; end if;
  if row(NEW.user_id,NEW.table_name,NEW.record_id) is distinct from row(OLD.user_id,OLD.table_name,OLD.record_id) then
    raise exception 'Module progress source identity is retained' using errcode='42501'; end if;
  if jsonb_typeof(OLD.data) is distinct from 'object' or jsonb_typeof(NEW.data) is distinct from 'object'
    or NEW.data->>'user_id' is distinct from NEW.user_id::text
    or NEW.data->>'id' is distinct from NEW.record_id
    or row(NEW.data->>'user_id',NEW.data->>'id') is distinct from row(OLD.data->>'user_id',OLD.data->>'id') then
    raise exception 'Module progress record identity is invalid' using errcode='42501'; end if;
  for field in select distinct name from (
    select jsonb_object_keys(OLD.data) name union all select jsonb_object_keys(NEW.data) name
  ) fields where left(name,10)='completed_' or left(name,9)='unlocked_' loop
    before_values:=coalesce(OLD.data->field,'[]'::jsonb); next_values:=coalesce(NEW.data->field,'[]'::jsonb);
    if jsonb_typeof(before_values) is distinct from 'array' or jsonb_typeof(next_values) is distinct from 'array' then
      raise exception 'Module progress lists must be arrays' using errcode='22023'; end if;
    if exists(select 1 from jsonb_array_elements(before_values||next_values) value where jsonb_typeof(value) is distinct from 'string') then
      raise exception 'Module progress lists must contain strings' using errcode='22023'; end if;
    select coalesce(jsonb_agg(value order by first_seen),'[]'::jsonb) into merged_values from (
      select value,min(ordinality) first_seen from jsonb_array_elements(before_values||next_values) with ordinality group by value
    ) deduped;
    NEW.data:=jsonb_set(NEW.data,array[field],merged_values,true);
  end loop;
  NEW.data:=OLD.data||NEW.data;
  return NEW;
end $$;
create trigger preserve_bootcamp_module_progress_v1 before update on public.bootcamp_kv
  for each row execute function public.preserve_bootcamp_module_progress_v1();
revoke all on function public.preserve_bootcamp_module_progress_v1() from public,authenticated,anon;
commit;
