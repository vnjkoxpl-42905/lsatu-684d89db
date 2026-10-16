create table if not exists public.teacher_message_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  title text not null,
  template_type text not null default 'general'
    check (template_type in ('email', 'message', 'general')),
  subject text,
  body text not null,
  placeholders jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_teacher_message_templates_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists teacher_message_templates_touch on public.teacher_message_templates;
create trigger teacher_message_templates_touch
  before update on public.teacher_message_templates
  for each row execute function public.touch_teacher_message_templates_updated_at();

create index if not exists teacher_message_templates_owner_idx
  on public.teacher_message_templates (owner_id, updated_at desc);

alter table public.teacher_message_templates enable row level security;

create policy teacher_message_templates_select_own
  on public.teacher_message_templates for select to authenticated
  using (public.has_role(auth.uid(), 'admin') and owner_id = auth.uid());

create policy teacher_message_templates_insert_own
  on public.teacher_message_templates for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') and owner_id = auth.uid());

create policy teacher_message_templates_update_own
  on public.teacher_message_templates for update to authenticated
  using (public.has_role(auth.uid(), 'admin') and owner_id = auth.uid())
  with check (public.has_role(auth.uid(), 'admin') and owner_id = auth.uid());

create policy teacher_message_templates_delete_own
  on public.teacher_message_templates for delete to authenticated
  using (public.has_role(auth.uid(), 'admin') and owner_id = auth.uid());
