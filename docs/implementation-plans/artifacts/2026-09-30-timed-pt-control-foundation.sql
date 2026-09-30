-- DRAFT, PHASE 1 ONLY. No public timed writer, adoption or client activation.
-- Installing this alone does not close child-write races. Managed-role CREATE
-- ROLE/ownership support must be confirmed before any deployment is approved.
begin;
do $$ begin
  if not exists(select 1 from pg_roles where rolname = 'timed_pt_executor') then
    create role timed_pt_executor nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
  if exists(select 1 from pg_roles where rolname = 'timed_pt_executor' and
    (rolcanlogin or rolsuper or rolcreatedb or rolcreaterole or rolbypassrls)) or
    pg_has_role('authenticated', 'timed_pt_executor', 'MEMBER') or
    pg_has_role('anon', 'timed_pt_executor', 'MEMBER') then
    raise exception 'Unsafe timed executor role configuration';
  end if;
end $$;
grant usage on schema public to timed_pt_executor;

-- Managed postgres has auth USAGE but cannot grant that schema privilege.
-- Keep this narrow helper owned by the installing migration role (not executor).
-- It delegates only the actual auth.uid() identity semantic, never a progress
-- write or caller-supplied actor. Executor callers need no auth schema USAGE.
create function public.timed_pt_actor_v1() returns uuid
language sql stable security definer set search_path=pg_catalog,public as $$
  select auth.uid()
$$;
revoke all on function public.timed_pt_actor_v1() from public,anon,authenticated;
grant execute on function public.timed_pt_actor_v1() to timed_pt_executor;

create function public.timed_pt_leg_definitions_v1(p_legs jsonb) returns jsonb
language sql immutable strict set search_path = pg_catalog as $$
  select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'kind', leg->'kind', 'section', leg->'section', 'questionCount', leg->'questionCount',
    'passageIds', leg->'passageIds')) order by ordinal)
  from jsonb_array_elements(p_legs) with ordinality as e(leg,ordinal)
$$;

alter table public.practice_test_runs
  add column timed_contract_version smallint,
  add column timed_writer_epoch bigint,
  add column timed_phase text,
  add column timed_elapsed_ms bigint,
  add column timed_running_anchor timestamptz,
  add column timed_lease_expires_at timestamptz,
  add column timed_clock_leg integer,
  add column timed_frozen_legs jsonb,
  add column timed_lease_ms integer;

-- No guessed lease constant or historical backfill. A future trusted creation
-- RPC must read an approved server configuration and freeze it into this row.
alter table public.practice_test_runs add constraint timed_pt_control_v1 check (
  (timed_contract_version is null and timed_writer_epoch is null and timed_phase is null
    and timed_elapsed_ms is null and timed_running_anchor is null and timed_lease_expires_at is null
    and timed_clock_leg is null and timed_frozen_legs is null and timed_lease_ms is null)
  or
  (timed_contract_version = 1 and revision >= 0 and timed_writer_epoch >= 1
    and timed_phase in ('ready','leg-running','leg-paused','closeout-pending','break-running','break-paused','complete','abandoned')
    and timed_elapsed_ms >= 0 and timed_lease_ms > 0
    and jsonb_typeof(timed_frozen_legs) = 'array' and jsonb_array_length(timed_frozen_legs) > 0
    and jsonb_array_length(timed_frozen_legs) = jsonb_array_length(legs)
    and timed_frozen_legs = public.timed_pt_leg_definitions_v1(legs)
    and current_leg between 0 and jsonb_array_length(timed_frozen_legs)
    and break_after_leg > 0 and break_after_leg < jsonb_array_length(timed_frozen_legs)
    and (section_seconds > 0 or (pace = 'untimed' and section_seconds is null))
    and ((timed_phase in ('leg-running','break-running') and timed_running_anchor is not null
          and timed_lease_expires_at is not null and timed_lease_expires_at > timed_running_anchor)
      or (timed_phase not in ('leg-running','break-running') and timed_running_anchor is null
          and timed_lease_expires_at is null))
    and ((timed_phase in ('leg-running','leg-paused','closeout-pending')
          and timed_clock_leg = current_leg and current_leg < jsonb_array_length(timed_frozen_legs))
      or (timed_phase in ('break-running','break-paused') and timed_clock_leg is null
          and current_leg = break_after_leg and not break_taken)
      or (timed_phase in ('ready','complete','abandoned') and timed_clock_leg is null))
    and ((timed_phase = 'complete' and status = 'complete' and current_leg = jsonb_array_length(timed_frozen_legs)
          and completed_at is not null)
      or (timed_phase = 'abandoned' and status = 'abandoned')
      or (timed_phase not in ('complete','abandoned') and status = 'in-progress' and completed_at is null))
  ) is true
);

create table public.timed_pt_receipts_v1 (
  owner_id uuid not null references auth.users(id),
  work_kind text not null check (work_kind = 'practice-test'),
  work_id text not null,
  command_id uuid not null,
  canonical_command jsonb not null check (jsonb_typeof(canonical_command) = 'object'),
  command_hash text not null check(command_hash ~ '^[a-f0-9]{64}$'),
  committed_revision integer not null check (committed_revision >= 0),
  committed_result jsonb not null check (jsonb_typeof(committed_result) = 'object'),
  committed_at timestamptz not null default now(),
  primary key(owner_id, work_kind, work_id, command_id),
  foreign key(work_id, owner_id) references public.practice_test_runs(id,user_id)
);

create table public.timed_pt_lr_bindings_v1 (
  owner_id uuid not null references auth.users(id),
  run_id text not null,
  leg_index integer not null check (leg_index >= 0),
  namespace text not null check (namespace = 'practice_sessions'),
  record_id text not null,
  source_key text not null,
  frozen_qids text[] not null check (cardinality(frozen_qids) > 0),
  created_at timestamptz not null default now(),
  primary key(run_id,leg_index),
  unique(owner_id,namespace,record_id),
  foreign key(run_id,owner_id) references public.practice_test_runs(id,user_id),
  check(source_key = 'drill::practice-test::' || run_id || '::leg-' || leg_index::text)
);

-- Exact executor identity, not a caller-settable session flag. Future definer
-- RPCs must be owned by this dedicated role; unrelated postgres definers do not
-- gain permission just because they bypass table RLS.
create function public.guard_timed_pt_foundation_v1() returns trigger
language plpgsql set search_path = public as $$
begin
  if TG_TABLE_NAME = 'practice_test_runs' then
    if (TG_OP <> 'INSERT' and OLD.timed_contract_version is not null) or
       (TG_OP <> 'DELETE' and NEW.timed_contract_version is not null) then
      if current_user <> 'timed_pt_executor' then
        raise exception 'Protected PrepTest requires the timed writer' using errcode='42501';
      end if;
      if TG_OP = 'DELETE' then raise exception 'Protected PrepTest history cannot be deleted' using errcode='42501'; end if;
      if TG_OP = 'UPDATE' and OLD.timed_contract_version is not null then
        if OLD.status in ('complete','abandoned') and NEW is distinct from OLD then
          raise exception 'Terminal PrepTest cannot change' using errcode='42501';
        end if;
        if NEW.user_id is distinct from OLD.user_id or NEW.id is distinct from OLD.id or
          NEW.pt is distinct from OLD.pt or NEW.pace is distinct from OLD.pace or
          NEW.section_seconds is distinct from OLD.section_seconds or
          NEW.timed_contract_version is distinct from OLD.timed_contract_version or
          NEW.timed_frozen_legs is distinct from OLD.timed_frozen_legs or
          NEW.timed_lease_ms is distinct from OLD.timed_lease_ms or
          NEW.break_after_leg is distinct from OLD.break_after_leg or
          NEW.created_at is distinct from OLD.created_at then
          raise exception 'PrepTest attribution and frozen definition are immutable' using errcode='42501';
        end if;
        if NEW.timed_writer_epoch < OLD.timed_writer_epoch or NEW.timed_writer_epoch > OLD.timed_writer_epoch + 1 or
          NEW.revision <> OLD.revision + 1 or
          (NEW.timed_clock_leg is not distinct from OLD.timed_clock_leg and NEW.timed_phase not in ('ready','complete')
           and NEW.timed_elapsed_ms < OLD.timed_elapsed_ms) or
          (NEW.timed_phase in ('complete','abandoned') and NEW.timed_elapsed_ms < OLD.timed_elapsed_ms) then
          raise exception 'PrepTest control cannot move backwards' using errcode='42501';
        end if;
      end if;
    end if;
  else
    if current_user <> 'timed_pt_executor' or TG_OP <> 'INSERT' then
      raise exception 'Timed bindings and receipts are append-only executor records' using errcode='42501';
    end if;
    if TG_TABLE_NAME = 'timed_pt_receipts_v1' then
      NEW.command_hash := encode(sha256(convert_to(NEW.canonical_command::text, 'UTF8')), 'hex');
      if not exists(select 1 from public.practice_test_runs p where p.id=NEW.work_id and p.user_id=NEW.owner_id
          and p.timed_contract_version=1 and p.revision=NEW.committed_revision) then
        raise exception 'Receipt must name the committed protected revision' using errcode='42501';
      end if;
    end if;
    if TG_TABLE_NAME = 'timed_pt_lr_bindings_v1' then
    if not exists(
      select 1 from public.practice_test_runs p where p.id=NEW.run_id and p.user_id=NEW.owner_id
        and p.timed_contract_version=1 and NEW.leg_index < jsonb_array_length(p.timed_frozen_legs)
        and p.timed_frozen_legs->NEW.leg_index->>'kind'='lr'
        and (p.timed_frozen_legs->NEW.leg_index->>'questionCount')::integer=cardinality(NEW.frozen_qids)
    ) then
      raise exception 'LR binding must match a protected frozen leg' using errcode='42501';
    end if;
    if (exists(select 1 from unnest(NEW.frozen_qids) q where q is null or q='') or
       cardinality(NEW.frozen_qids) <> (select count(distinct q) from unnest(NEW.frozen_qids) q)) then
      raise exception 'Frozen LR queue must contain distinct nonempty identities' using errcode='42501';
    end if;
    end if;
  end if;
  if TG_OP='DELETE' then return OLD; end if;
  return NEW;
end $$;
create trigger timed_pt_foundation_guard before insert or update or delete on public.practice_test_runs
  for each row execute function public.guard_timed_pt_foundation_v1();
create trigger timed_pt_receipt_guard before insert or update or delete on public.timed_pt_receipts_v1
  for each row execute function public.guard_timed_pt_foundation_v1();
create trigger timed_pt_binding_guard before insert or update or delete on public.timed_pt_lr_bindings_v1
  for each row execute function public.guard_timed_pt_foundation_v1();

alter table public.timed_pt_receipts_v1 enable row level security;
alter table public.timed_pt_lr_bindings_v1 enable row level security;
revoke all on public.timed_pt_receipts_v1, public.timed_pt_lr_bindings_v1 from public,anon,authenticated;
grant select on public.timed_pt_receipts_v1, public.timed_pt_lr_bindings_v1 to authenticated;
grant select,insert,update on public.practice_test_runs to timed_pt_executor;
grant select,insert on public.timed_pt_receipts_v1, public.timed_pt_lr_bindings_v1 to timed_pt_executor;
create policy timed_pt_executor on public.practice_test_runs for all to timed_pt_executor using(true) with check(true);
create policy receipt_owner_read on public.timed_pt_receipts_v1 for select to authenticated using(owner_id=auth.uid());
create policy binding_owner_read on public.timed_pt_lr_bindings_v1 for select to authenticated using(owner_id=auth.uid());
create policy receipt_executor on public.timed_pt_receipts_v1 for insert to timed_pt_executor with check(true);
create policy receipt_executor_read on public.timed_pt_receipts_v1 for select to timed_pt_executor using(true);
create policy binding_executor on public.timed_pt_lr_bindings_v1 for insert to timed_pt_executor with check(true);
create policy binding_executor_read on public.timed_pt_lr_bindings_v1 for select to timed_pt_executor using(true);
commit;
