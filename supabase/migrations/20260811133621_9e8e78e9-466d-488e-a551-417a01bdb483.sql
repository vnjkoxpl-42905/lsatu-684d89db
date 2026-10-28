create or replace function public.guard_classroom_items_student_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;

  if new.id                 is distinct from old.id
     or new.student_id      is distinct from old.student_id
     or new.class_id        is distinct from old.class_id
     or new.created_by      is distinct from old.created_by
     or new.type            is distinct from old.type
     or new.title           is distinct from old.title
     or new.description     is distinct from old.description
     or new.content_html    is distinct from old.content_html
     or new.content_markdown is distinct from old.content_markdown
     or new.source_table    is distinct from old.source_table
     or new.source_id       is distinct from old.source_id
     or new.unlock_at       is distinct from old.unlock_at
     or new.due_at          is distinct from old.due_at
     or new.priority        is distinct from old.priority
     or new.visible_to_student is distinct from old.visible_to_student
     or new.created_at      is distinct from old.created_at
  then
    raise exception 'classroom_items: students may only update status, completed_at and metadata_json on their own items'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists classroom_items_student_update_guard on public.classroom_items;
create trigger classroom_items_student_update_guard
  before update on public.classroom_items
  for each row execute function public.guard_classroom_items_student_update();

drop policy if exists classroom_items_student_update_status on public.classroom_items;
create policy classroom_items_student_update_status on public.classroom_items
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());