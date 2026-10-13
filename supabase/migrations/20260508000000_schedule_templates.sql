-- schedule_templates: reusable weekly-plan blueprints. Admin saves the current
-- builder state as a template, then later loads it into another student's plan
-- and publishes — which still goes through the normal weekly_plans + items +
-- classroom_items flow.

create table if not exists public.schedule_templates (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  title text not null,
  description text,
  template_type text not null default 'weekly' check (template_type in ('weekly','custom')),
  items_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_schedule_templates_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists schedule_templates_touch on public.schedule_templates;
create trigger schedule_templates_touch before update on public.schedule_templates
  for each row execute function public.touch_schedule_templates_updated_at();

create index if not exists schedule_templates_creator_idx
  on public.schedule_templates (created_by, created_at desc);

alter table public.schedule_templates enable row level security;

-- Admin only. Templates are never visible to students directly; they manifest
-- only as assigned classroom_items after Joshua publishes a plan from a
-- template. RLS reflects that.
create policy schedule_templates_admin_all on public.schedule_templates
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
