-- Post-apply probe for 2026-10-02-session-chain-server-contract.sql.
-- Read-only: its one test write is rolled back inside a sub-block either way.
-- Safe to run before the contract too (reports what is missing).
create temp table if not exists _session_chain_probe(check_name text, ok boolean, detail text);
truncate _session_chain_probe;
do $probe$
declare
  _fn regprocedure := to_regprocedure('public.set_classroom_item_session_link(uuid,uuid,timestamptz,text,uuid,text)');
  _legacy regclass := to_regclass('public.classroom_item_session_link_legacy');
  _id uuid;
  _n bigint;
begin
  insert into _session_chain_probe values ('1 writer function exists', _fn is not null, null);
  insert into _session_chain_probe values ('2 guard trigger exists',
    exists (select 1 from pg_trigger where tgname = 'classroom_items_session_chain_guard'
            and tgrelid = 'public.classroom_items'::regclass and not tgisinternal), null);
  insert into _session_chain_probe values ('3 legacy table exists with RLS',
    _legacy is not null and coalesce((select relrowsecurity from pg_class where oid = _legacy), false), null);
  insert into _session_chain_probe values ('4 anon cannot execute writer',
    _fn is not null and not has_function_privilege('anon', _fn, 'execute'), null);
  insert into _session_chain_probe values ('5 authenticated can execute writer',
    _fn is not null and has_function_privilege('authenticated', _fn, 'execute'), null);
  if _legacy is not null then
    execute 'select count(*) from public.classroom_item_session_link_legacy' into _n;
    insert into _session_chain_probe values ('6 legacy links recorded (expected 0)', _n = 0, _n::text);
  else
    insert into _session_chain_probe values ('6 legacy links recorded (expected 0)', false, 'table missing');
  end if;
  select count(*) into _n from public.classroom_items where metadata_json ? 'session_chain';
  insert into _session_chain_probe values ('7 items carrying session_chain (expected 0)', _n = 0, _n::text);

  select id into _id from public.classroom_items limit 1;
  if _id is null then
    insert into _session_chain_probe values ('8 guard blocks direct write', null, 'no classroom_items rows to test');
  else
    begin
      update public.classroom_items
        set metadata_json = metadata_json || '{"session_chain":{"probe":true}}'::jsonb
        where id = _id;
      raise exception 'probe_reached_unguarded_write';
    exception
      when insufficient_privilege then
        insert into _session_chain_probe values ('8 guard blocks direct write', true, sqlerrm);
      when others then
        insert into _session_chain_probe values ('8 guard blocks direct write', false, sqlerrm);
    end;
  end if;
end
$probe$;
select check_name, ok, detail from _session_chain_probe order by check_name;
