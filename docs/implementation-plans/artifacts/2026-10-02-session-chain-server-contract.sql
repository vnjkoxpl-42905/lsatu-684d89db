-- Session chain server contract (#176). PROPOSAL ARTIFACT: not a migration.
--
-- Not applied by this PR. Apply only through the approved Lovable route after
-- review, then run the post-apply probe in
-- docs/implementation-plans/2026-10-02-schedule-176-verification.md.
-- Rollback: 2026-10-02-session-chain-server-contract-rollback.sql.
--
-- What it does (additive only; no column, policy or existing function changes):
--   1. Records any session_chain members that already exist, so they are
--      never shown as verified. Nothing is deleted or rewritten.
--   2. A BEFORE INSERT OR UPDATE trigger on classroom_items rejects any change
--      to metadata_json->'session_chain' made outside the function below, for
--      every role (students, admins' direct updates, service role). Writes
--      that carry the member through unchanged (note read state, bootcamp
--      progress, status syncs) are unaffected.
--   3. set_classroom_item_session_link(): admin-only, ownership-, phase- and
--      status-checked, compare-and-swap on updated_at, and it changes only that
--      one member. It stamps linked_by / linked_at and returns an acknowledgment.
--
-- Teacher authority: the app's only roles are app_role 'admin' and 'user'; the
-- teacher is the admin (has_role(auth.uid(), 'admin')), as in
-- classroom_items_admin_all. There is no per-teacher roster to consult.

begin;

-- Preconditions: fail closed if the schema is not the one this was written for.
do $pre$
begin
  if to_regclass('public.classroom_items') is null
     or to_regclass('public.booking_pass_redemptions') is null
     or to_regclass('public.booking_passes') is null
     or to_regclass('public.single_session_bookings') is null then
    raise exception 'session_chain contract: required tables missing (reviewed baseline mismatch)';
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'classroom_items' and column_name = 'metadata_json')
     or not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'classroom_items' and column_name = 'updated_at')
     or not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'booking_passes' and column_name = 'student_id')
     or not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'single_session_bookings' and column_name = 'user_id') then
    raise exception 'session_chain contract: required columns missing (reviewed baseline mismatch)';
  end if;
  if to_regprocedure('public.has_role(uuid, public.app_role)') is null then
    raise exception 'session_chain contract: public.has_role(uuid, app_role) missing (reviewed baseline mismatch)';
  end if;
end
$pre$;

-- 1. Pre-existing members: recorded, never trusted as teacher-authored.
create table if not exists public.classroom_item_session_link_legacy (
  item_id uuid primary key references public.classroom_items(id) on delete cascade,
  snapshot jsonb not null,
  recorded_at timestamptz not null default now()
);
alter table public.classroom_item_session_link_legacy enable row level security;
revoke all on public.classroom_item_session_link_legacy from public, anon, authenticated;
grant select on public.classroom_item_session_link_legacy to authenticated;
drop policy if exists classroom_item_session_link_legacy_admin_read on public.classroom_item_session_link_legacy;
create policy classroom_item_session_link_legacy_admin_read on public.classroom_item_session_link_legacy
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

insert into public.classroom_item_session_link_legacy (item_id, snapshot)
select id, metadata_json -> 'session_chain'
from public.classroom_items
where metadata_json ? 'session_chain'
on conflict (item_id) do nothing;

-- 2. Guard: session_chain changes only inside set_classroom_item_session_link.
create or replace function public.guard_classroom_items_session_chain()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(current_setting('lsatu.session_chain_writer', true), '') = 'set_classroom_item_session_link' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.metadata_json ? 'session_chain' then
      raise exception 'classroom_items: session_chain can only be set through set_classroom_item_session_link'
        using errcode = '42501';
    end if;
    return new;
  end if;
  if (new.metadata_json -> 'session_chain') is distinct from (old.metadata_json -> 'session_chain') then
    raise exception 'classroom_items: session_chain can only be changed through set_classroom_item_session_link'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists classroom_items_session_chain_guard on public.classroom_items;
create trigger classroom_items_session_chain_guard
  before insert or update on public.classroom_items
  for each row execute function public.guard_classroom_items_session_chain();

-- 3. The only writer.
create or replace function public.set_classroom_item_session_link(
  _item_id uuid,
  _student_id uuid,
  _expected_updated_at timestamptz,
  _booking_source text,
  _booking_id uuid,
  _phase text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor uuid := auth.uid();
  _item public.classroom_items%rowtype;
  _booking_student uuid;
  _booking_status text;
  _current jsonb;
  _target jsonb;
  _next jsonb;
  _work_types text[] := array['drill', 'homework', 'activity', 'bootcamp_module', 'practice_test', 'note'];
  _recap_types text[] := array['session_recap', 'smartboard_recap'];
begin
  -- Actor comes from the verified JWT, never from a parameter.
  if _actor is null or not public.has_role(_actor, 'admin') then
    raise exception 'set_classroom_item_session_link: admin only' using errcode = '42501';
  end if;

  select * into _item from public.classroom_items where id = _item_id for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if _item.student_id is distinct from _student_id then
    raise exception 'set_classroom_item_session_link: item does not belong to that student' using errcode = '42501';
  end if;
  _current := _item.metadata_json -> 'session_chain';

  -- A null phase removes the link. Otherwise validate the full target.
  if _phase is null then
    _target := null;
  else
    if _booking_source not in ('redemption', 'single_session') or _booking_id is null then
      raise exception 'set_classroom_item_session_link: unknown booking source' using errcode = '22023';
    end if;
    if _phase not in ('preparation', 'recap', 'follow_up') then
      raise exception 'set_classroom_item_session_link: unknown phase' using errcode = '22023';
    end if;
    if (_phase = 'recap' and not (_item.type = any(_recap_types)))
       or (_phase <> 'recap' and not (_item.type = any(_work_types))) then
      raise exception 'set_classroom_item_session_link: % cannot be linked as %', _item.type, _phase using errcode = '22023';
    end if;
    if _item.status = 'archived' then
      raise exception 'set_classroom_item_session_link: archived items cannot be linked' using errcode = '22023';
    end if;

    if _booking_source = 'redemption' then
      select bp.student_id, r.status into _booking_student, _booking_status
      from public.booking_pass_redemptions r
      join public.booking_passes bp on bp.id = r.booking_pass_id
      where r.id = _booking_id;
    else
      select s.user_id, s.status into _booking_student, _booking_status
      from public.single_session_bookings s
      where s.id = _booking_id;
    end if;
    if _booking_student is null or _booking_student <> _item.student_id then
      raise exception 'set_classroom_item_session_link: booking does not belong to that student' using errcode = '42501';
    end if;
    if _booking_status <> 'booked' then
      raise exception 'set_classroom_item_session_link: only booked appointments take new links' using errcode = '22023';
    end if;

    _target := jsonb_build_object(
      'version', 1,
      'booking_source', _booking_source,
      'booking_id', _booking_id::text,
      'phase', _phase
    );
  end if;

  -- Already in the requested state (ignoring stamps): acknowledge, no write.
  if (_target is null and _current is null)
     or (_target is not null and _current is not null
         and _current - 'linked_by' - 'linked_at' = _target
         and not exists (select 1 from public.classroom_item_session_link_legacy l where l.item_id = _item.id)) then
    return jsonb_build_object('status', 'unchanged', 'item_id', _item.id, 'updated_at', _item.updated_at,
                              'session_chain', _current);
  end if;

  -- Compare-and-swap: the caller must have seen the row as it is now.
  if _expected_updated_at is distinct from _item.updated_at then
    return jsonb_build_object('status', 'conflict', 'item_id', _item.id, 'updated_at', _item.updated_at,
                              'session_chain', _current);
  end if;

  if _target is null then
    _next := _item.metadata_json - 'session_chain';
  else
    _next := jsonb_set(_item.metadata_json, '{session_chain}',
               _target || jsonb_build_object('linked_by', _actor::text, 'linked_at', now()), true);
  end if;

  perform set_config('lsatu.session_chain_writer', 'set_classroom_item_session_link', true);
  update public.classroom_items set metadata_json = _next where id = _item.id
    returning * into _item;
  perform set_config('lsatu.session_chain_writer', '', true);

  -- A link written here is teacher-authored; it no longer counts as legacy.
  delete from public.classroom_item_session_link_legacy where item_id = _item.id;

  return jsonb_build_object('status', 'saved', 'item_id', _item.id, 'updated_at', _item.updated_at,
                            'session_chain', _item.metadata_json -> 'session_chain');
end;
$$;

revoke all on function public.set_classroom_item_session_link(uuid, uuid, timestamptz, text, uuid, text) from public, anon;
grant execute on function public.set_classroom_item_session_link(uuid, uuid, timestamptz, text, uuid, text) to authenticated;

commit;
