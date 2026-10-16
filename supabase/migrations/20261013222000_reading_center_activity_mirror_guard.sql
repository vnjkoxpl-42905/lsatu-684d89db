-- Reading Center grants are Classroom activities but have no Activity Centre
-- assignment row. Admit their exact immutable source without weakening the
-- existing Activity Centre mirror checks.
begin;
create or replace function public.guard_activity_mirror_access()
returns trigger language plpgsql security definer set search_path=public
as $function$
declare v_revoked timestamptz; v_student uuid; v_activity boolean;
begin
  if NEW.type='activity' and NEW.source_table='reading_center' and NEW.source_id='library' then
    if auth.uid() is not null and public.has_role(auth.uid(),'admin') then
      return NEW;
    end if;
    -- Student progress may advance an existing grant. Other triggers enforce
    -- the allowed statuses; this exception never creates or rebinds access.
    if TG_OP='UPDATE' and OLD.type='activity' and OLD.source_table='reading_center' and OLD.source_id='library'
      and NEW.student_id is not distinct from OLD.student_id
      and NEW.created_by is not distinct from OLD.created_by
      and NEW.visible_to_student is not distinct from OLD.visible_to_student
      and NEW.unlock_at is not distinct from OLD.unlock_at then
      return NEW;
    end if;
  end if;
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
$function$;
commit;
