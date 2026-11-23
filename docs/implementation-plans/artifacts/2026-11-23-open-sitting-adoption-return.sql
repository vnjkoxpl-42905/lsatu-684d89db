-- Optional SQL hardening for F2: include adoption fields on reopen branches of open_section_sitting_v1.
-- Do NOT run automatically; ask Joshua before applying.
-- Note: The client (src/lib/sectionCloseout.ts) already handles live SQL by querying
-- `standalone_section_sittings` (`adopted_from_record_id`, `adopted_revision`) when
-- `generation = 1` and `adopted` is omitted by the RPC reopen/stale branches.
-- Applying this function update removes that extra owner SELECT round-trip.

begin;

create or replace function public.open_section_sitting_v1(
  p_pool_key text,
  p_known_sitting_id uuid default null,
  p_restart boolean default false,
  p_expected_generation integer default null,
  p_legacy_record_id text default null,
  p_sitting_record_id text default null
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  latest public.standalone_section_sittings;
  known public.standalone_section_sittings;
  created public.standalone_section_sittings;
  legacy public.bootcamp_kv;
  next_gen integer;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_pool_key is null or p_pool_key !~ '^drill::(section::pt[0-9]+-s[0-9]+|assignment::[A-Za-z0-9-]+)$' then
    raise exception 'bad pool key' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text || '|' || p_pool_key, 0));

  select * into latest from public.standalone_section_sittings
   where user_id = uid and pool_key = p_pool_key order by generation desc limit 1;

  if p_restart then
    if p_expected_generation is null then raise exception 'restart needs a generation' using errcode = '22023'; end if;
    if latest.id is not null and p_expected_generation < latest.generation then
      return jsonb_build_object(
        'status', case when latest.state = 'closed' then 'closed' else 'open' end,
        'sitting_id', latest.id,
        'generation', latest.generation,
        'history_id', latest.history_id,
        'adopted', latest.adopted_from_record_id is not null,
        'adopted_revision', latest.adopted_revision
      );
    end if;
    if latest.id is not null and latest.state = 'open' then
      update public.standalone_section_sittings set state = 'abandoned' where id = latest.id and state = 'open';
    end if;
  else
    if p_known_sitting_id is not null then
      select * into known from public.standalone_section_sittings where id = p_known_sitting_id and user_id = uid;
      if known.id is not null and known.id = latest.id then
        return jsonb_build_object(
          'status', known.state,
          'sitting_id', known.id,
          'generation', known.generation,
          'history_id', known.history_id,
          'adopted', known.adopted_from_record_id is not null,
          'adopted_revision', known.adopted_revision
        );
      end if;
      if latest.id is not null then
        return jsonb_build_object(
          'status', 'stale',
          'latest_state', latest.state,
          'sitting_id', latest.id,
          'generation', latest.generation,
          'history_id', latest.history_id,
          'adopted', latest.adopted_from_record_id is not null,
          'adopted_revision', latest.adopted_revision
        );
      end if;
    elsif latest.id is not null and latest.state = 'open' then
      return jsonb_build_object(
        'status', 'open',
        'sitting_id', latest.id,
        'generation', latest.generation,
        'history_id', null,
        'adopted', latest.adopted_from_record_id is not null,
        'adopted_revision', latest.adopted_revision
      );
    end if;
  end if;

  next_gen := coalesce(latest.generation, 0) + 1;
  insert into public.standalone_section_sittings(user_id, pool_key, generation)
    values (uid, p_pool_key, next_gen) returning * into created;

  if not p_restart and next_gen = 1 and p_legacy_record_id is not null and p_sitting_record_id is not null then
    select * into legacy from public.bootcamp_kv
     where user_id = uid and table_name = 'practice_sessions' and record_id = p_legacy_record_id;
    if legacy.record_id is not null and coalesce(legacy.data->>'status', '') <> 'completed' then
      insert into public.bootcamp_kv(user_id, table_name, record_id, data, updated_at)
        values (
          uid,
          'practice_sessions',
          p_sitting_record_id,
          legacy.data || jsonb_build_object(
            'id', p_sitting_record_id,
            'pool_slug', case
              when position('#' in p_pool_key) > 0 then p_pool_key
              else p_pool_key || '#adopted-g1'
            end,
            'completion_id', case
              when position('#' in p_pool_key) > 0 then p_pool_key
              else p_pool_key || '#adopted-g1'
            end
          ),
          legacy.updated_at
        )
        on conflict do nothing;
      update public.standalone_section_sittings
         set adopted_from_record_id = p_legacy_record_id, adopted_revision = legacy.updated_at
       where id = created.id returning * into created;
    end if;
  end if;

  return jsonb_build_object(
    'status', 'open',
    'sitting_id', created.id,
    'generation', created.generation,
    'history_id', null,
    'adopted', created.adopted_from_record_id is not null,
    'adopted_revision', created.adopted_revision
  );
end $$;

commit;
