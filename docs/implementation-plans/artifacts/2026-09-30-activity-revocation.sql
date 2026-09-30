-- DRAFT ONLY. Not installed on the live backend or placed in migrations.
-- Preserve issued snapshots, responses and grades. Revocation is access state,
-- independent of the student's advisory progress status.
begin;

alter table public.activity_assignments
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references auth.users(id);
alter table public.activity_assignments
  add constraint activity_revocation_pair check ((revoked_at is null) = (revoked_by is null));

create or replace function public.guard_activity_revocation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'UPDATE' and OLD.revoked_at is not null then
    if NEW is distinct from OLD then
      raise exception 'Revoked Activity assignments are immutable' using errcode = '42501';
    end if;
    return NEW;
  end if;
  if NEW.revoked_at is not null or NEW.revoked_by is not null then
    if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
      raise exception 'Admin access is required to revoke an Activity' using errcode = '42501';
    end if;
    -- Never accept client-supplied actor attribution or timestamps.
    if NEW.revoked_by is distinct from auth.uid() then
      raise exception 'Revocation actor must be the authenticated admin' using errcode = '42501';
    end if;
    NEW.revoked_at := statement_timestamp();
  end if;
  return NEW;
end;
$$;
create trigger activity_revocation_guard before insert or update
  on public.activity_assignments for each row execute function public.guard_activity_revocation();

drop policy if exists "Students read own activity assignments" on public.activity_assignments;
create policy "Students read own activity assignments" on public.activity_assignments
  for select to authenticated using (student_id = auth.uid() and revoked_at is null);
drop policy if exists "Students update own activity assignments" on public.activity_assignments;
create policy "Students update own activity assignments" on public.activity_assignments
  for update to authenticated using (student_id = auth.uid() and revoked_at is null)
  with check (student_id = auth.uid() and revoked_at is null and revoked_by is null);

-- Status remains unchanged, so exclude revoked sources from the live-run index.
drop index if exists public.activity_assignments_active_unique;
create unique index activity_assignments_active_unique
  on public.activity_assignments(student_id, activity_id)
  where status in ('assigned', 'in_progress') and activity_id is not null and revoked_at is null;

create or replace function public.guard_activity_response_access()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_student uuid; v_revoked timestamptz;
begin
  -- Serialize against the revocation RPC's FOR UPDATE lock. A response either
  -- lands before revocation or is rejected after it, including recovery writes.
  select student_id, revoked_at into v_student, v_revoked
    from public.activity_assignments where id = NEW.assignment_id for share;
  if not found or v_student is distinct from NEW.student_id or v_revoked is not null then
    raise exception 'Activity assignment is unavailable for new responses' using errcode = '42501';
  end if;
  return NEW;
end;
$$;
create trigger activity_response_access_guard before insert
  on public.activity_item_responses for each row execute function public.guard_activity_response_access();
drop policy if exists "activity_item_responses: owner can insert" on public.activity_item_responses;
create policy "activity_item_responses: owner can insert" on public.activity_item_responses
  for insert to authenticated with check (
    auth.uid() = student_id and exists (
      select 1 from public.activity_assignments a where a.id = assignment_id
        and a.student_id = auth.uid() and a.revoked_at is null
    )
  );

-- Prevent a later mirror insert/unhide from resurrecting a revoked source.
create or replace function public.guard_activity_mirror_access()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_revoked timestamptz; v_student uuid; v_activity boolean;
begin
  v_activity := NEW.source_table = 'activity_assignments' or NEW.type = 'activity';
  -- Existing orphan mirrors are historical data. Unrelated edits do not grant
  -- access; newly visible or rebound mirrors must satisfy the source gate.
  if TG_OP = 'UPDATE' then
    v_activity := coalesce(v_activity,false) or OLD.source_table = 'activity_assignments' or OLD.type = 'activity';
    if NEW.visible_to_student is not distinct from OLD.visible_to_student
       and NEW.source_table is not distinct from OLD.source_table
       and NEW.source_id is not distinct from OLD.source_id
       and NEW.type is not distinct from OLD.type
       and NEW.student_id is not distinct from OLD.student_id then
      return NEW;
    end if;
  end if;
  if NEW.visible_to_student and v_activity then
    if NEW.source_id is null or
       (NEW.source_table is distinct from 'activity_assignments' and NEW.type is distinct from 'activity') then
      raise exception 'Visible Activity mirror source cannot be cleared' using errcode = '42501';
    end if;
    select revoked_at, student_id into v_revoked, v_student
      from public.activity_assignments where id::text = NEW.source_id for share;
    if not found or v_revoked is not null or v_student is distinct from NEW.student_id then
      raise exception 'Activity mirror must name an available source for this student' using errcode = '42501';
    end if;
  end if;
  return NEW;
end;
$$;
create trigger activity_mirror_access_guard before insert or update
  on public.classroom_items for each row execute function public.guard_activity_mirror_access();

create or replace function public.activity_revocation_capability()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Admin access is required' using errcode = '42501';
  end if;
  return jsonb_build_object('version', 1, 'source_preserving', true);
end;
$$;

create or replace function public.revoke_activity_assignment(p_assignment_id uuid, p_student_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_row public.activity_assignments%rowtype;
  v_already boolean; v_mirrors integer;
begin
  if v_actor is null or not public.has_role(v_actor, 'admin') then
    raise exception 'Admin access is required' using errcode = '42501';
  end if;
  select * into v_row from public.activity_assignments
    where id = p_assignment_id and student_id = p_student_id for update;
  if not found then
    raise exception 'Activity assignment does not belong to this student' using errcode = 'P0002';
  end if;
  v_already := v_row.revoked_at is not null;
  if not v_already then
    update public.activity_assignments set revoked_at = statement_timestamp(), revoked_by = v_actor
      where id = v_row.id returning * into v_row;
  end if;
  -- Hide every mirror, without deleting its content, metadata or progress.
  update public.classroom_items set visible_to_student = false
    where source_id = v_row.id::text
      and (source_table = 'activity_assignments' or type = 'activity')
      and visible_to_student;
  get diagnostics v_mirrors = row_count;
  return jsonb_build_object('assignment_id', v_row.id, 'student_id', v_row.student_id,
    'revoked_at', v_row.revoked_at, 'revoked_by', v_row.revoked_by,
    'performed_by', v_actor, 'already_revoked', v_already, 'mirrors_hidden', v_mirrors);
end;
$$;
revoke all on function public.activity_revocation_capability() from public, anon;
revoke all on function public.revoke_activity_assignment(uuid, uuid) from public, anon;
grant execute on function public.activity_revocation_capability() to authenticated;
grant execute on function public.revoke_activity_assignment(uuid, uuid) to authenticated;
commit;
