-- smartboard_sessions: Excalidraw-backed teaching boards tied to a student.
-- Admin-only. V1 stores scene JSON; preview/export paths are reserved
-- columns for the V1.5 OCR / recap-generation work.

create table if not exists public.smartboard_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid,
  created_by uuid not null,
  title text not null default 'Smartboard session',
  excalidraw_scene_json jsonb,
  preview_image_path text,
  export_pdf_path text,
  session_date date not null default current_date,
  posted_to_classroom boolean not null default false,
  linked_recap_item_id uuid references public.classroom_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists smartboard_sessions_student_idx
  on public.smartboard_sessions (student_id, session_date desc);

create or replace function public.touch_smartboard_sessions_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists smartboard_sessions_touch on public.smartboard_sessions;
create trigger smartboard_sessions_touch before update on public.smartboard_sessions
  for each row execute function public.touch_smartboard_sessions_updated_at();

alter table public.smartboard_sessions enable row level security;

create policy smartboard_sessions_admin_all on public.smartboard_sessions
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
