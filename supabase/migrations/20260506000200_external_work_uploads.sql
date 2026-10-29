-- external_work_uploads: student-uploaded screenshots / PDFs of work
-- done outside LSAT U (7Sage analytics, PT results, drill screenshots).
-- Files live in the new external-work-uploads bucket. V1 leaves
-- parsing / confidence scoring as null; admin reviews and approves.

create table if not exists public.external_work_uploads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid,
  uploaded_by uuid not null,
  file_name text not null,
  file_type text,
  storage_path text not null,
  source_platform text,
  upload_type text not null default 'other' check (upload_type in (
    '7sage_analytics','pt_result','lr_section','rc_section',
    'drill_result','score_report','other'
  )),
  processing_status text not null default 'uploaded' check (processing_status in (
    'uploaded','processing','parsed','needs_review','failed'
  )),
  extracted_text text,
  parsed_json jsonb,
  confidence_score numeric,
  reviewed_by uuid,
  reviewed_at timestamptz,
  applied_to_analytics boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists external_work_uploads_student_idx
  on public.external_work_uploads (student_id, created_at desc);
create index if not exists external_work_uploads_review_idx
  on public.external_work_uploads (processing_status, created_at desc);

create or replace function public.touch_external_work_uploads_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists external_work_uploads_touch on public.external_work_uploads;
create trigger external_work_uploads_touch before update on public.external_work_uploads
  for each row execute function public.touch_external_work_uploads_updated_at();

alter table public.external_work_uploads enable row level security;

create policy external_work_uploads_student_select on public.external_work_uploads
  for select to authenticated
  using (student_id = auth.uid());

create policy external_work_uploads_student_insert on public.external_work_uploads
  for insert to authenticated
  with check (student_id = auth.uid() and uploaded_by = auth.uid());

create policy external_work_uploads_admin_all on public.external_work_uploads
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
